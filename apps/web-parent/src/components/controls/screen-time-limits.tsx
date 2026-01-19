/**
 * Screen Time Limits Component
 *
 * Allows parents to set daily time limits and learning schedules
 * for their children's learning activities.
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, Save, RotateCcw, Loader2 } from 'lucide-react';

interface ScreenTimeSettings {
  dailyLimit: number; // minutes
  scheduleEnabled: boolean;
  schedule: {
    [day: string]: { start: string; end: string; enabled: boolean };
  };
  breakReminders: boolean;
  breakInterval: number; // minutes
  breakDuration: number; // minutes
}

interface ScreenTimeLimitsProps {
  settings: ScreenTimeSettings;
  onSave: (settings: ScreenTimeSettings) => Promise<void>;
  isSaving?: boolean;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: { [key: string]: string } = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DEFAULT_SETTINGS: ScreenTimeSettings = {
  dailyLimit: 120,
  scheduleEnabled: false,
  schedule: {
    monday: { start: '15:00', end: '18:00', enabled: true },
    tuesday: { start: '15:00', end: '18:00', enabled: true },
    wednesday: { start: '15:00', end: '18:00', enabled: true },
    thursday: { start: '15:00', end: '18:00', enabled: true },
    friday: { start: '15:00', end: '18:00', enabled: true },
    saturday: { start: '09:00', end: '17:00', enabled: true },
    sunday: { start: '09:00', end: '17:00', enabled: true },
  },
  breakReminders: true,
  breakInterval: 30,
  breakDuration: 5,
};

export function ScreenTimeLimits({
  settings: initialSettings,
  onSave,
  isSaving,
}: ScreenTimeLimitsProps) {
  const [settings, setSettings] = useState<ScreenTimeSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings({ ...DEFAULT_SETTINGS, ...initialSettings });
    setHasChanges(false);
  }, [initialSettings]);

  const updateSettings = (updates: Partial<ScreenTimeSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateSchedule = (day: string, updates: Partial<{ start: string; end: string; enabled: boolean }>) => {
    setSettings((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], ...updates },
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(settings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS, ...initialSettings });
    setHasChanges(false);
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg">
            <Clock className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Screen Time Limits</h2>
            <p className="text-sm text-gray-500">Set daily learning time limits and schedules</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Daily Limit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Daily Time Limit
          </label>
          <div className="flex items-center gap-6">
            <input
              type="range"
              min="30"
              max="300"
              step="15"
              value={settings.dailyLimit}
              onChange={(e) => updateSettings({ dailyLimit: parseInt(e.target.value) })}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
            <div className="min-w-[80px] text-center">
              <span className="text-2xl font-bold text-violet-600">
                {formatTime(settings.dailyLimit)}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>30 min</span>
            <span>5 hours</span>
          </div>
        </div>

        {/* Learning Schedule */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className="font-medium text-gray-700">Learning Schedule</label>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.scheduleEnabled}
                onChange={(e) => updateSettings({ scheduleEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>

          {settings.scheduleEnabled && (
            <div className="space-y-3 mt-4 p-4 bg-gray-50 rounded-lg">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center gap-4">
                  <label className="flex items-center gap-2 min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={settings.schedule[day]?.enabled ?? true}
                      onChange={(e) => updateSchedule(day, { enabled: e.target.checked })}
                      className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                    />
                    <span className={`text-sm font-medium ${settings.schedule[day]?.enabled ? 'text-gray-700' : 'text-gray-400'}`}>
                      {DAY_LABELS[day]}
                    </span>
                  </label>
                  {settings.schedule[day]?.enabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={settings.schedule[day]?.start || '15:00'}
                        onChange={(e) => updateSchedule(day, { start: e.target.value })}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={settings.schedule[day]?.end || '18:00'}
                        onChange={(e) => updateSchedule(day, { end: e.target.value })}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Break Reminders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="font-medium text-gray-700">Break Reminders</label>
              <p className="text-sm text-gray-500">Remind your child to take regular breaks</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.breakReminders}
                onChange={(e) => updateSettings({ breakReminders: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>

          {settings.breakReminders && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Break every
                </label>
                <select
                  value={settings.breakInterval}
                  onChange={(e) => updateSettings({ breakInterval: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="25">25 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Break duration
                </label>
                <select
                  value={settings.breakDuration}
                  onChange={(e) => updateSettings({ breakDuration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="3">3 minutes</option>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
        {hasChanges && (
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default ScreenTimeLimits;
