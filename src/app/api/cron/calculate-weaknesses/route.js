// app/api/cron/calculate-weaknesses/route.js
import clientPromise from '@/lib/db/mongoClient';
import { DB_NAME } from '@/lib/db/mongoClient';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Missing Supabase environment variables');
}

const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// Helper function to map keys to fingers
const getKeyFinger = (key) => {
  // Simplified mapping - in a real app, this would be more comprehensive
  const fingerMap = {
    'q': 'left_pinky', 'w': 'left_ring', 'e': 'left_middle', 'r': 'left_index', 't': 'left_index',
    'a': 'left_pinky', 's': 'left_ring', 'd': 'left_middle', 'f': 'left_index', 'g': 'left_index',
    'z': 'left_pinky', 'x': 'left_ring', 'c': 'left_middle', 'v': 'left_index', 'b': 'left_index',
    'y': 'right_index', 'u': 'right_index', 'i': 'right_middle', 'o': 'right_ring', 'p': 'right_pinky',
    'h': 'right_index', 'j': 'right_index', 'k': 'right_middle', 'l': 'right_ring', ';': 'right_pinky',
    'n': 'right_index', 'm': 'right_middle', ',': 'right_ring', '.': 'right_pinky', '/': 'right_pinky',
    ' ': 'thumb'
  };

  return fingerMap[key.toLowerCase()] || 'other';
};

export async function GET(request) {
  // For security, verify this is coming from a legitimate cron job
  // In a production environment, you might want to verify the source
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_AUTH_TOKEN && authHeader !== `Bearer ${process.env.CRON_AUTH_TOKEN}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Connect to MongoDB
    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);

    // Find users who tested in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSessions = await db.collection('keystrokes')
      .aggregate([
        {
          $match: {
            timestamp: { $gte: thirtyDaysAgo },
            userId: { $ne: null } // Only for authenticated users
          }
        },
        {
          $group: {
            _id: '$userId'
          }
        }
      ]).toArray();

    const userIds = recentSessions.map(session => session._id);

    // Process each user
    for (const userId of userIds) {
      await calculateWeaknessProfile(userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedUsers: userIds.length,
        message: `Processed weakness profiles for ${userIds.length} users`
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Cron job error:', error);
    return new Response(
      JSON.stringify({ error: 'Cron job failed', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Function to calculate and update a user's weakness profile
async function calculateWeaknessProfile(userId) {
  try {
    // Connect to MongoDB
    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);

    // Get keystroke data for this user from the last 100 sessions or 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const keystrokeDocs = await db.collection('keystrokes')
      .find({
        userId: userId,
        timestamp: { $gte: thirtyDaysAgo }
      })
      .limit(100) // Limit to last 100 batches
      .toArray();

    // Flatten all keystrokes from all batches
    let allKeystrokes = [];
    for (const doc of keystrokeDocs) {
      allKeystrokes = allKeystrokes.concat(doc.events);
    }

    // Calculate weak keys (error rates per key)
    const keyStats = {};
    for (const keystroke of allKeystrokes) {
      if (!keystroke.expected || keystroke.correct === undefined) continue; // Skip special keys

      const key = keystroke.expected.toLowerCase();
      if (!keyStats[key]) {
        keyStats[key] = { correct: 0, total: 0, errors: 0 };
      }

      keyStats[key].total += 1;
      if (keystroke.correct) {
        keyStats[key].correct += 1;
      } else {
        keyStats[key].errors += 1;
      }
    }

    // Calculate error rates
    const weakKeys = Object.entries(keyStats)
      .map(([key, stats]) => ({
        key,
        error_rate: stats.total > 0 ? (stats.errors / stats.total) * 100 : 0,
        total_attempts: stats.total
      }))
      .sort((a, b) => b.error_rate - a.error_rate)
      .slice(0, 20); // Top 20 weak keys

    // Calculate weak bigrams (common pairings with high error rates)
    const bigramStats = {};
    for (let i = 0; i < allKeystrokes.length - 1; i++) {
      const current = allKeystrokes[i];
      const next = allKeystrokes[i + 1];

      if (!current.expected || !next.expected || current.correct === undefined || next.correct === undefined) continue;

      const bigram = (current.expected + next.expected).toLowerCase();
      if (!bigramStats[bigram]) {
        bigramStats[bigram] = { correct: 0, total: 0 };
      }

      bigramStats[bigram].total += 1;
      if (current.correct && next.correct) {
        bigramStats[bigram].correct += 1;
      }
    }

    const weakBigrams = Object.entries(bigramStats)
      .map(([bigram, stats]) => ({
        bigram,
        error_rate: stats.total > 0 ? ((stats.total - stats.correct) / stats.total) * 100 : 0
      }))
      .sort((a, b) => b.error_rate - a.error_rate)
      .slice(0, 20); // Top 20 weak bigrams

    // Calculate accuracy by duration (fatigue analysis)
    const accuracyByDuration = { '0-15s': [], '15-30s': [], '30-60s': [], '60s+': [] };
    for (const keystroke of allKeystrokes) {
      // Group by how far into the session this keystroke was (simplified)
      const sessionPosition = Math.min(4, Math.floor(keystroke.timestamp / 15000)); // Every 15 seconds

      let bucket = '60s+';
      if (sessionPosition === 0) bucket = '0-15s';
      else if (sessionPosition === 1) bucket = '15-30s';
      else if (sessionPosition === 2) bucket = '30-60s';

      if (keystroke.correct !== undefined) {
        accuracyByDuration[bucket].push(keystroke.correct ? 1 : 0);
      }
    }

    const avgAccuracyByDuration = {};
    for (const [bucket, accuracies] of Object.entries(accuracyByDuration)) {
      if (accuracies.length > 0) {
        const avg = (accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 100;
        avgAccuracyByDuration[bucket] = parseFloat(avg.toFixed(2));
      } else {
        avgAccuracyByDuration[bucket] = 100; // Default to 100% if no data
      }
    }

    // Calculate average key latency by finger
    const fingerLatencies = {};
    for (const keystroke of allKeystrokes) {
      if (keystroke.expected && keystroke.latencyFromPreviousKey > 0) {
        const finger = getKeyFinger(keystroke.expected);
        if (!fingerLatencies[finger]) {
          fingerLatencies[finger] = { total: 0, count: 0 };
        }
        fingerLatencies[finger].total += keystroke.latencyFromPreviousKey;
        fingerLatencies[finger].count += 1;
      }
    }

    const avgKeyLatency = {};
    for (const [finger, data] of Object.entries(fingerLatencies)) {
      if (data.count > 0) {
        avgKeyLatency[finger] = Math.round(data.total / data.count);
      }
    }

    // Update the weakness profile in PostgreSQL
    const { error } = await supabaseAdmin
      .from('weakness_profiles')
      .upsert({
        user_id: userId, // This should be a UUID
        weak_keys: weakKeys,
        weak_bigrams: weakBigrams,
        avg_accuracy_by_duration: avgAccuracyByDuration,
        avg_key_latency: avgKeyLatency
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error(`Error updating weakness profile for user ${userId}:`, error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error(`Error calculating weakness profile for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}