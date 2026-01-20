/**
 * IEP Comparison Card for Teachers
 *
 * Displays a summary of the IEP comparison status for a student,
 * with options to view details and trigger comparisons.
 */

'use client';

import { useState } from 'react';
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type IepComparisonDecision =
  | 'PENDING'
  | 'AGREE_WITH_SYSTEM'
  | 'PREFER_EXISTING'
  | 'MERGE_BOTH'
  | 'REQUEST_REVIEW';

interface IepComparisonCardProps {
  studentId: string;
  studentName: string;
  profileId: string;
  iepStatus: {
    hasDocument: boolean;
    documentStatus?: string;
    hasComparison: boolean;
    comparisonId?: string;
    decision?: IepComparisonDecision;
    overallMatchScore?: number;
    decisionAt?: string;
  } | null;
  hasCompletedAssessment: boolean;
  className?: string;
  onViewComparison?: (comparisonId: string) => void;
  onTriggerComparison?: () => Promise<void>;
  onUploadIep?: () => void;
}

export function IepComparisonCard({
  studentId,
  studentName,
  profileId,
  iepStatus,
  hasCompletedAssessment,
  className,
  onViewComparison,
  onTriggerComparison,
  onUploadIep,
}: IepComparisonCardProps) {
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTriggerComparison = async () => {
    if (!onTriggerComparison) return;

    try {
      setIsTriggering(true);
      await onTriggerComparison();
    } finally {
      setIsTriggering(false);
    }
  };

  // No IEP data
  if (!iepStatus || !iepStatus.hasDocument) {
    return (
      <div className={cn('rounded-lg border bg-gray-50 p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200">
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-700">No IEP Uploaded</h4>
              <p className="text-sm text-gray-500">
                {studentName} doesn't have an existing IEP on file
              </p>
            </div>
          </div>
          {onUploadIep && (
            <button
              onClick={onUploadIep}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Upload IEP
            </button>
          )}
        </div>
      </div>
    );
  }

  // Decision already made
  if (iepStatus.hasComparison && iepStatus.decision && iepStatus.decision !== 'PENDING') {
    return (
      <div className={cn('rounded-lg border border-green-200 bg-green-50 p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-green-800">IEP Decision Made</h4>
              <p className="text-sm text-green-700">
                {getDecisionLabel(iepStatus.decision)}
              </p>
              {iepStatus.decisionAt && (
                <p className="text-xs text-green-600">
                  {new Date(iepStatus.decisionAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {iepStatus.overallMatchScore !== undefined && (
              <MatchBadge score={iepStatus.overallMatchScore} size="sm" />
            )}
            {onViewComparison && iepStatus.comparisonId && (
              <button
                onClick={() => onViewComparison(iepStatus.comparisonId!)}
                className="flex items-center gap-1 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
              >
                <Eye className="h-4 w-4" />
                View
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Comparison pending decision
  if (iepStatus.hasComparison && iepStatus.decision === 'PENDING') {
    return (
      <div className={cn('rounded-lg border border-amber-200 bg-amber-50 p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-medium text-amber-800">Awaiting Parent Decision</h4>
              <p className="text-sm text-amber-700">
                IEP comparison ready - waiting for parent to review
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {iepStatus.overallMatchScore !== undefined && (
              <MatchBadge score={iepStatus.overallMatchScore} size="sm" />
            )}
            {onViewComparison && iepStatus.comparisonId && (
              <button
                onClick={() => onViewComparison(iepStatus.comparisonId!)}
                className="flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50"
              >
                <Eye className="h-4 w-4" />
                View
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // IEP uploaded, ready to compare
  if (
    iepStatus.documentStatus === 'PROCESSED' &&
    hasCompletedAssessment &&
    !iepStatus.hasComparison
  ) {
    return (
      <div className={cn('rounded-lg border border-blue-200 bg-blue-50 p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-800">Ready to Compare</h4>
              <p className="text-sm text-blue-700">
                IEP and assessment both ready for comparison
              </p>
            </div>
          </div>
          {onTriggerComparison && (
            <button
              onClick={handleTriggerComparison}
              disabled={isTriggering}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isTriggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  Compare Now
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // IEP uploaded but assessment not complete
  if (iepStatus.hasDocument && !hasCompletedAssessment) {
    return (
      <div className={cn('rounded-lg border bg-white p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">IEP Uploaded</h4>
              <p className="text-sm text-gray-600">
                Waiting for {studentName} to complete baseline assessment
              </p>
            </div>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
            {iepStatus.documentStatus}
          </span>
        </div>
      </div>
    );
  }

  // IEP still processing
  return (
    <div className={cn('rounded-lg border bg-white p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Processing IEP</h4>
            <p className="text-sm text-gray-600">Extracting content from document...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper components

function MatchBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const percentage = Math.round(score * 100);
  let color: string;

  if (percentage >= 80) {
    color = 'bg-green-100 text-green-700 border-green-200';
  } else if (percentage >= 60) {
    color = 'bg-blue-100 text-blue-700 border-blue-200';
  } else if (percentage >= 40) {
    color = 'bg-amber-100 text-amber-700 border-amber-200';
  } else {
    color = 'bg-red-100 text-red-700 border-red-200';
  }

  return (
    <span
      className={cn(
        'rounded-full border font-medium',
        color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {percentage}% match
    </span>
  );
}

function getDecisionLabel(decision: IepComparisonDecision): string {
  switch (decision) {
    case 'AGREE_WITH_SYSTEM':
      return 'Using system assessment';
    case 'PREFER_EXISTING':
      return 'Using existing IEP goals';
    case 'MERGE_BOTH':
      return 'Combining both sources';
    case 'REQUEST_REVIEW':
      return 'Professional review requested';
    default:
      return 'Decision pending';
  }
}
