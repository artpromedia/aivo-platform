/**
 * Calendar Types for Teacher Portal
 *
 * Events, schedules, and planning
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  color?: string;
  classId?: string;
  className?: string;
  assignmentId?: string;
  studentId?: string;
  studentName?: string;
  recurrence?: RecurrenceRule;
  reminders?: EventReminder[];
  attendees?: EventAttendee[];
  isPrivate: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EventType =
  | 'assignment_due'
  | 'class_session'
  | 'meeting'
  | 'iep_meeting'
  | 'parent_conference'
  | 'professional_development'
  | 'holiday'
  | 'deadline'
  | 'reminder'
  | 'other';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[]; // 0 = Sunday, 6 = Saturday
  dayOfMonth?: number;
  endDate?: Date;
  occurrences?: number;
  exceptions?: Date[]; // Dates to skip
}

export interface EventReminder {
  id: string;
  method: 'email' | 'push' | 'sms';
  minutesBefore: number;
  sent?: boolean;
}

export interface EventAttendee {
  userId: string;
  name: string;
  email: string;
  role: 'teacher' | 'parent' | 'admin' | 'student';
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  responseDate?: Date;
}

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda';
  startDate: Date;
  endDate: Date;
}

export interface CalendarFilter {
  types?: EventType[];
  classIds?: string[];
  showAssignments?: boolean;
  showMeetings?: boolean;
  showHolidays?: boolean;
  showPrivate?: boolean;
}

export interface CalendarDay {
  date: Date;
  events: CalendarEvent[];
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  weeks: CalendarWeek[];
}

// Planning specific
export interface LessonPlan {
  id: string;
  classId: string;
  date: Date;
  title: string;
  objectives: string[];
  standards?: string[];
  materials?: string[];
  activities: LessonActivity[];
  differentiation?: {
    belowLevel?: string;
    onLevel?: string;
    aboveLevel?: string;
    ell?: string;
    iep?: string;
  };
  assessment?: string;
  homework?: string;
  notes?: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
  status: 'draft' | 'planned' | 'completed';
  reflection?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonActivity {
  id: string;
  title: string;
  description?: string;
  duration: number; // minutes
  type:
    | 'warm_up'
    | 'direct_instruction'
    | 'guided_practice'
    | 'independent_practice'
    | 'assessment'
    | 'closure'
    | 'other';
  materials?: string[];
  grouping?: 'whole_class' | 'small_group' | 'pairs' | 'individual';
  notes?: string;
}

export interface PlanningWeek {
  startDate: Date;
  endDate: Date;
  classes: {
    classId: string;
    className: string;
    period?: number;
    days: {
      date: Date;
      lessonPlan?: LessonPlan;
      events: CalendarEvent[];
    }[];
  }[];
}

// DTOs
export interface CreateEventDto {
  title: string;
  description?: string;
  type: EventType;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  location?: string;
  color?: string;
  classId?: string;
  studentId?: string;
  recurrence?: RecurrenceRule;
  reminders?: Omit<EventReminder, 'id' | 'sent'>[];
  attendees?: {
    userId: string;
    email: string;
  }[];
  isPrivate?: boolean;
}

export interface UpdateEventDto extends Partial<CreateEventDto> {
  updateFuture?: boolean; // For recurring events
}

export interface CreateLessonPlanDto {
  classId: string;
  date: Date;
  title: string;
  objectives?: string[];
  standards?: string[];
  materials?: string[];
  activities?: Omit<LessonActivity, 'id'>[];
  differentiation?: LessonPlan['differentiation'];
  assessment?: string;
  homework?: string;
  notes?: string;
}
