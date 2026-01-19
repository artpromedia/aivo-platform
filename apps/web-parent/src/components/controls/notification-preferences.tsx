/**
 * Notification Preferences Component
 *
 * Allows parents to configure notification settings for their
 * children's learning activities and progress updates.
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, MessageSquare, Trophy, AlertCircle, Clock, Save, RotateCcw, Loader2 } from 'lucide-react';

interface NotificationSettings {
  email: {
    enabled: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
    achievements: boolean;
    concerns: boolean;
    teacherMessages: boolean;
  };
  push: {
    enabled: boolean;
    achievements: boolean;
    milestones: boolean;
    concerns: boolean;
    teacherMessages: boolean;
    screenTimeAlerts: boolean;
  };
  inApp: {
    enabled: boolean;
    achievements: boolean;
    progress: boolean;
    recommendations: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationPreferencesProps {
  settings: NotificationSettings;
  onSave: (settings: NotificationSettings) => Promise<void>;
  isSaving?: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  email: {
    enabled: true,
    dailyDigest: false,
    weeklyReport: true,
    achievements: true,
    concerns: true,
    teacherMessages: true,
  },
  push: {
    enabled: true,
    achievements: true,
    milestones: true,
    concerns: true,
    teacherMessages: true,
    screenTimeAlerts: true,
  },
  inApp: {
    enabled: true,
    achievements: true,
    progress: true,
    recommendations: true,
  },
  quietHours: {
    enabled: false,
    start: '21:00',
    end: '07:00',
  },
};

export function NotificationPreferences({
  settings: initialSettings,
  onSave,
  isSaving,
}: NotificationPreferencesProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings({ ...DEFAULT_SETTINGS, ...initialSettings });
    setHasChanges(false);
  }, [initialSettings]);

  const updateEmailSettings = (updates: Partial<NotificationSettings['email']>) => {
    setSettings((prev) => ({
      ...prev,
      email: { ...prev.email, ...updates },
    }));
    setHasChanges(true);
  };

  const updatePushSettings = (updates: Partial<NotificationSettings['push']>) => {
    setSettings((prev) => ({
      ...prev,
      push: { ...prev.push, ...updates },
    }));
    setHasChanges(true);
  };

  const updateInAppSettings = (updates: Partial<NotificationSettings['inApp']>) => {
    setSettings((prev) => ({
      ...prev,
      inApp: { ...prev.inApp, ...updates },
    }));
    setHasChanges(true);
  };

  const updateQuietHours = (updates: Partial<NotificationSettings['quietHours']>) => {
    setSettings((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, ...updates },
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
            <p className="text-sm text-gray-500">Choose how you want to be notified about your child&apos;s progress</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Email Notifications */}
        <NotificationSection
          icon={Mail}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          title="Email Notifications"
          description="Receive updates via email"
          enabled={settings.email.enabled}
          onToggle={(enabled) => updateEmailSettings({ enabled })}
        >
          <div className="space-y-3">
            <NotificationOption
              label="Daily Digest"
              description="Summary of daily learning activity"
              checked={settings.email.dailyDigest}
              onChange={(checked) => updateEmailSettings({ dailyDigest: checked })}
              disabled={!settings.email.enabled}
            />
            <NotificationOption
              label="Weekly Report"
              description="Comprehensive weekly progress report"
              checked={settings.email.weeklyReport}
              onChange={(checked) => updateEmailSettings({ weeklyReport: checked })}
              disabled={!settings.email.enabled}
            />
            <NotificationOption
              label="Achievements"
              description="When your child earns badges or reaches milestones"
              checked={settings.email.achievements}
              onChange={(checked) => updateEmailSettings({ achievements: checked })}
              disabled={!settings.email.enabled}
              icon={Trophy}
            />
            <NotificationOption
              label="Concerns"
              description="When the system detects learning difficulties"
              checked={settings.email.concerns}
              onChange={(checked) => updateEmailSettings({ concerns: checked })}
              disabled={!settings.email.enabled}
              icon={AlertCircle}
            />
            <NotificationOption
              label="Teacher Messages"
              description="New messages from teachers"
              checked={settings.email.teacherMessages}
              onChange={(checked) => updateEmailSettings({ teacherMessages: checked })}
              disabled={!settings.email.enabled}
              icon={MessageSquare}
            />
          </div>
        </NotificationSection>

        {/* Push Notifications */}
        <NotificationSection
          icon={Smartphone}
          iconColor="text-green-600"
          iconBg="bg-green-100"
          title="Push Notifications"
          description="Real-time alerts on your devices"
          enabled={settings.push.enabled}
          onToggle={(enabled) => updatePushSettings({ enabled })}
        >
          <div className="space-y-3">
            <NotificationOption
              label="Achievements"
              description="Instant notification when badges are earned"
              checked={settings.push.achievements}
              onChange={(checked) => updatePushSettings({ achievements: checked })}
              disabled={!settings.push.enabled}
            />
            <NotificationOption
              label="Milestones"
              description="When your child reaches learning milestones"
              checked={settings.push.milestones}
              onChange={(checked) => updatePushSettings({ milestones: checked })}
              disabled={!settings.push.enabled}
            />
            <NotificationOption
              label="Concerns"
              description="Immediate alerts for learning concerns"
              checked={settings.push.concerns}
              onChange={(checked) => updatePushSettings({ concerns: checked })}
              disabled={!settings.push.enabled}
            />
            <NotificationOption
              label="Teacher Messages"
              description="Instant notification for new messages"
              checked={settings.push.teacherMessages}
              onChange={(checked) => updatePushSettings({ teacherMessages: checked })}
              disabled={!settings.push.enabled}
            />
            <NotificationOption
              label="Screen Time Alerts"
              description="When your child reaches time limits"
              checked={settings.push.screenTimeAlerts}
              onChange={(checked) => updatePushSettings({ screenTimeAlerts: checked })}
              disabled={!settings.push.enabled}
            />
          </div>
        </NotificationSection>

        {/* In-App Notifications */}
        <NotificationSection
          icon={Bell}
          iconColor="text-violet-600"
          iconBg="bg-violet-100"
          title="In-App Notifications"
          description="Notifications within the parent portal"
          enabled={settings.inApp.enabled}
          onToggle={(enabled) => updateInAppSettings({ enabled })}
        >
          <div className="space-y-3">
            <NotificationOption
              label="Achievements"
              description="Show achievement notifications in the dashboard"
              checked={settings.inApp.achievements}
              onChange={(checked) => updateInAppSettings({ achievements: checked })}
              disabled={!settings.inApp.enabled}
            />
            <NotificationOption
              label="Progress Updates"
              description="Real-time progress indicators"
              checked={settings.inApp.progress}
              onChange={(checked) => updateInAppSettings({ progress: checked })}
              disabled={!settings.inApp.enabled}
            />
            <NotificationOption
              label="AI Recommendations"
              description="Personalized learning suggestions"
              checked={settings.inApp.recommendations}
              onChange={(checked) => updateInAppSettings({ recommendations: checked })}
              disabled={!settings.inApp.enabled}
            />
          </div>
        </NotificationSection>

        {/* Quiet Hours */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-200 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Quiet Hours</h3>
                <p className="text-sm text-gray-500">Pause notifications during specific hours</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.quietHours.enabled}
                onChange={(e) => updateQuietHours({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {settings.quietHours.enabled && (
            <div className="flex items-center gap-4 ml-12">
              <div>
                <label className="block text-sm text-gray-600 mb-1">From</label>
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => updateQuietHours({ start: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">To</label>
                <input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => updateQuietHours({ end: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
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
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

function NotificationSection({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border ${enabled ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${iconBg} rounded-lg`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <h3 className={`font-medium ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
        </label>
      </div>
      {enabled && <div className="px-4 pb-4 ml-12">{children}</div>}
    </div>
  );
}

function NotificationOption({
  label,
  description,
  checked,
  onChange,
  disabled,
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <label
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
      />
      {Icon && <Icon className="w-4 h-4 text-gray-400" />}
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </label>
  );
}

export default NotificationPreferences;
