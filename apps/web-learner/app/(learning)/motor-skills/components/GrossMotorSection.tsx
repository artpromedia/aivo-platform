'use client';

import { useState } from 'react';
import {
  GrossMotorExercise,
  GROSS_MOTOR_TYPE_META,
  motorSkillsApi,
} from '../../../../lib/motor-skills-api';

interface GrossMotorSectionProps {
  exercises: GrossMotorExercise[];
  learnerId: string;
  onRefresh: () => void;
}

export function GrossMotorSection({
  exercises,
  learnerId,
  onRefresh,
}: GrossMotorSectionProps) {
  const [selectedExercise, setSelectedExercise] = useState<GrossMotorExercise | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filteredExercises = exercises.filter((ex) => {
    if (filter === 'all') return true;
    return ex.type === filter;
  });

  const groupedByType = filteredExercises.reduce(
    (acc, ex) => {
      const type = ex.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(ex);
      return acc;
    },
    {} as Record<string, GrossMotorExercise[]>
  );

  if (selectedExercise) {
    return (
      <GrossMotorPractice
        exercise={selectedExercise}
        learnerId={learnerId}
        onBack={() => {
          setSelectedExercise(null);
          onRefresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Type Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-green-100 text-green-800'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Types
        </button>
        {Object.entries(GROSS_MOTOR_TYPE_META).map(([type, meta]) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-green-100 text-green-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="mr-1">{meta.icon}</span>
            {meta.label}
          </button>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-2xl mr-3">🏃</span>
          <div>
            <h4 className="font-medium text-green-900">Movement Break Time!</h4>
            <p className="text-sm text-green-700 mt-1">
              These exercises help develop coordination and body awareness.
              Make sure you have enough space and adult supervision when needed.
            </p>
          </div>
        </div>
      </div>

      {/* Exercises by Type */}
      {Object.entries(groupedByType).map(([type, typeExercises]) => {
        const meta = GROSS_MOTOR_TYPE_META[type as keyof typeof GROSS_MOTOR_TYPE_META];
        return (
          <div key={type} className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <span className="mr-2">{meta?.icon || '🏃'}</span>
              {meta?.label || type}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typeExercises.map((exercise) => (
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
          <p className="text-slate-600">No exercises found for this type.</p>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  exercise,
  onClick,
}: {
  exercise: GrossMotorExercise;
  onClick: () => void;
}) {
  const typeMeta = GROSS_MOTOR_TYPE_META[exercise.type];

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-green-300 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          style={{ backgroundColor: `${typeMeta?.color || '#10B981'}20` }}
        >
          {typeMeta?.icon || '🏃'}
        </div>
        <div className="flex items-center space-x-2">
          {exercise.completedAt && (
            <span className="text-green-600 text-sm">✓</span>
          )}
          <span className="text-xs text-slate-500">
            {Math.floor(exercise.durationSeconds / 60)}:{(exercise.durationSeconds % 60)
              .toString()
              .padStart(2, '0')}
          </span>
        </div>
      </div>

      <h4 className="font-medium text-slate-900 mb-1">{exercise.title}</h4>
      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{exercise.description}</p>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          {exercise.requiresEquipment && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
              Equipment
            </span>
          )}
          {exercise.requiresSupervision && (
            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
              Supervision
            </span>
          )}
        </div>
        <span className="text-slate-500">{exercise.repetitions} reps</span>
      </div>
    </div>
  );
}

function GrossMotorPractice({
  exercise,
  learnerId,
  onBack,
}: {
  exercise: GrossMotorExercise;
  learnerId: string;
  onBack: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [currentRep, setCurrentRep] = useState(1);

  const typeMeta = GROSS_MOTOR_TYPE_META[exercise.type];

  const completeExercise = async () => {
    setIsComplete(true);
    try {
      await motorSkillsApi.submitGrossMotorResult(learnerId, exercise.id, {
        completedReps: exercise.repetitions,
        timeSpentMs: exercise.durationSeconds * 1000,
        selfRating: 4,
      });
    } catch (err) {
      console.error('Failed to submit result:', err);
    }
  };

  const nextStep = () => {
    if (currentStep < exercise.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (currentRep < exercise.repetitions) {
      setCurrentRep(currentRep + 1);
      setCurrentStep(0);
    } else {
      completeExercise();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
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
        <div className="flex items-center space-x-2">
          <span
            className="px-3 py-1 rounded-full text-sm"
            style={{
              backgroundColor: `${typeMeta?.color || '#10B981'}20`,
              color: typeMeta?.color || '#10B981',
            }}
          >
            {typeMeta?.icon} {typeMeta?.label}
          </span>
        </div>
      </div>

      {/* Exercise Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{exercise.title}</h2>
        <p className="text-slate-600 mb-4">{exercise.description}</p>

        {/* Safety Notices */}
        <div className="flex flex-wrap gap-2 mb-6">
          {exercise.requiresEquipment && (
            <div className="flex items-center px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-yellow-600 mr-2">⚠️</span>
              <span className="text-sm text-yellow-800">
                Equipment needed: {exercise.equipment?.join(', ') || 'Check instructions'}
              </span>
            </div>
          )}
          {exercise.requiresSupervision && (
            <div className="flex items-center px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-600 mr-2">👤</span>
              <span className="text-sm text-red-800">Adult supervision recommended</span>
            </div>
          )}
        </div>

        {!isComplete ? (
          <>
            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-500">
                Rep {currentRep} of {exercise.repetitions}
              </span>
              <span className="text-sm text-slate-500">
                Step {currentStep + 1} of {exercise.steps.length}
              </span>
            </div>

            {/* Step Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2 mb-6">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{
                  width: `${((currentStep + 1) / exercise.steps.length) * 100}%`,
                }}
              />
            </div>

            {/* Current Step */}
            <div className="bg-green-50 rounded-lg p-8 mb-6 text-center">
              <div className="text-6xl mb-4">{typeMeta?.icon || '🏃'}</div>
              <h3 className="text-xl font-semibold text-green-900 mb-2">
                Step {currentStep + 1}
              </h3>
              <p className="text-lg text-green-800">
                {exercise.steps[currentStep] || 'Follow the movement guide'}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {currentStep === exercise.steps.length - 1 && currentRep === exercise.repetitions
                  ? 'Complete'
                  : 'Next →'}
              </button>
            </div>
          </>
        ) : (
          /* Completion Screen */
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Exercise Complete!</h3>
            <p className="text-slate-600 mb-6">
              You completed {exercise.repetitions} repetitions of {exercise.title}
            </p>

            {/* Self Rating */}
            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-2">How did you feel?</p>
              <div className="flex justify-center space-x-4">
                {['😫', '😐', '😊', '💪', '🌟'].map((emoji, idx) => (
                  <button
                    key={idx}
                    className="text-3xl hover:scale-125 transition-transform"
                    onClick={() => {}}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onBack}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Done
            </button>
          </div>
        )}

        {/* Exercise Info */}
        {!isComplete && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-medium text-slate-900 mb-2">All Steps</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
              {exercise.steps.map((step, idx) => (
                <li
                  key={idx}
                  className={idx === currentStep ? 'text-green-700 font-medium' : ''}
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
