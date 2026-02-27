'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'aivo_tutor_voice_enabled';

/**
 * Hook to persist tutor voice preference in localStorage.
 *
 * Returns the current preference and a toggle function. The preference
 * defaults to `true` (voice enabled) for new users.
 */
export function useVoicePreference() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setVoiceEnabled(stored === 'true');
      }
    } catch {
      // localStorage unavailable (SSR, privacy mode)
    }
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const setVoice = useCallback((enabled: boolean) => {
    setVoiceEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // Ignore storage errors
    }
  }, []);

  return { voiceEnabled, toggleVoice, setVoice };
}
