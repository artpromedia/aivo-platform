import { useCallback } from 'react';
import { getAnnouncer, Politeness } from '../announcer';

interface UseAnnounceReturn {
  announce: (message: string, politeness?: Politeness) => void;
  announcePolite: (message: string) => void;
  announceAssertive: (message: string) => void;
  announceError: (message: string) => void;
  announceSuccess: (message: string) => void;
  announceLoading: (isLoading: boolean, loadingMessage?: string, loadedMessage?: string) => void;
  announceRouteChange: (pageName: string) => void;
  announceProgress: (current: number, total: number, label?: string) => void;
  clear: () => void;
}

/**
 * Hook for screen reader announcements
 */
export function useAnnounce(): UseAnnounceReturn {
  const announce = useCallback(
    (message: string, politeness: Politeness = 'polite') => {
      getAnnouncer().announce(message, { politeness });
    },
    []
  );

  const announcePolite = useCallback((message: string) => {
    getAnnouncer().announcePolite(message);
  }, []);

  const announceAssertive = useCallback((message: string) => {
    getAnnouncer().announceImmediate(message);
  }, []);

  const announceError = useCallback((message: string) => {
    getAnnouncer().announceError(message);
  }, []);

  const announceSuccess = useCallback((message: string) => {
    getAnnouncer().announceSuccess(message);
  }, []);

  const announceLoading = useCallback(
    (
      isLoading: boolean,
      loadingMessage = 'Loading',
      loadedMessage = 'Content loaded'
    ) => {
      getAnnouncer().announceLoading(isLoading, loadingMessage, loadedMessage);
    },
    []
  );

  const announceRouteChange = useCallback((pageName: string) => {
    getAnnouncer().announceRouteChange(pageName);
  }, []);

  const announceProgress = useCallback(
    (current: number, total: number, label?: string) => {
      getAnnouncer().announceProgress(current, total, label);
    },
    []
  );

  const clear = useCallback(() => {
    getAnnouncer().clear();
  }, []);

  return {
    announce,
    announcePolite,
    announceAssertive,
    announceError,
    announceSuccess,
    announceLoading,
    announceRouteChange,
    announceProgress,
    clear,
  };
}
