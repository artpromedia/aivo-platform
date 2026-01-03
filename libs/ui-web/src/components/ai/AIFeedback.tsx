'use client';

import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../../utils/cn';
import { Button } from '../button';
import { Card } from '../card';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface AIFeedbackProps {
  /** The student's submission to get feedback on */
  submission: string;
  /** Type of submission */
  submissionType: 'essay' | 'shortAnswer' | 'code' | 'other';
  /** Assignment context */
  assignmentContext?: string;
  /** Grading rubric */
  rubric?: RubricCriteria[];
  /** Student grade level */
  gradeLevel: string;
  /** Subject area */
  subject: string;
  /** API endpoint */
  apiEndpoint?: string;
  /** Callback when feedback is received */
  onFeedbackReceived?: (feedback: GeneratedFeedback) => void;
  /** Additional class names */
  className?: string;
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
}

interface RubricCriteria {
  criterion: string;
  description: string;
  maxPoints: number;
}

interface GeneratedFeedback {
  overallScore: number;
  maxScore: number;
  rubricScores: Record<string, { score: number; maxScore: number; feedback: string }>;
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  suggestions: string[];
  grammarScore?: number;
  structureScore?: number;
  contentScore?: number;
  needsReview: boolean;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    latencyMs?: number;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function AIFeedback({
  submission,
  submissionType,
  assignmentContext,
  rubric,
  gradeLevel,
  subject,
  apiEndpoint = '/api/ai/generation/feedback',
  onFeedbackReceived,
  className,
  autoFetch = false,
}: AIFeedbackProps) {
  // State
  const [feedback, setFeedback] = useState<GeneratedFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'suggestions'>('overview');

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission,
          submissionType,
          assignmentContext,
          rubric,
          gradeLevel,
          subject,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get feedback');
      }

      const data = await response.json();
      const generatedFeedback = data.feedback as GeneratedFeedback;

      setFeedback(generatedFeedback);
      onFeedbackReceived?.(generatedFeedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate feedback');
    } finally {
      setIsLoading(false);
    }
  }, [
    apiEndpoint,
    submission,
    submissionType,
    assignmentContext,
    rubric,
    gradeLevel,
    subject,
    onFeedbackReceived,
  ]);

  // Auto-fetch on mount if enabled
  useState(() => {
    if (autoFetch) {
      void fetchFeedback();
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <Card
      className={cn('max-w-2xl', className)}
      title={
        <div className="flex items-center gap-2">
          <FeedbackIcon className="h-5 w-5 text-primary" />
          <span>AI Feedback</span>
        </div>
      }
      subtitle={subject ? `${subject} • ${gradeLevel}` : undefined}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-muted">Analyzing your submission...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <div className="flex items-center gap-2">
              <ErrorIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
          <Button variant="secondary" onClick={fetchFeedback}>
            Try Again
          </Button>
        </div>
      )}

      {/* Initial State */}
      {!isLoading && !error && !feedback && (
        <div className="space-y-4">
          {/* Submission Preview */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Your Submission</label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface-muted p-3 text-sm text-muted">
              {submission.length > 500 ? `${submission.slice(0, 500)}...` : submission}
            </div>
          </div>

          {/* Rubric Preview */}
          {rubric && rubric.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-text">Grading Rubric</label>
              <div className="space-y-2">
                {rubric.map((criteria, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border p-2 text-sm"
                  >
                    <span className="text-text">{criteria.criterion}</span>
                    <span className="text-muted">{criteria.maxPoints} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Get Feedback Button */}
          <Button variant="primary" size="lg" onClick={fetchFeedback} className="w-full">
            <SparklesIcon className="h-5 w-5" />
            Get AI Feedback
          </Button>
        </div>
      )}

      {/* Feedback Display */}
      {feedback && (
        <div className="space-y-6">
          {/* Score Card */}
          <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 p-4">
            <div>
              <div className="text-sm text-muted">Overall Score</div>
              <div className="text-3xl font-bold text-primary">
                {feedback.overallScore}
                <span className="text-lg text-muted">/{feedback.maxScore}</span>
              </div>
            </div>
            <ScoreRing
              score={feedback.overallScore}
              maxScore={feedback.maxScore}
            />
          </div>

          {/* Needs Review Warning */}
          {feedback.needsReview && (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
              <WarningIcon className="h-5 w-5" />
              <span>This feedback has been flagged for teacher review.</span>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-border">
            <div className="flex">
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
                Overview
              </TabButton>
              <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')}>
                Details
              </TabButton>
              <TabButton
                active={activeTab === 'suggestions'}
                onClick={() => setActiveTab('suggestions')}
              >
                Suggestions
              </TabButton>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Overall Feedback */}
              <div>
                <h4 className="mb-2 font-medium text-text">Feedback Summary</h4>
                <p className="text-sm text-muted">{feedback.overallFeedback}</p>
              </div>

              {/* Strengths */}
              {feedback.strengths.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-medium text-green-600">
                    <CheckIcon className="h-4 w-4" />
                    Strengths
                  </h4>
                  <ul className="space-y-1 pl-6 text-sm text-muted">
                    {feedback.strengths.map((strength, i) => (
                      <li key={i} className="list-disc">
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas for Improvement */}
              {feedback.areasForImprovement.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-medium text-orange-600">
                    <ArrowUpIcon className="h-4 w-4" />
                    Areas for Improvement
                  </h4>
                  <ul className="space-y-1 pl-6 text-sm text-muted">
                    {feedback.areasForImprovement.map((area, i) => (
                      <li key={i} className="list-disc">
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Rubric Scores */}
              {Object.keys(feedback.rubricScores).length > 0 && (
                <div>
                  <h4 className="mb-3 font-medium text-text">Rubric Breakdown</h4>
                  <div className="space-y-3">
                    {Object.entries(feedback.rubricScores).map(([criterion, data]) => (
                      <RubricScoreCard
                        key={criterion}
                        criterion={criterion}
                        score={data.score}
                        maxScore={data.maxScore}
                        feedback={data.feedback}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quality Scores */}
              {(feedback.grammarScore !== undefined ||
                feedback.structureScore !== undefined ||
                feedback.contentScore !== undefined) && (
                <div>
                  <h4 className="mb-3 font-medium text-text">Quality Metrics</h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {feedback.grammarScore !== undefined && (
                      <QualityMetric label="Grammar" score={feedback.grammarScore} />
                    )}
                    {feedback.structureScore !== undefined && (
                      <QualityMetric label="Structure" score={feedback.structureScore} />
                    )}
                    {feedback.contentScore !== undefined && (
                      <QualityMetric label="Content" score={feedback.contentScore} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="space-y-4">
              <h4 className="font-medium text-text">How to Improve</h4>
              {feedback.suggestions.length > 0 ? (
                <div className="space-y-3">
                  {feedback.suggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {i + 1}
                      </div>
                      <p className="text-sm text-muted">{suggestion}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No specific suggestions at this time.</p>
              )}
            </div>
          )}

          {/* Metadata */}
          {feedback.metadata && (
            <div className="border-t border-border pt-4 text-xs text-muted">
              <span className="font-medium">AI Generated:</span> Model: {feedback.metadata.model} •
              Tokens: {feedback.metadata.tokensUsed} • Time: {feedback.metadata.latencyMs}ms
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={fetchFeedback}>
              Refresh Feedback
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
        active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text'
      )}
    >
      {children}
    </button>
  );
}

function ScoreRing({ score, maxScore }: { score: number; maxScore: number }) {
  const percentage = (score / maxScore) * 100;
  const strokeDasharray = `${percentage} ${100 - percentage}`;

  return (
    <div className="relative h-16 w-16">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-surface-muted"
        />
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="text-primary"
          style={{ strokeDashoffset: 0 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary">
        {Math.round(percentage)}%
      </div>
    </div>
  );
}

function RubricScoreCard({
  criterion,
  score,
  maxScore,
  feedback,
}: {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}) {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-text">{criterion}</span>
        <span className="text-sm text-muted">
          {score}/{maxScore}
        </span>
      </div>
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted">{feedback}</p>
    </div>
  );
}

function QualityMetric({ label, score }: { label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-600';
    if (s >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <div className={cn('text-2xl font-bold', getColor(score))}>{score}%</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ICONS
// ────────────────────────────────────────────────────────────────────────────

function FeedbackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M7 3a1 1 0 00-.707.293l-4 4a1 1 0 00.708 1.414l.999-.999V17a1 1 0 001 1h10a1 1 0 001-1V7.707l.999.999a1 1 0 001.414-1.414l-4-4A1 1 0 0013 3H7zM6 9h8v7H6V9z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
