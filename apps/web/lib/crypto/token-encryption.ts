// =============================================================================
// Cloud KMS envelope encryption for OAuth tokens.
// =============================================================================
// Pattern:
//   1. Generate a random 32-byte Data Encryption Key (DEK) per encryption op.
//   2. Encrypt the plaintext with the DEK using AES-256-GCM.
//   3. Use Cloud KMS to encrypt the DEK with the Key Encryption Key (KEK).
//   4. Store both the encrypted DEK and the ciphertext in Firestore.
//   5. To decrypt: KMS unwraps the DEK -> AES-256-GCM decrypts the data.
//
// Benefits over direct KMS encryption:
//   - No KMS payload size limit (KMS caps at 64KB plaintext).
//   - Single KMS round-trip per decrypt (DEK unwrap) regardless of payload size.
//   - DEK can be cached safely in memory for the duration of a request.
//   - Easier KMS key rotation: rewrap DEKs without touching ciphertext.
// =============================================================================

import 'server-only';
import { KeyManagementServiceClient } from '@google-cloud/kms';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { EncryptedTokenBlob } from '../firebase/types';
import { Timestamp } from 'firebase-admin/firestore';

const ALGORITHM = 'aes-256-gcm' as const;
const DEK_BYTES = 32;
const IV_BYTES = 12;

let _kms: KeyManagementServiceClient | undefined;
function kms(): KeyManagementServiceClient {
  if (!_kms) _kms = new KeyManagementServiceClient();
  return _kms;
}

function keyName(): string {
  const name = process.env.KMS_KEY_NAME;
  if (!name) {
    throw new Error(
      'KMS_KEY_NAME env var is not set. Expected: projects/{project}/locations/{loc}/keyRings/{ring}/cryptoKeys/{key}',
    );
  }
  return name;
}

/**
 * Cheap KMS reachability probe for diagnostics. Reads the crypto key's metadata
 * (a single GetCryptoKey call — no encrypt/decrypt, no cost). Throws if
 * KMS_KEY_NAME is unset or the key is unreachable / permission-denied.
 */
export async function pingKms(): Promise<void> {
  await kms().getCryptoKey({ name: keyName() });
}

/**
 * Encrypt a plaintext token using Cloud KMS envelope encryption.
 *
 * Returns an EncryptedTokenBlob that is safe to store in Firestore.
 */
export async function encryptToken(plaintext: string): Promise<EncryptedTokenBlob> {
  if (!plaintext) throw new Error('encryptToken: plaintext is empty');

  const dek = randomBytes(DEK_BYTES);
  const iv = randomBytes(IV_BYTES);

  const cipher = createCipheriv(ALGORITHM, dek, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const [encryptResp] = await kms().encrypt({
    name: keyName(),
    plaintext: dek,
  });

  if (!encryptResp.ciphertext) {
    throw new Error('KMS encrypt returned empty ciphertext for DEK');
  }

  return {
    ciphertext: encrypted.toString('base64'),
    encryptedDek: Buffer.from(encryptResp.ciphertext).toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    algorithm: ALGORITHM,
    kmsKeyVersion: encryptResp.name ?? keyName(),
    encryptedAt: Timestamp.now() as unknown as EncryptedTokenBlob['encryptedAt'],
  };
}

/**
 * Decrypt a token blob. Returns the original plaintext.
 *
 * Cache the result in memory for the duration of a single request. Never
 * persist plaintext to disk or logs.
 */
export async function decryptToken(blob: EncryptedTokenBlob): Promise<string> {
  if (blob.algorithm !== ALGORITHM) {
    throw new Error(`Unsupported encryption algorithm: ${blob.algorithm}`);
  }

  const [decryptResp] = await kms().decrypt({
    name: keyName(),
    ciphertext: Buffer.from(blob.encryptedDek, 'base64'),
  });

  if (!decryptResp.plaintext) {
    throw new Error('KMS decrypt returned empty DEK plaintext');
  }

  const dek = Buffer.from(decryptResp.plaintext as Uint8Array);
  const iv = Buffer.from(blob.iv, 'base64');
  const ciphertext = Buffer.from(blob.ciphertext, 'base64');
  const authTag = Buffer.from(blob.authTag, 'base64');

  const decipher = createDecipheriv(ALGORITHM, dek, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    'utf8',
  );

  // Zero the DEK from memory immediately.
  dek.fill(0);

  return plaintext;
}

/**
 * Test helper: deterministic in-process encryption that bypasses Cloud KMS.
 * ONLY use in tests with ENCRYPTION_TEST_MODE=1. Throws otherwise.
 */
export function inMemoryEncryptForTests(plaintext: string): EncryptedTokenBlob {
  if (process.env.ENCRYPTION_TEST_MODE !== '1') {
    throw new Error('inMemoryEncryptForTests requires ENCRYPTION_TEST_MODE=1');
  }
  const dek = Buffer.from('test-dek-deterministic-do-not-use-prod-32bytes').subarray(0, 32);
  const iv = Buffer.from('test-iv-12by').subarray(0, 12);
  const cipher = createCipheriv(ALGORITHM, dek, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('base64'),
    encryptedDek: dek.toString('base64'), // NOTE: plaintext DEK; tests only
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    algorithm: ALGORITHM,
    kmsKeyVersion: 'test:no-kms',
    encryptedAt: Timestamp.now() as unknown as EncryptedTokenBlob['encryptedAt'],
  };
}
