'use client';

/**
 * EmotionCheckIn Component
 * Visual emotion picker with age-appropriate options for mood tracking
 */

import { useState, useCallback } from 'react';
import {
  EMOTION_OPTIONS,
  COMMON_TRIGGERS,
  type GradeBand,
  type ActivityRecommendation,
} from '@/lib/self-regulation/regulation-types';

// ============================================================================
// Types
// ============================================================================

interface EmotionCheckInProps {
  gradeBand: GradeBand;
  onSubmit: (data: CheckInData) => Promise<boolean>;
  onActivitySelect?: (activity: ActivityRecommendation) => void;
  recommendations?: ActivityRecommendation[];
  isLoading?: boolean;
}

interface CheckInData {
  emotion: string;
  emoji: string;
  intensity: number;
  energyLevel?: number;
  trigger?: string;
  notes?: string;
  needsSupport?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function EmotionCheckIn({
  gradeBand,
  onSubmit,
  onActivitySelect,
  recommendations = [],
  isLoading = false,
}: Readonly<EmotionCheckInProps>) {
  // Form state
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [intensity, setIntensity] = useState<number>(3);
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [needsSupport, setNeedsSupport] = useState<boolean>(false);

  // UI state
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [showRecommendations, setShowRecommendations] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);

  // Get age-appropriate options
  const emotions = EMOTION_OPTIONS[gradeBand];
  const triggers = COMMON_TRIGGERS[gradeBand];

  // Handle emotion selection
  const handleEmotionSelect = useCallback(
    (emotionId: string, emoji: string) => {
      setSelectedEmotion(emotionId);
      setSelectedEmoji(emoji);
    },
    []
  );

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!selectedEmotion) return;

    const success = await onSubmit({
      emotion: selectedEmotion,
      emoji: selectedEmoji,
      intensity,
      energyLevel,
      trigger: selectedTrigger || undefined,
      notes: notes || undefined,
      needsSupport,
    });

    if (success) {
      setShowSuccess(true);
      setShowRecommendations(recommendations.length > 0);

      // Reset form after delay
      setTimeout(() => {
        setShowSuccess(false);
        if (!showRecommendations) {
          resetForm();
        }
      }, 3000);
    }
  }, [
    selectedEmotion,
    selectedEmoji,
    intensity,
    energyLevel,
    selectedTrigger,
    notes,
    needsSupport,
    onSubmit,
    recommendations.length,
    showRecommendations,
  ]);

  // Reset form
  const resetForm = useCallback(() => {
    setSelectedEmotion(null);
    setSelectedEmoji('');
    setIntensity(3);
    setEnergyLevel(3);
    setSelectedTrigger(null);
    setNotes('');
    setNeedsSupport(false);
    setStep(1);
    setShowRecommendations(false);
  }, []);

  // Get intensity label based on grade band
  const getIntensityLabel = (value: number): string => {
    if (gradeBand === 'K5') {
      const labels = ['A little', 'Some', 'Medium', 'A lot', 'Very much'];
      return labels[value - 1] || 'Medium';
    }
    const labels = ['Mild', 'Slight', 'Moderate', 'Strong', 'Intense'];
    return labels[value - 1] || 'Moderate';
  };

  // Get energy label
  const getEnergyLabel = (value: number): string => {
    if (gradeBand === 'K5') {
      const labels = ['Very sleepy', 'Tired', 'Okay', 'Awake', 'Super awake'];
      return labels[value - 1] || 'Okay';
    }
    const labels = ['Very low', 'Low', 'Moderate', 'High', 'Very high'];
    return labels[value - 1] || 'Moderate';
  };

  // Check if emotion is negative (might need support)
  const isNegativeEmotion = selectedEmotion
    ? emotions.find((e) => e.id === selectedEmotion)?.category === 'negative'
    : false;

  // ============================================================================
  // Render - Success State
  // ============================================================================

  if (showSuccess && showRecommendations && recommendations.length > 0) {
    return (
      <div className="space-y-6">
        {/* Success message */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <span className="text-3xl">✅</span>
          <p className="mt-2 text-green-800 font-medium">Check-in saved!</p>
        </div>

        {/* Recommendations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {gradeBand === 'K5'
              ? 'Would you like to try something to feel better?'
              : 'Suggested activities based on how you feel:'}
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {recommendations.map((rec) => (
              <button
                key={rec.activity.id}
                onClick={() => onActivitySelect?.(rec)}
                className="p-4 bg-white border border-slate-200 rounded-lg text-left hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {getActivityEmoji(rec.activity.activityType)}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {rec.activity.name}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {rec.reason}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {Math.round(rec.activity.estimatedDurationSeconds / 60)} min
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={resetForm}
            className="w-full py-2 text-slate-600 hover:text-slate-900"
          >
            {gradeBand === 'K5' ? "I'm okay for now" : 'Skip for now'}
          </button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
        <span className="text-4xl">✅</span>
        <p className="mt-3 text-green-800 font-medium text-lg">
          {gradeBand === 'K5' ? 'Great job checking in!' : 'Check-in saved!'}
        </p>
        <p className="mt-1 text-green-700 text-sm">
          {gradeBand === 'K5'
            ? 'Thanks for sharing how you feel!'
            : 'Your feelings are tracked and understood.'}
        </p>
      </div>
    );
  }

  // ============================================================================
  // Render - Step 1: Emotion Selection
  // ============================================================================

  if (step === 1) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            {gradeBand === 'K5'
              ? 'How are you feeling right now?'
              : 'How are you feeling?'}
          </h2>
          <p className="mt-1 text-slate-600 text-sm">
            {gradeBand === 'K5'
              ? 'Tap the face that shows how you feel'
              : 'Select the emotion that best describes your current state'}
          </p>
        </div>

        {/* Emotion Grid */}
        <div
          className={`grid gap-3 ${
            gradeBand === 'K5' ? 'grid-cols-4' : 'grid-cols-4 md:grid-cols-5'
          }`}
        >
          {emotions.map((emotion) => (
            <button
              key={emotion.id}
              onClick={() => handleEmotionSelect(emotion.id, emotion.emoji)}
              className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                selectedEmotion === emotion.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={gradeBand === 'K5' ? 'text-4xl' : 'text-3xl'}>
                {emotion.emoji}
              </span>
              <span
                className={`mt-2 text-center ${
                  gradeBand === 'K5' ? 'text-sm' : 'text-xs'
                } ${
                  selectedEmotion === emotion.id
                    ? 'text-indigo-700 font-medium'
                    : 'text-slate-600'
                }`}
              >
                {emotion.name}
              </span>
            </button>
          ))}
        </div>

        {/* Continue button */}
        {selectedEmotion && (
          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            {gradeBand === 'K5' ? 'Next' : 'Continue'}
          </button>
        )}
      </div>
    );
  }

  // ============================================================================
  // Render - Step 2: Intensity & Details
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => setStep(1)}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <span>←</span>
        <span>Back</span>
      </button>

      {/* Selected emotion display */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
        <span className="text-3xl">{selectedEmoji}</span>
        <div>
          <p className="font-medium text-slate-900">
            {emotions.find((e) => e.id === selectedEmotion)?.name}
          </p>
          <p className="text-sm text-slate-600">
            {gradeBand === 'K5' ? "You're feeling:" : 'Current emotion:'}
          </p>
        </div>
      </div>

      {/* Intensity slider */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          {gradeBand === 'K5'
            ? 'How much do you feel this way?'
            : 'How intense is this feeling?'}
        </label>
        <input
          type="range"
          min="1"
          max="5"
          value={intensity}
          onChange={(e) => setIntensity(parseInt(e.target.value))}
          className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>{gradeBand === 'K5' ? 'A little' : 'Mild'}</span>
          <span className="font-medium text-indigo-600">
            {getIntensityLabel(intensity)}
          </span>
          <span>{gradeBand === 'K5' ? 'A lot' : 'Intense'}</span>
        </div>
      </div>

      {/* Energy level slider */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          {gradeBand === 'K5' ? 'How much energy do you have?' : 'Energy level:'}
        </label>
        <input
          type="range"
          min="1"
          max="5"
          value={energyLevel}
          onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
          className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>{gradeBand === 'K5' ? 'Very sleepy' : 'Very low'}</span>
          <span className="font-medium text-indigo-600">
            {getEnergyLabel(energyLevel)}
          </span>
          <span>{gradeBand === 'K5' ? 'Super awake' : 'Very high'}</span>
        </div>
      </div>

      {/* Trigger selection (optional) */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          {gradeBand === 'K5'
            ? "What's making you feel this way? (optional)"
            : "What's influencing this feeling? (optional)"}
        </label>
        <div className="flex flex-wrap gap-2">
          {triggers.map((trigger) => (
            <button
              key={trigger}
              onClick={() =>
                setSelectedTrigger(selectedTrigger === trigger ? null : trigger)
              }
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedTrigger === trigger
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {trigger}
            </button>
          ))}
        </div>
      </div>

      {/* Notes (optional for older students) */}
      {gradeBand !== 'K5' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Anything else you want to share? (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your thoughts here..."
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      )}

      {/* Support checkbox for negative emotions */}
      {isNegativeEmotion && intensity >= 3 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={needsSupport}
              onChange={(e) => setNeedsSupport(e.target.checked)}
              className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <div>
              <span className="text-sm font-medium text-blue-900">
                {gradeBand === 'K5'
                  ? 'I want to talk to a grown-up'
                  : 'I would like to talk to someone'}
              </span>
              <p className="text-xs text-blue-700 mt-1">
                {gradeBand === 'K5'
                  ? 'A teacher or counselor can help you feel better'
                  : 'A counselor or trusted adult will be notified to check in with you'}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            Saving...
          </span>
        ) : gradeBand === 'K5' ? (
          'Done!'
        ) : (
          'Save Check-in'
        )}
      </button>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getActivityEmoji(activityType: string): string {
  const emojiMap: Record<string, string> = {
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

export default EmotionCheckIn;
