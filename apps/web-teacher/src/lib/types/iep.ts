/**
 * IEP (Individualized Education Program) Types
 *
 * Represents IEP goals, accommodations, and progress tracking
 * for students with special education needs
 */

export interface IEPGoal {
  id: string;
  studentId: string;
  category: IEPGoalCategory;
  areaOfNeed: string;
  description: string;
  baseline: string;
  baselineValue?: number;
  targetCriteria: string;
  targetValue: number;
  measurementMethod: string;
  currentValue: number;
  targetDate: Date;
  status: IEPGoalStatus;
  progressHistory: IEPProgressEntry[];
  objectives?: IEPObjective[];
  accommodations: string[];
  services: IEPService[];
  createdBy: string;
  createdAt: Date;
  lastUpdated: Date;
  reviewDate?: Date;
  annualReviewDate?: Date;
}

export type IEPGoalCategory =
  | 'Reading'
  | 'Writing'
  | 'Math'
  | 'Communication'
  | 'Social/Emotional'
  | 'Behavior'
  | 'Motor Skills'
  | 'Self-Help'
  | 'Transition'
  | 'Other';

export type IEPGoalStatus =
  | 'not_started'
  | 'in_progress'
  | 'at_risk'
  | 'on_track'
  | 'mastered'
  | 'discontinued';

export interface IEPProgressEntry {
  id: string;
  date: Date;
  value: number;
  notes?: string;
  evidenceUrls?: string[];
  recordedBy: string;
  recordedByName: string;
  dataSource?: 'observation' | 'assessment' | 'work_sample' | 'probe' | 'other';
}

export interface IEPObjective {
  id: string;
  description: string;
  targetValue: number;
  currentValue: number;
  targetDate: Date;
  status: 'not_started' | 'in_progress' | 'met';
  sequence: number;
}

export interface IEPService {
  id: string;
  type: ServiceType;
  provider: string;
  frequency: string;
  duration: string;
  location: 'general_education' | 'special_education' | 'related_services' | 'home';
  startDate: Date;
  endDate?: Date;
}

export type ServiceType =
  | 'specialized_instruction'
  | 'speech_therapy'
  | 'occupational_therapy'
  | 'physical_therapy'
  | 'counseling'
  | 'behavioral_support'
  | 'assistive_technology'
  | 'transportation'
  | 'extended_school_year'
  | 'other';

export interface IEPDocument {
  id: string;
  studentId: string;
  type: 'iep' | 'evaluation' | 'reevaluation' | 'amendment' | 'progress_report';
  effectiveDate: Date;
  expirationDate?: Date;
  status: 'draft' | 'active' | 'expired';
  goals: IEPGoal[];
  accommodations: IEPAccommodation[];
  services: IEPService[];
  participants: IEPParticipant[];
  fileUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEPAccommodation {
  id: string;
  category: AccommodationCategory;
  description: string;
  settings: string[];
  appliesTo: ('classroom' | 'testing' | 'homework' | 'all')[];
  isRequired: boolean;
  notes?: string;
}

export type AccommodationCategory =
  | 'presentation'
  | 'response'
  | 'setting'
  | 'timing_scheduling'
  | 'assistive_technology'
  | 'behavioral'
  | 'other';

export interface IEPParticipant {
  role: string;
  name: string;
  email?: string;
  attended?: boolean;
  signedDate?: Date;
}

export interface IEPProgressReport {
  id: string;
  studentId: string;
  studentName: string;
  reportingPeriod: {
    startDate: Date;
    endDate: Date;
    name: string;
  };
  generatedAt: Date;
  generatedBy: string;
  goals: IEPGoalReport[];
  summary: string;
  recommendations: string[];
  nextSteps: string[];
  parentNotificationDate?: Date;
}

export interface IEPGoalReport {
  goalId: string;
  category: IEPGoalCategory;
  description: string;
  baseline: string;
  targetCriteria: string;
  currentProgress: number;
  targetProgress: number;
  status: IEPGoalStatus;
  progressSummary: string;
  dataPoints: number;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  teacherComments?: string;
}

// DTOs
export interface CreateIEPGoalDto {
  category: IEPGoalCategory;
  areaOfNeed: string;
  description: string;
  baseline: string;
  baselineValue?: number;
  targetCriteria: string;
  targetValue: number;
  measurementMethod: string;
  targetDate: Date;
  objectives?: Omit<IEPObjective, 'id' | 'currentValue' | 'status'>[];
  accommodations?: string[];
  services?: Omit<IEPService, 'id'>[];
}

export interface UpdateIEPGoalDto extends Partial<CreateIEPGoalDto> {
  status?: IEPGoalStatus;
  currentValue?: number;
}

export interface AddIEPProgressDto {
  value: number;
  notes?: string;
  evidenceUrls?: string[];
  dataSource?: IEPProgressEntry['dataSource'];
}

export interface GenerateIEPReportDto {
  goalIds: string[];
  reportingPeriod?: {
    startDate: Date;
    endDate: Date;
  };
  includeSummary?: boolean;
  includeRecommendations?: boolean;
}
