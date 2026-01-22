/**
 * Student Types for Teacher Portal
 *
 * Represents student data, progress, and profiles
 */

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // Full name computed
  email: string;
  studentNumber?: string;
  photoUrl?: string;
  /** Alternative to photoUrl, for avatar display */
  avatar?: string;
  gradeLevel: string;
  dateOfBirth?: Date;
  enrollmentDate: Date;
  status: 'active' | 'inactive' | 'transferred' | 'graduated';
  hasIep: boolean;
  has504: boolean;
  isEll: boolean;
  primaryLanguage?: string;
  parentContacts: ParentContact[];
  accommodations: Accommodation[];
  tags?: string[];
  /** Risk assessment level */
  riskLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  /** Average score percentage */
  averageScore?: number;
  /** Progress percentage (0-100) */
  progressPercentage?: number;
  /** Number of completed assignments */
  assignmentsCompleted?: number;
  /** Total number of assignments */
  totalAssignments?: number;
  /** Student engagement level */
  engagementLevel?: 'low' | 'medium' | 'high';
  /** Last activity timestamp */
  lastActivity?: Date;
  /** IEP details for students with IEP */
  iepDetails?: {
    id: string;
    nextReviewDate?: Date;
    goals?: { id: string; title: string; progress: number }[];
  };
  /** 504 plan details */
  plan504Details?: {
    id: string;
    accommodations: string[];
    renewalDate?: Date;
  };
  /** Risk factors for at-risk students */
  riskFactors?: string[];
  /** Recent SEL observations */
  recentSelObservations?: {
    date: Date;
    observation: string;
    category: string;
  }[];
  /** Performance history data points */
  performanceHistory?: { date: Date; score: number }[];
  /** Mastery trends data */
  masteryTrends?: { skill: string; level: number }[];
  /** Completed assignments details */
  completedAssignments?: { id: string; title: string; score: number }[];
  /** Active interventions */
  interventions?: {
    id: string;
    name: string;
    status: 'active' | 'completed' | 'on_hold';
    startDate: Date;
  }[];
}

export interface ParentContact {
  id: string;
  name: string;
  relationship: 'mother' | 'father' | 'guardian' | 'grandparent' | 'other';
  email: string;
  phone?: string;
  isPrimary: boolean;
  preferredLanguage?: string;
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    app: boolean;
  };
}

export interface Accommodation {
  id: string;
  type: AccommodationType;
  description: string;
  source: 'iep' | '504' | 'ell' | 'teacher';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  settings?: Record<string, unknown>;
  /** Accommodation category for display/grouping */
  category?: string;
  /** Implementation status for monitoring */
  implementationStatus?: 'not_started' | 'in_progress' | 'implemented' | 'needs_review';
}

export type AccommodationType =
  | 'extended_time'
  | 'reduced_workload'
  | 'preferential_seating'
  | 'audio_support'
  | 'visual_support'
  | 'frequent_breaks'
  | 'modified_assignments'
  | 'alternate_format'
  | 'scribe'
  | 'calculator'
  | 'word_processor'
  | 'text_to_speech'
  | 'speech_to_text'
  | 'large_print'
  | 'separate_setting'
  | 'small_group'
  | 'translated_materials'
  | 'simplified_instructions'
  | 'other';

export interface StudentDetail extends Student {
  classes: StudentClass[];
  overallGrade?: number;
  overallProgress?: number;
  attendanceRate?: number;
  recentActivity: StudentActivity[];
  strengths: string[];
  areasForGrowth: string[];
  notes: StudentNote[];
}

export interface StudentClass {
  classId: string;
  className: string;
  currentGrade?: number;
  letterGrade?: string;
  trend: 'up' | 'down' | 'stable';
  missingAssignments: number;
  lastActivity?: Date;
}

export interface StudentActivity {
  id: string;
  type:
    | 'assignment_submitted'
    | 'grade_received'
    | 'content_completed'
    | 'session_started'
    | 'goal_progress';
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface StudentNote {
  id: string;
  content: string;
  type: 'observation' | 'communication' | 'intervention' | 'celebration' | 'other';
  isPrivate: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface StudentProgress {
  studentId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  academicProgress: AcademicProgress;
  behavioralProgress?: BehavioralProgress;
  attendanceProgress?: AttendanceProgress;
  skillsProgress: SkillProgress[];
  iepProgress?: IEPProgressSummary[];
  recommendations: string[];
}

export interface AcademicProgress {
  overallGrade: number;
  gradeChange: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  onTimeSubmissionRate: number;
  averageScore: number;
  bySubject: SubjectProgress[];
}

export interface SubjectProgress {
  subject: string;
  grade: number;
  gradeChange: number;
  standardsMastered: number;
  standardsTotal: number;
}

export interface BehavioralProgress {
  overallRating: number;
  incidents: number;
  positiveRecognitions: number;
  trends: string[];
}

export interface AttendanceProgress {
  attendanceRate: number;
  daysPresent: number;
  daysAbsent: number;
  tardies: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface SkillProgress {
  skillName: string;
  category: string;
  currentLevel: number;
  targetLevel: number;
  trend: 'up' | 'down' | 'stable';
  assessments: number;
}

export interface IEPProgressSummary {
  goalId: string;
  goalDescription: string;
  category: string;
  progressPercentage: number;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'on_track' | 'mastered';
  lastUpdated: Date;
}

export interface StudentRosterEntry {
  student: Student;
  enrolledDate: Date;
  currentGrade?: number;
  letterGrade?: string;
  missingCount: number;
  lastActivity?: Date;
  alerts: StudentAlert[];
  /** Flattened properties for component compatibility */
  id?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  accommodations?: Accommodation[];
}

export interface StudentAlert {
  id: string;
  studentId: string;
  studentName: string;
  className?: string;
  type: 'missing_work' | 'low_grade' | 'attendance' | 'iep_review' | 'intervention_needed';
  severity: 'info' | 'warning' | 'critical' | 'low' | 'medium' | 'high';
  message: string;
  actionUrl?: string;
}

// DTOs
export interface AddStudentNoteDto {
  content: string;
  type: StudentNote['type'];
  isPrivate: boolean;
}

export interface UpdateAccommodationDto {
  isActive?: boolean;
  settings?: Record<string, unknown>;
  endDate?: Date;
}
