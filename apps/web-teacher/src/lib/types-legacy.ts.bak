/**
 * Type definitions for Teacher Portal
 *
 * Comprehensive types for classroom management, student tracking, and dashboard
 */

// ============================================================================
// Base Types
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'teacher' | 'admin' | 'specialist';
}

// ============================================================================
// Class & Enrollment Types
// ============================================================================

export interface Class {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  period?: string;
  room?: string;
  teacherId: string;
  schoolYear: string;
  startDate: string;
  endDate: string;
  students: ClassEnrollment[];
  studentCount: number;
  averageScore?: number;
  color?: string;
}

export interface ClassEnrollment {
  id: string;
  classId: string;
  learnerId: string;
  enrolledAt: string;
  status: 'active' | 'withdrawn' | 'transferred';
  learner: Student;
}

// ============================================================================
// Student Types with IEP/504 Support
// ============================================================================

export interface Student {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: string;
  gradeLevel: string;
  dateOfBirth?: string;

  // Academic Performance
  averageScore?: number;
  progressPercentage?: number;
  assignmentsCompleted?: number;
  totalAssignments?: number;
  lastActivity?: string;
  engagementLevel?: 'high' | 'medium' | 'low';

  // IEP/504 Support
  hasIep: boolean;
  has504: boolean;
  iepDetails?: IEPDetails;
  plan504Details?: Plan504Details;
  accommodations?: Accommodation[];

  // Risk & Intervention
  riskLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  riskFactors?: RiskFactor[];
  interventions?: Intervention[];

  // SEL & Behavior
  selScore?: number;
  recentSelObservations?: SELObservation[];

  // Parent/Guardian
  parentContacts?: ParentContact[];
}

export interface IEPDetails {
  id: string;
  studentId: string;
  status: 'active' | 'draft' | 'expired' | 'pending_review';
  startDate: string;
  endDate: string;
  nextReviewDate: string;
  eligibilityCategory: string;
  primaryDisability?: string;
  goals: IEPGoal[];
  services: IEPService[];
  lastModified: string;
  caseManager?: string;
}

export interface IEPGoal {
  id: string;
  domain: string;
  description: string;
  baseline: string;
  targetDate: string;
  measurementMethod: string;
  currentProgress: number;
  targetProgress: number;
  status: 'on_track' | 'at_risk' | 'met' | 'not_started';
  objectives: IEPObjective[];
  progressNotes: ProgressNote[];
}

export interface IEPObjective {
  id: string;
  description: string;
  criteria: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'met' | 'not_started';
}

export interface IEPService {
  id: string;
  serviceType: string;
  provider: string;
  frequency: string;
  duration: string;
  location: string;
  startDate: string;
  endDate: string;
}

export interface Plan504Details {
  id: string;
  studentId: string;
  status: 'active' | 'draft' | 'expired';
  startDate: string;
  endDate: string;
  nextReviewDate: string;
  disablingCondition: string;
  accommodations: Accommodation[];
  lastModified: string;
}

export interface Accommodation {
  id: string;
  category: 'presentation' | 'response' | 'setting' | 'timing' | 'other';
  description: string;
  isCritical: boolean;
  notes?: string;
  implementationStatus?: 'active' | 'pending' | 'completed';
}

export interface ProgressNote {
  id: string;
  date: string;
  note: string;
  author: string;
  visibility: 'team' | 'parent' | 'all';
  rating?: number;
}

// ============================================================================
// Risk & Intervention Types
// ============================================================================

export interface RiskFactor {
  id: string;
  type: 'academic' | 'attendance' | 'behavior' | 'engagement' | 'social_emotional';
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
  indicators: string[];
}

export interface Intervention {
  id: string;
  studentId: string;
  type: 'academic' | 'behavioral' | 'social_emotional' | 'attendance';
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  responsibleParty: string;
  goals: string[];
  progress?: number;
  notes: ProgressNote[];
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
// SEL Types
// ============================================================================

export interface SELObservation {
  id: string;
  studentId: string;
  date: string;
  competency: 'self_awareness' | 'self_management' | 'social_awareness' | 'relationship_skills' | 'responsible_decision_making';
  level: 'independent' | 'with_support' | 'prompted' | 'needs_development';
  context: string;
  notes?: string;
  followUpNeeded: boolean;
  observedBy: string;
}

// ============================================================================
// Dashboard Types
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

export interface WeeklyProgress {
  week: string;
  averageScore: number;
  engagement: number;
  completionRate: number;
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
// Parent Contact Types
// ============================================================================

export interface ParentContact {
  id: string;
  name: string;
  relationship: 'mother' | 'father' | 'guardian' | 'grandparent' | 'other';
  email?: string;
  phone?: string;
  isPrimary: boolean;
  preferredContactMethod?: 'email' | 'phone' | 'text' | 'app';
  canPickup?: boolean;
  emergencyContact?: boolean;
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
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
