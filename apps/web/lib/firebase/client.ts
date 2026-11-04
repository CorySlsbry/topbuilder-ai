// =============================================================================
// Firebase client SDK initialization (browser-safe).
// =============================================================================
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  initializeFirestore,
  connectFirestoreEmulator,
  terminate,
  clearIndexedDbPersistence,
  type Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === '1';

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps()[0] ?? initializeApp(config);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  if (useEmulators && typeof window !== 'undefined') {
    connectAuthEmulator(_auth, 'http://localhost:9099', { disableWarnings: true });
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (_db) return _db;
  _db = initializeFirestore(getFirebaseApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (useEmulators && typeof window !== 'undefined') {
    connectFirestoreEmulator(_db, 'localhost', 8080);
  }
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(getFirebaseApp());
  if (useEmulators && typeof window !== 'undefined') {
    connectStorageEmulator(_storage, 'localhost', 9199);
  }
  return _storage;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Tear down all client-side Firebase state so no cached data survives a user
 * switch. Firestore's persistentLocalCache writes tenant documents into
 * IndexedDB; without clearing it, the next account to sign in on the same
 * browser can momentarily read the previous tenant's cached docs before
 * Security Rules re-evaluate against the new token. Call this AFTER signOut().
 *
 * Best-effort: terminate()/clearIndexedDbPersistence() can reject when other
 * tabs hold the DB open, but resetting the singletons (so the next getFirebaseDb
 * re-initializes a fresh cache) is the load-bearing part and always runs.
 */
export async function clearFirebaseClientState(): Promise<void> {
  try {
    if (_db) {
      await terminate(_db);
      await clearIndexedDbPersistence(_db);
    }
  } catch {
    // Ignore — the singleton reset below is what prevents the in-memory leak.
  } finally {
    _db = undefined;
    _auth = undefined;
    _storage = undefined;
    // Keep _app: re-running initializeApp() would throw 'app/duplicate-app',
    // and getFirebaseAuth/Db re-derive their instances from the cached app.
  }
}
