// app/api/sessions/end/route.js
import clientPromise from '@/lib/db/mongoClient';
import { DB_NAME } from '@/lib/db/mongoClient';
import { verifyAuth } from '@/lib/auth/verify';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    
    const { 
      sessionId, 
      wpm, 
      rawWpm, 
      accuracy, 
      errors, 
      duration, 
      wordCount,
      startedAt,
      endedAt
    } = await request.json();
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // Update the session with final data
    const sessionUpdate = {
      $set: {
        endedAt: new Date(endedAt),
        wpm,
        rawWpm,
        accuracy,
        errors,
        duration,
        wordCount,
        status: 'completed'
      }
    };
    
    if (user) {
      sessionUpdate.$set.userId = new ObjectId(user.uid);
      sessionUpdate.$set.firebaseUid = user.uid;
      sessionUpdate.$set.isAnonymous = false;
    } else {
      sessionUpdate.$set.isAnonymous = true;
    }
    
    const result = await db.collection('sessions').updateOne(
      { _id: new ObjectId(sessionId) },
      sessionUpdate
    );
    
    if (result.matchedCount === 0) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }), 
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        } 
      );
    }
    
    return new Response(
      JSON.stringify({ success: true }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  } catch (error) {
    console.error('Session end error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to end session' }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  }
}