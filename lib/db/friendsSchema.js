// lib/db/friendsSchema.js
// MongoDB Friends System Collections Schema

/*
Friends Collection Schema:

Collection: friends
Document Structure:
{
  _id: ObjectId,
  userId: String,              // Firebase UID of the user who sent the request
  friendId: String,            // Firebase UID of the friend (recipient of request)
  status: String,              // 'pending', 'accepted', 'blocked'
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { userId: 1, friendId: 1 }    // For finding friendship relations
- { friendId: 1, userId: 1 }    // For finding incoming friend requests
- { status: 1 }                // For filtering by status

Friend Activity Collection Schema:

Collection: friend_activity
Document Structure:
{
  _id: ObjectId,
  userId: String,              // Firebase UID of the user whose friend did the activity
  friendId: String,            // Firebase UID of the friend who did the activity  
  activityType: String,        // 'test_completed', 'achievement_unlocked', 'level_up', 'streak_milestone'
  activityData: Object,        // Additional data about the activity (WPM, achievement ID, etc.)
  timestamp: Date,
  read: Boolean                // Whether the activity has been viewed by the user
}

Indexes:
- { userId: 1, timestamp: -1 } // For getting friend activities for a user
- { friendId: 1, timestamp: -1 } // For getting activities for a specific friend
- { read: 1 }                 // For filtering unread activities
*/

// This file documents the MongoDB friends system collection structures
export const FRIENDS_COLLECTION_SCHEMA = {
  friendsCollection: {
    description: "Stores friendship relationships between users",
    collection: "friends",
    fields: {
      userId: {
        type: "String",
        required: true,
        description: "Firebase UID of the user who initiated the friend request"
      },
      friendId: {
        type: "String",
        required: true,
        description: "Firebase UID of the friend (recipient of the request)"
      },
      status: {
        type: "String",
        required: true,
        enum: ["pending", "accepted", "rejected", "blocked"],
        description: "Status of the friendship request"
      },
      createdAt: {
        type: "Date",
        required: true,
        description: "When the relationship was created"
      },
      updatedAt: {
        type: "Date",
        required: true,
        description: "When the relationship status was last updated"
      }
    },
    indexes: [
      { userId: 1, friendId: 1 },
      { friendId: 1, userId: 1 },
      { status: 1 }
    ]
  },
  friendActivityCollection: {
    description: "Stores activity updates from friends",
    collection: "friend_activity",
    fields: {
      userId: {
        type: "String",
        required: true,
        description: "Firebase UID of the user receiving the activity notification"
      },
      friendId: {
        type: "String",
        required: true,
        description: "Firebase UID of the friend who performed the activity"
      },
      activityType: {
        type: "String",
        required: true,
        enum: ["test_completed", "achievement_unlocked", "level_up", "streak_milestone", "new_best_wpm"],
        description: "Type of activity that occurred"
      },
      activityData: {
        type: "Object",
        required: false,
        description: "Additional data about the activity (e.g., WPM value for test_completed)",
        properties: {
          wpm: { type: "Number", description: "WPM value for test_completed activities" },
          accuracy: { type: "Number", description: "Accuracy value for test_completed activities" },
          achievementId: { type: "String", description: "ID of achievement for achievement_unlocked activities" },
          newLevel: { type: "Number", description: "New level for level_up activities" },
          streakDays: { type: "Number", description: "New streak length for streak_milestone activities" }
        }
      },
      timestamp: {
        type: "Date",
        required: true,
        description: "When the activity occurred"
      },
      read: {
        type: "Boolean",
        required: false,
        default: false,
        description: "Whether the user has viewed this activity"
      }
    },
    indexes: [
      { userId: 1, timestamp: -1 },
      { friendId: 1, timestamp: -1 },
      { read: 1 }
    ]
  }
};

// Sample data for initialization
export const SAMPLE_FRIEND_ACTIVITY_TYPES = [
  {
    type: "test_completed",
    description: "A friend completed a typing test",
    exampleData: {
      wpm: 85.5,
      accuracy: 98.2,
      mode: "time_60s",
      testDate: "2025-12-20T10:30:00Z"
    }
  },
  {
    type: "achievement_unlocked",
    description: "A friend unlocked an achievement",
    exampleData: {
      achievementId: "speed_demon",
      achievementName: "Speed Demon - Reach 100 WPM"
    }
  },
  {
    type: "level_up",
    description: "A friend leveled up",
    exampleData: {
      newLevel: 15,
      prevLevel: 14
    }
  },
  {
    type: "streak_milestone",
    description: "A friend reached a streak milestone",
    exampleData: {
      streakDays: 30
    }
  },
  {
    type: "new_best_wpm",
    description: "A friend achieved a new personal best WPM",
    exampleData: {
      newBestWpm: 120.5,
      previousBest: 118.3
    }
  }
];