// lib/services/textContentService.js
import clientPromise from '../db/mongoClient';
import { DB_NAME } from '../db/mongoClient';
import { ObjectId } from 'mongodb';
import { generateTextByDifficulty } from './wordGenerator';

/**
 * Get random text content based on category, difficulty, and language
 */
export async function getTextContent(category, difficulty = 'medium', language = 'english', count = 50) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // If the category is 'random_words', use the difficulty-based generation
    if (category === 'random_words') {
      return generateTextByDifficulty(count, difficulty, language);
    }

    // Query the text_pools collection
    const query = {
      category: category,
      difficulty: difficulty,
      language: language
    };

    const result = await db.collection('text_pools').findOne(query);

    if (!result || !result.content || result.content.length === 0) {
      // If specific category/difficulty doesn't exist, try to get content from any difficulty within the category
      const fallbackQuery = {
        category: category,
        language: language
      };

      const fallbackResults = await db.collection('text_pools').find(fallbackQuery).toArray();

      if (fallbackResults.length > 0) {
        // Select a random text pool from the fallback results
        const randomPool = fallbackResults[Math.floor(Math.random() * fallbackResults.length)];
        if (randomPool.content && randomPool.content.length > 0) {
          // Select a random text from the pool
          const randomText = randomPool.content[Math.floor(Math.random() * randomPool.content.length)];
          return formatTextForTyping(randomText, count);
        }
      }

      // If no content found, return generic fallback text
      return getDefaultTextForCategory(category, count);
    }

    // Select a random text from the content array
    const randomText = result.content[Math.floor(Math.random() * result.content.length)];

    return formatTextForTyping(randomText, count);
  } catch (error) {
    console.error('Error getting text content:', error);
    // Return fallback content if there's an error
    return getDefaultTextForCategory(category, count);
  }
}

/**
 * Format text content to match word count requirements
 */
function formatTextForTyping(text, wordCount) {
  // Split text into words
  const words = text.split(/\s+/);

  if (words.length >= wordCount) {
    // If we have enough words, take the requested count
    return words.slice(0, wordCount);
  } else {
    // If we don't have enough words, repeat the text until we reach the required count
    const result = [];
    while (result.length < wordCount) {
      result.push(...words);
    }
    return result.slice(0, wordCount);
  }
}

/**
 * Get default text for a category when specific content isn't available
 */
function getDefaultTextForCategory(category, count) {
  // Default word lists for each category
  const defaultTexts = {
    random_words: [
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
      'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
      'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
      'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
      'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
      'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
      'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
    ],
    code: [
      'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'do',
      'import', 'export', 'from', 'default', 'class', 'this', 'new', 'constructor', 'extends', 'super',
      'async', 'await', 'try', 'catch', 'finally', 'throw', 'null', 'undefined', 'true', 'false',
      'console.log', 'document', 'window', 'element', 'array', 'object', 'string', 'number', 'boolean', 'symbol',
      'react', 'component', 'props', 'state', 'useEffect', 'useState', 'useContext', 'useReducer', 'useCallback', 'useMemo',
      'map', 'filter', 'reduce', 'forEach', 'push', 'pop', 'shift', 'unshift', 'slice', 'splice',
      'json', 'api', 'fetch', 'promise', 'resolve', 'reject', 'then', 'catch', 'finally', 'async',
      'html', 'css', 'dom', 'event', 'click', 'change', 'input', 'submit', 'preventDefault', 'stopPropagation',
      'database', 'query', 'select', 'insert', 'update', 'delete', 'where', 'join', 'table', 'column',
      'authentication', 'authorization', 'jwt', 'token', 'session', 'cookie', 'http', 'https', 'get', 'post'
    ],
    quotes: [
      'the', 'of', 'and', 'a', 'to', 'in', 'is', 'you', 'that', 'it',
      'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i',
      'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word',
      'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said',
      'there', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up',
      'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her',
      'would', 'make', 'like', 'into', 'time', 'has', 'look', 'two', 'more', 'write',
      'go', 'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than', 'first',
      'water', 'been', 'call', 'who', 'oil', 'sit', 'now', 'find', 'down', 'day',
      'did', 'get', 'come', 'made', 'may', 'part', 'over', 'new', 'sound', 'take'
    ],
    email: [
      'dear', 'hello', 'regards', 'sincerely', 'please', 'find', 'attached', 'following', 'meeting', 'schedule',
      'project', 'proposal', 'update', 'status', 'report', 'review', 'feedback', 'approval', 'required', 'urgent',
      'important', 'notice', 'reminder', 'action', 'required', 'customer', 'service', 'support', 'contact', 'information',
      'company', 'team', 'colleagues', 'manager', 'supervisor', 'department', 'office', 'location', 'address', 'phone',
      'email', 'message', 'subject', 'body', 'signature', 'closing', 'best', 'wish', 'hope', 'help',
      'assistance', 'guidance', 'advice', 'recommendation', 'suggestion', 'solution', 'problem', 'issue', 'concern', 'matter',
      'business', 'professional', 'work', 'career', 'opportunity', 'position', 'role', 'responsibility', 'task', 'assignment',
      'deadline', 'timeline', 'schedule', 'appointment', 'calendar', 'event', 'conference', 'call', 'discussion', 'meeting',
      'information', 'details', 'specific', 'particular', 'special', 'custom', 'personal', 'individual', 'unique', 'specific',
      'attached', 'document', 'file', 'folder', 'link', 'url', 'web', 'site', 'page', 'content'
    ]
  };

  const defaultWords = defaultTexts[category] || defaultTexts.random_words;

  // Repeat words if needed to reach desired count
  const result = [];
  while (result.length < count) {
    result.push(...defaultWords);
  }
  return result.slice(0, count);
}

/**
 * Get all available categories
 */
export async function getAvailableCategories() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const categories = await db.collection('text_pools')
      .distinct('category');

    return {
      success: true,
      categories: [...categories, 'random_words'] // Add the random_words category which uses wordGenerator
    };
  } catch (error) {
    console.error('Error getting categories:', error);
    return {
      success: false,
      error: error.message,
      categories: ['random_words', 'code', 'quotes', 'email'] // fallback
    };
  }
}

/**
 * Get difficulties available for a specific category
 */
export async function getDifficultiesForCategory(category) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // For random_words category, return all possible difficulties
    if (category === 'random_words') {
      return {
        success: true,
        category,
        difficulties: ['easy', 'medium', 'hard', 'nightmare']
      };
    }

    const difficulties = await db.collection('text_pools')
      .distinct('difficulty', { category: category });

    return {
      success: true,
      category,
      difficulties
    };
  } catch (error) {
    console.error('Error getting difficulties for category:', error);
    return {
      success: false,
      error: error.message,
      category,
      difficulties: ['easy', 'medium', 'hard'] // fallback
    };
  }
}

/**
 * Add custom text to a user's collection (for custom text feature)
 */
export async function addCustomText(userId, text, category = 'custom') {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const customTextDoc = {
      userId: userId,
      category: category,
      text: text,
      createdAt: new Date(),
      tags: [] // Could add tags functionality later
    };

    const result = await db.collection('user_custom_texts').insertOne(customTextDoc);

    return {
      success: true,
      textId: result.insertedId.toString()
    };
  } catch (error) {
    console.error('Error adding custom text:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get custom texts for a user
 */
export async function getUserCustomTexts(userId) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const customTexts = await db.collection('user_custom_texts')
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    return {
      success: true,
      customTexts
    };
  } catch (error) {
    console.error('Error getting user custom texts:', error);
    return {
      success: false,
      error: error.message,
      customTexts: []
    };
  }
}