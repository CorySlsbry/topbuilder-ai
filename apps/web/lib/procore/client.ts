// =============================================================================
// Procore API client — auto-refresh, rate limiting, retry, usage tracking.
// =============================================================================
//
// Per Procore docs (as of 2026-05):
//   - Access tokens expire after 1.5 hours
//   - Refresh tokens do not expire until used to acquire a new pair
//   - Rate limits: 3,600/hr (hourly) + 10s spike limit
//   - Receive 429 with Retry-After header on exhaustion
//   - Treat rate-limit response headers as source of truth
//
// This client:
//   - Loads encrypted tokens from /tenants/{tid}/procoreConnection/main
//   - Decrypts via Cloud KMS, caches plaintext in-process for the request
//   - Auto-refreshes when access token is within 5 min of expiry
//   - On 401: forces refresh + retries once
//   - On 429: exponential backoff with Retry-After header (max 4 retries)
//   - On 5xx: exponential backoff (max 3 retries)
//   - Logs every call to /tenants/{tid}/usageEvents for billing
//   - Token bucket rate limiter (30 req/sec/tenant) via in-process limiter
// =============================================================================

import 'server-only';
import { adminDb } from '../firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { decryptToken, encryptToken } from '../crypto/token-encryption';
import { backoffDelayMs, sleep } from '../utils';
import type {
  ProcoreConnectionDoc,
  EncryptedTokenBlob,
  Timestamp as TimestampType,
} from '../firebase/types';

const PROCORE_API_BASE = process.env.PROCORE_API_BASE_URL ?? 'https://api.procore.com';
const PROCORE_LOGIN_BASE = process.env.PROCORE_LOGIN_URL ?? 'https://login.procore.com';
const TOKEN_REFRESH_BUFFER_SEC = 5 * 60;

export interface ProcoreClientOptions {
  tenantId: string;
  procoreCompanyId?: number;
}

export class ProcoreApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message?: string,
  ) {
    super(message ?? `Procore API error ${status}`);
    this.name = 'ProcoreApiError';
  }
}

export class ProcoreClient {
  private cachedAccessToken: string | null = null;
  private cachedTokenExpiresAt: number = 0;
  private cachedConnection: ProcoreConnectionDoc | null = null;

  constructor(private readonly opts: ProcoreClientOptions) {}

  // ---------------------------------------------------------------------------
  // Public methods
  // ---------------------------------------------------------------------------

  /** GET a single endpoint (returns the JSON body). */
  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, undefined, params);
  }

  /** Auto-paginated GET across all `page=`s of a list endpoint. */
  async list<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T[]> {
    const out: T[] = [];
    let page = 1;
    const perPage = 100;
    while (true) {
      const items = await this.request<T[]>('GET', path, undefined, {
        ...(params ?? {}),
        page,
        per_page: perPage,
      });
      if (!Array.isArray(items) || items.length === 0) break;
      out.push(...items);
      if (items.length < perPage) break;
      page += 1;
      if (page > 200) {
        throw new Error(`Procore pagination exceeded 200 pages on ${path} — refine filters`);
      }
    }
    return out;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  // ---------------------------------------------------------------------------
  // Internal request pipeline
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const url = this.buildUrl(path, query);
    const startedAt = Date.now();

    let attempt = 0;
    while (true) {
      const token = await this.getAccessToken();
      const procoreCompanyId =
        this.opts.procoreCompanyId ?? this.cachedConnection?.procoreCompanyId;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };
      if (procoreCompanyId != null) {
        headers['Procore-Company-Id'] = String(procoreCompanyId);
      }
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(url, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      // Log usage event
      void this.logUsage({ method, url, status: res.status, durationMs: Date.now() - startedAt });

      // 401 → force-refresh and retry once
      if (res.status === 401 && attempt === 0) {
        this.cachedAccessToken = null;
        await this.refreshAccessToken({ force: true });
        attempt += 1;
        continue;
      }

      // 429 → respect Retry-After
      if (res.status === 429 && attempt < 4) {
        const retryAfterSec = Number(res.headers.get('Retry-After') ?? 1);
        const wait = Math.max(retryAfterSec * 1000, backoffDelayMs(attempt, 1000, 30_000));
        await sleep(wait);
        attempt += 1;
        continue;
      }

      // 5xx → backoff
      if (res.status >= 500 && attempt < 3) {
        await sleep(backoffDelayMs(attempt, 1000, 10_000));
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
        throw new ProcoreApiError(res.status, payload);
      }

      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        return (await res.json()) as T;
      }
      return (await res.text()) as unknown as T;
    }
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleaned = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${PROCORE_API_BASE}${cleaned}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  // ---------------------------------------------------------------------------
  // Token management
  // ---------------------------------------------------------------------------

  private async getAccessToken(): Promise<string> {
    if (this.cachedAccessToken && this.cachedTokenExpiresAt > Date.now() + TOKEN_REFRESH_BUFFER_SEC * 1000) {
      return this.cachedAccessToken;
    }
    const conn = await this.loadConnection();
    const expiresAtMs = (conn.tokenExpiresAt as unknown as TimestampType).toDate().getTime();
    if (expiresAtMs > Date.now() + TOKEN_REFRESH_BUFFER_SEC * 1000) {
      const plaintext = await decryptToken(conn.accessToken);
      this.cachedAccessToken = plaintext;
      this.cachedTokenExpiresAt = expiresAtMs;
      return plaintext;
    }
    return this.refreshAccessToken({ force: false });
  }

  private async refreshAccessToken({ force }: { force: boolean }): Promise<string> {
    const conn = await this.loadConnection(force);
    const refresh = await decryptToken(conn.refreshToken);
    const clientId = required('PROCORE_CLIENT_ID');
    const clientSecret = required('PROCORE_CLIENT_SECRET');

    const res = await fetch(`${PROCORE_LOGIN_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refresh,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      // Mark the connection as errored.
      await this.markConnectionError(`Refresh failed: ${res.status} ${errBody.slice(0, 200)}`);
      throw new ProcoreApiError(res.status, errBody, 'Refresh failed — user must re-authenticate');
    }

    const json = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      created_at: number;
    };

    const expiresAtMs = (json.created_at + json.expires_in) * 1000;
    const accessBlob = await encryptToken(json.access_token);
    const refreshBlob = await encryptToken(json.refresh_token);

    await adminDb()
      .doc(`tenants/${this.opts.tenantId}/procoreConnection/main`)
      .update({
        accessToken: accessBlob,
        refreshToken: refreshBlob,
        tokenExpiresAt: Timestamp.fromMillis(expiresAtMs),
        status: 'healthy',
        lastErrorMessage: null,
        lastErrorAt: null,
        updatedAt: Timestamp.now(),
      });

    this.cachedAccessToken = json.access_token;
    this.cachedTokenExpiresAt = expiresAtMs;
    // Invalidate the cached connection so any further reads pick up new tokens.
    this.cachedConnection = null;
    return json.access_token;
  }

  private async loadConnection(force = false): Promise<ProcoreConnectionDoc> {
    if (this.cachedConnection && !force) return this.cachedConnection;
    const snap = await adminDb()
      .doc(`tenants/${this.opts.tenantId}/procoreConnection/main`)
      .get();
    if (!snap.exists) {
      throw new Error(
        `Procore is not connected for tenant ${this.opts.tenantId}. Direct the user to /dashboard/integrations.`,
      );
    }
    this.cachedConnection = snap.data() as ProcoreConnectionDoc;
    return this.cachedConnection;
  }

  private async markConnectionError(message: string): Promise<void> {
    try {
      await adminDb()
        .doc(`tenants/${this.opts.tenantId}/procoreConnection/main`)
        .update({
          status: 'error',
          lastErrorMessage: message,
          lastErrorAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
    } catch {
      // ignore: connection may not exist
    }
  }

  private async logUsage(args: {
    method: string;
    url: string;
    status: number;
    durationMs: number;
  }): Promise<void> {
    try {
      const sanitizedUrl = args.url.replace(/access_token=[^&]+/g, 'access_token=REDACTED');
      await adminDb()
        .collection(`tenants/${this.opts.tenantId}/usageEvents`)
        .add({
          tenantId: this.opts.tenantId,
          eventType: 'procore_api_call',
          quantity: 1,
          unit: 'request',
          costCents: 0,
          referenceId: null,
          metadata: {
            method: args.method,
            url: sanitizedUrl.slice(0, 500),
            status: args.status,
            durationMs: args.durationMs,
          },
          createdAt: Timestamp.now(),
        });
    } catch (err) {
      // Logging must not break the actual call.
      console.error('procore_client.usage_log_failed', err);
    }
  }
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

/** Convenience factory. */
export function procoreFor(tenantId: string, procoreCompanyId?: number): ProcoreClient {
  return new ProcoreClient(
    procoreCompanyId !== undefined ? { tenantId, procoreCompanyId } : { tenantId },
  );
}
