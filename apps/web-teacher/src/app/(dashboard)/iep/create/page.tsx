/* cSpell:words ieps */
'use client';

export const dynamic = 'force-dynamic';

/**
 * AI IEP Goal Creator Page
 *
 * Allows teachers to select a student, describe present levels,
 * and use AI to generate personalized IEP goals.
 */

import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Check,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { useStudents } from '@/hooks/use-students';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface GeneratedGoal {
  id: string;
  domain: string;
  goalText: string;
  baseline: string;
  target: string;
  measurementMethod: string;
  timeline: string;
  editing?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const DISABILITY_CATEGORIES = [
  'Autism Spectrum Disorder',
  'Deaf-Blindness',
  'Emotional Disturbance',
  'Hearing Impairment',
  'Intellectual Disability',
  'Multiple Disabilities',
  'Orthopedic Impairment',
  'Other Health Impairment',
  'Specific Learning Disability',
  'Speech or Language Impairment',
  'Traumatic Brain Injury',
  'Visual Impairment',
];

const GOAL_DOMAINS = [
  { value: 'academic', label: 'Academic' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'social', label: 'Social/Emotional' },
  { value: 'functional', label: 'Functional Life Skills' },
  { value: 'communication', label: 'Communication' },
  { value: 'motor', label: 'Motor Skills' },
];

const GRADE_LEVELS = [
  'Pre-K',
  'Kindergarten',
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

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function IEPCreatePage() {
  const { students, loading: studentsLoading } = useStudents();

  // Form state
  const [selectedStudentId, setSelectedStudentId] = React.useState('');
  const [disabilityCategory, setDisabilityCategory] = React.useState('');
  const [presentLevel, setPresentLevel] = React.useState('');
  const [goalDomain, setGoalDomain] = React.useState('academic');
  const [gradeLevel, setGradeLevel] = React.useState('');

  // Generation state
  const [generating, setGenerating] = React.useState(false);
  const [generatedGoals, setGeneratedGoals] = React.useState<GeneratedGoal[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // Save state
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const canGenerate =
    selectedStudentId &&
    disabilityCategory &&
    presentLevel.trim().length >= 20 &&
    goalDomain &&
    gradeLevel;

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/iep-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          disabilityCategory,
          presentLevel,
          goalDomain,
          gradeLevel,
          studentName: selectedStudent?.name,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Failed to generate goals');
      }

      const data = (await res.json()) as { goals?: GeneratedGoal[] };
      const goals = (data.goals || []).map((g: GeneratedGoal, i: number) => ({
        ...g,
        id: g.id || `goal-${Date.now()}-${i}`,
      }));
      setGeneratedGoals(goals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditGoal = (goalId: string) => {
    setGeneratedGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, editing: !g.editing } : g))
    );
  };

  const handleUpdateGoalText = (goalId: string, text: string) => {
    setGeneratedGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, goalText: text } : g)));
  };

  const handleRemoveGoal = (goalId: string) => {
    setGeneratedGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleAddToIEP = async () => {
    if (generatedGoals.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/iep/ieps/${selectedStudentId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: generatedGoals }),
      });

      if (!res.ok) {
        throw new Error('Failed to save goals to IEP');
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb items={[{ label: 'IEP Manager', href: '/iep' }, { label: 'AI Goal Creator' }]} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/iep" className="flex items-center gap-1 text-sm text-muted hover:text-text">
          <ArrowLeft className="h-4 w-4" />
          Back to IEP Manager
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">AI IEP Goal Creator</h1>
          <p className="text-sm text-muted">
            Generate personalized, measurable IEP goals powered by AI
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: Form ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
            {/* Student Selector */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                }}
                disabled={studentsLoading}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Disability Category */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Disability Category
              </label>
              <select
                value={disabilityCategory}
                onChange={(e) => {
                  setDisabilityCategory(e.target.value);
                }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select category…</option>
                {DISABILITY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Level */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">Grade Level</label>
              <select
                value={gradeLevel}
                onChange={(e) => {
                  setGradeLevel(e.target.value);
                }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select grade…</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Goal Domain */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">Goal Domain</label>
              <div className="flex flex-wrap gap-2">
                {GOAL_DOMAINS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      setGoalDomain(d.value);
                    }}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                      goalDomain === d.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted hover:border-primary/50'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Present Level */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Present Level of Performance
              </label>
              <textarea
                value={presentLevel}
                onChange={(e) => {
                  setPresentLevel(e.target.value);
                }}
                placeholder="Describe the student's current abilities, strengths, and areas of need in this domain…"
                rows={5}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <p className="mt-1 text-xs text-muted">
                {presentLevel.length < 20
                  ? `At least ${20 - presentLevel.length} more characters needed`
                  : 'Sufficient detail for generation'}
              </p>
            </div>

            {/* Generate Button */}
            <Button
              onClick={() => void handleGenerate()}
              disabled={!canGenerate || generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Goals…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Goals
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Right: Generated Goals Preview ── */}
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{error}</p>
              <button
                onClick={() => void handleGenerate()}
                className="ml-auto text-red-600 underline hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <Check className="h-4 w-4" />
              Goals added to IEP successfully!
            </div>
          )}

          {generatedGoals.length === 0 && !generating && !error && (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-muted/40" />
              <h3 className="mt-4 font-medium text-text">No goals generated yet</h3>
              <p className="mt-1 text-sm text-muted">
                Fill out the form and click &quot;Generate Goals&quot; to get AI-powered IEP goal
                suggestions.
              </p>
            </div>
          )}

          {generating && (
            <div className="rounded-xl border border-border bg-surface p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted">
                Generating personalized goals for {selectedStudent?.name || 'the student'}…
              </p>
            </div>
          )}

          {generatedGoals.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text">
                  Generated Goals ({generatedGoals.length})
                </h2>
                <Button onClick={() => void handleAddToIEP()} disabled={saving} variant="default">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add to IEP
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-3">
                {generatedGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="rounded-lg border border-border bg-surface p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {goal.domain}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            handleEditGoal(goal.id);
                          }}
                          className="rounded p-1 text-muted hover:bg-surface-muted hover:text-text"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            handleRemoveGoal(goal.id);
                          }}
                          className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {goal.editing ? (
                      <textarea
                        value={goal.goalText}
                        onChange={(e) => {
                          handleUpdateGoalText(goal.id, e.target.value);
                        }}
                        rows={3}
                        className="w-full rounded border border-border bg-surface-muted px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                    ) : (
                      <p className="text-sm text-text">{goal.goalText}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                      <div>
                        <span className="font-medium">Baseline:</span> {goal.baseline}
                      </div>
                      <div>
                        <span className="font-medium">Target:</span> {goal.target}
                      </div>
                      <div>
                        <span className="font-medium">Measurement:</span> {goal.measurementMethod}
                      </div>
                      <div>
                        <span className="font-medium">Timeline:</span> {goal.timeline}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
