'use client';

import { Badge, Button, Card } from '@aivo/ui-web';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import {
  getIngestionJobs,
  getIngestionJob,
  cancelIngestionJob,
  ingestManual,
  createAiDraft,
  type IngestionJob,
  type IngestionJobsResponse,
} from '../lib/authoring-api';
import { useToast } from '../lib/toast';
import { SUBJECT_LABELS, GRADE_BAND_LABELS, type Subject, type GradeBand } from '../lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

type IngestionSource = 'MANUAL' | 'FILE_CSV' | 'FILE_JSON' | 'AI_DRAFT';
type IngestionStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

const SOURCE_LABELS: Record<IngestionSource, string> = {
  MANUAL: 'Manual Import',
  FILE_CSV: 'CSV File',
  FILE_JSON: 'JSON File',
  AI_DRAFT: 'AI Draft',
};

const STATUS_LABELS: Record<IngestionStatus, string> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

const STATUS_TONES: Record<IngestionStatus, 'neutral' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDING: 'neutral',
  RUNNING: 'info',
  SUCCEEDED: 'success',
  FAILED: 'error',
  CANCELLED: 'warning',
};

const SUBJECTS: Subject[] = ['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER'];
const GRADE_BANDS: GradeBand[] = ['K_2', 'G3_5', 'G6_8', 'G9_12'];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function IngestionJobs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();

  const [jobs, setJobs] = useState<IngestionJobsResponse['jobs']>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Dialog states
  const [showAiDraftDialog, setShowAiDraftDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);

  // Filters from URL params
  const statusFilter = searchParams.get('status') as IngestionStatus | null;
  const sourceFilter = searchParams.get('source') as IngestionSource | null;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 20;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getIngestionJobs({
        status: statusFilter ?? undefined,
        source: sourceFilter ?? undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setJobs(result.jobs);
      setTotal(result.pagination.total);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to load ingestion jobs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, page, addToast]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const handleViewJob = async (jobId: string) => {
    try {
      const job = await getIngestionJob(jobId);
      setSelectedJob(job);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to load job details');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelIngestionJob(jobId);
      addToast('success', 'Job cancelled');
      void fetchJobs();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to cancel job');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Content Ingestion</h1>
          <p className="mt-1 text-sm text-muted">
            Import and track content ingestion jobs ({total} jobs)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowAiDraftDialog(true)}>
            AI Draft
          </Button>
          <Button onClick={() => router.push('/ingest/new')}>New Import</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <FilterSelect
            label="Status"
            value={statusFilter || ''}
            options={[
              { value: '', label: 'All Statuses' },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            paramName="status"
          />
          <FilterSelect
            label="Source"
            value={sourceFilter || ''}
            options={[
              { value: '', label: 'All Sources' },
              ...Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            paramName="source"
          />
          <Button variant="secondary" size="sm" onClick={() => void fetchJobs()}>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Jobs List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-lg text-muted">No ingestion jobs found</p>
            <p className="mt-2 text-sm text-muted">
              Create a new import or AI draft to get started.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onView={() => void handleViewJob(job.id)}
              onCancel={() => void handleCancelJob(job.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', String(page - 1));
              router.push(`?${params.toString()}`);
            }}
          >
            Previous
          </Button>
          <span className="px-4 text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', String(page + 1));
              router.push(`?${params.toString()}`);
            }}
          >
            Next
          </Button>
        </div>
      )}

      {/* AI Draft Dialog */}
      {showAiDraftDialog && (
        <AiDraftDialog
          onClose={() => setShowAiDraftDialog(false)}
          onSuccess={() => {
            setShowAiDraftDialog(false);
            void fetchJobs();
          }}
        />
      )}

      {/* Job Details Dialog */}
      {selectedJob && (
        <JobDetailsDialog job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

interface JobCardProps {
  job: IngestionJobsResponse['jobs'][0];
  onView: () => void;
  onCancel: () => void;
}

function JobCard({ job, onView, onCancel }: JobCardProps) {
  const createdDate = new Date(job.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const canCancel = job.status === 'PENDING' || job.status === 'RUNNING';

  return (
    <Card className="transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-medium text-text">
              {SOURCE_LABELS[job.source as IngestionSource]}
            </span>
            <Badge tone={STATUS_TONES[job.status as IngestionStatus]}>
              {STATUS_LABELS[job.status as IngestionStatus]}
            </Badge>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted">
            <span>{createdDate}</span>
            {job.totalRows != null && (
              <>
                <span>•</span>
                <span>
                  {job.successCount}/{job.totalRows} items
                </span>
              </>
            )}
            {job.errorCount > 0 && (
              <>
                <span>•</span>
                <span className="text-error">{job.errorCount} errors</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onView}>
            Details
          </Button>
          {canCancel && (
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  paramName: string;
}

function FilterSelect({ label, value, options, paramName }: FilterSelectProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleChange = (newValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newValue) {
      params.set(paramName, newValue);
    } else {
      params.delete(paramName);
    }
    params.delete('page');
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-text">{label}:</label>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface AiDraftDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AiDraftDialog({ onClose, onSuccess }: AiDraftDialogProps) {
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [subject, setSubject] = useState<Subject>('ELA');
  const [gradeBand, setGradeBand] = useState<GradeBand>('G3_5');
  const [contentType, setContentType] = useState<'reading_passage' | 'math_problem' | 'quiz' | 'generic'>('reading_passage');
  const [promptSummary, setPromptSummary] = useState('');
  const [difficulty, setDifficulty] = useState(5);

  const handleSubmit = async () => {
    if (!promptSummary.trim()) {
      addToast('error', 'Please describe what content you want to create');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createAiDraft({
        subject,
        gradeBand,
        contentType,
        promptSummary: promptSummary.trim(),
        difficulty,
      });
      addToast('success', 'AI draft created! Please review and edit before publishing.');
      if (result.warning) {
        addToast('warning', result.warning);
      }
      onSuccess();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to create AI draft');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-text">Create AI Draft</h2>
        <p className="mt-1 text-sm text-muted">
          Describe the content you want and AI will generate a draft for you to review.
        </p>

        <div className="mt-6 space-y-4">
          {/* Subject & Grade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {SUBJECT_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text">Grade Band</label>
              <select
                value={gradeBand}
                onChange={(e) => setGradeBand(e.target.value as GradeBand)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {GRADE_BANDS.map((g) => (
                  <option key={g} value={g}>
                    {GRADE_BAND_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content Type */}
          <div>
            <label className="text-sm font-medium text-text">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as typeof contentType)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="reading_passage">Reading Passage</option>
              <option value="math_problem">Math Problem</option>
              <option value="quiz">Quiz</option>
              <option value="generic">Generic</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-sm font-medium text-text">
              Difficulty: {difficulty}/10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </div>

          {/* Prompt */}
          <div>
            <label className="text-sm font-medium text-text">
              Describe the content <span className="text-error">*</span>
            </label>
            <textarea
              value={promptSummary}
              onChange={(e) => setPromptSummary(e.target.value)}
              placeholder="E.g., A reading passage about the water cycle with comprehension questions about evaporation and precipitation..."
              rows={4}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Draft'}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface JobDetailsDialogProps {
  job: IngestionJob;
  onClose: () => void;
}

function JobDetailsDialog({ job, onClose }: JobDetailsDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />

      <div className="relative z-10 max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-text">Job Details</h2>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted">Job ID:</span>
              <span className="ml-2 font-mono text-text">{job.id}</span>
            </div>
            <div>
              <span className="text-muted">Source:</span>
              <span className="ml-2 text-text">
                {SOURCE_LABELS[job.source as IngestionSource]}
              </span>
            </div>
            <div>
              <span className="text-muted">Status:</span>
              <Badge
                className="ml-2"
                tone={STATUS_TONES[job.status as IngestionStatus]}
              >
                {STATUS_LABELS[job.status as IngestionStatus]}
              </Badge>
            </div>
            <div>
              <span className="text-muted">Created:</span>
              <span className="ml-2 text-text">
                {new Date(job.createdAt).toLocaleString()}
              </span>
            </div>
            {job.startedAt && (
              <div>
                <span className="text-muted">Started:</span>
                <span className="ml-2 text-text">
                  {new Date(job.startedAt).toLocaleString()}
                </span>
              </div>
            )}
            {job.completedAt && (
              <div>
                <span className="text-muted">Completed:</span>
                <span className="ml-2 text-text">
                  {new Date(job.completedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Progress */}
          {job.totalRows != null && (
            <div>
              <h3 className="font-medium text-text">Progress</h3>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="text-success">✓ {job.successCount} succeeded</span>
                <span className="text-error">✗ {job.errorCount} failed</span>
                <span className="text-muted">of {job.totalRows} total</span>
              </div>
            </div>
          )}

          {/* Created LOs */}
          {job.createdLoIds.length > 0 && (
            <div>
              <h3 className="font-medium text-text">Created Learning Objects</h3>
              <div className="mt-2 max-h-32 overflow-auto rounded-lg bg-surface-muted p-2 text-xs font-mono">
                {job.createdLoIds.join('\n')}
              </div>
            </div>
          )}

          {/* Errors */}
          {job.errors.length > 0 && (
            <div>
              <h3 className="font-medium text-error">Errors</h3>
              <div className="mt-2 max-h-48 space-y-2 overflow-auto">
                {job.errors.map((err, i) => (
                  <div key={i} className="rounded-lg bg-error/10 p-2 text-sm">
                    {err.slug && (
                      <span className="font-medium">Row {err.row} ({err.slug}): </span>
                    )}
                    {err.errors?.map((e, j) => (
                      <span key={j} className="text-error">
                        {e.field}: {e.message}
                        {j < (err.errors?.length ?? 0) - 1 ? ', ' : ''}
                      </span>
                    ))}
                    {!err.errors && <span className="text-error">{JSON.stringify(err)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
