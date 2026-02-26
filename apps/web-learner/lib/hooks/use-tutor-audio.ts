'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface VisemeEvent {
  /** Time offset from audio start in milliseconds. */
  offsetMs: number;
  /** Azure viseme ID (0–21). */
  visemeId: number;
  /** Mapped mouth-open amount (0.0–1.0) for avatar lip-sync. */
  mouthOpen: number;
  /** Duration of this viseme in milliseconds. */
  durationMs: number;
}

export interface TutorAudioState {
  /** Current mouth openness for avatar (0.0–1.0). */
  mouthOpenAmount: number;
  /** Whether audio is currently playing. */
  isPlaying: boolean;
  /** Whether audio is loading. */
  isLoading: boolean;
  /** Error message if playback failed. */
  error: string | null;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * React hook for tutor TTS audio playback with synchronized lip-sync.
 *
 * Uses `requestAnimationFrame` (~60fps) to smoothly interpolate between
 * viseme mouthOpen values based on the current audio playback position.
 *
 * Usage:
 * ```tsx
 * const { mouthOpenAmount, isPlaying, playWithLipSync, stop } = useTutorAudio();
 *
 * <AnimatedTutorAvatar
 *   mouthOpenAmount={mouthOpenAmount}
 *   state={isPlaying ? 'talking' : 'idle'}
 *   ...
 * />
 * ```
 */
export function useTutorAudio() {
  const [state, setState] = useState<TutorAudioState>({
    mouthOpenAmount: 0,
    isPlaying: false,
    isLoading: false,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const visemesRef = useRef<VisemeEvent[]>([]);
  const visemeIndexRef = useRef(0);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current ?? 0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current = null;
      }
    };
  }, []);

  // ── RAF lip-sync loop ──────────────────────────────────────────────────
  const startLipSyncLoop = useCallback(() => {
    const tick = () => {
      const audio = audioRef.current;
      const visemes = visemesRef.current;

      if (!audio || audio.paused || audio.ended || visemes.length === 0) {
        setState((prev) => ({ ...prev, mouthOpenAmount: 0 }));
        return;
      }

      const currentMs = audio.currentTime * 1000;
      let idx = visemeIndexRef.current;

      // Advance index to match current time
      while (idx < visemes.length - 1 && visemes[idx + 1]!.offsetMs <= currentMs) {
        idx++;
      }

      // Handle seeking backward
      if (idx > 0 && visemes[idx]!.offsetMs > currentMs) {
        idx = 0;
        while (idx < visemes.length - 1 && visemes[idx + 1]!.offsetMs <= currentMs) {
          idx++;
        }
      }

      visemeIndexRef.current = idx;

      const current = visemes[idx]!;
      let mouthOpen = current.mouthOpen;

      // Smooth interpolation to next viseme
      if (idx < visemes.length - 1) {
        const next = visemes[idx + 1]!;
        const span = next.offsetMs - current.offsetMs;

        if (span > 0) {
          const progress = Math.min(1, Math.max(0, (currentMs - current.offsetMs) / span));
          // Ease-in-out for natural movement
          const t = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          mouthOpen = current.mouthOpen + (next.mouthOpen - current.mouthOpen) * t;
        }
      }

      setState((prev) => {
        // Only update if change is perceptible (avoids re-renders)
        if (Math.abs(prev.mouthOpenAmount - mouthOpen) < 0.01) return prev;
        return { ...prev, mouthOpenAmount: Math.min(1, Math.max(0, mouthOpen)) };
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Play audio with lip-sync ───────────────────────────────────────────
  const playWithLipSync = useCallback(
    async (audioUrl: string, visemes: VisemeEvent[]) => {
      // Stop any current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      cancelAnimationFrame(rafRef.current ?? 0);

      setState({ mouthOpenAmount: 0, isPlaying: false, isLoading: true, error: null });

      visemesRef.current = visemes;
      visemeIndexRef.current = 0;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
        startLipSyncLoop();
      };

      audio.onended = () => {
        cancelAnimationFrame(rafRef.current ?? 0);
        setState({ mouthOpenAmount: 0, isPlaying: false, isLoading: false, error: null });
        visemeIndexRef.current = 0;
      };

      audio.onpause = () => {
        cancelAnimationFrame(rafRef.current ?? 0);
      };

      audio.onerror = () => {
        cancelAnimationFrame(rafRef.current ?? 0);
        setState({
          mouthOpenAmount: 0,
          isPlaying: false,
          isLoading: false,
          error: 'Failed to play audio',
        });
      };

      try {
        await audio.play();
      } catch {
        setState({
          mouthOpenAmount: 0,
          isPlaying: false,
          isLoading: false,
          error: 'Audio playback was blocked',
        });
      }
    },
    [startLipSyncLoop],
  );

  // ── Play with estimated visemes (browser speech fallback) ──────────────
  const playWithEstimatedVisemes = useCallback(
    (visemes: VisemeEvent[], durationMs: number) => {
      cancelAnimationFrame(rafRef.current ?? 0);

      visemesRef.current = visemes;
      visemeIndexRef.current = 0;

      // Use a virtual "audio" timeline driven by performance.now()
      const startTime = performance.now();

      setState({ mouthOpenAmount: 0, isPlaying: true, isLoading: false, error: null });

      const tick = () => {
        const elapsed = performance.now() - startTime;

        if (elapsed >= durationMs) {
          setState({ mouthOpenAmount: 0, isPlaying: false, isLoading: false, error: null });
          visemeIndexRef.current = 0;
          return;
        }

        let idx = visemeIndexRef.current;
        while (idx < visemes.length - 1 && visemes[idx + 1]!.offsetMs <= elapsed) {
          idx++;
        }
        visemeIndexRef.current = idx;

        const current = visemes[idx]!;
        let mouthOpen = current.mouthOpen;

        if (idx < visemes.length - 1) {
          const next = visemes[idx + 1]!;
          const span = next.offsetMs - current.offsetMs;
          if (span > 0) {
            const progress = Math.min(1, Math.max(0, (elapsed - current.offsetMs) / span));
            const t = progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            mouthOpen = current.mouthOpen + (next.mouthOpen - current.mouthOpen) * t;
          }
        }

        setState((prev) => {
          if (Math.abs(prev.mouthOpenAmount - mouthOpen) < 0.01) return prev;
          return { ...prev, mouthOpenAmount: Math.min(1, Math.max(0, mouthOpen)) };
        });

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  // ── Stop ───────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current ?? 0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current = null;
    }
    visemesRef.current = [];
    visemeIndexRef.current = 0;
    setState({ mouthOpenAmount: 0, isPlaying: false, isLoading: false, error: null });
  }, []);

  return {
    mouthOpenAmount: state.mouthOpenAmount,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    error: state.error,
    playWithLipSync,
    playWithEstimatedVisemes,
    stop,
  };
}
