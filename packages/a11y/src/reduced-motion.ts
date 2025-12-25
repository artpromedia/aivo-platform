/**
 * Reduced Motion Utilities
 *
 * Provides utilities for respecting user's motion preferences
 */

import { MotionPreference } from './types';

/**
 * Check if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

/**
 * Get the user's motion preference
 */
export function getMotionPreference(): MotionPreference {
  if (typeof window === 'undefined') return 'no-preference';

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches ? 'reduce' : 'no-preference';
}

/**
 * Subscribe to motion preference changes
 */
export function subscribeToMotionPreference(
  callback: (preference: MotionPreference) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'reduce' : 'no-preference');
  };

  mediaQuery.addEventListener('change', handler);

  // Call immediately with current value
  callback(mediaQuery.matches ? 'reduce' : 'no-preference');

  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}

/**
 * Get motion-safe duration
 */
export function getMotionSafeDuration(duration: number): number {
  return prefersReducedMotion() ? 0 : duration;
}

/**
 * Get motion-safe animation config
 */
export function getMotionSafeAnimation<T extends object>(
  animation: T,
  reducedAnimation?: Partial<T>
): T {
  if (!prefersReducedMotion()) {
    return animation;
  }

  if (reducedAnimation) {
    return { ...animation, ...reducedAnimation };
  }

  // Default: remove duration
  return { ...animation, duration: 0 } as T;
}

/**
 * Get motion-safe transition
 */
export function getMotionSafeTransition(transition: string): string {
  if (prefersReducedMotion()) {
    // Replace duration with 0ms
    return transition.replace(
      /(\d+(\.\d+)?)(ms|s)/g,
      (_, value, decimal, unit) => `0${unit}`
    );
  }
  return transition;
}

/**
 * CSS for motion-safe animations
 */
export const motionSafeCSS = `
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

/**
 * Inject motion-safe CSS styles
 */
export function injectMotionSafeStyles(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'a11y-motion-safe-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = motionSafeCSS;
  document.head.appendChild(style);
}

/**
 * Create a motion-safe animation wrapper
 */
export function createMotionSafeWrapper<T extends (...args: unknown[]) => void>(
  animate: T,
  skipAnimation: T
): T {
  return ((...args: unknown[]) => {
    if (prefersReducedMotion()) {
      return skipAnimation(...args);
    }
    return animate(...args);
  }) as T;
}

/**
 * High Contrast Mode Detection
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for Windows High Contrast Mode
  const forcedColors = window.matchMedia('(forced-colors: active)');
  if (forcedColors.matches) return true;

  // Check for prefers-contrast (modern browsers)
  const prefersMore = window.matchMedia('(prefers-contrast: more)');
  return prefersMore.matches;
}

/**
 * Get contrast preference
 */
export function getContrastPreference(): 'no-preference' | 'more' | 'less' | 'custom' {
  if (typeof window === 'undefined') return 'no-preference';

  if (window.matchMedia('(forced-colors: active)').matches) {
    return 'custom';
  }

  if (window.matchMedia('(prefers-contrast: more)').matches) {
    return 'more';
  }

  if (window.matchMedia('(prefers-contrast: less)').matches) {
    return 'less';
  }

  return 'no-preference';
}

/**
 * Subscribe to contrast preference changes
 */
export function subscribeToContrastPreference(
  callback: (preference: 'no-preference' | 'more' | 'less' | 'custom') => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const forcedColors = window.matchMedia('(forced-colors: active)');
  const prefersMore = window.matchMedia('(prefers-contrast: more)');
  const prefersLess = window.matchMedia('(prefers-contrast: less)');

  const handler = () => {
    callback(getContrastPreference());
  };

  forcedColors.addEventListener('change', handler);
  prefersMore.addEventListener('change', handler);
  prefersLess.addEventListener('change', handler);

  // Call immediately with current value
  callback(getContrastPreference());

  return () => {
    forcedColors.removeEventListener('change', handler);
    prefersMore.removeEventListener('change', handler);
    prefersLess.removeEventListener('change', handler);
  };
}

/**
 * Color scheme preference detection
 */
export function getColorSchemePreference(): 'light' | 'dark' | 'no-preference' {
  if (typeof window === 'undefined') return 'no-preference';

  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }

  return 'no-preference';
}

/**
 * Subscribe to color scheme preference changes
 */
export function subscribeToColorScheme(
  callback: (scheme: 'light' | 'dark' | 'no-preference') => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const lightQuery = window.matchMedia('(prefers-color-scheme: light)');

  const handler = () => {
    callback(getColorSchemePreference());
  };

  darkQuery.addEventListener('change', handler);
  lightQuery.addEventListener('change', handler);

  // Call immediately with current value
  callback(getColorSchemePreference());

  return () => {
    darkQuery.removeEventListener('change', handler);
    lightQuery.removeEventListener('change', handler);
  };
}
