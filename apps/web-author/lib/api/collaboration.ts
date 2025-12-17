/**
 * Collaboration API Module
 *
 * API calls for real-time collaboration features including
 * presence, cursors, and conflict resolution.
 */

import apiClient from './client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface Collaborator {
  userId: string;
  userName: string;
  avatarUrl?: string;
  color: string; // Assigned collaboration color
  isOnline: boolean;
  lastSeenAt: string;
  currentVersionId?: string;
  currentBlockId?: string; // The block they're currently editing
  cursorPosition?: CursorPosition;
}

export interface CursorPosition {
  blockId: string;
  offset: number;
  length?: number; // For selections
}

export interface CollaborationSession {
  id: string;
  contentId: string;
  versionId: string;
  createdAt: string;
  collaborators: Collaborator[];
  lockState: LockState;
}

export interface LockState {
  isLocked: boolean;
  lockedBy?: string;
  lockedByUserName?: string;
  lockedAt?: string;
  expiresAt?: string;
  reason?: string;
}

export interface EditOperation {
  id: string;
  type: 'insert' | 'delete' | 'update' | 'move';
  blockId: string;
  userId: string;
  timestamp: number;
  data: Record<string, unknown>;
  applied: boolean;
}

export interface ConflictResolution {
  operationId: string;
  resolution: 'accept_local' | 'accept_remote' | 'merge';
  mergedData?: Record<string, unknown>;
}

// WebSocket event types
export type CollaborationEventType =
  | 'user_joined'
  | 'user_left'
  | 'cursor_moved'
  | 'selection_changed'
  | 'block_locked'
  | 'block_unlocked'
  | 'content_changed'
  | 'presence_update'
  | 'conflict_detected'
  | 'version_saved'
  | 'error';

export interface CollaborationEvent {
  type: CollaborationEventType;
  userId: string;
  versionId: string;
  timestamp: number;
  data: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION API
// ══════════════════════════════════════════════════════════════════════════════

const COLLAB_BASE = '/api/authoring/collaboration';

/**
 * Join a collaboration session
 */
export async function joinSession(
  contentId: string,
  versionId: string
): Promise<CollaborationSession> {
  return apiClient.post<CollaborationSession>(`${COLLAB_BASE}/sessions`, {
    contentId,
    versionId,
  });
}

/**
 * Leave a collaboration session
 */
export async function leaveSession(sessionId: string): Promise<void> {
  return apiClient.delete(`${COLLAB_BASE}/sessions/${sessionId}`);
}

/**
 * Get current collaborators for a version
 */
export async function getCollaborators(versionId: string): Promise<Collaborator[]> {
  return apiClient.get<Collaborator[]>(`${COLLAB_BASE}/versions/${versionId}/collaborators`);
}

/**
 * Get collaboration session info
 */
export async function getSession(sessionId: string): Promise<CollaborationSession> {
  return apiClient.get<CollaborationSession>(`${COLLAB_BASE}/sessions/${sessionId}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// PRESENCE API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Update cursor position
 */
export async function updateCursor(
  versionId: string,
  position: CursorPosition | null
): Promise<void> {
  return apiClient.post(`${COLLAB_BASE}/versions/${versionId}/cursor`, { position });
}

/**
 * Update presence (heartbeat)
 */
export async function updatePresence(versionId: string, currentBlockId?: string): Promise<void> {
  return apiClient.post(`${COLLAB_BASE}/versions/${versionId}/presence`, {
    currentBlockId,
    timestamp: Date.now(),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// LOCKING API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Acquire a lock on a block
 */
export async function lockBlock(
  versionId: string,
  blockId: string
): Promise<{ success: boolean; lock?: LockState }> {
  return apiClient.post(`${COLLAB_BASE}/versions/${versionId}/blocks/${blockId}/lock`);
}

/**
 * Release a lock on a block
 */
export async function unlockBlock(versionId: string, blockId: string): Promise<void> {
  return apiClient.delete(`${COLLAB_BASE}/versions/${versionId}/blocks/${blockId}/lock`);
}

/**
 * Get lock state for a version
 */
export async function getVersionLocks(versionId: string): Promise<Record<string, LockState>> {
  return apiClient.get<Record<string, LockState>>(`${COLLAB_BASE}/versions/${versionId}/locks`);
}

/**
 * Force unlock all blocks (admin only)
 */
export async function forceUnlockAll(versionId: string): Promise<void> {
  return apiClient.post(`${COLLAB_BASE}/versions/${versionId}/unlock-all`);
}

// ══════════════════════════════════════════════════════════════════════════════
// OPERATIONS API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Submit an edit operation
 */
export async function submitOperation(
  versionId: string,
  operation: Omit<EditOperation, 'id' | 'userId' | 'timestamp' | 'applied'>
): Promise<{ operationId: string; applied: boolean; conflict?: EditOperation }> {
  return apiClient.post(`${COLLAB_BASE}/versions/${versionId}/operations`, operation);
}

/**
 * Get pending operations
 */
export async function getPendingOperations(
  versionId: string,
  since?: number
): Promise<EditOperation[]> {
  const params = since ? `?since=${since}` : '';
  return apiClient.get<EditOperation[]>(`${COLLAB_BASE}/versions/${versionId}/operations${params}`);
}

/**
 * Acknowledge an operation
 */
export async function acknowledgeOperation(versionId: string, operationId: string): Promise<void> {
  return apiClient.post(`${COLLAB_BASE}/versions/${versionId}/operations/${operationId}/ack`);
}

/**
 * Resolve a conflict
 */
export async function resolveConflict(
  versionId: string,
  resolution: ConflictResolution
): Promise<{ success: boolean }> {
  return apiClient.post(`${COLLAB_BASE}/versions/${versionId}/conflicts/resolve`, resolution);
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

// Predefined collaboration colors for users
const COLLABORATION_COLORS_ARRAY = [
  '#e53935', // red
  '#43a047', // green
  '#1e88e5', // blue
  '#fb8c00', // orange
  '#8e24aa', // purple
  '#00acc1', // cyan
  '#6d4c41', // brown
  '#d81b60', // pink
  '#5e35b1', // deep purple
  '#00897b', // teal
] as const;

export const COLLABORATION_COLORS: readonly string[] = COLLABORATION_COLORS_ARRAY;

/**
 * Get a consistent color for a user based on their ID
 */
export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const codePoint = userId.codePointAt(i);
    if (codePoint !== undefined) {
      hash = codePoint + ((hash << 5) - hash);
    }
  }
  const index = Math.abs(hash) % COLLABORATION_COLORS_ARRAY.length;
  // TypeScript needs explicit handling for array access even with known bounds
  const color = COLLABORATION_COLORS_ARRAY[index];
  if (color === undefined) {
    return COLLABORATION_COLORS_ARRAY[0];
  }
  return color;
}

/**
 * Get initials from a user name
 */
export function getUserInitials(userName: string): string {
  const parts = userName.trim().split(/\s+/);
  const firstPart = parts[0];
  const lastPart = parts.at(-1);
  if (parts.length === 0 || !firstPart) return '?';
  if (parts.length === 1) return firstPart.charAt(0).toUpperCase();
  return (firstPart.charAt(0) + (lastPart?.charAt(0) ?? '')).toUpperCase();
}

/**
 * Check if a lock is still valid
 */
export function isLockValid(lock: LockState): boolean {
  if (!lock.isLocked) return false;
  if (!lock.expiresAt) return true;
  return new Date(lock.expiresAt) > new Date();
}

/**
 * Format "last seen" time
 */
export function formatLastSeen(lastSeenAt: string): string {
  const diff = Date.now() - new Date(lastSeenAt).getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/**
 * Create a unique operation ID
 */
export function createOperationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
