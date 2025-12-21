// lib/stores/typingStore.js
import { create } from 'zustand';

// Default settings
const defaultSettings = {
  theme: 'light',
  caretStyle: 'smooth',
  fontFamily: 'monospace',
  fontSize: 'medium',
  typewriterSounds: false,
  errorSound: false,
  completionSound: false,
  volume: 50,
  strictMode: false,
  quickRestart: false,
  confidenceMode: false,
  freedomMode: false,
};

export const useTypingStore = create((set, get) => ({
  // State
  currentWordIndex: 0,
  inputValue: '',
  history: [], // Stores the user's typed input for each completed word
  errors: [],
  startTime: null,
  endTime: null,
  isTestActive: false,
  wpm: 0,
  rawWpm: 0,
  accuracy: 0,
  testMode: 'time', // 'time' or 'words'
  testDuration: 60, // seconds for time mode or count for words mode
  testText: [],
  currentTestText: [],
  correctChars: 0,
  incorrectChars: 0,
  extraChars: 0,
  missedChars: 0,
  totalChars: 0,
  afkDuration: 0,
  showResults: false,
  sessionId: null,
  settings: { ...defaultSettings },

  // Actions
  startTest: (testText) => set({
    currentWordIndex: 0,
    inputValue: '',
    history: [],
    errors: [],
    startTime: null,
    endTime: null,
    isTestActive: false, // Wait for first input to activate
    wpm: 0,
    rawWpm: 0,
    accuracy: 0,
    currentTestText: testText,
    correctChars: 0,
    incorrectChars: 0,
    extraChars: 0,
    missedChars: 0,
    totalChars: 0,
    showResults: false,
    sessionId: null,
    wpmHistory: [],
    wpmHistory: []
  }),

  endTestByTime: () => set((state) => {
    // Calculate final stats before ending the test
    const timeElapsed = (state.endTime || Date.now()) - state.startTime;
    const timeInMinutes = timeElapsed / 60000;

    // Calculate raw WPM
    // Sum chars from history + current input
    let totalCharsTyped = state.inputValue.length;
    state.history.forEach(word => totalCharsTyped += word.length + 1); // +1 for space

    const rawWpm = timeInMinutes > 0 ? (totalCharsTyped / 5) / timeInMinutes : 0;

    // Calculate accuracy
    let correctChars = 0;
    let totalChars = 0;

    // Check history (completed words)
    state.history.forEach((typedWord, i) => {
      const targetWord = state.currentTestText[i];
      if (targetWord) {
        // Compare char by char
        for (let j = 0; j < Math.max(typedWord.length, targetWord.length); j++) {
          if (typedWord[j] === targetWord[j]) correctChars++;
          totalChars++;
        }
      }
    });

    // Current word
    const currentWord = state.currentTestText[state.currentWordIndex] || '';
    for (let i = 0; i < Math.min(state.inputValue.length, currentWord.length); i++) {
      if (state.inputValue[i] === currentWord[i]) correctChars++;
      totalChars++;
    }
    // Extra chars error
    if (state.inputValue.length > currentWord.length) {
      totalChars += state.inputValue.length - currentWord.length;
    }

    const accuracy = totalChars > 0 ? (correctChars / totalChars) * 100 : 100;
    const wpm = rawWpm * (accuracy / 100);

    return {
      endTime: Date.now(),
      isTestActive: false,
      showResults: true,
      rawWpm: parseFloat(rawWpm.toFixed(2)),
      accuracy: parseFloat(accuracy.toFixed(2)),
      wpm: parseFloat(wpm.toFixed(2))
    };
  }),

  endTest: () => set({
    endTime: Date.now(),
    isTestActive: false,
    showResults: true
  }),

  updateInput: (value) => {
    const state = get();
    // Auto-start test on first input
    if (!state.isTestActive) {
      set({
        isTestActive: true,
        startTime: Date.now()
      });
    }

    set({ inputValue: value });
    get().calculateStats();
  },

  appendWords: (newWords) => set((state) => ({
    currentTestText: [...state.currentTestText, ...newWords]
  })),

  submitWord: () => {
    const state = get();
    // Auto-start if submitting immediately (e.g. space pressed first)
    if (!state.isTestActive) {
      set({
        isTestActive: true,
        startTime: Date.now()
      });
    }

    const { currentWordIndex, inputValue, history, currentTestText } = state;
    const nextIndex = currentWordIndex + 1;

    // Save current input to history (trimmed of the trailing space if handled elsewhere, but inputValue here usually allows spaces?
    // The TypingTest component strips the space before calling submit usually, or checks for ' '.
    // Wait, TypingTest handles ' ' by calling submitWord. inputValue typically DOES NOT contain the space if we intercepted it?
    // Let's assume inputValue is what the user typed.

    const newHistory = [...history, inputValue.trim()];

    if (nextIndex < currentTestText.length) {
      set({
        currentWordIndex: nextIndex,
        inputValue: '',
        history: newHistory
      });
    } else {
      // Test completed
      set({
        endTime: Date.now(),
        isTestActive: false,
        showResults: true,
        history: newHistory
      });
      get().calculateStats();
    }
  },

  backspaceWord: () => {
    const state = get();
    // Only allow backspace if we have history and the current input is empty
    // (The component should check input empty, but we can check too or just execute)
    if (state.currentWordIndex > 0 && state.history.length > 0) {
      const newHistory = [...state.history];
      const prevWord = newHistory.pop();

      set({
        currentWordIndex: state.currentWordIndex - 1,
        inputValue: prevWord,
        history: newHistory,
        // We might want to remove the last error tracking if we were tracking specific errors
        // But calculateStats recalculates everything based on history anyway.
      });
      get().calculateStats();
    }
  },

  calculateStats: () => {
    const state = get();
    if (!state.startTime) return;

    const timeElapsed = (state.endTime || Date.now()) - state.startTime;
    const timeInMinutes = timeElapsed / 60000;

    // Calculate detailed character stats
    let correct = 0;
    let incorrect = 0;
    let extra = 0;
    let missed = 0;
    let totalCharsTyped = 0;

    // Check history (completed words)
    state.history.forEach((typedWord, i) => {
      const targetWord = state.currentTestText[i];
      if (targetWord) {
        // Correct & Incorrect
        for (let j = 0; j < Math.min(typedWord.length, targetWord.length); j++) {
          if (typedWord[j] === targetWord[j]) correct++;
          else incorrect++;
        }
        // Extra
        if (typedWord.length > targetWord.length) {
          extra += typedWord.length - targetWord.length;
        }
        // Missed (if word was submitted/skipped without completing)
        if (typedWord.length < targetWord.length) {
          missed += targetWord.length - typedWord.length;
        }
      }
      totalCharsTyped += typedWord.length + 1; // +1 space
    });

    // Current word (in progress)
    const currentWord = state.currentTestText[state.currentWordIndex] || '';
    const currentInput = state.inputValue;
    totalCharsTyped += currentInput.length;

    for (let i = 0; i < Math.min(currentInput.length, currentWord.length); i++) {
      if (currentInput[i] === currentWord[i]) correct++;
      else incorrect++;
    }
    if (currentInput.length > currentWord.length) {
      extra += currentInput.length - currentWord.length;
    }
    // Note: We don't count "missed" for the current word as it's not finished yet

    // Calculate Raw WPM
    const rawWpm = timeInMinutes > 0 ? (totalCharsTyped / 5) / timeInMinutes : 0;

    // Accuracy Calculation
    // Standard formula: (Total - Incorrect) / Total * 100? Or Correct / Total?
    // Monkeytype uses (Correct chars) / (Correct + Incorrect + Extra + Missed)? 
    // Or just (Correct / Total Keypresses)?
    // Let's use: Correct / (Correct + Incorrect + Extra + Missed) * 100
    // Actually standard is often (Net WPM) logic.
    // Let's stick to simple: (Correct / (Correct + Incorrect + Extra)) * 100 for accuracy of typing.
    // "Missed" counts against completion but maybe not accuracy of pressed keys?
    // Let's use: Correct / (Correct + Incorrect + Extra) * 100.
    const totalEntries = correct + incorrect + extra;
    const accuracy = totalEntries > 0 ? (correct / totalEntries) * 100 : 0;

    const wpm = rawWpm * (accuracy / 100);

    set({
      rawWpm: parseFloat(rawWpm.toFixed(2)),
      accuracy: parseFloat(accuracy.toFixed(2)),
      wpm: parseFloat(wpm.toFixed(2)),
      correctChars: correct,
      incorrectChars: incorrect,
      extraChars: extra,
      missedChars: missed
    });
  },

  setShowResults: (show) => set({ showResults: show }),

  setSessionId: (sessionId) => set({ sessionId }),

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  setTestDuration: (duration) => set({ testDuration: duration }),

  addAfkDuration: (ms) => set((state) => ({ afkDuration: state.afkDuration + ms })),

  reset: () => set({
    currentWordIndex: 0,
    inputValue: '',
    history: [],
    errors: [],
    startTime: null,
    endTime: null,
    isTestActive: false,
    wpm: 0,
    rawWpm: 0,
    accuracy: 0,
    currentTestText: [],
    correctChars: 0,
    incorrectChars: 0,
    extraChars: 0,
    missedChars: 0,
    totalChars: 0,
    showResults: false,
    sessionId: null
  }),

  logWpmHistory: () => {
    const state = get();
    if (!state.isTestActive || !state.startTime) return;

    const timeElapsed = (Date.now() - state.startTime) / 1000;
    if (timeElapsed < 0) return;

    set(state => ({
      wpmHistory: [
        ...state.wpmHistory,
        {
          time: Math.floor(timeElapsed),
          wpm: state.wpm,
          raw: state.rawWpm,
          error: state.errors ? state.errors.length : 0
        }
      ]
    }));
  }
}));