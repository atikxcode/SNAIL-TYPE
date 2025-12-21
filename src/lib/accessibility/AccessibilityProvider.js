// lib/accessibility/AccessibilityProvider.js
// Accessibility provider component for the typing application

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  getHighContrastMode,
  getAccessibilitySettings,
  initializeFocusVisible,
  SkipLink,
  getLiveAnnouncer
} from './accessibilityUtils';

const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    highContrast: false,
    reducedMotion: false,
    screenReader: false,
  });

  // Initialize accessibility features
  useEffect(() => {
    // Initialize focus visible
    initializeFocusVisible();

    // Initialize high contrast mode
    const highContrast = getHighContrastMode();
    highContrast.initialize();

    // Listen for reduced motion preference
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleReducedMotionChange = (e) => {
        setSettings(prev => ({
          ...prev,
          reducedMotion: e.matches
        }));
      };

      handleReducedMotionChange(mediaQuery);
      mediaQuery.addEventListener('change', handleReducedMotionChange);

      // Initialize settings
      const settings = getAccessibilitySettings();
      settings.initialize();

      return () => {
        mediaQuery.removeEventListener('change', handleReducedMotionChange);
      };
    }
  }, []);

  // Toggle high contrast mode
  const toggleHighContrast = () => {
    const newHighContrast = !settings.highContrast;
    setSettings(prev => ({
      ...prev,
      highContrast: newHighContrast
    }));

    const accessibilitySettings = getAccessibilitySettings();
    accessibilitySettings.updateSetting('highContrast', newHighContrast);

    const highContrast = getHighContrastMode();
    if (newHighContrast) {
      highContrast.enable();
    } else {
      highContrast.disable();
    }
  };

  const contextValue = {
    settings,
    toggleHighContrast,
    isHighContrast: settings.highContrast,
    isReducedMotion: settings.reducedMotion,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <SkipLink />
      {children}
    </AccessibilityContext.Provider>
  );
};

/**
 * Accessibility-aware button component
 */
export const AccessibleButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  ariaLabel,
  ...props 
}) => {
  const buttonClasses = {
    primary: 'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    secondary: 'px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
    danger: 'px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${buttonClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Accessibility-aware input component
 */
export const AccessibleInput = ({ 
  label, 
  id, 
  type = 'text', 
  required = false,
  error,
  ...props 
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full p-2 border ${
          error 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
        } rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Accessibility-aware modal component
 */
export const AccessibleModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  role = 'dialog',
  labelledBy,
  describedBy 
}) => {
  if (!isOpen) return null;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      aria-modal="true"
      role={role}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        role="document"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 
              id={labelledBy}
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div id={describedBy}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};