/**
 * Notification Settings Page for Parents
 *
 * Allows parents to configure push notification preferences.
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
  const [progressAlerts, setProgressAlerts] = useState(true);
  const [teacherMessages, setTeacherMessages] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [attendanceAlerts, setAttendanceAlerts] = useState(true);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure how and when you receive updates about your child&apos;s
          learning progress.
        </p>
      </div>

      {/* Push Notifications Section */}
      <section className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Push Notifications</h2>
        <p className="mb-4 text-sm text-gray-600">
          Receive instant updates in your browser, even when the app is closed.
        </p>

        <PushNotificationToggle
          label="Enable Push Notifications"
          description={
            permission === 'denied'
              ? 'Push notifications are blocked. Enable them in your browser settings.'
              : 'Get instant alerts about important updates'
          }
          className="mb-4"
        />

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error.message}
          </div>
        )}

        {!isSupported && (
          <div className="mt-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
            Your browser does not support push notifications. Try using a modern
            browser like Chrome, Firefox, or Edge.
          </div>
        )}
      </section>

      {/* Alert Types Section */}
      <section className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Alert Types</h2>
        <p className="mb-4 text-sm text-gray-600">
          Choose which updates you want to receive.
        </p>

        <div className="space-y-4">
          <ToggleSetting
            label="Progress Alerts"
            description="When your child completes lessons or achieves milestones"
            checked={progressAlerts}
            onChange={setProgressAlerts}
          />

          <ToggleSetting
            label="Teacher Messages"
            description="Direct messages and notes from teachers"
            checked={teacherMessages}
            onChange={setTeacherMessages}
          />

          <ToggleSetting
            label="Attendance Alerts"
            description="When your child is marked absent or tardy"
            checked={attendanceAlerts}
            onChange={setAttendanceAlerts}
          />
        </div>
      </section>

      {/* Email Preferences Section */}
      <section className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Email Preferences</h2>
        <p className="mb-4 text-sm text-gray-600">
          Configure email notification preferences.
        </p>

        <div className="space-y-4">
          <ToggleSetting
            label="Email Notifications"
            description="Receive important updates via email"
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />

          <ToggleSetting
            label="Weekly Progress Report"
            description="Get a summary of your child's progress every Sunday"
            checked={weeklyReport}
            onChange={setWeeklyReport}
          />
        </div>
      </section>

      {/* Status Info */}
      <section className="rounded-lg bg-gray-50 p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Current Status</h3>
        <ul className="space-y-1 text-sm text-gray-600">
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
            <span className={isSubscribed ? 'text-green-600' : 'text-gray-500'}>
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
        <p className="font-medium text-gray-800">{label}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
          checked ? 'bg-indigo-600' : 'bg-gray-200'
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
