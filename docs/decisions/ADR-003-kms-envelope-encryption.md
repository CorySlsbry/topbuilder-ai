# ADR-003: Cloud KMS envelope encryption for OAuth tokens

**Date**: 2026-05-26
**Status**: Accepted

## Context

Procore and QuickBooks Online OAuth refresh tokens are long-lived
credentials that effectively grant ongoing access to the customer's entire
construction operation. Storing them as plaintext in Firestore — even
behind Security Rules — is unacceptable. If Firestore credentials leak
or someone gains unauthorized read access, every tenant's tokens are
compromised.

## Decision

Encrypt every OAuth token with **Cloud KMS envelope encryption**:

1. Generate a random 256-bit Data Encryption Key (DEK) per encryption op.
2. Encrypt the plaintext with AES-256-GCM using the DEK.
3. Wrap (encrypt) the DEK with the Cloud KMS Key Encryption Key (KEK)
   at `projects/{project}/locations/us-central1/keyRings/buildercfo/cryptoKeys/token-encryption-key`.
4. Store the encrypted DEK alongside the ciphertext in Firestore.

To decrypt:

1. Call Cloud KMS to unwrap the DEK.
2. Use the DEK to AES-256-GCM decrypt the ciphertext.
3. Zero the DEK from memory immediately.

## Why envelope vs direct Cloud KMS encryption?

- **No KMS size limit.** Cloud KMS caps plaintext at 64KB. Envelope works
  for any size payload.
- **One KMS round-trip per decrypt.** KMS calls add ~50ms latency. Envelope
  keeps this cost flat regardless of token size.
- **Key rotation is fast.** To rotate the KEK, we re-wrap each stored DEK
  without re-encrypting any payload.
- **Caching-friendly.** DEK plaintext is safe to cache per-request; it's
  scoped to one encryption op only.

## Alternatives considered

- **Application-layer secret with a static key.** Rejected — single point
  of failure; rotating the key requires re-encrypting every token.
- **Customer-managed encryption keys (CMEK) on Firestore.** Considered for
  enterprise tier; complementary to this approach, not a replacement.
- **Hardware Security Module (HSM)-backed KMS keys.** Sprint 8+ when we
  pursue SOC 2.

## Consequences

- Cloud KMS is on the critical path. KMS outages = decrypt outages.
  Mitigation: Cloud KMS has 99.95% SLA; we monitor it.
- ~50ms per KMS call adds to Procore/QBO API call latency. We cache
  decrypted access tokens in-process per request to amortize.
- Cloud KMS costs $0.06 per 10k operations. At our scale, this is
  negligible (~$1-10/month).
- The `KMS_KEY_NAME` env var must be set before any token operation. The
  encryption module throws a clear error if missing.
