/**
 * IEP API Service
 *
 * API client for IEP (Individualized Education Program) management
 */

import type { IEPGoal, AddIEPProgressDto } from '../types/iep';

import { api } from './client';

export interface IEPStudentSummary {
  id: string;
  name: string;
  grade: string;
  avatar?: string;
  iepId: string;
  iepStatus: 'draft' | 'active' | 'review_pending' | 'expired';
  eligibilityCategory: string;
  caseManager: string;
  nextMeetingDate: string;
  annualReviewDate: string;
  goals: IEPGoal[];
  services: IEPServiceSummary[];
  accommodations: string[];
  complianceAlerts: ComplianceAlert[];
}

export interface IEPServiceSummary {
  id: string;
  type: string;
  provider: string;
  frequency: string;
  duration: string;
  location: string;
  minutesDelivered: number;
  minutesRequired: number;
}

export interface ComplianceAlert {
  type: string;
  message: string;
  dueDate: string;
  severity: 'warning' | 'urgent';
}

export const iepApi = {
  /**
   * Get all students with IEPs for the current teacher
   */
  getStudentsWithIEP: () => api.get<IEPStudentSummary[]>('/api/teacher/iep/students'),

  /**
   * Get IEP details for a specific student
   */
  getStudentIEP: (studentId: string) =>
    api.get<IEPStudentSummary>(`/api/teacher/iep/students/${studentId}`),

  /**
   * Get all IEP goals for a student
   */
  getGoals: (studentId: string) =>
    api.get<IEPGoal[]>(`/api/teacher/students/${studentId}/iep-goals`),

  /**
   * Get a single IEP goal
   */
  getGoal: (studentId: string, goalId: string) =>
    api.get<IEPGoal>(`/api/teacher/students/${studentId}/iep-goals/${goalId}`),

  /**
   * Add progress to an IEP goal
   */
  addProgress: (studentId: string, goalId: string, data: AddIEPProgressDto) =>
    api.post<IEPGoal>(`/api/teacher/students/${studentId}/iep-goals/${goalId}/progress`, data),

  /**
   * Get compliance alerts for all IEP students
   */
  getComplianceAlerts: () => api.get<ComplianceAlert[]>('/api/teacher/iep/compliance-alerts'),

  /**
   * Get upcoming IEP meetings
   */
  getUpcomingMeetings: (params?: { limit?: number }) =>
    api.get<{ studentId: string; studentName: string; meetingDate: string; type: string }[]>(
      '/api/teacher/iep/meetings/upcoming',
      params
    ),

  /**
   * Log service delivery
   */
  logServiceDelivery: (
    studentId: string,
    serviceId: string,
    data: { minutes: number; date: string; notes?: string }
  ) =>
    api.post<{ success: boolean }>(
      `/api/teacher/iep/students/${studentId}/services/${serviceId}/log`,
      data
    ),
};
