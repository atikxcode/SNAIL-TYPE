// lib/services/gamificationService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('GamificationService: Missing Supabase environment variables. Service will not function.');
}

const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

/**
 * Calculate XP earned from a test session
 */
export function calculateXpEarned(sessionData, userStats) {
  let xp = 0;

  // Base XP for completing a test
  xp += 10;

  // Bonus for high accuracy (>95%)
  if (sessionData.accuracy > 95) {
    xp += 5;
  }

  // Bonus for beating personal best WPM (if we have previous records)
  if (userStats && sessionData.wpm > (userStats.best_wpm || 0)) {
    xp += 10;
  }

  // Bonus for high WPM
  if (sessionData.wpm >= 100) {
    xp += 15; // Top tier WPM
  } else if (sessionData.wpm >= 70) {
    xp += 10; // High WPM
  } else if (sessionData.wpm >= 50) {
    xp += 5;  // Moderate WPM
  }

  return xp;
}

/**
 * Calculate required XP for a given level
 * Formula: Level N requires 100 * N XP total
 */
export function getXpForLevel(level) {
  return level * 100;
}

/**
 * Calculate current level based on total XP
 */
export function getLevelFromXp(totalXp) {
  // Find the highest level where totalXp >= required XP
  let level = 1;
  while (totalXp >= getXpForLevel(level)) {
    level++;
  }
  return level - 1; // Return the last achievable level
}

/**
 * Get XP needed for the next level
 */
export function getXpToNextLevel(currentXp, currentLevel) {
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXp - currentXp);
}

/**
 * Award XP to a user and check for level up
 */
export async function awardXp(userId, sessionXp) {
  try {
    // Get current user stats
    const { data: currentStats, error: selectError } = await supabaseAdmin
      .from('user_stats')
      .select('xp, level')
      .eq('user_id', userId)
      .single();

    if (selectError) {
      console.error('Error getting user stats:', selectError);
      return { success: false, error: selectError.message };
    }

    // Calculate new XP and level
    const newXp = (currentStats?.xp || 0) + sessionXp;
    const oldLevel = currentStats?.level || 1;
    const newLevel = getLevelFromXp(newXp);

    // Update user stats with new XP and level if needed
    const { error: updateError } = await supabaseAdmin
      .from('user_stats')
      .update({
        xp: newXp,
        level: newLevel
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating user stats:', updateError);
      return { success: false, error: updateError.message };
    }

    // Check if user leveled up
    const levelUp = newLevel > oldLevel;

    return {
      success: true,
      newXp,
      oldLevel,
      newLevel,
      levelUp,
      xpToNextLevel: levelUp ? getXpToNextLevel(newXp, newLevel) : getXpToNextLevel(newXp, oldLevel)
    };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check achievement conditions and award if met
 */
export async function checkAchievements(userId, sessionData, userStats) {
  try {
    const unlockedAchievements = [];

    // Get all achievements
    const { data: allAchievements, error: achError } = await supabaseAdmin
      .from('achievements')
      .select('*');

    if (achError) {
      throw achError;
    }

    // Get user's already unlocked achievements
    const { data: unlockedAchs, error: unlockedError } = await supabaseAdmin
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (unlockedError) {
      throw unlockedError;
    }

    const unlockedAchIds = new Set(unlockedAchs?.map(ua => ua.achievement_id) || []);

    // Check each achievement condition
    for (const achievement of allAchievements) {
      if (unlockedAchIds.has(achievement.id)) continue; // Skip if already unlocked

      let isConditionMet = false;

      switch (achievement.key) {
        case 'first_test':
          isConditionMet = (userStats?.total_tests || 0) >= 1;
          break;
        case 'five_tests':
          isConditionMet = (userStats?.total_tests || 0) >= 5;
          break;
        case 'twenty_five_tests':
          isConditionMet = (userStats?.total_tests || 0) >= 25;
          break;
        case 'one_hundred_tests':
          isConditionMet = (userStats?.total_tests || 0) >= 100;
          break;
        case 'one_hundred_wpm':
          isConditionMet = sessionData.wpm >= 100;
          break;
        case 'perfect_accuracy':
          isConditionMet = sessionData.accuracy >= 100;
          break;
        case 'week_streak':
          isConditionMet = (userStats?.current_streak_days || 0) >= 7;
          break;
        case 'month_streak':
          isConditionMet = (userStats?.current_streak_days || 0) >= 30;
          break;
        case 'early_bird':
          const hour = new Date(sessionData.timestamp || new Date()).getHours();
          isConditionMet = hour < 8;
          break;
        case 'night_owl':
          const hour2 = new Date(sessionData.timestamp || new Date()).getHours();
          isConditionMet = hour2 >= 22;
          break;
        case 'code_ninja':
          // This would need to track code mode tests specifically
          // For now, just a placeholder
          isConditionMet = false;
          break;
        default:
          isConditionMet = false;
      }

      if (isConditionMet) {
        // Award the achievement
        const { error: awardError } = await supabaseAdmin
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_id: achievement.id
          });

        if (!awardError) {
          unlockedAchievements.push({
            ...achievement,
            xp_reward: achievement.xp_reward
          });

          // Award XP for the achievement
          await awardXp(userId, achievement.xp_reward);
        }
      }
    }

    return { success: true, unlockedAchievements };
  } catch (error) {
    console.error('Error checking achievements:', error);
    return { success: false, error: error.message, unlockedAchievements: [] };
  }
}

/**
 * Update streak for a user
 */
export async function updateStreak(userId) {
  try {
    // Get current user stats
    const { data: currentStats, error: selectError } = await supabaseAdmin
      .from('user_stats')
      .select('last_test_date, current_streak_days, longest_streak_days')
      .eq('user_id', userId)
      .single();

    if (selectError) {
      console.error('Error getting user stats for streak:', selectError);
      return { success: false, error: selectError.message };
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]; // 24 hours ago

    let newStreak = currentStats?.current_streak_days || 0;

    // Check if this is a consecutive day test to maintain streak
    if (currentStats?.last_test_date === yesterday) {
      // Continue current streak
      newStreak = currentStats.current_streak_days + 1;
    } else if (currentStats?.last_test_date !== today) {
      // Reset streak if last test was not yesterday or today
      newStreak = 1;
    }
    // If last test date is today, streak remains the same (already counted)

    // Update longest streak if current streak is greater
    const newLongestStreak = Math.max(newStreak, currentStats?.longest_streak_days || 0);

    // Update the user stats with new streak values
    const { error: updateError } = await supabaseAdmin
      .from('user_stats')
      .update({
        current_streak_days: newStreak,
        longest_streak_days: newLongestStreak,
        last_test_date: today
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating streak:', updateError);
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      currentStreak: newStreak,
      longestStreak: newLongestStreak
    };
  } catch (error) {
    console.error('Error updating streak:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user can use a streak freeze (not implemented in this service)
 */
export async function canUseStreakFreeze(userId) {
  try {
    const { data: userStats, error } = await supabaseAdmin
      .from('user_stats')
      .select('streak_freezes_available')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error checking streak freezes:', error);
      return false;
    }

    return (userStats?.streak_freezes_available || 0) > 0;
  } catch (error) {
    console.error('Error in canUseStreakFreeze:', error);
    return false;
  }
}

/**
 * Use a streak freeze for a user (not implemented in this service)
 */
export async function useStreakFreeze(userId) {
  try {
    const { data: userStats, error: selectError } = await supabaseAdmin
      .from('user_stats')
      .select('streak_freezes_available, current_streak_days')
      .eq('user_id', userId)
      .single();

    if (selectError || (userStats?.streak_freezes_available || 0) <= 0) {
      return { success: false, message: 'No streak freezes available' };
    }

    // Update the streak freeze count
    const { error: updateError } = await supabaseAdmin
      .from('user_stats')
      .update({
        streak_freezes_available: Math.max(0, (userStats.streak_freezes_available || 0) - 1)
      })
      .eq('user_id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, message: 'Streak freeze used successfully' };
  } catch (error) {
    console.error('Error using streak freeze:', error);
    return { success: false, error: error.message };
  }
}