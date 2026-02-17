/**
 * Settings Page
 *
 * Parent settings and preferences for the AIVO parent portal.
 * Uses real persistence via settings API.
 */

'use client';

import type { NotificationSettings as ApiNotificationSettings } from '@aivo/ts-types';
import {
  ArrowLeft,
  Settings,
  Bell,
  Shield,
  Clock,
  Mail,
  Smartphone,
  User,
  Users,
  ChevronRight,
  Check,
  Eye,
  Loader2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';

import { useParentSettings, useUpdateNotificationSettings, useUpdateAppSettings } from '@/hooks';
import { isDevMode } from '@/lib/api';

// Local interface for screen time (kept for backward compatibility in this component)
interface LocalScreenTimeSettings {
  dailyLimit: number; // minutes
  breakReminders: boolean;
  weekendLimit: number;
}

export default function SettingsPage() {
  const router = useRouter();

  // Fetch real settings from API
  const { data: parentSettings, isLoading, error, refetch } = useParentSettings();

  // Mutations for saving
  const updateNotifications = useUpdateNotificationSettings();
  const updateAppSettings = useUpdateAppSettings();

  // Local state for screen time (managed per-child on controls page)
  const [screenTime, setScreenTime] = useState<LocalScreenTimeSettings>({
    dailyLimit: 120,
    breakReminders: true,
    weekendLimit: 180,
  });

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Derive notification state from API data
  const notifications = parentSettings?.notifications;

  const handleSaveNotifications = useCallback(
    async (newSettings: Partial<ApiNotificationSettings>) => {
      setSaveStatus('saving');
      try {
        await updateNotifications.mutateAsync(newSettings);
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (err) {
        console.error('Failed to save notifications:', err);
        setSaveStatus('error');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    },
    [updateNotifications]
  );

  const sections = [
    {
      id: 'caregivers',
      title: 'Caregivers',
      description: 'Invite family members to monitor your child',
      icon: Users,
      color: 'text-teal-600 bg-teal-100',
      href: '/settings/caregivers',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage email and push notification preferences',
      icon: Bell,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      id: 'privacy',
      title: 'Privacy & Safety',
      description: 'Control data sharing and privacy settings',
      icon: Shield,
      color: 'text-green-600 bg-green-100',
    },
    {
      id: 'screen-time',
      title: 'Screen Time',
      description: 'Set daily limits and break reminders',
      icon: Clock,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      id: 'account',
      title: 'Account',
      description: 'Manage your account and profile',
      icon: User,
      color: 'text-indigo-600 bg-indigo-100',
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200 max-w-md w-full">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-lg font-semibold">Failed to load settings</h2>
          </div>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => void refetch()}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  router.push('/dashboard');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <Settings className="w-6 h-6 text-gray-600" />
                <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
              </div>
            </div>
            {/* Save status indicator */}
            {saveStatus !== 'idle' && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg">
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span className="text-gray-600">Saving...</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Saved!</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">Failed to save</span>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!activeSection ? (
          // Settings Menu
          <div className="space-y-3">
            {sections.map((section) => {
              const SectionButton = section.href ? 'a' : 'button';
              return (
                <SectionButton
                  key={section.id}
                  href={section.href}
                  onClick={
                    section.href
                      ? undefined
                      : () => {
                          setActiveSection(section.id);
                        }
                  }
                  className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all flex items-center gap-4"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${section.color}`}
                  >
                    <section.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </SectionButton>
              );
            })}
          </div>
        ) : activeSection === 'notifications' && notifications ? (
          <NotificationSettingsPanel
            settings={notifications}
            onSave={handleSaveNotifications}
            onBack={() => {
              setActiveSection(null);
            }}
          />
        ) : activeSection === 'privacy' ? (
          <PrivacySettingsPanel
            onBack={() => {
              setActiveSection(null);
            }}
          />
        ) : activeSection === 'screen-time' ? (
          <ScreenTimeSettingsPanel
            settings={screenTime}
            onChange={setScreenTime}
            onBack={() => {
              setActiveSection(null);
            }}
          />
        ) : activeSection === 'account' ? (
          <AccountSettings
            onBack={() => {
              setActiveSection(null);
            }}
          />
        ) : null}
      </main>

      {/* DEV Mode */}
      {isDevMode() && (
        <div className="fixed bottom-4 right-4 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
          DEV MODE
        </div>
      )}
    </div>
  );
}

// Notification Settings Panel
function NotificationSettingsPanel({
  settings,
  onSave,
  onBack,
}: {
  readonly settings: ApiNotificationSettings;
  readonly onSave: (settings: Partial<ApiNotificationSettings>) => Promise<void>;
  readonly onBack: () => void;
}) {
  // Handle toggle changes - save immediately
  const handleEmailToggle = async (key: keyof ApiNotificationSettings['email'], value: boolean) => {
    await onSave({
      email: { ...settings.email, [key]: value },
    });
  };

  const handlePushToggle = async (key: keyof ApiNotificationSettings['push'], value: boolean) => {
    await onSave({
      push: { ...settings.push, [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Notification Preferences
        </h2>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {/* Email Digest */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Daily Email Digest</p>
                  <p className="text-sm text-gray-500">Summary of your child&apos;s progress</p>
                </div>
              </div>
              <button
                onClick={() => void handleEmailToggle('dailyDigest', !settings.email.dailyDigest)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.email.dailyDigest ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.email.dailyDigest ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Weekly Report */}
          <ToggleSetting
            icon={<Mail className="w-5 h-5 text-gray-400" />}
            title="Weekly Report"
            description="Receive weekly progress summaries"
            enabled={settings.email.weeklyReport}
            onChange={(enabled) => void handleEmailToggle('weeklyReport', enabled)}
          />

          {/* Push Notifications Master */}
          <ToggleSetting
            icon={<Smartphone className="w-5 h-5 text-gray-400" />}
            title="Push Notifications"
            description="Receive notifications on your device"
            enabled={settings.push.enabled}
            onChange={(enabled) => void handlePushToggle('enabled', enabled)}
          />

          {/* Achievement Notifications */}
          <ToggleSetting
            icon={<Bell className="w-5 h-5 text-gray-400" />}
            title="Achievement Alerts"
            description="Celebrate when your child earns achievements"
            enabled={settings.push.achievements}
            onChange={(enabled) => void handlePushToggle('achievements', enabled)}
          />

          {/* Teacher Messages */}
          <ToggleSetting
            icon={<Mail className="w-5 h-5 text-gray-400" />}
            title="Teacher Messages"
            description="Notifications for new teacher messages"
            enabled={settings.push.teacherMessages}
            onChange={(enabled) => void handlePushToggle('teacherMessages', enabled)}
          />

          {/* Screen Time Alerts */}
          <ToggleSetting
            icon={<Clock className="w-5 h-5 text-gray-400" />}
            title="Screen Time Alerts"
            description="Get notified when screen time limits are reached"
            enabled={settings.push.screenTimeAlerts}
            onChange={(enabled) => void handlePushToggle('screenTimeAlerts', enabled)}
          />
        </div>
      </div>
    </div>
  );
}

// Privacy Settings Panel - Now uses controls page for per-child settings
function PrivacySettingsPanel({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const handleDownloadData = async () => {
    setIsExporting(true);
    setExportDone(false);
    try {
      // Uses first linked student; a full implementation would let parent choose
      const res = await fetch('/api/data-rights/default/data/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-childs-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportDone(true);
    } catch {
      // Silently fail — in production would show toast
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          Privacy & Safety
        </h2>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-600 mb-4">
            Privacy and safety settings are configured per-child in Parental Controls. This allows
            you to customize settings based on each child&apos;s age and needs.
          </p>
          <button
            onClick={() => {
              router.push('/controls');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Go to Parental Controls
          </button>
        </div>

        {/* FERPA Data Download — Sprint T2-05 */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-500" />
            Download My Child&apos;s Data
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Under FERPA, you have the right to inspect and review your child&apos;s education
            records. Download a complete copy including profile information, learning activity,
            assessment results, IEP records, and consent history.
          </p>
          <button
            onClick={handleDownloadData}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Preparing Download...' : exportDone ? 'Downloaded ✓' : 'Download Data'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h4 className="font-medium text-blue-900 mb-2">Your Privacy Matters</h4>
          <p className="text-sm text-blue-700">
            AIVO is COPPA and FERPA compliant. We never sell personal data and use industry-standard
            encryption to protect your family&apos;s information.
          </p>
        </div>
      </div>
    </div>
  );
}

// Screen Time Settings Panel - Now redirects to per-child controls
function ScreenTimeSettingsPanel({
  settings,
  onChange,
  onBack,
}: {
  readonly settings: LocalScreenTimeSettings;
  readonly onChange: (settings: LocalScreenTimeSettings) => void;
  readonly onBack: () => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-600" />
          Screen Time Limits
        </h2>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-600 mb-4">
            Screen time limits are configured per-child in Parental Controls. This allows you to set
            appropriate limits for each child based on their age and needs.
          </p>
          <button
            onClick={() => {
              router.push('/controls');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Go to Parental Controls
          </button>
        </div>
      </div>
    </div>
  );
}

// Account Settings Panel
function AccountSettings({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          Account Settings
        </h2>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          <button className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Edit Profile</p>
              <p className="text-sm text-gray-500">Update your name and contact info</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Change Password</p>
              <p className="text-sm text-gray-500">Update your account password</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Linked Children</p>
              <p className="text-sm text-gray-500">Manage connected student accounts</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Subscription</p>
              <p className="text-sm text-gray-500">View and manage your plan</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="mt-6">
          <button className="w-full p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-medium hover:bg-red-100 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable Toggle Setting Component
function ToggleSetting({
  icon,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <button
        onClick={() => {
          onChange(!enabled);
        }}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-6' : ''
          }`}
        />
      </button>
    </div>
  );
}
