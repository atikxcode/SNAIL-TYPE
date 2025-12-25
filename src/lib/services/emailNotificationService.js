// lib/services/emailNotificationService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Send personalized email notifications to users based on their activity
 */
export async function sendEmailNotification(userId, type, data = {}) {
  try {
    // Get user information
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, display_name')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    // Based on notification type, construct appropriate email content
    let subject, htmlContent;
    
    switch (type) {
      case 'streak_reminder':
        ({ subject, htmlContent } = createStreakReminderEmail(user, data));
        break;
      case 'achievement_unlocked':
        ({ subject, htmlContent } = createAchievementEmail(user, data));
        break;
      case 'weekly_recap':
        ({ subject, htmlContent } = createWeeklyRecapEmail(user, data));
        break;
      case 'comeback':
        ({ subject, htmlContent } = createComebackEmail(user, data));
        break;
      case 'friend_activity':
        ({ subject, htmlContent } = createFriendActivityEmail(user, data));
        break;
      case 'daily_summary':
      default:
        ({ subject, htmlContent } = createDailySummaryEmail(user, data));
        break;
    }
    
    // In a real implementation, this would use an email service like Resend, SendGrid, or similar
    // For now, we'll log the email to console and return success
    console.log(`Email to ${user.email}`, { subject, htmlContent });
    
    // Record in notifications table
    await recordNotificationSent(userId, type, data);
    
    return {
      success: true,
      message: 'Email notification processed'
    };
  } catch (error) {
    console.error('Error sending email notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a daily summary email with personalized insights
 */
function createDailySummaryEmail(user, data) {
  const subject = `Your Typing Progress for Today - ${new Date().toLocaleDateString()}`;
  
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Hello ${user.display_name || 'there'}!</h1>
          
          <p>Here's your typing progress for today:</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h2 style="margin-top: 0;">Today's Stats</h2>
            <p><strong>WPM:</strong> ${data.wpm || 'N/A'}</p>
            <p><strong>Accuracy:</strong> ${data.accuracy || 'N/A'}%</p>
            <p><strong>Tests Completed:</strong> ${data.testsCount || 1}</p>
          </div>
          
          ${data.personalizedTip ? 
            `<div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3 style="margin-top: 0;">💡 Pro Tip</h3>
              <p>${data.personalizedTip}</p>
            </div>` : ''}
          
          <p>Keep up the great work on your typing skills!</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Continue Practicing
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
          <p style="text-align: center; color: #64748b; font-size: 0.9rem;">
            You received this email because you signed up for SnailType progress updates.
          </p>
        </div>
      </body>
    </html>
  `;
  
  return { subject, htmlContent };
}

/**
 * Create a streak reminder email
 */
function createStreakReminderEmail(user, data) {
  const { currentStreak, nextMilestone } = data;
  const subject = `Don't break your ${currentStreak}-day streak! 🌟`;
  
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Hi ${user.display_name || 'there'}!</h1>
          
          <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <h2 style="margin: 10px 0;">🔥 ${currentStreak}-Day Streak Alert! 🔥</h2>
            <p style="margin: 15px 0; font-size: 1.2em;">You're just one day away from losing your amazing streak!</p>
          </div>
          
          <p>Your dedication to daily practice is truly paying off. Keep your streak alive by completing at least one typing test today.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" 
               style="background-color: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 1.1em; display: inline-block;">
              Practice Now
            </a>
          </div>
          
          ${nextMilestone ? 
            `<p style="text-align: center; font-weight: bold;">
              At ${nextMilestone} days you'll unlock a new achievement!
            </p>` : ''}
          
          <p>Every day of practice brings you closer to your goals.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
          <p style="text-align: center; color: #64748b; font-size: 0.9rem;">
            You received this because you opted to receive streak reminders.
          </p>
        </div>
      </body>
    </html>
  `;
  
  return { subject, htmlContent };
}

/**
 * Create an achievement notification email
 */
function createAchievementEmail(user, data) {
  const { achievementName, achievementDescription, icon = '🏆' } = data;
  const subject = `Congratulations! You earned: ${achievementName}`;
  
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">🎉 Achievement Unlocked! 🎉</h1>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 4em; margin-bottom: 20px;">${icon}</div>
            <h2 style="margin: 10px 0; color: #dc2626;">${achievementName}</h2>
            <p style="color: #64748b; margin: 10px 0;">${achievementDescription}</p>
          </div>
          
          <p>Congratulations ${user.display_name || 'on'} earning this achievement! Your hard work and dedication are paying off.</p>
          
          <p>This achievement has been added to your profile. Keep up the great work!</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard" 
               style="background-color: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 1.1em; display: inline-block;">
              View Achievements
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
          <p style="text-align: center; color: #64748b; font-size: 0.9rem;">
            You received this because you earned an achievement on SnailType.
          </p>
        </div>
      </body>
    </html>
  `;
  
  return { subject, htmlContent };
}

/**
 * Create a weekly recap email
 */
function createWeeklyRecapEmail(user, data) {
  const { weekStats, improvement, personalizedTip } = data;
  const subject = `Your Weekly Typing Recap - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Weekly Typing Recap</h1>
          
          <p>Hi ${user.display_name || 'there'}, here's your progress for the past week:</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">This Week's Stats</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
              <div style="background: white; padding: 10px; border-radius: 6px;">
                <div style="font-weight: bold; font-size: 1.2em; color: #2563eb;">${weekStats.avgWpm || 0} WPM</div>
                <div style="color: #64748b; font-size: 0.9em;">Average</div>
              </div>
              <div style="background: white; padding: 10px; border-radius: 6px;">
                <div style="font-weight: bold; font-size: 1.2em; color: #2563eb;">${weekStats.tests || 0}</div>
                <div style="color: #64748b; font-size: 0.9em;">Tests</div>
              </div>
              <div style="background: white; padding: 10px; border-radius: 6px;">
                <div style="font-weight: bold; font-size: 1.2em; color: #2563eb;">${weekStats.avgAccuracy || 0}%</div>
                <div style="color: #64748b; font-size: 0.9em;">Accuracy</div>
              </div>
              <div style="background: white; padding: 10px; border-radius: 6px;">
                <div style="font-weight: bold; font-size: 1.2em; color: #2563eb;">${weekStats.streak || 0} days</div>
                <div style="color: #64748b; font-size: 0.9em;">Current Streak</div>
              </div>
            </div>
          </div>
          
          ${improvement ? 
            `<div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0;">📈 Improvement</h3>
              <p>${improvement}</p>
            </div>` : ''}
          
          ${personalizedTip ? 
            `<div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0;">💡 Pro Tip</h3>
              <p>${personalizedTip}</p>
            </div>` : ''}
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" 
               style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 1.1em; display: inline-block;">
              Continue Practicing
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
          <p style="text-align: center; color: #64748b; font-size: 0.9rem;">
            You received this weekly recap to track your progress.
          </p>
        </div>
      </body>
    </html>
  `;
  
  return { subject, htmlContent };
}

/**
 * Create a friend activity notification email
 */
function createFriendActivityEmail(user, data) {
  const { friendName, activity, wpm } = data;
  const subject = `${friendName} achieved ${wpm} WPM in a typing test!`;
  
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Friend Activity Alert</h1>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 3em; margin-bottom: 15px;">👤</div>
            <h2 style="margin: 10px 0;">${friendName}</h2>
            <p style="color: #64748b; margin: 10px 0;">${activity}</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin-top: 0;">${wpm} WPM</h3>
            <p>That's an impressive result! Are you ready to match or beat that?</p>
          </div>
          
          <p>Your friend's progress shows what's possible with consistent practice. Why not challenge yourself with a new test?</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" 
               style="background-color: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 1.1em; display: inline-block;">
              Beat Their Score
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
          <p style="text-align: center; color: #64748b; font-size: 0.9rem;">
            You received this because ${friendName} is one of your friends on SnailType.
          </p>
        </div>
      </body>
    </html>
  `;
  
  return { subject, htmlContent };
}

/**
 * Create a comeback campaign email for lapsed users
 */
function createComebackEmail(user, data) {
  const { daysSinceLastLogin } = data;
  const subject = `We miss you! Come back to improve your typing skills`;
  
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">We Miss You, ${user.display_name || 'Typist'}!</h1>
          
          <p>It's been ${daysSinceLastLogin} days since your last typing session with us. Your streak and progress are waiting for you to continue!</p>
          
          <div style="background: linear-gradient(135deg, #e0f2fe, #bae6fd); padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h2 style="margin-top: 0;">What's new since you've been away:</h2>
            <ul style="margin-left: 20px;">
              <li>New adaptive training plans</li>
              <li>Updated weakness detection algorithms</li>
              <li>New text categories and modes</li>
              <li>Enhanced friend challenges</li>
            </ul>
          </div>
          
          <p>We've prepared a special comeback gift: <strong>Try our adaptive weakness mode</strong> to quickly refresh and improve your skills.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" 
               style="background-color: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 1.1em; display: inline-block;">
              Resume Training
            </a>
          </div>
          
          <p>It only takes a few minutes a day to maintain and improve your typing skills. We'd love to see you back!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
          <p style="text-align: center; color: #64748b; font-size: 0.9rem;">
            You received this because you haven't practiced on SnailType recently.
          </p>
        </div>
      </body>
    </html>
  `;
  
  return { subject, htmlContent };
}

/**
 * Record that a notification was sent
 */
async function recordNotificationSent(userId, type, data) {
  try {
    const notification = {
      user_id: userId,
      type: type,
      data: data,
      sent_at: new Date()
    };
    
    await supabaseAdmin
      .from('email_notifications')
      .insert(notification);
  } catch (error) {
    console.error('Error recording notification:', error);
    // Don't throw error as it shouldn't break the email sending flow
  }
}

/**
 * Schedule notification based on user preferences
 */
export async function scheduleNotification(userId, type, scheduledTime, data = {}) {
  try {
    // In a real implementation, this would use a scheduling service
    // For now, we'll just return a mock schedule
    
    return {
      success: true,
      scheduled: {
        userId,
        type,
        scheduledTime,
        data,
        createdAt: new Date()
      }
    };
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get user's notification preferences
 */
export async function getUserNotificationPreferences(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Row not found
      throw error;
    }
    
    // Return default preferences if none exist
    return {
      success: true,
      preferences: data || {
        daily_summaries: true,
        streak_reminders: true,
        achievement_notifs: true,
        weekly_recaps: true,
        friend_activities: true,
        comeback_emails: true
      }
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return {
      success: false,
      error: error.message,
      preferences: {
        daily_summaries: true,
        streak_reminders: true,
        achievement_notifs: true,
        weekly_recaps: true,
        friend_activities: true,
        comeback_emails: true
      }
    };
  }
}

/**
 * Update user's notification preferences
 */
export async function updateUserNotificationPreferences(userId, preferences) {
  try {
    const { error } = await supabaseAdmin
      .from('user_notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date()
      }, {
        onConflict: 'user_id'
      });
    
    if (error) throw error;
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return {
      success: false,
      error: error.message
    };
  }
}