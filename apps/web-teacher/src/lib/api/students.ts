/* eslint-disable @typescript-eslint/no-invalid-void-type */
/**
 * Students API Service
 */

import type { IEPGoal, AddIEPProgressDto } from '../types/iep';
import type {
  Student,
  StudentDetail,
  StudentProgress,
  StudentNote,
  AddStudentNoteDto,
  Accommodation,
  UpdateAccommodationDto,
} from '../types/student';

import { api } from './client';

export const studentsApi = {
  /**
   * Get all students for the current teacher
   */
  list: (params?: { classId?: string; search?: string; hasIep?: boolean }) =>
    api.get<Student[]>('/api/teacher/students', params),

  /**
   * Get a single student by ID
   */
  get: (id: string) => api.get<StudentDetail>(`/api/teacher/students/${id}`),

  /**
   * Get student progress report
   */
  getProgress: (id: string, params?: { startDate?: Date; endDate?: Date; classId?: string }) =>
    api.get<StudentProgress>(`/api/teacher/students/${id}/progress`, params),

  /**
   * Get student notes
   */
  getNotes: (id: string, params?: { type?: StudentNote['type']; limit?: number }) =>
    api.get<StudentNote[]>(`/api/teacher/students/${id}/notes`, params),

  /**
   * Add a note for a student
   */
  addNote: (id: string, data: AddStudentNoteDto) =>
    api.post<StudentNote>(`/api/teacher/students/${id}/notes`, data),

  /**
   * Update a note
   */
  updateNote: (studentId: string, noteId: string, data: Partial<AddStudentNoteDto>) =>
    api.patch<StudentNote>(`/api/teacher/students/${studentId}/notes/${noteId}`, data),

  /**
   * Delete a note
   */
  deleteNote: (studentId: string, noteId: string) =>
    api.delete<void>(`/api/teacher/students/${studentId}/notes/${noteId}`),

  /**
   * Get student accommodations
   */
  getAccommodations: (id: string) =>
    api.get<Accommodation[]>(`/api/teacher/students/${id}/accommodations`),

  /**
   * Update an accommodation
   */
  updateAccommodation: (studentId: string, accommodationId: string, data: UpdateAccommodationDto) =>
    api.patch<Accommodation>(
      `/api/teacher/students/${studentId}/accommodations/${accommodationId}`,
      data
    ),

  /**
   * Get IEP goals for a student
   */
  getIepGoals: (id: string) => api.get<IEPGoal[]>(`/api/teacher/students/${id}/iep-goals`),

  /**
   * Get a single IEP goal
   */
  getIepGoal: (studentId: string, goalId: string) =>
    api.get<IEPGoal>(`/api/teacher/students/${studentId}/iep-goals/${goalId}`),

  /**
   * Add progress to an IEP goal
   */
  addIepProgress: (studentId: string, goalId: string, data: AddIEPProgressDto) =>
    api.post<IEPGoal>(`/api/teacher/students/${studentId}/iep-goals/${goalId}/progress`, data),

  /**
   * Get student's grade history
   */
  getGradeHistory: (id: string, params?: { classId?: string; startDate?: Date; endDate?: Date }) =>
    api.get<{ date: Date; grade: number; classId: string }[]>(
      `/api/teacher/students/${id}/grade-history`,
      params
    ),

  /**
   * Get at-risk indicators for a student
   */
  getAtRiskIndicators: (id: string) =>
    api.get<{ type: string; severity: string; message: string }[]>(
      `/api/teacher/students/${id}/at-risk`
    ),

  /**
   * Get student's recent activity
   */
  getActivity: (id: string, params?: { limit?: number }) =>
    api.get<StudentDetail['recentActivity']>(`/api/teacher/students/${id}/activity`, params),
};
