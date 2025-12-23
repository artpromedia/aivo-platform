/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain */
/**
 * Grade Calculator Component
 *
 * What-if grade calculator for students and teachers
 */

'use client';

import * as React from 'react';

import type { Grade, Assignment, GradeScale } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  calculateOverallGrade,
  getLetterGrade,
  DEFAULT_GRADE_SCALE,
} from '@/lib/utils/grade-calculations';

interface GradeCalculatorProps {
  assignments: Assignment[];
  currentGrades: Grade[];
  categoryWeights: Record<string, number>;
  gradeScale?: GradeScale;
  className?: string;
}

export function GradeCalculator({
  assignments,
  currentGrades,
  categoryWeights,
  gradeScale = DEFAULT_GRADE_SCALE,
  className,
}: GradeCalculatorProps) {
  const [hypotheticalGrades, setHypotheticalGrades] = React.useState<Record<string, number | null>>(
    {}
  );
  const [targetGrade, setTargetGrade] = React.useState<string>('');

  // Merge current grades with hypothetical
  const mergedGrades = React.useMemo(() => {
    const gradeMap = new Map(currentGrades.map((g) => [g.assignmentId, g]));

    return assignments.map((assignment) => {
      const currentGrade = gradeMap.get(assignment.id);
      const hypothetical = hypotheticalGrades[assignment.id];

      return {
        assignmentId: assignment.id,
        score: hypothetical ?? currentGrade?.score ?? null,
        maxPoints: assignment.totalPoints,
        category: assignment.category,
        isHypothetical:
          hypothetical !== undefined && hypothetical !== (currentGrade?.score ?? null),
      };
    });
  }, [assignments, currentGrades, hypotheticalGrades]);

  // Calculate overall with merged grades
  const overallResult = React.useMemo(() => {
    return calculateOverallGrade(
      mergedGrades.map((g) => ({
        assignmentId: g.assignmentId,
        score: g.score ?? 0,
        maxPoints: g.maxPoints,
      })),
      assignments.map((a) => ({
        id: a.id,
        totalPoints: a.totalPoints,
        category: a.category,
      })),
      categoryWeights
    );
  }, [mergedGrades, assignments, categoryWeights]);

  const letterGrade = getLetterGrade(overallResult.overall, gradeScale);

  // Calculate what score is needed on remaining assignments to reach target
  const targetAnalysis = React.useMemo(() => {
    if (!targetGrade) return null;

    const targetPct = parseFloat(targetGrade);
    if (isNaN(targetPct)) return null;

    const ungraded = assignments.filter((a) => {
      const grade = currentGrades.find((g) => g.assignmentId === a.id);
      return !grade || grade.score === null;
    });

    if (ungraded.length === 0) {
      return {
        possible: overallResult.overall >= targetPct,
        message:
          overallResult.overall >= targetPct
            ? "You've already achieved this grade!"
            : 'All assignments are graded. Target cannot be reached.',
        neededAverage: null,
      };
    }

    // Simple calculation - what average is needed on remaining
    const gradedTotal = mergedGrades
      .filter(
        (g) =>
          g.score !== null &&
          !assignments.find((a) => a.id === g.assignmentId && ungraded.includes(a))
      )
      .reduce((sum, g) => sum + (g.score ?? 0), 0);
    const gradedMax = mergedGrades
      .filter(
        (g) =>
          g.score !== null &&
          !assignments.find((a) => a.id === g.assignmentId && ungraded.includes(a))
      )
      .reduce((sum, g) => sum + g.maxPoints, 0);

    const ungradedMax = ungraded.reduce((sum, a) => sum + a.totalPoints, 0);
    const totalMax = gradedMax + ungradedMax;

    // targetPct = (gradedTotal + neededPoints) / totalMax * 100
    // neededPoints = (targetPct / 100 * totalMax) - gradedTotal
    const neededPoints = (targetPct / 100) * totalMax - gradedTotal;
    const neededAverage = (neededPoints / ungradedMax) * 100;

    if (neededAverage > 100) {
      return {
        possible: false,
        message: `You would need ${neededAverage.toFixed(1)}% average on remaining assignments, which exceeds 100%.`,
        neededAverage,
      };
    }

    if (neededAverage < 0) {
      return {
        possible: true,
        message:
          "You've already achieved this grade! Any score on remaining assignments will keep you above target.",
        neededAverage: 0,
      };
    }

    return {
      possible: true,
      message: `You need an average of ${neededAverage.toFixed(1)}% on remaining assignments.`,
      neededAverage,
    };
  }, [targetGrade, assignments, currentGrades, mergedGrades, overallResult]);

  const handleHypotheticalChange = (assignmentId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setHypotheticalGrades((prev) => ({
      ...prev,
      [assignmentId]: isNaN(numValue!) ? null : numValue,
    }));
  };

  const resetHypothetical = () => {
    setHypotheticalGrades({});
  };

  const hasChanges = Object.keys(hypotheticalGrades).length > 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overall Grade Display */}
      <div className="rounded-xl border bg-gradient-to-br from-primary-50 to-white p-6 text-center">
        <p className="text-sm font-medium text-gray-500">
          {hasChanges ? 'Projected Grade' : 'Current Grade'}
        </p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <span className="text-5xl font-bold text-primary-700">{letterGrade}</span>
          <span className="text-2xl text-gray-600">{overallResult.overall.toFixed(1)}%</span>
        </div>
        {hasChanges && (
          <button
            onClick={resetHypothetical}
            className="mt-3 text-sm text-primary-600 hover:underline"
          >
            Reset to current grades
          </button>
        )}
      </div>

      {/* Target Grade Calculator */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 font-medium text-gray-900">Target Grade Calculator</h3>
        <div className="flex gap-3">
          <input
            type="number"
            value={targetGrade}
            onChange={(e) => {
              setTargetGrade(e.target.value);
            }}
            placeholder="Enter target %"
            min={0}
            max={100}
            className="w-32 rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <span className="flex items-center text-sm text-gray-500">
            What do I need to get {targetGrade ? `${targetGrade}%` : '...'}?
          </span>
        </div>
        {targetAnalysis && (
          <div
            className={cn(
              'mt-3 rounded-lg p-3 text-sm',
              targetAnalysis.possible ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            )}
          >
            {targetAnalysis.message}
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 font-medium text-gray-900">Grade by Category</h3>
        <div className="space-y-3">
          {Object.entries(overallResult.byCategory).map(([category, data]) => (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{category}</span>
                <span className="text-xs text-gray-400">
                  ({(categoryWeights[category] * 100).toFixed(0)}% weight)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-primary-500"
                    style={{ width: `${Math.min(100, data.percentage)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm font-medium text-gray-900">
                  {data.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What-If Scenarios */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 font-medium text-gray-900">What-If Scenarios</h3>
        <p className="mb-3 text-sm text-gray-500">
          Enter hypothetical scores to see how they would affect your grade.
        </p>
        <div className="max-h-64 space-y-2 overflow-auto">
          {assignments.map((assignment) => {
            const currentGrade = currentGrades.find((g) => g.assignmentId === assignment.id);
            const hypothetical = hypotheticalGrades[assignment.id];
            const isModified =
              hypothetical !== undefined && hypothetical !== (currentGrade?.score ?? null);

            return (
              <div
                key={assignment.id}
                className={cn(
                  'flex items-center justify-between rounded p-2',
                  isModified && 'bg-yellow-50'
                )}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{assignment.title}</p>
                  <p className="text-xs text-gray-500">
                    {assignment.category} · {assignment.totalPoints} pts
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {currentGrade?.score !== null && currentGrade?.score !== undefined && (
                    <span className="text-xs text-gray-400">Current: {currentGrade.score}</span>
                  )}
                  <input
                    type="number"
                    value={hypothetical ?? ''}
                    onChange={(e) => {
                      handleHypotheticalChange(assignment.id, e.target.value);
                    }}
                    placeholder={currentGrade?.score?.toString() ?? '—'}
                    min={0}
                    max={assignment.totalPoints * 1.2}
                    className={cn(
                      'w-20 rounded border px-2 py-1 text-center text-sm',
                      isModified && 'border-yellow-400 bg-yellow-50'
                    )}
                  />
                  <span className="text-xs text-gray-400">/ {assignment.totalPoints}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
