/**
 * Profile Page
 *
 * Shows the current teacher's profile info with a link to edit in Settings.
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useTeacherProfile } from '@/hooks/use-teacher-settings';

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useTeacherProfile();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="My Profile" />
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="My Profile" />
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">Failed to load profile. Please try again later.</p>
        </div>
      </div>
    );
  }

  const initials =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
      : '?';

  return (
    <div>
      <PageHeader title="My Profile" description="View and manage your account details" />

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* Avatar + Name Card */}
        <div className="rounded-xl border bg-white p-6 text-center md:col-span-1">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-700">
            {initials}
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {profile?.firstName} {profile?.lastName}
          </h2>
          <p className="text-sm text-gray-500">{profile?.email ?? 'No email on file'}</p>
          <Link
            href="/settings?tab=profile"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Edit Profile
          </Link>
        </div>

        {/* Details Card */}
        <div className="rounded-xl border bg-white p-6 md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">First Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile?.firstName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile?.lastName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Department</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile?.department ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Title</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile?.title ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile?.phone ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Quick Links Card */}
        <div className="rounded-xl border bg-white p-6 md:col-span-3">
          <h3 className="text-lg font-semibold text-gray-900">Quick Links</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/settings?tab=profile"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit Profile
            </Link>
            <Link
              href="/settings?tab=notifications"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Notification Preferences
            </Link>
            <Link
              href="/settings?tab=grading"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Grading Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
