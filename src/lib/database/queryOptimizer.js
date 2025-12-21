// lib/database/queryOptimizer.js
// Database query optimization utilities

/**
 * Creates optimized database queries with proper indexing strategies
 * Following the recommendations from the project specification:
 * - Add indexes on frequently queried columns
 * - Use connection pooling
 * - Optimize query patterns
 */

// PostgreSQL connection pool setup (using Supabase transaction pooler)
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Database operations will be mocked.');
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// MongoDB connection (for keystroke events and user preferences)
import { MongoClient } from 'mongodb';

let mongoClient = null;
let mongoDb = null;

async function initMongoConnection() {
  if (!process.env.MONGODB_URI) {
    console.warn('MongoDB URI not set. MongoDB operations will be mocked.');
    return;
  }

  try {
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    mongoDb = mongoClient.db();
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
}

// Initialize MongoDB connection on startup
if (process.env.MONGODB_URI) {
  initMongoConnection();
}

/**
 * Optimized user queries with proper indexing
 * Indexes to create:
 * - users.firebase_uid
 */
export async function getUserByFirebaseUid(firebaseUid) {
  if (!supabase) {
    // Mock implementation
    return { id: 'mock-user-id', firebase_uid: firebaseUid, email: 'mock@example.com', display_name: 'Mock User' };
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .single();

  if (error) {
    console.error('Error fetching user by Firebase UID:', error);
    throw error;
  }

  return data;
}

/**
 * Optimized session summary queries
 * Indexes to create:
 * - session_summaries.user_id
 * - session_summaries.session_date
 */
export async function getUserSessionSummaries(userId, days = 30) {
  if (!supabase) {
    // Mock implementation
    return [
      { id: 'mock-summary-1', user_id: userId, session_date: new Date().toISOString().split('T')[0], avg_wpm: 65.5, best_wpm: 80.2, avg_accuracy: 95.5 }
    ];
  }

  const { data, error } = await supabase
    .from('session_summaries')
    .select('*')
    .eq('user_id', userId)
    .gte('session_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('session_date', { ascending: false });

  if (error) {
    console.error('Error fetching user session summaries:', error);
    throw error;
  }

  return data;
}

/**
 * Optimized leaderboard queries with proper indexing
 * Indexes to create:
 * - leaderboard_entries.period
 * - leaderboard_entries.rank
 */
export async function getLeaderboardEntries(period = 'all_time', mode = 'time', limit = 100) {
  if (!supabase) {
    // Mock implementation
    return Array.from({ length: limit }, (_, i) => ({
      user_id: `mock-user-${i + 1}`,
      period,
      mode,
      best_wpm: 100 - i * 0.5,
      best_accuracy: 98 + Math.random() * 2,
      rank: i + 1
    }));
  }

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select(`
      user_id, 
      period, 
      mode, 
      best_wpm, 
      best_accuracy, 
      rank,
      users (display_name, photo_url)
    `)
    .eq('period', period)
    .eq('mode', mode)
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching leaderboard entries:', error);
    throw error;
  }

  return data;
}

/**
 * Optimized keystroke event queries for MongoDB
 */
export async function getUserKeystrokes(userId, sessionId) {
  if (!mongoDb) {
    // Mock implementation
    return {
      sessionId,
      userId,
      events: Array.from({ length: 50 }, (_, i) => ({
        key: String.fromCharCode(97 + (i % 26)), // a-z
        timestamp: Date.now() - (50 - i) * 100,
        expected: String.fromCharCode(97 + (i % 26)),
        correct: Math.random() > 0.1,
        position: i % 5,
        latency: 50 + Math.random() * 100
      }))
    };
  }

  try {
    const collection = mongoDb.collection('keystrokes');
    const result = await collection.findOne({ userId, sessionId });
    return result;
  } catch (error) {
    console.error('Error fetching keystroke events:', error);
    throw error;
  }
}

/**
 * Optimized user preferences query for MongoDB
 */
export async function getUserPreferences(userId) {
  if (!mongoDb) {
    // Mock implementation
    return {
      userId,
      theme: 'light',
      caretStyle: 'smooth',
      fontFamily: 'monospace',
      fontSize: 'medium',
      typewriterSounds: false,
      errorSound: false,
      completionSound: false,
      volume: 50,
      strictMode: false,
      quickRestart: false,
      confidenceMode: false,
      freedomMode: false
    };
  }

  try {
    const collection = mongoDb.collection('user_preferences');
    const result = await collection.findOne({ userId });
    return result;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    throw error;
  }
}

/**
 * Batch insert for keystroke events to optimize write performance
 */
export async function batchInsertKeystrokes(events) {
  if (!mongoDb) {
    // Mock implementation
    return { insertedCount: events.length };
  }

  try {
    const collection = mongoDb.collection('keystrokes');
    const result = await collection.insertMany(events, { ordered: false });
    return result;
  } catch (error) {
    console.error('Error batch inserting keystrokes:', error);
    throw error;
  }
}

/**
 * Close database connections
 */
export async function closeDatabaseConnections() {
  if (mongoClient) {
    await mongoClient.close();
  }
}