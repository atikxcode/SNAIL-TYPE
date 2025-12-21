// lib/services/friendActivityNotificationService.js
import { createClient } from '@supabase/supabase-js';
import { sendEmailNotification } from './emailNotificationService';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Check for friend activities and send notifications
 * This function would run periodically (e.g., as a cron job) to send 
 * notifications about friends' achievements and activities
 */
export async function sendFriendActivityNotifications() {
  try {
    // Get the date 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    // Find activities from friends in the last 2 hours
    const { data: friendActivities, error } = await supabaseAdmin
      .from('friend_activities')
      .select(`
        *,
        friend:user_friends!inner (
          display_name,
          photo_url
        )
      `)
      .gt('timestamp', twoHoursAgo.toISOString())
      .eq('read', false); // Only send notifications for unread activities
    
    if (error) throw error;
    
    // Group activities by user
    const activitiesByUser = {};
    for (const activity of friendActivities) {
      if (!activitiesByUser[activity.user_id]) {
        activitiesByUser[activity.user_id] = [];
      }
      activitiesByUser[activity.user_id].push(activity);
    }
    
    let totalNotificationsSent = 0;
    const results = [];
    
    for (const [userId, userActivities] of Object.entries(activitiesByUser)) {
      // Get user preferences to see if they want friend notifications
      const { data: preferences, error: prefError } = await supabaseAdmin
        .from('user_notification_preferences')
        .select('friend_activities')
        .eq('user_id', userId)
        .single();
      
      if (prefError) {
        // If no preference found, default to true
        if (prefError.code !== 'PGRST116') { // PGRST116 = Row not found
          console.error('Error getting notification preferences:', prefError);
          continue;
        }
      }
      
      // Only send notification if user has friend notifications enabled
      if (!preferences || preferences.friend_activities !== false) {
        const notificationResult = await sendFriendActivityDigest(userId, userActivities);
        results.push({
          userId,
          success: notificationResult.success,
          activitiesCount: userActivities.length,
          message: notificationResult.message
        });
        
        if (notificationResult.success) {
          totalNotificationsSent++;
          
          // Mark activities as read after sending notification
          await supabaseAdmin
            .from('friend_activities')
            .update({ read: true })
            .in('id', userActivities.map(activity => activity.id));
        }
      }
    }
    
    return {
      success: true,
      notificationsSent: totalNotificationsSent,
      totalUsers: Object.keys(activitiesByUser).length,
      results
    };
  } catch (error) {
    console.error('Error sending friend activity notifications:', error);
    return {
      success: false,
      error: error.message,
      notificationsSent: 0,
      totalUsers: 0,
      results: []
    };
  }
}

/**
 * Send a digest of friend activities to a user
 */
async function sendFriendActivityDigest(userId, activities) {
  try {
    const friendActivityData = activities.map(activity => ({
      friendName: activity.friend?.display_name || 'A friend',
      activityType: activity.activity_type,
      wpm: activity.activity_data?.wpm || null,
      timestamp: activity.timestamp,
      message: formatActivityMessage(activity)
    }));
    
    const notificationData = {
      friendActivities: friendActivityData,
      activityCount: activities.length
    };
    
    const result = await sendEmailNotification(
      userId,
      'friend_activity_digest',
      notificationData
    );
    
    return result;
  } catch (error) {
    console.error('Error sending friend activity digest:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send friend activity notification'
    };
  }
}

/**
 * Format an activity message for display
 */
function formatActivityMessage(activity) {
  const { activity_type, activity_data, timestamp } = activity;
  
  switch (activity_type) {
    case 'test_completed':
      const wpm = activity_data?.wpm || 0;
      const accuracy = activity_data?.accuracy || 0;
      return `completed a test with ${wpm} WPM and ${accuracy}% accuracy`;
      
    case 'achievement_unlocked':
      const achievementName = activity_data?.name || activity_data?.achievementName;
      return `unlocked the "${achievementName}" achievement!`;
      
    case 'level_up':
      const newLevel = activity_data?.newLevel || activity_data?.level || 0;
      return `leveled up to level ${newLevel}!`;
      
    case 'streak_milestone':
      const streakDays = activity_data?.streakDays || activity_data?.days || 0;
      return `reached a ${streakDays}-day streak milestone!`;
      
    case 'new_best_wpm':
      const bestWpm = activity_data?.newBestWpm || activity_data?.wpm || 0;
      const prevBest = activity_data?.previousBest || 0;
      return `set a new personal best of ${bestWpm} WPM! (prev: ${prevBest})`;
      
    default:
      return 'did something in the app';
  }
}

/**
 * Record a friend activity when a user achieves something
 */
export async function recordFriendActivity(friendId, activityType, activityData, excludeUserId = null) {
  try {
    // Get all users who have this user as a friend
    const { data: friendRelations, error: relationError } = await supabaseAdmin
      .from('friendships')
      .select('user_id')
      .eq('friend_id', friendId)
      .eq('status', 'accepted');
    
    if (relationError) throw relationError;
    
    if (!friendRelations || friendRelations.length === 0) {
      return { success: true, message: 'No friends to notify' };
    }
    
    const friendUserIds = friendRelations
      .map(rel => rel.user_id)
      .filter(userId => userId !== excludeUserId); // Exclude the user themselves if needed
    
    if (friendUserIds.length === 0) {
      return { success: true, message: 'No friends to notify (excluding sender)' };
    }
    
    // Create activity records for each friend
    const activitiesToInsert = friendUserIds.map(friendUserId => ({
      user_id: friendUserId,
      friend_id: friendId,
      activity_type: activityType,
      activity_data: activityData,
      timestamp: new Date(),
      read: false
    }));
    
    const { error: insertError } = await supabaseAdmin
      .from('friend_activities')
      .insert(activitiesToInsert);
    
    if (insertError) throw insertError;
    
    return {
      success: true,
      message: `Recorded friend activity for ${friendUserIds.length} users`,
      recordedFor: friendUserIds.length
    };
  } catch (error) {
    console.error('Error recording friend activity:', error);
    return {
      success: false,
      error: error.message,
      recordedFor: 0
    };
  }
}

/**
 * Get recent friend activities for a user
 */
export async function getRecentFriendActivities(userId, limit = 10) {
  try {
    const { data: friendActivities, error } = await supabaseAdmin
      .from('friend_activities')
      .select(`
        *,
        friend:user_friends!inner (
          display_name,
          photo_url
        )
      `)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return {
      success: true,
      activities: friendActivities || []
    };
  } catch (error) {
    console.error('Error getting friend activities:', error);
    return {
      success: false,
      error: error.message,
      activities: []
    };
  }
}

/**
 * Get friend leaderboard data based on recent performance
 */
export async function getFriendLeaderboard(userId, days = 7) {
  try {
    // Find friends of the user
    const { data: friends, error: friendError } = await supabaseAdmin
      .from('friendships')
      .select(`
        friend_id,
        users:friends_user_id_fkey (
          display_name,
          photo_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');
    
    if (friendError) throw friendError;
    
    if (!friends || friends.length === 0) {
      return {
        success: true,
        leaderboard: []
      };
    }
    
    // Get recent performance data for each friend
    const friendIds = friends.map(f => f.friend_id);
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // For each friend, get their average WPM in the last N days
    const leaderboard = [];
    
    for (const friend of friends) {
      const { data: sessionSummaries, error: sessionError } = await supabaseAdmin
        .from('session_summaries')
        .select('avg_wpm')
        .eq('user_id', friend.friend_id)
        .gte('session_date', sinceDate.split('T')[0])
        .order('session_date', { ascending: false });
      
      if (!sessionError && sessionSummaries && sessionSummaries.length > 0) {
        // Calculate average WPM over the period
        const avgWpm = sessionSummaries.reduce((sum, ss) => sum + (ss.avg_wpm || 0), 0) / sessionSummaries.length;
        
        leaderboard.push({
          userId: friend.friend_id,
          displayName: friend.users?.display_name || 'Friend',
          photoUrl: friend.users?.photo_url || null,
          avgWpm: parseFloat(avgWpm.toFixed(1)),
          sessionsCount: sessionSummaries.length
        });
      } else {
        // If no data for the friend, still include them with 0 WPM
        leaderboard.push({
          userId: friend.friend_id,
          displayName: friend.users?.display_name || 'Friend',
          photoUrl: friend.users?.photo_url || null,
          avgWpm: 0,
          sessionsCount: 0
        });
      }
    }
    
    // Sort by average WPM (highest first)
    leaderboard.sort((a, b) => b.avgWpm - a.avgWpm);
    
    // Add user's own performance to the comparison
    const { data: userSummaries, error: userSessionError } = await supabaseAdmin
      .from('session_summaries')
      .select('avg_wpm')
      .eq('user_id', userId)
      .gte('session_date', sinceDate.split('T')[0])
      .order('session_date', { ascending: false });
    
    let userPerformance = null;
    if (!userSessionError && userSummaries && userSummaries.length > 0) {
      const userAvgWpm = userSummaries.reduce((sum, ss) => sum + (ss.avg_wpm || 0), 0) / userSummaries.length;
      userPerformance = {
        avgWpm: parseFloat(userAvgWpm.toFixed(1)),
        sessionsCount: userSummaries.length
      };
    }
    
    return {
      success: true,
      leaderboard,
      userPerformance,
      daysLookback: days
    };
  } catch (error) {
    console.error('Error getting friend leaderboard:', error);
    return {
      success: false,
      error: error.message,
      leaderboard: [],
      userPerformance: null,
      daysLookback: days
    };
  }
}

/**
 * Send a notification when a user's friend surpasses their performance
 */
export async function checkAndNotifyFriendCompetitions(userId) {
  try {
    // Get user's performance
    const { data: userStats, error: statsError } = await supabaseAdmin
      .from('user_stats')
      .select('best_wpm, avg_wpm')
      .eq('user_id', userId)
      .single();
    
    if (statsError) throw statsError;
    
    // Get user's friends
    const { data: friends, error: friendError } = await supabaseAdmin
      .from('friendships')
      .select('friend_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');
    
    if (friendError) throw friendError;
    
    if (!friends || friends.length === 0) {
      return { success: true, message: 'No friends to compare' };
    }
    
    // Check if any friend has recently beaten the user's best WPM
    for (const friend of friends) {
      const { data: friendStats, error: friendStatsError } = await supabaseAdmin
        .from('user_stats')
        .select('best_wpm')
        .eq('user_id', friend.friend_id)
        .single();
      
      if (friendStatsError || !friendStats) continue;
      
      if (friendStats.best_wpm > (userStats?.best_wpm || 0)) {
        // Friend has a better best WPM - create a friendly challenge notification
        const notificationData = {
          friendId: friend.friend_id,
          friendBestWpm: friendStats.best_wpm,
          userBestWpm: userStats?.best_wpm || 0,
          message: `Your friend just surpassed your best WPM! Time to reclaim your throne?`
        };
        
        // Record this as a specific type of activity
        await recordFriendActivity(
          friend.friend_id, 
          'friend_challenge', 
          notificationData, 
          userId
        );
      }
    }
    
    return {
      success: true,
      message: 'Friend competition checks completed'
    };
  } catch (error) {
    console.error('Error checking friend competitions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get a summary of all friend activities for the dashboard
 */
export async function getFriendActivitySummary(userId) {
  try {
    // Get friend activity count by type for the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: activityCounts, error } = await supabaseAdmin
      .from('friend_activities')
      .select('activity_type, count(*)')
      .eq('user_id', userId)
      .gte('timestamp', sevenDaysAgo.toISOString())
      .group('activity_type');
    
    if (error) throw error;
    
    // Get number of unread notifications
    const { count: unreadCount, error: unreadError } = await supabaseAdmin
      .from('friend_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    
    if (unreadError) throw unreadError;
    
    // Get latest activity
    const { data: latestActivity, error: latestError } = await supabaseAdmin
      .from('friend_activities')
      .select(`
        *,
        friend:user_friends!inner (
          display_name
        )
      `)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    return {
      success: true,
      activityCounts: activityCounts || [],
      unreadCount: unreadCount || 0,
      latestActivity: latestActivity || null,
      summary: {
        totalActivities: (activityCounts || []).reduce((sum, ac) => sum + parseInt(ac.count), 0),
        mostActiveDay: 'TBD', // This would require additional querying
        topActivityType: activityCounts?.[0]?.activity_type || 'None'
      }
    };
  } catch (error) {
    console.error('Error getting friend activity summary:', error);
    return {
      success: false,
      error: error.message,
      activityCounts: [],
      unreadCount: 0,
      latestActivity: null,
      summary: {
        totalActivities: 0,
        mostActiveDay: null,
        topActivityType: null
      }
    };
  }
}