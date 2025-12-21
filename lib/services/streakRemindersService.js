// lib/services/streakRemindersService.js
import { createClient } from '@supabase/supabase-js';
import { sendEmailNotification } from './emailNotificationService';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Check for users who are at risk of losing their streak and send reminder notifications
 */
export async function sendStreakReminders() {
  try {
    // Calculate yesterday's date to check for users who didn't practice yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // Find users who had active streaks yesterday but haven't practiced today yet
    const { data: usersAtRisk, error } = await supabaseAdmin
      .from('user_stats')
      .select(`
        user_id,
        current_streak_days,
        longest_streak_days,
        last_test_date,
        total_tests
      `)
      .lt('last_test_date', yesterdayStr) // Last test was before yesterday
      .gt('current_streak_days', 1) // Has an active streak
      .order('current_streak_days', { ascending: false }); // Prioritize longer streaks

    if (error) throw error;

    const results = [];
    for (const user of usersAtRisk || []) {
      // Check if the user had a test yesterday (meaning they would have been at risk of losing their streak today)
      if (wasUserAtRiskOfStreakLoss(user)) {
        const result = await sendStreakReminder(user.user_id, {
          currentStreak: user.current_streak_days,
          nextMilestone: getNextMilestone(user.current_streak_days)
        });
        results.push(result);
        
        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return {
      success: true,
      usersNotified: results.length,
      results
    };
  } catch (error) {
    console.error('Error sending streak reminders:', error);
    return {
      success: false,
      error: error.message,
      usersNotified: 0,
      results: []
    };
  }
}

/**
 * Determine if a user is at risk of losing their streak
 */
function wasUserAtRiskOfStreakLoss(user) {
  // Calculate previous day
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // Check if the user's last test was yesterday, which puts them at risk today
  const lastTestDate = new Date(user.last_test_date);
  const lastTestStr = lastTestDate.toISOString().split('T')[0];
  
  return lastTestStr === yesterdayStr;
}

/**
 * Send a streak reminder to a specific user
 */
async function sendStreakReminder(userId, data) {
  try {
    const result = await sendEmailNotification(
      userId,
      'streak_reminder',
      data
    );
    
    return {
      userId,
      success: result.success,
      message: result.message || result.error
    };
  } catch (error) {
    console.error(`Error sending streak reminder to user ${userId}:`, error);
    return {
      userId,
      success: false,
      message: error.message
    };
  }
}

/**
 * Get the next significant streak milestone
 */
function getNextMilestone(currentStreak) {
  // Define streak milestones
  const milestones = [3, 5, 7, 14, 30, 60, 90, 100, 200, 365];
  
  for (const milestone of milestones) {
    if (milestone > currentStreak) {
      return milestone;
    }
  }
  
  // If current streak is beyond our defined milestones, return next 10 multiple
  return Math.ceil((currentStreak + 1) / 10) * 10;
}

/**
 * Process a user's streak when they return after a break
 */
export async function handleStreakBreakReturn(userId) {
  try {
    // Get user's current stats
    const { data: userStats, error: statsError } = await supabaseAdmin
      .from('user_stats')
      .select('current_streak_days, longest_streak_days, streak_freezes_available')
      .eq('user_id', userId)
      .single();
    
    if (statsError) throw statsError;
    
    // Calculate the user's last activity date to determine if there was a break
    const { data: recentSession, error: sessError } = await supabaseAdmin
      .from('session_summaries')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (sessError && sessError.code !== 'PGRST116') { // Row not found is OK
      throw sessError;
    }
    
    let daysSinceLast = 0;
    if (recentSession) {
      const lastSessionDate = new Date(recentSession.created_at);
      const today = new Date();
      const diffTime = Math.abs(today - lastSessionDate);
      daysSinceLast = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // If they've been away for more than 1 day, they broke their streak
    if (daysSinceLast > 1) {
      // Check if user has a streak freeze available
      const hasStreakFreeze = (userStats?.streak_freezes_available || 0) > 0;
      
      if (hasStreakFreeze) {
        // Ask if they want to use a streak freeze (in a real app, this would be handled client-side)
        // For now, we'll return information about the streak break and freeze
        return {
          success: true,
          streakBroken: true,
          hasStreakFreeze: true,
          daysSinceLast,
          currentStreak: userStats?.current_streak_days || 0,
          message: `You've been away for ${daysSinceLast} days. You have a streak freeze available to preserve your streak.`
        };
      } else {
        // Reset streak but preserve longest streak
        const { error: updateError } = await supabaseAdmin
          .from('user_stats')
          .update({ 
            current_streak_days: 1, // Reset to 1 since they just completed a test
            updated_at: new Date()
          })
          .eq('user_id', userId);
        
        if (updateError) throw updateError;
        
        return {
          success: true,
          streakBroken: true,
          hasStreakFreeze: false,
          daysSinceLast,
          originalStreak: userStats?.current_streak_days || 0,
          currentStreak: 1,
          message: `Welcome back! Your ${userStats?.current_streak_days || 0}-day streak was broken after being away for ${daysSinceLast} days. Starting fresh with day 1!`
        };
      }
    } else {
      // No break in streak, just update the last test date to today
      return {
        success: true,
        streakBroken: false,
        currentStreak: userStats?.current_streak_days || 0,
        message: 'Streak maintained! Welcome back for another session.'
      };
    }
  } catch (error) {
    console.error('Error handling streak break return:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Implement loss prevention strategies
 */
export async function implementLossPrevention(userId, sessionData = {}) {
  try {
    // Get user stats to determine appropriate loss prevention strategy
    const { data: userStats, error: statsError } = await supabaseAdmin
      .from('user_stats')
      .select(`
        current_streak_days,
        total_tests,
        avg_wpm,
        avg_accuracy,
        level,
        last_test_date
      `)
      .eq('user_id', userId)
      .single();
    
    if (statsError) throw statsError;
    
    const strategies = [];
    
    // Streak at risk
    if (userStats.current_streak_days >= 7) {
      strategies.push({
        type: 'streak_preservation',
        message: `You have a ${userStats.current_streak_days}-day streak going. Great consistency!`
      });
    }
    
    // Performance decline detection
    if (sessionData.wpm && userStats.avg_wpm) {
      if (sessionData.wpm < userStats.avg_wpm * 0.8) { // 20% below average
        strategies.push({
          type: 'performance_support',
          message: `Your performance is below your average. Maybe try an easier difficulty or take a short break?`
        });
      }
    }
    
    // Low accuracy warning
    if (sessionData.accuracy && sessionData.accuracy < 85) {
      strategies.push({
        type: 'accuracy_focus_suggestion',
        message: `Your accuracy could use some attention. Try focusing on correctness rather than speed.`
      });
    }
    
    // Infrequent user reminder
    if (userStats.total_tests < 10) {
      strategies.push({
        type: 'beginner_encouragement',
        message: `You're just getting started! Consistent daily practice is key to improvement.`
      });
    }
    
    // Long-time user with plateau
    if (userStats.total_tests > 50 && sessionData.wpm && userStats.avg_wpm) {
      if (Math.abs(sessionData.wpm - userStats.avg_wpm) < 2) { // Very little variation
        strategies.push({
          type: 'plateau_breaker',
          message: `Your performance has stabilized. Try the adaptive weakness mode to target specific areas.`
        });
      }
    }
    
    return {
      success: true,
      strategies,
      userStats
    };
  } catch (error) {
    console.error('Error implementing loss prevention:', error);
    return {
      success: false,
      error: error.message,
      strategies: [],
      userStats: null
    };
  }
}

/**
 * Award streak freezes for significant milestones
 */
export async function awardStreakMilestoneBonuses(userId) {
  try {
    const { data: userStats, error: statsError } = await supabaseAdmin
      .from('user_stats')
      .select('current_streak_days, longest_streak_days, streak_freezes_available')
      .eq('user_id', userId)
      .single();
    
    if (statsError) throw statsError;
    
    let newFreezes = userStats.streak_freezes_available || 0;
    let awardedFreeze = false;
    
    // Award streak freeze for reaching significant streak milestones
    if (
      userStats.current_streak_days === 7 ||  // Week warrior
      userStats.current_streak_days === 21 || // 3 weeks strong
      userStats.current_streak_days === 30 || // Month master  
      userStats.current_streak_days === 60 || // 2 months strong
      userStats.current_streak_days === 100 || // Century streak
      (userStats.current_streak_days > 100 && userStats.current_streak_days % 50 === 0) // Every 50 after 100
    ) {
      newFreezes += 1;
      awardedFreeze = true;
    } else if (
      userStats.longest_streak_days === 7 ||  // Reached 7-day milestone historically
      userStats.longest_streak_days === 30 ||  // Reached 30-day milestone historically
      userStats.longest_streak_days === 100   // Reached 100-day milestone historically
    ) {
      // Additional bonus for achieving these historic milestones
      if (userStats.longest_streak_days % 7 === 0 && userStats.longest_streak_days !== 14) {
        newFreezes += 1;
        awardedFreeze = true;
      }
    }
    
    if (awardedFreeze) {
      // Update the user's streak freeze count
      const { error: updateError } = await supabaseAdmin
        .from('user_stats')
        .update({
          streak_freezes_available: newFreezes,
          updated_at: new Date()
        })
        .eq('user_id', userId);
      
      if (updateError) throw updateError;
      
      return {
        success: true,
        awarded: true,
        newFreezes,
        message: `Congratulations! You've earned a streak freeze for reaching your ${getNextMilestone(userStats.current_streak_days - 1)}-day streak milestone.`
      };
    }
    
    return {
      success: true,
      awarded: false,
      newFreezes: userStats.streak_freezes_available,
      message: 'Keep going to reach the next freeze milestone!'
    };
  } catch (error) {
    console.error('Error awarding streak milestone bonuses:', error);
    return {
      success: false,
      error: error.message,
      awarded: false,
      newFreezes: 0,
      message: ''
    };
  }
}