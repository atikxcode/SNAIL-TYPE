// src/components/TypingTest.jsx

'use client';

import { useState, useEffect, useRef, useLayoutEffect, memo } from 'react';
import { useTypingStore } from '@/lib/stores/typingStore';
import { useAuth } from '@/lib/hooks/useAuth';

import ResultsScreen from './ResultsScreen';
import CustomDurationModal from './CustomDurationModal';

// Memoized Word Component for performance
const Word = memo(({ word, wordIndex, isCurrent, isCompleted, inputValue, historyword }) => {
  const chars = word.split('');
  const inputChars = isCurrent ? inputValue.split('') : [];

  // STRICT LAYOUT: height 52px, flex center to enforce line height
  let wordClass = "relative mx-1.5 rounded-lg inline-flex items-center z-10 ";
  const wordStyle = {
    height: '52px',
    lineHeight: '52px',
    // GPU acceleration
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
  };

  return (
    <div
      id={`word-${wordIndex}`}
      className={wordClass}
      style={wordStyle}
    >
      {chars.map((char, charIndex) => {
        let charClass = "text-3xl font-mono relative select-none transition-colors duration-75 ";

        if (isCompleted) {
          if (historyword) {
            const typedChar = historyword[charIndex];
            if (typedChar === char) {
              charClass += "text-text-main";
            } else if (typedChar !== undefined) {
              charClass += "text-error";
            } else {
              charClass += "text-error opacity-50";
            }
          } else {
            charClass += "text-text-main";
          }
        } else if (isCurrent) {
          const typedChar = inputChars[charIndex];
          const isTyped = charIndex < inputChars.length;

          if (isTyped) {
            if (typedChar === char) {
              charClass += "text-text-main";
            } else {
              charClass += "text-error";
            }
          } else {
            charClass += "text-text-sub";
          }
          return <span id={`char-${wordIndex}-${charIndex}`} key={charIndex} className={charClass}>{char}</span>;
        } else {
          charClass += "text-text-sub";
        }

        return <span key={charIndex} className={charClass}>{char}</span>;
      })}

      {/* Extra Characters for Current Word */}
      {isCurrent && inputChars.length > chars.length && inputChars.slice(chars.length).map((char, i) => (
        <span key={`extra-${i}`} className="text-3xl font-mono text-error-dark opacity-80">{char}</span>
      ))}

      {/* Extra Characters for Completed Words */}
      {isCompleted && (historyword?.length > chars.length) &&
        historyword.slice(chars.length).split('').map((char, i) => (
          <span key={`extra-hist-${i}`} className="text-3xl font-mono text-error-dark opacity-80">{char}</span>
        ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to really avoid re-renders
  if (prevProps.isCurrent !== nextProps.isCurrent) return false;
  if (prevProps.wordIndex !== nextProps.wordIndex) return false;
  if (prevProps.word !== nextProps.word) return false;

  // If it was passed and is now passed (history), no change unless history changed (unlikely for past words)
  if (prevProps.isCompleted && nextProps.isCompleted) return true;

  // If it is current, we MUST re-render on inputValue change
  if (nextProps.isCurrent && prevProps.inputValue !== nextProps.inputValue) return false;

  return true;
});
Word.displayName = 'Word';

const TypingTest = () => {
  const {
    currentTestText,
    inputValue,
    updateInput,
    submitWord,
    startTest,
    endTestByTime,
    wpm,
    accuracy,
    isTestActive,
    reset,
    currentWordIndex,
    showResults,
    history,
    appendWords,
    logWpmHistory,
    backspaceWord,
    setTestDuration, // Import setter
    testDuration // Import value from store
  } = useTypingStore();

  // Comprehensive word pool - 400+ common English words
  const WORDS_POOL = [
    // Most common words
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
    'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
    'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
    'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only',
    'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
    'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has',
    'had', 'did', 'does', 'were', 'being', 'having', 'very', 'much', 'more', 'such', 'here', 'where', 'why', 'how',
    // Action verbs
    'run', 'walk', 'jump', 'play', 'read', 'write', 'speak', 'listen', 'watch', 'feel', 'learn',
    'teach', 'help', 'start', 'stop', 'open', 'close', 'push', 'pull', 'turn', 'move', 'hold', 'bring',
    'send', 'receive', 'find', 'lose', 'keep', 'leave', 'stay', 'change', 'grow', 'fall', 'rise', 'set',
    'build', 'break', 'fix', 'cut', 'add', 'remove', 'put', 'pick', 'drop', 'throw', 'catch', 'hit', 'kick',
    // Common nouns
    'world', 'life', 'hand', 'part', 'child', 'eye', 'woman', 'place', 'week', 'case', 'point', 'government',
    'company', 'number', 'group', 'problem', 'fact', 'money', 'month', 'night', 'home', 'water', 'room',
    'mother', 'area', 'story', 'word', 'family', 'face', 'name', 'house', 'school', 'state', 'city', 'country',
    'book', 'paper', 'letter', 'page', 'door', 'window', 'table', 'chair', 'floor', 'wall', 'light', 'sun',
    'moon', 'star', 'tree', 'flower', 'grass', 'animal', 'bird', 'fish', 'cat', 'dog', 'food', 'bread',
    // Technology
    'computer', 'phone', 'screen', 'keyboard', 'mouse', 'internet', 'website', 'email', 'data', 'file',
    'program', 'code', 'system', 'network', 'server', 'cloud', 'software', 'hardware', 'device', 'app',
    'digital', 'online', 'download', 'upload', 'stream', 'share', 'post', 'search', 'click', 'type',
    // Common adjectives
    'big', 'small', 'large', 'little', 'long', 'short', 'tall', 'wide', 'deep', 'high', 'low', 'fast',
    'slow', 'hot', 'cold', 'warm', 'cool', 'soft', 'hard', 'smooth', 'rough', 'heavy', 'dark',
    'bright', 'old', 'young', 'early', 'late', 'easy', 'simple', 'complex', 'clean', 'dirty',
    'dry', 'wet', 'empty', 'full', 'free', 'busy', 'quiet', 'loud', 'happy', 'sad',
    'nice', 'great', 'beautiful', 'ugly', 'rich', 'poor', 'strong', 'weak', 'safe', 'dangerous',
    // Common adverbs
    'always', 'never', 'often', 'sometimes', 'usually', 'rarely', 'quickly', 'slowly', 'carefully', 'easily',
    'hardly', 'almost', 'already', 'still', 'again', 'together', 'apart', 'forward', 'backward', 'inside',
    'outside', 'above', 'below', 'near', 'far', 'everywhere', 'nowhere', 'anywhere',
    // Prepositions and conjunctions
    'across', 'against', 'along', 'among', 'around', 'before', 'behind',
    'beneath', 'beside', 'between', 'beyond', 'during', 'except', 'through',
    'toward', 'under', 'until', 'upon', 'within', 'without', 'although', 'therefore',
    // Extended vocabulary
    'something', 'nothing', 'everything', 'someone', 'anyone', 'everyone', 'myself', 'yourself', 'himself',
    'herself', 'itself', 'ourselves', 'themselves', 'another', 'either', 'neither', 'both', 'several', 'few',
    'many', 'every', 'each', 'own', 'same', 'different', 'next', 'last', 'certain', 'possible',
    'important', 'necessary', 'available', 'likely', 'able', 'ready', 'sure', 'real', 'major', 'better',
    'best', 'right', 'left', 'wrong', 'true', 'false', 'whole', 'final', 'main', 'public', 'private',
    // Professional words
    'professional', 'organization', 'management', 'development', 'performance', 'strategy', 'communication',
    'relationship', 'experience', 'responsibility', 'opportunity', 'presentation', 'conference', 'efficiency',
    'productivity', 'innovation', 'technology', 'infrastructure', 'sustainability', 'environment',
    // More common words
    'actually', 'probably', 'certainly', 'definitely', 'obviously', 'clearly', 'simply', 'exactly',
    'especially', 'particularly', 'generally', 'usually', 'recently', 'finally', 'suddenly', 'immediately',
    'complete', 'current', 'recent', 'common', 'special', 'specific', 'particular', 'general', 'similar',
    'required', 'requires', 'requiring', 'reported', 'reports', 'reporting', 'decided', 'decides', 'deciding',
    'pulled', 'pulls', 'pulling', 'create', 'design', 'develop', 'produce', 'provide', 'offer', 'support'
  ];

  const { user } = useAuth();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const caretRef = useRef(null);
  const recentWordsRef = useRef([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  // Remove local testDuration state
  const [testMode, setTestMode] = useState('time');
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });
  // ...
  const [usePunctuation, setUsePunctuation] = useState(false);
  const [useNumbers, setUseNumbers] = useState(false);
  const [wordCount, setWordCount] = useState(50);
  const [isResetting, setIsResetting] = useState(false);
  const [showCustomDuration, setShowCustomDuration] = useState(false);

  const timerRef = useRef(null);
  const tabPressedRef = useRef(false); // Track if Tab is currently held down

  // Initialize
  useEffect(() => {
    if (currentTestText.length === 0) {
      generateTestText();
    }
  }, [currentTestText, usePunctuation, useNumbers, wordCount]);

  // Timer Sync
  useEffect(() => {
    if (isTestActive) {
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [isTestActive]);

  // Timer Interval & Logging
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
        if (logWpmHistory) logWpmHistory(); // Log stats for chart
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive, logWpmHistory]);

  // Check for Test Completion (Time Mode)
  useEffect(() => {
    if (testMode === 'time' && timerActive && timeElapsed >= testDuration) {
      setTimerActive(false);
      endTestByTime();
    }
  }, [timeElapsed, testMode, testDuration, timerActive, endTestByTime]);

  const generateTestText = () => {
    // Generate initial text using the shared batch generator
    const count = testMode === 'words' ? wordCount : 50;
    const text = generateBatch(count);
    startTest(text);

    // Focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  // Handle Key Down (Space/Enter/Tab+Enter)
  const handleKeyDown = (e) => {
    // Tab key tracking for Tab+Enter shortcut
    if (e.key === 'Tab') {
      e.preventDefault(); // Prevent tab from moving focus
      tabPressedRef.current = true;
      return;
    }

    // Tab + Enter = Restart Test
    if (e.key === 'Enter' && tabPressedRef.current) {
      e.preventDefault();
      resetTest();
      tabPressedRef.current = false;
      return;
    }

    // Handle Backspace
    if (e.key === 'Backspace') {
      if (inputValue.length === 0) {
        e.preventDefault();
        backspaceWord();
      }
      if (e.ctrlKey && inputValue.length === 0) {
        e.preventDefault();
        backspaceWord();
      }
    }

    // Submit Word on Space Only
    if (e.key === ' ') {
      if (inputValue.length === 0) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      submitWord();
    }
  };

  // Handle Key Up (for Tab+Enter tracking)
  const handleKeyUp = (e) => {
    if (e.key === 'Tab') {
      tabPressedRef.current = false;
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    updateInput(value);
  };

  // Helper to generate a single batch of words
  const generateBatch = (count = 50) => {
    let wordsPool = [...WORDS_POOL];
    if (useNumbers) {
      const numbers = ['123', '2024', '50', '100', '10', '5', '0', '1999', '20', '365'];
      wordsPool = [...wordsPool, ...numbers];
    }
    // Improved Randomness: Avoid repeats within last 40 words (Persisted via Ref)
    const batch = [];

    for (let i = 0; i < count; i++) {
      let word;
      let attempts = 0;
      do {
        word = wordsPool[Math.floor(Math.random() * wordsPool.length)];
        attempts++;
      } while (recentWordsRef.current.includes(word) && attempts < 50);

      recentWordsRef.current.push(word);
      if (recentWordsRef.current.length > 40) recentWordsRef.current.shift();

      if (usePunctuation) {
        if (Math.random() > 0.8) word += ',';
        else if (Math.random() > 0.9) word += '.';
      }
      batch.push(word);
    }
    return batch;
  };

  // Infinite Scroll / Word Generation 
  useEffect(() => {
    if (testMode === 'time' && currentTestText.length > 0) {
      // If we have fewer than 20 words left, generate 50 more
      const remaining = currentTestText.length - currentWordIndex;
      if (remaining < 20) {
        const newBatch = generateBatch(50);
        appendWords(newBatch);
      }
    }
  }, [currentWordIndex, currentTestText.length, testMode]);


  // Keep focus and Scroll to Word
  useEffect(() => {
    // Focus on keydown
    const focusInput = (e) => {
      // Don't focus if Tab (handled separately for shortcut)
      if (e.key !== 'Tab') {
        inputRef.current?.focus();
      }
    };

    // Global Tab+Enter shortcut handler
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        tabPressedRef.current = true;
      }
      if (e.key === 'Enter' && tabPressedRef.current) {
        e.preventDefault();
        resetTest();
        tabPressedRef.current = false;
      }
    };

    const handleGlobalKeyUp = (e) => {
      if (e.key === 'Tab') {
        tabPressedRef.current = false;
      }
    };

    document.addEventListener('keydown', focusInput);
    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('keyup', handleGlobalKeyUp);

    // Auto-scroll to keep active word in view
    const currentWordEl = document.getElementById(`word-${currentWordIndex}`);
    if (currentWordEl && containerRef.current) {
      const lineY = currentWordEl.offsetTop;
      const currentScroll = containerRef.current.scrollTop;

      // Only scroll if we moved to a new line (threshold based on line height/2)
      if (Math.abs(lineY - currentScroll) > 20) {
        containerRef.current.scrollTo({
          top: lineY,
          behavior: 'smooth'
        });
      }
    }

    return () => {
      document.removeEventListener('keydown', focusInput);
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, [currentWordIndex]); // Re-run scroll when word changes

  // Update Caret Position
  useLayoutEffect(() => {
    // Wait for render
    const updateCaret = () => {
      const currentWordEl = document.getElementById(`word-${currentWordIndex}`);
      const charIndex = inputValue.length;

      // Target specific character (next one to type)
      // If chars are rendered, charIndex points to the char we are about to type.
      // If we are at end of word, charIndex might be > rendered chars.

      const targetChar = document.getElementById(`char-${currentWordIndex}-${charIndex}`);

      if (targetChar) {
        setCaretPos({
          left: currentWordEl.offsetLeft + targetChar.offsetLeft,
          top: currentWordEl.offsetTop + targetChar.offsetTop
        });
      } else if (currentWordEl) {
        // Fallback: End of word OR Start of word
        const spans = currentWordEl.querySelectorAll('span');
        if (spans.length > 0 && inputValue.length > 0) {
          const lastSpan = spans[spans.length - 1];
          setCaretPos({
            left: currentWordEl.offsetLeft + lastSpan.offsetLeft + lastSpan.offsetWidth,
            top: currentWordEl.offsetTop + lastSpan.offsetTop
          });
        } else {
          // Start of word
          setCaretPos({
            left: currentWordEl.offsetLeft,
            top: currentWordEl.offsetTop
          });
        }
      }
    };

    updateCaret();
    window.addEventListener('resize', updateCaret);
    return () => window.removeEventListener('resize', updateCaret);

  }, [inputValue, currentWordIndex, currentTestText]);


  // Idle Detection Logic (blur only on inactivity, not window blur)
  const [isIdle, setIsIdle] = useState(false);
  const isIdleRef = useRef(false); // Track idle state without re-running effects
  const lastInputTime = useRef(Date.now());
  const idleTimerRef = useRef(null);
  const { addAfkDuration } = useTypingStore();

  const resetIdleTimer = () => {
    setIsIdle(false);
    isIdleRef.current = false;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      // Only trigger idle if not reviewing results
      if (!showResults) {
        setIsIdle(true);
        isIdleRef.current = true;
      }
    }, 5000);
  };

  useEffect(() => {
    // Activity listeners - only for idle detection
    const onInteraction = () => {
      lastInputTime.current = Date.now();
      resetIdleTimer();
    };
    const onMouseMove = () => {
      // Check REF instead of state to avoid dependency cycles
      if (!isIdleRef.current) resetIdleTimer();
    };

    // Only listen for user activity (removed window focus/blur listeners)
    window.addEventListener('keydown', onInteraction);
    window.addEventListener('mousedown', onInteraction);
    window.addEventListener('touchstart', onInteraction);
    window.addEventListener('mousemove', onMouseMove);

    // Initial start
    resetIdleTimer();

    return () => {
      window.removeEventListener('keydown', onInteraction);
      window.removeEventListener('mousedown', onInteraction);
      window.removeEventListener('touchstart', onInteraction);
      window.removeEventListener('mousemove', onMouseMove);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [showResults]);

  // AFK Check Interval (only counts when active and NOT idle)
  useEffect(() => {
    let interval;
    if (isTestActive && !showResults && !isIdle) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = now - lastInputTime.current;
        if (diff > 1000) {
          addAfkDuration(100);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isTestActive, showResults, isIdle, addAfkDuration]);

  // Update lastInputTime on user action
  useEffect(() => {
    if (isTestActive) {
      lastInputTime.current = Date.now();
      resetIdleTimer();
    }
  }, [inputValue]);


  const resetTest = () => {
    setIsResetting(true);
    reset();
    setTimeElapsed(0);
    setTimerActive(false);
    generateTestText();
    setTimeout(() => {
      // Only focus if NOT showing modal
      if (!showCustomDuration) {
        inputRef.current?.focus();
      }
      setIsResetting(false);
    }, 10);
  };

  const handleCustomDurationConfirm = (val) => {
    handleConfigChange('duration', val);
    setShowCustomDuration(false);
  };

  const handleConfigChange = (type, val) => {
    if (type === 'mode') setTestMode(val);
    if (type === 'duration') setTestDuration(val);
    if (type === 'count') setWordCount(val);
    if (type === 'punct') setUsePunctuation(prev => !prev);
    if (type === 'num') setUseNumbers(prev => !prev);
    if (type === 'duration-custom') {
      setShowCustomDuration(true);
      return; // Don't reset immediately
    }

    // Delay reset slightly to allow state to settle or force it
    setTimeout(() => resetTest(), 0);
  };



  // Render Results Screen if shown
  if (showResults) {
    return (
      <ResultsScreen onTryAgain={resetTest} />
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center pt-8 transition-colors duration-300">

      <CustomDurationModal
        isOpen={showCustomDuration}
        onClose={() => setShowCustomDuration(false)}
        onConfirm={handleCustomDurationConfirm}
      />

      {/* Hidden Input */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        className="opacity-0 absolute top-0 left-0 cursor-default"
        autoFocus={!showCustomDuration}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        autoCapitalize="off"
        disabled={showCustomDuration}
      />

      {/* Config Bar - Only visible when inactive */}
      {!isTestActive && !timerActive && (
        <div className="mb-12 glass-panel rounded-full px-6 py-2 inline-flex flex-wrap items-center gap-6 text-sm font-medium text-text-sub shadow-glow z-30 transition-all duration-300 hover:border-white/10">

          {/* Punctuation / Numbers Toggles */}
          <div className="flex gap-2 px-2 border-r border-text-sub/20">
            <button
              onClick={() => handleConfigChange('punct')}
              className={`hover:text-text-main transition-colors ${usePunctuation ? 'text-text-main' : ''}`}
            >
              <span className="opacity-50">@</span> punctuation
            </button>
            <button
              onClick={() => handleConfigChange('num')}
              className={`hover:text-text-main transition-colors ${useNumbers ? 'text-text-main' : ''}`}
            >
              <span className="opacity-50">#</span> numbers
            </button>
          </div>

          {/* Mode Select */}
          <div className="flex gap-2 px-2 border-r border-text-sub/20">
            <button onClick={() => handleConfigChange('mode', 'time')} className={`transition-colors ${testMode === 'time' ? 'text-caret-color' : 'hover:text-text-main'}`}>time</button>
            <button onClick={() => handleConfigChange('mode', 'words')} className={`transition-colors ${testMode === 'words' ? 'text-caret-color' : 'hover:text-text-main'}`}>words</button>
            <button onClick={() => handleConfigChange('mode', 'quote')} className={`transition-colors ${testMode === 'quote' ? 'text-caret-color' : 'hover:text-text-main'}`}>quote</button>
            <button onClick={() => handleConfigChange('mode', 'zen')} className={`transition-colors ${testMode === 'zen' ? 'text-caret-color' : 'hover:text-text-main'}`}>zen</button>
            <button onClick={() => handleConfigChange('mode', 'custom')} className={`transition-colors ${testMode === 'custom' ? 'text-caret-color' : 'hover:text-text-main'}`}>custom</button>
          </div>

          {/* Dynamic Options based on Mode */}
          <div className="flex gap-2 px-2">
            {testMode === 'time' && (
              <>
                {[15, 30, 60, 120].map(t => (
                  <button
                    key={t}
                    onClick={() => handleConfigChange('duration', t)}
                    className={`transition-colors mx-1 ${testDuration === t ? 'text-caret-color' : 'hover:text-text-main'}`}
                  >
                    {t}
                  </button>
                ))}

                <button
                  onClick={() => handleConfigChange('duration-custom')}
                  className="ml-2 hover:text-text-main transition-colors opacity-50 hover:opacity-100"
                  title="Custom Duration"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                </button>
              </>
            )}
            {testMode === 'words' && [10, 25, 50, 100].map(c => (
              <button
                key={c}
                onClick={() => handleConfigChange('count', c)}
                className={`transition-colors ${wordCount === c ? 'text-caret-color' : 'hover:text-text-main'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats / Timer Header */}
      <div className="w-full pl-8 h-12 mb-4 text-3xl font-bold text-caret-color text-left flex items-end">
        {testMode === 'time' ? (testDuration - Math.floor(timeElapsed)) : `${currentWordIndex}/${wordCount}`}
      </div>

      {/* Typing Container */}
      <div
        ref={containerRef}
        className="relative w-full px-8 break-words flex flex-wrap content-start select-none outline-none mt-8"
        style={{ height: '160px', overflow: 'hidden' }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Render words with memoized component for performance */}
        {currentTestText.map((word, i) => (
          <Word
            key={i}
            word={word}
            wordIndex={i}
            isCurrent={i === currentWordIndex}
            isCompleted={i < currentWordIndex}
            inputValue={i === currentWordIndex ? inputValue : ''}
            historyword={history[i]}
          />
        ))}

        {/* Caret - Smooth animation */}
        <div
          ref={caretRef}
          className="absolute w-0.5 h-8 bg-caret-color transition-all duration-75 ease-out z-20"
          style={{
            left: caretPos.left - 1,
            top: caretPos.top + 5,
            opacity: 1
          }}
        >
          <div className={`w-full h-full bg-caret-color ${!isTestActive ? 'animate-pulse' : ''}`}></div>
        </div>

      </div>

      {/* Idle Blur Overlay - Only shows after 5 seconds of inactivity */}
      {isIdle && !showResults && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md cursor-pointer transition-all duration-500 animate-in fade-in"
          onClick={() => {
            inputRef.current?.focus();
            resetIdleTimer();
          }}
        >
          <div className="flex flex-col items-center gap-4 text-[#f0f6fc] animate-pulse">
            <div className="p-4 rounded-full bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(88,166,255,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-caret-color"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
            </div>
            <div className="text-xl font-mono font-medium tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-text-sub to-text-main">
              Click or press any key to continue
            </div>
          </div>
        </div>
      )}
      {/* Footer / Restart */}
      <div className="mt-16 text-text-sub opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={resetTest}
          className="p-4 glass-button rounded-full transition-all duration-300 hover:rotate-180"
          title="Restart Test"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12" /><path d="M3 3v9h9" /></svg>
        </button>
      </div>

    </div>
  );
};

export default TypingTest;