// app/api/keystrokes/batch/route.js
import clientPromise from '@/lib/db/mongoClient';
import { DB_NAME } from '@/lib/db/mongoClient';
import { verifyAuth } from '@/lib/auth/verify';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    
    const { sessionId, userId: providedUserId, events } = await request.json();
    
    // Validate required fields
    if (!sessionId || !events || !Array.isArray(events)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sessionId, events' }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        } 
      );
    }
    
    // For authenticated users, use the verified user ID, otherwise allow null for anonymous
    const finalUserId = user ? user.uid : providedUserId || null;
    
    // Validate events structure
    for (const event of events) {
      if (
        typeof event.key !== 'string' || 
        typeof event.timestamp !== 'number' ||
        (event.expected !== undefined && event.expected !== null && typeof event.expected !== 'string') ||
        (event.correct !== undefined && event.correct !== null && typeof event.correct !== 'boolean') ||
        typeof event.position !== 'number' ||
        typeof event.latencyFromPreviousKey !== 'number'
      ) {
        return new Response(
          JSON.stringify({ error: 'Invalid event structure' }), 
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          } 
        );
      }
    }
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // Prepare the document to insert
    const keystrokeBatch = {
      sessionId,
      userId: finalUserId,
      timestamp: new Date(),
      events,
      createdAt: new Date()
    };
    
    // Insert the batch into the keystrokes collection
    const result = await db.collection('keystrokes').insertOne(keystrokeBatch);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        batchId: result.insertedId.toString(),
        eventsCount: events.length
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  } catch (error) {
    console.error('Keystroke batch ingestion error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to save keystroke batch' }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  }
}