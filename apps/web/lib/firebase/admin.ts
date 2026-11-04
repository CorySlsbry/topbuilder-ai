// =============================================================================
// Firebase Admin SDK (server-only).
// =============================================================================
// Uses Application Default Credentials when running on Cloud Run.
// For local dev, set NEXT_PUBLIC_FIREBASE_EMULATORS=1 and the emulators handle auth.
import 'server-only';
import { getApps, initializeApp, applicationDefault, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

let _app: App | undefined;

export function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0]!;
    return _app;
  }

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    process.env.GCP_PROJECT ??
    'builder-ai-497610';

  // Emulator mode — point the Admin SDK at local emulators.
  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === '1') {
    process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= 'localhost:9099';
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= 'localhost:9199';
    _app = initializeApp({ projectId });
    return _app;
  }

  // Production / Cloud Run — use ADC.
  // Falls back to explicit cert if the keys are set (mostly for CI).
  const explicitKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (explicitKey && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    _app = initializeApp({
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: explicitKey.replace(/\\n/g, '\n'),
      }),
      projectId,
    });
    return _app;
  }

  _app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });
  return _app;
}

let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: Storage | undefined;

export function adminAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getAdminApp());
  return _auth;
}

export function adminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getAdminApp());
  // Ignore undefined properties — easier to compose partial updates.
  try {
    _db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() throws if already initialized — fine.
  }
  return _db;
}

export function adminStorage(): Storage {
  if (_storage) return _storage;
  _storage = getStorage(getAdminApp());
  return _storage;
}
