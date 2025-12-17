/**
 * Review API Module
 *
 * API calls for the content review queue and review workflow.
 */

import type { Subject, GradeBand, VersionState } from '../types';

import apiClient from './client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
export type ReviewPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type ReviewStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface ReviewQueueItem {
  id: string; // version ID
  versionNumber: number;
  state: VersionState;
  submittedAt: string;
  createdByUserId: string;
  createdByUserName?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  priority: ReviewPriority;
  learningObject: {
    id: string;
    slug: string;
    title: string;
    subject: Subject;
    gradeBand: GradeBand;
  };
  _count?: {
    reviews: number;
    comments: number;
  };
}

export interface ReviewQueueResponse {
  items: ReviewQueueItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ReviewComment {
  id: string;
  versionId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  content: string;
  blockId?: string; // Reference to specific content block
  createdAt: string;
  updatedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedByUserId?: string;
  parentId?: string; // For threaded comments
  replies?: ReviewComment[];
}

export interface ReviewRecord {
  id: string;
  versionId: string;
  reviewerId: string;
  reviewerName: string;
  decision: ReviewDecision;
  comments: string | null;
  createdAt: string;
}

export interface ReviewStats {
  pending: number;
  inReview: number;
  approvedToday: number;
  rejectedToday: number;
  averageReviewTimeHours: number;
  myPendingCount: number;
  myCompletedCount: number;
}

export interface ListReviewQueueParams {
  subject?: Subject;
  gradeBand?: GradeBand;
  priority?: ReviewPriority;
  assignedToMe?: boolean;
  createdByMe?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'submittedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface SubmitReviewRequest {
  decision: ReviewDecision;
  comments?: string;
  blockComments?: {
    blockId: string;
    comment: string;
  }[];
}

// ══════════════════════════════════════════════════════════════════════════════
// REVIEW QUEUE API
// ══════════════════════════════════════════════════════════════════════════════

const REVIEW_BASE = '/api/authoring/reviews';

/**
 * Get the review queue
 */
export async function getReviewQueue(params?: ListReviewQueueParams): Promise<ReviewQueueResponse> {
  const searchParams = new URLSearchParams();

  if (params?.subject) searchParams.set('subject', params.subject);
  if (params?.gradeBand) searchParams.set('gradeBand', params.gradeBand);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.assignedToMe !== undefined)
    searchParams.set('assignedToMe', String(params.assignedToMe));
  if (params?.createdByMe !== undefined)
    searchParams.set('createdByMe', String(params.createdByMe));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const query = searchParams.toString();
  const path = query ? `${REVIEW_BASE}/queue?${query}` : `${REVIEW_BASE}/queue`;

  return apiClient.get<ReviewQueueResponse>(path);
}

/**
 * Get a single review item
 */
export async function getReviewItem(versionId: string): Promise<ReviewQueueItem> {
  return apiClient.get<ReviewQueueItem>(`${REVIEW_BASE}/${versionId}`);
}

/**
 * Assign a review item to current user
 */
export async function assignReviewToMe(versionId: string): Promise<ReviewQueueItem> {
  return apiClient.post<ReviewQueueItem>(`${REVIEW_BASE}/${versionId}/assign`);
}

/**
 * Unassign a review item
 */
export async function unassignReview(versionId: string): Promise<ReviewQueueItem> {
  return apiClient.post<ReviewQueueItem>(`${REVIEW_BASE}/${versionId}/unassign`);
}

/**
 * Set review priority
 */
export async function setReviewPriority(
  versionId: string,
  priority: ReviewPriority
): Promise<ReviewQueueItem> {
  return apiClient.patch<ReviewQueueItem>(`${REVIEW_BASE}/${versionId}`, { priority });
}

/**
 * Submit a review decision
 */
export async function submitReview(
  versionId: string,
  review: SubmitReviewRequest
): Promise<ReviewRecord> {
  return apiClient.post<ReviewRecord>(`${REVIEW_BASE}/${versionId}/submit`, review);
}

/**
 * Get review history for a version
 */
export async function getReviewHistory(versionId: string): Promise<ReviewRecord[]> {
  return apiClient.get<ReviewRecord[]>(`${REVIEW_BASE}/${versionId}/history`);
}

/**
 * Get review statistics
 */
export async function getReviewStats(): Promise<ReviewStats> {
  return apiClient.get<ReviewStats>(`${REVIEW_BASE}/stats`);
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMENTS API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get comments for a version
 */
export async function getVersionComments(versionId: string): Promise<ReviewComment[]> {
  return apiClient.get<ReviewComment[]>(`${REVIEW_BASE}/${versionId}/comments`);
}

/**
 * Add a comment to a version
 */
export async function addComment(
  versionId: string,
  data: {
    content: string;
    blockId?: string;
    parentId?: string;
  }
): Promise<ReviewComment> {
  return apiClient.post<ReviewComment>(`${REVIEW_BASE}/${versionId}/comments`, data);
}

/**
 * Update a comment
 */
export async function updateComment(
  versionId: string,
  commentId: string,
  content: string
): Promise<ReviewComment> {
  return apiClient.patch<ReviewComment>(`${REVIEW_BASE}/${versionId}/comments/${commentId}`, {
    content,
  });
}

/**
 * Delete a comment
 */
export async function deleteComment(versionId: string, commentId: string): Promise<void> {
  return apiClient.delete(`${REVIEW_BASE}/${versionId}/comments/${commentId}`);
}

/**
 * Resolve a comment
 */
export async function resolveComment(versionId: string, commentId: string): Promise<ReviewComment> {
  return apiClient.post<ReviewComment>(`${REVIEW_BASE}/${versionId}/comments/${commentId}/resolve`);
}

/**
 * Unresolve a comment
 */
export async function unresolveComment(
  versionId: string,
  commentId: string
): Promise<ReviewComment> {
  return apiClient.post<ReviewComment>(
    `${REVIEW_BASE}/${versionId}/comments/${commentId}/unresolve`
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  APPROVED: 'Approve',
  CHANGES_REQUESTED: 'Request Changes',
  REJECTED: 'Reject',
};

export const REVIEW_DECISION_DESCRIPTIONS: Record<ReviewDecision, string> = {
  APPROVED: 'Content meets quality standards and is ready for publishing',
  CHANGES_REQUESTED: 'Content needs modifications before it can be approved',
  REJECTED: 'Content does not meet requirements and should be significantly revised',
};

export const REVIEW_DECISION_COLORS: Record<ReviewDecision, string> = {
  APPROVED: 'text-green-600 bg-green-50',
  CHANGES_REQUESTED: 'text-amber-600 bg-amber-50',
  REJECTED: 'text-red-600 bg-red-50',
};

export const REVIEW_PRIORITY_LABELS: Record<ReviewPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const REVIEW_PRIORITY_COLORS: Record<ReviewPriority, string> = {
  LOW: 'text-gray-500 bg-gray-100',
  NORMAL: 'text-blue-600 bg-blue-50',
  HIGH: 'text-orange-600 bg-orange-50',
  URGENT: 'text-red-600 bg-red-50',
};

/**
 * Get unresolved comment count
 */
export function getUnresolvedCount(comments: ReviewComment[]): number {
  return comments.filter((c) => !c.resolved).length;
}

/**
 * Get comments for a specific block
 */
export function getBlockComments(comments: ReviewComment[], blockId: string): ReviewComment[] {
  return comments.filter((c) => c.blockId === blockId);
}

/**
 * Organize comments into threads
 */
export function organizeCommentThreads(comments: ReviewComment[]): ReviewComment[] {
  const topLevel = comments.filter((c) => !c.parentId);
  const byParent = new Map<string, ReviewComment[]>();

  comments
    .filter((c) => c.parentId !== undefined)
    .forEach((c) => {
      // c.parentId is guaranteed to be defined after the filter
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- filtered above
      const parentId = c.parentId!;
      const existing = byParent.get(parentId) ?? [];
      byParent.set(parentId, [...existing, c]);
    });

  return topLevel.map((comment) => ({
    ...comment,
    replies: byParent.get(comment.id) ?? [],
  }));
}
