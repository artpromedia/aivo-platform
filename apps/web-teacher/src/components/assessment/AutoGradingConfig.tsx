'use client';

/**
 * AutoGradingConfig Component
 *
 * Configuration panel for automatic grading settings including
 * partial credit, AI grading, and feedback generation options
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Bot, Sparkles, MessageSquare, Settings } from 'lucide-react';
import type { AutoGradeConfig } from '@/lib/types';

interface AutoGradingConfigProps {
  config?: AutoGradeConfig;
  onChange: (config: AutoGradeConfig) => void;
  className?: string;
}

const DEFAULT_CONFIG: AutoGradeConfig = {
  enabled: true,
  partialCredit: true,
  partialCreditPercentage: 50,
  caseSensitive: false,
  acceptSynonyms: true,
  aiGrading: {
    enabled: true,
    shortAnswerThreshold: 50,
    essayEnabled: true,
    mathStepsEnabled: true,
  },
  feedbackGeneration: true,
  feedbackTone: 'encouraging',
};

const FEEDBACK_TONES = [
  {
    value: 'encouraging',
    label: 'Encouraging',
    description: 'Positive and supportive feedback that motivates students',
    example: 'Great effort! Here\'s how you can improve...',
  },
  {
    value: 'neutral',
    label: 'Neutral',
    description: 'Objective feedback focused on accuracy',
    example: 'Your answer was partially correct. The correct solution is...',
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Comprehensive explanations with step-by-step analysis',
    example: 'Let\'s break down your answer step by step...',
  },
] as const;

export function AutoGradingConfig({ config, onChange, className }: AutoGradingConfigProps) {
  const currentConfig = config || DEFAULT_CONFIG;

  const updateConfig = (updates: Partial<AutoGradeConfig>) => {
    onChange({ ...currentConfig, ...updates });
  };

  const updateAiGrading = (updates: Partial<AutoGradeConfig['aiGrading']>) => {
    onChange({
      ...currentConfig,
      aiGrading: { ...currentConfig.aiGrading, ...updates },
    });
  };

  return (
    <div className={cn('bg-white rounded-xl shadow-lg p-6 space-y-6', className)}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Bot className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Auto-Grading Settings</h2>
          <p className="text-sm text-gray-500">Configure automatic grading behavior</p>
        </div>
      </div>

      {/* Main Toggle */}
      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gray-600" />
          <div>
            <div className="font-semibold text-gray-900">Enable Auto-Grading</div>
            <div className="text-sm text-gray-500">Automatically grade objective questions</div>
          </div>
        </div>
        <input
          type="checkbox"
          checked={currentConfig.enabled}
          onChange={(e) => updateConfig({ enabled: e.target.checked })}
          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
        />
      </label>

      {currentConfig.enabled && (
        <>
          {/* Basic Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Basic Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Partial Credit */}
              <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={currentConfig.partialCredit}
                  onChange={(e) => updateConfig({ partialCredit: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <div className="font-medium text-gray-900">Partial Credit</div>
                  <div className="text-sm text-gray-500">
                    Award points for partially correct answers
                  </div>
                </div>
              </label>

              {/* Case Sensitive */}
              <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={currentConfig.caseSensitive}
                  onChange={(e) => updateConfig({ caseSensitive: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <div className="font-medium text-gray-900">Case Sensitive</div>
                  <div className="text-sm text-gray-500">
                    Require exact capitalization for text answers
                  </div>
                </div>
              </label>

              {/* Accept Synonyms */}
              <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={currentConfig.acceptSynonyms}
                  onChange={(e) => updateConfig({ acceptSynonyms: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <div className="font-medium text-gray-900">Accept Synonyms</div>
                  <div className="text-sm text-gray-500">
                    Accept equivalent words and phrases
                  </div>
                </div>
              </label>

              {/* Partial Credit Percentage */}
              {currentConfig.partialCredit && (
                <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl">
                  <div className="flex-1">
                    <label
                      htmlFor="partial-credit-pct"
                      className="block font-medium text-gray-900"
                    >
                      Partial Credit Amount
                    </label>
                    <div className="text-sm text-gray-500">
                      Percentage of points for partial answers
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="partial-credit-pct"
                      value={currentConfig.partialCreditPercentage || 50}
                      onChange={(e) =>
                        updateConfig({
                          partialCreditPercentage: Math.min(
                            100,
                            Math.max(0, parseInt(e.target.value, 10) || 0)
                          ),
                        })
                      }
                      min={0}
                      max={100}
                      className="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Grading */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">AI-Powered Grading</h3>
            </div>

            <label className="flex items-center justify-between p-4 bg-purple-50 rounded-xl cursor-pointer">
              <div>
                <div className="font-medium text-purple-900">Enable AI Grading</div>
                <div className="text-sm text-purple-700">
                  Use AI to grade subjective questions like essays and short answers
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentConfig.aiGrading.enabled}
                onChange={(e) => updateAiGrading({ enabled: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
            </label>

            {currentConfig.aiGrading.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-purple-200">
                {/* Essay Grading */}
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={currentConfig.aiGrading.essayEnabled}
                    onChange={(e) => updateAiGrading({ essayEnabled: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-gray-900 text-sm">Essay Grading</div>
                    <div className="text-xs text-gray-500">
                      AI evaluates essays using your rubric
                    </div>
                  </div>
                </label>

                {/* Math Steps */}
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={currentConfig.aiGrading.mathStepsEnabled}
                    onChange={(e) => updateAiGrading({ mathStepsEnabled: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-gray-900 text-sm">Math Work Analysis</div>
                    <div className="text-xs text-gray-500">
                      Evaluate methodology, not just final answers
                    </div>
                  </div>
                </label>

                {/* Short Answer Threshold */}
                <div className="col-span-full p-3 border border-gray-200 rounded-lg">
                  <label
                    htmlFor="short-answer-threshold"
                    className="block font-medium text-gray-900 text-sm mb-1"
                  >
                    Short Answer Confidence Threshold
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    Minimum AI confidence to auto-grade (lower values require teacher review)
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      id="short-answer-threshold"
                      value={currentConfig.aiGrading.shortAnswerThreshold}
                      onChange={(e) =>
                        updateAiGrading({ shortAnswerThreshold: parseInt(e.target.value, 10) })
                      }
                      min={0}
                      max={100}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">
                      {currentConfig.aiGrading.shortAnswerThreshold}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Feedback Settings */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Feedback Generation</h3>
            </div>

            <label className="flex items-center justify-between p-4 bg-green-50 rounded-xl cursor-pointer">
              <div>
                <div className="font-medium text-green-900">Generate Feedback</div>
                <div className="text-sm text-green-700">
                  Automatically create personalized feedback for each student
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentConfig.feedbackGeneration}
                onChange={(e) => updateConfig({ feedbackGeneration: e.target.checked })}
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
              />
            </label>

            {currentConfig.feedbackGeneration && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Feedback Tone</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {FEEDBACK_TONES.map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => updateConfig({ feedbackTone: tone.value })}
                      className={cn(
                        'p-4 border-2 rounded-xl text-left transition-all',
                        currentConfig.feedbackTone === tone.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="font-semibold text-gray-900">{tone.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{tone.description}</div>
                      <div className="text-xs text-gray-400 mt-2 italic">
                        &ldquo;{tone.example}&rdquo;
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-start gap-3">
              <Bot className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>How AI Grading Works:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Multiple choice and true/false questions are graded instantly</li>
                  <li>Short answers are evaluated against expected answers with synonym matching</li>
                  <li>Essays are scored using your rubric criteria with detailed feedback</li>
                  <li>Math problems evaluate both final answers and shown work</li>
                  <li>Low-confidence grades are flagged for teacher review</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
