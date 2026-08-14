const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const { getAuth } = require('firebase-admin/auth');

let db = null;
let auth = null;

if (process.env.FIREBASE_PROJECT_ID) {
  try {
    // Check if already initialized to avoid errors during hot-reloads
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    db = getFirestore();
    auth = getAuth();
    console.log('Firestore and Auth initialized.');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else {
  console.warn('Firestore not initialized: Missing FIREBASE_PROJECT_ID.');
}

module.exports = { db, auth };
