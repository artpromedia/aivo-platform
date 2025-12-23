/**
 * Report Types for Teacher Portal
 *
 * Progress reports, IEP reports, and analytics exports
 */

export type ReportType =
  | 'progress'
  | 'iep_progress'
  | 'class_summary'
  | 'gradebook'
  | 'standards_mastery'
  | 'attendance'
  | 'behavior';

export interface ReportParams {
  startDate?: Date;
  endDate?: Date;
  gradingPeriod?: string;
  includeGrades?: boolean;
  includeAttendance?: boolean;
  includeBehavior?: boolean;
  includeStandards?: boolean;
  includeComments?: boolean;
  includeGoals?: boolean;
  format?: 'pdf' | 'html' | 'json';
  template?: string;
}

export interface ReportResult {
  id: string;
  type: ReportType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  htmlContent?: string;
  data?: Record<string, unknown>;
  generatedAt?: Date;
  expiresAt?: Date;
  error?: string;
}

export interface ProgressReportData {
  student: {
    id: string;
    name: string;
    gradeLevel: string;
    photoUrl?: string;
  };
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  school: {
    name: string;
    address?: string;
    phone?: string;
  };
  reportingPeriod: {
    name: string;
    startDate: Date;
    endDate: Date;
  };
  classes: ClassProgressData[];
  overallSummary: {
    gpa?: number;
    attendanceRate?: number;
    behaviorRating?: number;
    strengths: string[];
    areasForImprovement: string[];
  };
  teacherComments?: string;
  parentSignatureRequired?: boolean;
  generatedAt: Date;
}

export interface ClassProgressData {
  classId: string;
  className: string;
  subject: string;
  teacher: string;
  currentGrade: number;
  letterGrade: string;
  trend: 'up' | 'down' | 'stable';
  assignmentsCompleted: number;
  assignmentsTotal: number;
  categoryGrades: {
    category: string;
    grade: number;
    weight: number;
  }[];
  standards?: {
    code: string;
    description: string;
    level: string;
  }[];
  comments?: string;
}

export interface ClassReportData {
  class: {
    id: string;
    name: string;
    subject: string;
    period?: number;
  };
  reportingPeriod: {
    name: string;
    startDate: Date;
    endDate: Date;
  };
  summary: {
    studentCount: number;
    averageGrade: number;
    medianGrade: number;
    gradeDistribution: Record<string, number>;
    assignmentCompletion: number;
    atRiskCount: number;
  };
  students: {
    id: string;
    name: string;
    grade: number;
    letterGrade: string;
    trend: 'up' | 'down' | 'stable';
    missingAssignments: number;
    flags: string[];
  }[];
  assignments: {
    id: string;
    title: string;
    averageScore: number;
    submissionRate: number;
  }[];
  standards?: {
    code: string;
    description: string;
    masteryRate: number;
  }[];
  generatedAt: Date;
}

export interface IEPReportData {
  student: {
    id: string;
    name: string;
    gradeLevel: string;
    dateOfBirth?: Date;
  };
  iepInfo: {
    effectiveDate: Date;
    annualReviewDate: Date;
    caseManager: string;
  };
  reportingPeriod: {
    name: string;
    startDate: Date;
    endDate: Date;
  };
  goals: IEPGoalReportData[];
  accommodations: {
    description: string;
    implementationStatus: 'fully' | 'partially' | 'not_implemented';
    notes?: string;
  }[];
  services: {
    type: string;
    provider: string;
    frequency: string;
    sessionsDelivered: number;
    sessionsScheduled: number;
    notes?: string;
  }[];
  overallProgress: {
    goalsOnTrack: number;
    goalsAtRisk: number;
    goalsMastered: number;
    summary: string;
  };
  recommendations: string[];
  parentCommunication?: {
    date: Date;
    method: string;
    summary: string;
  }[];
  generatedAt: Date;
}

export interface IEPGoalReportData {
  goalId: string;
  category: string;
  description: string;
  baseline: string;
  targetCriteria: string;
  currentProgress: number;
  targetValue: number;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'on_track' | 'mastered';
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  dataPoints: {
    date: Date;
    value: number;
    notes?: string;
  }[];
  progressSummary: string;
  teacherComments?: string;
  objectives?: {
    description: string;
    status: 'not_started' | 'in_progress' | 'met';
    progress: number;
  }[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description?: string;
  isDefault: boolean;
  isCustom: boolean;
  sections: ReportSection[];
  styling?: ReportStyling;
  createdBy?: string;
  createdAt: Date;
}

export interface ReportSection {
  id: string;
  type:
    | 'header'
    | 'grades'
    | 'standards'
    | 'attendance'
    | 'behavior'
    | 'goals'
    | 'comments'
    | 'signatures'
    | 'custom';
  title?: string;
  enabled: boolean;
  order: number;
  config?: Record<string, unknown>;
}

export interface ReportStyling {
  primaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  headerText?: string;
  footerText?: string;
  showSchoolLogo?: boolean;
}
