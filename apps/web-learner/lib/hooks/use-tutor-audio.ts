'use client';

import { useState, useCallback, useRef } from 'react';

export interface Viseme {
  time: number;
  value: string;
}

export interface TTSData {
  audioBase64: string;
  visemes: Viseme[];
  durationMs: number;
}

export function useTutorAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentViseme, setCurrentViseme] = useState<string>('neutral');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const visemeTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const playAudio = useCallback((tts: TTSData) => {
    if (!tts.audioBase64) return;

    // Clear any existing playback
    stopAudio();

    // Create audio element from base64
    const audio = new Audio(`data:audio/mp3;base64,${tts.audioBase64}`);
    audioRef.current = audio;

    // Schedule viseme changes
    for (const viseme of tts.visemes) {
      const timer = setTimeout(() => {
        setCurrentViseme(viseme.value);
      }, viseme.time);
      visemeTimerRef.current.push(timer);
    }

    // Reset viseme when done
    const endTimer = setTimeout(() => {
      setCurrentViseme('neutral');
      setIsPlaying(false);
    }, tts.durationMs);
    visemeTimerRef.current.push(endTimer);

    setIsPlaying(true);
    audio.play().catch(() => {
      setIsPlaying(false);
      setCurrentViseme('neutral');
    });

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentViseme('neutral');
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    for (const timer of visemeTimerRef.current) {
      clearTimeout(timer);
    }
    visemeTimerRef.current = [];
    setIsPlaying(false);
    setCurrentViseme('neutral');
  }, []);

  return {
    isPlaying,
    currentViseme,
    playAudio,
    stopAudio,
  };
}
