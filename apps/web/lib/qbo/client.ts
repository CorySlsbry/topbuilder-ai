// =============================================================================
// QuickBooks Online API client.
// =============================================================================
// QBO access tokens expire in 1 hour; refresh tokens in ~100 days. We refresh
// aggressively and alert when refresh expiry is < 14 days.
//
// Throttle: 500 calls/min. We rate-limit in-process.
// =============================================================================

import 'server-only';
import { adminDb } from '../firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { decryptToken, encryptToken } from '../crypto/token-encryption';
import { backoffDelayMs, sleep } from '../utils';
import type { QboConnectionDoc, Timestamp as TimestampType } from '../firebase/types';

import { buildPagedQuery, QBO_PAGE_SIZE } from './query';

const SANDBOX_BASE = 'https://sandbox-quickbooks.api.intuit.com';
const PROD_BASE = 'https://quickbooks.api.intuit.com';

// Re-export the pure paged-query builder (tested in query.spec.ts).
export { buildPagedQuery } from './query';

export class QboApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`QBO API error ${status}`);
    this.name = 'QboApiError';
  }
}

export interface QboClientOptions {
  tenantId: string;
}

export class QboClient {
  private cachedAccessToken: string | null = null;
  private cachedTokenExpiresAt = 0;
  private cachedConnection: QboConnectionDoc | null = null;

  constructor(private readonly opts: QboClientOptions) {}

  /** Run a QBO Query Language statement. */
  async query<T>(sql: string): Promise<T[]> {
    const conn = await this.getConnection();
    const path = `/v3/company/${conn.realmId}/query?query=${encodeURIComponent(sql)}&minorversion=70`;
    const result = await this.request<{ QueryResponse: Record<string, T[] | number> }>(
      'GET',
      path,
    );
    // Find the array key (e.g. "Customer", "Invoice")
    const items: T[] = [];
    for (const v of Object.values(result.QueryResponse)) {
      if (Array.isArray(v)) items.push(...(v as T[]));
    }
    return items;
  }

  /**
   * Fetch ALL rows of an entity, paginating past QBO's 1000-row-per-query cap.
   * Loops STARTPOSITION 1, 1001, 2001… until a short page is returned. Without
   * this, tenants with >1000 invoices/bills/customers silently lost every row
   * beyond the first 1000.
   */
  async queryAll<T>(from: string): Promise<T[]> {
    const all: T[] = [];
    let start = 1;
    // Hard guard: 1,000 pages × 1,000 rows = 1M-row ceiling against a runaway loop.
    for (let page = 0; page < 1000; page++) {
      const rows = await this.query<T>(buildPagedQuery(from, start, QBO_PAGE_SIZE));
      all.push(...rows);
      if (rows.length < QBO_PAGE_SIZE) break;
      start += QBO_PAGE_SIZE;
    }
    return all;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  // -------------------------------------------------------------------------

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const conn = await this.getConnection();
    const base = conn.environment === 'production' ? PROD_BASE : SANDBOX_BASE;
    const url = `${base}${path}`;

    let attempt = 0;
    while (true) {
      const token = await this.getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };
      if (body !== undefined) headers['Content-Type'] = 'application/json';

      const res = await fetch(url, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      if (res.status === 401 && attempt === 0) {
        this.cachedAccessToken = null;
        await this.refresh({ force: true });
        attempt += 1;
        continue;
      }

      if (res.status === 429 && attempt < 4) {
        const retryAfter = Number(res.headers.get('Retry-After') ?? 1);
        await sleep(Math.max(retryAfter * 1000, backoffDelayMs(attempt)));
        attempt += 1;
        continue;
      }

      if (res.status >= 500 && attempt < 3) {
        await sleep(backoffDelayMs(attempt));
        attempt += 1;
        continue;
      }

      if (!res.ok) {
        let payload: unknown;
        try {
          payload = await res.json();
        } catch {
          payload = await res.text();
        }
        throw new QboApiError(res.status, payload);
      }

      return (await res.json()) as T;
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedAccessToken && this.cachedTokenExpiresAt > Date.now() + 5 * 60 * 1000) {
      return this.cachedAccessToken;
    }
    const conn = await this.getConnection();
    const expiresAtMs = (conn.accessTokenExpiresAt as unknown as TimestampType).toDate().getTime();
    if (expiresAtMs > Date.now() + 5 * 60 * 1000) {
      const plaintext = await decryptToken(conn.accessToken);
      this.cachedAccessToken = plaintext;
      this.cachedTokenExpiresAt = expiresAtMs;
      return plaintext;
    }
    return this.refresh({ force: false });
  }

  private async refresh({ force }: { force: boolean }): Promise<string> {
    const conn = await this.getConnection(force);
    const refresh = await decryptToken(conn.refreshToken);
    const clientId = required('QBO_CLIENT_ID');
    const clientSecret = required('QBO_CLIENT_SECRET');

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      await adminDb()
        .doc(`tenants/${this.opts.tenantId}/qboConnection/main`)
        .update({
          status: 'error',
          lastErrorMessage: `Refresh failed: ${res.status}`,
          lastErrorAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      throw new QboApiError(res.status, errBody);
    }

    const json = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
      token_type: 'bearer';
    };

    const accessExp = Date.now() + json.expires_in * 1000;
    const refreshExp = Date.now() + json.x_refresh_token_expires_in * 1000;

    const accessBlob = await encryptToken(json.access_token);
    const refreshBlob = await encryptToken(json.refresh_token);

    await adminDb()
      .doc(`tenants/${this.opts.tenantId}/qboConnection/main`)
      .update({
        accessToken: accessBlob,
        refreshToken: refreshBlob,
        accessTokenExpiresAt: Timestamp.fromMillis(accessExp),
        refreshTokenExpiresAt: Timestamp.fromMillis(refreshExp),
        status: 'healthy',
        lastErrorMessage: null,
        lastErrorAt: null,
        updatedAt: Timestamp.now(),
      });

    this.cachedAccessToken = json.access_token;
    this.cachedTokenExpiresAt = accessExp;
    this.cachedConnection = null;
    return json.access_token;
  }

  private async getConnection(force = false): Promise<QboConnectionDoc> {
    if (this.cachedConnection && !force) return this.cachedConnection;
    const snap = await adminDb()
      .doc(`tenants/${this.opts.tenantId}/qboConnection/main`)
      .get();
    if (!snap.exists) {
      throw new Error(`QBO not connected for tenant ${this.opts.tenantId}`);
    }
    this.cachedConnection = snap.data() as QboConnectionDoc;
    return this.cachedConnection;
  }
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var ${key}`);
  return v;
}

export function qboFor(tenantId: string): QboClient {
  return new QboClient({ tenantId });
}
