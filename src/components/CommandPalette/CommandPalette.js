// components/CommandPalette/CommandPalette.js

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

const CommandPalette = ({ isOpen, onClose, commands = [] }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    
    return commands.filter(command => 
      command.name.toLowerCase().includes(query.toLowerCase()) ||
      (command.description && command.description.toLowerCase().includes(query.toLowerCase())) ||
      (command.category && command.category.toLowerCase().includes(query.toLowerCase()))
    );
  }, [commands, query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
      case 'Backspace':
        if (query === '' && selectedIndex > 0) {
          // If query is empty and user presses backspace, close the palette
          onClose();
        }
        break;
    }
  }, [isOpen, filteredCommands, selectedIndex, query, onClose]);

  // Add keyboard event listener
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  // Reset state when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Close when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col">
        {/* Search input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="w-full p-3 pl-10 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ↑↓ to navigate • Enter to select • Esc to close
          </div>
        </div>

        {/* Command list */}
        <div className="overflow-y-auto flex-grow">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No commands found
            </div>
          ) : (
            <ul>
              {filteredCommands.map((command, index) => (
                <li 
                  key={command.id || index}
                  className={`p-3 cursor-pointer flex items-center ${
                    index === selectedIndex 
                      ? 'bg-blue-100 dark:bg-blue-900' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    command.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {command.name}
                    </div>
                    {command.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {command.description}
                      </div>
                    )}
                  </div>
                  {command.shortcut && (
                    <kbd className="ml-2 px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded">
                      {command.shortcut}
                    </kbd>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CommandPalette;