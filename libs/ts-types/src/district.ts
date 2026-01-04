/**
 * District and Curriculum Types
 *
 * Types for district lookup, geographic location, and curriculum standards.
 * Used for auto-detecting school district based on ZIP code and aligning
 * the Virtual Brain with state curriculum standards.
 */

// ══════════════════════════════════════════════════════════════════════════════
// Geographic Location
// ══════════════════════════════════════════════════════════════════════════════

/** Location input for district auto-detection */
export interface LocationInput {
  /** 5-digit ZIP code */
  zipCode: string;
  /** 2-letter state code (optional, auto-detected from ZIP) */
  stateCode?: string;
  /** City name (optional) */
  city?: string;
}

/** US State code (2-letter abbreviation) */
export type StateCode =
  | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA'
  | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD'
  | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ'
  | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC'
  | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY'
  | 'DC' | 'PR' | 'VI' | 'GU' | 'AS' | 'MP';

// ══════════════════════════════════════════════════════════════════════════════
// District
// ══════════════════════════════════════════════════════════════════════════════

/** School district information from NCES database */
export interface DistrictInfo {
  /** NCES LEA (Local Education Agency) ID */
  ncesDistrictId: string;
  /** Official district name */
  districtName: string;
  /** 2-letter state code */
  stateCode: string;
  /** Full state name */
  stateName: string;
  /** Primary city */
  city?: string;
  /** Grade span (e.g., "PK-12", "K-8") */
  gradeSpan?: string;
  /** Total student enrollment */
  enrollmentCount?: number;
  /** Number of schools in district */
  schoolCount?: number;
  /** District website URL */
  website?: string;
  /** District type (Regular, Charter, etc.) */
  districtType?: string;
}

/** Result of district lookup by ZIP code */
export interface DistrictLookupResult {
  /** Whether lookup was successful */
  success: boolean;
  /** All districts covering this ZIP code */
  districts: DistrictInfo[];
  /** Primary/recommended district for this ZIP */
  primaryDistrict?: DistrictInfo;
  /** State curriculum standards */
  stateCurriculum?: StateCurriculumInfo;
  /** Error or info message */
  message?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Curriculum Standards
// ══════════════════════════════════════════════════════════════════════════════

/** Curriculum framework adopted by states */
export type CurriculumFramework =
  | 'COMMON_CORE'          // Common Core State Standards
  | 'NGSS'                 // Next Generation Science Standards
  | 'C3'                   // College, Career, and Civic Life (Social Studies)
  | 'STATE_SPECIFIC'       // State-developed standards
  | 'TEKS'                 // Texas Essential Knowledge and Skills
  | 'CCSS_MATH'            // Common Core Math
  | 'CCSS_ELA'             // Common Core ELA
  | 'STATE_SCIENCE'        // State science standards
  | 'STATE_SOCIAL_STUDIES'; // State social studies standards

/** State curriculum standards information */
export interface StateCurriculumInfo {
  /** 2-letter state code */
  stateCode: string;
  /** Full state name */
  stateName: string;
  /** Math curriculum framework */
  mathFramework: CurriculumFramework;
  /** ELA curriculum framework */
  elaFramework: CurriculumFramework;
  /** Science curriculum framework */
  scienceFramework: CurriculumFramework;
  /** Social studies curriculum framework */
  socialStudiesFramework: CurriculumFramework;
  /** Additional frameworks (SEL, etc.) */
  additionalFrameworks: string[];
  /** Combined list of all curriculum standards for TenantConfig */
  curriculumStandards: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// Onboarding
// ══════════════════════════════════════════════════════════════════════════════

/** Onboarding step */
export type OnboardingStep =
  | 'location'           // Entering ZIP/state
  | 'learner_info'       // Entering learner details
  | 'district_selection' // Selecting from multiple districts
  | 'baseline'           // Completing baseline assessment
  | 'complete';          // Onboarding finished

/** Current onboarding status */
export interface OnboardingStatus {
  /** Current step in onboarding flow */
  step: OnboardingStep;
  /** Learner ID if created */
  learnerId?: string;
  /** Location info if captured */
  location?: LocationInput;
  /** Detected/selected district */
  district?: DistrictInfo;
  /** Curriculum standards to apply */
  curriculumStandards?: string[];
  /** Whether baseline assessment is complete */
  baselineComplete: boolean;
}

/** Input for registering a new learner during onboarding */
export interface RegisterLearnerInput {
  /** Learner's first name */
  firstName: string;
  /** Learner's last name */
  lastName: string;
  /** Date of birth (ISO string) */
  dateOfBirth: string;
  /** Grade level (K, 1, 2, ... 12) */
  gradeLevel: string;
  /** Location for district detection */
  location: LocationInput;
  /** Manually selected district ID (if multiple options) */
  selectedDistrictId?: string;
}

/** Result of learner registration */
export interface RegisterLearnerResult {
  /** Created learner ID */
  learnerId: string;
  /** Captured location */
  location: LocationInput;
  /** Detected/selected district */
  district?: DistrictInfo;
  /** Curriculum standards applied */
  curriculumStandards: string[];
  /** Whether baseline assessment is needed */
  needsBaseline: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// Virtual Brain Curriculum Integration
// ══════════════════════════════════════════════════════════════════════════════

/** Location and curriculum info for Virtual Brain */
export interface VirtualBrainLocation {
  /** 2-letter state code */
  stateCode?: string;
  /** ZIP code */
  zipCode?: string;
  /** NCES district ID */
  ncesDistrictId?: string;
}

/** Curriculum update for Virtual Brain */
export interface VirtualBrainCurriculumUpdate {
  /** New state code */
  stateCode?: string;
  /** New ZIP code */
  zipCode?: string;
  /** New NCES district ID */
  ncesDistrictId?: string;
  /** New curriculum standards to apply */
  curriculumStandards: string[];
}
