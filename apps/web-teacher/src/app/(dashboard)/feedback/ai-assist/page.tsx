'use client';

export const dynamic = 'force-dynamic';

/**
 * AI Feedback Assistant Page
 *
 * Select a student and assignment, view their submission,
 * then generate personalized AI feedback with tone control.
 */

import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Send,
  Copy,
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

interface Assignment {
  id: string;
  title: string;
  subject: string;
  score?: number;
  maxScore?: number;
  submittedAt?: string;
}

interface GeneratedFeedback {
  strengths: string[];
  areasForImprovement: string[];
  specificSuggestions: string[];
  encouragementNote: string;
  overallComment: string;
}

type FeedbackTone = 'encouraging' | 'constructive' | 'formal';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const TONES: { value: FeedbackTone; label: string; description: string }[] = [
  { value: 'encouraging', label: '🌟 Encouraging', description: 'Warm, positive, growth-focused' },
  { value: 'constructive', label: '🔧 Constructive', description: 'Direct, actionable, balanced' },
  { value: 'formal', label: '📋 Formal', description: 'Professional, objective, detailed' },
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function FeedbackAIAssistPage() {
  const { students, loading: studentsLoading } = useStudents();

  // Selection state
  const [selectedStudentId, setSelectedStudentId] = React.useState('');
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = React.useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState('');
  const [tone, setTone] = React.useState<FeedbackTone>('encouraging');

  // Generation state
  const [generating, setGenerating] = React.useState(false);
  const [feedback, setFeedback] = React.useState<GeneratedFeedback | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Action state
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);
  const canGenerate = selectedStudentId && selectedAssignmentId;

  // ══════════════════════════════════════════════════════════════════════════
  // Fetch assignments when student changes
  // ══════════════════════════════════════════════════════════════════════════

  React.useEffect(() => {
    if (!selectedStudentId) {
      setAssignments([]);
      setSelectedAssignmentId('');
      return;
    }

    const fetchAssignments = async () => {
      setLoadingAssignments(true);
      try {
        const res = await fetch(`/api/assignments?studentId=${selectedStudentId}`);
        if (res.ok) {
          const data = (await res.json()) as { data?: Assignment[]; assignments?: Assignment[] };
          setAssignments(data.data || data.assignments || []);
        }
      } catch {
        // silently handle — assignments will be empty
      } finally {
        setLoadingAssignments(false);
      }
    };

    void fetchAssignments();
  }, [selectedStudentId]);

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setError(null);
    setFeedback(null);
    setSent(false);

    try {
      const res = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          studentName: selectedStudent?.name,
          assignmentId: selectedAssignmentId,
          assignmentTitle: selectedAssignment?.title,
          subject: selectedAssignment?.subject,
          score: selectedAssignment?.score,
          maxScore: selectedAssignment?.maxScore,
          tone,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Failed to generate feedback');
      }

      const data = (await res.json()) as GeneratedFeedback;
      setFeedback(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const getFeedbackText = (): string => {
    if (!feedback) return '';
    const sections: string[] = [];
    if (feedback.overallComment) sections.push(feedback.overallComment);
    if (feedback.strengths.length > 0) {
      sections.push(`Strengths:\n${feedback.strengths.map((s) => `• ${s}`).join('\n')}`);
    }
    if (feedback.areasForImprovement.length > 0) {
      sections.push(`Areas for Improvement:\n${feedback.areasForImprovement.map((s) => `• ${s}`).join('\n')}`);
    }
    if (feedback.specificSuggestions.length > 0) {
      sections.push(`Suggestions:\n${feedback.specificSuggestions.map((s) => `• ${s}`).join('\n')}`);
    }
    if (feedback.encouragementNote) sections.push(feedback.encouragementNote);
    return sections.join('\n\n');
  };

  const handleCopy = async () => {
    const text = getFeedbackText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!feedback) return;
    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          assignmentId: selectedAssignmentId,
          feedbackText: getFeedbackText(),
          tone,
          aiGenerated: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to send feedback');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Feedback Assistant' },
        ]}
      />

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">AI Feedback Assistant</h1>
          <p className="text-sm text-muted">
            Generate personalized, thoughtful student feedback with AI
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: Selection & Config ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
            {/* Student Selector */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setSelectedAssignmentId('');
                  setFeedback(null);
                  setSent(false);
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

            {/* Assignment Selector */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">Assignment</label>
              <select
                value={selectedAssignmentId}
                onChange={(e) => {
                  setSelectedAssignmentId(e.target.value);
                  setFeedback(null);
                  setSent(false);
                }}
                disabled={!selectedStudentId || loadingAssignments}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">
                  {loadingAssignments ? 'Loading…' : 'Select an assignment…'}
                </option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                    {a.score != null && a.maxScore ? ` (${a.score}/${a.maxScore})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Submission Info */}
            {selectedAssignment && (
              <div className="rounded-lg bg-surface-muted p-4 space-y-1">
                <p className="text-sm font-medium text-text">{selectedAssignment.title}</p>
                {selectedAssignment.subject && (
                  <p className="text-xs text-muted">Subject: {selectedAssignment.subject}</p>
                )}
                {selectedAssignment.score != null && (
                  <p className="text-xs text-muted">
                    Score: {selectedAssignment.score}/{selectedAssignment.maxScore}
                  </p>
                )}
                {selectedAssignment.submittedAt && (
                  <p className="text-xs text-muted">
                    Submitted: {new Date(selectedAssignment.submittedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Tone Selector */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">Feedback Tone</label>
              <div className="space-y-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                      tone === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="text-lg">{t.label.split(' ')[0]}</span>
                    <div>
                      <p className="text-sm font-medium text-text">
                        {t.label.split(' ').slice(1).join(' ')}
                      </p>
                      <p className="text-xs text-muted">{t.description}</p>
                    </div>
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
                  Generating Feedback…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Feedback
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Right: Generated Feedback Preview ── */}
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

          {sent && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <Check className="h-4 w-4" />
              Feedback sent to {selectedStudent?.name || 'student'} successfully!
            </div>
          )}

          {!feedback && !generating && !error && (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-muted/40" />
              <h3 className="mt-4 font-medium text-text">No feedback generated yet</h3>
              <p className="mt-1 text-sm text-muted">
                Select a student and assignment, then click &quot;Generate Feedback&quot;.
              </p>
            </div>
          )}

          {generating && (
            <div className="rounded-xl border border-border bg-surface p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted">
                Generating feedback for {selectedStudent?.name || 'the student'}…
              </p>
            </div>
          )}

          {feedback && !generating && (
            <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
              {/* Action bar */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopy()}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleSend()}
                  disabled={sending || sent}
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Sending…
                    </>
                  ) : sent ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Sent
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Send to Student
                    </>
                  )}
                </Button>
              </div>

              {/* Overall Comment */}
              {feedback.overallComment && (
                <div>
                  <p className="text-sm text-text leading-relaxed">{feedback.overallComment}</p>
                </div>
              )}

              {/* Strengths */}
              {feedback.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-1.5">
                    <span className="text-green-500">✓</span> Strengths
                  </h3>
                  <ul className="space-y-1.5">
                    {feedback.strengths.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-text">
                        <span className="text-green-500 shrink-0">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas for Improvement */}
              {feedback.areasForImprovement.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-1.5">
                    <span className="text-amber-500">△</span> Areas for Improvement
                  </h3>
                  <ul className="space-y-1.5">
                    {feedback.areasForImprovement.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-text">
                        <span className="text-amber-500 shrink-0">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Specific Suggestions */}
              {feedback.specificSuggestions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-1.5">
                    <span className="text-blue-500">💡</span> Suggestions
                  </h3>
                  <ul className="space-y-1.5">
                    {feedback.specificSuggestions.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-text">
                        <span className="text-blue-500 shrink-0">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Encouragement */}
              {feedback.encouragementNote && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
                  <p className="text-sm text-text italic">{feedback.encouragementNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
