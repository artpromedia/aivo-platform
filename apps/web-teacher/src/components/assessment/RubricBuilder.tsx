'use client';

/**
 * RubricBuilder Component
 *
 * Interactive builder for creating assessment rubrics with criteria and levels
 * Used primarily for project-based assessments
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import type { AssessmentRubric, RubricCriterion, RubricLevel } from '@/lib/types';

interface RubricBuilderProps {
  rubric: AssessmentRubric | null;
  onChange: (rubric: AssessmentRubric | null) => void;
  className?: string;
}

const DEFAULT_LEVELS = ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'];
const DEFAULT_POINTS = [4, 3, 2, 1];

const createDefaultLevel = (name: string, points: number): RubricLevel => ({
  id: crypto.randomUUID(),
  name,
  points,
  description: '',
});

const createDefaultCriterion = (): RubricCriterion => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  weight: 1,
  levels: DEFAULT_LEVELS.map((name, i) => createDefaultLevel(name, DEFAULT_POINTS[i])),
});

const createDefaultRubric = (): AssessmentRubric => ({
  title: 'Assessment Rubric',
  criteria: [createDefaultCriterion()],
  totalPoints: 4,
});

export function RubricBuilder({ rubric, onChange, className }: RubricBuilderProps) {
  const [expandedCriteria, setExpandedCriteria] = React.useState<Set<string>>(new Set());

  const currentRubric = rubric || createDefaultRubric();

  const updateRubric = (updates: Partial<AssessmentRubric>) => {
    const updated = { ...currentRubric, ...updates };
    // Recalculate total points
    updated.totalPoints = updated.criteria.reduce(
      (sum, c) => sum + Math.max(...c.levels.map((l) => l.points)) * c.weight,
      0
    );
    onChange(updated);
  };

  const addCriterion = () => {
    const newCriterion = createDefaultCriterion();
    setExpandedCriteria((prev) => new Set([...prev, newCriterion.id]));
    updateRubric({ criteria: [...currentRubric.criteria, newCriterion] });
  };

  const updateCriterion = (criterionId: string, updates: Partial<RubricCriterion>) => {
    const criteria = currentRubric.criteria.map((c) =>
      c.id === criterionId ? { ...c, ...updates } : c
    );
    updateRubric({ criteria });
  };

  const removeCriterion = (criterionId: string) => {
    const criteria = currentRubric.criteria.filter((c) => c.id !== criterionId);
    updateRubric({ criteria });
  };

  const updateLevel = (
    criterionId: string,
    levelId: string,
    updates: Partial<RubricLevel>
  ) => {
    const criteria = currentRubric.criteria.map((c) => {
      if (c.id !== criterionId) return c;
      return {
        ...c,
        levels: c.levels.map((l) => (l.id === levelId ? { ...l, ...updates } : l)),
      };
    });
    updateRubric({ criteria });
  };

  const addLevel = (criterionId: string) => {
    const criteria = currentRubric.criteria.map((c) => {
      if (c.id !== criterionId) return c;
      const minPoints = Math.min(...c.levels.map((l) => l.points));
      return {
        ...c,
        levels: [...c.levels, createDefaultLevel('New Level', Math.max(0, minPoints - 1))],
      };
    });
    updateRubric({ criteria });
  };

  const removeLevel = (criterionId: string, levelId: string) => {
    const criteria = currentRubric.criteria.map((c) => {
      if (c.id !== criterionId) return c;
      return {
        ...c,
        levels: c.levels.filter((l) => l.id !== levelId),
      };
    });
    updateRubric({ criteria });
  };

  const toggleCriterion = (criterionId: string) => {
    setExpandedCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(criterionId)) {
        next.delete(criterionId);
      } else {
        next.add(criterionId);
      }
      return next;
    });
  };

  return (
    <div className={cn('bg-white rounded-xl shadow-lg p-6 space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rubric Builder</h2>
          <p className="text-sm text-gray-500 mt-1">
            Total Points: <span className="font-semibold">{currentRubric.totalPoints}</span>
          </p>
        </div>
        {!rubric && (
          <button
            type="button"
            onClick={() => onChange(createDefaultRubric())}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Create Rubric
          </button>
        )}
      </div>

      {rubric && (
        <>
          {/* Rubric Title */}
          <div className="space-y-2">
            <label htmlFor="rubric-title" className="block text-sm font-medium text-gray-700">
              Rubric Title
            </label>
            <input
              type="text"
              id="rubric-title"
              value={currentRubric.title}
              onChange={(e) => updateRubric({ title: e.target.value })}
              placeholder="Enter rubric title..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Criteria */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Criteria ({currentRubric.criteria.length})
              </h3>
              <button
                type="button"
                onClick={addCriterion}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Criterion
              </button>
            </div>

            {currentRubric.criteria.map((criterion, index) => (
              <div
                key={criterion.id}
                className="border-2 border-gray-200 rounded-xl overflow-hidden"
              >
                {/* Criterion Header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <button type="button" className="cursor-grab text-gray-400 hover:text-gray-600">
                    <GripVertical className="w-5 h-5" />
                  </button>

                  <span className="font-semibold text-gray-500 text-sm">#{index + 1}</span>

                  <input
                    type="text"
                    value={criterion.name}
                    onChange={(e) => updateCriterion(criterion.id, { name: e.target.value })}
                    placeholder="Criterion name..."
                    className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />

                  <div className="flex items-center gap-2">
                    <label htmlFor={`weight-${criterion.id}`} className="text-sm text-gray-500">
                      Weight:
                    </label>
                    <input
                      type="number"
                      id={`weight-${criterion.id}`}
                      value={criterion.weight}
                      onChange={(e) =>
                        updateCriterion(criterion.id, {
                          weight: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      min={1}
                      max={10}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCriterion(criterion.id)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    {expandedCriteria.has(criterion.id) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeCriterion(criterion.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    disabled={currentRubric.criteria.length <= 1}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Criterion Content */}
                {expandedCriteria.has(criterion.id) && (
                  <div className="p-4 space-y-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <label
                        htmlFor={`criterion-desc-${criterion.id}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        Description
                      </label>
                      <textarea
                        id={`criterion-desc-${criterion.id}`}
                        value={criterion.description || ''}
                        onChange={(e) =>
                          updateCriterion(criterion.id, { description: e.target.value })
                        }
                        placeholder="Describe what this criterion evaluates..."
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      />
                    </div>

                    {/* Levels */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          Performance Levels
                        </label>
                        <button
                          type="button"
                          onClick={() => addLevel(criterion.id)}
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium text-xs"
                        >
                          <Plus className="w-3 h-3" />
                          Add Level
                        </button>
                      </div>

                      <div className="grid gap-3">
                        {criterion.levels
                          .sort((a, b) => b.points - a.points)
                          .map((level) => (
                            <div
                              key={level.id}
                              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg"
                            >
                              <div className="flex-shrink-0 w-20">
                                <label className="block text-xs text-gray-500 mb-1">Points</label>
                                <input
                                  type="number"
                                  value={level.points}
                                  onChange={(e) =>
                                    updateLevel(criterion.id, level.id, {
                                      points: parseInt(e.target.value, 10) || 0,
                                    })
                                  }
                                  min={0}
                                  max={100}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
                                />
                              </div>

                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={level.name}
                                  onChange={(e) =>
                                    updateLevel(criterion.id, level.id, { name: e.target.value })
                                  }
                                  placeholder="Level name..."
                                  className="w-full px-3 py-1 text-sm font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                                <textarea
                                  value={level.description}
                                  onChange={(e) =>
                                    updateLevel(criterion.id, level.id, {
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Describe what performance at this level looks like..."
                                  rows={2}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => removeLevel(criterion.id, level.id)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                disabled={criterion.levels.length <= 2}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Preview Table */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Rubric Preview</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                      Criterion
                    </th>
                    {currentRubric.criteria[0]?.levels
                      .sort((a, b) => b.points - a.points)
                      .map((level) => (
                        <th
                          key={level.id}
                          className="px-4 py-2 text-center font-semibold text-gray-700 border-b border-gray-200"
                        >
                          {level.name}
                          <div className="text-xs font-normal text-gray-500">
                            {level.points} pts
                          </div>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRubric.criteria.map((criterion) => (
                    <tr key={criterion.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {criterion.name || '(Unnamed)'}
                        {criterion.weight > 1 && (
                          <span className="ml-2 text-xs text-gray-500">
                            (×{criterion.weight})
                          </span>
                        )}
                      </td>
                      {criterion.levels
                        .sort((a, b) => b.points - a.points)
                        .map((level) => (
                          <td
                            key={level.id}
                            className="px-4 py-3 text-gray-600 text-center"
                          >
                            {level.description || '-'}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clear Rubric */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Remove Rubric
            </button>
          </div>
        </>
      )}
    </div>
  );
}
