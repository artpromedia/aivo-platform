/**
 * Content API Module
 *
 * API calls for learning objects, content blocks, and version management.
 * Extends the existing authoring-api with enhanced types and methods.
 */

import type {
  LearningObject,
  LearningObjectVersion,
  PaginatedResponse,
  ContentJson,
  AccessibilityJson,
  StandardsJson,
  VersionState,
  Subject,
  GradeBand,
} from '../types';

import apiClient from './client';

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT BLOCK TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'image'
  | 'video'
  | 'audio'
  | 'code'
  | 'quiz'
  | 'interactive'
  | 'embed'
  | 'divider'
  | 'callout'
  | 'list'
  | 'table';

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: Record<string, unknown>;
  orderIndex: number;
  metadata?: {
    locked?: boolean;
    lockedBy?: string;
    lockedAt?: string;
  };
}

export interface ParagraphContent {
  text: string;
  format?: 'plain' | 'markdown' | 'html';
}

export interface HeadingContent {
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface ImageContent {
  url: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface VideoContent {
  url: string;
  poster?: string;
  caption?: string;
  duration?: number;
}

export interface CodeContent {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

export interface QuizContent {
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  points?: number;
}

export interface CalloutContent {
  type: 'info' | 'warning' | 'success' | 'error' | 'tip';
  title?: string;
  text: string;
}

export interface ListContent {
  type: 'ordered' | 'unordered';
  items: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST/RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ListContentParams {
  subject?: Subject;
  gradeBand?: GradeBand;
  state?: VersionState;
  tag?: string;
  search?: string;
  createdByMe?: boolean;
  includeGlobal?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateContentRequest {
  title: string;
  subject: Subject;
  gradeBand: GradeBand;
  primarySkillId?: string | null;
  tags?: string[];
  tenantId?: string | null;
}

export interface UpdateContentRequest {
  title?: string;
  primarySkillId?: string | null;
  isActive?: boolean;
}

export interface UpdateVersionRequest {
  contentJson?: ContentJson;
  accessibilityJson?: AccessibilityJson;
  standardsJson?: StandardsJson;
  changeSummary?: string;
}

export interface VersionHistoryEntry {
  version: number;
  createdAt: string;
  createdBy: string;
  changeSummary: string | null;
  state: VersionState;
}

export interface ContentPreview {
  html: string;
  styles: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT API
// ══════════════════════════════════════════════════════════════════════════════

const CONTENT_BASE = '/api/authoring';

/**
 * List learning objects with optional filters
 */
export async function listContent(
  params?: ListContentParams
): Promise<PaginatedResponse<LearningObject>> {
  const searchParams = new URLSearchParams();

  if (params?.subject) searchParams.set('subject', params.subject);
  if (params?.gradeBand) searchParams.set('gradeBand', params.gradeBand);
  if (params?.state) searchParams.set('state', params.state);
  if (params?.tag) searchParams.set('tag', params.tag);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.createdByMe !== undefined)
    searchParams.set('createdByMe', String(params.createdByMe));
  if (params?.includeGlobal !== undefined)
    searchParams.set('includeGlobal', String(params.includeGlobal));
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const query = searchParams.toString();
  const path = query
    ? `${CONTENT_BASE}/learning-objects?${query}`
    : `${CONTENT_BASE}/learning-objects`;

  return apiClient.get<PaginatedResponse<LearningObject>>(path);
}

/**
 * Get a single learning object by ID
 */
export async function getContent(id: string): Promise<LearningObject> {
  return apiClient.get<LearningObject>(`${CONTENT_BASE}/learning-objects/${id}`);
}

/**
 * Create a new learning object
 */
export async function createContent(
  data: CreateContentRequest
): Promise<{ learningObject: LearningObject; version: LearningObjectVersion }> {
  return apiClient.post<{ learningObject: LearningObject; version: LearningObjectVersion }>(
    `${CONTENT_BASE}/learning-objects`,
    data
  );
}

/**
 * Update a learning object
 */
export async function updateContent(
  id: string,
  data: UpdateContentRequest
): Promise<LearningObject> {
  return apiClient.patch<LearningObject>(`${CONTENT_BASE}/learning-objects/${id}`, data);
}

/**
 * Delete a learning object
 */
export async function deleteContent(id: string): Promise<void> {
  return apiClient.delete(`${CONTENT_BASE}/learning-objects/${id}`);
}

/**
 * Set tags for a learning object
 */
export async function setContentTags(id: string, tags: string[]): Promise<LearningObject> {
  return apiClient.post<LearningObject>(`${CONTENT_BASE}/learning-objects/${id}/tags`, { tags });
}

/**
 * Duplicate a learning object
 */
export async function duplicateContent(id: string): Promise<LearningObject> {
  return apiClient.post<LearningObject>(`${CONTENT_BASE}/learning-objects/${id}/duplicate`);
}

/**
 * Archive a learning object
 */
export async function archiveContent(id: string): Promise<LearningObject> {
  return apiClient.post<LearningObject>(`${CONTENT_BASE}/learning-objects/${id}/archive`);
}

// ══════════════════════════════════════════════════════════════════════════════
// VERSION API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * List all versions of a learning object
 */
export async function listVersions(loId: string): Promise<LearningObjectVersion[]> {
  const result = await apiClient.get<{ versions: LearningObjectVersion[] }>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions`
  );
  return result.versions;
}

/**
 * Get a specific version
 */
export async function getVersion(
  loId: string,
  versionNumber: number
): Promise<LearningObjectVersion> {
  return apiClient.get<LearningObjectVersion>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions/${versionNumber}`
  );
}

/**
 * Update a version's content
 */
export async function updateVersion(
  loId: string,
  versionNumber: number,
  data: UpdateVersionRequest
): Promise<LearningObjectVersion> {
  return apiClient.patch<LearningObjectVersion>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions/${versionNumber}`,
    data
  );
}

/**
 * Create a new version (duplicate from latest)
 */
export async function createNewVersion(loId: string): Promise<LearningObjectVersion> {
  return apiClient.post<LearningObjectVersion>(
    `${CONTENT_BASE}/learning-objects/${loId}/new-version`
  );
}

/**
 * Get version history
 */
export async function getVersionHistory(loId: string): Promise<VersionHistoryEntry[]> {
  const versions = await listVersions(loId);
  return versions.map((v) => ({
    version: v.versionNumber,
    createdAt: v.createdAt,
    createdBy: v.createdByUserId,
    changeSummary: v.changeSummary,
    state: v.state,
  }));
}

/**
 * Restore a previous version
 */
export async function restoreVersion(
  loId: string,
  versionNumber: number
): Promise<LearningObjectVersion> {
  return apiClient.post<LearningObjectVersion>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions/${versionNumber}/restore`
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKFLOW API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Submit version for review
 */
export async function submitForReview(
  loId: string,
  versionNumber: number,
  comments?: string
): Promise<LearningObjectVersion> {
  return apiClient.post<LearningObjectVersion>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions/${versionNumber}/submit-review`,
    comments ? { comments } : undefined
  );
}

/**
 * Approve a version
 */
export async function approveVersion(
  loId: string,
  versionNumber: number
): Promise<LearningObjectVersion> {
  return apiClient.post<LearningObjectVersion>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions/${versionNumber}/approve`
  );
}

/**
 * Reject a version
 */
export async function rejectVersion(
  loId: string,
  versionNumber: number,
  reason: string
): Promise<LearningObjectVersion> {
  return apiClient.post<LearningObjectVersion>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions/${versionNumber}/reject`,
    { reason }
  );
}

/**
 * Publish a version
 */
export async function publishVersion(
  loId: string,
  versionNumber: number
): Promise<LearningObjectVersion> {
  return apiClient.post<LearningObjectVersion>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions/${versionNumber}/publish`
  );
}

/**
 * Unpublish a version
 */
export async function unpublishVersion(
  loId: string,
  versionNumber: number
): Promise<LearningObjectVersion> {
  return apiClient.post<LearningObjectVersion>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions/${versionNumber}/unpublish`
  );
}

/**
 * Retire a version
 */
export async function retireVersion(
  loId: string,
  versionNumber: number
): Promise<LearningObjectVersion> {
  return apiClient.post<LearningObjectVersion>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions/${versionNumber}/retire`
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PREVIEW API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get preview HTML for a version
 */
export async function getContentPreview(
  loId: string,
  versionNumber: number
): Promise<ContentPreview> {
  return apiClient.get<ContentPreview>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions/${versionNumber}/preview`
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SKILLS API
// ══════════════════════════════════════════════════════════════════════════════

export interface Skill {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  subject: Subject | null;
  gradeBand: GradeBand | null;
}

/**
 * List available skills
 */
export async function listSkills(params?: {
  subject?: Subject;
  gradeBand?: GradeBand;
  search?: string;
}): Promise<Skill[]> {
  const searchParams = new URLSearchParams();
  if (params?.subject) searchParams.set('subject', params.subject);
  if (params?.gradeBand) searchParams.set('gradeBand', params.gradeBand);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const path = query ? `/api/learner-model/skills?${query}` : '/api/learner-model/skills';

  return apiClient.get<Skill[]>(path);
}

/**
 * Set skills for a version
 */
export async function setVersionSkills(
  loId: string,
  versionNumber: number,
  skills: { skillId: string; isPrimary: boolean }[]
): Promise<LearningObjectVersion> {
  return apiClient.post<LearningObjectVersion>(
    `${CONTENT_BASE}/learning-objects/${loId}/versions/${versionNumber}/skills`,
    { skills }
  );
}
