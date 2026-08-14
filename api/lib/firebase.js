import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * Robustly parse the Firebase private key from the environment variable.
 * Vercel may store it with literal \n or with \\n – handle both.
 */
const parsePrivateKey = (raw) => {
  if (!raw) return null;
  // Already has real newlines
  if (raw.includes('\n')) return raw;
  // Replace escaped newlines
  return raw.replace(/\\n/g, '\n');
};

let _initialized = false;

const ensureInitialized = () => {
  if (_initialized || getApps().length > 0) {
    _initialized = true;
    return true;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.warn(
      'Firebase Admin not initialized: Missing one or more env vars ' +
      '(FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)'
    );
    return false;
  }

  const privateKey = parsePrivateKey(privateKeyRaw);

  try {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    _initialized = true;
    console.log('Firebase Admin initialized successfully.');
    return true;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
    return false;
  }
};

/**
 * Returns the Firestore instance, or null if Firebase is not configured.
 */
const getDb = () => {
  if (!ensureInitialized()) return null;
  try {
    return getFirestore(getApp());
  } catch (e) {
    console.error('Failed to get Firestore:', e.message);
    return null;
  }
};

/**
 * Returns the Auth instance, or null if Firebase is not configured.
 */
const getAuthInstance = () => {
  if (!ensureInitialized()) return null;
  try {
    return getAuth(getApp());
  } catch (e) {
    console.error('Failed to get Auth:', e.message);
    return null;
  }
};

export { getDb, getAuthInstance as getAuth };
