// lib/accessibility/accessibilityUtils.js
// Accessibility utilities for the typing application

/**
 * Implements accessibility features as per the project specification:
 * - Keyboard navigation
 * - Screen reader support
 * - Color contrast compliance
 * - ARIA labels and attributes
 */

/**
 * Focus trap utility to keep keyboard focus within a specific element
 */
export class FocusTrap {
  constructor(element) {
    this.element = element;
    this.focusableElements = null;
    this.firstFocusableElement = null;
    this.lastFocusableElement = null;
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  activate() {
    if (typeof document === 'undefined') return;

    // Get all focusable elements within the element
    this.focusableElements = this.element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (this.focusableElements.length === 0) return;

    this.firstFocusableElement = this.focusableElements[0];
    this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1];

    // Set focus to first element
    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    }

    // Add event listener
    document.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  handleKeyDown(e) {
    if (e.key !== 'Tab') return;

    if (typeof document === 'undefined') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstFocusableElement) {
        if (this.lastFocusableElement) this.lastFocusableElement.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastFocusableElement) {
        if (this.firstFocusableElement) this.firstFocusableElement.focus();
        e.preventDefault();
      }
    }
  }
}

/**
 * Skip link for screen readers to skip to main content
 */
export function SkipLink({ targetId = 'main-content' }) {
  return (
    <a
      href={`#${targetId}`}
      className="absolute left-4 top-4 bg-blue-600 text-white px-4 py-2 -translate-y-full focus:translate-y-0 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 z-50"
    >
      Skip to main content
    </a>
  );
}

/**
 * Announce text to screen readers
 */
export class LiveAnnouncer {
  constructor() {
    this.announcementContainer = null;
    // Don't create container in constructor - do it later when needed
  }

  createContainer() {
    if (typeof document === 'undefined') return; // Server-side check

    // Create a visually hidden container for screen reader announcements
    this.announcementContainer = document.createElement('div');
    Object.assign(this.announcementContainer.style, {
      position: 'absolute',
      top: '-9999px',
      left: '-9999px',
      height: '1px',
      width: '1px',
      overflow: 'hidden',
      clip: 'rect(1px, 1px, 1px, 1px)',
    });
    this.announcementContainer.setAttribute('aria-live', 'polite');
    this.announcementContainer.setAttribute('aria-atomic', 'true');

    document.body.appendChild(this.announcementContainer);
  }

  announce(message) {
    // Create container if it doesn't exist (client-side only)
    if (!this.announcementContainer && typeof document !== 'undefined') {
      this.createContainer();
    }

    if (!this.announcementContainer) return; // If still no container, return

    // Clear previous announcement
    this.announcementContainer.textContent = '';

    // Add a small delay to ensure the screen reader processes the change
    setTimeout(() => {
      if (this.announcementContainer) {
        this.announcementContainer.textContent = message;
      }
    }, 100);
  }

  clear() {
    if (this.announcementContainer) {
      this.announcementContainer.textContent = '';
    }
  }
}

// Don't instantiate on module load - do it when needed
let liveAnnouncerInstance = null;

export const getLiveAnnouncer = () => {
  if (typeof window !== 'undefined' && !liveAnnouncerInstance) {
    liveAnnouncerInstance = new LiveAnnouncer();
  }
  return liveAnnouncerInstance;
};

/**
 * Check color contrast ratio
 * Returns true if contrast ratio meets WCAG AA standards (4.5:1)
 */
export function checkColorContrast(foregroundColor, backgroundColor) {
  // Convert hex to RGB
  const fg = hexToRgb(foregroundColor);
  const bg = hexToRgb(backgroundColor);

  // Calculate relative luminance
  const fgLuminance = calculateLuminance(fg);
  const bgLuminance = calculateLuminance(bg);

  // Calculate contrast ratio
  const ratio = fgLuminance > bgLuminance
    ? (fgLuminance + 0.05) / (bgLuminance + 0.05)
    : (bgLuminance + 0.05) / (fgLuminance + 0.05);

  return ratio >= 4.5; // WCAG AA standard
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function calculateLuminance(rgb) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Accessibility checker for components
 */
export function useAccessibilityCheck() {
  // In a real implementation, this would run accessibility audits
  // For now, we'll just return a mock implementation
  return {
    checkFocusManagement: () => true,
    checkColorContrast: (fg, bg) => checkColorContrast(fg, bg),
    checkAriaLabels: () => true,
    runAudit: () => ({
      issues: [],
      score: 100,
    })
  };
}

/**
 * High contrast mode utility
 */
export class HighContrastMode {
  constructor() {
    this.isEnabled = false;
    this.highContrastClass = 'high-contrast';
  }

  enable() {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add(this.highContrastClass);
      this.isEnabled = true;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('highContrastMode', 'true');
    }
  }

  disable() {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove(this.highContrastClass);
      this.isEnabled = false;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('highContrastMode');
    }
  }

  toggle() {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  initialize() {
    if (typeof localStorage !== 'undefined') {
      const savedMode = localStorage.getItem('highContrastMode');
      if (savedMode === 'true') {
        this.enable();
      }
    }
  }
}

// Don't instantiate on module load - do it when needed
let highContrastModeInstance = null;

export const getHighContrastMode = () => {
  if (typeof window !== 'undefined' && !highContrastModeInstance) {
    highContrastModeInstance = new HighContrastMode();
  }
  return highContrastModeInstance;
};

/**
 * Keyboard navigation helper
 */
export function useKeyboardNavigation(itemsRef, onItemSelect) {
  const handleKeyDown = (e) => {
    if (!itemsRef.current) return;

    const items = itemsRef.current.querySelectorAll('[role="option"]');
    if (items.length === 0) return;

    const currentIndex = Array.from(items).findIndex(
      item => item === document.activeElement
    );

    let nextIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentIndex >= 0 && currentIndex < items.length) {
          onItemSelect && onItemSelect(items[currentIndex], currentIndex);
        }
        break;
      default:
        return;
    }

    if (nextIndex >= 0 && nextIndex < items.length) {
      items[nextIndex].focus();
    }
  };

  return { handleKeyDown };
}

/**
 * ARIA live region component for dynamic updates
 */
export function AriaLiveRegion({ children, mode = 'polite' }) {
  return (
    <div
      aria-live={mode}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
}

/**
 * Focus-visible polyfill for better keyboard navigation
 */
export function initializeFocusVisible() {
  // This would implement a focus-visible polyfill
  // In a real app, we'd use the actual polyfill
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
  }
}

/**
 * Accessibility settings context
 */
export class AccessibilitySettings {
  constructor() {
    this.settings = {
      highContrast: (typeof localStorage !== 'undefined') && (localStorage.getItem('highContrastMode') === 'true'),
      reducedMotion: (typeof window !== 'undefined') && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      screenReader: false, // Would be detected by assistive technology
    };
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`accessibility_${key}`, value);
    }

    // Apply setting
    if (key === 'highContrast') {
      if (value) {
        highContrastMode.enable();
      } else {
        highContrastMode.disable();
      }
    }
  }

  getSetting(key) {
    return this.settings[key];
  }

  initialize() {
    if (typeof localStorage !== 'undefined') {
      // Apply saved settings
      Object.keys(this.settings).forEach(key => {
        const savedValue = localStorage.getItem(`accessibility_${key}`);
        if (savedValue !== null) {
          this.updateSetting(key, savedValue === 'true');
        }
      });
    }
  }
}

// Don't instantiate on module load - do it when needed
let accessibilitySettingsInstance = null;

export const getAccessibilitySettings = () => {
  if (typeof window !== 'undefined' && !accessibilitySettingsInstance) {
    accessibilitySettingsInstance = new AccessibilitySettings();
  }
  return accessibilitySettingsInstance;
};