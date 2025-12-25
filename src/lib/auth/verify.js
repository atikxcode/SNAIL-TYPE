// lib/auth/verify.js
import { adminAuth } from '@/lib/firebase/admin';

export const verifyAuth = async (req) => {
  try {
    // Get the session cookie from the request
    const token = req.cookies['__session'] || null;

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