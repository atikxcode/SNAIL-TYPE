// app/dashboard/page.js
import { verifyAuth } from '@/lib/auth/verify';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getUserStats, getDailyAverages, getRecentSessions } from '@/lib/db/sessionAggregation';
import { getUserByFirebaseUid } from '@/lib/db/userActions';
import DashboardContent from './DashboardContent';

// Supabase init removed as it was unused and caused build errors due to missing env vars
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server Component - fetch data server-side
export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  // Build-time bypass: if env vars are missing, don't attempt auth or DB calls
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    console.warn('Dashboard: Missing Firebase Admin keys, determining this is likely a build. Skipping logic.');
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-4">Dashboard (Build Placeholder)</h1>
        <p>Authentication is required to view this page.</p>
        <p className="text-sm text-gray-500 mt-4">Note: This placeholder appears because Firebase Admin keys are missing.</p>
      </div>
    );
  }

  try {
    // Verify user is authenticated
    const cookieStore = await cookies();
    const userClaims = await verifyAuth({ cookies: cookieStore });

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
  } catch (error) {
    console.error('Dashboard build error:', error);
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Dashboard Temporary Unavailable</h1>
        <p className="text-gray-500">Please check back later.</p>
      </div>
    );
  }
}