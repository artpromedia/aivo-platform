/**
 * Grades API Service
 */

import type { Grade, UpdateGradeDto, BulkGradeDto, Gradebook } from '../types/assignment';
import type { GradeCalculationResult, GradeExportOptions } from '../types/grade';

import { api } from './client';

interface GradeAuditLogEntry {
  id: string;
  studentId: string;
  assignmentId: string;
  previousScore: number | null;
  newScore: number | null;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

export const gradesApi = {
  /**
   * Get a single grade
   */
  get: (studentId: string, assignmentId: string) =>
    api.get<Grade>(`/api/teacher/grades/${studentId}/${assignmentId}`),

  /**
   * Update a grade
   */
  update: (studentId: string, assignmentId: string, data: UpdateGradeDto) =>
    api.patch<Grade>(`/api/teacher/grades/${studentId}/${assignmentId}`, data),

  /**
   * Delete/reset a grade
   */
  delete: (studentId: string, assignmentId: string) =>
    api.delete<undefined>(`/api/teacher/grades/${studentId}/${assignmentId}`),

  /**
   * Bulk update grades for an assignment
   */
  bulkUpdate: (assignmentId: string, grades: BulkGradeDto[]) =>
    api.post<undefined>(`/api/teacher/assignments/${assignmentId}/grades/bulk`, { grades }),

  /**
   * Get gradebook for a class
   */
  getGradebook: (classId: string, params?: { gradingPeriod?: string }) =>
    api.get<Gradebook>(`/api/teacher/classes/${classId}/gradebook`, params),

  /**
   * Get student's overall grade in a class
   */
  getStudentGrade: (classId: string, studentId: string) =>
    api.get<GradeCalculationResult>(`/api/teacher/classes/${classId}/students/${studentId}/grade`),

  /**
   * Recalculate grades for a class
   */
  recalculate: (classId: string) =>
    api.post<undefined>(`/api/teacher/classes/${classId}/grades/recalculate`),

  /**
   * Export gradebook
   */
  exportGradebook: (classId: string, options: GradeExportOptions) =>
    api.post<Blob>(`/api/teacher/classes/${classId}/gradebook/export`, options),

  /**
   * Get grade audit log
   */
  getAuditLog: (params: {
    classId?: string;
    studentId?: string;
    assignmentId?: string;
    startDate?: Date;
    endDate?: Date;
  }) => api.get<GradeAuditLogEntry[]>('/api/teacher/grades/audit', params),

  /**
   * Mark student grade as excused
   */
  excuse: (studentId: string, assignmentId: string, reason?: string) =>
    api.post<Grade>(`/api/teacher/grades/${studentId}/${assignmentId}/excuse`, { reason }),

  /**
   * Remove excused status
   */
  unexcuse: (studentId: string, assignmentId: string) =>
    api.delete<Grade>(`/api/teacher/grades/${studentId}/${assignmentId}/excuse`),

  /**
   * Apply late penalty
   */
  applyLatePenalty: (studentId: string, assignmentId: string, penaltyPercent: number) =>
    api.post<Grade>(`/api/teacher/grades/${studentId}/${assignmentId}/late-penalty`, {
      penaltyPercent,
    }),

  /**
   * Remove late penalty
   */
  removeLatePenalty: (studentId: string, assignmentId: string) =>
    api.delete<Grade>(`/api/teacher/grades/${studentId}/${assignmentId}/late-penalty`),
};
