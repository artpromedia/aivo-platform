/**
 * Reports API Service
 */

import type { ReportType, ReportParams, ReportResult, ReportTemplate } from '../types/report';

import { api } from './client';

export const reportsApi = {
  /**
   * Generate a progress report for a student
   */
  generateProgressReport: (studentId: string, params: ReportParams) =>
    api.post<ReportResult>('/api/teacher/reports/progress', { studentId, ...params }),

  /**
   * Generate an IEP progress report
   */
  generateIepReport: (studentId: string, goalIds: string[], params?: ReportParams) =>
    api.post<ReportResult>('/api/teacher/reports/iep', { studentId, goalIds, ...params }),

  /**
   * Generate a class summary report
   */
  generateClassReport: (classId: string, params: ReportParams) =>
    api.post<ReportResult>('/api/teacher/reports/class', { classId, ...params }),

  /**
   * Generate gradebook report
   */
  generateGradebookReport: (classId: string, params: ReportParams) =>
    api.post<ReportResult>('/api/teacher/reports/gradebook', { classId, ...params }),

  /**
   * Get report status
   */
  getStatus: (reportId: string) => api.get<ReportResult>(`/api/teacher/reports/${reportId}/status`),

  /**
   * Download a generated report
   */
  download: (reportId: string) => api.get<Blob>(`/api/teacher/reports/${reportId}/download`),

  /**
   * Get report preview (HTML)
   */
  preview: (reportId: string) =>
    api.get<{ html: string }>(`/api/teacher/reports/${reportId}/preview`),

  /**
   * List recent reports
   */
  listRecent: (params?: { type?: ReportType; limit?: number }) =>
    api.get<ReportResult[]>('/api/teacher/reports', params),

  /**
   * Delete a report
   */
  delete: (reportId: string) => api.delete<undefined>(`/api/teacher/reports/${reportId}`),

  /**
   * Get available report templates
   */
  getTemplates: (type?: ReportType) =>
    api.get<ReportTemplate[]>('/api/teacher/reports/templates', { type }),

  /**
   * Create custom report template
   */
  createTemplate: (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'createdBy'>) =>
    api.post<ReportTemplate>('/api/teacher/reports/templates', template),

  /**
   * Update report template
   */
  updateTemplate: (id: string, template: Partial<ReportTemplate>) =>
    api.patch<ReportTemplate>(`/api/teacher/reports/templates/${id}`, template),

  /**
   * Delete report template
   */
  deleteTemplate: (id: string) => api.delete<undefined>(`/api/teacher/reports/templates/${id}`),

  /**
   * Bulk generate reports for multiple students
   */
  bulkGenerate: (studentIds: string[], type: ReportType, params: ReportParams) =>
    api.post<{ jobId: string; total: number }>('/api/teacher/reports/bulk', {
      studentIds,
      type,
      ...params,
    }),

  /**
   * Get bulk generation job status
   */
  getBulkStatus: (jobId: string) =>
    api.get<{
      jobId: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      completed: number;
      total: number;
      reports: ReportResult[];
      errors?: string[];
    }>(`/api/teacher/reports/bulk/${jobId}`),

  /**
   * Email report to parents
   */
  emailReport: (reportId: string, recipients: string[], message?: string) =>
    api.post<undefined>(`/api/teacher/reports/${reportId}/email`, { recipients, message }),
};
