// lib/services/achievementNotificationService.js
import { createClient } from '@supabase/supabase-js';
import { sendEmailNotification } from './emailNotificationService';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Check for unlocked achievements after a session and notify the user
 */
export async function checkAndNotifyAchievements(userId, sessionData, previousStats) {
  try {
    // Get user's achievement status
    const { data: userAchievements, error: achError } = await supabaseAdmin
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (achError) throw achError;

    const unlockedAchievementIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);
    
    // Get all available achievements
    const { data: allAchievements, error: allAchError } = await supabaseAdmin
      .from('achievements')
      .select('*');
    
    if (allAchError) throw allAchError;
    
    // Get user's stats for this session
    const { data: currentStats, error: statsError } = await supabaseAdmin
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (statsError) throw statsError;
    
    // Check which achievements should be unlocked
    const newlyUnlocked = [];
    for (const achievement of allAchievements) {
      if (unlockedAchievementIds.has(achievement.id)) continue; // Skip already unlocked

      if (await checkAchievementRequirement(achievement, currentStats, sessionData, previousStats)) {
        newlyUnlocked.push(achievement);
      }
    }
    
    // If any achievements were unlocked, process them
    if (newlyUnlocked.length > 0) {
      for (const achievement of newlyUnlocked) {
        // Award the achievement
        const awardResult = await awardAchievement(userId, achievement.id);

        if (awardResult.success) {
          // Send notification about the achievement
          await sendAchievementNotification(userId, achievement);

          // Award bonus XP for the achievement
          if (achievement.xp_reward > 0) {
            await awardBonusXP(userId, achievement.xp_reward);
          }
        }
      }

      return {
        success: true,
        newlyUnlocked,
        totalUnlocked: newlyUnlocked.length
      };
    }
    
    return {
      success: true,
      newlyUnlocked: [],
      totalUnlocked: 0
    };
  } catch (error) {
    console.error('Error checking achievements:', error);
    return {
      success: false,
      error: error.message,
      newlyUnlocked: [],
      totalUnlocked: 0
    };
  }
}

/**
 * Check if an achievement requirement is met
 */
async function checkAchievementRequirement(achievement, currentStats, sessionData, previousStats) {
  const { key, name, description } = achievement;
  
  switch (key) {
    case 'first_test':
      return (currentStats.total_tests || 0) >= 1;
      
    case 'five_tests':
      return (currentStats.total_tests || 0) >= 5;
      
    case 'twenty_five_tests':
      return (currentStats.total_tests || 0) >= 25;
      
    case 'one_hundred_tests':
      return (currentStats.total_tests || 0) >= 100;
      
    case 'one_hundred_wpm':
      return (sessionData.wpm || 0) >= 100;
      
    case 'perfect_accuracy':
      return (sessionData.accuracy || 0) >= 100;
      
    case 'week_streak':
      return (currentStats.current_streak_days || 0) >= 7;
      
    case 'month_streak':
      return (currentStats.current_streak_days || 0) >= 30;
      
    case 'early_bird':
      const sessionHour = new Date(sessionData.created_at || new Date()).getHours();
      return sessionHour < 8;
      
    case 'night_owl':
      const sessionHour2 = new Date(sessionData.created_at || new Date()).getHours();
      return sessionHour2 >= 22;
      
    case 'code_ninja':
      // This would be triggered by completing code mode tests
      return false; // Placeholder - would need to track code mode tests specifically
      
    case 'accuracy_master':
      return (sessionData.accuracy || 0) >= 98;
      
    case 'speed_demon':
      return (sessionData.wpm || 0) >= 120;
      
    case 'marathon_typist':
      return (sessionData.duration || 0) >= 120; // 2+ minute test
      
    case 'consistency_king':
      // If user has completed 10+ tests with accuracy > 95% in last 7 days
      if (currentStats.total_tests >= 10 && currentStats.avg_accuracy >= 95) {
        return true;
      }
      return false;
      
    case 'improvement_chaser':
      // If user improved their personal best by 10+ WPM in this session
      if (sessionData.wpm && previousStats) {
        const bestWpmBefore = previousStats.best_wpm || 0;
        const improvement = (sessionData.wpm || 0) - bestWpmBefore;
        return improvement >= 10;
      }
      return false;
      
    default:
      return false;
  }
}

/**
 * Award an achievement to a user
 */
async function awardAchievement(userId, achievementId) {
  try {
    // Check if already awarded to prevent duplicates
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();
    
    if (existing) {
      // Already awarded
      return { success: true, message: 'Achievement already awarded' };
    }
    
    const { error } = await supabaseAdmin
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date(),
        progress: 100 // Fully completed achievement
      });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error awarding achievement:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to user about a new achievement
 */
async function sendAchievementNotification(userId, achievement) {
  try {
    const notificationData = {
      achievementName: achievement.name,
      achievementDescription: achievement.description,
      icon: achievement.icon_url || '🏆',
      xpAwarded: achievement.xp_reward || 0
    };
    
    const result = await sendEmailNotification(
      userId,
      'achievement_unlocked',
      notificationData
    );
    
    return result;
  } catch (error) {
    console.error('Error sending achievement notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Award bonus XP when an achievement is unlocked
 */
async function awardBonusXP(userId, xpAmount) {
  try {
    const { data: currentStats, error: selectError } = await supabaseAdmin
      .from('user_stats')
      .select('xp, level')
      .eq('user_id', userId)
      .single();

    if (selectError) throw selectError;

    const newXP = (currentStats.xp || 0) + xpAmount;
    let newLevel = currentStats.level || 1;

    // Check if the XP earns a new level
    const xpForNextLevel = newLevel * 100; // Level N requires N*100 XP
    if (newXP >= xpForNextLevel) {
      newLevel = Math.floor(newXP / 100) + 1;
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_stats')
      .update({
        xp: newXP,
        level: newLevel,
        updated_at: new Date()
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // If level up occurred, also notify user
    if (newLevel > (currentStats?.level || 1)) {
      await sendLevelUpNotification(userId, currentStats?.level || 1, newLevel);
    }

    return { success: true, newXP, newLevel };
  } catch (error) {
    console.error('Error awarding bonus XP:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification when user levels up
 */
async function sendLevelUpNotification(userId, oldLevel, newLevel) {
  try {
    const notificationData = {
      oldLevel,
      newLevel,
      message: `Congratulations! You've leveled up from ${oldLevel} to ${newLevel}!`
    };
    
    const result = await sendEmailNotification(
      userId,
      'level_up',
      notificationData
    );
    
    return result;
  } catch (error) {
    console.error('Error sending level up notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's unlocked achievements
 */
export async function getUserAchievements(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(id, key, name, description, icon_url, xp_reward)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });
    
    if (error) throw error;
    
    return {
      success: true,
      achievements: data || []
    };
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return {
      success: false,
      error: error.message,
      achievements: []
    };
  }
}

/**
 * Get all available achievements
 */
export async function getAllAchievements() {
  try {
    const { data, error } = await supabaseAdmin
      .from('achievements')
      .select('*')
      .order('xp_reward', { ascending: false });
    
    if (error) throw error;
    
    return {
      success: true,
      achievements: data || []
    };
  } catch (error) {
    console.error('Error getting all achievements:', error);
    return {
      success: false,
      error: error.message,
      achievements: []
    };
  }
}

/**
 * Process achievement checks for a completed session
 */
export async function processSessionAchievements(userId, sessionData) {
  try {
    // Get user's stats before this session
    const { data: previousStats, error: prevError } = await supabaseAdmin
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (prevError) throw prevError;
    
    // Check for unlocked achievements and notify
    const result = await checkAndNotifyAchievements(userId, sessionData, previousStats);
    
    return result;
  } catch (error) {
    console.error('Error processing session achievements:', error);
    return {
      success: false,
      error: error.message,
      newlyUnlocked: [],
      totalUnlocked: 0
    };
  }
}

/**
 * Award special achievements based on keystroke analysis
 */
export async function checkKeystrokeBasedAchievements(userId, keystrokeData) {
  try {
    // Get all achievements that are based on keystroke analysis
    const { data: keystrokeAchievements, error: achError } = await supabaseAdmin
      .from('achievements')
      .select('*')
      .ilike('key', '%keystroke%'); // Case-insensitive match for keystroke-related achievements
    
    if (achError) throw achError;
    
    const newlyUnlocked = [];
    
    // Process each keystroke-based achievement
    for (const achievement of keystrokeAchievements) {
      switch (achievement.key) {
        case 'keystroke_consistency':
          // Check for consistent keystroke timing
          const avgLatency = keystrokeData.reduce((sum, ks) => sum + (ks.latencyFromPreviousKey || 0), 0) / keystrokeData.length;
          if (avgLatency <= 150) { // Less than 150ms average latency
            newlyUnlocked.push(achievement);
          }
          break;
          
        case 'accuracy_perfectionist':
          // Check for very low error rate in keystrokes
          const errors = keystrokeData.filter(ks => !ks.correct).length;
          const errorRate = (errors / keystrokeData.length) * 100;
          if (errorRate <= 2) { // 2% or less error rate
            newlyUnlocked.push(achievement);
          }
          break;
          
        case 'fast_fingers':
          // Check for quick individual keystrokes
          const fastKeystrokes = keystrokeData.filter(ks => (ks.latencyFromPreviousKey || 999) < 100).length;
          const fastRatio = fastKeystrokes / keystrokeData.length;
          if (fastRatio >= 0.7) { // 70% of keystrokes are very fast
            newlyUnlocked.push(achievement);
          }
          break;
          
        default:
          break;
      }
    }
    
    // Award any newly unlocked achievements
    for (const achievement of newlyUnlocked) {
      const awardResult = await awardAchievement(userId, achievement.id);
      
      if (awardResult.success) {
        // Send notification
        await sendAchievementNotification(userId, achievement);
        
        // Award bonus XP
        if (achievement.xp_reward > 0) {
          await awardBonusXp(userId, achievement.xp_reward);
        }
      }
    }
    
    return {
      success: true,
      newlyUnlocked,
      totalUnlocked: newlyUnlocked.length
    };
  } catch (error) {
    console.error('Error checking keystroke-based achievements:', error);
    return {
      success: false,
      error: error.message,
      newlyUnlocked: [],
      totalUnlocked: 0
    };
  }
}

/**
 * Check for streak-related achievements
 */
export async function checkStreakAchievements(userId, currentStreak) {
  try {
    // Get streak-related achievements
    const { data: streakAchievements, error } = await supabaseAdmin
      .from('achievements')
      .select('*')
      .ilike('key', '%streak%'); // Case-insensitive match for streak-related achievements
    
    if (error) throw error;
    
    const newlyUnlocked = [];
    
    for (const achievement of streakAchievements) {
      switch (achievement.key) {
        case 'week_warrior':
          if (currentStreak >= 7) {
            newlyUnlocked.push(achievement);
          }
          break;
          
        case 'month_master':
          if (currentStreak >= 30) {
            newlyUnlocked.push(achievement);
          }
          break;
          
        case 'century_club':
          if (currentStreak >= 100) {
            newlyUnlocked.push(achievement);
          }
          break;
          
        case 'year_loyalist':
          if (currentStreak >= 365) {
            newlyUnlocked.push(achievement);
          }
          break;
          
        default:
          break;
      }
    }
    
    // Award any newly unlocked achievements
    for (const achievement of newlyUnlocked) {
      const awardResult = await awardAchievement(userId, achievement.id);
      
      if (awardResult.success) {
        await sendAchievementNotification(userId, achievement);
        
        if (achievement.xp_reward > 0) {
          await awardBonusXp(userId, achievement.xp_reward);
        }
      }
    }
    
    return {
      success: true,
      newlyUnlocked,
      totalUnlocked: newlyUnlocked.length
    };
  } catch (error) {
    console.error('Error checking streak achievements:', error);
    return {
      success: false,
      error: error.message,
      newlyUnlocked: [],
      totalUnlocked: 0
    };
  }
}