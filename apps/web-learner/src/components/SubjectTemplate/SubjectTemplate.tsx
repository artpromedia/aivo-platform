'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import type { SubjectInfo, Lesson, SubjectProgress } from '../../systems/subjects/types';

// =============================================================================
// Props
// =============================================================================

interface SubjectTemplateProps {
  subject: SubjectInfo;
  lessons: Lesson[];
  progress?: SubjectProgress | null;
  learnerId: string;
  children?: ReactNode;
  onLessonSelect?: (lessonId: string) => void;
  onBack?: () => void;
}

// =============================================================================
// Subject Template Component
// =============================================================================

export function SubjectTemplate({
  subject,
  lessons,
  progress,
  learnerId,
  children,
  onLessonSelect,
  onBack,
}: SubjectTemplateProps) {
  const [activeTab, setActiveTab] = useState<'lessons' | 'progress' | 'resources'>('lessons');
  const [focusMode, setFocusMode] = useState(false);

  // Calculate stats
  const completedLessons = progress?.lessonsCompleted || 0;
  const totalLessons = lessons.length;
  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  const totalTime = progress?.timeSpentMinutes || 0;

  // Format time
  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--aivo-teal-50)] to-[var(--aivo-purple-50)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Subject Info */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="rounded-lg p-2 text-[var(--aivo-neutral-500)] hover:bg-[var(--aivo-neutral-100)] hover:text-[var(--aivo-brand-navy)]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${subject.color} text-3xl shadow-md`}
              >
                {subject.emoji}
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--aivo-brand-navy)]">
                  {subject.name}
                </h1>
                <p className="text-sm text-[var(--aivo-neutral-500)]">
                  {subject.description}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden items-center gap-6 md:flex">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--aivo-brand-primary)]">
                  {Math.round(overallProgress)}%
                </div>
                <div className="text-xs text-[var(--aivo-neutral-500)]">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--aivo-teal-500)]">
                  {completedLessons}/{totalLessons}
                </div>
                <div className="text-xs text-[var(--aivo-neutral-500)]">Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--aivo-purple-500)]">
                  {formatTime(totalTime)}
                </div>
                <div className="text-xs text-[var(--aivo-neutral-500)]">Time Spent</div>
              </div>
            </div>

            {/* Focus Mode Toggle */}
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                focusMode
                  ? 'bg-[var(--aivo-brand-primary)] text-white'
                  : 'bg-[var(--aivo-purple-50)] text-[var(--aivo-brand-primary)]'
              }`}
            >
              {focusMode ? '🎯 Focus Mode' : '🧘 Enable Focus'}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mx-auto max-w-7xl px-4 pb-4">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--aivo-purple-100)]">
            <div
              className="h-full bg-gradient-to-r from-[var(--aivo-teal-400)] to-[var(--aivo-brand-primary)] transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <div className="flex gap-2">
          {(['lessons', 'progress', 'resources'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-white text-[var(--aivo-brand-primary)] shadow-sm'
                  : 'text-[var(--aivo-neutral-500)] hover:text-[var(--aivo-brand-navy)]'
              }`}
            >
              {tab === 'lessons' && '📚 Lessons'}
              {tab === 'progress' && '📊 Progress'}
              {tab === 'resources' && '🔗 Resources'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Lessons Tab */}
        {activeTab === 'lessons' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson, index) => {
              const lessonProgress = progress?.scores.find((s) => s.lessonId === lesson.id);
              const isCompleted = !!lessonProgress?.completedAt;
              const isCurrent = progress?.currentLessonId === lesson.id;
              const isLocked = index > 0 && !progress?.scores.find(
                (s) => s.lessonId === lessons[index - 1]?.id
              )?.completedAt;

              return (
                <div
                  key={lesson.id}
                  onClick={() => !isLocked && onLessonSelect?.(lesson.id)}
                  className={`group cursor-pointer rounded-2xl border-2 bg-white p-5 shadow-sm transition-all ${
                    isLocked
                      ? 'cursor-not-allowed border-[var(--aivo-neutral-200)] opacity-60'
                      : isCurrent
                        ? 'border-[var(--aivo-brand-primary)] ring-4 ring-[var(--aivo-purple-100)]'
                        : isCompleted
                          ? 'border-[var(--aivo-teal-400)]'
                          : 'border-[var(--aivo-neutral-200)] hover:border-[var(--aivo-purple-300)] hover:shadow-md'
                  }`}
                >
                  {/* Lesson Number & Status */}
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        isCompleted
                          ? 'bg-[var(--aivo-teal-400)] text-white'
                          : isCurrent
                            ? 'bg-[var(--aivo-brand-primary)] text-white'
                            : 'bg-[var(--aivo-purple-100)] text-[var(--aivo-brand-primary)]'
                      }`}
                    >
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--aivo-neutral-500)]">
                      <span>⏱️ {lesson.durationMinutes} min</span>
                      {isLocked && <span>🔒</span>}
                    </div>
                  </div>

                  {/* Lesson Info */}
                  <h3 className="mb-1 font-semibold text-[var(--aivo-brand-navy)] group-hover:text-[var(--aivo-brand-primary)]">
                    {lesson.title}
                  </h3>
                  <p className="mb-3 text-sm text-[var(--aivo-neutral-500)]">
                    {lesson.description}
                  </p>

                  {/* Type Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        lesson.type === 'video'
                          ? 'bg-red-100 text-red-700'
                          : lesson.type === 'interactive'
                            ? 'bg-blue-100 text-blue-700'
                            : lesson.type === 'practice'
                              ? 'bg-green-100 text-green-700'
                              : lesson.type === 'game'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {lesson.type === 'video' && '🎬 Video'}
                      {lesson.type === 'interactive' && '🖱️ Interactive'}
                      {lesson.type === 'practice' && '📝 Practice'}
                      {lesson.type === 'game' && '🎮 Game'}
                      {lesson.type === 'reading' && '📖 Reading'}
                      {lesson.type === 'project' && '🛠️ Project'}
                      {lesson.type === 'assessment' && '📋 Assessment'}
                    </span>
                    {lessonProgress?.score !== undefined && (
                      <span className="rounded-full bg-[var(--aivo-teal-100)] px-3 py-1 text-xs font-medium text-[var(--aivo-teal-700)]">
                        Score: {lessonProgress.score}%
                      </span>
                    )}
                  </div>

                  {/* Current Lesson Indicator */}
                  {isCurrent && (
                    <div className="mt-4 rounded-lg bg-[var(--aivo-purple-50)] p-3 text-center">
                      <span className="text-sm font-medium text-[var(--aivo-brand-primary)]">
                        ▶️ Continue where you left off
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Stats Cards */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-[var(--aivo-brand-navy)]">
                📊 Learning Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-[var(--aivo-purple-50)] p-4 text-center">
                  <div className="text-3xl font-bold text-[var(--aivo-brand-primary)]">
                    {Math.round(overallProgress)}%
                  </div>
                  <div className="text-sm text-[var(--aivo-neutral-500)]">Overall Progress</div>
                </div>
                <div className="rounded-xl bg-[var(--aivo-teal-50)] p-4 text-center">
                  <div className="text-3xl font-bold text-[var(--aivo-teal-500)]">
                    {completedLessons}
                  </div>
                  <div className="text-sm text-[var(--aivo-neutral-500)]">Lessons Completed</div>
                </div>
                <div className="rounded-xl bg-blue-50 p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatTime(totalTime)}
                  </div>
                  <div className="text-sm text-[var(--aivo-neutral-500)]">Total Time</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-4 text-center">
                  <div className="text-3xl font-bold text-amber-600">
                    {progress?.masteryLevel === 'mastered' ? '🏆' : progress?.masteryLevel === 'proficient' ? '⭐' : '📈'}
                  </div>
                  <div className="text-sm text-[var(--aivo-neutral-500)]">
                    {progress?.masteryLevel?.replace('_', ' ') || 'Not Started'}
                  </div>
                </div>
              </div>
            </div>

            {/* Score History */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-[var(--aivo-brand-navy)]">
                📈 Recent Scores
              </h3>
              {progress?.scores && progress.scores.length > 0 ? (
                <div className="space-y-3">
                  {progress.scores.slice(-5).reverse().map((score) => {
                    const lesson = lessons.find((l) => l.id === score.lessonId);
                    return (
                      <div
                        key={score.lessonId}
                        className="flex items-center justify-between rounded-lg bg-[var(--aivo-neutral-50)] p-3"
                      >
                        <div>
                          <div className="font-medium text-[var(--aivo-brand-navy)]">
                            {lesson?.title || 'Unknown Lesson'}
                          </div>
                          <div className="text-xs text-[var(--aivo-neutral-500)]">
                            {new Date(score.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            score.score >= 80
                              ? 'text-[var(--aivo-teal-500)]'
                              : score.score >= 60
                                ? 'text-amber-500'
                                : 'text-red-500'
                          }`}
                        >
                          {score.score}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg bg-[var(--aivo-neutral-50)] p-6 text-center">
                  <p className="text-[var(--aivo-neutral-500)]">
                    Complete lessons to see your scores here!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-[var(--aivo-brand-navy)]">
              🔗 Additional Resources
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--aivo-neutral-200)] p-4 hover:border-[var(--aivo-purple-300)] hover:shadow-sm">
                <div className="mb-2 text-2xl">📖</div>
                <h4 className="font-medium text-[var(--aivo-brand-navy)]">Study Guide</h4>
                <p className="text-sm text-[var(--aivo-neutral-500)]">
                  Download the complete study guide for this subject
                </p>
              </div>
              <div className="rounded-xl border border-[var(--aivo-neutral-200)] p-4 hover:border-[var(--aivo-purple-300)] hover:shadow-sm">
                <div className="mb-2 text-2xl">🎮</div>
                <h4 className="font-medium text-[var(--aivo-brand-navy)]">Practice Games</h4>
                <p className="text-sm text-[var(--aivo-neutral-500)]">
                  Fun games to reinforce your learning
                </p>
              </div>
              <div className="rounded-xl border border-[var(--aivo-neutral-200)] p-4 hover:border-[var(--aivo-purple-300)] hover:shadow-sm">
                <div className="mb-2 text-2xl">📹</div>
                <h4 className="font-medium text-[var(--aivo-brand-navy)]">Video Library</h4>
                <p className="text-sm text-[var(--aivo-neutral-500)]">
                  Extra video explanations and tutorials
                </p>
              </div>
              <div className="rounded-xl border border-[var(--aivo-neutral-200)] p-4 hover:border-[var(--aivo-purple-300)] hover:shadow-sm">
                <div className="mb-2 text-2xl">❓</div>
                <h4 className="font-medium text-[var(--aivo-brand-navy)]">Ask a Tutor</h4>
                <p className="text-sm text-[var(--aivo-neutral-500)]">
                  Get help from your AI tutor
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Custom Content Slot */}
        {children}
      </main>
    </div>
  );
}
