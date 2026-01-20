'use client';

/**
 * RegulationActivity Component
 * Individual activity player that dispatches to specific activity components
 */

import { useState, useCallback } from 'react';
import type { ActivityType, GradeBand } from '@/lib/self-regulation/regulation-types';
import { BreathingExercise } from './BreathingExercise';
import { GroundingExercise } from './GroundingExercise';
import { MovementBreak } from './MovementBreak';

// ============================================================================
// Types
// ============================================================================

interface RegulationActivityProps {
  activityType: ActivityType;
  title: string;
  description: string;
  estimatedDurationSeconds: number;
  gradeBand: GradeBand;
  onComplete: (rating?: number) => void;
  onCancel?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function RegulationActivity({
  activityType,
  title,
  description,
  estimatedDurationSeconds,
  gradeBand,
  onComplete,
  onCancel,
}: Readonly<RegulationActivityProps>) {
  // State for pre/post mood check
  const [phase, setPhase] = useState<'pre-mood' | 'activity' | 'post-mood' | 'complete'>('pre-mood');
  const [moodBefore, setMoodBefore] = useState<number>(3);
  const [moodAfter, setMoodAfter] = useState<number>(3);
  const [rating, setRating] = useState<number>(0);

  // Handle activity completion
  const handleActivityComplete = useCallback(() => {
    setPhase('post-mood');
  }, []);

  // Handle final submission
  const handleFinalComplete = useCallback(() => {
    setPhase('complete');
    onComplete(rating);
  }, [onComplete, rating]);

  // Start the activity
  const startActivity = useCallback(() => {
    setPhase('activity');
  }, []);

  // Get emoji for mood
  const getMoodEmoji = (value: number): string => {
    const emojis = ['😟', '😕', '😐', '🙂', '😊'];
    return emojis[value - 1] || '😐';
  };

  // Get mood label
  const getMoodLabel = (value: number): string => {
    if (gradeBand === 'K5') {
      const labels = ['Not good', 'A little bad', 'Okay', 'Good', 'Great!'];
      return labels[value - 1] || 'Okay';
    }
    const labels = ['Poor', 'Below average', 'Neutral', 'Good', 'Excellent'];
    return labels[value - 1] || 'Neutral';
  };

  // ============================================================================
  // Render - Pre-Activity Mood Check
  // ============================================================================

  if (phase === 'pre-mood') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-4xl block mb-3">
            {getActivityEmoji(activityType)}
          </span>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600 mt-1">{description}</p>
          <p className="text-xs text-slate-500 mt-2">
            About {Math.round(estimatedDurationSeconds / 60)} minutes
          </p>
        </div>

        {/* Pre-mood check */}
        <div className="space-y-4 mb-6">
          <label className="block text-sm font-medium text-slate-700 text-center">
            {gradeBand === 'K5'
              ? 'How do you feel right now?'
              : 'How are you feeling before we start?'}
          </label>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setMoodBefore(value)}
                className={`w-12 h-12 rounded-full text-2xl transition-all ${
                  moodBefore === value
                    ? 'bg-indigo-100 ring-2 ring-indigo-400 scale-110'
                    : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {getMoodEmoji(value)}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-indigo-600 font-medium">
            {getMoodLabel(moodBefore)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              {gradeBand === 'K5' ? 'Go back' : 'Cancel'}
            </button>
          )}
          <button
            onClick={startActivity}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            {gradeBand === 'K5' ? "Let's go!" : 'Start Activity'}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render - Activity Phase
  // ============================================================================

  if (phase === 'activity') {
    // Render specific activity component based on type
    switch (activityType) {
      case 'breathing':
        return (
          <BreathingExercise
            gradeBand={gradeBand}
            onComplete={handleActivityComplete}
            onCancel={onCancel}
          />
        );

      case 'grounding':
        return (
          <GroundingExercise
            gradeBand={gradeBand}
            onComplete={handleActivityComplete}
            onCancel={onCancel}
          />
        );

      case 'movement':
        return (
          <MovementBreak
            gradeBand={gradeBand}
            onComplete={handleActivityComplete}
            onCancel={onCancel}
          />
        );

      // For other activity types, show a generic placeholder
      default:
        return (
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto text-center">
            <span className="text-5xl block mb-4">
              {getActivityEmoji(activityType)}
            </span>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
            <p className="text-slate-600 mb-6">{description}</p>

            <div className="p-4 bg-slate-50 rounded-lg mb-6">
              <p className="text-sm text-slate-600">
                {getActivityInstructions(activityType, gradeBand)}
              </p>
            </div>

            <button
              onClick={handleActivityComplete}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              {gradeBand === 'K5' ? "I'm done!" : 'Complete Activity'}
            </button>
          </div>
        );
    }
  }

  // ============================================================================
  // Render - Post-Activity Mood Check
  // ============================================================================

  if (phase === 'post-mood') {
    const moodImproved = moodAfter > moodBefore;
    const moodSame = moodAfter === moodBefore;

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        {/* Success header */}
        <div className="text-center mb-6">
          <span className="text-5xl block mb-3">✨</span>
          <h2 className="text-xl font-semibold text-slate-900">
            {gradeBand === 'K5' ? 'Great job!' : 'Activity Complete!'}
          </h2>
        </div>

        {/* Post-mood check */}
        <div className="space-y-4 mb-6">
          <label className="block text-sm font-medium text-slate-700 text-center">
            {gradeBand === 'K5'
              ? 'How do you feel now?'
              : 'How are you feeling after the activity?'}
          </label>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setMoodAfter(value)}
                className={`w-12 h-12 rounded-full text-2xl transition-all ${
                  moodAfter === value
                    ? 'bg-indigo-100 ring-2 ring-indigo-400 scale-110'
                    : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {getMoodEmoji(value)}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-indigo-600 font-medium">
            {getMoodLabel(moodAfter)}
          </p>
        </div>

        {/* Mood comparison */}
        <div className="p-4 bg-slate-50 rounded-lg mb-6">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500">Before</p>
              <span className="text-2xl">{getMoodEmoji(moodBefore)}</span>
            </div>
            <span className="text-slate-400">→</span>
            <div className="text-center">
              <p className="text-xs text-slate-500">After</p>
              <span className="text-2xl">{getMoodEmoji(moodAfter)}</span>
            </div>
          </div>

          <p className="text-center text-sm text-slate-600 mt-2">
            {moodImproved
              ? gradeBand === 'K5'
                ? "You're feeling better! 🎉"
                : 'Your mood improved!'
              : moodSame
              ? gradeBand === 'K5'
                ? 'You feel about the same'
                : 'Your mood stayed stable'
              : gradeBand === 'K5'
              ? "That's okay, sometimes we need more time"
              : "That's okay - regulation takes practice"}
          </p>
        </div>

        {/* Activity rating */}
        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium text-slate-700 text-center">
            {gradeBand === 'K5'
              ? 'Did you like this activity?'
              : 'How helpful was this activity?'}
          </label>

          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-3xl transition-transform hover:scale-110 ${
                  star <= rating ? 'text-yellow-400' : 'text-slate-300'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Complete button */}
        <button
          onClick={handleFinalComplete}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          {gradeBand === 'K5' ? 'All done!' : 'Finish'}
        </button>
      </div>
    );
  }

  // ============================================================================
  // Render - Complete State
  // ============================================================================

  return (
    <div className="bg-green-50 rounded-xl p-6 max-w-md mx-auto text-center">
      <span className="text-5xl block mb-4">🌟</span>
      <h2 className="text-xl font-semibold text-green-900">
        {gradeBand === 'K5' ? 'You did it!' : 'Well done!'}
      </h2>
      <p className="text-green-700 mt-2">
        {gradeBand === 'K5'
          ? "You're learning to take care of yourself!"
          : 'Self-regulation is a skill that improves with practice.'}
      </p>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getActivityEmoji(activityType: ActivityType): string {
  const emojiMap: Record<ActivityType, string> = {
    breathing: '🌬️',
    grounding: '🌿',
    movement: '🏃',
    visualization: '🌈',
    sensory: '✋',
    sounds: '🎵',
    counting: '🔢',
    progressive: '🧘',
  };
  return emojiMap[activityType] || '✨';
}

function getActivityInstructions(activityType: ActivityType, gradeBand: GradeBand): string {
  const instructions: Record<ActivityType, Record<GradeBand, string>> = {
    breathing: {
      K5: 'Take slow, deep breaths. Breathe in through your nose, out through your mouth.',
      G6_8: 'Focus on your breathing. Slow, deep breaths help calm your nervous system.',
      G9_12: 'Practice controlled breathing to activate your parasympathetic nervous system.',
    },
    grounding: {
      K5: 'Look around and notice things with your senses!',
      G6_8: 'Use the 5-4-3-2-1 technique to feel present and grounded.',
      G9_12: 'Ground yourself by engaging all five senses systematically.',
    },
    movement: {
      K5: 'Stretch and move your body to feel better!',
      G6_8: 'Simple movements can help release tension and improve mood.',
      G9_12: 'Physical movement releases endorphins and reduces stress hormones.',
    },
    visualization: {
      K5: 'Imagine a happy, peaceful place!',
      G6_8: 'Picture a calm, safe place in your mind.',
      G9_12: 'Use guided imagery to create a mental sanctuary.',
    },
    sensory: {
      K5: 'Touch something soft or squeeze something!',
      G6_8: 'Focus on calming sensory input.',
      G9_12: 'Use sensory grounding techniques for regulation.',
    },
    sounds: {
      K5: 'Listen to calm sounds and relax.',
      G6_8: 'Calming sounds can help soothe your mind.',
      G9_12: 'Auditory stimulation can promote relaxation.',
    },
    counting: {
      K5: 'Count slowly to help calm down.',
      G6_8: 'Counting gives your mind something to focus on.',
      G9_12: 'Counting exercises redirect cognitive resources.',
    },
    progressive: {
      K5: 'Squeeze and relax your muscles one at a time.',
      G6_8: 'Tense and release muscle groups progressively.',
      G9_12: 'Progressive muscle relaxation reduces physical tension.',
    },
  };

  return instructions[activityType]?.[gradeBand] || 'Follow the activity instructions.';
}

export default RegulationActivity;
