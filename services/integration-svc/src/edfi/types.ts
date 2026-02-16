/**
 * Ed-Fi Resource Type Definitions
 *
 * Based on Ed-Fi Data Standard 4.0
 * https://techdocs.ed-fi.org/display/EFDS4X
 */

// ══════════════════════════════════════════════════════════════════════════════
// COMMON TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface EdfiReference {
  link?: {
    rel: string;
    href: string;
  };
}

export interface EdfiDescriptor {
  descriptor: string;
  codeValue?: string;
  namespace?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// STUDENT RESOURCES
// ══════════════════════════════════════════════════════════════════════════════

export interface EdfiStudent {
  id?: string;
  studentUniqueId: string;
  firstName: string;
  middleName?: string;
  lastSurname: string;
  generationCodeSuffix?: string;
  birthDate: string; // YYYY-MM-DD
  birthSexDescriptor?: string;
  citizenshipStatusDescriptor?: string;

  // Identifiers
  personId?: string;
  sourceSystemDescriptor?: string;

  // Demographics
  hispanicLatinoEthnicity?: boolean;
  races?: {
    raceDescriptor: string;
  }[];

  // Contact Information
  electronicMails?: {
    electronicMailTypeDescriptor: string;
    electronicMailAddress: string;
    primaryEmailAddressIndicator?: boolean;
  }[];

  telephones?: {
    telephoneNumberTypeDescriptor: string;
    telephoneNumber: string;
    orderOfPriority?: number;
  }[];

  addresses?: {
    addressTypeDescriptor: string;
    streetNumberName: string;
    apartmentRoomSuiteNumber?: string;
    city: string;
    stateAbbreviationDescriptor: string;
    postalCode: string;
  }[];

  // Extensions
  _ext?: Record<string, unknown>;
}

export interface EdfiStudentSchoolAssociation {
  id?: string;
  studentReference: {
    studentUniqueId: string;
  };
  schoolReference: {
    schoolId: number;
  };
  entryDate: string; // YYYY-MM-DD
  entryGradeLevelDescriptor: string;
  exitWithdrawDate?: string;
  exitWithdrawTypeDescriptor?: string;
  graduationPlanReference?: {
    educationOrganizationId: number;
    graduationPlanTypeDescriptor: string;
    graduationSchoolYear: number;
  };
  classOfSchoolYear?: number;
  primarySchool?: boolean;

  _ext?: Record<string, unknown>;
}

export interface EdfiStudentSectionAssociation {
  id?: string;
  studentReference: {
    studentUniqueId: string;
  };
  sectionReference: {
    localCourseCode: string;
    schoolId: number;
    schoolYear: number;
    sectionIdentifier: string;
    sessionName: string;
  };
  beginDate: string;
  endDate?: string;
  homeroomIndicator?: boolean;
  repeatIdentifierDescriptor?: string;

  _ext?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// STAFF RESOURCES
// ══════════════════════════════════════════════════════════════════════════════

export interface EdfiStaff {
  id?: string;
  staffUniqueId: string;
  firstName: string;
  middleName?: string;
  lastSurname: string;
  birthDate?: string;
  sexDescriptor?: string;
  hispanicLatinoEthnicity?: boolean;

  credentials?: {
    credentialIdentifier: string;
    stateOfIssueStateAbbreviationDescriptor: string;
  }[];

  electronicMails?: {
    electronicMailTypeDescriptor: string;
    electronicMailAddress: string;
    primaryEmailAddressIndicator?: boolean;
  }[];

  identificationCodes?: {
    staffIdentificationSystemDescriptor: string;
    identificationCode: string;
  }[];

  _ext?: Record<string, unknown>;
}

export interface EdfiStaffSectionAssociation {
  id?: string;
  staffReference: {
    staffUniqueId: string;
  };
  sectionReference: {
    localCourseCode: string;
    schoolId: number;
    schoolYear: number;
    sectionIdentifier: string;
    sessionName: string;
  };
  beginDate?: string;
  endDate?: string;
  classroomPositionDescriptor: string;
  highlyQualifiedTeacher?: boolean;

  _ext?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// EDUCATION ORGANIZATION RESOURCES
// ══════════════════════════════════════════════════════════════════════════════

export interface EdfiSchool {
  id?: string;
  schoolId: number;
  nameOfInstitution: string;
  shortNameOfInstitution?: string;
  webSite?: string;
  operationalStatusDescriptor?: string;
  charterStatusDescriptor?: string;
  schoolTypeDescriptor?: string;
  titleIPartASchoolDesignationDescriptor?: string;

  localEducationAgencyReference?: {
    localEducationAgencyId: number;
  };

  addresses?: {
    addressTypeDescriptor: string;
    streetNumberName: string;
    city: string;
    stateAbbreviationDescriptor: string;
    postalCode: string;
  }[];

  educationOrganizationCategories: {
    educationOrganizationCategoryDescriptor: string;
  }[];

  gradeLevels: {
    gradeLevelDescriptor: string;
  }[];

  institutionTelephones?: {
    institutionTelephoneNumberTypeDescriptor: string;
    telephoneNumber: string;
  }[];

  identificationCodes?: {
    educationOrganizationIdentificationSystemDescriptor: string;
    identificationCode: string;
  }[];

  _ext?: Record<string, unknown>;
}

export interface EdfiLocalEducationAgency {
  id?: string;
  localEducationAgencyId: number;
  nameOfInstitution: string;
  shortNameOfInstitution?: string;
  webSite?: string;
  operationalStatusDescriptor?: string;
  localEducationAgencyCategoryDescriptor: string;

  addresses?: {
    addressTypeDescriptor: string;
    streetNumberName: string;
    city: string;
    stateAbbreviationDescriptor: string;
    postalCode: string;
  }[];

  educationOrganizationCategories: {
    educationOrganizationCategoryDescriptor: string;
  }[];

  _ext?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// COURSE/SECTION RESOURCES
// ══════════════════════════════════════════════════════════════════════════════

export interface EdfiCourse {
  id?: string;
  courseCode: string;
  educationOrganizationReference: {
    educationOrganizationId: number;
  };
  courseTitle: string;
  courseDescription?: string;
  numberOfParts: number;
  academicSubjectDescriptor?: string;
  courseLevelCharacteristics?: {
    courseLevelCharacteristicDescriptor: string;
  }[];
  learningStandards?: {
    learningStandardReference: {
      learningStandardId: string;
    };
  }[];

  _ext?: Record<string, unknown>;
}

export interface EdfiSection {
  id?: string;
  sectionIdentifier: string;
  localCourseCode: string;
  schoolId: number;
  schoolYear: number;
  sessionName: string;
  sectionName?: string;
  sequenceOfCourse?: number;
  availableCredits?: number;
  mediumOfInstructionDescriptor?: string;

  courseOfferingReference: {
    localCourseCode: string;
    schoolId: number;
    schoolYear: number;
    sessionName: string;
  };

  classPeriods?: {
    classPeriodReference: {
      classPeriodName: string;
      schoolId: number;
    };
  }[];

  _ext?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSESSMENT RESOURCES
// ══════════════════════════════════════════════════════════════════════════════

export interface EdfiStudentAssessment {
  id?: string;
  studentAssessmentIdentifier: string;
  studentReference: {
    studentUniqueId: string;
  };
  assessmentReference: {
    assessmentIdentifier: string;
    namespace: string;
  };
  administrationDate: string; // YYYY-MM-DD
  administrationEndDate?: string;
  administrationEnvironmentDescriptor?: string;
  whenAssessedGradeLevelDescriptor?: string;

  scoreResults: {
    assessmentReportingMethodDescriptor: string;
    resultDatatypeTypeDescriptor: string;
    result: string;
  }[];

  performanceLevels?: {
    assessmentReportingMethodDescriptor: string;
    performanceLevelDescriptor: string;
    performanceLevelMet: boolean;
  }[];

  accommodations?: {
    accommodationDescriptor: string;
  }[];

  _ext?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE/GRADES
// ══════════════════════════════════════════════════════════════════════════════

export interface EdfiStudentSchoolAttendanceEvent {
  id?: string;
  studentReference: {
    studentUniqueId: string;
  };
  schoolReference: {
    schoolId: number;
  };
  sessionReference: {
    schoolId: number;
    schoolYear: number;
    sessionName: string;
  };
  eventDate: string; // YYYY-MM-DD
  attendanceEventCategoryDescriptor: string;
  attendanceEventReason?: string;
  educationalEnvironmentDescriptor?: string;
  eventDuration?: number;

  _ext?: Record<string, unknown>;
}

export interface EdfiGrade {
  id?: string;
  studentSectionAssociationReference: {
    beginDate: string;
    localCourseCode: string;
    schoolId: number;
    schoolYear: number;
    sectionIdentifier: string;
    sessionName: string;
    studentUniqueId: string;
  };
  gradingPeriodReference: {
    gradingPeriodDescriptor: string;
    periodSequence: number;
    schoolId: number;
    schoolYear: number;
  };
  gradeTypeDescriptor: string;
  letterGradeEarned?: string;
  numericGradeEarned?: number;
  diagnosticStatement?: string;
  performanceBaseConversionDescriptor?: string;

  _ext?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNING STANDARDS
// ══════════════════════════════════════════════════════════════════════════════

export interface EdfiLearningStandard {
  id?: string;
  learningStandardId: string;
  description: string;
  namespace: string;
  learningStandardCategoryDescriptor?: string;
  parentLearningStandardReference?: {
    learningStandardId: string;
  };

  academicSubjects?: {
    academicSubjectDescriptor: string;
  }[];

  gradeLevels?: {
    gradeLevelDescriptor: string;
  }[];

  identificationCodes?: {
    contentStandardName: string;
    identificationCode: string;
  }[];

  _ext?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface EdfiApiError {
  message: string;
  modelStateDictionary?: Record<string, string[]>;
  type?: string;
  detail?: string;
  status?: number;
  correlationId?: string;
}

export interface EdfiBulkOperationStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  createdRecords: number;
  updatedRecords: number;
  deletedRecords: number;
  errorCount: number;
}

export interface EdfiTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

// Resource type union
export type EdfiResource =
  | EdfiStudent
  | EdfiStudentSchoolAssociation
  | EdfiStudentSectionAssociation
  | EdfiStaff
  | EdfiStaffSectionAssociation
  | EdfiSchool
  | EdfiLocalEducationAgency
  | EdfiCourse
  | EdfiSection
  | EdfiStudentAssessment
  | EdfiStudentSchoolAttendanceEvent
  | EdfiGrade
  | EdfiLearningStandard;
