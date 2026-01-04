// src/app/api/leaderboard/route.js
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from '@/lib/auth/verify';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Missing Supabase environment variables');
}

const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const period = searchParams.get('period') || 'all_time';
    const mode = searchParams.get('mode') || 'all';
    const category = searchParams.get('category') || 'all';
    const limit = parseInt(searchParams.get('limit')) || 100;
    const offset = parseInt(searchParams.get('offset')) || 0;

    // Verify authentication (not required for viewing leaderboards, but useful for personalized views)
    let user = null;
    try {
      user = await verifyAuth(request);
    } catch (error) {
      // If not authenticated, continue without user context
    }

    // Build the query based on filters
    let query = supabaseAdmin
      .from('leaderboard_entries')
      .select(`
        *,
        users(display_name, photo_url)
      `)
      .eq('period', period)
      .order('best_wpm', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply additional filters if specified
    if (mode !== 'all') {
      query = query.eq('mode', mode);
    }

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Find the authenticated user's rank if they're signed in
    let userRank = null;
    if (user) {
      // Calculate user's rank based on the same criteria
      const { count, error: countError } = await supabaseAdmin
        .from('leaderboard_entries')
        .select('*', { count: 'exact', head: true })
        .eq('period', period);

      if (!countError) {
        // Get user's specific entry
        const { data: userData } = await supabaseAdmin
          .from('leaderboard_entries')
          .select('best_wpm')
          .eq('user_id', user.uid)
          .eq('period', period)
          .single();

        if (userData) {
          // Calculate rank by counting entries with better WPM
          const { count: betterCount, error: betterCountError } = await supabaseAdmin
            .from('leaderboard_entries')
            .select('*', { count: 'exact', head: true })
            .eq('period', period)
            .gt('best_wpm', userData.best_wpm);

          if (!betterCountError) {
            userRank = betterCount + 1;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        leaderboard: data || [],
        userRank,
        period,
        mode,
        category,
        limit,
        offset
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch leaderboard', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// POST API to update a user's leaderboard entry after a test session
export async function POST(request) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { wpm, accuracy, testMode, testDuration, category, testDate } = await request.json();

    if (!wpm || !accuracy || !testMode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: wpm, accuracy, testMode' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Determine the appropriate period for the entry based on test date
    const now = testDate ? new Date(testDate) : new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
    const month = dateStr.substring(0, 7); // YYYY-MM

    const periods = ['all_time'];

    // Add day period if this is today
    if (dateStr === new Date().toISOString().split('T')[0]) {
      periods.push('daily');
    }

    // Add week period if this is this week
    const today = new Date();
    const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1; // Adjust for Sunday
    const thisWeekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceMonday);
    const entryDate = testDate ? new Date(testDate) : new Date();

    if (entryDate >= thisWeekStart) {
      periods.push('weekly');
    }

    // Add month period if this is this month
    if (dateStr.substring(0, 7) === new Date().toISOString().substring(0, 7)) {
      periods.push('monthly');
    }

    // Create/update leaderboard entry for each applicable period
    for (const period of periods) {
      // Determine the best WPM for this period
      const { data: existingEntry, error: selectError } = await supabaseAdmin
        .from('leaderboard_entries')
        .select('best_wpm, best_accuracy, tests_count')
        .eq('user_id', user.uid)
        .eq('period', period)
        .eq('mode', testMode)
        .eq('category', category || 'random_words')
        .single();

      let bestWpm = wpm;
      let bestAccuracy = accuracy;
      let testsCount = 1;

      if (existingEntry && !selectError) {
        // Update if current WPM is better, otherwise keep existing best and increment tests count
        bestWpm = Math.max(existingEntry.best_wpm, wpm);
        bestAccuracy = wpm > existingEntry.best_wpm ? accuracy : existingEntry.best_accuracy;
        testsCount = existingEntry.tests_count + 1;
      }

      // Insert or update the leaderboard entry
      const { error: upsertError } = await supabaseAdmin
        .from('leaderboard_entries')
        .upsert({
          user_id: user.uid,
          period,
          mode: testMode,
          category: category || 'random_words',
          best_wpm: bestWpm,
          best_accuracy: bestAccuracy,
          tests_count: testsCount
        }, {
          onConflict: 'user_id,period,mode,category'
        });

      if (upsertError) {
        console.error(`Error updating leaderboard for period ${period}:`, upsertError);
        throw upsertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Leaderboard entry updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Leaderboard update error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update leaderboard entry', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}