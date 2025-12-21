// app/dashboard/page.js
import { verifyAuth } from '@/lib/auth/verify';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getUserStats, getDailyAverages, getRecentSessions } from '@/lib/db/sessionAggregation';
import { getUserByFirebaseUid } from '@/lib/db/userActions';
import DashboardContent from './DashboardContent';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server Component - fetch data server-side
export default async function DashboardPage() {
  // Verify user is authenticated
  const userClaims = await verifyAuth({ cookies });

  if (!userClaims) {
    // Redirect to home if not authenticated
    redirect('/');
  }

  // Get user from database using Firebase UID
  const user = await getUserByFirebaseUid(userClaims.uid);
  if (!user) {
    // If user doesn't exist in our database, redirect
    redirect('/');
  }

  // Fetch user stats
  const userStats = await getUserStats(user.id);
  const dailyAverages = await getDailyAverages(user.id, 30);
  const recentSessions = await getRecentSessions(user.id, 20);

  return (
    <DashboardContent
      user={user}
      userStats={userStats}
      dailyAverages={dailyAverages}
      recentSessions={recentSessions}
    />
  );
}