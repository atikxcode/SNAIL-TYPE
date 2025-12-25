// lib/services/motivationHooks.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Generate personalized motivational messages based on user's performance
 */
export async function getMotivationalMessage(userId) {
  try {
    // Get user stats to personalize the message
    const { data: userStats, error: statsError } = await supabaseAdmin
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = Row not found
      throw statsError;
    }
    
    // Get user's weakness profile
    const { data: weaknessProfile, error: weaknessError } = await supabaseAdmin
      .from('weakness_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Get recent sessions to detect patterns
    const { data: recentSessions, error: sessionsError } = await supabaseAdmin
      .from('session_summaries')
      .select('wpm, accuracy, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Generate personalized message based on user's situation
    const message = generatePersonalizedMessage(userStats, weaknessProfile, recentSessions);
    
    return {
      success: true,
      message
    };
  } catch (error) {
    console.error('Error getting motivational message:', error);
    // Return a generic motivational message if there's an error
    return {
      success: false,
      message: "Every expert was once a beginner. Keep practicing, and you'll see improvement!"
    };
  }
}

/**
 * Generate a personalized motivational message based on user data
 */
function generatePersonalizedMessage(userStats, weaknessProfile, recentSessions) {
  // Base messages categorized by different situations
  const messages = {
    improvement: [
      "Great job on the improvement! Consistent practice always pays off.",
      "Your dedication is showing! Keep up the excellent work.",
      "Noticeable progress! Your hard work is making a real difference.",
      "Impressive gains! You're clearly putting in focused practice time."
    ],
    struggling: [
      "Don't get discouraged! Everyone has up and down days. Try another session tomorrow!",
      "Remember that progress isn't always linear. Trust the process and keep going!",
      "Take a break if you need. Fresh eyes often lead to breakthroughs!",
      "Your effort counts for something. Sometimes improvement happens gradually!"
    ],
    streak: [
      "Amazing streak! Your consistency is inspiring. Keep the momentum going!",
      "You're building an incredible habit! This discipline will take you far.",
      "Consistency creates mastery. You're living proof of that principle!",
      "Your dedication is paying off. That streak represents real commitment!"
    ],
    plateau: [
      "Plateaus are normal and temporary. Try focusing on accuracy while maintaining speed.",
      "This is where champions are made! Push through the plateau with dedicated practice.",
      "Every plateau broken leads to a breakthrough. Stay patient and keep practicing!",
      "Consider trying a new mode or technique to break through this plateau."
    ],
    achievement: [
      "Celebrate this milestone! You've earned it through dedicated practice.",
      "Major accomplishment! This achievement reflects your commitment.",
      "Fantastic work reaching this milestone. Time to set your next goal!",
      "You deserve recognition for this achievement. Keep pushing higher!"
    ],
    weakness_focus: [
      "Working on your weak spots shows real intelligence. Targeted practice accelerates growth!",
      "Addressing weaknesses is the fastest path to improvement. Well strategized!",
      "Your focused effort on problem areas will pay huge dividends. Keep going!",
      "Confronting challenges head-on builds true skill. That takes courage!"
    ]
  };
  
  // Determine which category of message to use based on user's data
  if (!userStats) {
    // New user without stats
    return "Welcome to SnailType! Every journey begins with a single step. Start practicing to unlock your potential!";
  }
  
  // Check for streak-related message
  if (userStats.current_streak_days && userStats.current_streak_days > 1) {
    if (userStats.current_streak_days % 7 === 0) {
      return `Outstanding! ${userStats.current_streak_days} days in a row. You're developing a powerful habit!`;
    }
    return getRandomMessage(messages.streak);
  }
  
  // Check for achievement-related message
  if (userStats.level && userStats.level >= 5) {
    return `Level ${userStats.level} achieved! Your progression shows significant improvement. What's your next milestone?`;
  }
  
  // Analyze recent sessions for trends
  if (recentSessions && recentSessions.length >= 3) {
    const wpmTrend = calculateTrend(recentSessions.map(s => s.wpm));
    const accuracyTrend = calculateTrend(recentSessions.map(s => s.accuracy));
    
    // Check for improvement trend
    if (wpmTrend > 0.1 || accuracyTrend > 0.1) { // Positive trend
      return getRandomMessage(messages.improvement) + ` Your WPM is trending ${wpmTrend > 0 ? 'up' : 'down'} but your accuracy is improving.`;
    }
    
    // Check for struggling trend
    if (wpmTrend < -0.1 || accuracyTrend < -0.1) {
      return getRandomMessage(messages.struggling) + ` But remember, every session is a chance to improve.`;
    }
    
    // Check for plateau
    if (Math.abs(wpmTrend) < 0.05 && recentSessions.every(s => s.wpm > 0)) {
      return getRandomMessage(messages.plateau) + ` Your performance has stabilized. This is a great time to work on weaknesses.`;
    }
  }
  
  // Check for weakness-focused approach
  if (weaknessProfile && (weaknessProfile.weak_keys || weaknessProfile.weak_bigrams)) {
    const weakKeyCount = weaknessProfile.weak_keys ? weaknessProfile.weak_keys.length : 0;
    if (weakKeyCount > 0) {
      const weakKeys = weaknessProfile.weak_keys.slice(0, 2).map(k => k.key).join(', ');
      return getRandomMessage(messages.weakness_focus) + ` Working on "${weakKeys}" will yield great benefits.`;
    }
  }
  
  // Default message if no specific pattern is found
  return "Progress comes with patience and persistence. Every character you type is making you better.";
}

/**
 * Calculate trend (slope) of a series of values over time
 */
function calculateTrend(values) {
  if (values.length < 2) return 0;
  
  // Simple linear trend calculation between first and last values
  const firstValue = values[values.length - 1];
  const lastValue = values[0];
  if (firstValue === 0) return lastValue > 0 ? Infinity : 0;
  
  return (lastValue - firstValue) / firstValue;
}

/**
 * Get a random message from an array
 */
function getRandomMessage(messageArray) {
  return messageArray[Math.floor(Math.random() * messageArray.length)];
}

/**
 * Get contextual encouragement during a typing test based on current performance
 */
export function getTestEncouragement(currentWpm, currentAccuracy, targetWpm, targetAccuracy) {
  const encouragements = [];
  
  // WPM-related encouragements
  if (currentWpm > targetWpm * 1.1) {
    encouragements.push("Great speed! You're exceeding your target.");
  } else if (currentWpm > targetWpm * 0.95) {
    encouragements.push("Keep going, you're right on target!");
  } else if (currentWpm < targetWpm * 0.8) {
    encouragements.push("Try to pick up the pace slightly!");
  }
  
  // Accuracy-related encouragements
  if (currentAccuracy >= 98) {
    encouragements.push("Exceptional accuracy! Precision is key.");
  } else if (currentAccuracy >= 95) {
    encouragements.push("Solid accuracy! Keep maintaining this level.");
  } else if (currentAccuracy < 90) {
    encouragements.push("Focus on accuracy to build muscle memory.");
  }
  
  // Combined encouragements
  if (currentWpm > 70 && currentAccuracy > 95) {
    encouragements.push("Perfect combination of speed and accuracy!");
  } else if (currentWpm > 80 && currentAccuracy < 90) {
    encouragements.push("Fast indeed! Try being a bit more careful.");
  } else if (currentWpm < 50 && currentAccuracy > 97) {
    encouragements.push("Excellent precision! You're ready to build speed.");
  }
  
  // Select a random encouragement from the applicable ones
  if (encouragements.length > 0) {
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  }
  
  // Fallback encouragement
  return "Keep typing, you're doing great!";
}

/**
 * Get milestone-based notifications for achievements
 */
export async function getMilestoneNotifications(userId) {
  try {
    const { data: userStats, error: statsError } = await supabaseAdmin
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (statsError) throw statsError;
    
    const notifications = [];
    
    // Check for XP milestone (every 100 XP)
    if (userStats.xp && userStats.xp > 0) {
      const nextLevelXP = Math.ceil(userStats.xp / 100) * 100;
      const progressToNext = nextLevelXP - userStats.xp;
      
      if (progressToNext <= 25) {
        notifications.push(`${progressToNext} XP until next level!`);
      }
    }
    
    // Check for WPM milestones
    if (userStats.best_wpm) {
      if (userStats.best_wpm >= 100) {
        notifications.push("🎉 Speed Demon: You've hit 100+ WPM!");
      } else if (userStats.best_wpm >= 80) {
        notifications.push("🚀 Solid Intermediate: Over 80 WPM!");
      } else if (userStats.best_wpm >= 60) {
        notifications.push("💪 Getting Strong: Over 60 WPM!");
      }
    }
    
    // Check for streak milestones
    if (userStats.current_streak_days) {
      if (userStats.current_streak_days >= 30) {
        notifications.push("🏆 Month Master: 30-day streak!");
      } else if (userStats.current_streak_days >= 7) {
        notifications.push("🔥 Week Warrior: 7-day streak!");
      } else if (userStats.current_streak_days >= 3) {
        notifications.push("✅ Consistency King: 3+ day streak!");
      }
    }
    
    // Check for total tests milestones
    if (userStats.total_tests) {
      if (userStats.total_tests >= 100) {
        notifications.push("💯 Century Club: Completed 100 tests!");
      } else if (userStats.total_tests >= 50) {
        notifications.push("🎯 Dedicated Typist: Completed 50 tests!");
      } else if (userStats.total_tests >= 25) {
        notifications.push("📈 Serious Improvement: Completed 25 tests!");
      }
    }
    
    return {
      success: true,
      notifications
    };
  } catch (error) {
    console.error('Error getting milestone notifications:', error);
    return {
      success: false,
      error: error.message,
      notifications: []
    };
  }
}

/**
 * Get personalized tips based on user's weakness profile
 */
export async function getPersonalizedTips(userId) {
  try {
    const { data: weaknessProfile, error: wpError } = await supabaseAdmin
      .from('weakness_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (wpError && wpError.code !== 'PGRST116') { // Row not found is okay
      throw wpError;
    }
    
    const tips = [];
    
    if (weaknessProfile?.weak_keys && weaknessProfile.weak_keys.length > 0) {
      const topWeak = weaknessProfile.weak_keys.slice(0, 2);
      if (topWeak.length > 0) {
        tips.push(`Focus on key${topWeak.length > 1 ? 's' : ''} "${topWeak.map(wk => wk.key).join('", "')}" in your next practice.`);
      }
    }
    
    if (weaknessProfile?.weak_bigrams && weaknessProfile.weak_bigrams.length > 0) {
      const topBigrams = weaknessProfile.weak_bigrams.slice(0, 2);
      if (topBigrams.length > 0) {
        tips.push(`Practice combinations "${topBigrams.map(wb => wb.bigram).join('", "')}".`);
      }
    }
    
    if (tips.length === 0) {
      tips.push('Try the adaptive weakness mode to identify areas for improvement.');
      tips.push('Experiment with different text categories to keep practice interesting.');
      tips.push('Focus on accuracy first - speed will naturally follow.');
    }
    
    return {
      success: true,
      tips
    };
  } catch (error) {
    console.error('Error getting personalized tips:', error);
    return {
      success: false,
      error: error.message,
      tips: ['Keep practicing regularly for consistent improvement.']
    };
  }
}

/**
 * Schedule periodic motivation notifications for users
 */
export async function scheduleMotivationNotifications(userId) {
  try {
    // This would typically integrate with a scheduling service
    // For now, we'll return a mock schedule
    const notificationSchedule = [
      {
        type: 'daily_streak_reminder',
        time: '09:00',
        message: 'Ready to maintain your streak today?',
        frequency: 'daily'
      },
      {
        type: 'weekly_goal_check',
        time: 'Friday 20:00',
        message: 'How was your practice this week? Set goals for next week.',
        frequency: 'weekly'
      },
      {
        type: 'achievement_prompt',
        time: 'random',
        message: 'Check your achievements page to see your progress.',
        frequency: 'bi-weekly'
      }
    ];
    
    return {
      success: true,
      schedule: notificationSchedule
    };
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    return {
      success: false,
      error: error.message,
      schedule: []
    };
  }
}