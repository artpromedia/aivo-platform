import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook that provides text-to-speech via the Web Speech API.
 *
 * - `speak(text)` — cancels any current utterance then speaks `text`.
 * - `stop()` — silences any current speech immediately.
 * - `isSpeaking` ref — true while the synth is actively speaking.
 *
 * Speech is automatically stopped when the component unmounts.
 * All calls are no-ops when `enabled` is `false` or when the
 * browser does not support `window.speechSynthesis`.
 */
export function useSpeech(enabled: boolean) {
  const isSpeakingRef = useRef(false);

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;

      // Cancel any in-progress utterance first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85; // Slightly slower for young learners
      utterance.pitch = 1.1; // Slightly higher pitch — friendlier
      utterance.lang = 'en-US';

      utterance.onstart = () => {
        isSpeakingRef.current = true;
      };
      utterance.onend = () => {
        isSpeakingRef.current = false;
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    },
    [enabled],
  );

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, isSpeaking: isSpeakingRef };
}
