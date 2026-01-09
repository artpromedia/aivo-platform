/**
 * Notification Settings Page
 *
 * Allows teachers to configure push notification preferences.
 * Addresses RE-AUDIT-005: Web Teacher/Parent Apps Lack Push Notifications
 */
'use client';

import { useState } from 'react';
import {
  PushNotificationToggle,
  useWebPushContext,
} from '@aivo/ui-web/components/notifications';

export default function NotificationSettingsPage() {
  const { isSupported, permission, isSubscribed, error } = useWebPushContext();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [studentAlerts, setStudentAlerts] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Configure how and when you receive notifications about your students
          and classes.
        </p>
      </div>

      {/* Push Notifications Section */}
      <section className="mb-8 rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Push Notifications</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Receive instant notifications in your browser, even when the app is
          closed.
        </p>

        <PushNotificationToggle
          label="Enable Push Notifications"
          description={
            permission === 'denied'
              ? 'Push notifications are blocked. Please enable them in your browser settings.'
              : 'Get notified about important student activity instantly'
          }
          className="mb-4"
        />

        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error.message}
          </div>
        )}

        {!isSupported && (
          <div className="mt-4 rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-700">
            Your browser does not support push notifications. Try using a modern
            browser like Chrome, Firefox, or Edge.
          </div>
        )}
      </section>

      {/* Alert Types Section */}
      <section className="mb-8 rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Alert Types</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Choose which types of alerts you want to receive.
        </p>

        <div className="space-y-4">
          <ToggleSetting
            label="Student Alerts"
            description="When a student needs attention (struggling, disengaged, etc.)"
            checked={studentAlerts}
            onChange={setStudentAlerts}
          />

          <ToggleSetting
            label="Session Reminders"
            description="Reminders before scheduled class sessions"
            checked={sessionReminders}
            onChange={setSessionReminders}
          />

          <ToggleSetting
            label="Assignment Submissions"
            description="When students submit assignments or assessments"
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
        </div>
      </section>

      {/* Email Preferences Section */}
      <section className="mb-8 rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Email Preferences</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Configure email notification preferences.
        </p>

        <div className="space-y-4">
          <ToggleSetting
            label="Email Notifications"
            description="Receive notifications via email"
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />

          <ToggleSetting
            label="Weekly Progress Digest"
            description="Get a weekly summary of student progress every Monday"
            checked={weeklyDigest}
            onChange={setWeeklyDigest}
          />
        </div>
      </section>

      {/* Status Info */}
      <section className="rounded-lg border bg-muted/50 p-4">
        <h3 className="mb-2 text-sm font-medium">Current Status</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            Browser Support:{' '}
            <span className={isSupported ? 'text-green-600' : 'text-red-600'}>
              {isSupported ? 'Supported' : 'Not Supported'}
            </span>
          </li>
          <li>
            Permission:{' '}
            <span
              className={
                permission === 'granted'
                  ? 'text-green-600'
                  : permission === 'denied'
                    ? 'text-red-600'
                    : 'text-yellow-600'
              }
            >
              {permission.charAt(0).toUpperCase() + permission.slice(1)}
            </span>
          </li>
          <li>
            Push Notifications:{' '}
            <span className={isSubscribed ? 'text-green-600' : 'text-muted-foreground'}>
              {isSubscribed ? 'Active' : 'Inactive'}
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

interface ToggleSettingProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          checked ? 'bg-primary' : 'bg-gray-200'
        }`}
      >
        <span className="sr-only">Toggle {label}</span>
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
