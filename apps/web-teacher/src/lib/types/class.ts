/**
 * Class/Course Types for Teacher Portal
 *
 * Represents classes, sections, and course-level data
 */

export interface Class {
  id: string;
  name: string;
  code: string;
  subject: string;
  gradeLevel: string;
  section?: string;
  period?: number;
  room?: string;
  schedule?: ClassSchedule;
  teacherId: string;
  schoolId: string;
  academicYear: string;
  term: string;
  studentCount: number;
  status: 'active' | 'archived' | 'upcoming';
  gradingPeriods: GradingPeriod[];
  gradeScale: GradeScale;
  categories: AssignmentCategory[];
  settings: ClassSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassSchedule {
  days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday')[];
  startTime: string; // HH:mm format
  endTime: string;
  timezone: string;
}

export interface GradingPeriod {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  weight?: number;
  isCurrent: boolean;
}

export interface GradeScale {
  type: 'percentage' | 'points' | 'standards';
  levels: GradeLevel[];
  passingGrade: number;
}

export interface GradeLevel {
  letter: string;
  minPercentage: number;
  maxPercentage: number;
  gpa?: number;
  color?: string;
}

export interface AssignmentCategory {
  id: string;
  name: string;
  weight: number;
  dropLowest?: number;
  color?: string;
}

export interface ClassSettings {
  allowLateSubmissions: boolean;
  latePenaltyPercent?: number;
  latePenaltyMaxDays?: number;
  showGradesToStudents: boolean;
  showClassAverage: boolean;
  enablePeerReview: boolean;
  defaultDueTime: string; // HH:mm format
  notifyParentsOnMissing: boolean;
  notifyParentsOnLowGrades: boolean;
  lowGradeThreshold: number;
}

export interface ClassSummary {
  id: string;
  name: string;
  code: string;
  subject: string;
  gradeLevel: string;
  period?: number;
  studentCount: number;
  averageGrade?: number;
  missingAssignments: number;
  upcomingAssignments: number;
  atRiskStudents: number;
}

export interface ClassAnalytics {
  classId: string;
  averageGrade: number;
  gradeDistribution: Record<string, number>;
  assignmentCompletion: number;
  standardsMastery: StandardMastery[];
  engagementMetrics: EngagementMetrics;
  trends: GradeTrend[];
}

export interface StandardMastery {
  standardId: string;
  standardCode: string;
  description: string;
  masteryPercentage: number;
  studentsAtLevel: Record<'exceeds' | 'meets' | 'approaching' | 'below', number>;
}

export interface EngagementMetrics {
  averageSessionDuration: number;
  averageSessionsPerWeek: number;
  contentCompletionRate: number;
  assignmentOnTimeRate: number;
}

export interface GradeTrend {
  date: Date;
  averageGrade: number;
  submissionRate: number;
}

// DTOs for API calls
export interface CreateClassDto {
  name: string;
  code?: string;
  subject: string;
  gradeLevel: string;
  section?: string;
  period?: number;
  room?: string;
  schedule?: ClassSchedule;
  academicYear: string;
  term: string;
}

export interface UpdateClassDto extends Partial<CreateClassDto> {
  settings?: Partial<ClassSettings>;
  categories?: AssignmentCategory[];
  gradeScale?: GradeScale;
}
