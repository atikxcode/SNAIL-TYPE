// lib/db/sessionAggregation.js
import { createClient } from '@supabase/supabase-js';
import { getUserByFirebaseUid } from './userActions';
import {
  calculateXpEarned,
  awardXp,
  checkAchievements,
  updateStreak
} from '../services/gamificationService';
import { processVariableRewards } from '../services/variableRewardsService';
import { updateUserTierAfterSession } from '../services/tierService';
import { updateQuestProgress } from '../services/questsService';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Missing Supabase environment variables');
}

const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

/**
 * Updates user stats and session summaries when a session is completed
 * @param {string} firebaseUid - Firebase user ID
 * @param {Object} sessionData - Session data including wpm, accuracy, etc.
 */
export const updateSessionAggregates = async (firebaseUid, sessionData) => {
  try {
    // Get user from users table
    const user = await getUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new Error('User not found');
    }

    const userId = user.id;
    const sessionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get current user stats before update
    const currentUserStats = await getUserStats(userId);

    // Calculate XP for this session
    const sessionXp = calculateXpEarned(sessionData, currentUserStats);

    // Update or create session summary for today
    await upsertSessionSummary(userId, sessionDate, sessionData);

    // Update user stats
    await updateUserStats(userId, sessionData);

    // Update streak
    await updateStreak(userId);

    // Award XP
    const xpResult = await awardXp(userId, sessionXp);

    // Check for achievements
    const achievementResult = await checkAchievements(userId, sessionData, currentUserStats);

    // Update daily quests
    const questResult = await updateQuestProgress(firebaseUid, sessionData);

    // Update user's tier
    const tierResult = await updateUserTierAfterSession(userId);

    // Process variable rewards (surprise bonuses, near-miss notifications)
    const variableRewardsResult = await processVariableRewards(userId, sessionData, currentUserStats);

    return {
      success: true,
      xpEarned: sessionXp,
      xpResult,
      achievementResult,
      questResult,
      tierResult,
      variableRewardsResult
    };
  } catch (error) {
    console.error('Error updating session aggregates:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Upsert session summary for the given user and date
 */
const upsertSessionSummary = async (userId, sessionDate, sessionData) => {
  // First, try to get existing summary
  const { data: existingSummary, error: selectError } = await supabaseAdmin
    .from('session_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', sessionDate)
    .single();

  if (selectError && selectError.code !== 'PGRST116') { // PGRST116 means "Row not found"
    throw selectError;
  }

  // Prepare summary data
  let summaryData;
  if (existingSummary) {
    // Update existing summary
    summaryData = {
      tests_completed: existingSummary.tests_completed + 1,
      avg_wpm: ((existingSummary.avg_wpm * existingSummary.tests_completed) + sessionData.wpm) /
        (existingSummary.tests_completed + 1),
      best_wpm: Math.max(existingSummary.best_wpm || 0, sessionData.wpm),
      avg_accuracy: ((existingSummary.avg_accuracy * existingSummary.tests_completed) + sessionData.accuracy) /
        (existingSummary.tests_completed + 1),
      total_keystrokes: existingSummary.total_keystrokes + (sessionData.duration * sessionData.wpm * 5) // approx keystrokes
    };

    // Update the existing record
    const { error } = await supabaseAdmin
      .from('session_summaries')
      .update(summaryData)
      .eq('id', existingSummary.id);

    if (error) throw error;
  } else {
    // Create new summary for the day
    summaryData = {
      user_id: userId,
      session_date: sessionDate,
      tests_completed: 1,
      avg_wpm: sessionData.wpm,
      best_wpm: sessionData.wpm,
      avg_accuracy: sessionData.accuracy,
      total_keystrokes: sessionData.duration * sessionData.wpm * 5 // approx keystrokes
    };

    const { error } = await supabaseAdmin
      .from('session_summaries')
      .insert(summaryData);

    if (error) throw error;
  }
};

/**
 * Update user stats with new session data
 */
const updateUserStats = async (userId, sessionData) => {
  // Get current user stats
  const { data: existingStats, error: selectError } = await supabaseAdmin
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError;
  }

  // Calculate today's date for streak tracking
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]; // 24 hours ago

  let newStats;
  if (existingStats) {
    // Check if this is the user's first test today
    let newTotalTests = existingStats.total_tests + 1;
    let newTotalTime = existingStats.total_time_seconds + sessionData.duration;
    let newCurrentStreak = existingStats.current_streak_days;
    let newLongestStreak = existingStats.longest_streak_days;
    let newLastTestDate = today;
    let newXp = existingStats.xp || 0;
    let newLevel = existingStats.level || 1;
    let newBestWpm = Math.max(existingStats.best_wpm || 0, sessionData.wpm);
    let newTier = existingStats.current_tier || 'Bronze';

    // Check if this is a consecutive day test to maintain streak
    if (existingStats.last_test_date === yesterday) {
      // Continue current streak
      newCurrentStreak = existingStats.current_streak_days + 1;
    } else if (existingStats.last_test_date !== today) {
      // Reset streak if last test was not yesterday or today
      newCurrentStreak = 1;
    }

    // Update longest streak if current streak is greater
    if (newCurrentStreak > existingStats.longest_streak_days) {
      newLongestStreak = newCurrentStreak;
    }

    newStats = {
      total_tests: newTotalTests,
      total_time_seconds: newTotalTime,
      current_streak_days: newCurrentStreak,
      longest_streak_days: newLongestStreak,
      last_test_date: newLastTestDate,
      best_wpm: newBestWpm,
      updated_at: new Date().toISOString()
    };

    // Update the existing record
    const { error } = await supabaseAdmin
      .from('user_stats')
      .update(newStats)
      .eq('user_id', userId);

    if (error) throw error;
  } else {
    // Create new user stats record
    newStats = {
      user_id: userId,
      total_tests: 1,
      total_time_seconds: sessionData.duration,
      current_streak_days: 1,  // First test starts a streak
      longest_streak_days: 1,
      last_test_date: today,
      best_wpm: sessionData.wpm
    };

    const { error } = await supabaseAdmin
      .from('user_stats')
      .insert(newStats);

    if (error) throw error;
  }
};

/**
 * Get user stats for dashboard
 */
export const getUserStats = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
};

/**
 * Get session summaries for the last N days
 */
export const getDailyAverages = async (userId, days = 30) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('session_summaries')
      .select('session_date, avg_wpm, tests_completed')
      .eq('user_id', userId)
      .gte('session_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('session_date', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching daily averages:', error);
    return [];
  }
};

/**
 * Get recent sessions
 */
export const getRecentSessions = async (userId, limit = 20) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('session_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    return [];
  }
};