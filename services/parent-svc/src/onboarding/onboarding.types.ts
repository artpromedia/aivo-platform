/**
 * Onboarding Types
 *
 * Types for the family/learner onboarding flow with district detection.
 */

export interface LocationInput {
  zipCode: string;
  stateCode?: string;
  city?: string;
}

export interface DistrictInfo {
  ncesDistrictId: string;
  districtName: string;
  stateCode: string;
  stateName: string;
  city?: string;
  gradeSpan?: string;
  enrollmentCount?: number;
  schoolCount?: number;
  website?: string;
}

export interface CurriculumInfo {
  stateCode: string;
  stateName: string;
  mathFramework: string;
  elaFramework: string;
  scienceFramework: string;
  socialStudiesFramework: string;
  additionalFrameworks: string[];
  curriculumStandards: string[];
}

export interface OnboardingLocationResult {
  success: boolean;
  district?: DistrictInfo;
  curriculum: CurriculumInfo;
  message?: string;
}

export interface RegisterLearnerInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gradeLevel: string;
  location: LocationInput;
  selectedDistrictId?: string;  // If multiple districts, parent can select
}

export interface RegisterLearnerResult {
  learnerId: string;
  location: LocationInput;
  district?: DistrictInfo;
  curriculumStandards: string[];
  needsBaseline: boolean;
}

export interface OnboardingStatus {
  step: 'location' | 'learner_info' | 'district_selection' | 'baseline' | 'complete';
  learnerId?: string;
  location?: LocationInput;
  district?: DistrictInfo;
  curriculumStandards?: string[];
  baselineComplete: boolean;
}
