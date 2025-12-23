/**
 * Settings Page
 */

'use client';

import * as React from 'react';

import { PageHeader, Tabs } from '@/components/layout/breadcrumb';

const tabs = [
  { id: 'profile', label: 'Profile', href: '/settings' },
  { id: 'grading', label: 'Grading', href: '/settings?tab=grading' },
  { id: 'notifications', label: 'Notifications', href: '/settings?tab=notifications' },
  { id: 'integrations', label: 'Integrations', href: '/settings?tab=integrations' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState('profile');

  return (
    <div>
      <PageHeader title="Settings" description="Manage your preferences" />
      <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'grading' && <GradingSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'integrations' && <IntegrationSettings />}
      </div>
    </div>
  );
}

function ProfileSettings() {
  return (
    <div className="max-w-2xl rounded-xl border bg-white p-6">
      <h3 className="font-semibold text-gray-900">Profile Information</h3>
      <form className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              defaultValue="Jane"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              defaultValue="Teacher"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            defaultValue="jane.teacher@school.edu"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          Save Changes
        </button>
      </form>
    </div>
  );
}

function GradingSettings() {
  return (
    <div className="max-w-2xl rounded-xl border bg-white p-6">
      <h3 className="font-semibold text-gray-900">Grading Preferences</h3>
      <form className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Grading Scale</label>
          <select className="mt-1 w-full rounded-lg border px-3 py-2">
            <option>Standard (A-F)</option>
            <option>Points-based</option>
            <option>Standards-based</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Late Work Policy</label>
          <select className="mt-1 w-full rounded-lg border px-3 py-2">
            <option>10% per day, max 50%</option>
            <option>No late work accepted</option>
            <option>Full credit always</option>
          </select>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked className="rounded" />
          <span className="text-sm text-gray-700">Drop lowest grade in each category</span>
        </label>
        <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          Save Preferences
        </button>
      </form>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="max-w-2xl rounded-xl border bg-white p-6">
      <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
      <div className="mt-4 space-y-3">
        {[
          ['New submissions', true],
          ['Missing assignments', true],
          ['Parent messages', true],
          ['At-risk student alerts', true],
          ['Weekly digest', false],
        ].map(([label, checked]) => (
          <label
            key={String(label)}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <span className="text-sm text-gray-700">{label}</span>
            <input type="checkbox" defaultChecked={checked as boolean} className="rounded" />
          </label>
        ))}
      </div>
    </div>
  );
}

function IntegrationSettings() {
  return (
    <div className="max-w-2xl rounded-xl border bg-white p-6">
      <h3 className="font-semibold text-gray-900">Connected Integrations</h3>
      <div className="mt-4 space-y-3">
        {[
          { name: 'Google Classroom', connected: true },
          { name: 'Canvas LMS', connected: false },
          { name: 'Microsoft Teams', connected: true },
          { name: 'Clever', connected: false },
        ].map((integration) => (
          <div
            key={integration.name}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <span className="font-medium text-gray-900">{integration.name}</span>
            <button
              className={`rounded-lg px-4 py-1.5 text-sm ${
                integration.connected
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }`}
            >
              {integration.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
