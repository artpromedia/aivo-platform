/**
 * Settings Page
 *
 * Parent settings and preferences for the AIVO parent portal.
 */

'use client';

import { useMutation } from '@tanstack/react-query';
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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { isDevMode } from '@/lib/api';

interface NotificationSettings {
  emailDigest: 'daily' | 'weekly' | 'never';
  pushNotifications: boolean;
  progressAlerts: boolean;
  teacherMessages: boolean;
  achievementAlerts: boolean;
  homeworkReminders: boolean;
}

interface PrivacySettings {
  shareProgress: boolean;
  allowTeacherContact: boolean;
  dataCollection: boolean;
}

interface ScreenTimeSettings {
  dailyLimit: number; // minutes
  breakReminders: boolean;
  weekendLimit: number;
}

export default function SettingsPage() {
  const router = useRouter();

  // Settings state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailDigest: 'daily',
    pushNotifications: true,
    progressAlerts: true,
    teacherMessages: true,
    achievementAlerts: true,
    homeworkReminders: true,
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    shareProgress: true,
    allowTeacherContact: true,
    dataCollection: true,
  });

  const [screenTime, setScreenTime] = useState<ScreenTimeSettings>({
    dailyLimit: 120,
    breakReminders: true,
    weekendLimit: 180,
  });

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Mock save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    },
  });

  const handleSave = () => {
    setSaveStatus('saving');
    saveMutation.mutate();
  };

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
            {activeSection && (
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
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
        ) : activeSection === 'notifications' ? (
          <NotificationSettingsPanel
            settings={notifications}
            onChange={setNotifications}
            onBack={() => {
              setActiveSection(null);
            }}
          />
        ) : activeSection === 'privacy' ? (
          <PrivacySettingsPanel
            settings={privacy}
            onChange={setPrivacy}
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
  onChange,
  onBack,
}: {
  readonly settings: NotificationSettings;
  readonly onChange: (settings: NotificationSettings) => void;
  readonly onBack: () => void;
}) {
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
                  <p className="font-medium text-gray-900">Email Digest</p>
                  <p className="text-sm text-gray-500">Summary of your child&apos;s progress</p>
                </div>
              </div>
              <select
                value={settings.emailDigest}
                onChange={(e) => {
                  onChange({
                    ...settings,
                    emailDigest: e.target.value as typeof settings.emailDigest,
                  });
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>

          {/* Push Notifications */}
          <ToggleSetting
            icon={<Smartphone className="w-5 h-5 text-gray-400" />}
            title="Push Notifications"
            description="Receive notifications on your device"
            enabled={settings.pushNotifications}
            onChange={(enabled) => {
              onChange({ ...settings, pushNotifications: enabled });
            }}
          />

          {/* Progress Alerts */}
          <ToggleSetting
            icon={<Bell className="w-5 h-5 text-gray-400" />}
            title="Progress Alerts"
            description="Get notified about significant progress changes"
            enabled={settings.progressAlerts}
            onChange={(enabled) => {
              onChange({ ...settings, progressAlerts: enabled });
            }}
          />

          {/* Teacher Messages */}
          <ToggleSetting
            icon={<Mail className="w-5 h-5 text-gray-400" />}
            title="Teacher Messages"
            description="Notifications for new teacher messages"
            enabled={settings.teacherMessages}
            onChange={(enabled) => {
              onChange({ ...settings, teacherMessages: enabled });
            }}
          />

          {/* Achievement Alerts */}
          <ToggleSetting
            icon={<Bell className="w-5 h-5 text-gray-400" />}
            title="Achievement Alerts"
            description="Celebrate when your child earns achievements"
            enabled={settings.achievementAlerts}
            onChange={(enabled) => {
              onChange({ ...settings, achievementAlerts: enabled });
            }}
          />

          {/* Homework Reminders */}
          <ToggleSetting
            icon={<Clock className="w-5 h-5 text-gray-400" />}
            title="Homework Reminders"
            description="Reminders for incomplete assignments"
            enabled={settings.homeworkReminders}
            onChange={(enabled) => {
              onChange({ ...settings, homeworkReminders: enabled });
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Privacy Settings Panel
function PrivacySettingsPanel({
  settings,
  onChange,
  onBack,
}: {
  settings: PrivacySettings;
  onChange: (settings: PrivacySettings) => void;
  onBack: () => void;
}) {
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          <ToggleSetting
            icon={<Eye className="w-5 h-5 text-gray-400" />}
            title="Share Progress with Teachers"
            description="Allow teachers to see detailed progress reports"
            enabled={settings.shareProgress}
            onChange={(enabled) => {
              onChange({ ...settings, shareProgress: enabled });
            }}
          />

          <ToggleSetting
            icon={<Mail className="w-5 h-5 text-gray-400" />}
            title="Allow Teacher Contact"
            description="Teachers can initiate conversations with you"
            enabled={settings.allowTeacherContact}
            onChange={(enabled) => {
              onChange({ ...settings, allowTeacherContact: enabled });
            }}
          />

          <ToggleSetting
            icon={<Shield className="w-5 h-5 text-gray-400" />}
            title="Usage Analytics"
            description="Help improve AIVO by sharing anonymous usage data"
            enabled={settings.dataCollection}
            onChange={(enabled) => {
              onChange({ ...settings, dataCollection: enabled });
            }}
          />
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

// Screen Time Settings Panel
function ScreenTimeSettingsPanel({
  settings,
  onChange,
  onBack,
}: {
  readonly settings: ScreenTimeSettings;
  readonly onChange: (settings: ScreenTimeSettings) => void;
  readonly onBack: () => void;
}) {
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {/* Daily Limit */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-gray-900">Weekday Daily Limit</p>
                <p className="text-sm text-gray-500">Maximum learning time per day</p>
              </div>
              <span className="text-lg font-semibold text-purple-600">
                {Math.floor(settings.dailyLimit / 60)}h {settings.dailyLimit % 60}m
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={240}
              step={15}
              value={settings.dailyLimit}
              onChange={(e) => {
                onChange({ ...settings, dailyLimit: parseInt(e.target.value) });
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>30 min</span>
              <span>4 hours</span>
            </div>
          </div>

          {/* Weekend Limit */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-gray-900">Weekend Daily Limit</p>
                <p className="text-sm text-gray-500">Saturday and Sunday limits</p>
              </div>
              <span className="text-lg font-semibold text-purple-600">
                {Math.floor(settings.weekendLimit / 60)}h {settings.weekendLimit % 60}m
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={300}
              step={15}
              value={settings.weekendLimit}
              onChange={(e) => {
                onChange({ ...settings, weekendLimit: parseInt(e.target.value) });
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>30 min</span>
              <span>5 hours</span>
            </div>
          </div>

          {/* Break Reminders */}
          <ToggleSetting
            icon={<Clock className="w-5 h-5 text-gray-400" />}
            title="Break Reminders"
            description="Remind your child to take breaks every 25 minutes"
            enabled={settings.breakReminders}
            onChange={(enabled) => {
              onChange({ ...settings, breakReminders: enabled });
            }}
          />
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
