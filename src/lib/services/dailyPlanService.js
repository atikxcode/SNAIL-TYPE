// lib/services/dailyPlanService.js
import { createClient } from '@supabase/supabase-js';
import { getUserStats } from '@/lib/db/sessionAggregation';
import { getWeaknessProfile } from '@/lib/services/weaknessService';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Generate a personalized daily training plan for a user
 */
export async function generateDailyPlan(userId) {
  try {
    // Get user stats and weakness profile to customize the plan
    const userStats = await getUserStats(userId);
    const weaknessProfile = await getWeaknessProfile(userId);
    
    // Define plan components based on user's needs
    const planComponents = [];
    
    // 1. Warmup exercise (always included)
    planComponents.push({
      id: 'warmup',
      name: 'Warmup',
      description: 'Start with some easy typing to warm up your fingers',
      category: 'random_words',
      difficulty: 'easy',
      duration: 60, // 1 minute
      target: 'Relaxed typing, focus on accuracy'
    });
    
    // 2. Weakness drill based on user's weakness profile
    if (weaknessProfile && weaknessProfile.weak_keys && weaknessProfile.weak_keys.length > 0) {
      // Find the most problematic key
      const worstKey = weaknessProfile.weak_keys.reduce((worst, current) => 
        current.error_rate > worst.error_rate ? current : worst, 
        weaknessProfile.weak_keys[0]
      );
      
      planComponents.push({
        id: 'weakness_drill',
        name: `Focus: ${worstKey.key.toUpperCase()} Key`,
        description: `Practice words with the '${worstKey.key}' key`,
        category: 'custom',
        difficulty: 'medium',
        duration: 120, // 2 minutes
        target: `Maintain ${Math.max(85, 100 - worstKey.error_rate)}% accuracy on this key`,
        customText: generateWeaknessDrillText(worstKey.key, 100)
      });
    }
    
    // 3. Accuracy challenge if user struggles with accuracy
    if (userStats?.avg_accuracy && userStats.avg_accuracy < 95) {
      planComponents.push({
        id: 'accuracy_challenge',
        name: 'Accuracy Focus',
        description: 'Focus on precision over speed',
        category: 'random_words',
        difficulty: 'medium',
        duration: 90, // 1.5 minutes
        target: 'Keep error rate below 5%',
        special_mode: 'accuracy_focus'
      });
    }
    
    // 4. Speed challenge if user has decent accuracy but low WPM
    if (userStats?.avg_accuracy && userStats.avg_accuracy >= 95 && userStats?.avg_wpm && userStats.avg_wpm < 70) {
      planComponents.push({
        id: 'speed_challenge',
        name: 'Speed Building',
        description: 'Try to beat your personal best',
        category: 'random_words',
        difficulty: 'medium',
        duration: 60, // 1 minute
        target: `Beat your best WPM (${userStats.best_wpm}) by 5+`,
        special_mode: 'speed_challenge'
      });
    }
    
    // 5. Regular training block
    planComponents.push({
      id: 'regular_training',
      name: 'Regular Training',
      description: 'Standard typing practice',
      category: 'random_words',
      difficulty: userStats?.current_tier === 'Beginner' ? 'easy' : 
                  userStats?.current_tier === 'Intermediate' ? 'medium' : 'hard',
      duration: 180, // 3 minutes
      target: `Maintain consistent pace`
    });
    
    // 6. Cool-down exercise (always included)
    planComponents.push({
      id: 'cooldown',
      name: 'Cool Down',
      description: 'Wrap up with relaxed typing',
      category: 'random_words',
      difficulty: 'easy',
      duration: 60, // 1 minute
      target: 'Relaxed typing, maintain form'
    });
    
    // Create the daily plan object
    const dailyPlan = {
      user_id: userId,
      plan_date: new Date().toISOString().split('T')[0],
      components: planComponents,
      total_duration: planComponents.reduce((sum, comp) => sum + comp.duration, 0),
      created_at: new Date(),
      completed_components: [],
      completed_at: null
    };
    
    // Save the plan to the database
    const { data, error } = await supabaseAdmin
      .from('daily_plans')
      .insert(dailyPlan)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return {
      success: true,
      plan: data
    };
  } catch (error) {
    console.error('Error generating daily plan:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate custom text focused on a specific weak key
 */
function generateWeaknessDrillText(weakKey, wordCount) {
  // Enhanced word dictionary with words containing the weak key
  const keyWordMap = {
    'q': ['queen', 'quick', 'quit', 'quote', 'quack', 'quest', 'quid', 'quiz', 'quay', 'quip', 'quartz', 'squeak', 'squeal', 'squeeze', 'acquire', 'require', 'equip', 'request', 'conquer', 'frequency'],
    'w': ['water', 'with', 'work', 'want', 'will', 'what', 'when', 'well', 'went', 'week', 'were', 'weather', 'welcome', 'world', 'would', 'write', 'where', 'answer', 'power', 'lower', 'worker', 'winner'],
    'e': ['enter', 'every', 'even', 'else', 'were', 'here', 'well', 'week', 'been', 'seen', 'between', 'eleven', 'welcome', 'exercise', 'experience', 'effective', 'receive', 'believe', 'achieve', 'believe', 'complete', 'secret'],
    'r': ['right', 'read', 'real', 'room', 'run', 'are', 'red', 'very', 'were', 'work', 'return', 'research', 'prepare', 'remember', 'arrange', 'foreign', 'mirror', 'morning', 'error', 'color'],
    't': ['time', 'take', 'that', 'this', 'think', 'the', 'to', 'it', 'at', 'text', 'start', 'street', 'attempt', 'interest', 'protect', 'satisfy', 'student', 'continue', 'determine', 'pattern'],
    'y': ['you', 'year', 'yes', 'your', 'why', 'my', 'by', 'say', 'day', 'way', 'young', 'yellow', 'anything', 'suddenly', 'everybody', 'happy', 'party', 'carry', 'sorry', 'ready'],
    'u': ['use', 'under', 'up', 'you', 'run', 'cut', 'but', 'fun', 'sun', 'hut', 'music', 'student', 'university', 'study', 'cultural', 'annual', 'courage', 'trouble', 'popular', 'unusual'],
    'i': ['into', 'will', 'with', 'time', 'like', 'i', 'is', 'in', 'it', 'if', 'information', 'initiative', 'individual', 'initial', 'significant', 'efficient', 'finish', 'visit', 'spirit', 'limit'],
    'o': ['one', 'only', 'over', 'open', 'out', 'to', 'do', 'go', 'so', 'no', 'color', 'doctor', 'monitor', 'common', 'follow', 'control', 'color', 'doctor', 'monitor', 'common', 'follow', 'control'],
    'p': ['people', 'part', 'part', 'play', 'put', 'top', 'help', 'type', 'hope', 'copy', 'property', 'process', 'approach', 'operation', 'experience', 'capital', 'supply', 'happy', 'expense', 'support']
  };
  
  // Get words for the weak key or use a default set
  const wordsForKey = keyWordMap[weakKey] || [weakKey.repeat(4), weakKey.repeat(3) + 'a', weakKey + 'a' + weakKey + 'a', weakKey + 'e', weakKey + 'o'];
  
  // Generate a text focusing on the weak key
  const result = [];
  for (let i = 0; i < wordCount; i++) {
    // More frequent use of weak key words (60%) mixed with common words (40%)
    const isWeakKeyWord = Math.random() < 0.6;
    if (isWeakKeyWord && wordsForKey.length > 0) {
      result.push(wordsForKey[Math.floor(Math.random() * wordsForKey.length)]);
    } else {
      // Use common words to provide context
      const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'run', 'too', 'any', 'big', 'eat', 'had', 'hot', 'new', 'old', 'red'];
      result.push(commonWords[Math.floor(Math.random() * commonWords.length)]);
    }
  }
  
  return result.join(' ');
}

/**
 * Get today's daily plan for a user
 */
export async function getTodaysPlan(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabaseAdmin
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        // Generate a new plan for today
        return await generateDailyPlan(userId);
      }
      throw error;
    }
    
    return {
      success: true,
      plan: data
    };
  } catch (error) {
    console.error('Error getting daily plan:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mark a component of the daily plan as completed
 */
export async function markPlanComponentCompleted(userId, componentId, sessionData) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get the current plan
    const { data: plan, error } = await supabaseAdmin
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .single();
    
    if (error) {
      throw error;
    }
    
    // Check if component is already completed
    if (plan.completed_components.includes(componentId)) {
      return {
        success: true,
        message: 'Component already marked as completed'
      };
    }
    
    // Add the component to completed list and potentially award XP
    const updatedCompletedComponents = [...plan.completed_components, componentId];
    const completedAll = updatedCompletedComponents.length === plan.components.length;
    
    // Update the plan
    const { error: updateError } = await supabaseAdmin
      .from('daily_plans')
      .update({
        completed_components: updatedCompletedComponents,
        completed_at: completedAll ? new Date() : plan.completed_at
      })
      .eq('id', plan.id);
    
    if (updateError) {
      throw updateError;
    }
    
    // Award bonus XP if all components are completed
    if (completedAll) {
      // This would call the XP system to award bonus for completing the full plan
      await awardFullPlanBonus(userId);
    }
    
    return {
      success: true,
      completedAll,
      completedComponentsCount: updatedCompletedComponents.length,
      totalComponents: plan.components.length
    };
  } catch (error) {
    console.error('Error marking plan component as completed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Award bonus XP for completing the full daily plan
 */
async function awardFullPlanBonus(userId) {
  try {
    // Import the XP service to award the bonus
    const { awardXp } = await import('./gamificationService');
    await awardXp(userId, 50); // 50 XP bonus for completing the full daily plan
  } catch (error) {
    console.error('Error awarding full plan bonus:', error);
  }
}

/**
 * Get a user's plan completion statistics
 */
export async function getPlanStats(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('daily_plans')
      .select('completed_at, plan_date')
      .eq('user_id', userId)
      .is('completed_at', 'not', null)
      .gte('plan_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days
      .order('plan_date', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Calculate streak and completion stats
    const totalPlansCompleted = data?.length || 0;
    
    // Calculate current streak (consecutive days with completed plans)
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Sort dates in descending order
    const sortedDates = (data || []).map(plan => new Date(plan.plan_date)).sort((a, b) => b - a);
    
    let currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday
    
    for (const planDate of sortedDates) {
      planDate.setHours(0, 0, 0, 0); // Normalize to start of day
      
      if (planDate.getTime() === currentDate.getTime()) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1); // Move to previous day
      } else if (planDate.getTime() < currentDate.getTime()) {
        // Gap in streak - stop counting
        break;
      }
      // If planDate > currentDate, it's a future date (shouldn't happen) - skip
    }
    
    return {
      success: true,
      stats: {
        totalPlansCompleted,
        currentStreak,
        completionRate: data ? (data.length / 30) * 100 : 0, // Last 30 days
        plansCompletedRecently: data?.length || 0
      }
    };
  } catch (error) {
    console.error('Error getting plan stats:', error);
    return {
      success: false,
      error: error.message,
      stats: null
    };
  }
}