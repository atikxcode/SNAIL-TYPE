// lib/services/progressRecapService.js
import { createClient } from '@supabase/supabase-js';
import { sendEmailNotification } from './emailNotificationService';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Generate and send weekly progress recaps to users
 */
export async function sendWeeklyProgressRecaps() {
  try {
    // Find users who have been active in the last week but may have missed some days
    const { data: activeUsers, error } = await supabaseAdmin
      .from('user_stats')
      .select(`
        user_id,
        display_name,
        current_streak_days,
        longest_streak_days,
        total_tests,
        avg_wpm,
        best_wpm,
        avg_accuracy,
        last_test_date,
        xp,
        level
      `)
      .gt('total_tests', 0) // Only users who have taken tests
      .order('last_test_date', { ascending: false });

    if (error) throw error;

    const results = [];
    for (const user of activeUsers || []) {
      const recapData = await generateWeeklyRecap(user.user_id);
      
      // Only send if the user has done at least 1 test this week
      if (recapData.thisWeek.tests > 0) {
        const result = await sendEmailNotification(
          user.user_id,
          'weekly_recap',
          {
            weekStats: recapData.thisWeek,
            improvement: calculateImprovement(recapData),
            personalizedTip: generatePersonalizedTip(recapData, user),
            streakInfo: {
              current: user.current_streak_days,
              longest: user.longest_streak_days
            }
          }
        );
        
        results.push({
          userId: user.user_id,
          success: result.success,
          sent: result.success,
          testsThisWeek: recapData.thisWeek.tests
        });
        
        // Add small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      success: true,
      usersNotified: results.length,
      results
    };
  } catch (error) {
    console.error('Error sending weekly progress recaps:', error);
    return {
      success: false,
      error: error.message,
      usersNotified: 0,
      results: []
    };
  }
}

/**
 * Generate a comprehensive weekly recap for a user
 */
export async function generateWeeklyRecap(userId) {
  try {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Start of current week (Sunday)
    
    // Get this week's stats
    const thisWeekStats = await getUserStatsForPeriod(userId, startOfWeek, new Date());
    
    // Get last week's stats for comparison
    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setDate(endOfLastWeek.getDate() - 1); // Last day of last week (Saturday)
    
    const startOfLastWeek = new Date(endOfLastWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 6); // Start of last week (Sunday)
    
    const lastWeekStats = await getUserStatsForPeriod(userId, startOfLastWeek, endOfLastWeek);
    
    return {
      thisWeek: thisWeekStats,
      lastWeek: lastWeekStats,
      comparedToLastWeek: calculateChange(thisWeekStats, lastWeekStats)
    };
  } catch (error) {
    console.error('Error generating weekly recap:', error);
    return {
      thisWeek: {
        tests: 0,
        avgWpm: 0,
        bestWpm: 0,
        avgAccuracy: 0,
        totalKeystrokes: 0,
        daysPracticed: 0
      },
      lastWeek: {
        tests: 0,
        avgWpm: 0,
        bestWpm: 0,
        avgAccuracy: 0,
        totalKeystrokes: 0,
        daysPracticed: 0
      },
      comparedToLastWeek: {
        avgWpmChange: 0,
        accuracyChange: 0,
        testsChange: 0
      }
    };
  }
}

/**
 * Get user statistics for a specific date range
 */
async function getUserStatsForPeriod(userId, startDate, endDate) {
  try {
    // Get session summaries for the period
    const { data: sessionSummaries, error } = await supabaseAdmin
      .from('session_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('session_date', startDate.toISOString().split('T')[0])
      .lte('session_date', endDate.toISOString().split('T')[0]);
    
    if (error) throw error;
    
    if (!sessionSummaries || sessionSummaries.length === 0) {
      return {
        tests: 0,
        avgWpm: 0,
        bestWpm: 0,
        avgAccuracy: 0,
        totalKeystrokes: 0,
        daysPracticed: 0
      };
    }
    
    // Calculate stats for the period
    const totalTests = sessionSummaries.length;
    const daysPracticed = new Set(sessionSummaries.map(s => s.session_date)).size;
    
    const totalWpm = sessionSummaries.reduce((sum, s) => sum + (s.avg_wpm || 0), 0);
    const avgWpm = totalTests > 0 ? totalWpm / totalTests : 0;
    
    const bestWpm = Math.max(...sessionSummaries.map(s => s.best_wpm || 0));
    
    const totalAccuracy = sessionSummaries.reduce((sum, s) => sum + (s.avg_accuracy || 0), 0);
    const avgAccuracy = totalTests > 0 ? totalAccuracy / totalTests : 0;
    
    const totalKeystrokes = sessionSummaries.reduce((sum, s) => sum + (s.total_keystrokes || 0), 0);
    
    return {
      tests: totalTests,
      avgWpm: parseFloat(avgWpm.toFixed(1)),
      bestWpm: parseFloat(bestWpm.toFixed(1)),
      avgAccuracy: parseFloat(avgAccuracy.toFixed(1)),
      totalKeystrokes,
      daysPracticed
    };
  } catch (error) {
    console.error('Error getting stats for period:', error);
    return {
      tests: 0,
      avgWpm: 0,
      bestWpm: 0,
      avgAccuracy: 0,
      totalKeystrokes: 0,
      daysPracticed: 0
    };
  }
}

/**
 * Calculate changes between this week and last week
 */
function calculateChange(thisWeek, lastWeek) {
  return {
    avgWpmChange: parseFloat((thisWeek.avgWpm - lastWeek.avgWpm).toFixed(1)),
    accuracyChange: parseFloat((thisWeek.avgAccuracy - lastWeek.avgAccuracy).toFixed(1)),
    testsChange: thisWeek.tests - lastWeek.tests
  };
}

/**
 * Calculate overall improvement trends
 */
function calculateImprovement(recapData) {
  const { thisWeek, lastWeek, comparedToLastWeek } = recapData;
  
  if (lastWeek.tests === 0 && thisWeek.tests > 0) {
    return "Great to see you've started practicing recently!";
  }
  
  if (comparedToLastWeek.avgWpmChange > 5) {
    return `Significant WPM improvement! You gained ${comparedToLastWeek.avgWpmChange} WPM from last week.`;
  } else if (comparedToLastWeek.avgWpmChange > 0) {
    return `Positive progress! Your WPM increased by ${comparedToLastWeek.avgWpmChange}.`;
  } else if (comparedToLastWeek.avgWpmChange < -5) {
    return `Your WPM decreased by ${Math.abs(comparedToLastWeek.avgWpmChange)}. Try focusing on consistency over speed.`;
  }
  
  if (comparedToLastWeek.accuracyChange > 2) {
    return `Excellent accuracy improvement! Your accuracy increased by ${comparedToLastWeek.accuracyChange}%.`;
  } else if (comparedToLastWeek.accuracyChange < -2) {
    return `Accuracy dropped by ${Math.abs(comparedToLastWeek.accuracyChange)}%. Focus on precision in your next sessions.`;
  }
  
  if (comparedToLastWeek.testsChange < 0) {
    return `You practiced ${Math.abs(comparedToLastWeek.testsChange)} fewer sessions this week. Try to maintain your routine.`;
  }
  
  return "Steady progress! Keep up the consistent practice.";
}

/**
 * Generate personalized tips based on user's recent performance
 */
function generatePersonalizedTip(recapData, user) {
  const { thisWeek, lastWeek } = recapData;
  
  // If no tests this week, suggest getting back to practice
  if (thisWeek.tests === 0) {
    return "No tests this week. Try to fit in at least one session to maintain your streak!";
  }
  
  // If accuracy is low, suggest focusing on accuracy
  if (thisWeek.avgAccuracy < 90) {
    return "Accuracy is more important than speed. Try our accuracy-focused mode to build precision.";
  }
  
  // If improvement is high, acknowledge it
  if (thisWeek.avgWpm > (lastWeek.avgWpm * 1.1)) {
    return "Keep up the excellent improvement! Your hard work is clearly paying off.";
  }
  
  // If consistency is good, suggest increasing difficulty
  if (thisWeek.daysPracticed >= 5 && thisWeek.avgWpm > 50) {
    return "Great consistency! Try increasing the difficulty to continue challenging yourself.";
  }
  
  // If WPM is plateaued, suggest targeted practice
  if (Math.abs(thisWeek.avgWpm - lastWeek.avgWpm) < 2 && thisWeek.avgWpm > 0) {
    return "Performance is stabilizing. Try our adaptive weakness mode to break through plateaus.";
  }
  
  // If user has a long streak, acknowledge it
  if (user.current_streak_days >= 14) {
    return "Maintaining a long streak takes dedication. Keep this amazing consistency up!";
  }
  
  // General tip
  return "Remember, consistent daily practice yields better results than long, infrequent sessions.";
}

/**
 * Generate a daily summary notification for users
 */
export async function sendDailySummaryNotification(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's session data
    const { data: todaysSessions, error } = await supabaseAdmin
      .from('session_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('session_date', today);
    
    if (error) throw error;
    
    const stats = {
      tests: todaysSessions?.length || 0,
      avgWpm: 0,
      bestWpm: 0,
      avgAccuracy: 0
    };
    
    if (todaysSessions && todaysSessions.length > 0) {
      const totalWpm = todaysSessions.reduce((sum, s) => sum + (s.avg_wpm || 0), 0);
      stats.avgWpm = totalWpm / todaysSessions.length;
      
      stats.bestWpm = Math.max(...todaysSessions.map(s => s.best_wpm || 0));
      
      const totalAccuracy = todaysSessions.reduce((sum, s) => sum + (s.avg_accuracy || 0), 0);
      stats.avgAccuracy = totalAccuracy / todaysSessions.length;
    }
    
    // Get user's weakness profile to provide targeted tips
    const { data: weaknessProfile } = await supabaseAdmin
      .from('weakness_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    let personalizedTip = "Keep up the daily practice!";
    
    if (weaknessProfile && weaknessProfile.weak_keys && weaknessProfile.weak_keys.length > 0) {
      const worstKey = weaknessProfile.weak_keys[0]; // Top weak key
      if (worstKey && worstKey.error_rate > 15) { // If error rate > 15%
        personalizedTip = `Focus on your weakest key: "${worstKey.key}" has a ${worstKey.error_rate}% error rate. Try our targeted drills.`;
      }
    }
    
    const recap = {
      todayStats: stats,
      personalizedTip
    };
    
    // Send daily summary email
    const result = await sendEmailNotification(
      userId,
      'daily_summary',
      recap
    );
    
    return {
      success: result.success,
      message: result.message,
      stats
    };
  } catch (error) {
    console.error('Error sending daily summary:', error);
    return {
      success: false,
      error: error.message,
      stats: null
    };
  }
}

/**
 * Send monthly progress summary
 */
export async function sendMonthlyProgressSummary(userId) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get current month stats
    const currentMonthStats = await getUserStatsForPeriod(userId, startOfMonth, endOfMonth);
    
    // Get previous month stats for comparison
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const prevMonthStats = await getUserStatsForPeriod(userId, startOfPrevMonth, endOfPrevMonth);
    
    const recapData = {
      currentMonth: currentMonthStats,
      prevMonth: prevMonthStats,
      comparedToPrevMonth: calculateChange(currentMonthStats, prevMonthStats)
    };
    
    // Calculate monthly achievements
    const achievements = await calculateMonthlyAchievements(userId, currentMonthStats);
    
    // Send monthly summary email
    const result = await sendEmailNotification(
      userId,
      'monthly_summary',
      {
        monthStats: currentMonthStats,
        improvement: calculateImprovement({ thisWeek: currentMonthStats, lastWeek: prevMonthStats }),
        achievements,
        streakInfo: await getUserStreakInfo(userId),
        milestonePredictions: predictNextMilestones(userId, currentMonthStats, await getUserProfile(userId))
      }
    );
    
    return {
      success: result.success,
      message: result.message,
      stats: currentMonthStats
    };
  } catch (error) {
    console.error('Error sending monthly summary:', error);
    return {
      success: false,
      error: error.message,
      stats: null
    };
  }
}

/**
 * Calculate monthly achievements
 */
async function calculateMonthlyAchievements(userId, monthStats) {
  const achievements = [];
  
  if (monthStats.tests >= 50) {
    achievements.push({
      id: 'month_practitioner',
      name: 'Monthly Practitioner',
      description: 'Practiced for 50+ sessions in one month',
      icon: '📅'
    });
  }
  
  if (monthStats.avgWpm >= 70) {
    achievements.push({
      id: 'consistent_speed',
      name: 'Consistent Speed Demon',
      description: 'Maintained 70+ WPM average for a month',
      icon: '⚡'
    });
  }
  
  if (monthStats.avgAccuracy >= 95) {
    achievements.push({
      id: 'accuracy_maestro',
      name: 'Accuracy Maestro',
      description: 'Maintained 95%+ accuracy for a month',
      icon: '🎯'
    });
  }
  
  // Check for improvement milestones
  if (monthStats.avgWpm > 20 && monthStats.avgWpm - (await getBaselineWpm(userId)) >= 20) {
    achievements.push({
      id: 'big_improver',
      name: 'Big Improver',
      description: 'Improved WPM by 20+ points in a month',
      icon: '📈'
    });
  }
  
  return achievements;
}

/**
 * Get user's streak information
 */
async function getUserStreakInfo(userId) {
  try {
    const { data: userStats, error } = await supabaseAdmin
      .from('user_stats')
      .select('current_streak_days, longest_streak_days')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    return userStats || { current_streak_days: 0, longest_streak_days: 0 };
  } catch (error) {
    console.error('Error getting user streak info:', error);
    return { current_streak_days: 0, longest_streak_days: 0 };
  }
}

/**
 * Get user profile data
 */
async function getUserProfile(userId) {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('display_name, created_at')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    return user || {};
  } catch (error) {
    console.error('Error getting user profile:', error);
    return {};
  }
}

/**
 * Get baseline WPM for improvement calculation
 */
async function getBaselineWpm(userId) {
  try {
    // Get user's first few sessions to establish baseline
    const { data: earlySessions, error } = await supabaseAdmin
      .from('session_summaries')
      .select('avg_wpm')
      .eq('user_id', userId)
      .order('session_date', { ascending: true })
      .limit(5);
    
    if (error || !earlySessions) return 0;
    
    const totalWpm = earlySessions.reduce((sum, s) => sum + (s.avg_wpm || 0), 0);
    return totalWpm / earlySessions.length || 0;
  } catch (error) {
    console.error('Error getting baseline WPM:', error);
    return 0;
  }
}

/**
 * Predict next milestones based on current progress
 */
function predictNextMilestones(userId, currentStats, userProfile) {
  const predictions = [];
  
  // Predict next WPM milestone
  const nextWpmMilestone = Math.ceil(currentStats.avgWpm / 10) * 10;
  if (nextWpmMilestone > currentStats.avgWpm) {
    predictions.push({
      type: 'wpm_milestone',
      value: nextWpmMilestone,
      estimate: 'Based on current improvement rate, you might reach this in 2-4 weeks'
    });
  }
  
  // Predict next accuracy milestone
  if (currentStats.avgAccuracy < 95) {
    const nextAccuracy = currentStats.avgAccuracy >= 90 ? 95 : 90;
    predictions.push({
      type: 'accuracy_milestone',
      value: nextAccuracy,
      estimate: 'Focus on accuracy drills to reach this milestone'
    });
  }
  
  // Predict next streak milestone
  const nextStreakMilestone = Math.ceil((currentStats.current_streak_days || 0) / 7) * 7;
  if (nextStreakMilestone > (currentStats.current_streak_days || 0) && nextStreakMilestone <= 100) {
    predictions.push({
      type: 'streak_milestone',
      value: nextStreakMilestone,
      estimate: 'Maintain current streak habits to achieve this milestone'
    });
  }
  
  return predictions;
}