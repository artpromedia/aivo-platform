/**
 * New Lesson Page
 *
 * Form to create a new lesson plan with title, subject, grade level,
 * duration, objectives, and standards alignment.
 * Includes a stub "Generate with AI" button for future AI-powered generation.
 */

'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useAccessToken } from '@/hooks';
import { createLesson } from '@/lib/api/lessons';
import type { LessonActivity } from '@/lib/api/lessons';

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
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
];

/* ─── form state ──────────────────────────────────────────────────────── */

interface LessonForm {
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  duration: string;
  objectives: string[];
  standards: string[];
  newObjective: string;
  newStandard: string;
}

const INITIAL: LessonForm = {
  title: '',
  description: '',
  subject: '',
  gradeLevel: '',
  duration: '45',
  objectives: [],
  standards: [],
  newObjective: '',
  newStandard: '',
};

/* ─── component ───────────────────────────────────────────────────────── */

export default function NewLessonPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAccessToken();
  const [form, setForm] = React.useState<LessonForm>(INITIAL);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = <K extends keyof LessonForm>(field: K, value: LessonForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ── list helpers ─────────────────────────────────────────────────── */

  const addObjective = () => {
    const text = form.newObjective.trim();
    if (!text) return;
    set('objectives', [...form.objectives, text]);
    set('newObjective', '');
  };

  const removeObjective = (index: number) => {
    set(
      'objectives',
      form.objectives.filter((_, i) => i !== index),
    );
  };

  const addStandard = () => {
    const text = form.newStandard.trim();
    if (!text) return;
    set('standards', [...form.standards, text]);
    set('newStandard', '');
  };

  const removeStandard = (index: number) => {
    set(
      'standards',
      form.standards.filter((_, i) => i !== index),
    );
  };

  /* ── submit ───────────────────────────────────────────────────────── */

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Lesson title is required.');
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
    if (!accessToken) {
      setError('Not authenticated. Please log in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activities: LessonActivity[] = [];

      await createLesson(
        {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          subject: form.subject,
          gradeLevel: form.gradeLevel,
          duration: Number(form.duration) || 45,
          objectives: form.objectives,
          standards: form.standards.length > 0 ? form.standards : undefined,
          activities,
          status: 'draft',
          hasAdaptiveContent: false,
        },
        accessToken,
      );

      router.push('/lessons');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lesson');
      setLoading(false);
    }
  };

  /* ── AI stub ──────────────────────────────────────────────────────── */

  const handleGenerateWithAI = () => {
    // Stub — future AI-powered lesson generation
    alert('AI lesson generation coming soon! This feature is under development.');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New Lesson"
        description="Create a new lesson plan"
        actions={
          <button
            type="button"
            onClick={handleGenerateWithAI}
            className="flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
          >
            <span>✨</span> Generate with AI
          </button>
        }
      />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 rounded-xl border bg-white p-6">
        {/* ── Basic Info ─────────────────────────────────────────────── */}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Lesson Details
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {/* Title */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => { set('title', e.target.value); }}
              placeholder="e.g. Introduction to Fractions"
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

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
            <input
              type="number"
              min={5}
              max={180}
              value={form.duration}
              onChange={(e) => { set('duration', e.target.value); }}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => { set('description', e.target.value); }}
              rows={3}
              placeholder="Brief overview of the lesson…"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* ── Objectives ─────────────────────────────────────────────── */}
        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Learning Objectives
        </h3>
        <div className="mt-4">
          {form.objectives.length > 0 && (
            <ul className="mb-3 space-y-2">
              {form.objectives.map((obj, i) => (
                <li
                  key={`obj-${obj}`}
                  className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="flex-1">{obj}</span>
                  <button
                    type="button"
                    onClick={() => { removeObjective(i); }}
                    className="text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={form.newObjective}
              onChange={(e) => { set('newObjective', e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addObjective();
                }
              }}
              placeholder="Add a learning objective…"
              className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={addObjective}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Add
            </button>
          </div>
        </div>

        {/* ── Standards ──────────────────────────────────────────────── */}
        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Standards Alignment
        </h3>
        <div className="mt-4">
          {form.standards.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {form.standards.map((std, i) => (
                <span
                  key={`std-${std}`}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                >
                  {std}
                  <button
                    type="button"
                    onClick={() => { removeStandard(i); }}
                    className="ml-1 text-blue-400 hover:text-blue-600"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={form.newStandard}
              onChange={(e) => { set('newStandard', e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addStandard();
                }
              }}
              placeholder="e.g. CCSS.MATH.CONTENT.4.NF.A.1"
              className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={addStandard}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Add
            </button>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────── */}
        <div className="mt-8 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create Lesson'}
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
