// lib/hooks/useCommandPalette.js

'use client';

import { useEffect } from 'react';
import { useCommandPalette } from '@/components/CommandPalette/CommandPaletteProvider';

/**
 * Hook to handle command palette keyboard shortcut (Ctrl/Cmd + K)
 */
export const useCommandPaletteShortcut = () => {
  const { toggle } = useCommandPalette();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggle]);
};

// Re-export the main hook
export { useCommandPalette };