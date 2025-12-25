// lib/db/keystrokesSchema.js
// MongoDB Collections Structure
// This file documents the structure for all MongoDB collections in the app

/*
Keystrokes Collection Schema:

Collection: keystrokes
Document Structure:
{
  _id: ObjectId,
  sessionId: String,           // Unique session identifier
  userId: String,              // Firebase UID (null for anonymous users)
  timestamp: Date,             // When the batch was created
  events: [                    // Array of keystroke events (max 50 per document)
    {
      key: String,             // The key that was pressed (e.g., 'a', 'Shift', 'Backspace')
      timestamp: Number,       // Milliseconds since Unix epoch
      expected: String,        // The character that should have been typed (null for special keys)
      correct: Boolean,        // Whether the key matched expected (null for special keys)
      position: Number,        // Position in the current word (0-indexed)
      latencyFromPreviousKey: Number // Time in ms since previous keystroke
    }
  ],
  createdAt: Date
}

Daily Quests Collection Schema:

Collection: daily_quests
Document Structure:
{
  _id: ObjectId,
  userId: String,              // Firebase UID
  date: String,                // Date string in YYYY-MM-DD format
  quests: [                    // Array of quest objects
    {
      questId: String,         // Unique identifier for the quest type
      name: String,            // Display name of the quest
      target: Number,          // Target value to complete the quest
      progress: Number,        // Current progress toward the target
      completed: Boolean,      // Whether the quest is completed
      xpReward: Number         // XP reward for completing the quest
    }
  ],
  generatedAt: Date            // When these quests were generated
}

Indexes:
- { sessionId: 1 }
- { userId: 1, timestamp: -1 }
- { timestamp: -1 }
- { userId: 1, date: 1 }       // For daily_quests
*/

// This file serves as documentation for the MongoDB collections structure
// The actual creation of collections happens automatically in MongoDB
export const MONGODB_COLLECTIONS_SCHEMA = {
  keystrokes: {
    description: "Stores keystroke events from typing tests in batches",
    collection: "keystrokes",
    fields: {
      sessionId: {
        type: "String",
        required: true,
        description: "Unique identifier for the typing session"
      },
      userId: {
        type: "String",
        required: false,
        description: "Firebase UID for authenticated users, null for anonymous"
      },
      timestamp: {
        type: "Date",
        required: true,
        description: "When the document was created (batch timestamp)"
      },
      events: {
        type: "Array",
        required: true,
        description: "Array of keystroke event objects (max 50 per batch)",
        items: {
          key: {
            type: "String",
            required: true,
            description: "Character or key name that was pressed"
          },
          timestamp: {
            type: "Number",
            required: true,
            description: "Timestamp of the keystroke in milliseconds since Unix epoch"
          },
          expected: {
            type: "String",
            required: false,
            description: "Expected character (null for special keys like Backspace)"
          },
          correct: {
            type: "Boolean",
            required: false,
            description: "Whether the keystroke was correct (null for special keys)"
          },
          position: {
            type: "Number",
            required: true,
            description: "Position within the current word (0-indexed)"
          },
          latencyFromPreviousKey: {
            type: "Number",
            required: true,
            description: "Time in milliseconds since previous keystroke"
          }
        }
      },
      createdAt: {
        type: "Date",
        required: true,
        description: "When the batch was created"
      }
    },
    indexes: [
      { sessionId: 1 },
      { userId: 1, timestamp: -1 },
      { timestamp: -1 }
    ]
  },
  daily_quests: {
    description: "Stores daily quests for users",
    collection: "daily_quests",
    fields: {
      userId: {
        type: "String",
        required: true,
        description: "Firebase UID of the user"
      },
      date: {
        type: "String",
        required: true,
        description: "Date string in YYYY-MM-DD format"
      },
      quests: {
        type: "Array",
        required: true,
        description: "Array of quest objects",
        items: {
          questId: {
            type: "String",
            required: true,
            description: "Unique identifier for the quest type"
          },
          name: {
            type: "String",
            required: true,
            description: "Display name of the quest"
          },
          target: {
            type: "Number",
            required: true,
            description: "Target value to complete the quest"
          },
          progress: {
            type: "Number",
            required: true,
            description: "Current progress toward the target"
          },
          completed: {
            type: "Boolean",
            required: true,
            description: "Whether the quest is completed"
          },
          xpReward: {
            type: "Number",
            required: true,
            description: "XP reward for completing the quest"
          }
        }
      },
      generatedAt: {
        type: "Date",
        required: true,
        description: "When these quests were generated"
      }
    },
    indexes: [
      { userId: 1, date: 1 }
    ]
  }
};