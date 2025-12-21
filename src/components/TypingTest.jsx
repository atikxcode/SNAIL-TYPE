// src/components/TypingTest.jsx

'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useTypingStore } from '@/lib/stores/typingStore';
import { useAuth } from '@/lib/hooks/useAuth';

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
    appendWords
  } = useTypingStore();

  const WORDS_POOL = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
    'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
    'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
    'is', 'are', 'was', 'were', 'been', 'being', 'has', 'had', 'did', 'does', 'doing', 'saying', 'says', 'said', 'going', 'gone', 'goes', 'went', 'making', 'made',
    'makes', 'knowing', 'known', 'knows', 'knew', 'thinking', 'thought', 'thoughts', 'taking', 'taken', 'takes', 'took', 'seeing', 'seen', 'sees', 'saw', 'coming',
    'came', 'comes', 'wanted', 'wanting', 'wants', 'looking', 'looked', 'looks', 'using', 'used', 'uses', 'finding', 'found', 'finds', 'giving', 'given', 'gives',
    'gave', 'telling', 'told', 'tells', 'working', 'worked', 'works', 'calling', 'called', 'calls', 'trying', 'tried', 'tries', 'asking', 'asked', 'asks', 'needing',
    'needed', 'needs', 'feeling', 'felt', 'feels', 'becoming', 'become', 'becomes', 'became', 'leaving', 'left', 'leaves', 'putting', 'put', 'puts', 'meaning', 'meant',
    'means', 'keeping', 'kept', 'keeps', 'letting', 'let', 'lets', 'beginning', 'began', 'begun', 'begins', 'seeming', 'seemed', 'seems', 'helping', 'helped', 'helps',
    'talking', 'talked', 'talks', 'turning', 'turned', 'turns', 'starting', 'started', 'starts', 'showing', 'showed', 'shown', 'shows', 'hearing', 'heard', 'hears',
    'playing', 'played', 'plays', 'running', 'ran', 'run', 'runs', 'moving', 'moved', 'moves', 'living', 'lived', 'lives', 'believing', 'believed', 'believes', 'bringing',
    'brought', 'brings', 'happening', 'happened', 'happens', 'writing', 'wrote', 'written', 'writes', 'providing', 'provided', 'provides', 'sitting', 'sat', 'sits',
    'standing', 'stood', 'stands', 'losing', 'lost', 'loses', 'paying', 'paid', 'pays', 'meeting', 'met', 'meets', 'including', 'included', 'includes', 'continuing',
    'continued', 'continues', 'setting', 'set', 'sets', 'learning', 'learned', 'learns', 'changing', 'changed', 'changes', 'leading', 'led', 'leads', 'understanding',
    'understood', 'understands', 'watching', 'watched', 'watches', 'following', 'followed', 'follows', 'stopping', 'stopped', 'stops', 'creating', 'created', 'creates',
    'speaking', 'spoke', 'spoken', 'speaks', 'reading', 'read', 'reads', 'allowing', 'allowed', 'allows', 'adding', 'added', 'adds', 'spending', 'spent', 'spends',
    'growing', 'grew', 'grown', 'grows', 'opening', 'opened', 'opens', 'walking', 'walked', 'walks', 'winning', 'won', 'wins', 'offering', 'offered', 'offers',
    'remembering', 'remembered', 'remembers', 'loving', 'loved', 'loves', 'considering', 'considered', 'considers', 'appearing', 'appeared', 'appears', 'buying',
    'bought', 'buys', 'waiting', 'waited', 'waits', 'serving', 'served', 'serves', 'sending', 'sent', 'sends', 'expecting', 'expected', 'expects', 'building', 'built',
    'builds', 'staying', 'stayed', 'stays', 'falling', 'fell', 'fallen', 'falls', 'cutting', 'cut', 'cuts', 'reaching', 'reached', 'reaches', 'killing', 'killed', 'kills',
    'remaining', 'remained', 'remains', 'suggesting', 'suggested', 'suggests', 'raising', 'raised', 'raises', 'passing', 'passed', 'passes', 'selling', 'sold', 'sells',
    'requiring', 'required', 'requires', 'reporting', 'reported', 'reports', 'deciding', 'decided', 'decides', 'pulling', 'pulled', 'pulls'
  ];

  const { user } = useAuth();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const caretRef = useRef(null);
  const recentWordsRef = useRef([]); // Track recent words across batches
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [testDuration, setTestDuration] = useState(30);
  const [testMode, setTestMode] = useState('time'); // 'time', 'words', 'quote', 'custom'
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });
  const [usePunctuation, setUsePunctuation] = useState(false);
  const [useNumbers, setUseNumbers] = useState(false);
  const [wordCount, setWordCount] = useState(50);

  const timerRef = useRef(null);

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

  // Timer Interval
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

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

  // Handle Key Down (Space/Enter)
  const handleKeyDown = (e) => {
    // Tab + Enter = Restart
    if (e.key === 'Enter' && e.code === 'Enter' && e.target.value === '' && !isTestActive) {
      // Quick restart logic could go here
    }

    // Submit Word on Space Only
    if (e.key === ' ') {
      e.preventDefault(); // Prevent space from being typed
      submitWord();
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
    // Focus
    const focusInput = () => inputRef.current?.focus();
    document.addEventListener('keydown', focusInput);

    // Auto-scroll to keep active word in view (Manual scrollTop for precision)
    const currentWordEl = document.getElementById(`word-${currentWordIndex}`);
    if (currentWordEl && containerRef.current) {
      const lineY = currentWordEl.offsetTop;
      // Scroll to the exact top of the current line
      // This makes "Line 2 become Line 1"
      containerRef.current.scrollTo({
        top: lineY,
        behavior: 'smooth'
      });
    }

    return () => document.removeEventListener('keydown', focusInput);
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


  const resetTest = () => {
    reset();
    setTimeElapsed(0);
    setTimerActive(false);
    generateTestText();
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleConfigChange = (type, val) => {
    if (type === 'mode') setTestMode(val);
    if (type === 'duration') setTestDuration(val);
    if (type === 'count') setWordCount(val);
    if (type === 'punct') setUsePunctuation(prev => !prev);
    if (type === 'num') setUseNumbers(prev => !prev);

    // Delay reset slightly to allow state to settle or force it
    setTimeout(() => resetTest(), 0);
  };

  // RENDER HELPERS
  const renderWord = (word, wordIndex) => {
    const isCurrent = wordIndex === currentWordIndex;
    const isCompleted = wordIndex < currentWordIndex;
    // STRICT LAYOUT: height 52px, flex center to enforce line height
    let wordClass = "relative mx-1.5 rounded-lg inline-flex items-center z-10 ";
    // Add specific style to enforce height and line-height
    const wordStyle = { height: '52px', lineHeight: '52px' };

    const chars = word.split('');
    const inputChars = isCurrent ? inputValue.split('') : [];

    // For completed words, we get what the user ACTUALLY typed from store history
    // We already have useTypingStore at top level. We need to grab history.

    return (
      <div key={wordIndex} id={`word-${wordIndex}`} className={wordClass} style={wordStyle}>
        {chars.map((char, charIndex) => {
          let charClass = "text-3xl font-mono relative select-none ";

          if (isCompleted) {
            // Access history from store
            const historyWord = history[wordIndex];

            if (historyWord) {
              const typedChar = historyWord[charIndex];
              if (typedChar === char) {
                charClass += "text-text-main"; // Correct
              } else if (typedChar !== undefined) {
                charClass += "text-error"; // User typed wrong char
              } else {
                charClass += "text-error opacity-50"; // User missed this char (skipped)
              }
            } else {
              charClass += "text-text-main";
            }
          } else if (isCurrent) {
            const typedChar = inputChars[charIndex];
            const isTyped = charIndex < inputChars.length;
            const isNextToType = charIndex === inputChars.length;

            if (isTyped) {
              if (typedChar === char) {
                charClass += "text-text-main"; // Correct -> Bright
              } else {
                charClass += "text-error"; // Incorrect -> Red
              }
            } else {
              charClass += "text-text-sub"; // Pending -> Gray
            }
            // Assign ID for Caret tracking
            return <span id={`char-${wordIndex}-${charIndex}`} key={charIndex} className={charClass}>{char}</span>;
          } else {
            charClass += "text-text-sub"; // Future -> Gray
          }

          return <span key={charIndex} className={charClass}>{char}</span>;
        })}
        {/* Extra Characters for Current Word */}
        {isCurrent && inputChars.length > chars.length && inputChars.slice(chars.length).map((char, i) => (
          <span key={`extra-${i}`} className="text-3xl font-mono text-error-dark opacity-80">{char}</span>
        ))}
        {/* Extra Characters for Completed Words (History) */}
        {isCompleted && (history[wordIndex]?.length > chars.length) &&
          history[wordIndex].slice(chars.length).split('').map((char, i) => (
            <span key={`extra-hist-${i}`} className="text-3xl font-mono text-error-dark opacity-80">{char}</span>
          ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center pt-8 transition-colors duration-300">

      {/* Hidden Input */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="opacity-0 absolute top-0 left-0 cursor-default"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        autoCapitalize="off"
      />

      {/* Config Bar - Only visible when inactive */}
      {!isTestActive && !timerActive && (
        <div className="mb-12 bg-bg-darker rounded-lg p-1.5 inline-flex flex-wrap items-center gap-4 text-sm font-medium text-text-sub shadow-sm z-30">

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
            {testMode === 'time' && [15, 30, 60, 120].map(t => (
              <button
                key={t}
                onClick={() => handleConfigChange('duration', t)}
                className={`transition-colors ${testDuration === t ? 'text-caret-color' : 'hover:text-text-main'}`}
              >
                {t}
              </button>
            ))}
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
        className="relative w-full px-8 break-words flex flex-wrap content-start select-none outline-none"
        style={{ height: '104px', lineHeight: '52px', overflow: 'hidden' }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Render only visible words for performance - KEEP HISTORY to prevent layout shift */}
        {(() => {
          const visibleStart = 0; // Always start from 0 to preserve flexbox layout positions
          const visibleEnd = Math.min(currentTestText.length, currentWordIndex + 50);
          return currentTestText.slice(visibleStart, visibleEnd).map((word, i) => renderWord(word, visibleStart + i));
        })()}

        {/* Caret - Smoother animation */}
        <div
          ref={caretRef}
          className="absolute w-0.5 h-8 bg-caret-color transition-all duration-100 ease-out z-20"
          style={{
            left: caretPos.left - 1,
            top: caretPos.top + 5,
            opacity: 1 // ALWAYS visible to match Monkeytype default (blinks if inactive)
          }}
        >
          <div className={`w-full h-full bg-caret-color ${!isTestActive ? 'animate-pulse' : ''}`}></div>
        </div>

        {/* Words */}
        {currentTestText.map((word, i) => renderWord(word, i))}

      </div>

      {/* Footer / Restart */}
      <div className="mt-16 text-text-sub opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={resetTest}
          className="p-4 bg-transparent hover:bg-bg-darker rounded-lg transition-colors"
          title="Restart Test"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12" /><path d="M3 3v9h9" /></svg>
        </button>
      </div>

    </div>
  );
};

export default TypingTest;