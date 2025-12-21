// app/api/sessions/create/route.js
import clientPromise from '@/lib/db/mongoClient';
import { DB_NAME } from '@/lib/db/mongoClient';
import { verifyAuth } from '@/lib/auth/verify';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    
    const { mode, duration, wordCount } = await request.json();
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const sessionData = {
      userId: user ? new ObjectId(user.uid) : null,
      firebaseUid: user ? user.uid : null,
      mode,
      duration,
      wordCount,
      startedAt: new Date(),
      isAnonymous: !user,
      status: 'active'
    };
    
    const result = await db.collection('sessions').insertOne(sessionData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: result.insertedId.toString() 
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  } catch (error) {
    console.error('Session creation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create session' }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  }
}