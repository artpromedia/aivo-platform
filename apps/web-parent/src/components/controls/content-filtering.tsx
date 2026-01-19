/**
 * Content Filtering Component
 *
 * Allows parents to control content restrictions and filtering
 * for their children's learning experience.
 */

'use client';

import { useState, useEffect } from 'react';
import { Filter, Shield, Eye, EyeOff, Save, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';

interface ContentFilterSettings {
  restrictionLevel: 'strict' | 'moderate' | 'minimal';
  blockExternalLinks: boolean;
  safeSearch: boolean;
  hideAchievementLeaderboards: boolean;
  restrictChat: boolean;
  blockedTopics: string[];
  allowedTopics: string[];
}

interface ContentFilteringProps {
  settings: ContentFilterSettings;
  onSave: (settings: ContentFilterSettings) => Promise<void>;
  isSaving?: boolean;
}

const DEFAULT_SETTINGS: ContentFilterSettings = {
  restrictionLevel: 'moderate',
  blockExternalLinks: true,
  safeSearch: true,
  hideAchievementLeaderboards: false,
  restrictChat: true,
  blockedTopics: [],
  allowedTopics: [],
};

const RESTRICTION_LEVELS = [
  {
    value: 'strict',
    label: 'Strict',
    description: 'Maximum protection with all safety features enabled',
    icon: Shield,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Balanced safety settings for most children',
    icon: Filter,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Basic protections only, more independence',
    icon: Eye,
    color: 'text-green-500',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
];

const TOPIC_SUGGESTIONS = [
  'Violence',
  'Scary Content',
  'Competition',
  'Social Media',
  'Advanced Math',
  'History Wars',
  'Science Experiments',
];

export function ContentFiltering({
  settings: initialSettings,
  onSave,
  isSaving,
}: ContentFilteringProps) {
  const [settings, setSettings] = useState<ContentFilterSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [newBlockedTopic, setNewBlockedTopic] = useState('');

  useEffect(() => {
    setSettings({ ...DEFAULT_SETTINGS, ...initialSettings });
    setHasChanges(false);
  }, [initialSettings]);

  const updateSettings = (updates: Partial<ContentFilterSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const addBlockedTopic = () => {
    if (newBlockedTopic.trim() && !settings.blockedTopics.includes(newBlockedTopic.trim())) {
      updateSettings({
        blockedTopics: [...settings.blockedTopics, newBlockedTopic.trim()],
      });
      setNewBlockedTopic('');
    }
  };

  const removeBlockedTopic = (topic: string) => {
    updateSettings({
      blockedTopics: settings.blockedTopics.filter((t) => t !== topic),
    });
  };

  const handleSave = async () => {
    await onSave(settings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS, ...initialSettings });
    setHasChanges(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Filter className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Content Filtering</h2>
            <p className="text-sm text-gray-500">Control what content your child can access</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Restriction Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Content Restriction Level
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {RESTRICTION_LEVELS.map((level) => {
              const Icon = level.icon;
              const isSelected = settings.restrictionLevel === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => updateSettings({ restrictionLevel: level.value as ContentFilterSettings['restrictionLevel'] })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? `${level.bg} ${level.border}`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${isSelected ? level.color : 'text-gray-400'}`} />
                    <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {level.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{level.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Safety Toggles */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Safety Settings</h3>

          <ToggleRow
            label="Block External Links"
            description="Prevent access to links outside the learning platform"
            checked={settings.blockExternalLinks}
            onChange={(checked) => updateSettings({ blockExternalLinks: checked })}
          />

          <ToggleRow
            label="Safe Search"
            description="Filter search results to exclude inappropriate content"
            checked={settings.safeSearch}
            onChange={(checked) => updateSettings({ safeSearch: checked })}
          />

          <ToggleRow
            label="Hide Leaderboards"
            description="Hide competitive rankings to reduce pressure"
            checked={settings.hideAchievementLeaderboards}
            onChange={(checked) => updateSettings({ hideAchievementLeaderboards: checked })}
          />

          <ToggleRow
            label="Restrict Chat"
            description="Limit chat functionality to teacher-approved conversations"
            checked={settings.restrictChat}
            onChange={(checked) => updateSettings({ restrictChat: checked })}
          />
        </div>

        {/* Blocked Topics */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Blocked Topics
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Add specific topics you want to filter from your child&apos;s learning content.
          </p>

          {/* Add Topic Input */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newBlockedTopic}
              onChange={(e) => setNewBlockedTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBlockedTopic()}
              placeholder="Type a topic to block..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addBlockedTopic}
              disabled={!newBlockedTopic.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>

          {/* Topic Suggestions */}
          <div className="flex flex-wrap gap-2 mb-3">
            {TOPIC_SUGGESTIONS.filter((t) => !settings.blockedTopics.includes(t)).map((topic) => (
              <button
                key={topic}
                onClick={() => updateSettings({ blockedTopics: [...settings.blockedTopics, topic] })}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                + {topic}
              </button>
            ))}
          </div>

          {/* Blocked Topics List */}
          {settings.blockedTopics.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-red-50 rounded-lg">
              {settings.blockedTopics.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full"
                >
                  <EyeOff className="w-3 h-3" />
                  {topic}
                  <button
                    onClick={() => removeBlockedTopic(topic)}
                    className="ml-1 text-red-500 hover:text-red-700"
                    aria-label={`Remove ${topic}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Warning for Minimal */}
        {settings.restrictionLevel === 'minimal' && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Minimal Restrictions Active</h4>
              <p className="text-sm text-amber-700 mt-1">
                Your child will have more independence with basic protections only.
                Consider reviewing their activity more frequently.
              </p>
            </div>
          </div>
        )}
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
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div>
        <label className="font-medium text-gray-700">{label}</label>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );
}

export default ContentFiltering;
