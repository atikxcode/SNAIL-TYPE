// lib/services/tierService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('TierService: Missing Supabase environment variables. Service will not function.');
}

const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// Tier definitions based on WPM
const TIER_THRESHOLDS = [
  { name: 'Bronze', minWpm: 0, maxWpm: 40, color: '#CD7F32' },
  { name: 'Silver', minWpm: 40, maxWpm: 60, color: '#C0C0C0' },
  { name: 'Gold', minWpm: 60, maxWpm: 80, color: '#FFD700' },
  { name: 'Platinum', minWpm: 80, maxWpm: 100, color: '#E5E4E2' },
  { name: 'Diamond', minWpm: 100, maxWpm: Infinity, color: '#B9F2FF' }
];

/**
 * Calculate tier based on WPM
 */
export function getTierFromWpm(wpm) {
  for (const tier of TIER_THRESHOLDS) {
    if (wpm >= tier.minWpm && wpm < tier.maxWpm) {
      return tier;
    }
  }
  return TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1]; // Return highest tier if above max
}

/**
 * Get all tiers for display purposes
 */
export function getAllTiers() {
  return TIER_THRESHOLDS;
}

/**
 * Calculate user's tier based on their rolling 30-day average WPM
 */
export async function calculateUserTier(userId) {
  try {
    // Get user's session summaries for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: sessionSummaries, error } = await supabaseAdmin
      .from('session_summaries')
      .select('avg_wpm, session_date')
      .eq('user_id', userId)
      .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('session_date', { ascending: false });

    if (error) {
      console.error('Error fetching session summaries for tier calculation:', error);
      return { success: false, error: error.message };
    }

    if (!sessionSummaries || sessionSummaries.length === 0) {
      // If no recent sessions, try getting their best WPM from user_stats
      const { data: userStats, error: statsError } = await supabaseAdmin
        .from('user_stats')
        .select('best_wpm')
        .eq('user_id', userId)
        .single();

      if (statsError) {
        console.error('Error fetching user stats for tier calculation:', statsError);
        return { success: false, error: statsError.message };
      }

      const tier = getTierFromWpm(userStats?.best_wpm || 0);
      return {
        success: true,
        tier: tier.name,
        wpm: userStats?.best_wpm || 0,
        tierData: tier
      };
    }

    // Calculate average WPM over the last 30 days
    const totalWpm = sessionSummaries.reduce((sum, session) => sum + (session.avg_wpm || 0), 0);
    const avgWpm = sessionSummaries.length > 0 ? totalWpm / sessionSummaries.length : 0;

    const tier = getTierFromWpm(avgWpm);

    // Update user's tier in their profile
    const { error: updateError } = await supabaseAdmin
      .from('user_stats')
      .update({ current_tier: tier.name })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating user tier:', updateError);
    }

    return {
      success: true,
      tier: tier.name,
      wpm: avgWpm,
      tierData: tier
    };
  } catch (error) {
    console.error('Error calculating user tier:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's progress to next tier
 */
export async function getUserTierProgress(userId) {
  try {
    const tierResult = await calculateUserTier(userId);
    if (!tierResult.success) {
      return { success: false, error: tierResult.error };
    }

    const currentTier = tierResult.tierData;

    // Find next tier
    const currentTierIndex = TIER_THRESHOLDS.findIndex(t => t.name === currentTier.name);
    const nextTier = currentTierIndex < TIER_THRESHOLDS.length - 1 ?
      TIER_THRESHOLDS[currentTierIndex + 1] : null;

    // Calculate progress percentage to next tier (or to current tier's requirement if max tier)
    let progress = 0;
    let wpmToNextTier = 0;

    if (nextTier && currentTierIndex < TIER_THRESHOLDS.length - 1) {
      // Calculate how far they are to the next tier requirement
      wpmToNextTier = nextTier.minWpm - tierResult.wpm;
      const wpmRange = nextTier.minWpm - currentTier.minWpm;
      const wpmInCurrentTier = tierResult.wpm - currentTier.minWpm;
      progress = Math.min(100, Math.round((wpmInCurrentTier / wpmRange) * 100));
    } else {
      // For the highest tier, show progress relative to some benchmark (e.g., 200 WPM)
      const wpmRange = 200 - currentTier.minWpm;
      const wpmInCurrentTier = Math.min(tierResult.wpm, 200) - currentTier.minWpm;
      progress = Math.min(100, Math.round((wpmInCurrentTier / wpmRange) * 100));
    }

    return {
      success: true,
      currentTier: currentTier,
      nextTier: nextTier,
      progress: progress,
      currentWpm: tierResult.wpm,
      wpmToNextTier: wpmToNextTier > 0 ? wpmToNextTier : 0
    };
  } catch (error) {
    console.error('Error calculating user tier progress:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update user's tier after a session
 */
export async function updateUserTierAfterSession(userId) {
  try {
    // Calculate and update the user's tier
    const tierResult = await calculateUserTier(userId);

    if (!tierResult.success) {
      return tierResult;
    }

    return {
      success: true,
      currentTier: tierResult.tier,
      currentWpm: tierResult.wpm
    };
  } catch (error) {
    console.error('Error updating user tier after session:', error);
    return { success: false, error: error.message };
  }
}