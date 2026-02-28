'use client';

export const dynamic = 'force-dynamic';

/**
 * AI Assessment Creator Page
 *
 * Generate assessment questions using AI, preview them,
 * then open in the full Assessment Builder or publish directly.
 */

import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Trash2,
  GripVertical,
  Edit3,
  Check,
  AlertCircle,
  ExternalLink,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface GeneratedQuestion {
  id: string;
  questionText: string;
  type: 'multiple_choice' | 'short_answer' | 'true_false';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: string;
  editing?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const SUBJECTS = [
  'Mathematics', 'Science', 'English Language Arts', 'Social Studies',
  'History', 'Geography', 'Biology', 'Chemistry', 'Physics',
  'Computer Science', 'Art', 'Music', 'Health', 'Foreign Language',
];

const GRADE_LEVELS = [
  'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade',
  '5th Grade', '6th Grade', '7th Grade', '8th Grade',
  '9th Grade', '10th Grade', '11th Grade', '12th Grade',
];

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'true_false', label: 'True/False' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function AssessmentsAICreatePage() {
  const router = useRouter();

  // Form state
  const [subject, setSubject] = React.useState('');
  const [topic, setTopic] = React.useState('');
  const [gradeLevel, setGradeLevel] = React.useState('');
  const [questionCount, setQuestionCount] = React.useState(10);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(['multiple_choice']);
  const [difficulty, setDifficulty] = React.useState('medium');

  // Generation state
  const [generating, setGenerating] = React.useState(false);
  const [questions, setQuestions] = React.useState<GeneratedQuestion[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // Save state
  const [saving, setSaving] = React.useState(false);
  const [savedId, setSavedId] = React.useState<string | null>(null);

  const canGenerate = subject && topic.trim() && gradeLevel && selectedTypes.length > 0;

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          topic,
          gradeLevel,
          questionCount,
          questionTypes: selectedTypes,
          difficulty,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Failed to generate assessment');
      }

      const data = (await res.json()) as { questions?: GeneratedQuestion[] };
      const qs = (data.questions || []).map((q: GeneratedQuestion, i: number) => ({
        ...q,
        id: q.id || `q-${Date.now()}-${i}`,
      }));
      setQuestions(qs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditQuestion = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, editing: !q.editing } : q))
    );
  };

  const handleUpdateQuestion = (qId: string, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, questionText: text } : q))
    );
  };

  const handleRemoveQuestion = (qId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const handleOpenInBuilder = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${subject} - ${topic}`,
          subject,
          gradeLevel,
          questions,
          status: 'draft',
        }),
      });

      if (!res.ok) throw new Error('Failed to create assessment');
      const data = (await res.json()) as { id?: string; data?: { id?: string } };
      const id = data.id || data.data?.id;
      router.push(`/assessments/builder?id=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${subject} - ${topic}`,
          subject,
          gradeLevel,
          questions,
          status: 'published',
        }),
      });

      if (!res.ok) throw new Error('Failed to publish assessment');
      const data = (await res.json()) as { id?: string; data?: { id?: string } };
      setSavedId(data.id || data.data?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessments' },
          { label: 'AI Creator' },
        ]}
      />

      <div className="flex items-center gap-4">
        <Link
          href="/assessments"
          className="flex items-center gap-1 text-sm text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assessments
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">AI Quiz Builder</h1>
          <p className="text-sm text-muted">
            Generate assessment questions instantly with AI
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: Form ── */}
        <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select subject…</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Fractions and decimals"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Grade Level */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Grade Level</label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select grade…</option>
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Number of Questions: {questionCount}
            </label>
            <input
              type="range"
              min={3}
              max={30}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted">
              <span>3</span>
              <span>30</span>
            </div>
          </div>

          {/* Question Types */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Question Types</label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPES.map((qt) => (
                <button
                  key={qt.value}
                  type="button"
                  onClick={() => toggleType(qt.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                    selectedTypes.includes(qt.value)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted hover:border-primary/50'
                  )}
                >
                  {qt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Difficulty</label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifficulty(d.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                    difficulty === d.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted hover:border-primary/50'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
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
                Generating Questions…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Assessment
              </>
            )}
          </Button>
        </div>

        {/* ── Right: Generated Questions Preview ── */}
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

          {savedId && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <Check className="h-4 w-4" />
              Assessment published successfully!
              <Link href={`/assessments/${savedId}`} className="ml-auto underline">
                View
              </Link>
            </div>
          )}

          {questions.length === 0 && !generating && !error && (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-muted/40" />
              <h3 className="mt-4 font-medium text-text">No questions generated yet</h3>
              <p className="mt-1 text-sm text-muted">
                Configure your assessment and click &quot;Generate Assessment&quot; to get started.
              </p>
            </div>
          )}

          {generating && (
            <div className="rounded-xl border border-border bg-surface p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted">
                Generating {questionCount} questions for {subject}…
              </p>
            </div>
          )}

          {questions.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text">
                  Questions ({questions.length})
                </h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => void handleOpenInBuilder()}
                    disabled={saving}
                    variant="outline"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in Builder
                  </Button>
                  <Button
                    onClick={() => void handlePublish()}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Save &amp; Publish
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-lg border border-border bg-surface p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        <span className="rounded bg-surface-muted px-1.5 py-0.5 text-xs text-muted">
                          {q.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditQuestion(q.id)}
                          className="rounded p-1 text-muted hover:bg-surface-muted hover:text-text"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {q.editing ? (
                      <textarea
                        value={q.questionText}
                        onChange={(e) => handleUpdateQuestion(q.id, e.target.value)}
                        rows={2}
                        className="w-full rounded border border-border bg-surface-muted px-3 py-2 text-sm text-text focus:border-primary focus:outline-none resize-none"
                      />
                    ) : (
                      <p className="text-sm text-text">{q.questionText}</p>
                    )}

                    {q.options && q.options.length > 0 && (
                      <div className="ml-8 space-y-1">
                        {q.options.map((opt, i) => (
                          <div
                            key={i}
                            className={cn(
                              'text-xs px-2 py-1 rounded',
                              opt === q.correctAnswer
                                ? 'bg-green-50 text-green-700 font-medium'
                                : 'text-muted'
                            )}
                          >
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.explanation && (
                      <p className="text-xs text-muted italic ml-8">
                        💡 {q.explanation}
                      </p>
                    )}
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
