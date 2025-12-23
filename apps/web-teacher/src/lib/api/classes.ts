/**
 * Classes API Service
 */

import type { Assignment, Gradebook } from '../types/assignment';
import type {
  Class,
  ClassSummary,
  ClassAnalytics,
  CreateClassDto,
  UpdateClassDto,
} from '../types/class';
import type { StudentRosterEntry } from '../types/student';

import { api } from './client';

export const classesApi = {
  /**
   * Get all classes for the current teacher
   */
  list: (params?: { status?: 'active' | 'archived' | 'all'; academicYear?: string }) =>
    api.get<ClassSummary[]>('/api/teacher/classes', params),

  /**
   * Get a single class by ID
   */
  get: (id: string) => api.get<Class>(`/api/teacher/classes/${id}`),

  /**
   * Create a new class
   */
  create: (data: CreateClassDto) => api.post<Class>('/api/teacher/classes', data),

  /**
   * Update a class
   */
  update: (id: string, data: UpdateClassDto) =>
    api.patch<Class>(`/api/teacher/classes/${id}`, data),

  /**
   * Archive a class
   */
  archive: (id: string) => api.post<undefined>(`/api/teacher/classes/${id}/archive`),

  /**
   * Get students in a class (roster)
   */
  getStudents: (id: string, params?: { includeInactive?: boolean }) =>
    api.get<StudentRosterEntry[]>(`/api/teacher/classes/${id}/students`, params),

  /**
   * Add student to class
   */
  addStudent: (classId: string, studentId: string) =>
    api.post<undefined>(`/api/teacher/classes/${classId}/students`, { studentId }),

  /**
   * Remove student from class
   */
  removeStudent: (classId: string, studentId: string) =>
    api.delete<undefined>(`/api/teacher/classes/${classId}/students/${studentId}`),

  /**
   * Get assignments for a class
   */
  getAssignments: (
    id: string,
    params?: { status?: 'all' | 'published' | 'draft'; category?: string }
  ) => api.get<Assignment[]>(`/api/teacher/classes/${id}/assignments`, params),

  /**
   * Get gradebook data for a class
   */
  getGradebook: (id: string, params?: { gradingPeriod?: string }) =>
    api.get<Gradebook>(`/api/teacher/classes/${id}/gradebook`, params),

  /**
   * Get class analytics
   */
  getAnalytics: (id: string, params?: { startDate?: Date; endDate?: Date }) =>
    api.get<ClassAnalytics>(`/api/teacher/classes/${id}/analytics`, params),

  /**
   * Export class data
   */
  export: (id: string, format: 'csv' | 'xlsx') =>
    api.get<Blob>(`/api/teacher/classes/${id}/export`, { format }),

  /**
   * Get class settings
   */
  getSettings: (id: string) => api.get<Class['settings']>(`/api/teacher/classes/${id}/settings`),

  /**
   * Update class settings
   */
  updateSettings: (id: string, settings: Partial<Class['settings']>) =>
    api.patch<Class['settings']>(`/api/teacher/classes/${id}/settings`, settings),

  /**
   * Get grading categories for a class
   */
  getCategories: (id: string) =>
    api.get<Class['categories']>(`/api/teacher/classes/${id}/categories`),

  /**
   * Update grading categories
   */
  updateCategories: (id: string, categories: Class['categories']) =>
    api.put<Class['categories']>(`/api/teacher/classes/${id}/categories`, { categories }),
};
