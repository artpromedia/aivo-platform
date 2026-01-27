/**
 * Dashboard Types for Teacher Portal
 */

// ============================================================================
// Dashboard Stats
// ============================================================================

export interface DashboardStats {
  totalStudents: number;
  studentsChange?: number;
  activeClasses: number;
  averageMastery: number;
  masteryChange?: number;
  atRiskStudents: number;
  atRiskChange?: number;
  iepStudents: number;
  plan504Students: number;
  pendingGrades: number;
  unreadMessages: number;
  upcomingDeadlines: number;
  // Dashboard page additional fields
  averageProgress?: number;
  activeStudents?: number;
  assignmentsThisWeek?: number;
  completionRate?: number;
}

export interface WeeklyProgress {
  week: string;
  averageScore: number;
  engagement: number;
  completionRate: number;
}

export interface ClassPerformanceData {
  classId: string;
  className: string;
  averageScore: number;
  studentCount: number;
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
  masteryDistribution: {
    mastered: number;
    proficient: number;
    developing: number;
    beginning: number;
  };
  weeklyProgress: WeeklyProgress[];
}

export interface RecentActivityItem {
  id: string;
  type: 'assignment_submitted' | 'grade_updated' | 'message_received' | 'iep_updated' | 'intervention_added' | 'student_enrolled';
  title: string;
  description: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  className?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface UpcomingLesson {
  id: string;
  classId: string;
  className: string;
  title: string;
  description?: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  standards?: string[];
  materials?: string[];
  lessonType: 'lecture' | 'activity' | 'assessment' | 'review' | 'project';
}

export interface UpcomingEvent {
  id: string;
  type: 'lesson' | 'assignment_due' | 'meeting' | 'iep_review' | 'parent_conference' | 'professional_development';
  title: string;
  description?: string;
  classId?: string;
  className?: string;
  studentId?: string;
  studentName?: string;
  scheduledDate: string;
  scheduledTime?: string;
  duration?: number;
  location?: string;
  attendees?: string[];
}

export interface InterventionAlert {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  type: 'academic' | 'behavioral' | 'attendance' | 'engagement' | 'iep_goal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  createdAt: string;
  dueDate?: string;
  actionRequired: string;
  suggestedActions?: string[];
  relatedGoalId?: string;
}

// ============================================================================
// Dashboard Data Bundle
// ============================================================================

export interface DashboardData {
  stats: DashboardStats;
  activities: RecentActivityItem[];
  lessons: UpcomingLesson[];
  alerts: InterventionAlert[];
  performance: ClassPerformanceData[];
  upcomingEvents: UpcomingEvent[];
}

// ============================================================================
// Filter & Sort Types
// ============================================================================

export type StudentSortBy = 'name' | 'performance' | 'progress' | 'risk' | 'lastActivity';
export type StudentFilterBy = 'all' | 'iep' | '504' | 'struggling' | 'excelling' | 'at_risk' | 'needs_attention';

export interface StudentFilters {
  search?: string;
  sortBy: StudentSortBy;
  filterBy: StudentFilterBy;
  gradeLevel?: string;
  riskLevel?: string[];
}

// ============================================================================
// Class Enrollment
// ============================================================================

import type { Student } from './student';

export interface ClassEnrollment {
  id: string;
  classId: string;
  learnerId: string;
  enrolledAt: string;
  status: 'active' | 'withdrawn' | 'transferred';
  learner: Student;
}
