/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-plus-operands */
/**
 * Rubric Builder Component
 *
 * Create and edit grading rubrics
 */

'use client';

import * as React from 'react';

import type { Rubric, RubricCriterion } from '@/lib/types';
import { cn, generateId } from '@/lib/utils';

interface RubricBuilderProps {
  value: Rubric | null;
  onChange: (rubric: Rubric) => void;
  totalPoints: number;
  className?: string;
}

export function RubricBuilder({ value, onChange, totalPoints, className }: RubricBuilderProps) {
  const rubric = value ?? {
    id: generateId(),
    name: 'Assignment Rubric',
    criteria: [],
    totalPoints,
  };

  const addCriterion = () => {
    const newCriterion: RubricCriterion = {
      id: generateId(),
      name: 'New Criterion',
      description: '',
      maxPoints: 10,
      levels: [
        { score: 10, label: 'Excellent', description: 'Exceeds expectations' },
        { score: 7, label: 'Good', description: 'Meets expectations' },
        { score: 4, label: 'Fair', description: 'Partially meets expectations' },
        { score: 0, label: 'Poor', description: 'Does not meet expectations' },
      ],
    };

    onChange({
      ...rubric,
      criteria: [...rubric.criteria, newCriterion],
    });
  };

  const updateCriterion = (index: number, updates: Partial<RubricCriterion>) => {
    const newCriteria = [...rubric.criteria];
    newCriteria[index] = { ...newCriteria[index], ...updates };
    onChange({ ...rubric, criteria: newCriteria });
  };

  const removeCriterion = (index: number) => {
    const newCriteria = rubric.criteria.filter((_, i) => i !== index);
    onChange({ ...rubric, criteria: newCriteria });
  };

  const moveCriterion = (index: number, direction: 'up' | 'down') => {
    const newCriteria = [...rubric.criteria];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newCriteria.length) return;
    [newCriteria[index], newCriteria[newIndex]] = [newCriteria[newIndex], newCriteria[index]];
    onChange({ ...rubric, criteria: newCriteria });
  };

  const currentTotal = rubric.criteria.reduce((sum, c) => sum + c.maxPoints, 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <input
            type="text"
            value={rubric.name}
            onChange={(e) => {
              onChange({ ...rubric, name: e.target.value });
            }}
            className="border-0 bg-transparent text-lg font-medium focus:outline-none focus:ring-0"
            placeholder="Rubric name"
          />
          <p className="text-sm text-gray-500">
            Total: {currentTotal} / {totalPoints} points
            {currentTotal !== totalPoints && (
              <span className="ml-2 text-orange-500">
                ({currentTotal > totalPoints ? '+' : ''}
                {currentTotal - totalPoints})
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={addCriterion}
          className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          <span>+</span> Add Criterion
        </button>
      </div>

      {/* Criteria */}
      {rubric.criteria.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center text-gray-500">
          <p>No criteria yet. Click &quot;Add Criterion&quot; to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rubric.criteria.map((criterion, index) => (
            <CriterionEditor
              key={criterion.id}
              criterion={criterion}
              index={index}
              totalCriteria={rubric.criteria.length}
              onChange={(updates) => {
                updateCriterion(index, updates);
              }}
              onRemove={() => {
                removeCriterion(index);
              }}
              onMove={(direction) => {
                moveCriterion(index, direction);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CriterionEditorProps {
  criterion: RubricCriterion;
  index: number;
  totalCriteria: number;
  onChange: (updates: Partial<RubricCriterion>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

function CriterionEditor({
  criterion,
  index,
  totalCriteria,
  onChange,
  onRemove,
  onMove,
}: CriterionEditorProps) {
  const [expanded, setExpanded] = React.useState(true);

  const updateLevel = (levelIndex: number, updates: Partial<RubricCriterion['levels'][0]>) => {
    const newLevels = [...criterion.levels];
    newLevels[levelIndex] = { ...newLevels[levelIndex], ...updates };
    onChange({ levels: newLevels });
  };

  const addLevel = () => {
    const newLevels = [...criterion.levels, { score: 0, label: 'New Level', description: '' }];
    onChange({ levels: newLevels });
  };

  const removeLevel = (levelIndex: number) => {
    const newLevels = criterion.levels.filter((_, i) => i !== levelIndex);
    onChange({ levels: newLevels });
  };

  return (
    <div className="rounded-lg border bg-white">
      {/* Criterion Header */}
      <div className="flex items-center gap-2 border-b p-3">
        <button
          type="button"
          onClick={() => {
            setExpanded(!expanded);
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg
            className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <input
          type="text"
          value={criterion.name}
          onChange={(e) => {
            onChange({ name: e.target.value });
          }}
          className="flex-1 border-0 bg-transparent font-medium focus:outline-none"
          placeholder="Criterion name"
        />
        <input
          type="number"
          value={criterion.maxPoints}
          onChange={(e) => {
            onChange({ maxPoints: parseInt(e.target.value) || 0 });
          }}
          min={0}
          className="w-16 rounded border px-2 py-1 text-center text-sm"
        />
        <span className="text-sm text-gray-500">pts</span>
        <div className="flex items-center gap-1 border-l pl-2">
          <button
            type="button"
            onClick={() => {
              onMove('up');
            }}
            disabled={index === 0}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => {
              onMove('down');
            }}
            disabled={index === totalCriteria - 1}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            ×
          </button>
        </div>
      </div>

      {/* Levels */}
      {expanded && (
        <div className="p-3">
          <input
            type="text"
            value={criterion.description || ''}
            onChange={(e) => {
              onChange({ description: e.target.value });
            }}
            className="mb-3 w-full rounded border px-3 py-1.5 text-sm"
            placeholder="Description (optional)"
          />
          <div className="grid gap-2">
            {criterion.levels.map((level, levelIndex) => (
              <div key={levelIndex} className="flex items-start gap-2 rounded bg-gray-50 p-2">
                <input
                  type="number"
                  value={level.score}
                  onChange={(e) => {
                    updateLevel(levelIndex, { score: parseInt(e.target.value) || 0 });
                  }}
                  min={0}
                  max={criterion.maxPoints}
                  className="w-12 rounded border px-2 py-1 text-center text-sm"
                />
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={level.label}
                    onChange={(e) => {
                      updateLevel(levelIndex, { label: e.target.value });
                    }}
                    className="w-full rounded border px-2 py-1 text-sm font-medium"
                    placeholder="Level label"
                  />
                  <input
                    type="text"
                    value={level.description || ''}
                    onChange={(e) => {
                      updateLevel(levelIndex, { description: e.target.value });
                    }}
                    className="w-full rounded border px-2 py-1 text-xs text-gray-600"
                    placeholder="Description"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeLevel(levelIndex);
                  }}
                  disabled={criterion.levels.length <= 2}
                  className="rounded p-1 text-gray-400 hover:text-red-600 disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLevel}
            className="mt-2 text-sm text-primary-600 hover:underline"
          >
            + Add level
          </button>
        </div>
      )}
    </div>
  );
}
