// lib/services/questsService.js
import clientPromise from '@/lib/db/mongoClient';
import { DB_NAME } from '@/lib/db/mongoClient';
import { ObjectId } from 'mongodb';
import { awardXp } from './gamificationService';

// Define quest types
const QUEST_TYPES = [
  {
    id: 'complete_3_tests',
    name: 'Complete 3 tests',
    target: 3,
    xpReward: 30
  },
  {
    id: 'accuracy_95_twice',
    name: 'Achieve 95%+ accuracy twice',
    target: 2,
    xpReward: 40
  },
  {
    id: 'beat_avg_wpm',
    name: 'Beat your average WPM',
    target: 1,
    xpReward: 25
  },
  {
    id: 'complete_60s_test',
    name: 'Complete a 60-second test',
    target: 1,
    xpReward: 20
  },
  {
    id: 'use_weakness_drill',
    name: 'Use weakness drill',
    target: 1,
    xpReward: 35
  }
];

/**
 * Generate daily quests for a user
 */
export async function generateDailyQuests(firebaseUid) {
  try {
    if (!clientPromise) throw new Error('Database not initialized');
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Select 3 random quest types for today
    const shuffledQuests = [...QUEST_TYPES].sort(() => 0.5 - Math.random());
    const dailyQuests = shuffledQuests.slice(0, 3).map(quest => ({
      ...quest,
      progress: 0,
      completed: false
    }));

    // Store in MongoDB
    const questData = {
      userId: firebaseUid,
      date: today,
      quests: dailyQuests,
      generatedAt: new Date()
    };

    const result = await db.collection('daily_quests').insertOne(questData);

    return {
      success: true,
      quests: dailyQuests,
      questId: result.insertedId.toString()
    };
  } catch (error) {
    console.error('Error generating daily quests:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get daily quests for a user
 */
export async function getDailyQuests(firebaseUid) {
  try {
    if (!clientPromise) throw new Error('Database not initialized');
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const questData = await db.collection('daily_quests')
      .findOne({
        userId: firebaseUid,
        date: today
      });

    if (!questData) {
      // Generate quests if they don't exist
      return await generateDailyQuests(firebaseUid);
    }

    return {
      success: true,
      quests: questData.quests,
      date: today
    };
  } catch (error) {
    console.error('Error getting daily quests:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update quest progress for a user
 */
export async function updateQuestProgress(firebaseUid, sessionData) {
  try {
    if (!clientPromise) throw new Error('Database not initialized');
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get today's quests
    const questData = await db.collection('daily_quests')
      .findOne({
        userId: firebaseUid,
        date: today
      });

    if (!questData) {
      return { success: false, message: 'No quests found for today' };
    }

    // Update progress for each quest
    const updatedQuests = questData.quests.map(quest => {
      let newProgress = quest.progress;
      let newlyCompleted = false;

      switch (quest.id) {
        case 'complete_3_tests':
          // This quest is updated when a test is completed
          newProgress = Math.min(quest.target, quest.progress + 1);
          break;

        case 'accuracy_95_twice':
          if (sessionData.accuracy >= 95) {
            newProgress = Math.min(quest.target, quest.progress + 1);
          }
          break;

        case 'beat_avg_wpm':
          // This would require comparing to user's average WPM
          // For now, just mark as completed if they achieve a good WPM
          if (sessionData.wpm > 60) {  // arbitrary threshold
            newProgress = Math.min(quest.target, quest.progress + 1);
          }
          break;

        case 'complete_60s_test':
          if (sessionData.duration >= 60) {
            newProgress = Math.min(quest.target, quest.progress + 1);
          }
          break;

        case 'use_weakness_drill':
          // This would be tracked separately when user uses weakness drill
          // For now, we'll just return the quest as is
          break;

        default:
          break;
      }

      const completed = newProgress >= quest.target;
      if (completed && !quest.completed) {
        newlyCompleted = true;
      }

      return {
        ...quest,
        progress: newProgress,
        completed
      };
    });

    // Update the quests in the database
    await db.collection('daily_quests')
      .updateOne(
        { _id: questData._id },
        { $set: { quests: updatedQuests } }
      );

    // Award XP for newly completed quests
    let totalXpAwarded = 0;
    const completedQuests = [];

    for (let i = 0; i < updatedQuests.length; i++) {
      const quest = updatedQuests[i];
      const oldQuest = questData.quests[i];

      // Check if quest was just completed
      if (quest.completed && !oldQuest.completed) {
        // Award XP for completing the quest
        await awardXp(firebaseUid, quest.xpReward);
        totalXpAwarded += quest.xpReward;
        completedQuests.push(quest);
      }
    }

    return {
      success: true,
      quests: updatedQuests,
      totalXpAwarded,
      completedQuests
    };
  } catch (error) {
    console.error('Error updating quest progress:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate daily quests for all active users (for cron job)
 */
export async function generateDailyQuestsForAllUsers() {
  try {
    if (!clientPromise) throw new Error('Database not initialized');
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Find users who were active in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await db.collection('keystrokes')
      .aggregate([
        {
          $match: {
            timestamp: { $gte: sevenDaysAgo },
            userId: { $ne: null } // Only for authenticated users
          }
        },
        {
          $group: {
            _id: '$userId'
          }
        }
      ]).toArray();

    const userIds = recentUsers.map(user => user._id);
    const results = [];

    for (const userId of userIds) {
      const result = await generateDailyQuests(userId);
      results.push({ userId, result });
    }

    return {
      success: true,
      processedUsers: userIds.length,
      results
    };
  } catch (error) {
    console.error('Error generating daily quests for all users:', error);
    return { success: false, error: error.message };
  }
}