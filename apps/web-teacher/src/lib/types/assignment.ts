/**
 * Assignment Types for Teacher Portal
 *
 * Represents assignments, submissions, and rubrics
 */

export type AssignmentStatus = 'draft' | 'published' | 'closed';

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description?: string;
  instructions?: string;
  category: string;
  pointsPossible: number;
  weight?: number;
  dueDate: Date;
  availableFrom?: Date;
  availableUntil?: Date;
  submissionTypes: SubmissionType[];
  allowedFileTypes?: string[];
  maxFileSize?: number;
  rubric?: Rubric;
  assignTo: AssignmentAssignee;
  accommodations?: AssignmentAccommodations;
  standards?: string[];
  attachments?: Attachment[];
  status: AssignmentStatus;
  submissionStats?: SubmissionStats;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export type SubmissionType = 'online_text' | 'file_upload' | 'url' | 'media' | 'none';

export interface AssignmentAssignee {
  everyone: boolean;
  studentIds?: string[];
  groupIds?: string[];
}

export interface AssignmentAccommodations {
  extendedTime?: {
    enabled: boolean;
    multiplier?: number;
  };
  alternateFormat?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface Rubric {
  id?: string;
  title?: string;
  criteria: RubricCriterion[];
}

export interface RubricCriterion {
  id: string;
  description: string;
  points: number;
  levels: RubricLevel[];
  longDescription?: string;
}

export interface RubricLevel {
  id?: string;
  description: string;
  points: number;
  longDescription?: string;
}

export interface SubmissionStats {
  total: number;
  submitted: number;
  graded: number;
  missing: number;
  late: number;
  averageScore?: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentPhotoUrl?: string;
  submittedAt?: Date;
  status: SubmissionStatus;
  attempt: number;
  content?: SubmissionContent;
  grade?: SubmissionGrade;
  feedback?: string;
  rubricScores?: RubricScore[];
  isLate: boolean;
  lateDuration?: number; // minutes
  attachments?: Attachment[];
}

export type SubmissionStatus =
  | 'not_submitted'
  | 'submitted'
  | 'late'
  | 'graded'
  | 'returned'
  | 'missing'
  | 'excused';

export interface SubmissionContent {
  type: SubmissionType;
  text?: string;
  url?: string;
  mediaUrl?: string;
  files?: Attachment[];
}

export interface SubmissionGrade {
  score: number | null;
  percentage?: number;
  letterGrade?: string;
  gradedAt: Date;
  gradedBy: string;
  isExcused: boolean;
  lateDeduction?: number;
}

export interface RubricScore {
  criterionId: string;
  levelId?: string;
  points: number;
  comment?: string;
}

// For gradebook integration
export interface Grade {
  studentId: string;
  assignmentId: string;
  score: number | null;
  status: GradeStatus;
  feedback?: string;
  gradedAt?: Date;
  gradedBy?: string;
  isExcused?: boolean;
  lateDeduction?: number;
}

export type GradeStatus = 'graded' | 'submitted' | 'missing' | 'late' | 'excused' | 'not_submitted';

export interface Gradebook {
  classId: string;
  className: string;
  gradingPeriod: {
    id: string;
    name: string;
  };
  students: GradebookStudent[];
  assignments: GradebookAssignment[];
  grades: Grade[];
  categories: GradebookCategory[];
  gradeScale: {
    type: 'percentage' | 'points' | 'standards';
    levels: {
      letter: string;
      minPercentage: number;
      maxPercentage: number;
    }[];
  };
}

export interface GradebookStudent {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  hasIep: boolean;
  accommodations: string[];
  overallGrade?: number;
  letterGrade?: string;
}

export interface GradebookAssignment {
  id: string;
  title: string;
  category: string;
  pointsPossible: number;
  dueDate: Date;
  weight?: number;
  status: 'draft' | 'published' | 'closed';
}

export interface GradebookCategory {
  id: string;
  name: string;
  weight: number;
  dropLowest?: number;
  assignmentCount: number;
  averageScore?: number;
}

// DTOs
export interface CreateAssignmentDto {
  title: string;
  description?: string;
  instructions?: string;
  category: string;
  pointsPossible: number;
  dueDate: Date;
  availableFrom?: Date;
  availableUntil?: Date;
  submissionTypes: SubmissionType[];
  allowedFileTypes?: string[];
  maxFileSize?: number;
  rubric?: Rubric;
  assignTo: AssignmentAssignee;
  accommodations?: AssignmentAccommodations;
  standards?: string[];
  attachments?: Omit<Attachment, 'id'>[];
  status?: 'draft' | 'published';
}

export interface UpdateAssignmentDto extends Omit<Partial<CreateAssignmentDto>, 'status'> {
  status?: 'draft' | 'published' | 'closed';
}

export interface UpdateGradeDto {
  score: number | null;
  feedback?: string;
  isExcused?: boolean;
}

export interface BulkGradeDto {
  studentId: string;
  score: number | null;
  feedback?: string;
}
