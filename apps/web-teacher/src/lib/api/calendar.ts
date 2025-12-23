/* eslint-disable @typescript-eslint/no-invalid-void-type */
/**
 * Calendar API Service
 */

import type {
  CalendarEvent,
  CreateEventDto,
  UpdateEventDto,
  LessonPlan,
  CreateLessonPlanDto,
  CalendarFilter,
} from '../types/calendar';

import { api } from './client';

export const calendarApi = {
  /**
   * Get events for a date range
   */
  getEvents: (params: { startDate: Date; endDate: Date; filter?: CalendarFilter }) =>
    api.get<CalendarEvent[]>('/api/teacher/calendar/events', params),

  /**
   * Get a single event
   */
  getEvent: (id: string) => api.get<CalendarEvent>(`/api/teacher/calendar/events/${id}`),

  /**
   * Create a new event
   */
  createEvent: (data: CreateEventDto) =>
    api.post<CalendarEvent>('/api/teacher/calendar/events', data),

  /**
   * Update an event
   */
  updateEvent: (id: string, data: UpdateEventDto) =>
    api.patch<CalendarEvent>(`/api/teacher/calendar/events/${id}`, data),

  /**
   * Delete an event
   */
  deleteEvent: (id: string, deleteFuture?: boolean) =>
    api.delete<void>(`/api/teacher/calendar/events/${id}`, {
      headers: deleteFuture ? { 'X-Delete-Future': 'true' } : undefined,
    }),

  /**
   * Get upcoming events
   */
  getUpcoming: (params?: { limit?: number; classId?: string }) =>
    api.get<CalendarEvent[]>('/api/teacher/calendar/upcoming', params),

  /**
   * Get today's events
   */
  getToday: () => api.get<CalendarEvent[]>('/api/teacher/calendar/today'),

  /**
   * RSVP to an event
   */
  rsvp: (eventId: string, status: 'accepted' | 'declined' | 'tentative') =>
    api.post<void>(`/api/teacher/calendar/events/${eventId}/rsvp`, { status }),

  /**
   * Get lesson plans for a date range
   */
  getLessonPlans: (params: { startDate: Date; endDate: Date; classId?: string }) =>
    api.get<LessonPlan[]>('/api/teacher/calendar/lesson-plans', params),

  /**
   * Get a single lesson plan
   */
  getLessonPlan: (id: string) => api.get<LessonPlan>(`/api/teacher/calendar/lesson-plans/${id}`),

  /**
   * Create a lesson plan
   */
  createLessonPlan: (data: CreateLessonPlanDto) =>
    api.post<LessonPlan>('/api/teacher/calendar/lesson-plans', data),

  /**
   * Update a lesson plan
   */
  updateLessonPlan: (id: string, data: Partial<CreateLessonPlanDto>) =>
    api.patch<LessonPlan>(`/api/teacher/calendar/lesson-plans/${id}`, data),

  /**
   * Delete a lesson plan
   */
  deleteLessonPlan: (id: string) => api.delete<void>(`/api/teacher/calendar/lesson-plans/${id}`),

  /**
   * Copy a lesson plan to another date
   */
  copyLessonPlan: (id: string, targetDate: Date) =>
    api.post<LessonPlan>(`/api/teacher/calendar/lesson-plans/${id}/copy`, { targetDate }),

  /**
   * Mark lesson plan as completed
   */
  completeLessonPlan: (id: string, reflection?: string) =>
    api.post<LessonPlan>(`/api/teacher/calendar/lesson-plans/${id}/complete`, { reflection }),

  /**
   * Get assignment due dates for calendar
   */
  getAssignmentDueDates: (params: { startDate: Date; endDate: Date; classId?: string }) =>
    api.get<CalendarEvent[]>('/api/teacher/calendar/assignment-dates', params),

  /**
   * Sync with external calendar (Google, Outlook)
   */
  syncExternal: (provider: 'google' | 'outlook') =>
    api.post<{ syncedCount: number }>(`/api/teacher/calendar/sync/${provider}`),

  /**
   * Export calendar to iCal format
   */
  exportIcal: (params: { startDate: Date; endDate: Date }) =>
    api.get<Blob>('/api/teacher/calendar/export/ical', params),

  /**
   * Get holidays and school events
   */
  getSchoolEvents: (params: { startDate: Date; endDate: Date }) =>
    api.get<CalendarEvent[]>('/api/teacher/calendar/school-events', params),
};
