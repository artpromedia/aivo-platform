/**
 * API client for content-authoring-svc
 *
 * Handles CRUD operations for Learning Objects and versions,
 * as well as workflow transitions.
 */

import type {
  LearningObject,
  LearningObjectVersion,
  Skill,
  PaginatedResponse,
  CreateLearningObjectRequest,
  UpdateLearningObjectRequest,
  UpdateVersionRequest,
  SetSkillsRequest,
  RejectRequest,
  ListLearningObjectsParams,
  VersionTransition,
} from './types';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const AUTHORING_SVC_URL = process.env.NEXT_PUBLIC_AUTHORING_SVC_URL || '/api/authoring';
const LEARNER_MODEL_SVC_URL = process.env.NEXT_PUBLIC_LEARNER_MODEL_SVC_URL || '/api/learner-model';

// ══════════════════════════════════════════════════════════════════════════════
// FETCH HELPER
// ══════════════════════════════════════════════════════════════════════════════

async function apiFetch<T>(baseUrl: string, path: string, options?: RequestInit): Promise<T> {
  const url = `${baseUrl}${path}`;
  const existingHeaders = options?.headers ?? {};
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(existingHeaders instanceof Headers
      ? Object.fromEntries(existingHeaders.entries())
      : Array.isArray(existingHeaders)
        ? Object.fromEntries(existingHeaders)
        : existingHeaders),
  };

  const res = await fetch(url, {
    ...(options ?? {}),
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({ message: res.statusText }))) as {
      message?: string;
      error?: string;
    };
    throw new Error(errorData.message ?? errorData.error ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNING OBJECT API
// ══════════════════════════════════════════════════════════════════════════════

export async function listLearningObjects(
  params?: ListLearningObjectsParams
): Promise<PaginatedResponse<LearningObject>> {
  const searchParams = new URLSearchParams();
  if (params?.subject) searchParams.set('subject', params.subject);
  if (params?.gradeBand) searchParams.set('gradeBand', params.gradeBand);
  if (params?.state) searchParams.set('state', params.state);
  if (params?.tag) searchParams.set('tag', params.tag);
  if (params?.createdByMe !== undefined)
    searchParams.set('createdByMe', String(params.createdByMe));
  if (params?.includeGlobal !== undefined)
    searchParams.set('includeGlobal', String(params.includeGlobal));
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const query = searchParams.toString();
  const path = query ? `/learning-objects?${query}` : '/learning-objects';
  return apiFetch<PaginatedResponse<LearningObject>>(AUTHORING_SVC_URL, path);
}

export async function getLearningObject(loId: string): Promise<LearningObject> {
  return apiFetch<LearningObject>(AUTHORING_SVC_URL, `/learning-objects/${loId}`);
}

export async function createLearningObject(
  data: CreateLearningObjectRequest
): Promise<{ learningObject: LearningObject; version: LearningObjectVersion }> {
  return apiFetch<{ learningObject: LearningObject; version: LearningObjectVersion }>(
    AUTHORING_SVC_URL,
    '/learning-objects',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export async function updateLearningObject(
  loId: string,
  data: UpdateLearningObjectRequest
): Promise<LearningObject> {
  return apiFetch<LearningObject>(AUTHORING_SVC_URL, `/learning-objects/${loId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function setLearningObjectTags(loId: string, tags: string[]): Promise<LearningObject> {
  return apiFetch<LearningObject>(AUTHORING_SVC_URL, `/learning-objects/${loId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tags }),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// VERSION API
// ══════════════════════════════════════════════════════════════════════════════

export async function listVersions(loId: string): Promise<LearningObjectVersion[]> {
  const result = await apiFetch<{ versions: LearningObjectVersion[] }>(
    AUTHORING_SVC_URL,
    `/learning-objects/${loId}/versions`
  );
  return result.versions;
}

export async function getVersion(
  loId: string,
  versionNumber: number
): Promise<LearningObjectVersion> {
  return apiFetch<LearningObjectVersion>(
    AUTHORING_SVC_URL,
    `/learning-objects/${loId}/versions/${versionNumber}`
  );
}

export async function updateVersion(
  loId: string,
  versionNumber: number,
  data: UpdateVersionRequest
): Promise<LearningObjectVersion> {
  return apiFetch<LearningObjectVersion>(
    AUTHORING_SVC_URL,
    `/learning-objects/${loId}/versions/${versionNumber}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

export async function setVersionSkills(
  loId: string,
  versionNumber: number,
  data: SetSkillsRequest
): Promise<LearningObjectVersion> {
  return apiFetch<LearningObjectVersion>(
    AUTHORING_SVC_URL,
    `/learning-objects/${loId}/versions/${versionNumber}/skills`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export async function createNewVersion(loId: string): Promise<LearningObjectVersion> {
  return apiFetch<LearningObjectVersion>(
    AUTHORING_SVC_URL,
    `/learning-objects/${loId}/new-version`,
    {
      method: 'POST',
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKFLOW TRANSITIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function submitForReview(
  loId: string,
  versionNumber: number
): Promise<LearningObjectVersion> {
  return apiFetch<LearningObjectVersion>(
    AUTHORING_SVC_URL,
    `/learning-objects/${loId}/versions/${versionNumber}/submit-review`,
    {
      method: 'POST',
    }
  );
}

export async function approveVersion(
  loId: string,
  versionNumber: number
): Promise<LearningObjectVersion> {
  return apiFetch<LearningObjectVersion>(
    AUTHORING_SVC_URL,
    `/learning-objects/${loId}/versions/${versionNumber}/approve`,
    {
      method: 'POST',
    }
  );
}

export async function rejectVersion(
  loId: string,
  versionNumber: number,
  data: RejectRequest
): Promise<LearningObjectVersion> {
  return apiFetch<LearningObjectVersion>(
    AUTHORING_SVC_URL,
    `/learning-objects/${loId}/versions/${versionNumber}/reject`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export async function publishVersion(
  loId: string,
  versionNumber: number
): Promise<LearningObjectVersion> {
  return apiFetch<LearningObjectVersion>(
    AUTHORING_SVC_URL,
    `/learning-objects/${loId}/versions/${versionNumber}/publish`,
    {
      method: 'POST',
    }
  );
}

export async function retireVersion(
  loId: string,
  versionNumber: number
): Promise<LearningObjectVersion> {
  return apiFetch<LearningObjectVersion>(
    AUTHORING_SVC_URL,
    `/learning-objects/${loId}/versions/${versionNumber}/retire`,
    {
      method: 'POST',
    }
  );
}

export async function getVersionHistory(
  loId: string,
  versionNumber: number
): Promise<VersionTransition[]> {
  const result = await apiFetch<{ transitions: VersionTransition[] }>(
    AUTHORING_SVC_URL,
    `/learning-objects/${loId}/versions/${versionNumber}/history`
  );
  return result.transitions;
}

// ══════════════════════════════════════════════════════════════════════════════
// SKILLS API (from learner-model-svc)
// ══════════════════════════════════════════════════════════════════════════════

export async function listSkills(params?: {
  subject?: string;
  gradeBand?: string;
  search?: string;
}): Promise<Skill[]> {
  const searchParams = new URLSearchParams();
  if (params?.subject) searchParams.set('subject', params.subject);
  if (params?.gradeBand) searchParams.set('gradeBand', params.gradeBand);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const path = query ? `/skills?${query}` : '/skills';

  try {
    const result = await apiFetch<{ skills: Skill[] }>(LEARNER_MODEL_SVC_URL, path);
    return result.skills;
  } catch {
    // Return mock data if skills API is not available
    return getMockSkills(params?.subject, params?.gradeBand);
  }
}

// Mock skills for development when learner-model-svc is not running
function getMockSkills(subject?: string, gradeBand?: string): Skill[] {
  const mockSkills: Skill[] = [
    {
      id: '1',
      name: 'Main Idea Identification',
      description: 'Identify the main idea of a passage',
      category: 'Reading Comprehension',
      subject: 'ELA',
      gradeBand: 'G3_5',
    },
    {
      id: '2',
      name: 'Supporting Details',
      description: 'Identify supporting details in text',
      category: 'Reading Comprehension',
      subject: 'ELA',
      gradeBand: 'G3_5',
    },
    {
      id: '3',
      name: 'Text Structure Analysis',
      description: 'Analyze the structure of informational text',
      category: 'Reading Comprehension',
      subject: 'ELA',
      gradeBand: 'G6_8',
    },
    {
      id: '4',
      name: 'Addition with Regrouping',
      description: 'Add multi-digit numbers with regrouping',
      category: 'Arithmetic',
      subject: 'MATH',
      gradeBand: 'K_2',
    },
    {
      id: '5',
      name: 'Fraction Operations',
      description: 'Add, subtract, multiply, divide fractions',
      category: 'Number Operations',
      subject: 'MATH',
      gradeBand: 'G3_5',
    },
    {
      id: '6',
      name: 'Algebraic Expressions',
      description: 'Simplify and evaluate algebraic expressions',
      category: 'Algebra',
      subject: 'MATH',
      gradeBand: 'G6_8',
    },
    {
      id: '7',
      name: 'Scientific Method',
      description: 'Apply the scientific method to investigations',
      category: 'Science Process',
      subject: 'SCIENCE',
      gradeBand: 'G3_5',
    },
    {
      id: '8',
      name: 'Emotion Recognition',
      description: 'Identify and label emotions in self and others',
      category: 'Self-Awareness',
      subject: 'SEL',
      gradeBand: 'K_2',
    },
  ];

  return mockSkills.filter((skill) => {
    if (subject && skill.subject !== subject) return false;
    if (gradeBand && skill.gradeBand !== gradeBand) return false;
    return true;
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// STANDARDS API (mock for now)
// ══════════════════════════════════════════════════════════════════════════════

export interface Standard {
  code: string;
  framework: string;
  description: string;
  gradeBand?: string;
  subject?: string;
}

export async function searchStandards(query: string): Promise<Standard[]> {
  // Mock standards data - in production, this would call a standards service
  const mockStandards: Standard[] = [
    {
      code: 'CCSS.ELA-LITERACY.RI.3.1',
      framework: 'CCSS',
      description: 'Ask and answer questions to demonstrate understanding of a text',
      gradeBand: 'G3_5',
      subject: 'ELA',
    },
    {
      code: 'CCSS.ELA-LITERACY.RI.3.2',
      framework: 'CCSS',
      description: 'Determine the main idea of a text',
      gradeBand: 'G3_5',
      subject: 'ELA',
    },
    {
      code: 'CCSS.ELA-LITERACY.RI.4.1',
      framework: 'CCSS',
      description: 'Refer to details and examples when explaining',
      gradeBand: 'G3_5',
      subject: 'ELA',
    },
    {
      code: 'CCSS.MATH.CONTENT.3.OA.A.1',
      framework: 'CCSS',
      description: 'Interpret products of whole numbers',
      gradeBand: 'G3_5',
      subject: 'MATH',
    },
    {
      code: 'CCSS.MATH.CONTENT.4.NF.A.1',
      framework: 'CCSS',
      description: 'Explain why a fraction a/b is equivalent',
      gradeBand: 'G3_5',
      subject: 'MATH',
    },
    {
      code: 'NGSS.3-LS1-1',
      framework: 'NGSS',
      description: 'Develop models to describe that organisms have unique life cycles',
      gradeBand: 'G3_5',
      subject: 'SCIENCE',
    },
    {
      code: 'NGSS.MS-PS1-1',
      framework: 'NGSS',
      description: 'Develop models to describe atomic composition',
      gradeBand: 'G6_8',
      subject: 'SCIENCE',
    },
  ];

  const lowerQuery = query.toLowerCase();
  return mockStandards.filter(
    (s) =>
      s.code.toLowerCase().includes(lowerQuery) || s.description.toLowerCase().includes(lowerQuery)
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REVIEW QUEUE API
// ══════════════════════════════════════════════════════════════════════════════

export interface ReviewQueueParams {
  subject?: string;
  gradeBand?: string;
  limit?: number;
  offset?: number;
}

export interface ReviewQueueItem {
  id: string;
  versionNumber: number;
  submittedAt: string;
  createdByUserId: string;
  learningObject: {
    id: string;
    slug: string;
    title: string;
    subject: string;
    gradeBand: string;
  };
  _count?: {
    reviews: number;
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

export async function getReviewQueue(params?: ReviewQueueParams): Promise<ReviewQueueResponse> {
  const searchParams = new URLSearchParams();
  if (params?.subject) searchParams.set('subject', params.subject);
  if (params?.gradeBand) searchParams.set('gradeBand', params.gradeBand);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  return apiFetch<ReviewQueueResponse>(
    AUTHORING_SVC_URL,
    `/review-queue${query ? `?${query}` : ''}`
  );
}

export interface SubmitReviewRequest {
  decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  comments?: string;
  validationErrors?: string[];
  checklist?: Record<string, boolean>;
}

export interface Review {
  id: string;
  versionId: string;
  reviewerUserId: string;
  decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  comments: string | null;
  validationErrors: string[];
  checklist: Record<string, boolean>;
  reviewedAt: string;
}

export async function submitReview(versionId: string, data: SubmitReviewRequest): Promise<Review> {
  return apiFetch<Review>(AUTHORING_SVC_URL, `/versions/${versionId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getVersionReviews(versionId: string): Promise<Review[]> {
  return apiFetch<Review[]>(AUTHORING_SVC_URL, `/versions/${versionId}/reviews`);
}

// ══════════════════════════════════════════════════════════════════════════════
// INGESTION API
// ══════════════════════════════════════════════════════════════════════════════

export interface IngestionJob {
  id: string;
  tenantId: string | null;
  source: 'MANUAL' | 'FILE_CSV' | 'FILE_JSON' | 'AI_DRAFT';
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  inputFileUrl: string | null;
  inputMetadata: Record<string, unknown>;
  totalRows: number | null;
  successCount: number;
  errorCount: number;
  createdLoIds: string[];
  errors: Array<{ row?: number; slug?: string; errors?: Array<{ field: string; message: string }> }>;
  createdByUserId: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface IngestionJobsParams {
  status?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface IngestionJobsResponse {
  jobs: Pick<IngestionJob, 'id' | 'source' | 'status' | 'totalRows' | 'successCount' | 'errorCount' | 'createdAt' | 'completedAt'>[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export async function getIngestionJobs(params?: IngestionJobsParams): Promise<IngestionJobsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.source) searchParams.set('source', params.source);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  return apiFetch<IngestionJobsResponse>(
    AUTHORING_SVC_URL,
    `/ingest/jobs${query ? `?${query}` : ''}`
  );
}

export async function getIngestionJob(jobId: string): Promise<IngestionJob> {
  return apiFetch<IngestionJob>(AUTHORING_SVC_URL, `/ingest/jobs/${jobId}`);
}

export interface ManualIngestionItem {
  slug: string;
  title: string;
  subject: string;
  gradeBand: string;
  contentJson: Record<string, unknown>;
  accessibilityJson?: Record<string, unknown>;
  standardsJson?: Record<string, unknown>;
  tags?: string[];
  primarySkillId?: string;
}

export interface ManualIngestionRequest {
  items: ManualIngestionItem[];
  validateOnly?: boolean;
  autoSubmitForReview?: boolean;
}

export interface ManualIngestionResponse {
  jobId: string;
  totalItems: number;
  successCount: number;
  errorCount: number;
  results: Array<{
    index: number;
    slug: string;
    success: boolean;
    loId?: string;
    versionId?: string;
    errors?: Array<{ field: string; message: string }>;
    warnings?: Array<{ field: string; message: string }>;
  }>;
}

export async function ingestManual(data: ManualIngestionRequest): Promise<ManualIngestionResponse> {
  return apiFetch<ManualIngestionResponse>(AUTHORING_SVC_URL, '/ingest/manual', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface FileIngestionRequest {
  fileUrl: string;
  fileType: 'csv' | 'json';
  mappings?: Record<string, string>;
  defaultSubject?: string;
  defaultGradeBand?: string;
  autoSubmitForReview?: boolean;
}

export interface FileIngestionResponse {
  jobId: string;
  status: string;
  message: string;
}

export async function ingestFile(data: FileIngestionRequest): Promise<FileIngestionResponse> {
  return apiFetch<FileIngestionResponse>(AUTHORING_SVC_URL, '/ingest/file', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface AiDraftRequest {
  subject: string;
  gradeBand: string;
  contentType: 'reading_passage' | 'math_problem' | 'quiz' | 'generic';
  standards?: string[];
  targetSkills?: string[];
  promptSummary: string;
  difficulty?: number;
  estimatedMinutes?: number;
}

export interface AiDraftResponse {
  jobId: string;
  status: string;
  loId?: string;
  versionId?: string;
  message: string;
  warning?: string;
}

export async function createAiDraft(data: AiDraftRequest): Promise<AiDraftResponse> {
  return apiFetch<AiDraftResponse>(AUTHORING_SVC_URL, '/ingest/ai-draft', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelIngestionJob(jobId: string): Promise<IngestionJob> {
  return apiFetch<IngestionJob>(AUTHORING_SVC_URL, `/ingest/jobs/${jobId}/cancel`, {
    method: 'POST',
  });
}
