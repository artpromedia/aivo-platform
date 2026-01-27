'use client';

import { useState } from 'react';
import {
  FineMotorActivity,
  FINE_MOTOR_TYPE_META,
  motorSkillsApi,
} from '../../../../lib/motor-skills-api';

interface FineMotorSectionProps {
  activities: FineMotorActivity[];
  learnerId: string;
  onRefresh: () => void;
}

export function FineMotorSection({
  activities,
  learnerId,
  onRefresh,
}: FineMotorSectionProps) {
  const [selectedActivity, setSelectedActivity] = useState<FineMotorActivity | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filteredActivities = activities.filter((act) => {
    if (filter === 'all') return true;
    return act.type === filter;
  });

  const groupedByType = filteredActivities.reduce(
    (acc, act) => {
      const type = act.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(act);
      return acc;
    },
    {} as Record<string, FineMotorActivity[]>
  );

  if (selectedActivity) {
    return (
      <FineMotorPractice
        activity={selectedActivity}
        learnerId={learnerId}
        onBack={() => {
          setSelectedActivity(null);
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
              ? 'bg-blue-100 text-blue-800'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Types
        </button>
        {Object.entries(FINE_MOTOR_TYPE_META).map(([type, meta]) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-blue-100 text-blue-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="mr-1">{meta.icon}</span>
            {meta.label}
          </button>
        ))}
      </div>

      {/* Activities by Type */}
      {Object.entries(groupedByType).map(([type, typeActivities]) => {
        const meta = FINE_MOTOR_TYPE_META[type as keyof typeof FINE_MOTOR_TYPE_META];
        return (
          <div key={type} className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <span className="mr-2">{meta?.icon || '👆'}</span>
              {meta?.label || type}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typeActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onClick={() => setSelectedActivity(activity)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {filteredActivities.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <p className="text-slate-600">No activities found for this type.</p>
        </div>
      )}
    </div>
  );
}

function ActivityCard({
  activity,
  onClick,
}: {
  activity: FineMotorActivity;
  onClick: () => void;
}) {
  const typeMeta = FINE_MOTOR_TYPE_META[activity.type];

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          style={{ backgroundColor: `${typeMeta?.color || '#3B82F6'}20` }}
        >
          {typeMeta?.icon || '👆'}
        </div>
        <div className="flex items-center space-x-2">
          {activity.completedAt && (
            <span className="text-green-600 text-sm">✓</span>
          )}
          <span className="text-xs text-slate-500">
            {activity.durationSeconds}s
          </span>
        </div>
      </div>

      <h4 className="font-medium text-slate-900 mb-1">{activity.title}</h4>
      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{activity.description}</p>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          {[1, 2, 3].map((star) => (
            <span
              key={star}
              className={star <= activity.difficulty ? 'text-yellow-500' : 'text-slate-300'}
            >
              ★
            </span>
          ))}
        </div>
        {activity.bestScore !== undefined && (
          <span className="text-slate-500">Best: {activity.bestScore}%</span>
        )}
      </div>
    </div>
  );
}

function FineMotorPractice({
  activity,
  learnerId,
  onBack,
}: {
  activity: FineMotorActivity;
  learnerId: string;
  onBack: () => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(activity.durationSeconds);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const typeMeta = FINE_MOTOR_TYPE_META[activity.type];

  const startActivity = () => {
    setIsRunning(true);
    // Start timer
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          completeActivity();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeActivity = async () => {
    setIsRunning(false);
    setIsComplete(true);
    const finalScore = Math.floor(Math.random() * 30) + 70; // Simulated score
    setScore(finalScore);

    try {
      await motorSkillsApi.submitFineMotorResult(learnerId, activity.id, {
        score: finalScore,
        timeSpentMs: activity.durationSeconds * 1000,
        accuracy: finalScore,
      });
    } catch (err) {
      console.error('Failed to submit result:', err);
    }
  };

  const getActivityInstructions = () => {
    switch (activity.type) {
      case 'tapping':
        return 'Tap the highlighted targets as quickly and accurately as possible.';
      case 'tracing':
        return 'Trace along the path without going outside the lines.';
      case 'dragging':
        return 'Drag items to their matching positions.';
      case 'pinching':
        return 'Use pinch gestures to resize objects to the target size.';
      case 'rotating':
        return 'Rotate objects to match the target orientation.';
      default:
        return activity.description;
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
          Back to Activities
        </button>
        <div className="flex items-center space-x-2">
          <span
            className="px-3 py-1 rounded-full text-sm"
            style={{
              backgroundColor: `${typeMeta?.color || '#3B82F6'}20`,
              color: typeMeta?.color || '#3B82F6',
            }}
          >
            {typeMeta?.icon} {typeMeta?.label}
          </span>
        </div>
      </div>

      {/* Activity Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{activity.title}</h2>
        <p className="text-slate-600 mb-4">{getActivityInstructions()}</p>

        {/* Timer Display */}
        <div className="flex items-center justify-center mb-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-slate-900">{timeLeft}</div>
            <div className="text-sm text-slate-500">seconds</div>
          </div>
        </div>

        {/* Activity Area */}
        <div
          className={`border-2 rounded-lg p-8 text-center transition-all ${
            isRunning
              ? 'border-blue-400 bg-blue-50'
              : 'border-dashed border-slate-300 bg-white'
          }`}
          style={{ minHeight: '300px' }}
        >
          {!isRunning && !isComplete && (
            <div className="flex flex-col items-center justify-center h-full">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4"
                style={{ backgroundColor: `${typeMeta?.color || '#3B82F6'}20` }}
              >
                {typeMeta?.icon || '👆'}
              </div>
              <p className="text-slate-600 mb-6">{activity.description}</p>
              <button
                onClick={startActivity}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium"
              >
                Start Activity
              </button>
            </div>
          )}

          {isRunning && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-pulse text-6xl mb-4">{typeMeta?.icon || '👆'}</div>
              <p className="text-lg text-blue-800">Activity in progress...</p>
              <p className="text-sm text-blue-600 mt-2">
                Interactive {activity.type} area would be here
              </p>
            </div>
          )}

          {isComplete && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Great Job!</h3>
              <p className="text-lg text-slate-600 mb-4">
                Your score: <span className="font-bold text-blue-600">{score}%</span>
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setIsComplete(false);
                    setTimeLeft(activity.durationSeconds);
                  }}
                  className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                >
                  Try Again
                </button>
                <button
                  onClick={onBack}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Difficulty Indicator */}
        <div className="flex items-center justify-center mt-4 text-sm text-slate-500">
          <span className="mr-2">Difficulty:</span>
          {[1, 2, 3].map((star) => (
            <span
              key={star}
              className={star <= activity.difficulty ? 'text-yellow-500' : 'text-slate-300'}
            >
              ★
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
