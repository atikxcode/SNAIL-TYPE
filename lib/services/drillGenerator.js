// lib/services/drillGenerator.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Generates a custom typing drill based on user's weakness profile
 * @param {string} userId - User's Firebase UID
 * @returns {Array} Array of words tailored to user's weaknesses
 */
export async function generateWeaknessDrill(userId) {
  try {
    // Fetch user's weakness profile
    const { data: weaknessProfile, error } = await supabase
      .from('weakness_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No weakness profile found, return a generic drill
        return generateGenericDrill();
      } else {
        throw error;
      }
    }
    
    // Generate drill based on weaknesses
    const drillWords = [];
    
    // Add words containing weak keys
    if (weaknessProfile.weak_keys && Array.isArray(weaknessProfile.weak_keys)) {
      const weakKeys = weaknessProfile.weak_keys.slice(0, 5); // Top 5 weak keys
      
      for (const weakKey of weakKeys) {
        const key = weakKey.key;
        const samples = generateWordsForKey(key);
        drillWords.push(...samples);
      }
    }
    
    // Add sequences with weak bigrams
    if (weaknessProfile.weak_bigrams && Array.isArray(weaknessProfile.weak_bigrams)) {
      const weakBigrams = weaknessProfile.weak_bigrams.slice(0, 3); // Top 3 weak bigrams
      
      for (const weakBigram of weakBigrams) {
        const bigram = weakBigram.bigram;
        const samples = generateWordsForBigram(bigram);
        drillWords.push(...samples);
      }
    }
    
    // Add some neutral words to balance the drill
    const neutralWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'run', 'too', 'any', 'big', 'eat', 'had', 'hot', 'new', 'old', 'red'];
    drillWords.push(...neutralWords.slice(0, 20)); // Add 20 neutral words
    
    // Shuffle the array to randomize the drill
    return shuffleArray(drillWords).slice(0, 50); // Return 50 words
  } catch (error) {
    console.error('Error generating weakness drill:', error);
    // Return a generic drill if there's an error
    return generateGenericDrill();
  }
}

/**
 * Generates words that emphasize a particular key
 */
function generateWordsForKey(key) {
  // Basic dictionary of words that contain the key
  const keyWordMap = {
    'q': ['queen', 'quick', 'quit', 'quote', 'quack', 'quest', 'quid', 'quiz', 'quay', 'quip'],
    'w': ['water', 'with', 'work', 'want', 'will', 'what', 'when', 'well', 'went', 'week'],
    'e': ['enter', 'every', 'even', 'else', 'were', 'here', 'well', 'week', 'been', 'seen'],
    'r': ['right', 'read', 'real', 'room', 'run', 'are', 'red', 'very', 'were', 'work'],
    't': ['time', 'take', 'that', 'this', 'think', 'the', 'to', 'it', 'at', 'text'],
    'y': ['you', 'year', 'yes', 'your', 'why', 'my', 'by', 'say', 'day', 'way'],
    'u': ['use', 'under', 'up', 'you', 'run', 'cut', 'but', 'fun', 'sun', 'hut'],
    'i': ['into', 'will', 'with', 'time', 'like', 'i', 'is', 'in', 'it', 'if'],
    'o': ['one', 'only', 'over', 'open', 'out', 'to', 'do', 'go', 'so', 'no'],
    'p': ['people', 'part', 'part', 'play', 'put', 'top', 'help', 'type', 'hope', 'copy'],
    'a': ['and', 'that', 'have', 'with', 'can', 'all', 'have', 'last', 'each', 'make'],
    's': ['some', 'this', 'also', 'us', 'as', 'so', 'is', 'has', 'was', 'yes'],
    'd': ['data', 'date', 'day', 'add', 'had', 'and', 'old', 'did', 'red', 'need'],
    'f': ['from', 'first', 'find', 'for', 'form', 'off', 'if', 'of', 'after', 'free'],
    'g': ['get', 'go', 'great', 'give', 'group', 'game', 'big', 'dog', 'egg', 'long'],
    'h': ['have', 'with', 'this', 'that', 'when', 'where', 'think', 'right', 'high', 'help'],
    'j': ['job', 'join', 'just', 'jump', 'journey', 'joke', 'judge', 'January', 'major', 'hajj'],
    'k': ['know', 'key', 'kind', 'make', 'look', 'work', 'take', 'back', 'book', 'like'],
    'l': ['like', 'will', 'all', 'well', 'also', 'call', 'help', 'tell', 'feel', 'small'],
    'z': ['zero', 'zone', 'size', 'amazing', 'quiz', 'lazy', 'blaze', 'frozen', 'maze', 'prize'],
    'x': ['text', 'tax', 'box', 'six', 'fix', 'example', 'exact', 'taxi', 'sixth', 'index'],
    'c': ['can', 'could', 'come', 'case', 'city', 'class', 'care', 'call', 'place', 'once'],
    'v': ['very', 'value', 'view', 'voice', 'give', 'have', 'leave', 'five', 'seven', 'live'],
    'b': ['be', 'but', 'by', 'about', 'before', 'both', 'because', 'big', 'best', 'better'],
    'n': ['not', 'can', 'know', 'new', 'then', 'man', 'one', 'ten', 'can', 'own'],
    'm': ['more', 'my', 'me', 'make', 'man', 'some', 'time', 'come', 'home', 'name']
  };
  
  // Get words for the key, default to key repeated if not found
  const words = keyWordMap[key] || [key.repeat(4), key.repeat(3) + 'a', key + 'a' + key + 'a'];
  
  return words.slice(0, 5); // Return up to 5 words for each weak key
}

/**
 * Generates words that contain a specific bigram
 */
function generateWordsForBigram(bigram) {
  // Dictionary of words that contain the bigram
  const bigramWordMap = {
    'th': ['the', 'this', 'that', 'with', 'they', 'think', 'thank', 'thing', 'thumb', 'thick'],
    'he': ['the', 'he', 'her', 'here', 'help', 'head', 'have', 'help', 'held', 'well'],
    'in': ['in', 'into', 'find', 'kind', 'mind', 'time', 'with', 'this', 'begin', 'think'],
    'er': ['her', 'were', 'other', 'water', 'river', 'never', 'letter', 'paper', 'tiger', 'flower'],
    'an': ['and', 'can', 'man', 'hand', 'land', 'plan', 'bank', 'sand', 'tank', 'span'],
    're': ['are', 'red', 'river', 'read', 'real', 'right', 'write', 'ready', 'refer', 'reply'],
    'nd': ['and', 'hand', 'land', 'send', 'find', 'wind', 'mind', 'kind', 'around', 'send'],
    'at': ['at', 'that', 'what', 'cat', 'hat', 'bat', 'rat', 'that', 'data', 'later'],
    'on': ['on', 'one', 'not', 'don', 'ton', 'song', 'long', 'onto', 'upon', 'online'],
    'nt': ['not', 'into', 'tent', 'want', 'sent', 'ent', 'point', 'center', 'dental', 'content']
  };
  
  const words = bigramWordMap[bigram] || [bigram + 'er', bigram + 'ing', bigram + 'ed', bigram + 'able', bigram + 'y'];
  
  return words.slice(0, 5); // Return up to 5 words for each weak bigram
}

/**
 * Generates a generic drill if no weakness profile is available
 */
function generateGenericDrill() {
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
  
  return shuffleArray(commonWords).slice(0, 50);
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