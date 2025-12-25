import { useState, useEffect, useMemo } from 'react';
import {
  prefersReducedMotion,
  subscribeToMotionPreference,
  getMotionPreference,
} from '../reduced-motion';
import { MotionPreference } from '../types';

/**
 * Hook to detect user's reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());

  useEffect(() => {
    return subscribeToMotionPreference((preference) => {
      setReducedMotion(preference === 'reduce');
    });
  }, []);

  return reducedMotion;
}

/**
 * Hook to get the motion preference
 */
export function useMotionPreference(): MotionPreference {
  const [preference, setPreference] = useState<MotionPreference>(() =>
    getMotionPreference()
  );

  useEffect(() => {
    return subscribeToMotionPreference(setPreference);
  }, []);

  return preference;
}

/**
 * Get motion-safe animation duration
 */
export function useMotionSafeDuration(duration: number): number {
  const reducedMotion = useReducedMotion();
  return reducedMotion ? 0 : duration;
}

/**
 * Get motion-safe animation config
 */
export function useMotionSafeAnimation<T extends object>(
  animation: T,
  reducedAnimation?: Partial<T>
): T {
  const reducedMotion = useReducedMotion();

  return useMemo(() => {
    if (!reducedMotion) {
      return animation;
    }

    if (reducedAnimation) {
      return { ...animation, ...reducedAnimation };
    }

    // Default: set duration to 0
    return { ...animation, duration: 0 } as T;
  }, [reducedMotion, animation, reducedAnimation]);
}

/**
 * Hook for motion-safe transitions
 */
export function useMotionSafeTransition(
  transition: string,
  reducedTransition?: string
): string {
  const reducedMotion = useReducedMotion();

  return useMemo(() => {
    if (!reducedMotion) {
      return transition;
    }

    if (reducedTransition) {
      return reducedTransition;
    }

    // Replace duration with 0ms
    return transition.replace(
      /(\d+(\.\d+)?)(ms|s)/g,
      (_, __, ___, unit) => `0${unit}`
    );
  }, [reducedMotion, transition, reducedTransition]);
}

/**
 * Hook for motion-safe styles
 */
export function useMotionSafeStyles<T extends React.CSSProperties>(
  styles: T,
  reducedStyles?: Partial<T>
): T {
  const reducedMotion = useReducedMotion();

  return useMemo(() => {
    if (!reducedMotion) {
      return styles;
    }

    const safeStyles = { ...styles };

    // Remove animation and transition properties by default
    if (!reducedStyles) {
      delete (safeStyles as Record<string, unknown>).animation;
      delete (safeStyles as Record<string, unknown>).animationDuration;
      delete (safeStyles as Record<string, unknown>).transition;
      delete (safeStyles as Record<string, unknown>).transitionDuration;
      return safeStyles;
    }

    return { ...safeStyles, ...reducedStyles };
  }, [reducedMotion, styles, reducedStyles]);
}
