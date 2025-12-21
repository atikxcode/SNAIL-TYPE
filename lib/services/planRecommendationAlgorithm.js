// lib/services/planRecommendationAlgorithm.js
import { createClient } from '@supabase/supabase-js';
import { getUserStats } from './sessionAggregation';
import { getWeaknessProfile } from './weaknessService';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Advanced algorithm to recommend personalized training plans based on user's strengths and weaknesses
 */
export async function recommendTrainingPlan(userId) {
  try {
    // Get user's stats from PostgreSQL
    const userStats = await getUserStats(userId);
    
    // Get user's weakness profile from PostgreSQL
    const weaknessProfile = await getWeaknessProfile(userId);
    
    // Get recent sessions to understand patterns
    const recentSessions = await getRecentSessions(userId, 10);
    
    // Determine user's level and needs
    const userProfile = await analyzeUserProfile(userStats, weaknessProfile, recentSessions);
    
    // Generate a customized plan based on the analysis
    const recommendedPlan = generatePersonalizedPlan(userProfile, userStats, weaknessProfile);
    
    return {
      success: true,
      plan: recommendedPlan,
      profile: userProfile
    };
  } catch (error) {
    console.error('Error in plan recommendation algorithm:', error);
    return {
      success: false,
      error: error.message,
      plan: null,
      profile: null
    };
  }
}

/**
 * Analyze user profile based on their stats, weaknesses, and recent sessions
 */
async function analyzeUserProfile(userStats, weaknessProfile, recentSessions) {
  // Calculate user's level based on various factors
  const avgWpm = userStats?.avg_wpm || 0;
  const bestWpm = userStats?.best_wpm || 0;
  const avgAccuracy = userStats?.avg_accuracy || 0;
  const totalTests = userStats?.total_tests || 0;
  const currentStreak = userStats?.current_streak_days || 0;
  const level = userStats?.level || 1;
  
  // Analyze weakness patterns
  const weaknessAnalysis = analyzeWeaknessPatterns(weaknessProfile);
  
  // Analyze recent session patterns
  const sessionAnalysis = analyzeSessionPatterns(recentSessions);
  
  // Determine user type
  let userType = 'beginner';
  if (level >= 10 && avgWpm >= 60) userType = 'intermediate';
  else if (level >= 20 && avgWpm >= 80) userType = 'advanced';
  else if (level >= 30 && avgWpm >= 100) userType = 'expert';
  
  return {
    level,
    userType,
    avgWpm,
    bestWpm,
    avgAccuracy,
    totalTests,
    currentStreak,
    weaknessAnalysis,
    sessionAnalysis,
    needs: determineNeeds(avgWpm, avgAccuracy, weaknessProfile, sessionAnalysis)
  };
}

/**
 * Analyze weakness patterns to identify specific areas of focus
 */
function analyzeWeaknessPatterns(weaknessProfile) {
  if (!weaknessProfile) {
    return {
      weakKeys: [],
      weakBigrams: [],
      accuracyOverTime: {},
      keyLatencyIssues: []
    };
  }
  
  return {
    weakKeys: weaknessProfile.weak_keys || [],
    weakBigrams: weaknessProfile.weak_bigrams || [],
    accuracyOverTime: weaknessProfile.avg_accuracy_by_duration || {},
    keyLatencyIssues: weaknessProfile.avg_key_latency || []
  };
}

/**
 * Analyze recent session patterns to identify trends
 */
function analyzeSessionPatterns(sessions) {
  if (!sessions || sessions.length === 0) {
    return {
      wpmTrend: 'stable',
      accuracyTrend: 'stable',
      consistency: 'low',
      timeOfDayPreference: 'unknown'
    };
  }
  
  // Calculate WPM and accuracy trends
  const wpms = sessions.map(s => s.avg_wpm).filter(w => w !== undefined && w !== null);
  const accuracies = sessions.map(s => s.avg_accuracy).filter(a => a !== undefined && a !== null);
  
  let wpmTrend = 'stable';
  if (wpms.length >= 2) {
    const firstWpm = wpms[wpms.length - 1]; // Oldest
    const lastWpm = wpms[0]; // Newest
    if (lastWpm > firstWpm * 1.05) wpmTrend = 'improving';
    else if (lastWpm < firstWpm * 0.95) wpmTrend = 'declining';
  }
  
  let accuracyTrend = 'stable';
  if (accuracies.length >= 2) {
    const firstAcc = accuracies[accuracies.length - 1]; // Oldest
    const lastAcc = accuracies[0]; // Newest
    if (lastAcc > firstAcc + 2) accuracyTrend = 'improving';
    else if (lastAcc < firstAcc - 2) accuracyTrend = 'declining';
  }
  
  // Calculate consistency (standard deviation of WPM)
  const meanWpm = wpms.reduce((sum, wpm) => sum + wpm, 0) / wpms.length;
  const variance = wpms.reduce((sum, wpm) => sum + Math.pow(wpm - meanWpm, 2), 0) / wpms.length;
  const stdDev = Math.sqrt(variance);
  
  const consistency = stdDev < 5 ? 'high' : stdDev < 10 ? 'medium' : 'low';
  
  return {
    wpmTrend,
    accuracyTrend,
    consistency,
    timeOfDayPreference: 'unknown' // Would analyze timestamps in a full implementation
  };
}

/**
 * Determine specific needs based on all collected data
 */
function determineNeeds(avgWpm, avgAccuracy, weaknessProfile, sessionAnalysis) {
  const needs = [];
  
  // Speed needs
  if (avgWpm < 40) {
    needs.push('speed_building');
  } else if (avgWpm > 40 && avgWpm < 70) {
    needs.push('balanced_training');
  } else if (avgWpm >= 70) {
    needs.push('precision_over_speed');
  }
  
  // Accuracy needs
  if (avgAccuracy < 95) {
    needs.push('accuracy_focus');
  }
  
  // Weakness needs
  if (weaknessProfile?.weak_keys && weaknessProfile.weak_keys.length > 0) {
    needs.push('weakness_targeting');
  }
  
  // Consistency needs
  if (sessionAnalysis.consistency === 'low') {
    needs.push('consistency_building');
  }
  
  return needs;
}

/**
 * Generate a personalized training plan based on the user profile
 */
function generatePersonalizedPlan(userProfile, userStats, weaknessProfile) {
  const components = [];
  
  // Determine plan intensity based on user's level and recent activity
  const planIntensity = determinePlanIntensity(userProfile);
  
  // Add warmup component
  components.push(createWarmupComponent(userProfile));
  
  // Add weakness-focused component based on user's specific weaknesses
  if (weaknessProfile?.weak_keys && weaknessProfile.weak_keys.length > 0) {
    components.push(...createWeaknessFocusedComponents(weaknessProfile, planIntensity));
  }
  
  // Add accuracy component if needed
  if (userProfile.needs.includes('accuracy_focus')) {
    components.push(createAccuracyComponent(userProfile, planIntensity));
  }
  
  // Add speed building component if needed
  if (userProfile.needs.includes('speed_building')) {
    components.push(createSpeedBuildingComponent(userProfile, planIntensity));
  }
  
  // Add consistency component if needed
  if (userProfile.needs.includes('consistency_building')) {
    components.push(createConsistencyComponent(userProfile, planIntensity));
  }
  
  // Add balanced training component
  components.push(createBalancedComponent(userProfile, planIntensity));
  
  // Add cooldown component
  components.push(createCooldownComponent());
  
  return {
    components,
    totalDuration: components.reduce((sum, comp) => sum + comp.duration, 0),
    intensity: planIntensity,
    focusAreas: userProfile.needs,
    estimatedImprovement: calculateEstimatedImprovement(userProfile, weaknessProfile)
  };
}

/**
 * Determine plan intensity based on user profile
 */
function determinePlanIntensity(userProfile) {
  // More experienced users get more intensive plans
  if (userProfile.level >= 20) return 'high';
  if (userProfile.level >= 10) return 'medium';
  return 'low';
}

/**
 * Create warmup component
 */
function createWarmupComponent(userProfile) {
  return {
    id: 'warmup',
    name: 'Warm Up',
    description: 'Gentle introduction to get your fingers ready',
    category: 'random_words',
    difficulty: 'easy',
    duration: 60, // 1 minute
    target: 'Focus on accuracy and relaxation',
    priority: 'low'
  };
}

/**
 * Create components focused on user's weaknesses
 */
function createWeaknessFocusedComponents(weaknessProfile, intensity) {
  const components = [];
  
  // Focus on top 3 weak keys
  const topWeakKeys = (weaknessProfile.weak_keys || []).slice(0, 3);
  
  for (const weakKey of topWeakKeys) {
    let duration = 120; // 2 minutes default
    if (intensity === 'medium') duration = 150; // 2.5 minutes
    if (intensity === 'high') duration = 180; // 3 minutes
    
    components.push({
      id: `weakness_${weakKey.key}`,
      name: `Focus: ${weakKey.key.toUpperCase()} Key`,
      description: `Practice words that heavily feature the '${weakKey.key}' key`,
      category: 'custom',
      difficulty: 'medium',
      duration: duration,
      target: `Improve accuracy on the ${weakKey.key} key to ${Math.max(85, 100 - weakKey.error_rate)}%`,
      priority: 'high',
      focusKey: weakKey.key
    });
  }
  
  // Focus on top 2 weak bigrams
  const topWeakBigrams = (weaknessProfile.weak_bigrams || []).slice(0, 2);
  
  for (const weakBigram of topWeakBigrams) {
    let duration = 90; // 1.5 minutes default
    if (intensity === 'medium') duration = 120; // 2 minutes
    if (intensity === 'high') duration = 150; // 2.5 minutes
    
    components.push({
      id: `bigram_${weakBigram.bigram.replace(/[^a-zA-Z]/g, '_')}`,
      name: `Focus: "${weakBigram.bigram}" Combination`,
      description: `Practice the "${weakBigram.bigram}" key combination`,
      category: 'custom',
      difficulty: 'medium',
      duration: duration,
      target: `Reduce error rate on "${weakBigram.bigram}" combination`,
      priority: 'medium',
      focusBigram: weakBigram.bigram
    });
  }
  
  return components;
}

/**
 * Create accuracy-focused component
 */
function createAccuracyComponent(userProfile, intensity) {
  let duration = 120; // 2 minutes default
  if (intensity === 'medium') duration = 150; // 2.5 minutes
  if (intensity === 'high') duration = 180; // 3 minutes
  
  return {
    id: 'accuracy_focus',
    name: 'Accuracy Challenge',
    description: 'Focus on precision over speed',
    category: 'random_words',
    difficulty: intensity === 'high' ? 'hard' : 'medium',
    duration: duration,
    target: 'Keep error rate below 5%',
    priority: 'high',
    specialMode: 'accuracy_focus'
  };
}

/**
 * Create speed-building component
 */
function createSpeedBuildingComponent(userProfile, intensity) {
  let duration = 60; // 1 minute default
  if (intensity === 'medium') duration = 90; // 1.5 minutes
  if (intensity === 'high') duration = 120; // 2 minutes
  
  return {
    id: 'speed_build',
    name: 'Speed Building',
    description: 'Push your speed limits safely',
    category: 'random_words',
    difficulty: intensity === 'high' ? 'hard' : 'medium',
    duration: duration,
    target: `Try to beat your personal best WPM by 5+`,
    priority: 'medium',
    specialMode: 'speed_challenge'
  };
}

/**
 * Create consistency-building component
 */
function createConsistencyComponent(userProfile, intensity) {
  let duration = 180; // 3 minutes default
  if (intensity === 'medium') duration = 240; // 4 minutes
  if (intensity === 'high') duration = 300; // 5 minutes
  
  return {
    id: 'consistency_build',
    name: 'Endurance Training',
    description: 'Maintain performance over longer periods',
    category: 'random_words',
    difficulty: intensity === 'high' ? 'hard' : 'medium',
    duration: duration,
    target: 'Maintain consistent WPM and accuracy for the full duration',
    priority: 'medium',
    specialMode: 'endurance_mode'
  };
}

/**
 * Create balanced training component
 */
function createBalancedComponent(userProfile, intensity) {
  let duration = 180; // 3 minutes default
  if (intensity === 'medium') duration = 240; // 4 minutes
  if (intensity === 'high') duration = 300; // 5 minutes
  
  return {
    id: 'balanced_train',
    name: 'Balanced Practice',
    description: 'General practice combining speed and accuracy',
    category: 'random_words',
    difficulty: intensity === 'high' ? 'hard' : (intensity === 'medium' ? 'medium' : 'easy'),
    duration: duration,
    target: 'Balance speed with accuracy',
    priority: 'low'
  };
}

/**
 * Create cooldown component
 */
function createCooldownComponent() {
  return {
    id: 'cooldown',
    name: 'Cooldown',
    description: 'Finish with relaxed typing to consolidate learning',
    category: 'random_words',
    difficulty: 'easy',
    duration: 60, // 1 minute
    target: 'Relaxed typing focusing on proper form',
    priority: 'low'
  };
}

/**
 * Calculate estimated improvement based on focus areas
 */
function calculateEstimatedImprovement(userProfile, weaknessProfile) {
  const improvements = {};
  
  if (userProfile.needs.includes('speed_building')) {
    improvements.speed = 'Expected: +5-10 WPM over next 2 weeks with consistent practice';
  }
  
  if (userProfile.needs.includes('accuracy_focus')) {
    improvements.accuracy = 'Expected: +2-5% accuracy improvement';
  }
  
  if (userProfile.needs.includes('weakness_targeting')) {
    improvements.weaknesses = 'Expected: 15-25% improvement in targeted weak keys/bigrams';
  }
  
  return improvements;
}

/**
 * Get recent sessions for analysis
 */
async function getRecentSessions(userId, limit = 10) {
  try {
    const { data, error } = await supabaseAdmin
      .from('session_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting recent sessions:', error);
    return [];
  }
}