// app/api/cron/generate-daily-quests/route.js
import { generateDailyQuestsForAllUsers } from '@/lib/services/questsService';

export async function GET(request) {
  // For security, verify this is coming from a legitimate cron job
  // In a production environment, you might want to verify the source
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_AUTH_TOKEN && authHeader !== `Bearer ${process.env.CRON_AUTH_TOKEN}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  }

  try {
    const result = await generateDailyQuestsForAllUsers();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        ...result,
        message: `Generated daily quests for ${result.processedUsers} users`
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  } catch (error) {
    console.error('Cron job error:', error);
    return new Response(
      JSON.stringify({ error: 'Cron job failed', details: error.message }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  }
}