'use client';

import { useState } from 'react';
import { updateFocusPreferences } from '../../../../lib/focus-api';
import type { FocusPreferences } from '../../../../lib/focus-api';

interface FocusSettingsProps {
  learnerId: string;
  preferences: FocusPreferences;
  onUpdate: (preferences: FocusPreferences) => void;
}

/**
 * Focus Settings Component
 * 
 * Allows users to customize their focus preferences
 */
export function FocusSettings({ learnerId, preferences, onUpdate }: Readonly<FocusSettingsProps>) {
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    try {
      setSaving(true);
      const updated = await updateFocusPreferences(learnerId, localPrefs);
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function updatePref<K extends keyof FocusPreferences>(key: K, value: FocusPreferences[K]) {
    setLocalPrefs((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  return (
    <div className="space-y-6">
      {/* Default Mode */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">Default Focus Mode</h2>
        <p className="mt-1 text-sm text-slate-600">Choose your preferred timer mode</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <button
            onClick={() => updatePref('defaultMode', 'pomodoro')}
            className={`rounded-lg border-2 p-4 text-left transition ${
              localPrefs.defaultMode === 'pomodoro'
                ? 'border-red-500 bg-red-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-2xl">🍅</div>
            <div className="mt-2 font-bold text-slate-900">Pomodoro</div>
          </button>

          <button
            onClick={() => updatePref('defaultMode', 'custom')}
            className={`rounded-lg border-2 p-4 text-left transition ${
              localPrefs.defaultMode === 'custom'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-2xl">⚙️</div>
            <div className="mt-2 font-bold text-slate-900">Custom</div>
          </button>

          <button
            onClick={() => updatePref('defaultMode', 'deep-work')}
            className={`rounded-lg border-2 p-4 text-left transition ${
              localPrefs.defaultMode === 'deep-work'
                ? 'border-purple-500 bg-purple-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-2xl">🎯</div>
            <div className="mt-2 font-bold text-slate-900">Deep Work</div>
          </button>
        </div>
      </div>

      {/* Pomodoro Settings */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">Pomodoro Settings</h2>
        <p className="mt-1 text-sm text-slate-600">Customize your Pomodoro timer durations</p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="work-duration" className="block text-sm font-medium text-slate-700">
              Work Duration (minutes)
            </label>
            <input
              id="work-duration"
              type="number"
              min="1"
              max="120"
              value={localPrefs.pomodoroWorkMinutes}
              onChange={(e) => updatePref('pomodoroWorkMinutes', Number.parseInt(e.target.value, 10) || 25)}
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="short-break-duration" className="block text-sm font-medium text-slate-700">
              Short Break Duration (minutes)
            </label>
            <input
              id="short-break-duration"
              type="number"
              min="1"
              max="60"
              value={localPrefs.pomodoroBreakMinutes}
              onChange={(e) => updatePref('pomodoroBreakMinutes', Number.parseInt(e.target.value, 10) || 5)}
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="long-break-duration" className="block text-sm font-medium text-slate-700">
              Long Break Duration (minutes)
            </label>
            <input
              id="long-break-duration"
              type="number"
              min="1"
              max="60"
              value={localPrefs.pomodoroLongBreakMinutes}
              onChange={(e) =>
                updatePref('pomodoroLongBreakMinutes', Number.parseInt(e.target.value, 10) || 15)
              }
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Custom Settings */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">Custom Timer Settings</h2>
        <p className="mt-1 text-sm text-slate-600">Customize your own timer durations</p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="custom-work-duration" className="block text-sm font-medium text-slate-700">
              Work Duration (minutes)
            </label>
            <input
              id="custom-work-duration"
              type="number"
              min="1"
              max="180"
              value={localPrefs.customWorkMinutes}
              onChange={(e) => updatePref('customWorkMinutes', Number.parseInt(e.target.value, 10) || 25)}
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="custom-break-duration" className="block text-sm font-medium text-slate-700">
              Break Duration (minutes)
            </label>
            <input
              id="custom-break-duration"
              type="number"
              min="1"
              max="60"
              value={localPrefs.customBreakMinutes}
              onChange={(e) => updatePref('customBreakMinutes', Number.parseInt(e.target.value, 10) || 5)}
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Notifications & Sound */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">Notifications & Sounds</h2>
        <p className="mt-1 text-sm text-slate-600">Configure alerts and reminders</p>

        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={localPrefs.soundEnabled}
              onChange={(e) => updatePref('soundEnabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Enable completion sounds</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={localPrefs.notificationsEnabled}
              onChange={(e) => updatePref('notificationsEnabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">
              Enable browser notifications
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={localPrefs.breakReminders}
              onChange={(e) => updatePref('breakReminders', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Remind me to take breaks</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 rounded-xl bg-white p-6 shadow-lg">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full rounded-lg px-6 py-3 font-medium text-white transition ${
            saved
              ? 'bg-green-600'
              : saving
                ? 'bg-slate-400'
                : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {(() => {
            if (saved) return '✓ Saved!';
            if (saving) return 'Saving...';
            return 'Save Settings';
          })()}
        </button>
      </div>
    </div>
  );
}
