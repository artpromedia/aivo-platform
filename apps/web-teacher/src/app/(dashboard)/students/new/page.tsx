/**
 * New Student (Enroll) Page
 *
 * Form to enroll a new student: name, email, grade, class, IEP status.
 */

'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useClasses } from '@/hooks';
import { studentsApi } from '@/lib/api';

/* ─── form state ──────────────────────────────────────────────────────── */

interface EnrollForm {
  firstName: string;
  lastName: string;
  email: string;
  gradeLevel: string;
  classId: string;
  hasIep: boolean;
  notes: string;
}

const INITIAL: EnrollForm = {
  firstName: '',
  lastName: '',
  email: '',
  gradeLevel: '',
  classId: '',
  hasIep: false,
  notes: '',
};

const GRADE_OPTIONS = [
  'Pre-K', 'K', '1', '2', '3', '4', '5',
  '6', '7', '8', '9', '10', '11', '12',
];

/* ─── component ───────────────────────────────────────────────────────── */

export default function NewStudentPage() {
  const router = useRouter();
  const { classes } = useClasses();
  const [form, setForm] = React.useState<EnrollForm>(INITIAL);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = (field: keyof EnrollForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (studentsApi as any).create?.({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        gradeLevel: form.gradeLevel || undefined,
        classId: form.classId || undefined,
        hasIep: form.hasIep,
        notes: form.notes || undefined,
      });
      router.push('/students');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll student');
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Enroll Student" description="Add a new student to your roster" />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 rounded-xl border bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="student@school.edu"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Grade Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Grade Level</label>
            <select
              value={form.gradeLevel}
              onChange={(e) => set('gradeLevel', e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select grade…</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Assign to Class</label>
            <select
              value={form.classId}
              onChange={(e) => set('classId', e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No class (add later)</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* IEP */}
          <div className="flex items-center gap-2 pt-6">
            <input
              id="hasIep"
              type="checkbox"
              checked={form.hasIep}
              onChange={(e) => set('hasIep', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="hasIep" className="text-sm font-medium text-gray-700">
              Student has an IEP
            </label>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder="Optional enrolment notes…"
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enrolling…' : 'Enroll Student'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
