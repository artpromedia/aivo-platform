/**
 * Google Classroom API Client
 *
 * Client-side API for interacting with the Google Classroom integration.
 * Provides type-safe methods for all Google Classroom operations.
 *
 * @module lib/api/google-classroom
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ConnectionStatus {
  connected: boolean;
  email?: string;
  scopes?: string[];
  coursesLinked?: number;
  lastSyncAt?: string;
  expiresAt?: string;
}

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  ownerId: string;
  courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
  alternateLink: string;
  teacherFolder?: {
    id: string;
    alternateLink: string;
  };
  enrollmentCode?: string;
  guardiansEnabled?: boolean;
  calendarId?: string;
}

export interface ClassroomStudent {
  userId: string;
  courseId: string;
  profile: {
    id: string;
    name: {
      givenName: string;
      familyName: string;
      fullName: string;
    };
    emailAddress: string;
    photoUrl?: string;
  };
}

export interface ClassroomTeacher {
  userId: string;
  courseId: string;
  profile: {
    id: string;
    name: {
      givenName: string;
      familyName: string;
      fullName: string;
    };
    emailAddress: string;
    photoUrl?: string;
  };
}

export interface AssignmentPostRequest {
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  maxPoints?: number;
  dueDate?: string;
  scheduledTime?: string;
  autoGradePassback?: boolean;
}

export interface AssignmentLink {
  id: string;
  googleAssignmentId: string;
  googleCourseId: string;
  lessonId: string;
  title: string;
  maxPoints?: number;
  status: 'active' | 'archived' | 'deleted';
  autoGradePassback: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PendingGrade {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  assignmentId: string;
  assignmentTitle: string;
  score: number;
  maxPoints: number;
  completedAt: string;
  syncStatus: 'pending' | 'synced' | 'failed' | 'retrying';
  lastError?: string;
}

export interface GradePassbackResult {
  successful: number;
  failed: number;
  errors: {
    studentId: string;
    error: string;
  }[];
}

export interface SyncResult {
  courseId: string;
  success: boolean;
  studentsAdded: number;
  studentsRemoved: number;
  studentsUpdated: number;
  teachersAdded: number;
  teachersRemoved: number;
  guardiansAdded: number;
  errors: string[];
  warnings?: string[];
  duration: number;
}

export interface SyncHistoryEntry {
  id: string;
  googleCourseId: string;
  classId?: string;
  courseName?: string;
  syncType: 'full' | 'incremental' | 'webhook' | 'manual';
  triggeredBy: string;
  success: boolean;
  studentsAdded: number;
  studentsRemoved: number;
  studentsUpdated: number;
  teachersAdded: number;
  teachersRemoved: number;
  guardiansAdded: number;
  errors?: string[];
  warnings?: string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  createdAt: string;
}

export interface SyncHistoryQuery {
  courseId?: string;
  classId?: string;
  syncType?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface CourseMapping {
  id: string;
  googleCourseId: string;
  classId: string;
  googleCourseName: string;
  className: string;
  autoSync: boolean;
  syncGuardians: boolean;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const BASE_URL = '/api/integrations/google-classroom';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || 'Request failed');
  }

  return response.json();
}

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTION METHODS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get the OAuth authorization URL for connecting Google Classroom
 */
export async function getConnectUrl(): Promise<string> {
  const response = await request<{ authUrl: string }>('/auth/connect');
  return response.authUrl;
}

/**
 * Get the current connection status
 */
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  return request<ConnectionStatus>('/status');
}

/**
 * Disconnect Google Classroom integration
 */
export async function disconnect(): Promise<void> {
  await request('/auth/disconnect', { method: 'POST' });
}

// ══════════════════════════════════════════════════════════════════════════════
// COURSE METHODS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get all courses from Google Classroom
 */
export async function getCourses(options?: {
  state?: 'ACTIVE' | 'ARCHIVED' | 'ALL';
  role?: 'TEACHER' | 'STUDENT';
}): Promise<ClassroomCourse[]> {
  const params = new URLSearchParams();
  if (options?.state && options.state !== 'ALL') params.set('state', options.state);
  if (options?.role) params.set('role', options.role);

  const query = params.toString() ? `?${params.toString()}` : '';
  return request<ClassroomCourse[]>(`/courses${query}`);
}

/**
 * Get a specific course
 */
export async function getCourse(courseId: string): Promise<ClassroomCourse> {
  return request<ClassroomCourse>(`/courses/${courseId}`);
}

/**
 * Get course roster (students and teachers)
 */
export async function getCourseRoster(courseId: string): Promise<{
  students: ClassroomStudent[];
  teachers: ClassroomTeacher[];
}> {
  return request(`/courses/${courseId}/roster`);
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC METHODS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sync a course roster
 */
export async function syncCourse(
  courseId: string,
  options?: { full?: boolean; syncGuardians?: boolean }
): Promise<SyncResult> {
  return request<SyncResult>(`/courses/${courseId}/sync`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
}

/**
 * Sync all connected courses
 */
export async function syncAllCourses(): Promise<{
  results: SyncResult[];
  totalSynced: number;
  totalFailed: number;
}> {
  return request('/sync/all', { method: 'POST' });
}

/**
 * Get sync history
 */
export async function getSyncHistory(query?: SyncHistoryQuery): Promise<SyncHistoryEntry[]> {
  const params = new URLSearchParams();
  if (query?.courseId) params.set('courseId', query.courseId);
  if (query?.classId) params.set('classId', query.classId);
  if (query?.syncType) params.set('syncType', query.syncType);
  if (query?.success !== undefined) params.set('success', String(query.success));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.offset) params.set('offset', String(query.offset));

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return request<SyncHistoryEntry[]>(`/sync/history${queryString}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT METHODS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Post a lesson as a Google Classroom assignment
 */
export async function postAssignment(request: AssignmentPostRequest): Promise<AssignmentLink> {
  return request<AssignmentLink>('/assignments', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Update a linked assignment
 */
export async function updateAssignment(
  assignmentId: string,
  updates: Partial<AssignmentPostRequest>
): Promise<AssignmentLink> {
  return request<AssignmentLink>(`/assignments/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a linked assignment from Google Classroom
 */
export async function deleteAssignment(assignmentId: string): Promise<void> {
  await request(`/assignments/${assignmentId}`, { method: 'DELETE' });
}

/**
 * Get all linked assignments for a course
 */
export async function getLinkedAssignments(courseId: string): Promise<AssignmentLink[]> {
  return request<AssignmentLink[]>(`/assignments?courseId=${courseId}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// GRADE METHODS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get pending grades for a course
 */
export async function getPendingGrades(
  courseId: string,
  assignmentId?: string
): Promise<PendingGrade[]> {
  const params = new URLSearchParams({ courseId });
  if (assignmentId) params.set('assignmentId', assignmentId);
  return request<PendingGrade[]>(`/grades/pending?${params.toString()}`);
}

/**
 * Sync specific grades to Google Classroom
 */
export async function syncGrades(
  courseId: string,
  gradeIds: string[]
): Promise<GradePassbackResult> {
  return request<GradePassbackResult>('/grades/batch', {
    method: 'POST',
    body: JSON.stringify({ courseId, gradeIds }),
  });
}

/**
 * Sync all pending grades for a course
 */
export async function syncAllPendingGrades(courseId: string): Promise<GradePassbackResult> {
  return request<GradePassbackResult>('/grades/auto-sync', {
    method: 'POST',
    body: JSON.stringify({ courseId }),
  });
}

/**
 * Update a single grade in Google Classroom
 */
export async function updateGrade(
  assignmentId: string,
  studentId: string,
  score: number,
  returnToStudent?: boolean
): Promise<void> {
  await request('/grades', {
    method: 'POST',
    body: JSON.stringify({
      assignmentId,
      studentId,
      score,
      returnToStudent,
    }),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MAPPING METHODS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get course mappings
 */
export async function getCourseMappings(): Promise<CourseMapping[]> {
  return request<CourseMapping[]>('/mappings');
}

/**
 * Create a course mapping
 */
export async function createCourseMapping(mapping: {
  googleCourseId: string;
  classId: string;
  autoSync?: boolean;
  syncGuardians?: boolean;
}): Promise<CourseMapping> {
  return request<CourseMapping>('/mappings', {
    method: 'POST',
    body: JSON.stringify(mapping),
  });
}

/**
 * Update a course mapping
 */
export async function updateCourseMapping(
  mappingId: string,
  updates: { autoSync?: boolean; syncGuardians?: boolean }
): Promise<CourseMapping> {
  return request<CourseMapping>(`/mappings/${mappingId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a course mapping
 */
export async function deleteCourseMapping(mappingId: string): Promise<void> {
  await request(`/mappings/${mappingId}`, { method: 'DELETE' });
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT API OBJECT
// ══════════════════════════════════════════════════════════════════════════════

export const googleClassroomApi = {
  // Connection
  getConnectUrl,
  getConnectionStatus,
  disconnect,

  // Courses
  getCourses,
  getCourse,
  getCourseRoster,

  // Sync
  syncCourse,
  syncAllCourses,
  getSyncHistory,

  // Assignments
  postAssignment,
  updateAssignment,
  deleteAssignment,
  getLinkedAssignments,

  // Grades
  getPendingGrades,
  syncGrades,
  syncAllPendingGrades,
  updateGrade,

  // Mappings
  getCourseMappings,
  createCourseMapping,
  updateCourseMapping,
  deleteCourseMapping,
};

export default googleClassroomApi;
