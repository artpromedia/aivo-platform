'use client';

/**
 * QuestionEditor Component
 *
 * Interactive editor for creating and editing assessment questions
 * Supports multiple question types with type-specific editing interfaces
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Trash2,
  GripVertical,
  Plus,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  HelpCircle,
} from 'lucide-react';
import type { Question, QuestionType, QuestionOption } from '@/lib/types';

interface QuestionEditorProps {
  question: Question;
  index: number;
  onUpdate: (updates: Partial<Question>) => void;
  onRemove: () => void;
  className?: string;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'multiple-choice', label: 'Multiple Choice', icon: '◉' },
  { value: 'true-false', label: 'True/False', icon: '✓✗' },
  { value: 'short-answer', label: 'Short Answer', icon: '✎' },
  { value: 'essay', label: 'Essay', icon: '¶' },
  { value: 'math', label: 'Math', icon: '∑' },
  { value: 'matching', label: 'Matching', icon: '↔' },
  { value: 'fill-in-blank', label: 'Fill in Blank', icon: '___' },
  { value: 'ordering', label: 'Ordering', icon: '123' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'hard', label: 'Hard', color: 'bg-red-100 text-red-700' },
];

export function QuestionEditor({
  question,
  index,
  onUpdate,
  onRemove,
  className,
}: QuestionEditorProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const updateOption = (optionId: string, text: string) => {
    const options = (question.options || []).map((opt) =>
      opt.id === optionId ? { ...opt, text } : opt
    );
    onUpdate({ options });
  };

  const setCorrectOption = (optionId: string) => {
    const options = (question.options || []).map((opt) => ({
      ...opt,
      isCorrect: opt.id === optionId,
    }));
    onUpdate({ options, correctAnswer: optionId });
  };

  const addOption = () => {
    const newOption: QuestionOption = {
      id: crypto.randomUUID(),
      text: '',
      isCorrect: false,
    };
    onUpdate({ options: [...(question.options || []), newOption] });
  };

  const removeOption = (optionId: string) => {
    const options = (question.options || []).filter((opt) => opt.id !== optionId);
    onUpdate({ options });
  };

  const renderQuestionTypeEditor = () => {
    switch (question.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Answer Options</label>
            {(question.options || []).map((option, optIndex) => (
              <div key={option.id} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCorrectOption(option.id)}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    option.isCorrect
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 hover:border-green-400'
                  )}
                >
                  {option.isCorrect && '✓'}
                </button>
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  placeholder={`Option ${optIndex + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {(question.options?.length || 0) > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(option.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {(question.options?.length || 0) < 6 && (
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Option
              </button>
            )}
          </div>
        );

      case 'true-false':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
            <div className="flex gap-4">
              {['True', 'False'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onUpdate({ correctAnswer: value === 'True' })}
                  className={cn(
                    'px-6 py-3 rounded-lg font-semibold transition-all',
                    question.correctAnswer === (value === 'True')
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        );

      case 'short-answer':
        return (
          <div className="space-y-3">
            <label htmlFor={`expected-${question.id}`} className="block text-sm font-medium text-gray-700">
              Expected Answer
            </label>
            <input
              type="text"
              id={`expected-${question.id}`}
              value={(question.expectedAnswer as string) || ''}
              onChange={(e) => onUpdate({ expectedAnswer: e.target.value })}
              placeholder="Enter the expected answer..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500">
              AI grading will evaluate responses against this answer, accepting variations and synonyms
            </p>
          </div>
        );

      case 'essay':
        return (
          <div className="space-y-3">
            <label htmlFor={`rubric-${question.id}`} className="block text-sm font-medium text-gray-700">
              Essay Guidelines
            </label>
            <textarea
              id={`rubric-${question.id}`}
              value={(question.expectedAnswer as string) || ''}
              onChange={(e) => onUpdate({ expectedAnswer: e.target.value })}
              placeholder="Describe what a good answer should include..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-500">
              These guidelines will be used by AI to grade essay responses
            </p>
          </div>
        );

      case 'math':
        return (
          <div className="space-y-3">
            <label htmlFor={`math-answer-${question.id}`} className="block text-sm font-medium text-gray-700">
              Correct Answer
            </label>
            <input
              type="text"
              id={`math-answer-${question.id}`}
              value={(question.correctAnswer as string) || ''}
              onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
              placeholder="Enter the correct answer (e.g., 42, 3.14, x=5)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
            />
            <p className="text-sm text-gray-500">
              AI will evaluate both the final answer and the methodology if work is shown
            </p>
          </div>
        );

      case 'matching':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Matching Pairs</label>
            {(question.matchingPairs || []).map((pair, pairIndex) => (
              <div key={pair.id} className="flex items-center gap-3">
                <input
                  type="text"
                  value={pair.left}
                  onChange={(e) => {
                    const pairs = [...(question.matchingPairs || [])];
                    pairs[pairIndex] = { ...pair, left: e.target.value };
                    onUpdate({ matchingPairs: pairs });
                  }}
                  placeholder="Left side"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <span className="text-gray-400">↔</span>
                <input
                  type="text"
                  value={pair.right}
                  onChange={(e) => {
                    const pairs = [...(question.matchingPairs || [])];
                    pairs[pairIndex] = { ...pair, right: e.target.value };
                    onUpdate({ matchingPairs: pairs });
                  }}
                  placeholder="Right side"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    const pairs = (question.matchingPairs || []).filter((_, i) => i !== pairIndex);
                    onUpdate({ matchingPairs: pairs });
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newPair = { id: crypto.randomUUID(), left: '', right: '' };
                onUpdate({ matchingPairs: [...(question.matchingPairs || []), newPair] });
              }}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Pair
            </button>
          </div>
        );

      case 'fill-in-blank':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Blank Answers</label>
            <p className="text-sm text-gray-500 mb-2">
              Use [blank] in your question text to indicate blanks. Add the correct answers below in order.
            </p>
            {(question.blanks || ['']).map((blank, blankIndex) => (
              <div key={blankIndex} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 w-16">Blank {blankIndex + 1}:</span>
                <input
                  type="text"
                  value={blank}
                  onChange={(e) => {
                    const blanks = [...(question.blanks || [''])];
                    blanks[blankIndex] = e.target.value;
                    onUpdate({ blanks });
                  }}
                  placeholder="Correct answer"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => onUpdate({ blanks: [...(question.blanks || ['']), ''] })}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Blank
            </button>
          </div>
        );

      case 'ordering':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Items (in correct order)
            </label>
            {(question.options || []).map((option, optIndex) => (
              <div key={option.id} className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                  {optIndex + 1}
                </span>
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  placeholder={`Item ${optIndex + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => removeOption(option.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'border-2 border-gray-200 rounded-xl bg-white overflow-hidden mb-4',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <button type="button" className="cursor-grab text-gray-400 hover:text-gray-600">
          <GripVertical className="w-5 h-5" />
        </button>

        <span className="font-semibold text-gray-700">Q{index + 1}</span>

        <select
          value={question.type}
          onChange={(e) => onUpdate({ type: e.target.value as QuestionType })}
          className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {QUESTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.icon} {type.label}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={question.points}
            onChange={(e) => onUpdate({ points: parseInt(e.target.value, 10) || 1 })}
            min={1}
            max={100}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
          />
          <span className="text-sm text-gray-500">pts</span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Question Text */}
          <div className="space-y-2">
            <label htmlFor={`question-text-${question.id}`} className="block text-sm font-medium text-gray-700">
              Question Text
            </label>
            <textarea
              id={`question-text-${question.id}`}
              value={question.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Enter your question..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Type-specific editor */}
          {renderQuestionTypeEditor()}

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Advanced Options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              {/* Difficulty */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                <div className="flex gap-2">
                  {DIFFICULTY_OPTIONS.map((diff) => (
                    <button
                      key={diff.value}
                      type="button"
                      onClick={() => onUpdate({ difficulty: diff.value as Question['difficulty'] })}
                      className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium transition-all',
                        question.difficulty === diff.value
                          ? diff.color
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-2">
                <label
                  htmlFor={`explanation-${question.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <HelpCircle className="w-4 h-4" />
                  Explanation (shown after answering)
                </label>
                <textarea
                  id={`explanation-${question.id}`}
                  value={question.explanation || ''}
                  onChange={(e) => onUpdate({ explanation: e.target.value })}
                  placeholder="Explain why the correct answer is correct..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <label
                  htmlFor={`image-${question.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <ImageIcon className="w-4 h-4" />
                  Image URL
                </label>
                <input
                  type="url"
                  id={`image-${question.id}`}
                  value={question.imageUrl || ''}
                  onChange={(e) => onUpdate({ imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label htmlFor={`tags-${question.id}`} className="block text-sm font-medium text-gray-700">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  id={`tags-${question.id}`}
                  value={(question.tags || []).join(', ')}
                  onChange={(e) =>
                    onUpdate({
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="algebra, equations, linear"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
