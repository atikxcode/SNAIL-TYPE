// app/api/auth/session/route.js
import { adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { syncUserToPostgres } from '@/lib/db/userActions';

export async function POST(request) {
  try {
    const { idToken } = await request.json();

    // Verify the ID token
    const decodedClaims = await adminAuth.verifyIdToken(idToken);

    // Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 14 * 24 * 60 * 60 * 1000, // 14 days
    });

    // Set cookie
    cookies().set('__session', sessionCookie, {
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'strict',
    });

    // Sync user to PostgreSQL
    await syncUserToPostgres(decodedClaims);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(request) {
  try {
    // Delete session cookie
    cookies().delete('__session');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Session deletion error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}