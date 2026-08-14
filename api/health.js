import { handleCors } from './lib/cors.js';
import { getDb } from './lib/firebase.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check environment variables (values masked for security)
  const envCheck = {
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_PRIVATE_KEY_HAS_NEWLINE: (process.env.FIREBASE_PRIVATE_KEY || '').includes('\n'),
    FIREBASE_PRIVATE_KEY_HAS_ESCAPED_N: (process.env.FIREBASE_PRIVATE_KEY || '').includes('\\n'),
    CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
  };

  // Try Firebase connection
  let firebaseStatus = 'not_initialized';
  let firestoreStatus = 'not_tested';
  let firestoreError = null;

  try {
    const db = getDb();
    if (db) {
      firebaseStatus = 'initialized';
      await db.collection('_health_check').limit(1).get();
      firestoreStatus = 'connected';
    } else {
      firebaseStatus = 'failed_to_init';
    }
  } catch (err) {
    firestoreStatus = 'error';
    firestoreError = err.message;
  }

  res.status(200).json({
    status: 'ok',
    message: 'Mukesh Graphics ERP API is running',
    timestamp: new Date().toISOString(),
    env: envCheck,
    firebase: {
      status: firebaseStatus,
      firestore: firestoreStatus,
      error: firestoreError,
    },
  });
}
