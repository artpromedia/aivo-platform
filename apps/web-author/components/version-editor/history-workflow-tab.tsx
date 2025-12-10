'use client';

import { Badge, Button, Card } from '@aivo/ui-web';
import { formatDistanceToNow, format } from 'date-fns';
import { useState, useEffect } from 'react';

import { getVersionHistory } from '../../lib/authoring-api';
import { cn } from '../../lib/cn';
import { useToast } from '../../lib/toast';
import {
  VERSION_STATE_LABELS,
  VERSION_STATE_TONES,
  type LearningObjectVersion,
  type VersionState,
  type VersionTransition,
} from '../../lib/types';

interface HistoryWorkflowTabProps {
  loId: string;
  version: LearningObjectVersion;
  isAuthor: boolean;
  isReviewer: boolean;
  isAdmin: boolean;
  actionLoading: string | null;
  onWorkflowAction: (
    action: 'submit' | 'approve' | 'reject' | 'publish' | 'retire',
    reason?: string
  ) => Promise<void>;
}

export function HistoryWorkflowTab({
  loId,
  version,
  isAuthor,
  isReviewer,
  isAdmin,
  actionLoading,
  onWorkflowAction,
}: HistoryWorkflowTabProps) {
  const { addToast } = useToast();
  const [history, setHistory] = useState<VersionTransition[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const transitions = await getVersionHistory(loId, version.versionNumber);
        setHistory(transitions);
      } catch {
        // History endpoint might not exist yet
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    void fetchHistory();
  }, [loId, version.versionNumber]);

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      addToast('error', 'Please provide a reason for rejection');
      return;
    }
    await onWorkflowAction('reject', rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
  };

  const state = version.state;

  return (
    <div className="space-y-6">
      {/* Version Metadata */}
      <Card title="Version Information">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-muted">Version Number</dt>
            <dd className="mt-1 text-lg font-semibold text-text">{version.versionNumber}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted">State</dt>
            <dd className="mt-1">
              <Badge tone={VERSION_STATE_TONES[state]}>{VERSION_STATE_LABELS[state]}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted">Created By</dt>
            <dd className="mt-1 text-sm text-text">{version.createdByUserId}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted">Created</dt>
            <dd className="mt-1 text-sm text-text">{format(new Date(version.createdAt), 'PPp')}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted">Last Updated</dt>
            <dd className="mt-1 text-sm text-text">
              {formatDistanceToNow(new Date(version.updatedAt), { addSuffix: true })}
            </dd>
          </div>
          {version.publishedAt && (
            <div>
              <dt className="text-sm font-medium text-muted">Published</dt>
              <dd className="mt-1 text-sm text-text">
                {format(new Date(version.publishedAt), 'PPp')}
              </dd>
            </div>
          )}
          {version.retiredAt && (
            <div>
              <dt className="text-sm font-medium text-muted">Retired</dt>
              <dd className="mt-1 text-sm text-text">
                {format(new Date(version.retiredAt), 'PPp')}
              </dd>
            </div>
          )}
          {version.changeSummary && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted">Change Summary</dt>
              <dd className="mt-1 text-sm text-text">{version.changeSummary}</dd>
            </div>
          )}
          {version.reviewNotes && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted">Review Notes</dt>
              <dd className="mt-1 rounded-lg bg-warning/10 p-3 text-sm text-warning">
                {version.reviewNotes}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Workflow Actions */}
      <Card title="Workflow Actions">
        <div className="space-y-4">
          <WorkflowDiagram currentState={state} />

          <div className="border-t border-border pt-4">
            {state === 'DRAFT' && isAuthor && (
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => onWorkflowAction('submit')}
                  disabled={actionLoading === 'submit'}
                >
                  {actionLoading === 'submit' ? 'Submitting...' : 'Submit for Review'}
                </Button>
                <span className="text-sm text-muted">
                  Send this version to reviewers for approval.
                </span>
              </div>
            )}

            {state === 'IN_REVIEW' && isReviewer && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => onWorkflowAction('approve')}
                    disabled={actionLoading === 'approve'}
                  >
                    {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowRejectModal(true);
                    }}
                    disabled={actionLoading === 'reject'}
                  >
                    Send Back to Draft
                  </Button>
                </div>
                <p className="text-sm text-muted">
                  Review the content and either approve it or send it back for revisions.
                </p>
              </div>
            )}

            {state === 'APPROVED' && isAdmin && (
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => onWorkflowAction('publish')}
                  disabled={actionLoading === 'publish'}
                >
                  {actionLoading === 'publish' ? 'Publishing...' : 'Publish'}
                </Button>
                <span className="text-sm text-muted">Make this version available to learners.</span>
              </div>
            )}

            {state === 'PUBLISHED' && isAdmin && (
              <div className="flex items-center gap-4">
                <Button
                  variant="secondary"
                  onClick={() => onWorkflowAction('retire')}
                  disabled={actionLoading === 'retire'}
                >
                  {actionLoading === 'retire' ? 'Retiring...' : 'Retire'}
                </Button>
                <span className="text-sm text-muted">Remove this version from active use.</span>
              </div>
            )}

            {state === 'RETIRED' && (
              <p className="text-sm text-muted">
                This version has been retired and is no longer available to learners.
              </p>
            )}

            {/* No actions available message */}
            {((state === 'DRAFT' && !isAuthor) ||
              (state === 'IN_REVIEW' && !isReviewer) ||
              (state === 'APPROVED' && !isAdmin) ||
              (state === 'PUBLISHED' && !isAdmin)) && (
              <p className="text-sm text-muted">
                You don&apos;t have permission to perform actions at this workflow stage.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Transition History */}
      <Card title="Transition History">
        {loadingHistory ? (
          <div className="animate-pulse space-y-3">
            <div className="h-12 rounded bg-surface-muted" />
            <div className="h-12 rounded bg-surface-muted" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted">No transitions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((transition) => (
              <div
                key={transition.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge tone={VERSION_STATE_TONES[transition.fromState]} className="text-xs">
                    {VERSION_STATE_LABELS[transition.fromState]}
                  </Badge>
                  <svg
                    className="h-4 w-4 text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <Badge tone={VERSION_STATE_TONES[transition.toState]} className="text-xs">
                    {VERSION_STATE_LABELS[transition.toState]}
                  </Badge>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-text">by {transition.transitionedByUserId}</div>
                  <div className="text-xs text-muted">
                    {formatDistanceToNow(new Date(transition.transitionedAt), { addSuffix: true })}
                  </div>
                  {transition.reason && (
                    <p className="mt-1 text-sm italic text-muted">
                      &ldquo;{transition.reason}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text">Send Back to Draft</h3>
            <p className="mt-2 text-sm text-muted">
              Please provide feedback for the author explaining what needs to be revised.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
              }}
              rows={4}
              className="mt-4 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter your feedback..."
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRejectModal(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleReject} disabled={actionLoading === 'reject'}>
                {actionLoading === 'reject' ? 'Sending...' : 'Send Back'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowDiagram({ currentState }: { currentState: VersionState }) {
  const states: VersionState[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED'];
  const currentIndex = states.indexOf(currentState);

  return (
    <div className="flex items-center justify-between">
      {states.map((state, index) => {
        const isActive = state === currentState;
        const isPast = index < currentIndex;
        const isRetired = currentState === 'RETIRED';

        return (
          <div key={state} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium',
                  isActive && !isRetired && 'bg-primary text-on-accent',
                  isPast && !isRetired && 'bg-success/20 text-success',
                  !isActive && !isPast && !isRetired && 'bg-surface-muted text-muted',
                  isRetired && state === 'PUBLISHED' && 'bg-warning/20 text-warning'
                )}
              >
                {isPast && !isRetired ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium',
                  isActive && !isRetired && 'text-primary',
                  isPast && !isRetired && 'text-success',
                  !isActive && !isPast && !isRetired && 'text-muted'
                )}
              >
                {VERSION_STATE_LABELS[state]}
              </span>
            </div>
            {index < states.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-16',
                  index < currentIndex && !isRetired ? 'bg-success' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
