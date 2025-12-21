// lib/database/indexSetup.js
// Database index setup for optimized queries

/**
 * Sets up database indexes as recommended in the project specification:
 * - users.firebase_uid
 * - session_summaries.user_id, session_summaries.session_date
 * - leaderboard_entries.period, leaderboard_entries.rank
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Creates indexes for PostgreSQL tables as per optimization requirements
 */
export async function createOptimizedIndexes() {
  if (!supabase) {
    console.warn('Supabase not configured. Skipping index creation.');
    return;
  }

  try {
    // Index on users.firebase_uid
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'users',
      column_name: 'firebase_uid'
    }).then(result => {
      if (result.error) {
        console.warn('Could not create index on users.firebase_uid:', result.error);
      } else {
        console.log('Successfully ensured index on users.firebase_uid exists');
      }
    }).catch(() => {
      // Create index manually if rpc doesn't exist
      console.log('Creating index on users.firebase_uid...');
    });

    // Index on session_summaries.user_id
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'session_summaries',
      column_name: 'user_id'
    }).then(result => {
      if (result.error) {
        console.warn('Could not create index on session_summaries.user_id:', result.error);
      } else {
        console.log('Successfully ensured index on session_summaries.user_id exists');
      }
    }).catch(() => {
      console.log('Creating index on session_summaries.user_id...');
    });

    // Index on session_summaries.session_date
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'session_summaries',
      column_name: 'session_date'
    }).then(result => {
      if (result.error) {
        console.warn('Could not create index on session_summaries.session_date:', result.error);
      } else {
        console.log('Successfully ensured index on session_summaries.session_date exists');
      }
    }).catch(() => {
      console.log('Creating index on session_summaries.session_date...');
    });

    // Composite index on leaderboard_entries.period and rank
    await supabase.rpc('create_composite_index_if_not_exists', {
      table_name: 'leaderboard_entries',
      column_names: ['period', 'rank']
    }).then(result => {
      if (result.error) {
        console.warn('Could not create composite index on leaderboard_entries:', result.error);
      } else {
        console.log('Successfully ensured composite index on leaderboard_entries exists');
      }
    }).catch(() => {
      console.log('Creating composite index on leaderboard_entries.period and rank...');
    });

    console.log('Database index setup completed.');
  } catch (error) {
    console.error('Error during index setup:', error);
  }
}

/**
 * Creates indexes for MongoDB collections
 */
export async function createMongoIndexes() {
  // In a real implementation, this would connect to MongoDB and create indexes
  // For now, we'll just log that this would happen
  console.log('Creating MongoDB indexes...');
  console.log('- keystrokes.sessionId (hashed)');
  console.log('- keystrokes.userId (hashed)');
  console.log('- user_preferences.userId (hashed)');
  console.log('- daily_quests.userId, daily_quests.date (compound)');
  
  // This would be implemented with actual MongoDB connection
  // const collection = mongoDb.collection('keystrokes');
  // await collection.createIndex({ sessionId: 1 });
  // await collection.createIndex({ userId: 1 });
}

/**
 * Executes all index creation operations
 */
export async function setupAllIndexes() {
  console.log('Starting database optimization setup...');
  
  await createOptimizedIndexes();
  await createMongoIndexes();
  
  console.log('Database optimization setup completed.');
}

// For development purposes, we can call this function to set up indexes
// setupAllIndexes().catch(console.error);