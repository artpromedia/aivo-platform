/**
 * Grade Types for Teacher Portal
 *
 * Grade calculations, scales, and reporting
 */

export interface GradeScale {
  type: 'percentage' | 'points' | 'standards';
  levels: GradeLevel[];
  passingGrade: number;
  roundingMethod: 'none' | 'half_up' | 'floor' | 'ceiling';
  decimalPlaces: number;
}

export interface GradeLevel {
  letter: string;
  minPercentage: number;
  maxPercentage: number;
  gpa?: number;
  color?: string;
  description?: string;
}

export interface GradeCalculationResult {
  percentage: number;
  letterGrade: string;
  gpa?: number;
  pointsEarned: number;
  pointsPossible: number;
  categoryBreakdown: CategoryGrade[];
  trend: 'up' | 'down' | 'stable';
  trendChange: number;
}

export interface CategoryGrade {
  categoryId: string;
  categoryName: string;
  weight: number;
  percentage: number;
  pointsEarned: number;
  pointsPossible: number;
  assignmentCount: number;
  droppedCount: number;
}

export interface GradeEntry {
  score: number | null;
  possible: number;
  weight: number;
  category: string;
  isExcused?: boolean;
  isDropped?: boolean;
}

export interface GradeHistoryEntry {
  date: Date;
  percentage: number;
  letterGrade: string;
  assignmentId?: string;
  assignmentTitle?: string;
  changeAmount: number;
  changeReason: 'new_grade' | 'grade_update' | 'assignment_added' | 'grade_removed';
}

export interface GradeReport {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  gradingPeriod: string;
  generatedAt: Date;
  currentGrade: GradeCalculationResult;
  gradeHistory: GradeHistoryEntry[];
  assignmentGrades: AssignmentGradeSummary[];
  standardsGrades?: StandardsGrade[];
  comments?: string;
  teacherSignature?: string;
}

export interface AssignmentGradeSummary {
  assignmentId: string;
  title: string;
  category: string;
  pointsEarned: number | null;
  pointsPossible: number;
  percentage?: number;
  letterGrade?: string;
  status: 'graded' | 'submitted' | 'missing' | 'late' | 'excused';
  dueDate: Date;
  gradedAt?: Date;
  feedback?: string;
}

export interface StandardsGrade {
  standardId: string;
  standardCode: string;
  description: string;
  level: 'exceeds' | 'meets' | 'approaching' | 'below' | 'not_assessed';
  score?: number;
  assessments: number;
  trend: 'improving' | 'stable' | 'declining';
}

// Grade calculation utilities configuration
export interface GradeCalculationConfig {
  gradeScale: GradeScale;
  categories: {
    id: string;
    name: string;
    weight: number;
    dropLowest?: number;
  }[];
  includeMissing: boolean;
  missingAsZero: boolean;
  latePenalty?: {
    enabled: boolean;
    percentPerDay: number;
    maxDays: number;
    maxDeduction: number;
  };
}

// Bulk grade operations
export interface BulkGradeOperation {
  type: 'set' | 'add' | 'subtract' | 'multiply' | 'curve';
  value: number;
  applyTo: 'all' | 'missing' | 'below_threshold';
  threshold?: number;
}

export interface GradeImportRow {
  studentIdentifier: string; // email or student number
  score: number | string; // number or 'EX' for excused
  feedback?: string;
}

export interface GradeExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  includeStudentInfo: boolean;
  includeComments: boolean;
  includeCategoryBreakdown: boolean;
  includeGradeHistory: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}
