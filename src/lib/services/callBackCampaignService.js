// lib/services/callBackCampaignService.js
import { createClient } from '@supabase/supabase-js';
import { sendEmailNotification } from './emailNotificationService';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Identify and send comeback campaigns to lapsed users
 * This runs as a scheduled job to find and re-engage inactive users
 */
export async function sendComebackCampaigns() {
  try {
    // Find users who haven't been active for at least 7 days but less than 6 months
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: lapsedUsers, error } = await supabaseAdmin
      .from('user_stats')
      .select(`
        user_id,
        display_name,
        last_test_date,
        current_streak_days,
        longest_streak_days,
        total_tests,
        avg_wpm,
        best_wpm,
        level,
        created_at
      `)
      .lt('last_test_date', sevenDaysAgo)
      .gte('last_test_date', sixMonthsAgo)
      .order('last_test_date', { ascending: true }); // Order by least recently active first
    
    if (error) throw error;
    
    // Classify users based on how long they've been inactive
    const classification = classifyLapsedUsers(lapsedUsers);
    
    const results = {
      notificationsSent: 0,
      highPriorityCount: 0,
      mediumPriorityCount: 0,
      lowPriorityCount: 0,
      details: []
    };
    
    // Process each classification with appropriate message
    for (const [category, users] of Object.entries(classification)) {
      for (const user of users) {
        const campaignResult = await sendComebackCampaign(user, category);
        
        if (campaignResult.success) {
          results.notificationsSent++;
        }
        
        results.details.push({
          userId: user.user_id,
          category,
          lastActive: user.last_test_date,
          notificationSent: campaignResult.success,
          message: campaignResult.message
        });
        
        // Add delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      results[`${category}PriorityCount`] = users.length;
    }
    
    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error('Error sending comeback campaigns:', error);
    return {
      success: false,
      error: error.message,
      notificationsSent: 0,
      highPriorityCount: 0,
      mediumPriorityCount: 0,
      lowPriorityCount: 0,
      details: []
    };
  }
}

/**
 * Classify lapsed users based on inactivity duration and engagement level
 */
function classifyLapsedUsers(users) {
  const now = new Date();
  const classifications = {
    highPriority: [], // 7-14 days inactive, high engagement profile
    mediumPriority: [], // 14-30 days inactive
    lowPriority: [] // 30+ days inactive
  };
  
  for (const user of users || []) {
    if (!user.last_test_date) continue;
    
    const lastActive = new Date(user.last_test_date);
    const inactiveDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
    
    // Determine priority based on both inactivity duration and engagement profile
    if (inactiveDays >= 7 && inactiveDays <= 14) {
      // High priority if they had a good engagement profile
      if (user.total_tests > 50 || user.current_streak_days > 7 || user.level > 5) {
        classifications.highPriority.push({...user, inactiveDays});
      } else {
        classifications.mediumPriority.push({...user, inactiveDays});
      }
    } else if (inactiveDays > 14 && inactiveDays <= 30) {
      classifications.mediumPriority.push({...user, inactiveDays});
    } else if (inactiveDays > 30) {
      classifications.lowPriority.push({...user, inactiveDays});
    }
  }
  
  return classifications;
}

/**
 * Send a personalized comeback campaign to a user
 */
async function sendComebackCampaign(user, category) {
  try {
    // Create personalized comeback message based on user's profile
    const campaignData = {
      inactiveDays: user.inactiveDays,
      currentStreak: user.current_streak_days,
      personalBest: user.best_wpm,
      totalTests: user.total_tests,
      level: user.level,
      lastActivityDate: user.last_test_date,
      message: generateComebackMessage(user, category),
      callToAction: generateCallToAction(user, category),
      incentive: generateIncentive(user, category)
    };
    
    const result = await sendEmailNotification(
      user.user_id,
      'comeback_campaign',
      campaignData
    );
    
    return {
      success: true,
      message: `Comeback campaign sent to user ${user.user_id}`
    };
  } catch (error) {
    console.error('Error sending comeback campaign:', error);
    return {
      success: false,
      message: `Failed to send comeback campaign to user ${user.user_id}: ${error.message}`
    };
  }
}

/**
 * Generate a personalized comeback message based on user profile
 */
function generateComebackMessage(user, category) {
  const inactiveDays = user.inactiveDays || Math.floor((new Date() - new Date(user.last_test_date)) / (1000 * 60 * 60 * 24));
  
  // Different messages based on category and profile
  if (category === 'highPriority') {
    if (user.current_streak_days > 10) {
      return `We noticed you've been away for ${inactiveDays} days. Your ${user.current_streak_days}-day streak was one of your best! Don't let all that progress go to waste.`;
    } else if (user.level > 10) {
      return `Your account is at level ${user.level} with impressive skills. It's been ${inactiveDays} days since we've seen you. Time to show off those typing skills again!`;
    } else {
      return `Hi again! We've missed seeing your activity for ${inactiveDays} days. Your typing journey is important to us. Let's get back on track!`;
    }
  } else if (category === 'mediumPriority') {
    return `Hey, it's been ${inactiveDays} days since your last practice session. Your typing skills could use some maintenance. Ready to jump back in?`;
  } else { // lowPriority
    return `Wow, it's been ${inactiveDays} days since you last practiced! Your account is here waiting for you. Why not take 5 minutes to see how much you remember?`;
  }
}

/**
 * Generate appropriate call-to-action based on user's profile
 */
function generateCallToAction(user, category) {
  if (category === 'highPriority') {
    // For highly engaged users, suggest personalized content
    return {
      text: 'Resume personalized training',
      url: '/dashboard',
      actionType: 'resume_training'
    };
  } else if (user.current_streak_days > 0) {
    // For users with active streaks, suggest continuing
    return {
      text: 'Keep your streak alive',
      url: '/',
      actionType: 'continue_streak'
    };
  } else {
    // For all users, suggest starting fresh
    return {
      text: 'Start a quick test',
      url: '/',
      actionType: 'start_new'
    };
  }
}

/**
 * Generate incentives to encourage comeback
 */
function generateIncentive(user, category) {
  const inactiveDays = user.inactiveDays || Math.floor((new Date() - new Date(user.last_test_date)) / (1000 * 60 * 60 * 24));
  
  if (category === 'highPriority') {
    if (user.current_streak_days > 30) {
      // Offer streak protection for valuable long streaks
      return {
        type: 'streak_preservation',
        title: 'Streak Saver!',
        description: 'We can preserve your streak if you return within 24 hours.',
        icon: '🔥'
      };
    } else {
      // Offer bonus XP for returning
      const bonusXP = Math.min(100, user.level * 5 + inactiveDays);
      return {
        type: 'bonus_xp',
        title: 'Welcome Back Bonus!',
        description: `Earn ${bonusXP} bonus XP for returning today.`,
        icon: '🎁'
      };
    }
  } else if (inactiveDays > 30) {
    // For longer absences, offer a simple motivation
    return {
      type: 'practice_incentive',
      title: 'Quick Refresher!',
      description: 'Just 5 minutes of practice can bring back your skills',
      icon: '⚡'
    };
  } else {
    // For recent absences, offer normal encouragement
    return {
      type: 'consistency_bonus',
      title: 'Get Back on Track!',
      description: 'Your skills are waiting to be sharpened',
      icon: '💪'
    };
  }
}

/**
 * Identify users who are at risk of churning soon
 */
export async function identifyChurnRiskUsers() {
  try {
    const now = new Date();
    
    // Find users with high engagement but recent inactivity (potential churn risk)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: potentialChurners, error } = await supabaseAdmin
      .from('user_stats')
      .select(`
        user_id,
        display_name,
        current_streak_days,
        longest_streak_days,
        total_tests,
        avg_wpm,
        last_test_date,
        created_at
      `)
      // Users who were active in the past 30 days but not in the last 7 (showing declining engagement)
      .gte('last_test_date', thirtyDaysAgo.toISOString())
      .lt('last_test_date', sevenDaysAgo.toISOString())
      // Filter for users with good engagement history
      .gte('total_tests', 20)  // At least 20 tests completed
      .or('current_streak_days.gt.7,total_tests.gte.50,avg_wpm.gt.60'); // Either long streak, many tests or good WPM
    
    if (error) throw error;
    
    // Add risk assessment to each user
    const churnRiskUsers = (potentialChurners || []).map(user => {
      const daysInactive = Math.floor((now - new Date(user.last_test_date)) / (1000 * 60 * 60 * 24));
      
      // Calculate risk score based on various factors
      const engagementScore = 
        (user.total_tests / 100) + 
        (user.current_streak_days / 10) + 
        (user.longest_streak_days / 50) +
        (user.avg_wpm / 100);
      
      const riskLevel = daysInactive > 14 ? 'high' : daysInactive > 7 ? 'medium' : 'low';
      
      return {
        ...user,
        daysInactive,
        engagementScore: parseFloat(engagementScore.toFixed(2)),
        riskLevel,
        riskFactors: calculateRiskFactors(user, daysInactive)
      };
    });
    
    return {
      success: true,
      churnRiskUsers,
      totalRiskUsers: churnRiskUsers.length,
      highRiskCount: churnRiskUsers.filter(u => u.riskLevel === 'high').length,
      mediumRiskCount: churnRiskUsers.filter(u => u.riskLevel === 'medium').length,
      lowRiskCount: churnRiskUsers.filter(u => u.riskLevel === 'low').length
    };
  } catch (error) {
    console.error('Error identifying churn risk users:', error);
    return {
      success: false,
      error: error.message,
      churnRiskUsers: [],
      totalRiskUsers: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0
    };
  }
}

/**
 * Calculate specific risk factors for a user
 */
function calculateRiskFactors(user, daysInactive) {
  const factors = [];
  
  if (user.current_streak_days > 14 && daysInactive >= 2) {
    factors.push('Long streak at risk');
  }
  
  if (daysInactive > 7 && user.total_tests > 50) {
    factors.push('High engagement drop-off');
  }
  
  if (user.avg_wpm > 70 && daysInactive > 5) {
    factors.push('Skilled user inactivity');
  }
  
  if (daysInactive > 14 && user.longest_streak_days > 30) {
    factors.push('High commitment abandoned');
  }
  
  return factors;
}

/**
 * Send targeted campaigns for churn-risk users
 */
export async function sendChurnPreventionCampaigns() {
  try {
    const { churnRiskUsers, error } = await identifyChurnRiskUsers();
    
    if (error) {
      return { success: false, error };
    }
    
    const results = [];
    
    for (const user of churnRiskUsers) {
      // Tailor message based on risk factors
      const campaignData = createChurnPreventionMessage(user);
      
      const result = await sendEmailNotification(
        user.user_id,
        'churn_prevention',
        campaignData
      );
      
      results.push({
        userId: user.user_id,
        success: result.success,
        riskLevel: user.riskLevel,
        daysInactive: user.daysInactive
      });
      
      // Add delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return {
      success: true,
      campaignsSent: results.length,
      results
    };
  } catch (error) {
    console.error('Error in churn prevention campaigns:', error);
    return {
      success: false,
      error: error.message,
      campaignsSent: 0,
      results: []
    };
  }
}

/**
 * Create a churn prevention message for a specific user
 */
function createChurnPreventionMessage(user) {
  return {
    title: 'Miss You!',
    subtitle: `We noticed you haven't practiced in ${user.daysInactive} days`,
    message: `Your typing skills are too good to leave behind. We've prepared a special session just for you.`,
    userStats: {
      streak: user.current_streak_days,
      level: user.level,
      avgWpm: user.avg_wpm,
      totalTests: user.totalTests
    },
    specialOffer: {
      type: 'comeback_bonus',
      description: 'Complete a test today and earn double XP',
      duration: '24 hours'
    },
    cta: {
      text: 'Come back and claim your bonus',
      action: 'start_comeback_session'
    }
  };
}

/**
 * Get comeback statistics
 */
export async function getComebackCampaignStats() {
  try {
    const { data: stats, error } = await supabaseAdmin
      .from('email_notifications')  // Assuming we track email notifications in this table
      .select(`
        COUNT(*) as total_sent,
        SUM(CASE WHEN type = 'comeback_campaign' THEN 1 ELSE 0 END) as comeback_sent,
        SUM(CASE WHEN type = 'churn_prevention' THEN 1 ELSE 0 END) as churn_sent
      `)
      .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days
    
    if (error) throw error;
    
    // Calculate additional metrics by looking at user engagement after emails
    const { data: engagementData, error: engagementError } = await supabaseAdmin
      .from('user_stats')
      .select(`
        COUNT(*) as total_users,
        COUNT(CASE WHEN last_test_date > date_trunc('day', NOW() - interval '7 days') THEN 1 END) as active_this_week
      `);
    
    return {
      success: true,
      campaignStats: stats?.[0] || { total_sent: 0, comeback_sent: 0, churn_sent: 0 },
      userEngagement: engagementData?.[0] || { total_users: 0, active_this_week: 0 }
    };
  } catch (error) {
    console.error('Error getting comeback campaign stats:', error);
    return {
      success: false,
      error: error.message,
      campaignStats: { total_sent: 0, comeback_sent: 0, churn_sent: 0 },
      userEngagement: { total_users: 0, active_this_week: 0 }
    };
  }
}