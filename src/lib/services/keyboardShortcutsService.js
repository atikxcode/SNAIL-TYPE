// lib/services/keyboardShortcutsService.js
import { useEffect } from 'react';

// Define all available keyboard shortcuts
const SHORTCUTS = {
  GLOBAL_SHORTCUTS: {
    'Tab+Enter': {
      id: 'restart_test',
      description: 'Restart current test',
      category: 'global',
      action: 'restart_current_test'
    },
    'Escape': {
      id: 'abandon_test',
      description: 'Abandon current test',
      category: 'global',
      action: 'abandon_current_test',
      modal: 'confirm_abandon'
    },
    'Control+k, Meta+k': {
      id: 'open_command_palette',
      description: 'Open command palette',
      category: 'global',
      action: 'open_command_palette'
    },
    'Control+d, Meta+d': {
      id: 'toggle_dark_mode',
      description: 'Toggle dark mode',
      category: 'global',
      action: 'toggle_dark_mode'
    },
    'Control+,': {
      id: 'open_settings',
      description: 'Open settings',
      category: 'global',
      action: 'open_settings'
    }
  },
  TYPING_SHORTCUTS: {
    'Space': {
      id: 'space_skip_error',
      description: 'Press space to skip current word when using skip mode',
      category: 'typing',
      action: 'skip_current_word'
    },
    'Tab': {
      id: 'focus_input',
      description: 'Focus on typing input',
      category: 'typing',
      action: 'focus_typing_input'
    }
  },
  NAVIGATION_SHORTCUTS: {
    'ArrowUp': {
      id: 'nav_dashboard',
      description: 'Go to dashboard',
      category: 'navigation',
      action: 'navigate_to_dashboard'
    },
    'ArrowDown': {
      id: 'nav_leaderboard',
      description: 'Go to leaderboard',
      category: 'navigation',
      action: 'navigate_to_leaderboard'
    },
    'ArrowLeft': {
      id: 'nav_profile',
      description: 'Go to profile',
      category: 'navigation',
      action: 'navigate_to_profile'
    },
    'ArrowRight': {
      id: 'nav_home',
      description: 'Go to home',
      category: 'navigation',
      action: 'navigate_to_home'
    }
  }
};

// Flat list of all shortcuts for easier processing
const ALL_SHORTCUTS = {
  ...SHORTCUTS.GLOBAL_SHORTCUTS,
  ...SHORTCUTS.TYPING_SHORTCUTS,
  ...SHORTCUTS.NAVIGATION_SHORTCUTS
};

/**
 * Hook to handle keyboard shortcuts in the application
 */
export function useKeyboardShortcuts(onShortcutExecute) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't intercept shortcuts if user is typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        // Special exception for Tab that's meant to restart the test, but only if it's not focusing an element
        if (event.key === 'Tab' && !event.shiftKey) {
          event.preventDefault();
          // In typing test context, this could be handled specially
          onShortcutExecute && onShortcutExecute('restart_current_test');
          return;
        }
        return;
      }
      
      // Construct the key combination string
      let keyCombo = event.key;
      if (event.ctrlKey) keyCombo = 'Control+' + keyCombo;
      if (event.metaKey) keyCombo = 'Meta+' + keyCombo;  // Cmd key on Mac
      if (event.altKey) keyCombo = 'Alt+' + keyCombo;
      if (event.shiftKey) keyCombo = 'Shift+' + keyCombo;
      
      // Check for exact matches first
      if (ALL_SHORTCUTS[keyCombo]) {
        event.preventDefault();
        onShortcutExecute && onShortcutExecute(ALL_SHORTCUTS[keyCombo].action);
        return;
      }
      
      // Check for alternative combinations (e.g. Ctrl+k vs Cmd+k)
      for (const [combo, shortcut] of Object.entries(ALL_SHORTCUTS)) {
        if (combo.includes(',')) {
          // This is a comma-separated list of equivalent shortcuts
          const alternatives = combo.split(',').map(c => c.trim());
          if (alternatives.includes(keyCombo)) {
            event.preventDefault();
            onShortcutExecute && onShortcutExecute(shortcut.action);
            return;
          }
        }
      }
      
      // Handle special cases with modifiers
      if (event.key === 'Escape') {
        event.preventDefault();
        onShortcutExecute && onShortcutExecute('abandon_current_test');
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        onShortcutExecute && onShortcutExecute('navigate_to_dashboard');
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        onShortcutExecute && onShortcutExecute('navigate_to_leaderboard');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onShortcutExecute && onShortcutExecute('navigate_to_profile');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onShortcutExecute && onShortcutExecute('navigate_to_home');
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onShortcutExecute]);
}

/**
 * Get shortcuts for a specific category
 */
export function getShortcutsByCategory(category) {
  if (SHORTCUTS[`${category.toUpperCase()}_SHORTCUTS`]) {
    return SHORTCUTS[`${category.toUpperCase()}_SHORTCUTS`];
  }
  return {};
}

/**
 * Get all shortcuts
 */
export function getAllShortcuts() {
  return ALL_SHORTCUTS;
}

/**
 * Get shortcut for displaying in UI
 */
export function getShortcutsForDisplay() {
  const categories = [];
  
  for (const [categoryKey, shortcuts] of Object.entries(SHORTCUTS)) {
    const categoryName = categoryKey.replace('_SHORTCUTS', '').toLowerCase();
    const shortcutList = Object.entries(shortcuts).map(([combo, shortcut]) => ({
      ...shortcut,
      combo,
      keys: combo.split(',').map(k => k.trim())
    }));
    
    categories.push({
      name: categoryName,
      shortcuts: shortcutList
    });
  }
  
  return categories;
}

/**
 * Shortcut component to display available shortcuts
 */
export function KeyboardShortcutsGuide() {
  const shortcutCategories = getShortcutsForDisplay();
  
  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto z-50">
      <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Keyboard Shortcuts</h3>
      <div className="space-y-4">
        {shortcutCategories.map((category) => (
          <div key={category.name}>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">{category.name}</h4>
            <ul className="space-y-2">
              {category.shortcuts.map((shortcut) => (
                <li key={shortcut.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{shortcut.description}</span>
                  <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                    {shortcut.keys.map((key, idx) => (
                      <span key={idx} className="inline-flex items-center">
                        {idx > 0 && '+'}
                        {key.includes('+') ? key.split('+').join(' + ') : key}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

// Export a function to register shortcut handlers
export async function registerShortcutHandlers(userId, context = 'global') {
  try {
    // In a real implementation, we might want to track which shortcuts users use
    // and potentially customize the defaults based on user preferences
    const userPreferences = await getUserShortcutPreferences(userId);
    
    return {
      success: true,
      registeredShortcuts: ALL_SHORTCUTS,
      userPreferences: userPreferences || {},
      context
    };
  } catch (error) {
    console.error('Error registering shortcut handlers:', error);
    return {
      success: false,
      error: error.message,
      registeredShortcuts: ALL_SHORTCUTS,
      userPreferences: {},
      context
    };
  }
}

/**
 * Get user's shortcut preferences
 */
async function getUserShortcutPreferences(userId) {
  try {
    // In a real implementation, this would fetch from the database
    // For now, return a template
    return {
      enabled: true,
      customShortcuts: [],
      disabledShortcuts: []
    };
  } catch (error) {
    console.error('Error getting user shortcut preferences:', error);
    return null;
  }
}

/**
 * Update user's shortcut preferences
 */
export async function updateUserShortcutPreferences(userId, preferences) {
  try {
    // In a real implementation, this would update the database
    // For now, we'll just return success
    return {
      success: true,
      preferences: {
        enabled: true,
        ...preferences
      }
    };
  } catch (error) {
    console.error('Error updating user shortcut preferences:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export constants
export const KeyboardShortcutConstants = {
  RESTART_TEST: 'restart_current_test',
  ABANDON_TEST: 'abandon_current_test',
  TOGGLE_DARK_MODE: 'toggle_dark_mode',
  OPEN_SETTINGS: 'open_settings',
  SKIP_CURRENT_WORD: 'skip_current_word',
  FOCUS_TYPING_INPUT: 'focus_typing_input',
  NAVIGATE_TO_DASHBOARD: 'navigate_to_dashboard',
  NAVIGATE_TO_LEADERBOARD: 'navigate_to_leaderboard',
  NAVIGATE_TO_PROFILE: 'navigate_to_profile',
  NAVIGATE_TO_HOME: 'navigate_to_home',
  OPEN_COMMAND_PALETTE: 'open_command_palette'
};