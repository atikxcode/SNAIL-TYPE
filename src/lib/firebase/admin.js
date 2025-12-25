// lib/firebase/admin.js
import admin from 'firebase-admin';

// Check if Firebase Admin SDK is already initialized

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(`Missing Firebase Admin environment variables: ${!projectId ? 'FIREBASE_ADMIN_PROJECT_ID ' : ''}${!clientEmail ? 'FIREBASE_ADMIN_CLIENT_EMAIL ' : ''}${!privateKey ? 'FIREBASE_ADMIN_PRIVATE_KEY' : ''}`);
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw new Error(`Firebase Admin failed to initialize: ${error.message}`);
  }
}

export const adminAuth = admin.auth();
export default admin;