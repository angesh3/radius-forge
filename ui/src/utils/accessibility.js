// Accessibility Utilities - RadiusForge
// Created by: Accessibility Agent (AA)
// Sprint 1: Critical Accessibility Fixes
// WCAG 2.1 AA Compliance Utilities

import designSystem from '../theme/designSystem';

const { colors, touchTargets, focusStyles } = designSystem;

/**
 * Calculate color contrast ratio between two colors
 * @param {string} foreground - Foreground color in hex
 * @param {string} background - Background color in hex
 * @returns {number} Contrast ratio
 */
export const getContrastRatio = (foreground, background) => {
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  // Calculate relative luminance
  const getLuminance = (rgb) => {
    const { r, g, b } = rgb;
    const sRGB = [r, g, b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };
  
  const rgb1 = hexToRgb(foreground);
  const rgb2 = hexToRgb(background);
  
  if (!rgb1 || !rgb2) return 0;
  
  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Check if color combination meets WCAG guidelines
 * @param {string} foreground - Foreground color
 * @param {string} background - Background color
 * @param {string} level - 'AA' or 'AAA'
 * @param {boolean} largeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {boolean} Whether contrast meets guidelines
 */
export const meetsWCAGGuidelines = (foreground, background, level = 'AA', largeText = false) => {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === 'AAA') {
    return largeText ? ratio >= 4.5 : ratio >= 7;
  }
  // AA level
  return largeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * Get the best text color (black or white) for a given background
 * @param {string} backgroundColor - Background color in hex
 * @returns {string} Best text color
 */
export const getBestTextColor = (backgroundColor) => {
  const blackContrast = getContrastRatio('#000000', backgroundColor);
  const whiteContrast = getContrastRatio('#FFFFFF', backgroundColor);
  return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
};

/**
 * Generate ARIA properties for interactive elements
 * @param {Object} props - Component props
 * @returns {Object} ARIA properties
 */
export const getAriaProps = ({
  role,
  label,
  describedBy,
  expanded,
  selected,
  pressed,
  disabled,
  hidden,
  live,
  busy,
  invalid,
  required,
  checked,
  level,
  current,
  valueNow,
  valueMin,
  valueMax,
  valueText,
  controls,
  labelledBy,
  owns,
  haspopup,
  autocomplete,
}) => {
  const ariaProps = {};
  
  if (role) ariaProps.role = role;
  if (label) ariaProps['aria-label'] = label;
  if (describedBy) ariaProps['aria-describedby'] = describedBy;
  if (expanded !== undefined) ariaProps['aria-expanded'] = expanded;
  if (selected !== undefined) ariaProps['aria-selected'] = selected;
  if (pressed !== undefined) ariaProps['aria-pressed'] = pressed;
  if (disabled !== undefined) ariaProps['aria-disabled'] = disabled;
  if (hidden !== undefined) ariaProps['aria-hidden'] = hidden;
  if (live) ariaProps['aria-live'] = live;
  if (busy !== undefined) ariaProps['aria-busy'] = busy;
  if (invalid !== undefined) ariaProps['aria-invalid'] = invalid;
  if (required !== undefined) ariaProps['aria-required'] = required;
  if (checked !== undefined) ariaProps['aria-checked'] = checked;
  if (level) ariaProps['aria-level'] = level;
  if (current) ariaProps['aria-current'] = current;
  if (valueNow !== undefined) ariaProps['aria-valuenow'] = valueNow;
  if (valueMin !== undefined) ariaProps['aria-valuemin'] = valueMin;
  if (valueMax !== undefined) ariaProps['aria-valuemax'] = valueMax;
  if (valueText) ariaProps['aria-valuetext'] = valueText;
  if (controls) ariaProps['aria-controls'] = controls;
  if (labelledBy) ariaProps['aria-labelledby'] = labelledBy;
  if (owns) ariaProps['aria-owns'] = owns;
  if (haspopup) ariaProps['aria-haspopup'] = haspopup;
  if (autocomplete) ariaProps['aria-autocomplete'] = autocomplete;
  
  return ariaProps;
};

/**
 * Generate keyboard navigation handlers
 * @param {Object} handlers - Event handlers
 * @returns {Object} Keyboard event props
 */
export const getKeyboardProps = ({
  onEnter,
  onSpace,
  onEscape,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onTab,
  onHome,
  onEnd,
  onPageUp,
  onPageDown,
}) => {
  return {
    onKeyDown: (event) => {
      switch (event.key) {
        case 'Enter':
          if (onEnter) {
            event.preventDefault();
            onEnter(event);
          }
          break;
        case ' ':
        case 'Space':
          if (onSpace) {
            event.preventDefault();
            onSpace(event);
          }
          break;
        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape(event);
          }
          break;
        case 'ArrowUp':
          if (onArrowUp) {
            event.preventDefault();
            onArrowUp(event);
          }
          break;
        case 'ArrowDown':
          if (onArrowDown) {
            event.preventDefault();
            onArrowDown(event);
          }
          break;
        case 'ArrowLeft':
          if (onArrowLeft) {
            event.preventDefault();
            onArrowLeft(event);
          }
          break;
        case 'ArrowRight':
          if (onArrowRight) {
            event.preventDefault();
            onArrowRight(event);
          }
          break;
        case 'Tab':
          if (onTab) {
            onTab(event);
          }
          break;
        case 'Home':
          if (onHome) {
            event.preventDefault();
            onHome(event);
          }
          break;
        case 'End':
          if (onEnd) {
            event.preventDefault();
            onEnd(event);
          }
          break;
        case 'PageUp':
          if (onPageUp) {
            event.preventDefault();
            onPageUp(event);
          }
          break;
        case 'PageDown':
          if (onPageDown) {
            event.preventDefault();
            onPageDown(event);
          }
          break;
        default:
          break;
      }
    },
  };
};

/**
 * Create focus trap for modal/dialog
 * @param {HTMLElement} container - Container element
 * @returns {Object} Focus trap methods
 */
export const createFocusTrap = (container) => {
  let previouslyFocused = null;
  
  const getFocusableElements = () => {
    const selectors = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];
    return container.querySelectorAll(selectors.join(','));
  };
  
  const trap = () => {
    previouslyFocused = document.activeElement;
    const focusableElements = getFocusableElements();
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (firstElement) {
      firstElement.focus();
    }
    
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
      
      if (e.key === 'Escape') {
        release();
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  };
  
  const release = () => {
    if (previouslyFocused && previouslyFocused.focus) {
      previouslyFocused.focus();
    }
  };
  
  return { trap, release };
};

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export const announce = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  document.body.appendChild(announcement);
  announcement.textContent = message;
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Check if element is visible in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} Whether element is visible
 */
export const isInViewport = (element) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Scroll element into view if needed
 * @param {HTMLElement} element - Element to scroll to
 * @param {Object} options - Scroll options
 */
export const scrollIntoViewIfNeeded = (element, options = {}) => {
  if (!isInViewport(element)) {
    element.scrollIntoView({
      behavior: options.behavior || 'smooth',
      block: options.block || 'center',
      inline: options.inline || 'nearest',
    });
  }
};

/**
 * Generate skip navigation links
 * @returns {Array} Skip link configurations
 */
export const getSkipLinks = () => [
  { id: 'main-content', label: 'Skip to main content' },
  { id: 'navigation', label: 'Skip to navigation' },
  { id: 'search', label: 'Skip to search' },
  { id: 'footer', label: 'Skip to footer' },
];

/**
 * Format time for screen readers
 * @param {Date|string} date - Date to format
 * @returns {Object} Formatted date with ARIA label
 */
export const formatTimeForScreenReader = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const display = dateObj.toLocaleDateString();
  const ariaLabel = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
  
  return { display, ariaLabel };
};

/**
 * Check if user prefers reduced motion
 * @returns {boolean} Whether reduced motion is preferred
 */
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get focus styles for custom components
 * @returns {Object} Focus style object
 */
export const getFocusStyles = () => ({
  '&:focus-visible': {
    outline: focusStyles.outline,
    outlineOffset: focusStyles.outlineOffset,
    borderRadius: focusStyles.borderRadius,
  },
});

/**
 * Ensure minimum touch target size
 * @param {number} size - Current size
 * @returns {number} Adjusted size
 */
export const ensureTouchTarget = (size) => {
  return Math.max(size, touchTargets.minimum);
};

// Export accessibility checklist for components
export const accessibilityChecklist = {
  interactive: [
    'Has proper role attribute',
    'Has accessible name (aria-label or visible label)',
    'Keyboard accessible (focusable and operable)',
    'Has visible focus indicator',
    'Minimum touch target size (44x44px)',
    'Proper color contrast (4.5:1 for normal text)',
    'State changes announced to screen readers',
  ],
  forms: [
    'All inputs have labels',
    'Required fields marked with aria-required',
    'Error messages associated with aria-describedby',
    'Form validation accessible',
    'Instructions provided for complex inputs',
    'Fieldsets and legends for grouped inputs',
  ],
  content: [
    'Proper heading hierarchy',
    'Images have alt text',
    'Links have descriptive text',
    'Tables have headers and captions',
    'Lists use semantic HTML',
    'Language attribute set',
  ],
  navigation: [
    'Skip links provided',
    'Breadcrumbs marked with nav and aria-label',
    'Current page indicated with aria-current',
    'Menu items keyboard navigable',
    'Submenu behavior predictable',
  ],
};

export default {
  getContrastRatio,
  meetsWCAGGuidelines,
  getBestTextColor,
  getAriaProps,
  getKeyboardProps,
  createFocusTrap,
  announce,
  isInViewport,
  scrollIntoViewIfNeeded,
  getSkipLinks,
  formatTimeForScreenReader,
  prefersReducedMotion,
  getFocusStyles,
  ensureTouchTarget,
  accessibilityChecklist,
};