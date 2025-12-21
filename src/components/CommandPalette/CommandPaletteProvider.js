// components/CommandPalette/CommandPaletteProvider.js

'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import CommandPalette from './CommandPalette';

const CommandPaletteContext = createContext();

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
};

export const CommandPaletteProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState([]);

  // Register commands
  const registerCommands = useCallback((newCommands) => {
    setCommands(prev => [...prev, ...newCommands]);
  }, []);

  // Open the command palette
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close the command palette
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Toggle the command palette
  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Context value
  const value = useMemo(() => ({
    isOpen,
    open,
    close,
    toggle,
    registerCommands,
    commands
  }), [isOpen, open, close, toggle, registerCommands, commands]);

  // Register default commands
  useMemo(() => {
    registerCommands([
      {
        id: 'settings',
        name: 'Open Settings',
        description: 'Adjust appearance, sound, and behavior settings',
        category: 'Navigation',
        action: () => {
          // In a real app, this would navigate to settings
          window.location.hash = '#settings';
        },
        shortcut: '⌘,'
      },
      {
        id: 'dashboard',
        name: 'Go to Dashboard',
        description: 'View your typing statistics and progress',
        category: 'Navigation',
        action: () => {
          window.location.href = '/dashboard';
        },
        shortcut: '⌘D'
      },
      {
        id: 'leaderboard',
        name: 'View Leaderboard',
        description: 'See top typists and rankings',
        category: 'Navigation',
        action: () => {
          window.location.href = '/leaderboard';
        }
      },
      {
        id: 'new-test',
        name: 'Start New Test',
        description: 'Begin a new typing test',
        category: 'Actions',
        action: () => {
          // This would trigger a new test
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('startNewTest'));
          }
        },
        shortcut: 'Tab+Enter'
      },
      {
        id: 'toggle-dark-mode',
        name: 'Toggle Dark Mode',
        description: 'Switch between light and dark themes',
        category: 'Appearance',
        action: () => {
          // Toggle dark mode
          document.documentElement.classList.toggle('dark');
        },
        shortcut: '⌘⇧D'
      },
      {
        id: 'help',
        name: 'Help & Support',
        description: 'Get help with using the application',
        category: 'Support',
        action: () => {
          window.location.href = '/help';
        }
      },
      {
        id: 'about',
        name: 'About Typing Master',
        description: 'Learn about this application',
        category: 'Support',
        action: () => {
          window.location.href = '/about';
        }
      }
    ]);
  }, [registerCommands]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette 
        isOpen={isOpen} 
        onClose={close} 
        commands={commands} 
      />
    </CommandPaletteContext.Provider>
  );
};