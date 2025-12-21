// components/ResultsScreen.js
'use client';

import { useEffect, useState } from 'react';
import { useTypingStore } from '@/lib/stores/typingStore';
import { useAuth } from '@/lib/hooks/useAuth';
import { saveLocalSession } from '@/lib/utils\anonymousUser';
import WeaknessReport from './WeaknessReport';

const ResultsScreen = ({ onTryAgain }) => {
  const {
    wpm,
    rawWpm,
    accuracy,
    startTime,
    endTime,
    testDuration,
    testMode,
    sessionId
  } = useTypingStore();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Calculate additional stats if possible
  const timeTaken = endTime && startTime ? (endTime - startTime) / 1000 : 0; // in seconds
  const minutesTaken = timeTaken / 60;

  // Estimate characters typed (this is approximate)
  const estimatedRawWpm = rawWpm || (wpm * 100 / accuracy);
  const estimatedCharsTyped = estimatedRawWpm * 5 * minutesTaken; // Raw WPM * 5 = chars per minute

  const handleSaveResult = async () => {
    setIsSaving(true);
    setSaveStatus('');

    try {
      if (user) {
        // Save to MongoDB for logged-in users
        const response = await fetch('/api/sessions/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionId || Date.now().toString(), // Use provided sessionId or generate one
            wpm,
            rawWpm,
            accuracy,
            errors: 0, // Placeholder - would track actual errors in a full implementation
            duration: timeTaken,
            wordCount: testMode === 'words' ? testDuration : 0,
            startedAt: startTime ? new Date(startTime).toISOString() : new Date(Date.now() - timeTaken * 1000).toISOString(),
            endedAt: endTime ? new Date(endTime).toISOString() : new Date().toISOString()
          }),
        });

        if (response.ok) {
          setSaveStatus('Result saved successfully!');
        } else {
          setSaveStatus('Failed to save result');
        }
      } else {
        // Save locally for anonymous users
        const sessionData = {
          wpm,
          rawWpm,
          accuracy,
          duration: timeTaken,
          mode: testMode,
          testDuration,
          startedAt: startTime ? new Date(startTime).toISOString() : new Date(Date.now() - timeTaken * 1000).toISOString(),
          endedAt: endTime ? new Date(endTime).toISOString() : new Date().toISOString(),
          timestamp: new Date().toISOString()
        };

        saveLocalSession(sessionData);
        setSaveStatus('Result saved locally! Sign in to save permanently.');
      }
    } catch (error) {
      console.error('Error saving result:', error);
      setSaveStatus('Error saving result');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center mb-8">Test Results</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {/* WPM */}
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{wpm}</div>
            <div className="text-gray-600 dark:text-gray-300">WPM</div>
          </div>

          {/* Raw WPM */}
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{rawWpm}</div>
            <div className="text-gray-600 dark:text-gray-300">Raw WPM</div>
          </div>

          {/* Accuracy */}
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{accuracy}%</div>
            <div className="text-gray-600 dark:text-gray-300">Accuracy</div>
          </div>

          {/* Time */}
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {testMode === 'time' ? `${testDuration}s` : `${testDuration} words`}
            </div>
            <div className="text-gray-600 dark:text-gray-300">Mode</div>
          </div>
        </div>

        {/* Weakness Report */}
        <WeaknessReport sessionId={sessionId} />

        {/* Simple chart visualization */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Performance Graph</h3>
          <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-end p-4">
            {/* This is a simple static representation - in a real implementation,
                we would show actual WPM over time data */}
            <div className="flex-1 flex items-end space-x-1">
              {[65, 72, 80, 78, 82, 75, 85, 79, 88, 82].map((value, index) => (
                <div
                  key={index}
                  className="flex-1 bg-blue-500 rounded-t hover:opacity-75 transition-opacity"
                  style={{ height: `${value}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional stats */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="font-medium">Characters Typed</div>
            <div className="text-gray-600 dark:text-gray-300">{Math.round(estimatedCharsTyped)}</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="font-medium">Time Taken</div>
            <div className="text-gray-600 dark:text-gray-300">{timeTaken.toFixed(1)} seconds</div>
          </div>
        </div>

        {/* Save status */}
        {saveStatus && (
          <div className={`mb-4 text-center p-3 rounded ${
            saveStatus.includes('successfully')
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}>
            {saveStatus}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={onTryAgain}
            className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>

          <button
            onClick={handleSaveResult}
            disabled={isSaving}
            className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Result'}
          </button>
        </div>

        {/* Sign in prompt for anonymous users */}
        {!user && (
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
            <p>Sign in to save your progress permanently and track your improvement over time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsScreen;