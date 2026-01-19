/**
 * Subject Access Component
 *
 * Allows parents to control which subjects and content areas
 * their children can access in the learning platform.
 */

'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Lock, Unlock, Save, RotateCcw, Loader2, Star } from 'lucide-react';

interface SubjectAccessSettings {
  subjects: {
    [subject: string]: {
      enabled: boolean;
      maxLevel?: number;
      restrictedTopics?: string[];
    };
  };
  requireParentApprovalForNewSubjects: boolean;
  allowAdvancedContent: boolean;
}

interface SubjectAccessProps {
  settings: SubjectAccessSettings;
  availableSubjects: {
    id: string;
    name: string;
    icon?: string;
    maxLevel: number;
    description?: string;
  }[];
  onSave: (settings: SubjectAccessSettings) => Promise<void>;
  isSaving?: boolean;
}

const DEFAULT_SETTINGS: SubjectAccessSettings = {
  subjects: {},
  requireParentApprovalForNewSubjects: true,
  allowAdvancedContent: false,
};

const SUBJECT_COLORS: { [key: string]: { bg: string; text: string; border: string } } = {
  Math: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Reading: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  Science: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Writing: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Social Studies': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Art: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  Music: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  default: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

export function SubjectAccess({
  settings: initialSettings,
  availableSubjects,
  onSave,
  isSaving,
}: SubjectAccessProps) {
  const [settings, setSettings] = useState<SubjectAccessSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Initialize subject settings for all available subjects
    const initialSubjects: SubjectAccessSettings['subjects'] = {};
    availableSubjects.forEach((subject) => {
      initialSubjects[subject.id] = {
        enabled: true,
        maxLevel: subject.maxLevel,
        ...initialSettings?.subjects?.[subject.id],
      };
    });
    setSettings({
      ...DEFAULT_SETTINGS,
      ...initialSettings,
      subjects: initialSubjects,
    });
    setHasChanges(false);
  }, [initialSettings, availableSubjects]);

  const updateSubjectSettings = (
    subjectId: string,
    updates: Partial<{ enabled: boolean; maxLevel: number }>
  ) => {
    setSettings((prev) => ({
      ...prev,
      subjects: {
        ...prev.subjects,
        [subjectId]: {
          ...prev.subjects[subjectId],
          ...updates,
        },
      },
    }));
    setHasChanges(true);
  };

  const updateSettings = (updates: Partial<SubjectAccessSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(settings);
    setHasChanges(false);
  };

  const handleReset = () => {
    const resetSubjects: SubjectAccessSettings['subjects'] = {};
    availableSubjects.forEach((subject) => {
      resetSubjects[subject.id] = {
        enabled: true,
        maxLevel: subject.maxLevel,
        ...initialSettings?.subjects?.[subject.id],
      };
    });
    setSettings({
      ...DEFAULT_SETTINGS,
      ...initialSettings,
      subjects: resetSubjects,
    });
    setHasChanges(false);
  };

  const getSubjectColors = (name: string) => {
    return SUBJECT_COLORS[name] || SUBJECT_COLORS.default;
  };

  const enabledCount = Object.values(settings.subjects).filter((s) => s.enabled).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Subject Access</h2>
            <p className="text-sm text-gray-500">Control which subjects your child can access</p>
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-medium text-emerald-600">{enabledCount}</span> of{' '}
            {availableSubjects.length} subjects enabled
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Subject Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableSubjects.map((subject) => {
            const colors = getSubjectColors(subject.name);
            const subjectSettings = settings.subjects[subject.id] || { enabled: true, maxLevel: subject.maxLevel };

            return (
              <div
                key={subject.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  subjectSettings.enabled
                    ? `${colors.bg} ${colors.border}`
                    : 'bg-gray-50 border-gray-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {subjectSettings.enabled ? (
                      <Unlock className={`w-5 h-5 ${colors.text}`} />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                    <h3 className={`font-medium ${subjectSettings.enabled ? colors.text : 'text-gray-500'}`}>
                      {subject.name}
                    </h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subjectSettings.enabled}
                      onChange={(e) => updateSubjectSettings(subject.id, { enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {subjectSettings.enabled && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Max Level</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: subject.maxLevel }, (_, i) => i + 1).map((level) => (
                          <button
                            key={level}
                            onClick={() => updateSubjectSettings(subject.id, { maxLevel: level })}
                            className={`p-1 rounded transition-colors ${
                              level <= (subjectSettings.maxLevel || subject.maxLevel)
                                ? 'text-amber-400'
                                : 'text-gray-300'
                            }`}
                            title={`Level ${level}`}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                    {subject.description && (
                      <p className="text-xs text-gray-500">{subject.description}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional Settings */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700">Additional Settings</h3>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-700">Require Approval for New Subjects</label>
              <p className="text-sm text-gray-500">
                You&apos;ll be notified when new subjects become available
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireParentApprovalForNewSubjects}
                onChange={(e) => updateSettings({ requireParentApprovalForNewSubjects: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-700">Allow Advanced Content</label>
              <p className="text-sm text-gray-500">
                Enable content above your child&apos;s current grade level
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowAdvancedContent}
                onChange={(e) => updateSettings({ allowAdvancedContent: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
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
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

export default SubjectAccess;
