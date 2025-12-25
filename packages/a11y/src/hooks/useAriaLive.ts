import { useRef, useEffect, useCallback } from 'react';
import { getLiveRegionManager } from '../live-region';
import { Politeness } from '../types';

interface UseAriaLiveOptions {
  politeness?: Politeness;
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all' | 'additions text';
}

/**
 * Hook for managing ARIA live regions
 */
export function useAriaLive(regionName: string, options: UseAriaLiveOptions = {}) {
  const { politeness = 'polite', atomic = true, relevant } = options;
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      getLiveRegionManager().createRegion(regionName, {
        politeness,
        atomic,
        relevant,
      });
      isInitialized.current = true;
    }
  }, [regionName, politeness, atomic, relevant]);

  const announce = useCallback(
    (message: string) => {
      getLiveRegionManager().announce(regionName, message);
    },
    [regionName]
  );

  const clear = useCallback(() => {
    getLiveRegionManager().clear(regionName);
  }, [regionName]);

  return { announce, clear };
}

/**
 * Hook for status announcements
 */
export function useStatusAnnouncement() {
  const announce = useCallback((message: string) => {
    getLiveRegionManager().status(message);
  }, []);

  return announce;
}

/**
 * Hook for alert announcements
 */
export function useAlertAnnouncement() {
  const announce = useCallback((message: string) => {
    getLiveRegionManager().alert(message);
  }, []);

  return announce;
}

/**
 * Hook for log announcements
 */
export function useLogAnnouncement() {
  const announce = useCallback((message: string) => {
    getLiveRegionManager().log(message);
  }, []);

  return announce;
}

/**
 * Hook that returns props for an inline live region
 */
export function useInlineLiveRegion(options: UseAriaLiveOptions = {}) {
  const { politeness = 'polite', atomic = true, relevant } = options;

  return {
    'aria-live': politeness,
    'aria-atomic': atomic,
    ...(relevant && { 'aria-relevant': relevant }),
  };
}
