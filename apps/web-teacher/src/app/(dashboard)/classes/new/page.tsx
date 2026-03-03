/**
 * New Class Page
 *
 * Form to create a new class/section with name, subject, grade level,
 * period, room, schedule, and academic year.
 */

'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { classesApi } from '@/lib/api';
import type { CreateClassDto, ClassSchedule } from '@/lib/types/class';

/* ─── constants ───────────────────────────────────────────────────────── */

const SUBJECT_OPTIONS = [
  'Math',
  'Reading',
  'Science',
  'Social Studies',
  'English Language Arts',
  'Writing',
  'Art',
  'Music',
  'Physical Education',
  'World Languages',
  'Computer Science',
  'Other',
];

const GRADE_OPTIONS = [
  'Pre-K',
  'K',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

const TERM_OPTIONS = ['Fall', 'Spring', 'Summer', 'Full Year'];

const DAY_OPTIONS: { label: string; value: ClassSchedule['days'][number] }[] = [
  { label: 'Mon', value: 'monday' },
  { label: 'Tue', value: 'tuesday' },
  { label: 'Wed', value: 'wednesday' },
  { label: 'Thu', value: 'thursday' },
  { label: 'Fri', value: 'friday' },
];

/* ─── form state ──────────────────────────────────────────────────────── */

interface ClassForm {
  name: string;
  code: string;
  subject: string;
  gradeLevel: string;
  section: string;
  period: string;
  room: string;
  academicYear: string;
  term: string;
  scheduleDays: ClassSchedule['days'][number][];
  startTime: string;
  endTime: string;
}

const currentYear = new Date().getFullYear();
const INITIAL: ClassForm = {
  name: '',
  code: '',
  subject: '',
  gradeLevel: '',
  section: '',
  period: '',
  room: '',
  academicYear: `${currentYear}-${currentYear + 1}`,
  term: 'Full Year',
  scheduleDays: [],
  startTime: '08:00',
  endTime: '08:50',
};

/* ─── component ───────────────────────────────────────────────────────── */

export default function NewClassPage() {
  const router = useRouter();
  const [form, setForm] = React.useState<ClassForm>(INITIAL);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = <K extends keyof ClassForm>(field: K, value: ClassForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day: ClassSchedule['days'][number]) => {
    setForm((prev) => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter((d) => d !== day)
        : [...prev.scheduleDays, day],
    }));
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Class name is required.');
      return;
    }
    if (!form.subject) {
      setError('Subject is required.');
      return;
    }
    if (!form.gradeLevel) {
      setError('Grade level is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: CreateClassDto = {
        name: form.name.trim(),
        subject: form.subject,
        gradeLevel: form.gradeLevel,
        academicYear: form.academicYear,
        term: form.term,
        ...(form.code.trim() && { code: form.code.trim() }),
        ...(form.section.trim() && { section: form.section.trim() }),
        ...(form.period && { period: Number(form.period) }),
        ...(form.room.trim() && { room: form.room.trim() }),
        ...(form.scheduleDays.length > 0 && {
          schedule: {
            days: form.scheduleDays,
            startTime: form.startTime,
            endTime: form.endTime,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      };

      await classesApi.create(data);
      router.push('/classes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class');
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Class" description="Create a new class for your roster" />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 rounded-xl border bg-white p-6">
        {/* ── Basic Info ─────────────────────────────────────────────── */}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Basic Information
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Class Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => { set('name', e.target.value); }}
              placeholder="e.g. Algebra I — Period 3"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              value={form.subject}
              onChange={(e) => { set('subject', e.target.value); }}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              required
            >
              <option value="">Select subject…</option>
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Grade Level <span className="text-red-500">*</span>
            </label>
            <select
              value={form.gradeLevel}
              onChange={(e) => { set('gradeLevel', e.target.value); }}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              required
            >
              <option value="">Select grade…</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Class Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Class Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => { set('code', e.target.value); }}
              placeholder="e.g. ALG-1-P3"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Section</label>
            <input
              type="text"
              value={form.section}
              onChange={(e) => { set('section', e.target.value); }}
              placeholder="e.g. A"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* ── Schedule ───────────────────────────────────────────────── */}
        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Schedule
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Period</label>
            <input
              type="number"
              min={1}
              max={12}
              value={form.period}
              onChange={(e) => { set('period', e.target.value); }}
              placeholder="e.g. 3"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Room */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Room</label>
            <input
              type="text"
              value={form.room}
              onChange={(e) => { set('room', e.target.value); }}
              placeholder="e.g. 204B"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Days */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Days</label>
            <div className="mt-2 flex gap-2">
              {DAY_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { toggleDay(value); }}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    form.scheduleDays.includes(value)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Start / End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => { set('startTime', e.target.value); }}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Time</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => { set('endTime', e.target.value); }}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* ── Term ───────────────────────────────────────────────────── */}
        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Academic Year
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Academic Year <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.academicYear}
              onChange={(e) => { set('academicYear', e.target.value); }}
              placeholder="e.g. 2025-2026"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          {/* Term */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Term <span className="text-red-500">*</span>
            </label>
            <select
              value={form.term}
              onChange={(e) => { set('term', e.target.value); }}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              required
            >
              {TERM_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────── */}
        <div className="mt-8 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create Class'}
          </button>
          <button
            type="button"
            onClick={() => { router.back(); }}
            className="rounded-lg border px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
