// lib/services/coachingFeedbackSystem.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Generate personalized coaching feedback after a typing test
 */
export async function generateCoachingFeedback(sessionData, userStats, weaknessProfile) {
  try {
    const feedback = {
      immediate: [],  // Immediate feedback for the current session
      improvementAreas: [],  // Areas that need work
      positiveReinforcement: [],  // Positive aspects
      recommendations: [],  // Specific recommendations
      nextSteps: []  // Next steps to take
    };

    // Calculate performance metrics for feedback
    const performance = calculatePerformanceMetrics(sessionData, userStats, weaknessProfile);
    
    // Add immediate feedback based on session performance
    feedback.immediate = generateImmediateFeedback(sessionData, performance);
    
    // Identify improvement areas based on weaknesses
    feedback.improvementAreas = generateImprovementAreas(performance, weaknessProfile);
    
    // Generate positive reinforcement
    feedback.positiveReinforcement = generatePositiveFeedback(sessionData, performance);
    
    // Create specific recommendations based on weaknesses
    feedback.recommendations = generateRecommendations(performance, weaknessProfile);
    
    // Suggest next steps
    feedback.nextSteps = generateNextSteps(performance, weaknessProfile);
    
    // Save feedback to user's history if authenticated
    if (sessionData.userId) {
      await saveCoachingFeedback(sessionData.userId, sessionData.sessionId, feedback);
    }
    
    return {
      success: true,
      feedback
    };
  } catch (error) {
    console.error('Error generating coaching feedback:', error);
    return {
      success: false,
      error: error.message,
      feedback: {
        immediate: ['Feedback generation error, but great effort!'],
        improvementAreas: [],
        positiveReinforcement: [],
        recommendations: [],
        nextSteps: ['Continue practicing regularly']
      }
    };
  }
}

/**
 * Calculate performance metrics for generating feedback
 */
function calculatePerformanceMetrics(sessionData, userStats, weaknessProfile) {
  const metrics = {
    wpm: sessionData.wpm,
    accuracy: sessionData.accuracy,
    wpmChangeFromAvg: 0,
    accuracyChangeFromAvg: 0,
    comparedToBest: 0,
    weakKeyErrors: 0,
    weakBigramErrors: 0,
    consistencyRating: 'medium', // low, medium, high
    timeOfDayPerformance: 'morning' // morning, afternoon, evening, night (would be calculated based on session time in full implementation)
  };
  
  if (userStats) {
    metrics.wpmChangeFromAvg = sessionData.wpm - (userStats.avg_wpm || 0);
    metrics.accuracyChangeFromAvg = sessionData.accuracy - (userStats.avg_accuracy || 0);
    metrics.comparedToBest = sessionData.wpm - (userStats.best_wpm || 0);
  }
  
  // Analyze weak key errors if weakness profile is available
  if (weaknessProfile && sessionData.keystrokes) {
    const weakKeys = new Set((weaknessProfile.weak_keys || []).map(k => k.key));
    
    if (sessionData.keystrokes) {
      for (const keystroke of sessionData.keystrokes) {
        if (weakKeys.has(keystroke.key) && !keystroke.correct) {
          metrics.weakKeyErrors++;
        }
      }
    }
  }
  
  // Calculate consistency based on WPM variation during session (simplified)
  // In a real implementation, we'd analyze WPM over time during the session
  
  return metrics;
}

/**
 * Generate immediate feedback based on the current session
 */
function generateImmediateFeedback(sessionData, performance) {
  const feedback = [];
  
  // WPM-related feedback
  if (performance.wpm > 100) {
    feedback.push('Excellent speed! You\'re hitting expert levels.');
  } else if (performance.wpm > 70) {
    feedback.push('Great speed! You\'re performing at an advanced level.');
  } else if (performance.wpm > 50) {
    feedback.push('Good speed! Keep building on this foundation.');
  } else {
    feedback.push('Focus on accuracy first, speed will come with practice.');
  }
  
  // Accuracy-related feedback
  if (sessionData.accuracy >= 98) {
    feedback.push('Exceptional accuracy! Keep up this precision.');
  } else if (sessionData.accuracy >= 95) {
    feedback.push('Strong accuracy! A few more focused practice sessions will boost this further.');
  } else if (sessionData.accuracy >= 90) {
    feedback.push('Decent accuracy, but room for improvement. Try slowing down slightly.');
  } else {
    feedback.push('Accuracy needs attention. Focus on correctness over speed.');
  }
  
  // Performance improvement/deterioration
  if (performance.wpmChangeFromAvg > 5) {
    feedback.push('You\'re improving! This session shows growth from your average performance.');
  } else if (performance.wpmChangeFromAvg < -5) {
    feedback.push('Your speed is below your average. Don\'t worry - sometimes we have off days.');
  }
  
  if (performance.accuracyChangeFromAvg > 2) {
    feedback.push('Noticeable accuracy improvement from your average!');
  }
  
  return feedback;
}

/**
 * Generate improvement areas based on weaknesses
 */
function generateImprovementAreas(performance, weaknessProfile) {
  const areas = [];
  
  if (performance.weakKeyErrors > 3) {
    const weakKeys = weaknessProfile?.weak_keys?.slice(0, 3) || [];
    if (weakKeys.length > 0) {
      areas.push(`Focus on these keys: ${weakKeys.map(k => `\`${k.key}\``).join(', ')} - practice drills targeting these.`);
    }
  }
  
  if (performance.accuracy < 95) {
    areas.push('Accuracy needs improvement. Try reducing speed slightly to gain precision.');
  }
  
  if (performance.wpm < 40) {
    areas.push('Speed building exercises would benefit you. Focus on consistent rhythm.');
  }
  
  // Analyze bigram weaknesses
  if (weaknessProfile?.weak_bigrams && weaknessProfile.weak_bigrams.length > 0) {
    const topBigrams = weaknessProfile.weak_bigrams.slice(0, 2);
    if (topBigrams.length > 0) {
      areas.push(`Work on these letter combinations: ${topBigrams.map(b => `\`${b.bigram}\``).join(', ')}`);
    }
  }
  
  return areas;
}

/**
 * Generate positive reinforcement
 */
function generatePositiveFeedback(sessionData, performance) {
  const positive = [];
  
  // WPM achievements
  if (performance.comparedToBest > 0) {
    positive.push('🎉 New personal best WPM! Keep up the excellent work.');
  }
  
  if (sessionData.wpm > 100) {
    positive.push('🚀 You\'re entering elite territory with that speed!');
  } else if (sessionData.wpm > 80) {
    positive.push('💪 Solid intermediate/advanced speed - you\'re progressing well!');
  }
  
  // Accuracy achievements
  if (sessionData.accuracy >= 99) {
    positive.push('🎯 Nearly perfect accuracy! Exceptional precision!');
  }
  
  if (performance.wpmChangeFromAvg > 10) {
    positive.push('📈 Significant improvement over your average - something is working!');
  }
  
  // Consistency praise
  if (performance.accuracy >= 97 && performance.wpm > 50) {
    positive.push('⚖️ Great balance of speed and accuracy - that\'s the sweet spot!');
  }
  
  // Improvement recognition
  if (sessionData.testDuration >= 120) {
    positive.push('⏱️ Completing a longer test shows dedication and endurance!');
  }
  
  return positive;
}

/**
 * Generate specific recommendations based on weaknesses
 */
function generateRecommendations(performance, weaknessProfile) {
  const recommendations = [];
  
  if (weaknessProfile?.weak_keys && weaknessProfile.weak_keys.length > 0) {
    const topWeakKey = weaknessProfile.weak_keys[0];
    if (topWeakKey) {
      recommendations.push({
        type: 'weak_key_drill',
        title: `Practice your weakest key: ${topWeakKey.key}`,
        description: `Focus on the '${topWeakKey.key}' key with dedicated drills.`,
        target: `Aim for ${Math.max(90, 100 - topWeakKey.error_rate)}% accuracy on this key`,
        suggestedDuration: '5 minutes'
      });
    }
  }
  
  if (performance.accuracy < 95) {
    recommendations.push({
      type: 'accuracy_focus',
      title: 'Accuracy-First Approach',
      description: 'Try slowing down to prioritize hitting the correct keys.',
      target: 'Maintain >95% accuracy at a reduced pace',
      suggestedDuration: 'During your next 3 sessions'
    });
  }
  
  if (performance.weakBigramErrors > 2) {
    if (weaknessProfile?.weak_bigrams && weaknessProfile.weak_bigrams.length > 0) {
      const topWeakBigram = weaknessProfile.weak_bigrams[0];
      if (topWeakBigram) {
        recommendations.push({
          type: 'bigram_drill',
          title: `Practice the "${topWeakBigram.bigram}" combination`,
          description: `Work on the ${topWeakBigram.bigram} letter combination which showed higher error rates.`,
          target: `Reduce ${topWeakBigram.bigram} error rate by 50%`,
          suggestedDuration: '3-5 minutes daily'
        });
      }
    }
  }
  
  // Recommend consistency training if performance varies significantly
  if (performance.wpmChangeFromAvg < -10) {
    recommendations.push({
      type: 'consistency_training',
      title: 'Consistency Focus',
      description: 'Your performance was lower than usual. Focus on establishing a consistent routine.',
      target: 'Same time daily, proper rest before tests',
      suggestedDuration: 'For next week'
    });
  }
  
  return recommendations;
}

/**
 * Generate next steps for continued improvement
 */
function generateNextSteps(performance, weaknessProfile) {
  const steps = [];
  
  // Personalized next step based on profile
  if (weaknessProfile?.weak_keys && weaknessProfile.weak_keys.length > 0) {
    const topWeak = weaknessProfile.weak_keys[0];
    steps.push(`1. Complete the '${topWeak.key}' key drill for the next 5 days`);
    steps.push('2. Then move to a balanced practice session');
  } else {
    steps.push('1. Maintain regular practice (daily if possible)');
    steps.push('2. Focus on maintaining good form and posture');
  }
  
  // If speed is low, suggest speed building
  if (performance.wpm < 60) {
    steps.push('3. Incorporate speed building exercises in your plan');
  }
  
  // If accuracy is low, suggest accuracy focus
  if (performance.accuracy < 95) {
    steps.push('3. Emphasize accuracy over speed in your next 3 sessions');
  }
  
  // Add general tip
  steps.push('4. Make sure you\'re taking breaks between sessions to avoid fatigue');
  
  return steps;
}

/**
 * Save coaching feedback to database for historical tracking
 */
async function saveCoachingFeedback(userId, sessionId, feedback) {
  try {
    const feedbackRecord = {
      user_id: userId,
      session_id: sessionId,
      feedback_data: feedback,
      created_at: new Date()
    };
    
    const { error } = await supabaseAdmin
      .from('coaching_feedback')
      .insert(feedbackRecord);
    
    if (error) {
      console.error('Error saving coaching feedback:', error);
      // Don't throw error as it shouldn't break the user experience
    }
  } catch (error) {
    console.error('Error in saveCoachingFeedback:', error);
  }
}

/**
 * Get historical coaching feedback for a user
 */
export async function getHistoricalCoachingFeedback(userId, limit = 10) {
  try {
    const { data, error } = await supabaseAdmin
      .from('coaching_feedback')
      .select('feedback_data, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    return {
      success: true,
      feedbackHistory: data || []
    };
  } catch (error) {
    console.error('Error getting historical coaching feedback:', error);
    return {
      success: false,
      error: error.message,
      feedbackHistory: []
    };
  }
}

/**
 * Get coaching insights for the dashboard
 */
export async function getCoachingInsights(userId) {
  try {
    // Get recent feedback
    const { feedbackHistory } = await getHistoricalCoachingFeedback(userId, 20);
    
    // Analyze trends
    const insights = {
      recentImprovements: [],
      persistentWeaknesses: [],
      successPatterns: [],
      recommendedFocus: 'general_practice',
      motivationMessage: 'Keep up the great work!'
    };
    
    if (feedbackHistory.length > 0) {
      // Analyze improvement trends
      const recentWpmTrend = calculateWpmTrend(feedbackHistory);
      
      if (recentWpmTrend > 5) {
        insights.recentImprovements.push('WPM is showing positive upward trend');
      }
      
      // Identify persistent weaknesses from feedback
      // This would analyze multiple feedback records to identify recurring themes
      
      // Set recommended focus based on recent performance
      if (recentWpmTrend < 0 && Math.abs(recentWpmTrend) > 5) {
        insights.recommendedFocus = 'consistency';
      } else if (recentWpmTrend > 5) {
        insights.recommendedFocus = 'maintain_speed_gains';
      }
      
      // Generate motivation message based on progress
      insights.motivationMessage = generateMotivationMessage(recentWpmTrend, feedbackHistory[0]);
    }
    
    return {
      success: true,
      insights
    };
  } catch (error) {
    console.error('Error getting coaching insights:', error);
    return {
      success: false,
      error: error.message,
      insights: {
        recentImprovements: [],
        persistentWeaknesses: [],
        successPatterns: [],
        recommendedFocus: 'general_practice',
        motivationMessage: 'Keep practicing - improvement comes with time!'
      }
    };
  }
}

/**
 * Helper function to calculate WPM trend
 */
function calculateWpmTrend(feedbackHistory) {
  // Simplified calculation - in reality, we'd extract WPM from session data
  if (feedbackHistory.length < 2) return 0;
  
  // Return a dummy trend value (in a real implementation, we'd extract WPM values from sessions)
  return 2.5; // Positive trend
}

/**
 * Generate motivational message based on performance
 */
function generateMotivationMessage(wpmTrend, recentFeedback) {
  if (wpmTrend > 5) {
    return 'You\'re on a roll! Your consistent practice is showing impressive results.';
  } else if (wpmTrend > 0) {
    return 'Good progress! Small gains add up to big improvements over time.';
  } else if (wpmTrend < -5) {
    return 'Don\'t worry about temporary setbacks - focus on your next session and get back on track.';
  }
  
  return 'Keep up the steady progress - consistency is key to improvement!';
}