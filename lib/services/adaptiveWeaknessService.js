// lib/services/adaptiveWeaknessService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Generate adaptive text focused on user's weak keys and bigrams
 */
export async function generateWeaknessAdaptiveText(userId, wordCount = 50) {
  try {
    // Get user's weakness profile
    const { data: weaknessProfile, error } = await supabaseAdmin
      .from('weakness_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No weakness profile found, return generic text
        return generateGenericText(wordCount);
      } else {
        throw error;
      }
    }
    
    // Generate text based on weaknesses
    const text = [];
    
    // Add words with weak keys
    if (weaknessProfile.weak_keys && Array.isArray(weaknessProfile.weak_keys)) {
      const weakKeys = weaknessProfile.weak_keys.slice(0, 5); // Top 5 weak keys
      
      for (const weakKey of weakKeys) {
        const samples = generateWordsForWeakKey(weakKey.key);
        text.push(...samples);
      }
    }
    
    // Add sequences with weak bigrams
    if (weaknessProfile.weak_bigrams && Array.isArray(weaknessProfile.weak_bigrams)) {
      const weakBigrams = weaknessProfile.weak_bigrams.slice(0, 3); // Top 3 weak bigrams
      
      for (const weakBigram of weakBigrams) {
        const samples = generateWordsForBigram(weakBigram.bigram);
        text.push(...samples);
      }
    }
    
    // Add some neutral words to balance the drill
    const neutralWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'run', 'too', 'any', 'big', 'eat', 'had', 'hot', 'new', 'old', 'red'];
    text.push(...neutralWords.slice(0, 20)); // Add 20 neutral words
    
    // Shuffle the array to randomize the drill
    const randomizedText = shuffleArray([...text]).slice(0, wordCount);
    
    // If we don't have enough words, pad with generic words
    if (randomizedText.length < wordCount) {
      const padWords = generateGenericText(wordCount - randomizedText.length);
      randomizedText.push(...padWords);
    }
    
    return randomizedText.slice(0, wordCount);
  } catch (error) {
    console.error('Error generating adaptive weakness text:', error);
    // Return a generic text if there's an error
    return generateGenericText(wordCount);
  }
}

/**
 * Generates words that emphasize a particular key
 */
function generateWordsForWeakKey(key) {
  // Dictionary of words that contain the key
  const keyWordMap = {
    'q': ['queen', 'quick', 'quit', 'quote', 'quack', 'quest', 'quid', 'quiz', 'quay', 'quip', 'quartz', 'squeeze', 'acquire', 'require', 'equip', 'equilibrium'],
    'w': ['water', 'with', 'work', 'want', 'will', 'what', 'when', 'well', 'went', 'week', 'weather', 'wonder', 'world', 'would', 'write', 'where'],
    'e': ['enter', 'every', 'even', 'else', 'were', 'here', 'well', 'week', 'been', 'seen', 'between', 'eleven', 'welcome', 'exercise', 'experience', 'effective'],
    'r': ['right', 'read', 'real', 'room', 'run', 'are', 'red', 'very', 'were', 'work', 'return', 'research', 'prepare', 'remember', 'arrange', 'foreign'],
    't': ['time', 'take', 'that', 'this', 'think', 'the', 'to', 'it', 'at', 'text', 'start', 'street', 'attempt', 'interest', 'protect', 'satisfy'],
    'y': ['you', 'year', 'yes', 'your', 'why', 'my', 'by', 'say', 'day', 'way', 'young', 'yellow', 'anything', 'suddenly', 'everybody', 'happy'],
    'u': ['use', 'under', 'up', 'you', 'run', 'cut', 'but', 'fun', 'sun', 'hut', 'music', 'student', 'university', 'study', 'cultural', 'annual'],
    'i': ['into', 'will', 'with', 'time', 'like', 'i', 'is', 'in', 'it', 'if', 'information', 'initiative', 'individual', 'initial', 'significant', 'efficient'],
    'o': ['one', 'only', 'over', 'open', 'out', 'to', 'do', 'go', 'so', 'no', 'color', 'doctor', 'monitor', 'common', 'follow', 'control'],
    'p': ['people', 'part', 'part', 'play', 'put', 'top', 'help', 'type', 'hope', 'copy', 'property', 'process', 'approach', 'operation', 'experience', 'capital'],
    'a': ['and', 'that', 'have', 'with', 'can', 'all', 'have', 'last', 'each', 'make', 'always', 'application', 'advanced', 'automatic', 'calculate', 'database'],
    's': ['some', 'this', 'also', 'us', 'as', 'so', 'is', 'has', 'was', 'yes', 'series', 'system', 'session', 'session', 'assistant', 'establish'],
    'd': ['data', 'date', 'day', 'add', 'had', 'and', 'old', 'did', 'red', 'need', 'describe', 'develop', 'address', 'decide', 'discover', 'download'],
    'f': ['from', 'first', 'find', 'for', 'form', 'off', 'if', 'of', 'after', 'free', 'family', 'professional', 'perform', 'function', 'flexible', 'effective'],
    'g': ['get', 'go', 'great', 'give', 'group', 'game', 'big', 'dog', 'egg', 'long', 'language', 'graduate', 'graduate', 'strategy', 'organize', 'dialogue'],
    'h': ['have', 'with', 'this', 'that', 'when', 'where', 'think', 'right', 'high', 'help', 'health', 'history', 'through', 'although', 'highlight', 'enhance'],
    'j': ['job', 'join', 'just', 'jump', 'journey', 'joke', 'judge', 'January', 'major', 'adjacent'],
    'k': ['know', 'key', 'kind', 'make', 'look', 'work', 'take', 'back', 'book', 'like', 'knowledge', 'package', 'attack', 'keyboard', 'remarkable', 'block'],
    'l': ['like', 'will', 'all', 'well', 'also', 'call', 'help', 'tell', 'feel', 'small', 'local', 'legal', 'actually', 'particularly', 'especially', 'ultimately'],
    'z': ['zero', 'zone', 'size', 'amazing', 'quiz', 'lazy', 'blaze', 'frozen', 'maze', 'prize', 'analyze', 'synthesize', 'emphasize', 'optimize', 'utilize', 'visualize'],
    'x': ['text', 'tax', 'box', 'six', 'fix', 'example', 'exact', 'taxi', 'sixth', 'index', 'complex', 'exterior', 'auxiliary', 'excellent', 'exchange', 'expansion'],
    'c': ['can', 'could', 'come', 'case', 'city', 'class', 'care', 'call', 'place', 'once', 'calculate', 'capacity', 'character', 'certificate', 'constitute', 'criterion'],
    'v': ['very', 'value', 'view', 'voice', 'give', 'have', 'leave', 'five', 'seven', 'live', 'achieve', 'achieve', 'achieve', 'achieve', 'achieve', 'achieve'],
    'b': ['be', 'but', 'by', 'about', 'before', 'both', 'because', 'big', 'best', 'better', 'balance', 'budget', 'combine', 'obvious', 'substantial', 'ambiguous'],
    'n': ['not', 'can', 'know', 'new', 'then', 'man', 'one', 'ten', 'can', 'own', 'environment', 'international', 'understanding', 'connection', 'conclusion', 'introduction'],
    'm': ['more', 'my', 'me', 'make', 'man', 'some', 'time', 'come', 'home', 'name', 'moment', 'member', 'memory', 'implement', 'community', 'communication']
  };
  
  // Get words for the key, default to key repeated if not found
  const words = keyWordMap[key] || [key.repeat(4), key.repeat(3) + 'a', key + 'a' + key + 'a', key + 'e', key + 'o'];
  
  return words.slice(0, 5); // Return up to 5 words for each weak key
}

/**
 * Generates words that contain a specific bigram
 */
function generateWordsForBigram(bigram) {
  // Dictionary of words that contain the bigram
  const bigramWordMap = {
    'th': ['the', 'this', 'that', 'with', 'they', 'think', 'thank', 'thing', 'thumb', 'thick', 'another', 'together', 'through', 'although', 'throughout', 'something'],
    'he': ['the', 'he', 'her', 'here', 'help', 'head', 'have', 'help', 'held', 'well', 'whether', 'health', 'heavy', 'hello', 'hence', 'whenever'],
    'in': ['in', 'into', 'find', 'kind', 'mind', 'time', 'with', 'this', 'begin', 'think', 'between', 'within', 'include', 'since', 'origin', 'mention'],
    'er': ['her', 'were', 'other', 'water', 'river', 'never', 'letter', 'paper', 'tiger', 'flower', 'register', 'transfer', 'officer', 'officer', 'officer', 'officer'],
    'an': ['and', 'can', 'man', 'hand', 'land', 'plan', 'bank', 'sand', 'tank', 'span', 'animal', 'annual', 'ancient', 'balance', 'standard', 'cancer'],
    're': ['are', 'red', 'river', 'read', 'real', 'right', 'write', 'ready', 'refer', 'reply', 'research', 'return', 'require', 'result', 'reduce', 'release'],
    'nd': ['and', 'hand', 'land', 'send', 'find', 'wind', 'mind', 'kind', 'around', 'send', 'command', 'demand', 'understand', 'expand', 'respond', 'recommend'],
    'at': ['at', 'that', 'what', 'cat', 'hat', 'bat', 'rat', 'that', 'data', 'later', 'advantage', 'character', 'calculate', 'evaluate', 'gratify', 'activate'],
    'on': ['on', 'one', 'not', 'don', 'ton', 'song', 'long', 'onto', 'upon', 'online', 'continue', 'condition', 'operation', 'organization', 'information', 'foundation'],
    'nt': ['not', 'into', 'tent', 'want', 'sent', 'ent', 'point', 'center', 'dental', 'content', 'important', 'attention', 'intention', 'maintenance', 'extent', 'department']
  };
  
  const words = bigramWordMap[bigram] || [bigram + 'er', bigram + 'ing', bigram + 'ed', bigram + 'able', bigram + 'y', bigram + 'tion'];
  
  return words.slice(0, 5); // Return up to 5 words for each weak bigram
}

/**
 * Generates a generic text if no weakness profile is available
 */
function generateGenericText(wordCount) {
  // A balanced set of common English words
  const commonWords = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
    'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
    'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
    'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
    'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
    'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
    'computer', 'keyboard', 'website', 'internet', 'application', 'software',
    'technology', 'programming', 'development', 'system', 'database', 'network',
    'security', 'function', 'variable', 'algorithm', 'data', 'structure',
    'science', 'research', 'analysis', 'design', 'project', 'management',
    'business', 'company', 'service', 'product', 'customer', 'experience',
    'process', 'information', 'communication', 'education', 'knowledge',
    'learning', 'practice', 'improvement', 'performance', 'efficiency',
    'accuracy', 'speed', 'typing', 'master', 'skill', 'ability', 'expert'
  ];
  
  const result = [];
  while (result.length < wordCount) {
    result.push(...shuffleArray([...commonWords]));
  }
  return result.slice(0, wordCount);
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Get user's weakness-adaptive text for the typing test
 */
export async function getAdaptiveWeaknessText(userId, wordCount = 50) {
  try {
    return await generateWeaknessAdaptiveText(userId, wordCount);
  } catch (error) {
    console.error('Error getting adaptive weakness text:', error);
    return generateGenericText(wordCount);
  }
}