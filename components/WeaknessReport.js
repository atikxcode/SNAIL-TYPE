// components/WeaknessReport.js
'use client';

import { useState, useEffect } from 'react';
import { useTypingStore } from '@/lib/stores/typingStore';
import { useAuth } from '@/lib/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function WeaknessReport({ sessionId }) {
  const { user } = useAuth();
  const { wpm, accuracy, startTime, endTime } = useTypingStore();
  const [weaknessData, setWeaknessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return; // Only fetch for authenticated users
    
    const fetchWeaknessData = async () => {
      try {
        setLoading(true);
        
        // Fetch user's weakness profile
        const { data, error } = await supabase
          .from('weakness_profiles')
          .select('*')
          .eq('user_id', user.uid)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') { // Row not found
            // User doesn't have a weakness profile yet
            setWeaknessData({
              weak_keys: [],
              weak_bigrams: [],
              avg_accuracy_by_duration: { '0-15s': 100, '15-30s': 100, '30-60s': 100, '60s+': 100 },
              avg_key_latency: {}
            });
          } else {
            throw error;
          }
        } else {
          setWeaknessData(data);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching weakness data:', err);
        setError('Failed to load weakness analysis');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWeaknessData();
  }, [user]);

  if (!user) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">Improve Your Typing</h3>
        <p className="text-blue-700 text-sm">
          Sign in to see personalized weakness analysis and targeted practice drills.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-2">Weakness Analysis</h3>
        <p className="text-gray-600 text-sm">Analyzing your typing pattern...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-red-800 mb-2">Error</h3>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  // Get top 3 weak keys
  const topWeakKeys = (weaknessData?.weak_keys || [])
    .slice(0, 3)
    .map(wk => ({ ...wk, error_rate: parseFloat(wk.error_rate.toFixed(1)) }));

  // Calculate fatigue info
  const duration = endTime && startTime ? (endTime - startTime) / 1000 : 0;
  let fatigueMessage = '';
  if (duration > 30) {
    const earlyAccuracy = weaknessData?.avg_accuracy_by_duration?.['0-15s'] || 100;
    const lateAccuracy = weaknessData?.avg_accuracy_by_duration?.['30-60s'] || 100;
    const drop = earlyAccuracy - lateAccuracy;
    
    if (drop > 5) {
      fatigueMessage = `Your accuracy dropped by ${drop.toFixed(1)}% after 30 seconds. Consider taking breaks or shorter practice sessions.`;
    }
  }

  // Determine slow fingers
  const slowFingers = [];
  for (const [finger, latency] of Object.entries(weaknessData?.avg_key_latency || {})) {
    // Compare to average (simplified calculation)
    const allLatencies = Object.values(weaknessData?.avg_key_latency || {});
    if (allLatencies.length > 0) {
      const avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
      if (latency > avgLatency * 1.2) { // 20% slower than average
        slowFingers.push({ finger, latency });
      }
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-3">Your Weak Spots in this Test</h3>
      
      <div className="space-y-3">
        {/* Top Weak Keys */}
        {topWeakKeys.length > 0 ? (
          <div>
            <h4 className="font-medium text-gray-700 text-sm mb-1">Problem Keys:</h4>
            <div className="flex flex-wrap gap-2">
              {topWeakKeys.map((wk, index) => (
                <span 
                  key={index} 
                  className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded"
                >
                  '{wk.key}' - {wk.error_rate}% error rate ({wk.total_attempts} attempts)
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-green-700 text-sm">
            <p>No significant problem keys detected. Good job!</p>
          </div>
        )}
        
        {/* Fatigue Analysis */}
        {fatigueMessage && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
            <p className="text-yellow-800 text-sm">{fatigueMessage}</p>
          </div>
        )}
        
        {/* Slow Fingers */}
        {slowFingers.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 text-sm mb-1">Slow Fingers:</h4>
            <div className="flex flex-wrap gap-2">
              {slowFingers.map((sf, index) => (
                <span 
                  key={index} 
                  className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded"
                >
                  {sf.finger.replace('_', ' ')}: {sf.latency}ms
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Personalized Tip */}
        <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-3">
          <p className="text-blue-800 text-sm">
            {topWeakKeys.length > 0 
              ? `Practice drilling the keys: ${topWeakKeys.slice(0, 3).map(wk => `'${wk.key}'`).join(', ')}`
              : 'Continue practicing to maintain your accuracy!'
            }
            {duration > 60 ? ' Try shorter sessions to prevent fatigue.' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}