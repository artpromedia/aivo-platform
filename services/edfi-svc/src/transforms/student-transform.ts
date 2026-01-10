/**
 * Student Data Transforms
 *
 * Maps Aivo learner data to Ed-Fi Student resources.
 */

import type {
  EdfiStudent,
  EdfiStudentSchoolAssociation,
  EdfiStudentSectionAssociation,
} from '../types/edfi-resources';

// Aivo learner type (simplified - would import from learner-model-svc)
export interface AivoLearner {
  id: string;
  tenantId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  email?: string;
  gradeLevel?: string;
  externalId?: string;
  stateStudentId?: string;
  schoolId?: string;
  enrollmentDate?: string;
  withdrawDate?: string;
  sections?: {
    sectionId: string;
    localCourseCode: string;
    startDate: string;
    endDate?: string;
    isHomeroom?: boolean;
  }[];
  metadata?: Record<string, unknown>;
}

// Ed-Fi descriptor mappings
const GENDER_TO_SEX_DESCRIPTOR: Record<string, string> = {
  MALE: 'uri://ed-fi.org/SexDescriptor#Male',
  FEMALE: 'uri://ed-fi.org/SexDescriptor#Female',
  OTHER: 'uri://ed-fi.org/SexDescriptor#Not Selected',
  PREFER_NOT_TO_SAY: 'uri://ed-fi.org/SexDescriptor#Not Selected',
};

const GRADE_LEVEL_DESCRIPTORS: Record<string, string> = {
  K: 'uri://ed-fi.org/GradeLevelDescriptor#Kindergarten',
  '1': 'uri://ed-fi.org/GradeLevelDescriptor#First grade',
  '2': 'uri://ed-fi.org/GradeLevelDescriptor#Second grade',
  '3': 'uri://ed-fi.org/GradeLevelDescriptor#Third grade',
  '4': 'uri://ed-fi.org/GradeLevelDescriptor#Fourth grade',
  '5': 'uri://ed-fi.org/GradeLevelDescriptor#Fifth grade',
  '6': 'uri://ed-fi.org/GradeLevelDescriptor#Sixth grade',
  '7': 'uri://ed-fi.org/GradeLevelDescriptor#Seventh grade',
  '8': 'uri://ed-fi.org/GradeLevelDescriptor#Eighth grade',
  '9': 'uri://ed-fi.org/GradeLevelDescriptor#Ninth grade',
  '10': 'uri://ed-fi.org/GradeLevelDescriptor#Tenth grade',
  '11': 'uri://ed-fi.org/GradeLevelDescriptor#Eleventh grade',
  '12': 'uri://ed-fi.org/GradeLevelDescriptor#Twelfth grade',
};

export interface TransformContext {
  schoolYear: number;
  sessionName: string;
  stateCode: string;
  districtId: number;
  schoolIdMap: Map<string, number>; // Aivo school ID -> Ed-Fi school ID
}

export interface TransformResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
}

/**
 * Transform Aivo learner to Ed-Fi Student
 */
export function transformToEdfiStudent(
  learner: AivoLearner,
  _context: TransformContext
): TransformResult<EdfiStudent> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!learner.firstName) {
    errors.push('Missing required field: firstName');
  }
  if (!learner.lastName) {
    errors.push('Missing required field: lastName');
  }
  if (!learner.birthDate) {
    errors.push('Missing required field: birthDate');
  }

  // Generate student unique ID
  const studentUniqueId = learner.stateStudentId || learner.externalId || learner.id;

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  const student: EdfiStudent = {
    studentUniqueId,
    firstName: learner.firstName,
    lastSurname: learner.lastName,
    birthDate: formatDate(learner.birthDate),
  };

  // Optional fields
  if (learner.middleName) {
    student.middleName = learner.middleName;
  }

  if (learner.gender && GENDER_TO_SEX_DESCRIPTOR[learner.gender]) {
    student.birthSexDescriptor = GENDER_TO_SEX_DESCRIPTOR[learner.gender];
  }

  if (learner.email) {
    student.electronicMails = [
      {
        electronicMailTypeDescriptor: 'uri://ed-fi.org/ElectronicMailTypeDescriptor#Home/Personal',
        electronicMailAddress: learner.email,
        primaryEmailAddressIndicator: true,
      },
    ];
  }

  // Add source system identifier
  student.personId = learner.id;
  student.sourceSystemDescriptor = 'uri://aivolearning.com/SourceSystemDescriptor#Aivo';

  return { success: true, data: student, warnings };
}

/**
 * Transform Aivo learner enrollment to Ed-Fi StudentSchoolAssociation
 */
export function transformToEdfiStudentSchoolAssociation(
  learner: AivoLearner,
  context: TransformContext
): TransformResult<EdfiStudentSchoolAssociation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!learner.schoolId) {
    errors.push('Missing required field: schoolId');
  }
  if (!learner.enrollmentDate) {
    errors.push('Missing required field: enrollmentDate');
  }
  if (!learner.gradeLevel) {
    errors.push('Missing required field: gradeLevel');
  }

  const edfiSchoolId = learner.schoolId ? context.schoolIdMap.get(learner.schoolId) : undefined;
  if (learner.schoolId && !edfiSchoolId) {
    errors.push(`Unknown school ID: ${learner.schoolId}`);
  }

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  const studentUniqueId = learner.stateStudentId || learner.externalId || learner.id;
  const gradeLevelDescriptor = getGradeLevelDescriptor(learner.gradeLevel);

  if (!gradeLevelDescriptor) {
    warnings.push(`Unknown grade level: ${learner.gradeLevel}, using default`);
  }

  const association: EdfiStudentSchoolAssociation = {
    studentReference: {
      studentUniqueId,
    },
    schoolReference: {
      schoolId: edfiSchoolId,
    },
    entryDate: formatDate(learner.enrollmentDate),
    entryGradeLevelDescriptor:
      gradeLevelDescriptor || 'uri://ed-fi.org/GradeLevelDescriptor#Ungraded',
  };

  // Add exit date if present
  if (learner.withdrawDate) {
    association.exitWithdrawDate = formatDate(learner.withdrawDate);
    association.exitWithdrawTypeDescriptor =
      'uri://ed-fi.org/ExitWithdrawTypeDescriptor#Transferred to another district';
  }

  return { success: true, data: association, warnings };
}

/**
 * Transform Aivo section enrollments to Ed-Fi StudentSectionAssociations
 */
export function transformToEdfiStudentSectionAssociations(
  learner: AivoLearner,
  context: TransformContext
): TransformResult<EdfiStudentSectionAssociation[]> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const associations: EdfiStudentSectionAssociation[] = [];

  if (!learner.sections || learner.sections.length === 0) {
    return { success: true, data: [], warnings: ['No sections to transform'] };
  }

  const edfiSchoolId = learner.schoolId ? context.schoolIdMap.get(learner.schoolId) : undefined;
  if (!edfiSchoolId) {
    errors.push('Cannot create section associations without valid school ID');
    return { success: false, errors, warnings };
  }

  const studentUniqueId = learner.stateStudentId || learner.externalId || learner.id;

  for (const section of learner.sections) {
    const association: EdfiStudentSectionAssociation = {
      studentReference: {
        studentUniqueId,
      },
      sectionReference: {
        localCourseCode: section.localCourseCode,
        schoolId: edfiSchoolId,
        schoolYear: context.schoolYear,
        sectionIdentifier: section.sectionId,
        sessionName: context.sessionName,
      },
      beginDate: formatDate(section.startDate),
      homeroomIndicator: section.isHomeroom,
    };

    if (section.endDate) {
      association.endDate = formatDate(section.endDate);
    }

    associations.push(association);
  }

  return { success: true, data: associations, warnings };
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function formatDate(date: string): string {
  // Ensure YYYY-MM-DD format
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return date; // Return as-is if can't parse
  }
  return parsed.toISOString().split('T')[0];
}

function getGradeLevelDescriptor(gradeLevel: string): string | null {
  // Normalize grade level input
  const normalized = gradeLevel
    .toUpperCase()
    .replace(/^GRADE\s*/i, '')
    .trim();

  // Check direct mapping
  if (GRADE_LEVEL_DESCRIPTORS[normalized]) {
    return GRADE_LEVEL_DESCRIPTORS[normalized];
  }

  // Try numeric extraction
  const numMatch = /^(\d+)/.exec(normalized);
  if (numMatch) {
    const num = numMatch[1];
    if (GRADE_LEVEL_DESCRIPTORS[num]) {
      return GRADE_LEVEL_DESCRIPTORS[num];
    }
  }

  // Check for kindergarten variations
  if (normalized === 'KINDERGARTEN' || normalized === 'KG' || normalized === 'K') {
    return GRADE_LEVEL_DESCRIPTORS.K;
  }

  return null;
}

export default {
  transformToEdfiStudent,
  transformToEdfiStudentSchoolAssociation,
  transformToEdfiStudentSectionAssociations,
};
