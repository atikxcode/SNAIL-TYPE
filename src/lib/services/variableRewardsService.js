import { awardXp } from './gamificationService';
import { createClient } from '@supabase/supabase-js';

/**
 * Generate surprise bonus rewards (20% chance after each test)
 */
export async function generateSurpriseBonus(userId) {
  // 20% chance of a surprise bonus
  if (Math.random() > 0.2) {
    return {
      hasBonus: false,
      bonusType: null,
      message: null
    };
  }

  // Randomly select a bonus type
  const bonusTypes = [
    {
      type: 'lucky_test',
      multiplier: 2,
      message: 'Lucky Test! Double XP this round!'
    },
    {
      type: 'bonus_xp',
      amount: 25,
      message: 'Special Bonus: 25 bonus XP!'
    },
    {
      type: 'streak_freeze',
      message: 'Mystery Box: +1 Streak Freeze!'
    },
    {
      type: 'random_achievement',
      message: 'Secret Achievement Unlocked!'
    }
  ];

  const selectedBonus = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];

  let xpAwarded = 0;

  if (selectedBonus.type === 'lucky_test') {
    // This would be handled by doubling the XP earned in the session
    xpAwarded = 0; // The actual doubling happens differently
  } else if (selectedBonus.type === 'bonus_xp') {
    await awardXp(userId, selectedBonus.amount);
    xpAwarded = selectedBonus.amount;
  } else if (selectedBonus.type === 'streak_freeze') {
    // Add streak freeze to user's account
    await addToUserStreakFreezes(userId, 1);
  } else if (selectedBonus.type === 'random_achievement') {
    // This would unlock a random achievement
    xpAwarded = await unlockRandomAchievement(userId);
  }

  return {
    hasBonus: true,
    bonusType: selectedBonus.type,
    message: selectedBonus.message,
    xpAwarded: xpAwarded
  };
}

/**
 * Add streak freezes to a user
 */
async function addToUserStreakFreezes(userId, count) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: userStats, error: selectError } = await supabaseAdmin
      .from('user_stats')
      .select('streak_freezes_available')
      .eq('user_id', userId)
      .single();

    if (selectError) {
      console.error('Error getting user stats for streak freeze:', selectError);
      return { success: false, error: selectError.message };
    }

    const newCount = (userStats?.streak_freezes_available || 0) + count;

    const { error: updateError } = await supabaseAdmin
      .from('user_stats')
      .update({ streak_freezes_available: newCount })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating streak freezes:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in addToUserStreakFreezes:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unlock a random achievement for the user
 */
async function unlockRandomAchievement(userId) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get all possible achievements
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

    // Filter to achievements the user hasn't unlocked
    const availableAchievements = allAchievements.filter(ach =>
      !unlockedAchIds.has(ach.id)
    );

    if (availableAchievements.length === 0) {
      return 0; // No achievements left to unlock
    }

    // Randomly select an available achievement
    const randomAchievement = availableAchievements[
      Math.floor(Math.random() * availableAchievements.length)
    ];

    // Award the achievement
    const { error: awardError } = await supabaseAdmin
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: randomAchievement.id
      });

    if (awardError) {
      throw awardError;
    }

    // Award XP for the achievement
    if (randomAchievement.xp_reward > 0) {
      await awardXp(userId, randomAchievement.xp_reward);
      return randomAchievement.xp_reward;
    }

    return 0;
  } catch (error) {
    console.error('Error unlocking random achievement:', error);
    return 0; // Don't return error, just give 0 XP
  }
}

/**
 * Generate near-miss notifications
 */
export function generateNearMissNotifications(sessionData, userStats) {
  const notifications = [];

  // Check if user was close to beating their record
  if (userStats && userStats.best_wpm) {
    const wpmDifference = userStats.best_wpm - sessionData.wpm;
    if (wpmDifference > 0 && wpmDifference <= 2) { // Within 2 WPM of record
      notifications.push({
        type: 'near_record',
        message: `You were ${wpmDifference.toFixed(1)} WPM away from beating your record!`,
        priority: 'high'
      });
    }
  }

  // Check if user is close to leveling up
  if (userStats && userStats.xp && userStats.level) {
    const requiredXp = userStats.level * 100; // Level N requires N * 100 XP
    const xpToNext = requiredXp - userStats.xp;

    if (xpToNext > 0 && xpToNext <= 20) { // Within 20 XP of next level
      notifications.push({
        type: 'near_level',
        message: `${xpToNext} XP to level up!`,
        priority: 'high'
      });
    }
  }

  // Check if user was close to a tier up
  if (userStats && sessionData.wpm) {
    // Determine current tier and next tier
    const tiers = [
      { name: 'Bronze', minWpm: 0, maxWpm: 40 },
      { name: 'Silver', minWpm: 40, maxWpm: 60 },
      { name: 'Gold', minWpm: 60, maxWpm: 80 },
      { name: 'Platinum', minWpm: 80, maxWpm: 100 },
      { name: 'Diamond', minWpm: 100, maxWpm: Infinity }
    ];

    // Find which tier they would be in at their current WPM
    let currentTierIndex = -1;
    for (let i = 0; i < tiers.length; i++) {
      if (sessionData.wpm >= tiers[i].minWpm && sessionData.wpm < tiers[i].maxWpm) {
        currentTierIndex = i;
        break;
      }
    }

    // Check if they're close to the next tier
    if (currentTierIndex < tiers.length - 1) {
      const nextTier = tiers[currentTierIndex + 1];
      const wpmToNextTier = nextTier.minWpm - sessionData.wpm;

      if (wpmToNextTier > 0 && wpmToNextTier <= 5) { // Within 5 WPM of next tier
        notifications.push({
          type: 'near_tier',
          message: `Just ${wpmToNextTier.toFixed(1)} WPM to ${nextTier.name} tier!`,
          priority: 'medium'
        });
      }
    }
  }

  return notifications;
}

/**
 * Generate motivational triggers
 */
export function generateMotivationalTriggers(userStats) {
  const messages = [];

  // Calculate improvement stats if possible
  if (userStats) {
    if (userStats.total_tests > 0) {
      const avgTestsPerDay = userStats.total_tests / 30; // Assuming 30 days of activity

      if (avgTestsPerDay >= 2) { // Active user
        messages.push({
          type: 'consistency',
          message: 'You\'re building a strong habit! Consistent practice is the key to success.'
        });
      }
    }

    // Check for improvement trends
    if (userStats.current_streak_days >= 5) {
      messages.push({
        type: 'streak',
        message: `You're on a ${userStats.current_streak_days}-day streak! Keep the momentum going!`
      });
    }

    // Check for engagement with gamification
    if (userStats.xp >= 500) {
      messages.push({
        type: 'engagement',
        message: 'You\'re really getting into the gamification! Keep up the great work.'
      });
    }
  }

  return messages;
}

/**
 * Process all variable rewards after a test session
 */
export async function processVariableRewards(userId, sessionData, userStats) {
  try {
    // Generate surprise bonus
    const surpriseBonus = await generateSurpriseBonus(userId);

    // Generate near-miss notifications
    const nearMissNotifications = generateNearMissNotifications(sessionData, userStats);

    // Generate motivational triggers
    const motivationalMessages = generateMotivationalTriggers(userStats);

    return {
      success: true,
      surpriseBonus,
      nearMissNotifications,
      motivationalMessages
    };
  } catch (error) {
    console.error('Error processing variable rewards:', error);
    return {
      success: false,
      error: error.message,
      surpriseBonus: { hasBonus: false },
      nearMissNotifications: [],
      motivationalMessages: []
    };
  }
}