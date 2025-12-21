// components/TypingTest.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useTypingStore } from '@/lib/stores/typingStore';
import { generateWords } from '@/lib/services/wordGenerator';
import { getTextContent } from '@/lib/services/textContentService';
import ResultsScreen from './ResultsScreen';
import CustomTextInput from './CustomTextInput';

const TypingTest = () => {
  const {
    currentWordIndex,
    inputValue,
    isTestActive,
    wpm,
    accuracy,
    startTest,
    updateInput,
    endTest,
    reset,
    testDuration,
    testMode,
    currentTestText,
    showResults,
    startTime,
    endTime
  } = useTypingStore();

  const [timeLeft, setTimeLeft] = useState(testDuration);
  const [selectedMode, setSelectedMode] = useState({ type: 'time', value: 60 });
  const [selectedCategory, setSelectedCategory] = useState('random_words');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomTextModal, setShowCustomTextModal] = useState(false);
  const inputRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const keystrokeBufferRef = useRef([]);
  const sessionIdRef = useRef(null);

  // Initialize session and start keystroke logging when test starts
  useEffect(() => {
    if (isTestActive && startTime) {
      // Create a session ID for this test run
      sessionIdRef.current = Date.now().toString();
      lastTimestampRef.current = startTime;
    }
  }, [isTestActive, startTime]);

  // Generate initial test text based on selected category and difficulty
  useEffect(() => {
    generateNewTest();
  }, []);

  // Handle timer for time-based tests
  useEffect(() => {
    let timer;
    if (isTestActive && selectedMode.type === 'time') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            endTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTestActive, selectedMode]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Function to generate new test content based on selected options
  const generateNewTest = async (customText = null) => {
    setIsLoading(true);
    try {
      let words = [];

      if (customText) {
        // Use custom text
        words = customText.split(/\s+/).filter(word => word.length > 0);
      } else if (selectedCategory === 'random_words') {
        // Use the existing word generator for random words
        words = generateWords(50, selectedDifficulty);
      } else {
        // Use the new text content service for other categories
        words = await getTextContent(selectedCategory, selectedDifficulty, 'english', 50);
      }

      startTest(words);
    } catch (error) {
      console.error('Error generating test content:', error);
      // Fallback to random words if there's an error
      const fallbackWords = generateWords(50, selectedDifficulty);
      startTest(fallbackWords);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to log keystrokes
  const logKeystroke = (key, expectedChar, isCorrect) => {
    if (!isTestActive || !startTime || isLoading) return;

    const timestamp = Date.now();
    const latency = lastTimestampRef.current ? timestamp - lastTimestampRef.current : 0;
    const positionInWord = inputValue.length; // current position in the word

    const keystrokeEvent = {
      key,
      timestamp,
      expected: expectedChar,
      correct: isCorrect,
      position: positionInWord,
      latencyFromPreviousKey: latency
    };

    // Add to buffer
    keystrokeBufferRef.current.push(keystrokeEvent);
    lastTimestampRef.current = timestamp;

    // Send batch if buffer reaches 50 keystrokes
    if (keystrokeBufferRef.current.length >= 50) {
      sendKeystrokeBatch();
    }
  };

  // Function to send keystroke batch to API
  const sendKeystrokeBatch = async () => {
    if (keystrokeBufferRef.current.length === 0 || !sessionIdRef.current) return;

    try {
      // Get user ID if authenticated
      const token = document.cookie.split('; ').find(row => row.startsWith('__session='));

      const response = await fetch('/api/keystrokes/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          userId: token ? 'authenticated_user_id' : null, // This will be replaced with real user ID in implementation
          events: keystrokeBufferRef.current
        }),
      });

      if (response.ok) {
        // Clear the buffer on successful send
        keystrokeBufferRef.current = [];
      }
    } catch (error) {
      console.error('Failed to send keystroke batch:', error);
      // In a real implementation, we'd have retry logic and offline storage
    }
  };

  // Send batch every 2 seconds while test is active
  useEffect(() => {
    let batchInterval;
    if (isTestActive && !isLoading) {
      batchInterval = setInterval(() => {
        sendKeystrokeBatch();
      }, 2000); // Send every 2 seconds
    }

    return () => {
      if (batchInterval) clearInterval(batchInterval);
    };
  }, [isTestActive, isLoading]);

  // Handle input changes and log keystrokes
  const handleInputChange = (e) => {
    if (!isTestActive || isLoading) return;

    const value = e.target.value;
    const currentWord = currentTestText[currentWordIndex];

    // Determine which character they're trying to type
    let expectedChar = null;
    let isCorrect = false;

    if (currentWord && inputValue.length < currentWord.length) {
      expectedChar = currentWord[inputValue.length];
      isCorrect = value.slice(-1) === expectedChar; // Last character typed
    }

    // Log the keystroke
    if (value.length > inputValue.length) {
      // Only log if they added a character (not backspace/delete)
      const keyPressed = value.slice(-1);
      logKeystroke(keyPressed, expectedChar, isCorrect);
    }

    updateInput(value);

    // Check if test should end in word count mode
    if (selectedMode.type === 'words' && currentWordIndex >= selectedMode.value - 1) {
      endTest();
    }
  };

  // Handle keydown events for special keys
  const handleKeyDown = (e) => {
    if (!isTestActive) return;

    // Log special keys like backspace
    if (e.key === 'Backspace') {
      logKeystroke('Backspace', null, null);
    }
  };

  const handleRestart = async () => {
    reset();
    await generateNewTest();
    setTimeLeft(selectedMode.value);
    keystrokeBufferRef.current = []; // Clear buffer
    sessionIdRef.current = null; // Reset session ID
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleTryAgain = async () => {
    reset();
    await generateNewTest();
    setTimeLeft(selectedMode.value);
    setShowResults(false);
    keystrokeBufferRef.current = []; // Clear buffer
    sessionIdRef.current = null; // Reset session ID
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleModeChange = async (type, value) => {
    setSelectedMode({ type, value });
    reset();
    await generateNewTest();
    setTimeLeft(value);
    keystrokeBufferRef.current = []; // Clear buffer
    sessionIdRef.current = null; // Reset session ID
  };

  const handleCategoryChange = async (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    reset();
    await generateNewTest();
    setTimeLeft(selectedMode.value);
    keystrokeBufferRef.current = []; // Clear buffer
    sessionIdRef.current = null; // Reset session ID
  };

  const handleDifficultyChange = async (e) => {
    const newDifficulty = e.target.value;
    setSelectedDifficulty(newDifficulty);
    reset();
    await generateNewTest();
    setTimeLeft(selectedMode.value);
    keystrokeBufferRef.current = []; // Clear buffer
    sessionIdRef.current = null; // Reset session ID
  };

  const handleCustomTextSelect = (customText) => {
    reset();
    generateNewTest(customText);
    setTimeLeft(selectedMode.value);
    setShowCustomTextModal(false);
    keystrokeBufferRef.current = []; // Clear buffer
    sessionIdRef.current = null; // Reset session ID
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Render the current test text with appropriate styling
  const renderTestText = () => {
    if (currentTestText.length === 0) return null;

    return currentTestText.map((word, wordIndex) => {
      let wordClassName = 'mr-2 inline-block ';

      if (wordIndex === currentWordIndex) {
        wordClassName += 'bg-yellow-200 text-black ';
      } else if (wordIndex < currentWordIndex) {
        wordClassName += 'text-green-600 ';
      } else {
        wordClassName += 'text-gray-500 ';
      }

      // Split the current word to highlight individual characters
      if (wordIndex === currentWordIndex) {
        return (
          <span key={wordIndex} className={wordClassName}>
            {word.split('').map((char, charIndex) => {
              let charClassName = '';
              if (charIndex < inputValue.length) {
                if (char === inputValue[charIndex]) {
                  charClassName = 'text-green-600';
                } else {
                  charClassName = 'text-red-600 bg-red-200';
                }
              } else if (charIndex === inputValue.length) {
                charClassName = 'bg-gray-300'; // Current character position
              }
              return (
                <span key={charIndex} className={charClassName}>
                  {char}
                </span>
              );
            })}
          </span>
        );
      }

      return (
        <span key={wordIndex} className={wordClassName}>
          {word}
        </span>
      );
    });
  };

  if (showResults) {
    // Send any remaining keystrokes before showing results
    if (keystrokeBufferRef.current.length > 0) {
      sendKeystrokeBatch();
    }

    return (
      <ResultsScreen
        onTryAgain={handleTryAgain}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Mode Selection */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Time Mode</label>
          <div className="flex flex-wrap gap-2">
            {['15', '30', '60', '120'].map((time) => (
              <button
                key={`time-${time}`}
                onClick={() => handleModeChange('time', parseInt(time))}
                disabled={isLoading}
                className={`px-3 py-1 text-sm rounded ${
                  selectedMode.type === 'time' && selectedMode.value === parseInt(time)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {time}s
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Word Mode</label>
          <div className="flex flex-wrap gap-2">
            {['10', '25', '50', '100'].map((count) => (
              <button
                key={`words-${count}`}
                onClick={() => handleModeChange('words', parseInt(count))}
                disabled={isLoading}
                className={`px-3 py-1 text-sm rounded ${
                  selectedMode.type === 'words' && selectedMode.value === parseInt(count)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {count}w
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            disabled={isLoading}
            className={`w-full p-2 border border-gray-300 rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="random_words">Random Words</option>
            <option value="code">Code Snippets</option>
            <option value="quotes">Quotes</option>
            <option value="email">Email/Professional</option>
            <option value="custom">Custom Text</option>
          </select>
        </div>

        <div className="min-w-[150px]">
          <label className="block text-sm font-medium mb-1">Difficulty</label>
          <select
            value={selectedDifficulty}
            onChange={handleDifficultyChange}
            disabled={isLoading || selectedCategory === 'custom'}
            className={`w-full p-2 border border-gray-300 rounded ${isLoading || selectedCategory === 'custom' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Action</label>
          <button
            onClick={() => setShowCustomTextModal(true)}
            className="w-full p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Custom Text
          </button>
        </div>
      </div>

      {/* Custom Text Modal */}
      {showCustomTextModal && (
        <CustomTextInput
          onCustomTextSelect={handleCustomTextSelect}
          onClose={() => setShowCustomTextModal(false)}
        />
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="text-center mb-4 text-gray-600">
          Loading content...
        </div>
      )}

      {/* Stats Display */}
      <div className="flex flex-wrap justify-between mb-4 text-lg font-semibold">
        <div>WPM: {wpm}</div>
        <div>Accuracy: {accuracy}%</div>
        <div>Time: {selectedMode.type === 'time' ? timeLeft : `${currentWordIndex + 1}/${selectedMode.value}`}</div>
      </div>

      {/* Typing Area */}
      <div className="bg-gray-100 p-6 rounded-lg mb-4 min-h-[150px]">
        <div className="text-2xl font-mono leading-relaxed mb-4 h-24 overflow-hidden">
          {renderTestText()}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={!isTestActive || isLoading}
          className={`w-full p-3 text-xl border border-gray-300 rounded mt-4 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder={isTestActive && !isLoading ? "Start typing here..." : "Loading..."}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={handleRestart}
          disabled={isLoading}
          className={`px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Restart (Tab + Enter)
        </button>

        {!isTestActive && (
          <button
            onClick={async () => {
              reset();
              await generateNewTest();
              setTimeLeft(selectedMode.value);
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
            disabled={isLoading}
            className={`px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            New Test
          </button>
        )}
      </div>
    </div>
  );
};

export default TypingTest;