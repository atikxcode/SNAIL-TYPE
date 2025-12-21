// app/dashboard/DashboardContent.js
'use client';

import StatsCard from '@/components/Dashboard/StatsCard';
import ProgressGraph from '@/components/Dashboard/ProgressGraph';
import RecentTests from '@/components/Dashboard/RecentTests';

export default function DashboardContent({ user, userStats, dailyAverages, recentSessions }) {
  // Calculate stats for display
  const totalTests = userStats?.total_tests || 0;
  const currentStreak = userStats?.current_streak_days || 0;
  const avgWpm = userStats?.avg_wpm || 0;
  const totalTimeSeconds = userStats?.total_time_seconds || 0;
  const totalTimeMinutes = Math.floor(totalTimeSeconds / 60);
  const longestStreak = userStats?.longest_streak_days || 0;
  const xp = userStats?.xp || 0;
  const level = userStats?.level || 1;
  const tier = userStats?.current_tier || 'Bronze';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-8">Welcome back, {user.display_name || user.email}!</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Tests Card */}
          <StatsCard 
            title="Total Tests" 
            value={totalTests} 
            icon="📊" 
            change={null} 
          />
          
          {/* Current Streak Card */}
          <StatsCard 
            title="Current Streak" 
            value={`${currentStreak} days`} 
            icon="🔥" 
            change={null} 
          />
          
          {/* Average WPM Card */}
          <StatsCard 
            title="Avg WPM" 
            value={avgWpm.toFixed(1)} 
            icon="⚡" 
            change={null} 
          />
          
          {/* Total Time Practiced Card */}
          <StatsCard 
            title="Time Practiced" 
            value={`${totalTimeMinutes} min`} 
            icon="⏱️" 
            change={null} 
          />
        </div>
        
        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard 
            title="Longest Streak" 
            value={`${longestStreak} days`} 
            icon="🏆" 
            change={null} 
          />
          
          <StatsCard 
            title="Level" 
            value={level} 
            icon="🎖️" 
            change={null} 
          />
          
          <StatsCard 
            title="XP" 
            value={xp} 
            icon="⭐" 
            change={null} 
          />
          
          <StatsCard 
            title="Tier" 
            value={tier} 
            icon="👑" 
            change={null} 
          />
        </div>
        
        {/* Progress Graph */}
        <div className="bg-white p-6 rounded-xl shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Progress Over Time</h2>
          <ProgressGraph data={dailyAverages} />
        </div>
        
        {/* Recent Tests */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Tests</h2>
          <RecentTests sessions={recentSessions} />
        </div>
      </div>
    </div>
  );
}