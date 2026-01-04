/**
 * Lesson Settings Panel
 * Configuration for lesson behavior, accessibility, and gamification
 */

'use client';

import React from 'react';
import { X, Clock, Trophy, Accessibility, Sliders } from 'lucide-react';
import { useLessonBuilder } from './LessonBuilderContext';
import type { FeedbackType, DifficultyLevel } from './types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LessonSettingsProps {
  onClose: () => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function LessonSettings({ onClose }: LessonSettingsProps) {
  const { state, dispatch } = useLessonBuilder();
  const [activeSection, setActiveSection] = React.useState<'general' | 'timing' | 'gamification' | 'accessibility'>('general');

  if (!state.lesson) return null;

  const { settings, accessibility } = state.lesson;

  const updateSettings = (updates: Partial<typeof settings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: updates });
  };

  const updateAccessibility = (updates: Partial<typeof accessibility>) => {
    dispatch({ type: 'UPDATE_ACCESSIBILITY', payload: updates });
  };

  const sections = [
    { id: 'general' as const, label: 'General', icon: Sliders },
    { id: 'timing' as const, label: 'Timing', icon: Clock },
    { id: 'gamification' as const, label: 'Gamification', icon: Trophy },
    { id: 'accessibility' as const, label: 'Accessibility', icon: Accessibility },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h2 className="font-medium text-gray-700">Lesson Settings</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b bg-white">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs border-b-2 transition-colors ${
              activeSection === section.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeSection === 'general' && (
          <GeneralSettings settings={settings} onUpdate={updateSettings} />
        )}
        {activeSection === 'timing' && (
          <TimingSettings settings={settings} onUpdate={updateSettings} />
        )}
        {activeSection === 'gamification' && (
          <GamificationSettings settings={settings} onUpdate={updateSettings} />
        )}
        {activeSection === 'accessibility' && (
          <AccessibilitySettings accessibility={accessibility} onUpdate={updateAccessibility} />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERAL SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

function GeneralSettings({
  settings,
  onUpdate,
}: {
  settings: ReturnType<typeof useLessonBuilder>['state']['lesson'] extends infer L
    ? L extends { settings: infer S }
      ? S
      : never
    : never;
  onUpdate: (updates: Partial<typeof settings>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
        <select
          value={settings.difficultyLevel}
          onChange={(e) => onUpdate({ difficultyLevel: e.target.value as DifficultyLevel })}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="adaptive">Adaptive</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Feedback Type</label>
        <select
          value={settings.feedbackType}
          onChange={(e) => onUpdate({ feedbackType: e.target.value as FeedbackType })}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="immediate">Immediate</option>
          <option value="delayed">Delayed</option>
          <option value="end_of_activity">End of Activity</option>
          <option value="none">None</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          When to show feedback after student responses
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Attempts</label>
        <input
          type="number"
          value={settings.maxAttempts}
          onChange={(e) => onUpdate({ maxAttempts: parseInt(e.target.value) || 1 })}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          min={1}
          max={10}
        />
        <p className="text-xs text-gray-500 mt-1">
          How many times students can retry an activity
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score (%)</label>
        <input
          type="number"
          value={settings.passingScore}
          onChange={(e) => onUpdate({ passingScore: parseInt(e.target.value) || 0 })}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          min={0}
          max={100}
        />
      </div>

      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          checked={settings.allowSkipping}
          onChange={(e) => onUpdate({ allowSkipping: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Allow Skipping</span>
          <p className="text-xs text-gray-500">Let students skip non-required activities</p>
        </div>
      </label>

      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          checked={settings.showProgress}
          onChange={(e) => onUpdate({ showProgress: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Show Progress</span>
          <p className="text-xs text-gray-500">Display progress bar during lesson</p>
        </div>
      </label>

      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          checked={settings.shuffleActivities}
          onChange={(e) => onUpdate({ shuffleActivities: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Shuffle Activities</span>
          <p className="text-xs text-gray-500">Randomize activity order within sections</p>
        </div>
      </label>

      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          checked={settings.adaptiveLearning}
          onChange={(e) => onUpdate({ adaptiveLearning: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Adaptive Learning</span>
          <p className="text-xs text-gray-500">Adjust difficulty based on performance</p>
        </div>
      </label>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TIMING SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

function TimingSettings({
  settings,
  onUpdate,
}: {
  settings: ReturnType<typeof useLessonBuilder>['state']['lesson'] extends infer L
    ? L extends { settings: infer S }
      ? S
      : never
    : never;
  onUpdate: (updates: Partial<typeof settings>) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          checked={settings.enableTimer}
          onChange={(e) => onUpdate({ enableTimer: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Enable Timer</span>
          <p className="text-xs text-gray-500">Set a time limit for the lesson</p>
        </div>
      </label>

      {settings.enableTimer && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Limit (minutes)
          </label>
          <input
            type="number"
            value={settings.timerMinutes || 30}
            onChange={(e) => onUpdate({ timerMinutes: parseInt(e.target.value) || 30 })}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={1}
            max={180}
          />
        </div>
      )}

      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-700 mb-1">Estimated Duration</h4>
        <p className="text-2xl font-bold text-blue-600">
          {Math.round((settings.timerMinutes || 30))} min
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Based on activity count and complexity
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GAMIFICATION SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

function GamificationSettings({
  settings,
  onUpdate,
}: {
  settings: ReturnType<typeof useLessonBuilder>['state']['lesson'] extends infer L
    ? L extends { settings: infer S }
      ? S
      : never
    : never;
  onUpdate: (updates: Partial<typeof settings>) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          checked={settings.gamificationEnabled}
          onChange={(e) => onUpdate({ gamificationEnabled: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Enable Gamification</span>
          <p className="text-xs text-gray-500">Add points, badges, and achievements</p>
        </div>
      </label>

      {settings.gamificationEnabled && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Points Per Activity
            </label>
            <input
              type="number"
              value={settings.pointsPerActivity || 10}
              onChange={(e) => onUpdate({ pointsPerActivity: parseInt(e.target.value) || 10 })}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={0}
              max={100}
            />
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="text-sm font-medium text-purple-700 mb-2">Badges</h4>
            <p className="text-xs text-purple-600 mb-3">
              Badges are awarded automatically based on student performance.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  🏆
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Perfect Score</div>
                  <div className="text-xs text-gray-500">100% on all activities</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  ⚡
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Speed Demon</div>
                  <div className="text-xs text-gray-500">Complete in under 10 min</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  🔥
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">On Fire</div>
                  <div className="text-xs text-gray-500">5 correct in a row</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

function AccessibilitySettings({
  accessibility,
  onUpdate,
}: {
  accessibility: ReturnType<typeof useLessonBuilder>['state']['lesson'] extends infer L
    ? L extends { accessibility: infer A }
      ? A
      : never
    : never;
  onUpdate: (updates: Partial<typeof accessibility>) => void;
}) {
  const options = [
    {
      key: 'supportsScreenReader' as const,
      label: 'Screen Reader Support',
      description: 'Optimized for screen readers',
    },
    {
      key: 'supportsKeyboardNavigation' as const,
      label: 'Keyboard Navigation',
      description: 'Full keyboard accessibility',
    },
    {
      key: 'supportsHighContrast' as const,
      label: 'High Contrast Mode',
      description: 'Enhanced color contrast',
    },
    {
      key: 'supportsDyslexiaFont' as const,
      label: 'Dyslexia-Friendly Font',
      description: 'OpenDyslexic font option',
    },
    {
      key: 'supportsReducedMotion' as const,
      label: 'Reduced Motion',
      description: 'Minimize animations',
    },
    {
      key: 'textToSpeechEnabled' as const,
      label: 'Text-to-Speech',
      description: 'Read content aloud',
    },
    {
      key: 'closedCaptionsAvailable' as const,
      label: 'Closed Captions',
      description: 'Video captions available',
    },
    {
      key: 'audioDescriptionsAvailable' as const,
      label: 'Audio Descriptions',
      description: 'Describe visual content',
    },
    {
      key: 'signLanguageAvailable' as const,
      label: 'Sign Language',
      description: 'ASL interpretation',
    },
    {
      key: 'readingLevelAdjustment' as const,
      label: 'Reading Level Adjustment',
      description: 'Simplified text options',
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Configure accessibility features for this lesson.
      </p>

      {options.map((option) => (
        <label
          key={option.key}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
        >
          <input
            type="checkbox"
            checked={accessibility[option.key]}
            onChange={(e) => onUpdate({ [option.key]: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">{option.label}</span>
            <p className="text-xs text-gray-500">{option.description}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

export default LessonSettings;
