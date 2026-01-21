'use client';

import React from 'react';
import type { AIGuidance } from './types';

interface AICoachPanelProps {
  guidance: AIGuidance;
  onDismiss?: () => void;
}

export function AICoachPanel({ guidance, onDismiss }: AICoachPanelProps) {
  return (
    <div className="mx-4 my-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 shadow-lg overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-semibold text-blue-900">AI Coach</span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-blue-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Encouragement */}
        <p className="text-blue-900 font-medium mb-3">{guidance.encouragement}</p>

        {/* Tips */}
        {guidance.tips.length > 0 && (
          <div className="space-y-2 mb-3">
            {guidance.tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-2 text-blue-800 text-sm">
                <span>💡</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        )}

        {/* Suggested approach */}
        {guidance.suggestedApproach && (
          <div className="bg-white/50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="text-sm text-blue-800 italic">{guidance.suggestedApproach}</p>
            </div>
          </div>
        )}

        {/* Adaptations */}
        {guidance.adaptations && guidance.adaptations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="text-xs font-medium text-blue-600 mb-2">Adaptations:</div>
            <div className="flex flex-wrap gap-2">
              {guidance.adaptations.map((adaptation, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                >
                  {adaptation}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
