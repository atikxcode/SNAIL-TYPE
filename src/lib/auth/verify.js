// lib/auth/verify.js
import { adminAuth } from '@/lib/firebase/admin';

export const verifyAuth = async (req) => {
  try {
    // Get the session cookie from the request
    const cookieStore = req.cookies;
    const token = typeof cookieStore.get === 'function'
      ? cookieStore.get('__session')?.value
      : cookieStore['__session'];

    if (!adminAuth) {
      // console.warn('Firebase Admin not initialized, skipping auth verification');
      return null;
    }

    if (!token) {
      return null;
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(token, true /** checkRevoked */);
    return decodedClaims;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
};