// lib/services/planCompletionTracking.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Record when a user completes a daily plan component
 */
export async function recordPlanComponentCompletion(userId, planId, componentId, completionData) {
  try {
    const completionRecord = {
      user_id: userId,
      plan_id: planId,
      component_id: componentId,
      completed_at: new Date(),
      session_data: completionData, // Store session info like WPM, accuracy for analysis
      created_at: new Date()
    };
    
    const { data, error } = await supabaseAdmin
      .from('daily_plan_completions')
      .insert(completionRecord)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Check if the entire plan is now complete
    const planCompletion = await checkPlanCompleteness(planId);
    
    if (planCompletion.allCompleted) {
      await markPlanComplete(planId, userId);
    }
    
    return {
      success: true,
      completion: data,
      planCompleted: planCompletion.allCompleted,
      completedComponents: planCompletion.completedCount,
      totalComponents: planCompletion.totalCount
    };
  } catch (error) {
    console.error('Error recording plan component completion:', error);
    return {
      success: false,
      error: error.message,
      completion: null,
      planCompleted: false,
      completedComponents: 0,
      totalComponents: 0
    };
  }
}

/**
 * Check if all components of a plan have been completed
 */
async function checkPlanCompleteness(planId) {
  try {
    // Get the daily plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('daily_plans')
      .select('components')
      .eq('id', planId)
      .single();
    
    if (planError) throw planError;
    
    // Get completed components for this plan
    const { data: completions, error: completionError } = await supabaseAdmin
      .from('daily_plan_completions')
      .select('component_id')
      .eq('plan_id', planId);
    
    if (completionError) throw completionError;
    
    const completedComponentIds = new Set(completions.map(c => c.component_id));
    const totalComponents = plan.components.length;
    const completedCount = plan.components.filter(comp => 
      completedComponentIds.has(comp.id)
    ).length;
    
    return {
      allCompleted: completedCount === totalComponents,
      completedCount,
      totalCount: totalComponents
    };
  } catch (error) {
    console.error('Error checking plan completeness:', error);
    return {
      allCompleted: false,
      completedCount: 0,
      totalCount: 0
    };
  }
}

/**
 * Mark a plan as completely finished
 */
async function markPlanComplete(planId, userId) {
  try {
    // Update the plan record to mark it as completed
    const { error: updateError } = await supabaseAdmin
      .from('daily_plans')
      .update({ 
        completed_at: new Date(),
        updated_at: new Date()
      })
      .eq('id', planId);
    
    if (updateError) throw updateError;
    
    // Award XP for completing the plan
    await awardPlanCompletionXp(userId);
    
    return { success: true };
  } catch (error) {
    console.error('Error marking plan complete:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Award XP for completing a daily plan
 */
async function awardPlanCompletionXp(userId) {
  try {
    const { data: userStats, error: statsError } = await supabaseAdmin
      .from('user_stats')
      .select('xp, level')
      .eq('user_id', userId)
      .single();
    
    if (statsError) throw statsError;
    
    // Award 25 XP for completing a daily plan
    const newXp = (userStats.xp || 0) + 25;
    
    // Check if this levels up the user
    const currentLevel = userStats.level || 1;
    const xpForNextLevel = currentLevel * 100; // Level N requires N*100 XP to advance
    
    let newLevel = currentLevel;
    if (newXp >= xpForNextLevel) {
      newLevel = currentLevel + 1;
    }
    
    // Update user stats
    const { error: updateError } = await supabaseAdmin
      .from('user_stats')
      .update({ 
        xp: newXp,
        level: newLevel,
        updated_at: new Date()
      })
      .eq('user_id', userId);
    
    if (updateError) throw updateError;
    
    return {
      success: true,
      newXp,
      newLevel,
      leveledUp: newLevel > currentLevel
    };
  } catch (error) {
    console.error('Error awarding XP for plan completion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's plan completion statistics for the dashboard
 */
export async function getPlanCompletionStats(userId) {
  try {
    // Get plan completion counts
    const { count: totalPlans, error: totalError } = await supabaseAdmin
      .from('daily_plans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (totalError) throw totalError;
    
    const { count: completedPlans, error: completedError } = await supabaseAdmin
      .from('daily_plans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null);
    
    if (completedError) throw completedError;
    
    // Calculate completion rate
    const completionRate = totalPlans > 0 ? (completedPlans / totalPlans) * 100 : 0;
    
    // Get current streak of consecutive completed plans
    const currentStreak = await calculateCurrentStreak(userId);
    
    // Get recent completion history (last 30 days)
    const recentCompletions = await getRecentPlanCompletions(userId, 30);
    
    // Get the last completed plan components to assess focus
    const { weakAreas, strengthAreas } = await analyzeFocusAreas(userId);
    
    return {
      success: true,
      totalPlans,
      completedPlans,
      completionRate: parseFloat(completionRate.toFixed(1)),
      currentStreak,
      recentCompletions,
      weakAreas,
      strengthAreas,
      consistency: calculateConsistency(recentCompletions)
    };
  } catch (error) {
    console.error('Error getting plan completion stats:', error);
    return {
      success: false,
      error: error.message,
      totalPlans: 0,
      completedPlans: 0,
      completionRate: 0,
      currentStreak: 0,
      recentCompletions: [],
      weakAreas: [],
      strengthAreas: [],
      consistency: 0
    };
  }
}

/**
 * Calculate the user's current streak of consecutive daily plan completions
 */
async function calculateCurrentStreak(userId) {
  try {
    // Get completed plans ordered by date (descending)
    const { data: completedPlans, error } = await supabaseAdmin
      .from('daily_plans')
      .select('plan_date, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('plan_date', { ascending: false });
    
    if (error) throw error;
    
    if (!completedPlans || completedPlans.length === 0) return 0;
    
    // Calculate the current streak
    let currentStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Normalize to day start
    
    // Go back one day (since we check if today's plan was completed)
    currentDate.setDate(currentDate.getDate() - 1);
    
    for (const plan of completedPlans) {
      const planDate = new Date(plan.plan_date);
      planDate.setHours(0, 0, 0, 0); // Normalize to day start
      
      if (planDate.getTime() === currentDate.getTime()) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (planDate.getTime() < currentDate.getTime()) {
        // Gap in streak - stop counting
        break;
      }
      // If planDate > currentDate, it's a future date (shouldn't happen) - skip
    }
    
    return currentStreak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
}

/**
 * Get recent plan completions for history
 */
async function getRecentPlanCompletions(userId, days = 30) {
  try {
    const { data, error } = await supabaseAdmin
      .from('daily_plans')
      .select('plan_date, completed_at, components')
      .eq('user_id', userId)
      .not('completed_at', 'is', null')
      .gte('plan_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('plan_date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting recent completions:', error);
    return [];
  }
}

/**
 * Analyze user's focus areas based on completed plan components
 */
async function analyzeFocusAreas(userId) {
  try {
    // Get recently completed plan components
    const { data, error } = await supabaseAdmin
      .from('daily_plan_completions')
      .select('created_at, session_data')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false })
      .limit(50); // Limit to last 50 completions
    
    if (error) throw error;
    
    // Analyze the sessions to identify trends
    const performanceTrends = {
      weakAreas: [],
      strengthAreas: [],
      improvementTrends: []
    };
    
    if (data && data.length > 0) {
      // For now, we'll return mock analysis until we implement full analysis
      // In a real implementation, this would analyze session_data.performance_metrics
      
      performanceTrends.weakAreas = ['accuracy', 'speed consistency'];
      performanceTrends.strengthAreas = ['overall typing', 'common keys'];
    }
    
    return performanceTrends;
  } catch (error) {
    console.error('Error analyzing focus areas:', error);
    return {
      weakAreas: [],
      strengthAreas: []
    };
  }
}

/**
 * Calculate consistency based on plan completion history
 */
function calculateConsistency(recentCompletions) {
  if (recentCompletions.length === 0) return 0;
  
  // Count how many days in the last 30 had a plan completion
  const daysLookedAt = 30;
  const daysCompleted = recentCompletions.length;
  
  return Math.round((daysCompleted / daysLookedAt) * 100);
}

/**
 * Get progress for a specific daily plan
 */
export async function getPlanProgress(userId, planId) {
  try {
    // Get the plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('daily_plans')
      .select('components')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();
    
    if (planError) throw planError;
    
    // Get completed components for this plan
    const { data: completions, error: completionError } = await supabaseAdmin
      .from('daily_plan_completions')
      .select('component_id, completed_at, session_data')
      .eq('plan_id', planId)
      .order('completed_at', { ascending: true });
    
    if (completionError) throw completionError;
    
    const completedComponentIds = new Set(completions.map(c => c.component_id));
    
    // Add completion status to each component
    const componentsWithStatus = plan.components.map(component => {
      const completed = completions.find(c => c.component_id === component.id);
      return {
        ...component,
        completed: !!completed,
        completedAt: completed ? completed.completed_at : null,
        sessionData: completed ? completed.session_data : null
      };
    });
    
    const completedCount = componentsWithStatus.filter(c => c.completed).length;
    const totalCount = plan.components.length;
    const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    return {
      success: true,
      plan: {
        ...plan,
        components: componentsWithStatus
      },
      completedCount,
      totalCount,
      progressPercentage,
      allCompleted: completedCount === totalCount
    };
  } catch (error) {
    console.error('Error getting plan progress:', error);
    return {
      success: false,
      error: error.message,
      plan: null,
      completedCount: 0,
      totalCount: 0,
      progressPercentage: 0,
      allCompleted: false
    };
  }
}

/**
 * Get user's daily plan history
 */
export async function getPlanHistory(userId, limit = 30) {
  try {
    const { data, error } = await supabaseAdmin
      .from('daily_plans')
      .select('id, plan_date, completed_at, components')
      .eq('user_id', userId)
      .order('plan_date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return {
      success: true,
      history: data || []
    };
  } catch (error) {
    console.error('Error getting plan history:', error);
    return {
      success: false,
      error: error.message,
      history: []
    };
  }
}