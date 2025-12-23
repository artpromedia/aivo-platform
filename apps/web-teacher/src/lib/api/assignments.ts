/* eslint-disable @typescript-eslint/no-invalid-void-type */
/**
 * Assignments API Service
 */

import type {
  Assignment,
  Submission,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  Rubric,
} from '../types/assignment';

import { api } from './client';

export const assignmentsApi = {
  /**
   * Get all assignments for the current teacher
   */
  list: (params?: {
    classId?: string;
    status?: 'all' | 'published' | 'draft';
    category?: string;
    dueBefore?: Date;
    dueAfter?: Date;
  }) => api.get<Assignment[]>('/api/teacher/assignments', params),

  /**
   * Get a single assignment by ID
   */
  get: (id: string) => api.get<Assignment>(`/api/teacher/assignments/${id}`),

  /**
   * Create a new assignment
   */
  create: (classId: string, data: CreateAssignmentDto) =>
    api.post<Assignment>(`/api/teacher/classes/${classId}/assignments`, data),

  /**
   * Update an assignment
   */
  update: (id: string, data: UpdateAssignmentDto) =>
    api.patch<Assignment>(`/api/teacher/assignments/${id}`, data),

  /**
   * Delete an assignment
   */
  delete: (id: string) => api.delete<void>(`/api/teacher/assignments/${id}`),

  /**
   * Publish an assignment
   */
  publish: (id: string) => api.post<Assignment>(`/api/teacher/assignments/${id}/publish`),

  /**
   * Duplicate an assignment
   */
  duplicate: (id: string, targetClassId?: string) =>
    api.post<Assignment>(`/api/teacher/assignments/${id}/duplicate`, { targetClassId }),

  /**
   * Get submissions for an assignment
   */
  getSubmissions: (id: string, params?: { status?: string }) =>
    api.get<Submission[]>(`/api/teacher/assignments/${id}/submissions`, params),

  /**
   * Get a single submission
   */
  getSubmission: (assignmentId: string, submissionId: string) =>
    api.get<Submission>(`/api/teacher/assignments/${assignmentId}/submissions/${submissionId}`),

  /**
   * Grade a submission
   */
  gradeSubmission: (
    assignmentId: string,
    submissionId: string,
    data: {
      score: number | null;
      feedback?: string;
      rubricScores?: { criterionId: string; points: number; comment?: string }[];
      isExcused?: boolean;
    }
  ) =>
    api.patch<Submission>(
      `/api/teacher/assignments/${assignmentId}/submissions/${submissionId}/grade`,
      data
    ),

  /**
   * Return a submission to student (for revision)
   */
  returnSubmission: (assignmentId: string, submissionId: string, feedback?: string) =>
    api.post<Submission>(
      `/api/teacher/assignments/${assignmentId}/submissions/${submissionId}/return`,
      { feedback }
    ),

  /**
   * Bulk grade submissions
   */
  bulkGrade: (
    assignmentId: string,
    grades: { studentId: string; score: number | null; feedback?: string }[]
  ) => api.post<void>(`/api/teacher/assignments/${assignmentId}/grades/bulk`, { grades }),

  /**
   * Set all missing submissions as zero
   */
  markMissingAsZero: (assignmentId: string) =>
    api.post<void>(`/api/teacher/assignments/${assignmentId}/mark-missing-zero`),

  /**
   * Get assignment rubric
   */
  getRubric: (id: string) => api.get<Rubric>(`/api/teacher/assignments/${id}/rubric`),

  /**
   * Update assignment rubric
   */
  updateRubric: (id: string, rubric: Rubric) =>
    api.put<Rubric>(`/api/teacher/assignments/${id}/rubric`, rubric),

  /**
   * Get assignment statistics
   */
  getStats: (id: string) =>
    api.get<{
      submissionRate: number;
      averageScore: number;
      medianScore: number;
      highScore: number;
      lowScore: number;
      scoreDistribution: Record<string, number>;
    }>(`/api/teacher/assignments/${id}/stats`),

  /**
   * Export grades for an assignment
   */
  exportGrades: (id: string, format: 'csv' | 'xlsx') =>
    api.get<Blob>(`/api/teacher/assignments/${id}/export`, { format }),

  /**
   * Import grades for an assignment
   */
  importGrades: (id: string, file: File) =>
    api.upload<{ imported: number; errors: string[] }>(
      `/api/teacher/assignments/${id}/import`,
      file
    ),
};
