import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Brain state representing a learner's personalized AI brain
 */
interface BrainState {
  learner_id: string;
  version: string;
  created_at: string;
  updated_at: string;
  knowledge_graph: {
    nodes: Array<{
      id: string;
      type: string;
      mastery: number;
      last_updated: string;
      metadata?: Record<string, unknown>;
    }>;
    edges: Array<{
      source: string;
      target: string;
      relationship: string;
      weight: number;
    }>;
  };
  learning_patterns: {
    preferred_modality: string;
    optimal_session_length: number;
    best_time_of_day: string | null;
    difficulty_preference: string;
    response_time_profile: Record<string, number>;
    retention_rate: number;
  };
  mastery_levels: Record<string, {
    current_level: number;
    target_level: number;
    progress_rate: number;
    last_practiced: string | null;
    practice_count: number;
    streak: number;
    best_streak: number;
    spaced_repetition_interval: number;
  }>;
  engagement_profile: {
    favorite_subjects: string[];
    struggle_subjects: string[];
    game_preferences: string[];
    activity_completions: Record<string, number>;
    average_engagement_score: number;
    total_time_spent: number;
  };
  adaptive_parameters: {
    difficulty_adjustment_rate: number;
    hint_threshold: number;
    review_frequency: string;
    scaffolding_level: number;
    challenge_factor: number;
  };
}

/**
 * Learning recommendation from the brain
 */
interface Recommendation {
  type: 'practice' | 'review' | 'challenge' | 'explore';
  subject: string;
  priority: number;
  reason: string;
  estimated_time: number;
  current_mastery?: number;
  target_mastery?: number;
  suggested_difficulty?: string;
  days_since_practice?: number;
  prerequisites_met?: boolean;
}

/**
 * Brain insights and analytics
 */
interface BrainInsights {
  learner_id: string;
  overall_mastery: number;
  strongest_subjects: Array<{ subject: string; mastery: number }>;
  weakest_subjects: Array<{ subject: string; mastery: number }>;
  learning_velocity: number;
  preferred_learning_style: string;
  optimal_session_length: number;
  best_time_of_day: string | null;
  total_time_spent_hours: number;
  engagement_score: number;
  subjects_at_target: number;
  total_subjects: number;
  current_streak: number;
  best_streak_ever: number;
}

/**
 * Activity data for brain updates
 */
interface ActivityData {
  subject: string;
  accuracy: number;
  time_spent: number;
  engagement?: number;
  completed?: boolean;
  activity_type?: string;
  questions_answered?: number;
  timestamp?: string;
}

/**
 * Baseline assessment for brain initialization
 */
interface BaselineAssessment {
  strengths?: string[];
  weaknesses?: string[];
  learning_style?: string;
  subject_scores?: Record<string, number>;
  concept_results?: Array<{
    concept_id?: string;
    name?: string;
    subject?: string;
    score?: number;
    grade_level?: number;
  }>;
  prerequisites?: Array<{
    from: string;
    to: string;
    strength?: number;
  }>;
}

const BRAIN_API_URL = process.env.NEXT_PUBLIC_BRAIN_API_URL || process.env.NEXT_PUBLIC_API_URL;

export function useBrainAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Initialize a new brain from baseline assessment
   */
  const initializeBrain = useCallback(async (
    learnerId: string,
    baselineAssessment: BaselineAssessment
  ): Promise<BrainState> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BRAIN_API_URL}/api/v1/brain/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learner_id: learnerId,
          baseline_assessment: baselineAssessment,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize brain: ${response.statusText}`);
      }

      const brainState: BrainState = await response.json();

      // Also store in Supabase for quick access
      await supabase
        .from('learner_brain_cache')
        .upsert({
          learner_id: learnerId,
          brain_state: brainState,
          updated_at: new Date().toISOString(),
        });

      return brainState;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get current brain state for a learner
   */
  const getBrain = useCallback(async (learnerId: string): Promise<BrainState | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BRAIN_API_URL}/api/v1/brain/${learnerId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get brain: ${response.statusText}`);
      }

      return response.json();
    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update brain based on learning activity
   */
  const updateBrain = useCallback(async (
    learnerId: string,
    activityData: ActivityData
  ): Promise<BrainState> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BRAIN_API_URL}/api/v1/brain/${learnerId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activityData,
          timestamp: activityData.timestamp || new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update brain: ${response.statusText}`);
      }

      const brainState: BrainState = await response.json();

      // Update cache
      await supabase
        .from('learner_brain_cache')
        .upsert({
          learner_id: learnerId,
          brain_state: brainState,
          updated_at: new Date().toISOString(),
        });

      return brainState;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get personalized learning recommendations
   */
  const getRecommendations = useCallback(async (
    learnerId: string,
    limit = 5
  ): Promise<Recommendation[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${BRAIN_API_URL}/api/v1/brain/${learnerId}/recommendations?limit=${limit}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get recommendations: ${response.statusText}`);
      }

      return response.json();
    } catch (err) {
      const error = err as Error;
      setError(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get comprehensive brain insights
   */
  const getInsights = useCallback(async (learnerId: string): Promise<BrainInsights | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BRAIN_API_URL}/api/v1/brain/${learnerId}/insights`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get insights: ${response.statusText}`);
      }

      return response.json();
    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get mastery level for a specific subject
   */
  const getSubjectMastery = useCallback(async (
    learnerId: string,
    subject: string
  ): Promise<{
    current_level: number;
    target_level: number;
    progress_rate: number;
    streak: number;
    last_practiced: string | null;
  } | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${BRAIN_API_URL}/api/v1/brain/${learnerId}/mastery/${encodeURIComponent(subject)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get mastery: ${response.statusText}`);
      }

      return response.json();
    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Set a custom mastery target for a subject
   */
  const setMasteryTarget = useCallback(async (
    learnerId: string,
    subject: string,
    target: number
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${BRAIN_API_URL}/api/v1/brain/${learnerId}/mastery/${encodeURIComponent(subject)}/target?target=${target}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to set mastery target: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reset brain (for re-assessment)
   */
  const resetBrain = useCallback(async (learnerId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BRAIN_API_URL}/api/v1/brain/${learnerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to reset brain: ${response.statusText}`);
      }

      // Clear cache
      await supabase
        .from('learner_brain_cache')
        .delete()
        .eq('learner_id', learnerId);

      return true;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    initializeBrain,
    getBrain,
    updateBrain,
    getRecommendations,
    getInsights,
    getSubjectMastery,
    setMasteryTarget,
    resetBrain,
    loading,
    error,
  };
}

export type {
  BrainState,
  Recommendation,
  BrainInsights,
  ActivityData,
  BaselineAssessment,
};
