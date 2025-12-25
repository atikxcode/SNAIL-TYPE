// lib/db/textCategoriesSchema.js
// MongoDB Text Pools Collection Structure

/*
Text Pools Collection Schema:

Collection: text_pools
Document Structure:
{
  _id: ObjectId,
  category: String,              // Category (e.g., "random_words", "code", "quotes")
  difficulty: String,            // Difficulty level (e.g., "easy", "medium", "hard")
  language: String,              // Language (e.g., "english", "spanish")
  content: [String],             // Array of text snippets for this category/difficulty
  tags: [String],                // Optional tags for additional filtering
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { category: 1, difficulty: 1, language: 1 }
- { tags: 1 }
*/

// This file serves as documentation for the MongoDB text_pools collection structure
// and provides seeding data for initial content
export const TEXT_POOLS_SCHEMA = {
  description: "Stores text content for different typing practice modes",
  collection: "text_pools",
  fields: {
    category: {
      type: "String",
      required: true,
      description: "Category of text (random_words, code, quotes, email, etc.)"
    },
    difficulty: {
      type: "String",
      required: true,
      description: "Difficulty level (easy, medium, hard)"
    },
    language: {
      type: "String",
      required: true,
      description: "Language of the content"
    },
    content: {
      type: "Array",
      required: true,
      description: "Array of text snippets for this category/difficulty",
      items: {
        type: "String",
        required: true,
        description: "Individual text snippet"
      }
    },
    tags: {
      type: "Array",
      required: false,
      description: "Optional tags for additional filtering",
      items: {
        type: "String",
        required: false,
        description: "Individual tag"
      }
    },
    createdAt: {
      type: "Date",
      required: true,
      description: "When the document was created"
    },
    updatedAt: {
      type: "Date",
      required: true,
      description: "When the document was last updated"
    }
  },
  indexes: [
    { category: 1, difficulty: 1, language: 1 },
    { tags: 1 }
  ]
};

// Initial seeding content for text pools
export const INITIAL_TEXT_POOLS = [
  // Random Words - Easy
  {
    category: "random_words",
    difficulty: "easy",
    language: "english",
    content: [
      "the and for are but not you all can had her was one our out day get has him his how its may new now old see two who boy did man men run too any big eat had hot new old red",
      "be to of and a in that have i it for not on with he as do at this but his by from they we say her she or an will my one all would there what so up out if about who get which go me when make can like time no just him know take",
      "people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us computer keyboard website internet application software"
    ],
    tags: ["basic", "common", "simple"]
  },
  // Random Words - Medium
  {
    category: "random_words",
    difficulty: "medium",
    language: "english",
    content: [
      "technology programming development system database network security function variable algorithm data structure science research analysis design project management business company service product customer experience process information communication education knowledge learning practice improvement performance efficiency accuracy speed",
      "advanced comprehensive methodology implementation optimization architecture infrastructure integration configuration compatibility functionality performance reliability scalability maintainability usability accessibility effectiveness productivity innovation collaboration coordination communication documentation specification requirement validation verification authentication authorization encryption decryption transmission reception processing analysis",
      "sophisticated comprehensive methodology implementation optimization architecture infrastructure integration configuration compatibility functionality performance reliability scalability maintainability usabilty effectiveness productivity innovation collaboration coordination communication documentation specification requirement validation verification authentication authorization encryption decryption transmission reception processing analysis"
    ],
    tags: ["intermediate", "technical", "mixed"]
  },
  // Random Words - Hard
  {
    category: "random_words",
    difficulty: "hard",
    language: "english",
    content: [
      "sophisticated comprehensive methodology implementation optimization architecture infrastructure integration configuration compatibility functionality performance reliability scalability maintainability usabilty effectiveness productivity innovation collaboration coordination communication documentation specification requirement validation verification authentication authorization encryption decryption transmission reception processing analysis",
      "methodology implementation optimization architecture infrastructure integration configuration compatibility functionality performance reliability scalability maintainability effectiveness productivity innovation collaboration coordination documentation specification requirement validation verification authentication authorization encryption decryption transmission reception processing analysis",
      "implementation optimization architecture infrastructure integration configuration compatibility functionality performance reliability scalability maintainability effectiveness productivity innovation collaboration coordination documentation specification requirement validation verification authentication authorization encryption decryption transmission reception processing analysis"
    ],
    tags: ["advanced", "challenging", "complex"]
  },
  // Code - JavaScript/React snippets
  {
    category: "code",
    difficulty: "medium",
    language: "javascript",
    content: [
      "function calculateWPM(words, time) { return (words / time) * 60; }",
      "const user = { name: 'John', email: 'john@example.com', active: true };",
      "const handleClick = (e) => { console.log('Button clicked:', e.target); };",
      "const [count, setCount] = useState(0); useEffect(() => { document.title = `Count: ${count}`; }, [count]);",
      "const filteredItems = items.filter(item => item.active).map(item => ({ ...item, processed: true }));",
      "import React, { useState, useEffect } from 'react'; function App() { const [data, setData] = useState(null); return <div>{data}</div>; } export default App;"
    ],
    tags: ["javascript", "react", "frontend", "functions"]
  },
  // Code - Advanced
  {
    category: "code",
    difficulty: "hard",
    language: "javascript",
    language: "javascript",
    content: [
      "const compose = (...fns) => (value) => fns.reduceRight((acc, fn) => fn(acc), value); const pipe = (...fns) => (value) => fns.reduce((acc, fn) => fn(acc), value); const memoize = (fn) => { const cache = {}; return (...args) => { const key = JSON.stringify(args); return key in cache ? cache[key] : (cache[key] = fn(...args)); }; };",
      "class EventEmitter { constructor() { this.events = {}; } on(event, callback) { if (!this.events[event]) this.events[event] = []; this.events[event].push(callback); } emit(event, ...args) { if (this.events[event]) this.events[event].forEach(callback => callback(...args)); } }",
      "const asyncPipe = (...fns) => async (value) => { let result = value; for (const fn of fns) { result = await (result instanceof Promise ? result.then(fn) : fn(result)); } return result; }; const retry = (fn, retries = 3) => async (...args) => { for (let i = 0; i <= retries; i++) { try { return await fn(...args); } catch (error) { if (i === retries) throw error; } } };"
    ],
    tags: ["javascript", "advanced", "functional", "patterns"]
  },
  // Quotes
  {
    category: "quotes",
    difficulty: "medium",
    language: "english",
    content: [
      "The only way to do great work is to love what you do. - Steve Jobs",
      "Innovation distinguishes between a leader and a follower. - Steve Jobs",
      "Your time is limited, so don't waste it living someone else's life. - Steve Jobs",
      "Stay hungry, stay foolish. - Steve Jobs",
      "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
      "It does not matter how slowly you go as long as you do not stop. - Confucius",
      "Everything you've ever wanted is on the other side of fear. - George Addair"
    ],
    tags: ["inspirational", "motivational", "wisdom"]
  },
  // Professional/Email content
  {
    category: "email",
    difficulty: "medium",
    language: "english",
    content: [
      "Dear Mr. Smith, I hope this email finds you well. I am writing to follow up on our meeting from last Tuesday regarding the project proposal. As discussed, we will be implementing the new system by the end of next month. Please let me know if you have any questions or concerns.",
      "Subject: Quarterly Report Submission. Dear Team, Please find attached the quarterly performance report for Q3. The report includes detailed analytics, revenue projections, and recommendations for the upcoming quarter. We will be having a review meeting next Friday at 2 PM in the main conference room.",
      "Thank you for your interest in our services. We have reviewed your application and would like to schedule a follow-up interview for next week. Our HR team will contact you within the next 24 hours to coordinate a suitable time. We look forward to hearing from you soon."
    ],
    tags: ["professional", "email", "business", "formal"]
  }
];

// Function to seed the database with initial content
export async function seedTextPools(clientPromise) {
  try {
    const client = await clientPromise;
    const db = client.db('snailtype'); // Use the database name from your setup
    
    // Check if text_pools collection already has content
    const existingCount = await db.collection('text_pools').countDocuments();
    
    if (existingCount > 0) {
      console.log('Text pools collection already seeded. Skipping seeding.');
      return { success: true, message: 'Already seeded' };
    }
    
    // Insert initial text pools
    const result = await db.collection('text_pools').insertMany(INITIAL_TEXT_POOLS);
    
    console.log(`Seeded ${result.insertedCount} text pool documents`);
    return { success: true, insertedCount: result.insertedCount };
  } catch (error) {
    console.error('Error seeding text pools:', error);
    return { success: false, error: error.message };
  }
}