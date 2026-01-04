/**
 * Enhanced Grade Entry Component
 *
 * Features:
 * - Grade input with validation
 * - Comment/feedback field
 * - Rubric scoring interface
 * - Quick grade options (auto-grade MC)
 * - Grade override with reason
 */

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface GradeEntryProps {
  assignmentId: string;
  studentId: string;
  studentName: string;
  maxPoints: number;
  initialGrade?: {
    score: number | null;
    feedback?: string;
    privateNotes?: string;
    rubricScores?: any;
    status: 'graded' | 'missing' | 'late' | 'exempt' | 'pending';
  };
  rubric?: {
    id: string;
    name: string;
    maxPoints: number;
    criteria: Array<{
      id: string;
      name: string;
      description?: string;
      maxPoints: number;
      levels: Array<{
        points: number;
        label: string;
        description: string;
        feedback?: string;
      }>;
    }>;
  };
  onSubmit: (data: {
    score: number | null;
    feedback?: string;
    privateNotes?: string;
    rubricScores?: any;
    status?: string;
  }) => Promise<void>;
  onClose: () => void;
  className?: string;
}

export function GradeEntry({
  assignmentId,
  studentId,
  studentName,
  maxPoints,
  initialGrade,
  rubric,
  onSubmit,
  onClose,
  className
}: GradeEntryProps) {
  const [score, setScore] = React.useState<string>(initialGrade?.score?.toString() ?? '');
  const [feedback, setFeedback] = React.useState(initialGrade?.feedback ?? '');
  const [privateNotes, setPrivateNotes] = React.useState(initialGrade?.privateNotes ?? '');
  const [status, setStatus] = React.useState(initialGrade?.status ?? 'graded');
  const [useRubric, setUseRubric] = React.useState(false);
  const [rubricScores, setRubricScores] = React.useState<Record<string, any>>(
    initialGrade?.rubricScores ?? {}
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const calculateRubricScore = () => {
    if (!rubric) return 0;
    let total = 0;
    for (const criterion of rubric.criteria) {
      const selected = rubricScores[criterion.id];
      if (selected !== undefined) {
        total += selected.points;
      }
    }
    return total;
  };

  const handleSubmit = async () => {
    // Validate score
    let numScore: number | null = null;

    if (status === 'exempt' || status === 'missing') {
      numScore = null;
    } else if (useRubric && rubric) {
      numScore = calculateRubricScore();
    } else {
      const trimmed = score.trim();
      if (trimmed === '' || trimmed === '-') {
        numScore = null;
      } else {
        numScore = parseFloat(trimmed);
        if (isNaN(numScore)) {
          setError('Enter a valid number');
          return;
        }
        if (numScore < 0) {
          setError('Score cannot be negative');
          return;
        }
        if (numScore > maxPoints * 1.5) {
          setError(`Score seems too high (max: ${maxPoints})`);
          return;
        }
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSubmit({
        score: numScore,
        feedback,
        privateNotes,
        rubricScores: useRubric ? rubricScores : undefined,
        status
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grade');
    } finally {
      setIsSaving(false);
    }
  };

  const quickGrade = (percentage: number) => {
    const calculatedScore = (maxPoints * percentage) / 100;
    setScore(calculatedScore.toString());
  };

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50', className)}>
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Grade Entry</h2>
              <p className="text-sm text-gray-600">{studentName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="flex gap-2">
                {['graded', 'late', 'missing', 'exempt', 'pending'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm font-medium border',
                      status === s
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Rubric Toggle */}
            {rubric && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useRubric"
                  checked={useRubric}
                  onChange={(e) => setUseRubric(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="useRubric" className="text-sm font-medium text-gray-700">
                  Use rubric scoring
                </label>
              </div>
            )}

            {/* Score Input or Rubric */}
            {useRubric && rubric ? (
              <RubricScorer
                rubric={rubric}
                scores={rubricScores}
                onScoreChange={setRubricScores}
              />
            ) : status !== 'exempt' && status !== 'missing' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Score (out of {maxPoints})
                </label>
                <input
                  type="text"
                  value={score}
                  onChange={(e) => {
                    setScore(e.target.value);
                    setError(null);
                  }}
                  className={cn(
                    'w-full rounded-lg border p-3 text-lg font-medium',
                    error && 'border-red-500'
                  )}
                  placeholder="Enter score"
                  autoFocus
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

                {/* Quick Grade Buttons */}
                <div className="mt-2 flex gap-2">
                  <span className="text-sm text-gray-600">Quick grade:</span>
                  {[100, 90, 80, 70, 60, 50, 0].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => quickGrade(pct)}
                      className="rounded bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {/* Calculated percentage */}
                {score && !isNaN(parseFloat(score)) && (
                  <p className="mt-2 text-sm text-gray-600">
                    = {((parseFloat(score) / maxPoints) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            ) : null}

            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback (visible to student)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full rounded-lg border p-3"
                rows={4}
                placeholder="Add feedback for the student..."
              />

              {/* Feedback Templates */}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-gray-600">Templates:</span>
                {[
                  'Great work!',
                  'Good effort, but needs improvement.',
                  'Please revise and resubmit.',
                  'Excellent understanding!',
                  'Missing key concepts.'
                ].map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setFeedback(feedback + (feedback ? '\n' : '') + template)}
                    className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            {/* Private Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Private Notes (only visible to you)
              </label>
              <textarea
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                className="w-full rounded-lg border p-3"
                rows={3}
                placeholder="Add private notes..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Grade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Rubric Scorer Component
function RubricScorer({
  rubric,
  scores,
  onScoreChange
}: {
  rubric: GradeEntryProps['rubric'];
  scores: Record<string, any>;
  onScoreChange: (scores: Record<string, any>) => void;
}) {
  if (!rubric) return null;

  const selectLevel = (criterionId: string, level: any) => {
    onScoreChange({
      ...scores,
      [criterionId]: level
    });
  };

  const totalScore = Object.values(scores).reduce((sum: number, level: any) => sum + (level?.points ?? 0), 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium">Rubric: {rubric.name}</h3>
        <span className="text-sm text-gray-600">
          Score: {totalScore} / {rubric.maxPoints}
        </span>
      </div>

      <div className="space-y-4">
        {rubric.criteria.map((criterion) => (
          <div key={criterion.id} className="rounded-lg border p-4">
            <div className="mb-2">
              <h4 className="font-medium">{criterion.name}</h4>
              {criterion.description && (
                <p className="text-sm text-gray-600">{criterion.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Max: {criterion.maxPoints} points</p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {criterion.levels.map((level) => {
                const isSelected = scores[criterion.id]?.points === level.points;
                return (
                  <button
                    key={level.points}
                    type="button"
                    onClick={() => selectLevel(criterion.id, level)}
                    className={cn(
                      'rounded-lg border p-3 text-left text-sm transition-colors',
                      isSelected
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                        : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50'
                    )}
                  >
                    <div className="font-medium">{level.label}</div>
                    <div className="text-xs text-gray-500">{level.points} pts</div>
                    <div className="mt-1 text-xs text-gray-600">{level.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
