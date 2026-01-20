'use client';

/**
 * useEmotionTracking Hook
 * Manages emotion check-in state and history for learners
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createEmotionCheckIn,
  getEmotionHistory,
  getMoodTrends,
  getRecommendedActivities,
  ensureLearnerProfile,
} from './sel-api';
import type {
  EmotionCheckInData,
  MoodTrendsReport,
  ActivityRecommendation,
  GradeBand,
} from './regulation-types';

// ============================================================================
// Types
// ============================================================================

interface UseEmotionTrackingOptions {
  learnerId: string;
  gradeBand: GradeBand;
  autoLoadHistory?: boolean;
  historyLimit?: number;
}

interface UseEmotionTrackingReturn {
  // State
  isLoading: boolean;
  error: string | null;
  profileId: string | null;
  recentCheckIns: EmotionCheckInData[];
  moodTrends: MoodTrendsReport | null;
  recommendations: ActivityRecommendation[];
  lastCheckIn: EmotionCheckInData | null;

  // Actions
  submitCheckIn: (data: CheckInSubmission) => Promise<boolean>;
  loadHistory: (options?: { page?: number; pageSize?: number }) => Promise<void>;
  loadTrends: (days?: number) => Promise<void>;
  loadRecommendations: (currentMood?: string) => Promise<void>;
  clearError: () => void;
}

interface CheckInSubmission {
  emotion: string;
  emoji: string;
  intensity: number;
  energyLevel?: number;
  trigger?: string;
  notes?: string;
  needsSupport?: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useEmotionTracking({
  learnerId,
  gradeBand,
  autoLoadHistory = true,
  historyLimit = 10,
}: UseEmotionTrackingOptions): UseEmotionTrackingReturn {
  // Profile state
  const [profileId, setProfileId] = useState<string | null>(null);
  const profileInitialized = useRef(false);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [recentCheckIns, setRecentCheckIns] = useState<EmotionCheckInData[]>([]);
  const [moodTrends, setMoodTrends] = useState<MoodTrendsReport | null>(null);
  const [recommendations, setRecommendations] = useState<ActivityRecommendation[]>([]);
  const [lastCheckIn, setLastCheckIn] = useState<EmotionCheckInData | null>(null);

  // Initialize profile
  useEffect(() => {
    if (!learnerId || profileInitialized.current) return;

    const initProfile = async () => {
      try {
        profileInitialized.current = true;
        const profile = await ensureLearnerProfile(learnerId);
        setProfileId(profile.id);

        // Load initial data if autoLoadHistory is enabled
        if (autoLoadHistory) {
          await loadHistoryInternal(profile.id, historyLimit);
        }
      } catch (err) {
        console.error('Failed to initialize profile:', err);
        // Use learnerId as fallback profileId
        setProfileId(learnerId);
      }
    };

    void initProfile();
  }, [learnerId, autoLoadHistory, historyLimit]);

  // Internal history loader
  const loadHistoryInternal = async (pid: string, limit: number) => {
    try {
      const history = await getEmotionHistory(pid, { pageSize: limit });
      setRecentCheckIns(history.checkIns);
      if (history.checkIns.length > 0) {
        setLastCheckIn(history.checkIns[0]);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  // Submit a new check-in
  const submitCheckIn = useCallback(
    async (data: CheckInSubmission): Promise<boolean> => {
      if (!profileId) {
        setError('Profile not initialized');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Map intensity (1-5) to mood rating (1-5)
        const moodRating = data.intensity;

        const checkIn = await createEmotionCheckIn(profileId, {
          moodRating,
          moodEmoji: data.emoji,
          emotions: [data.emotion],
          energyLevel: data.energyLevel,
          trigger: data.trigger,
          reflection: data.notes,
          needsSupport: data.needsSupport,
          isPrivate: false,
        });

        // Update local state
        setLastCheckIn(checkIn);
        setRecentCheckIns((prev) => [checkIn, ...prev].slice(0, historyLimit));

        // Load recommendations based on the new mood
        await loadRecommendationsInternal(data.emotion);

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit check-in';
        setError(message);
        console.error('Check-in submission failed:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [profileId, historyLimit]
  );

  // Load check-in history
  const loadHistory = useCallback(
    async (options: { page?: number; pageSize?: number } = {}) => {
      if (!profileId) return;

      setIsLoading(true);
      setError(null);

      try {
        const history = await getEmotionHistory(profileId, {
          page: options.page || 1,
          pageSize: options.pageSize || historyLimit,
        });
        setRecentCheckIns(history.checkIns);
        if (history.checkIns.length > 0 && !lastCheckIn) {
          setLastCheckIn(history.checkIns[0]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load history';
        setError(message);
        console.error('History load failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [profileId, historyLimit, lastCheckIn]
  );

  // Load mood trends
  const loadTrends = useCallback(
    async (days: number = 30) => {
      if (!profileId) return;

      setIsLoading(true);
      setError(null);

      try {
        const trends = await getMoodTrends(profileId, days);
        setMoodTrends(trends);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load trends';
        setError(message);
        console.error('Trends load failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [profileId]
  );

  // Internal recommendations loader
  const loadRecommendationsInternal = async (currentMood?: string) => {
    if (!profileId) return;

    try {
      const recs = await getRecommendedActivities(profileId, {
        currentMood,
        limit: 3,
      });
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    }
  };

  // Load recommendations
  const loadRecommendations = useCallback(
    async (currentMood?: string) => {
      if (!profileId) return;

      setIsLoading(true);

      try {
        await loadRecommendationsInternal(currentMood);
      } catch (err) {
        console.error('Failed to load recommendations:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [profileId]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    profileId,
    recentCheckIns,
    moodTrends,
    recommendations,
    lastCheckIn,

    // Actions
    submitCheckIn,
    loadHistory,
    loadTrends,
    loadRecommendations,
    clearError,
  };
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Hook to get the appropriate emotions for a grade band
 */
export function useGradeBandEmotions(gradeBand: GradeBand) {
  const { EMOTION_OPTIONS, COMMON_TRIGGERS } = require('./regulation-types');

  return {
    emotions: EMOTION_OPTIONS[gradeBand] || EMOTION_OPTIONS.G6_8,
    triggers: COMMON_TRIGGERS[gradeBand] || COMMON_TRIGGERS.G6_8,
  };
}

/**
 * Hook to track if user should be prompted for check-in
 */
export function useCheckInPrompt(lastCheckIn: EmotionCheckInData | null) {
  const [shouldPrompt, setShouldPrompt] = useState(false);

  useEffect(() => {
    if (!lastCheckIn) {
      // No check-in today, should prompt
      setShouldPrompt(true);
      return;
    }

    const lastCheckInDate = new Date(lastCheckIn.timestamp);
    const now = new Date();

    // Check if last check-in was today
    const isToday =
      lastCheckInDate.getDate() === now.getDate() &&
      lastCheckInDate.getMonth() === now.getMonth() &&
      lastCheckInDate.getFullYear() === now.getFullYear();

    // Prompt if no check-in today or if it's been more than 4 hours
    const hoursSinceLastCheckIn =
      (now.getTime() - lastCheckInDate.getTime()) / (1000 * 60 * 60);

    setShouldPrompt(!isToday || hoursSinceLastCheckIn > 4);
  }, [lastCheckIn]);

  return shouldPrompt;
}

export default useEmotionTracking;
