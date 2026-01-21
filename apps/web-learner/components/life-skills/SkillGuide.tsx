'use client';

import React, { useState, useEffect } from 'react';
import { DifficultyBadge } from './SkillCard';
import { EncouragementCard } from './EncouragementCard';
import {
  SkillGuide as SkillGuideType,
  LearnerSkillProgress,
  ProgressStatus,
  SKILL_CATEGORY_INFO,
} from './types';

interface SkillGuideProps {
  tenantId: string;
  learnerId: string;
  skillId: string;
  apiBaseUrl: string;
  onStartPractice: () => void;
  onBack: () => void;
}

export function SkillGuide({
  tenantId,
  learnerId,
  skillId,
  apiBaseUrl,
  onStartPractice,
  onBack,
}: SkillGuideProps) {
  const [guide, setGuide] = useState<SkillGuideType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGuide() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${apiBaseUrl}/skills/${skillId}/guide?tenantId=${tenantId}&learnerId=${learnerId}`
        );

        if (!res.ok) {
          throw new Error('Failed to fetch skill guide');
        }

        const data = await res.json();
        setGuide(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchGuide();
  }, [apiBaseUrl, tenantId, learnerId, skillId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load skill</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { skill, steps, learnerProgress } = guide;
  const categoryInfo = SKILL_CATEGORY_INFO[skill.category];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="relative h-64 bg-gradient-to-b from-blue-600 to-blue-800">
        {skill.thumbnailUrl && (
          <img
            src={skill.thumbnailUrl}
            alt={skill.name}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="text-3xl font-bold text-white mb-2">{skill.name}</h1>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm flex items-center gap-1">
              <span>{categoryInfo.icon}</span>
              <span>{categoryInfo.label}</span>
            </span>
            <DifficultyBadge difficulty={skill.difficulty} />
            {skill.estimatedMinutes && (
              <span className="text-white/80 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {skill.estimatedMinutes} min
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 -mt-4 relative z-10">
        {/* Description card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <p className="text-gray-700 text-lg">{skill.description}</p>
        </div>

        {/* Progress card */}
        {learnerProgress && (
          <ProgressCard progress={learnerProgress} />
        )}

        {/* Encouragement */}
        <EncouragementCard
          tenantId={tenantId}
          learnerId={learnerId}
          skillId={skillId}
          apiBaseUrl={apiBaseUrl}
        />

        {/* Steps to learn */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Steps to Learn</h2>
          <p className="text-gray-600 mb-6">
            This skill is broken into {steps.length} easy steps:
          </p>

          <div className="space-y-4">
            {steps.map((step, index) => {
              const stepProgress = learnerProgress?.stepProgress.find(
                (sp) => sp.stepId === step.id
              );
              const isCompleted = stepProgress?.status === ProgressStatus.ACHIEVED;
              const isInProgress = stepProgress?.status === ProgressStatus.IN_PROGRESS;

              return (
                <div key={step.id} className="flex gap-4">
                  {/* Step indicator */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isInProgress
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 mt-2 ${
                          isCompleted ? 'bg-green-300' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>

                  {/* Step content */}
                  <div
                    className={`flex-1 pb-6 ${
                      isInProgress ? 'bg-blue-50 -mx-2 px-2 py-2 rounded-lg' : ''
                    }`}
                  >
                    <h3
                      className={`font-medium ${
                        isCompleted
                          ? 'text-gray-400 line-through'
                          : 'text-gray-900'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{step.instruction}</p>

                    {stepProgress && stepProgress.attemptsCount > 0 && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {stepProgress.attemptsCount} attempts
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          {Math.round(stepProgress.successRate * 100)}% success
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Materials needed */}
        {guide.taskAnalysis.materialsNeeded.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Materials Needed</h2>
            <ul className="grid grid-cols-2 gap-2">
              {guide.taskAnalysis.materialsNeeded.map((material, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-700">
                  <span className="text-green-500">✓</span>
                  {material}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Safety considerations */}
        {guide.taskAnalysis.safetyConsiderations && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="text-lg font-bold text-amber-800 mb-2">Safety Notes</h2>
                <p className="text-amber-700">{guide.taskAnalysis.safetyConsiderations}</p>
              </div>
            </div>
          </div>
        )}

        {/* Start practice button */}
        <div className="sticky bottom-4 flex justify-center">
          <button
            onClick={onStartPractice}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            {learnerProgress ? 'Continue Practice' : 'Start Learning'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProgressCardProps {
  progress: LearnerSkillProgress;
}

function ProgressCard({ progress }: ProgressCardProps) {
  const masteryPercent = Math.round(progress.currentMastery * 100);
  const completedSteps = progress.stepProgress.filter(
    (sp) => sp.status === ProgressStatus.ACHIEVED
  ).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Your Progress</h2>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className={`text-3xl font-bold ${getMasteryColor(progress.currentMastery)}`}>
            {masteryPercent}%
          </div>
          <div className="text-sm text-gray-500">Mastery</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {completedSteps}/{progress.stepProgress.length}
          </div>
          <div className="text-sm text-gray-500">Steps</div>
        </div>
        {progress.currentStreak > 0 && (
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500">
              {progress.currentStreak} 🔥
            </div>
            <div className="text-sm text-gray-500">Day Streak</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${getMasteryBgColor(progress.currentMastery)}`}
          style={{ width: `${masteryPercent}%` }}
        />
      </div>

      {progress.lastPracticedAt && (
        <div className="mt-3 text-sm text-gray-500">
          Last practiced: {formatDate(progress.lastPracticedAt)}
        </div>
      )}
    </div>
  );
}

function getMasteryColor(mastery: number): string {
  if (mastery >= 0.8) return 'text-green-600';
  if (mastery >= 0.5) return 'text-orange-600';
  return 'text-blue-600';
}

function getMasteryBgColor(mastery: number): string {
  if (mastery >= 0.8) return 'bg-green-500';
  if (mastery >= 0.5) return 'bg-orange-500';
  return 'bg-blue-500';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}
