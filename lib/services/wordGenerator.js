// lib/services/wordGenerator.js

// Basic English word dictionary (Easy difficulty)
const basicWords = [
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
];

// Medium difficulty words
const mediumWords = [
  ...basicWords,
  'computer', 'keyboard', 'website', 'internet', 'application', 'software',
  'technology', 'programming', 'development', 'system', 'database', 'network',
  'security', 'function', 'variable', 'algorithm', 'data', 'structure',
  'science', 'research', 'analysis', 'design', 'project', 'management',
  'business', 'company', 'service', 'product', 'customer', 'experience',
  'process', 'information', 'education', 'knowledge',
  'learning', 'practice', 'improvement', 'performance', 'efficiency',
  'accuracy', 'speed', 'typing', 'master', 'skill', 'ability', 'expert'
];

// Advanced difficulty words
const advancedWords = [
  ...mediumWords,
  'sophisticated', 'comprehensive', 'methodology', 'implementation',
  'optimization', 'architecture', 'infrastructure', 'integration',
  'configuration', 'compatibility', 'functionality', 'performance',
  'reliability', 'scalability', 'maintainability', 'usability',
  'accessibility', 'efficiency', 'effectiveness', 'productivity',
  'innovation', 'collaboration', 'coordination', 'communication',
  'documentation', 'specification', 'requirement', 'validation',
  'verification', 'authentication', 'authorization', 'encryption',
  'decryption', 'transmission', 'reception', 'processing', 'analysis'
];

// Nightmare difficulty (more complex technical terms)
const nightmareWords = [
  ...advancedWords,
  'differentiation', 'interdisciplinary', 'electroencephalograph', 'immunoelectrophoresis',
  'counterrevolutionary', 'psychophysicist', 'hypercoagulability', 'interdenominationalism',
  'compartmentalization', 'electroluminescent', 'phosphorescence', 'magnetohydrodynamic',
  'counterintelligence', 'hypersensitivity', 'tetraiodophenolphthalein', 'dimethylpolysiloxane',
  'immunoelectrophoretically', 'deinstitutionalization', 'counterrevolutionaries', 'tetraiodophenolphthalein',
  'electrocardiographically', 'immunoelectrophoresis', 'counterrevolutionary', 'interdisciplinarity',
  'deinstitutionalization', 'counterrevolutionaries', 'electroencephalographs', 'immunoelectrophoretically',
  'electromyographically', 'counterinstitutionally', 'decompartmentalization', 'electromechanotherapy',
  'immunocytochemistry', 'phosphoglyceraldehyde', 'deinstitutionalizing', 'electroencephalography',
  'counterrevolutionized', 'interdisciplinary', 'psychoneuroendocrinology', 'chemoautotrophic'
];

export const generateWords = (count, difficulty = 'medium') => {
  let wordList;

  switch (difficulty) {
    case 'easy':
      wordList = basicWords;
      break;
    case 'hard':
      wordList = advancedWords;
      break;
    case 'nightmare':
      wordList = nightmareWords;
      break;
    case 'medium':
    default:
      wordList = mediumWords;
      break;
  }

  const words = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    words.push(wordList[randomIndex]);
  }

  return words;
};

/**
 * Generates text with specific difficulty characteristics:
 * Easy: Common words, no punctuation, no capitals
 * Medium: Mixed word difficulty, punctuation included, capitals on sentence starts
 * Hard: Rare/long words, numbers included, mixed case
 * Nightmare: Full code snippets, brackets, semicolons, indentation
 */
export const generateTextByDifficulty = (count, difficulty = 'medium', language = 'english') => {
  switch (difficulty) {
    case 'easy':
      // Return only basic words with no punctuation
      return generateBasicText(count);
    case 'medium':
      // Add some punctuation and mixed cases
      return generateMediumText(count);
    case 'hard':
      // Include numbers, special characters, complex words
      return generateHardText(count);
    case 'nightmare':
      // For nightmare difficulty, return code snippets instead of words
      return generateCodeText(count);
    default:
      return generateWords(count, difficulty);
  }
};

/**
 * Generate basic text with no punctuation, lowercase
 */
function generateBasicText(count) {
  const words = generateWords(count, 'easy');
  return words.map(word => word.toLowerCase());
}

/**
 * Generate medium text with punctuation, capitals, etc.
 */
function generateMediumText(count) {
  const words = generateWords(count, 'medium');
  const result = [];

  for (let i = 0; i < words.length; i++) {
    let word = words[i];

    // Add punctuation randomly
    if (i > 0 && Math.random() > 0.8) {
      const punctuation = Math.random() > 0.5 ? '.' : ',';
      result[result.length - 1] += punctuation;
    }

    // Capitalize first word of sentence
    if (i === 0 || result[result.length - 1]?.endsWith('.')) {
      word = capitalizeFirstLetter(word);
    }

    result.push(word);
  }

  return result;
}

/**
 * Generate hard text with numbers, special characters, mixed case
 */
function generateHardText(count) {
  const words = generateWords(count, 'hard');
  const result = [];

  for (let i = 0; i < words.length; i++) {
    let word = words[i];

    // Randomly add numbers
    if (Math.random() > 0.7) {
      word += Math.floor(Math.random() * 10);
    }

    // Randomly add special characters
    if (Math.random() > 0.6) {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*'];
      word += specialChars[Math.floor(Math.random() * specialChars.length)];
    }

    // Randomly make uppercase
    if (Math.random() > 0.8) {
      word = word.toUpperCase();
    }

    result.push(word);
  }

  return result;
}

/**
 * Generate code-like text for nightmare difficulty
 */
function generateCodeText(count) {
  const codeSnippets = [
    'const user = { name: \'John\', age: 30, active: true };',
    'function calculateWPM(words, time) { return (words / time) * 60; }',
    'const [state, setState] = useState(null); useEffect(() => { /* effect */ }, [dep]);',
    'if (condition) { doSomething(); } else { doSomethingElse(); }',
    'class Component extends React.Component { render() { return <div>Hello</div>; } }',
    'const filtered = items.filter(item => item.active).map(item => ({ ...item }));',
    'for (let i = 0; i < array.length; i++) { console.log(array[i]); }',
    'try { riskyOperation(); } catch (error) { console.error(error); }',
    'const promise = fetch(\'/api/data\').then(res => res.json()).catch(err => console.error(err));',
    'import React, { useState, useEffect } from \'react\'; function App() { return <div />; }',
    'const arr = [1, 2, 3]; arr.push(4); const [first, ...rest] = arr;',
    'const user = { name: \'Alice\', settings: { theme: \'dark\', notifications: true } };'
  ];

  const result = [];
  for (let i = 0; i < count; i++) {
    const snippet = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
    // Split the code snippet into "words" by spaces and include complex tokens
    const tokens = snippet.split(/\s+/);
    result.push(...tokens);
  }

  return result.slice(0, count);
}

/**
 * Helper function to capitalize first letter
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}