'use client';

/**
 * AssessmentSettings Component
 *
 * Form for configuring assessment metadata and settings including
 * title, subject, grade level, timing, and behavioral options
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Assessment, AssessmentType } from '@/lib/types';

interface AssessmentSettingsProps {
  assessment: Partial<Assessment>;
  onChange: (assessment: Partial<Assessment>) => void;
  className?: string;
}

const ASSESSMENT_TYPES: { value: AssessmentType; label: string; description: string }[] = [
  { value: 'quiz', label: 'Quiz', description: 'Short assessment with automatic grading' },
  { value: 'test', label: 'Test', description: 'Comprehensive evaluation with various question types' },
  { value: 'project', label: 'Project', description: 'Open-ended assignment with rubric-based grading' },
  { value: 'practice', label: 'Practice', description: 'Ungraded practice with immediate feedback' },
];

const SUBJECTS = [
  'Mathematics',
  'English Language Arts',
  'Science',
  'Social Studies',
  'Reading',
  'Writing',
  'Art',
  'Music',
  'Physical Education',
  'Technology',
  'Foreign Language',
];

const GRADE_LEVELS = [
  'K',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
];

const FEEDBACK_OPTIONS = [
  { value: 'immediately', label: 'Immediately', description: 'Show feedback right after each question' },
  { value: 'after-submit', label: 'After Submit', description: 'Show all feedback after assessment is submitted' },
  { value: 'after-due-date', label: 'After Due Date', description: 'Show feedback only after the due date' },
  { value: 'never', label: 'Never', description: 'Do not show automated feedback' },
] as const;

export function AssessmentSettings({ assessment, onChange, className }: AssessmentSettingsProps) {
  const updateField = <K extends keyof Assessment>(field: K, value: Assessment[K]) => {
    onChange({ ...assessment, [field]: value });
  };

  return (
    <div className={cn('bg-white rounded-xl shadow-lg p-6 space-y-6', className)}>
      <h2 className="text-xl font-bold text-gray-900">Assessment Settings</h2>

      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={assessment.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Enter assessment title..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={assessment.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe what this assessment covers..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Assessment Type */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Assessment Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {ASSESSMENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updateField('type', type.value)}
              className={cn(
                'p-4 border-2 rounded-lg text-left transition-all',
                assessment.type === type.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="font-semibold text-gray-900">{type.label}</div>
              <div className="text-sm text-gray-500">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Subject & Grade Level */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
            Subject <span className="text-red-500">*</span>
          </label>
          <select
            id="subject"
            value={assessment.subject || ''}
            onChange={(e) => updateField('subject', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select subject...</option>
            {SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700">
            Grade Level <span className="text-red-500">*</span>
          </label>
          <select
            id="gradeLevel"
            value={assessment.gradeLevel || ''}
            onChange={(e) => updateField('gradeLevel', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select grade...</option>
            {GRADE_LEVELS.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Time Limit */}
      <div className="space-y-2">
        <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">
          Time Limit (minutes)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            id="timeLimit"
            value={assessment.timeLimit || ''}
            onChange={(e) =>
              updateField('timeLimit', e.target.value ? parseInt(e.target.value, 10) : null)
            }
            placeholder="No limit"
            min={1}
            max={180}
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <span className="text-sm text-gray-500">Leave empty for no time limit</span>
        </div>
      </div>

      {/* Options Grid */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Options</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Auto Grade */}
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={assessment.autoGrade ?? true}
              onChange={(e) => updateField('autoGrade', e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <div>
              <div className="font-medium text-gray-900">Auto-Grade</div>
              <div className="text-sm text-gray-500">Automatically grade objective questions</div>
            </div>
          </label>

          {/* Adaptive Difficulty */}
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={assessment.adaptiveDifficulty ?? false}
              onChange={(e) => updateField('adaptiveDifficulty', e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <div>
              <div className="font-medium text-gray-900">Adaptive Difficulty</div>
              <div className="text-sm text-gray-500">Adjust difficulty based on performance</div>
            </div>
          </label>

          {/* Shuffle Questions */}
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={assessment.shuffleQuestions ?? false}
              onChange={(e) => updateField('shuffleQuestions', e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <div>
              <div className="font-medium text-gray-900">Shuffle Questions</div>
              <div className="text-sm text-gray-500">Randomize question order for each student</div>
            </div>
          </label>

          {/* Shuffle Options */}
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={assessment.shuffleOptions ?? false}
              onChange={(e) => updateField('shuffleOptions', e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <div>
              <div className="font-medium text-gray-900">Shuffle Options</div>
              <div className="text-sm text-gray-500">Randomize answer choices</div>
            </div>
          </label>

          {/* Allow Retakes */}
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={assessment.allowRetakes ?? false}
              onChange={(e) => updateField('allowRetakes', e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <div>
              <div className="font-medium text-gray-900">Allow Retakes</div>
              <div className="text-sm text-gray-500">Students can retake this assessment</div>
            </div>
          </label>

          {/* Max Retakes */}
          {assessment.allowRetakes && (
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <label htmlFor="maxRetakes" className="text-sm font-medium text-gray-700">
                Max Retakes:
              </label>
              <input
                type="number"
                id="maxRetakes"
                value={assessment.maxRetakes || ''}
                onChange={(e) =>
                  updateField('maxRetakes', e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                min={1}
                max={10}
                placeholder="Unlimited"
                className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Feedback Settings */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Feedback Display</label>
        <div className="grid grid-cols-2 gap-3">
          {FEEDBACK_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('showFeedback', option.value)}
              className={cn(
                'p-3 border-2 rounded-lg text-left transition-all',
                assessment.showFeedback === option.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="font-medium text-gray-900">{option.label}</div>
              <div className="text-xs text-gray-500">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Passing Score */}
      <div className="space-y-2">
        <label htmlFor="passingScore" className="block text-sm font-medium text-gray-700">
          Passing Score (%)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            id="passingScore"
            value={assessment.passingScore || ''}
            onChange={(e) =>
              updateField('passingScore', e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            placeholder="70"
            min={0}
            max={100}
            className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <span className="text-sm text-gray-500">Minimum percentage to pass</span>
        </div>
      </div>
    </div>
  );
}
