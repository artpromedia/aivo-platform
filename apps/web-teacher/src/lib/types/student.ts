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
}

export interface StudentAlert {
  type: 'missing_work' | 'low_grade' | 'attendance' | 'iep_review' | 'intervention_needed';
  severity: 'info' | 'warning' | 'critical';
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
