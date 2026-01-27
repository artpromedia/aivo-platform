'use client';

import { useState } from 'react';
import {
  HandwritingExercise,
  AdaptiveInputProfile,
  HANDWRITING_LEVEL_META,
  STROKE_TYPE_META,
  motorSkillsApi,
} from '../../../../lib/motor-skills-api';

interface HandwritingSectionProps {
  exercises: HandwritingExercise[];
  learnerId: string;
  adaptiveProfile: AdaptiveInputProfile | null;
  onRefresh: () => void;
}

export function HandwritingSection({
  exercises,
  learnerId,
  adaptiveProfile,
  onRefresh,
}: HandwritingSectionProps) {
  const [selectedExercise, setSelectedExercise] = useState<HandwritingExercise | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filteredExercises = exercises.filter((ex) => {
    if (filter === 'all') return true;
    return ex.level === filter;
  });

  const groupedByLevel = filteredExercises.reduce(
    (acc, ex) => {
      const level = ex.level;
      if (!acc[level]) acc[level] = [];
      acc[level].push(ex);
      return acc;
    },
    {} as Record<string, HandwritingExercise[]>
  );

  if (selectedExercise) {
    return (
      <HandwritingPractice
        exercise={selectedExercise}
        learnerId={learnerId}
        adaptiveProfile={adaptiveProfile}
        onBack={() => {
          setSelectedExercise(null);
          onRefresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Level Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Levels
        </button>
        {Object.entries(HANDWRITING_LEVEL_META).map(([level, meta]) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === level
                ? 'bg-blue-100 text-blue-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {/* Exercises by Level */}
      {Object.entries(groupedByLevel).map(([level, levelExercises]) => {
        const meta = HANDWRITING_LEVEL_META[level as keyof typeof HANDWRITING_LEVEL_META];
        return (
          <div key={level} className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <span className="mr-2">{meta?.icon || '✍️'}</span>
              {meta?.label || level}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {levelExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onClick={() => setSelectedExercise(exercise)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {filteredExercises.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <p className="text-slate-600">No exercises found for this level.</p>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  exercise,
  onClick,
}: {
  exercise: HandwritingExercise;
  onClick: () => void;
}) {
  const levelMeta = HANDWRITING_LEVEL_META[exercise.level];
  const strokeMeta = STROKE_TYPE_META[exercise.strokeType];

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          style={{ backgroundColor: `${levelMeta?.color || '#3B82F6'}20` }}
        >
          {exercise.targetCharacter || strokeMeta?.icon || '✍️'}
        </div>
        {exercise.completedAt && (
          <span className="text-green-600 text-sm">✓ Completed</span>
        )}
      </div>

      <h4 className="font-medium text-slate-900 mb-1">{exercise.title}</h4>
      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{exercise.instructions}</p>

      <div className="flex items-center justify-between text-xs">
        <span
          className="px-2 py-1 rounded-full"
          style={{
            backgroundColor: `${strokeMeta?.color || '#6B7280'}20`,
            color: strokeMeta?.color || '#6B7280',
          }}
        >
          {strokeMeta?.label || exercise.strokeType}
        </span>
        {exercise.bestScore !== undefined && (
          <span className="text-slate-500">Best: {exercise.bestScore}%</span>
        )}
      </div>
    </div>
  );
}

function HandwritingPractice({
  exercise,
  learnerId,
  adaptiveProfile,
  onBack,
}: {
  exercise: HandwritingExercise;
  learnerId: string;
  adaptiveProfile: AdaptiveInputProfile | null;
  onBack: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Simulate completion - in real app, this would capture canvas data
      await motorSkillsApi.submitHandwritingAttempt(learnerId, exercise.id, {
        strokes: [],
        timeSpentMs: 30000,
        accuracy: 85,
      });
      setFeedback('Great job! Your handwriting is improving.');
    } catch (err) {
      console.error('Failed to submit attempt:', err);
      setFeedback('Could not save progress. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-slate-600 hover:text-slate-900"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Exercises
        </button>
        <span className="text-sm text-slate-500">
          {HANDWRITING_LEVEL_META[exercise.level]?.label || exercise.level}
        </span>
      </div>

      {/* Exercise Info */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{exercise.title}</h2>
        <p className="text-slate-600 mb-4">{exercise.instructions}</p>

        {/* Target Display */}
        <div className="bg-slate-50 rounded-lg p-8 mb-6 text-center">
          <div
            className="inline-block text-8xl font-serif"
            style={{
              fontFamily: adaptiveProfile?.preferredFont || 'serif',
            }}
          >
            {exercise.targetCharacter || exercise.targetWord || 'Aa'}
          </div>
          {exercise.guidePath && (
            <p className="text-sm text-slate-500 mt-4">Follow the guide lines to trace</p>
          )}
        </div>

        {/* Practice Canvas Placeholder */}
        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-white"
          style={{
            minHeight: '200px',
          }}
        >
          <p className="text-slate-400 mb-4">
            Canvas area for handwriting practice
          </p>
          <p className="text-sm text-slate-500">
            Touch/click and drag to write. Adaptive settings will be applied.
          </p>
          {adaptiveProfile && (
            <div className="mt-4 text-xs text-slate-400">
              Line height: {adaptiveProfile.lineHeight}px |
              Stroke width: {adaptiveProfile.strokeWidth}px |
              {adaptiveProfile.showGuidelines && ' Guidelines ON'}
            </div>
          )}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {feedback}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onBack}
            className="px-4 py-2 text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Complete Exercise'}
          </button>
        </div>
      </div>
    </div>
  );
}
