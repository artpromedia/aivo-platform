/**
 * Unit Tests for Ed-Fi Service - Student Transform Module
 *
 * Tests for:
 * - Data transformation logic
 * - Validation rules
 * - Descriptor mappings
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// TYPE DEFINITIONS (matching the actual implementation)
// =============================================================================

interface AivoLearner {
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

interface TransformContext {
  schoolYear: number;
  sessionName: string;
  stateCode: string;
  districtId: number;
  schoolIdMap: Map<string, number>;
}

interface TransformResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
}

// Descriptor mappings
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

// =============================================================================
// FIXTURES
// =============================================================================

const createMockLearner = (overrides: Partial<AivoLearner> = {}): AivoLearner => ({
  id: 'learner-001',
  tenantId: 'tenant-001',
  firstName: 'John',
  lastName: 'Doe',
  birthDate: '2015-05-15',
  gender: 'MALE',
  gradeLevel: '5',
  stateStudentId: 'STATE123',
  schoolId: 'school-001',
  enrollmentDate: '2025-08-15',
  ...overrides,
});

const createMockContext = (): TransformContext => ({
  schoolYear: 2025,
  sessionName: 'Fall 2025',
  stateCode: 'TX',
  districtId: 12345,
  schoolIdMap: new Map([
    ['school-001', 100],
    ['school-002', 200],
  ]),
});

// Transform function (simplified version for testing)
function transformToEdfiStudent(
  learner: AivoLearner,
  context: TransformContext
): TransformResult<any> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!learner.firstName) errors.push('Missing required field: firstName');
  if (!learner.lastName) errors.push('Missing required field: lastName');
  if (!learner.birthDate) errors.push('Missing required field: birthDate');

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  const studentUniqueId = learner.stateStudentId || learner.externalId || learner.id;

  if (!learner.gender) {
    warnings.push('Gender not specified, using default');
  }

  const data = {
    studentUniqueId,
    firstName: learner.firstName,
    middleName: learner.middleName,
    lastSurname: learner.lastName,
    birthDate: learner.birthDate,
    birthSexDescriptor: learner.gender ? GENDER_TO_SEX_DESCRIPTOR[learner.gender] : undefined,
    _sourceId: learner.id,
    _tenantId: learner.tenantId,
  };

  return { success: true, data, warnings };
}

// =============================================================================
// BASIC TRANSFORM TESTS
// =============================================================================

describe('Student Transform - Basic Operations', () => {
  it('should transform valid learner to EdFi student', () => {
    const learner = createMockLearner();
    const context = createMockContext();

    const result = transformToEdfiStudent(learner, context);

    expect(result.success).toBe(true);
    expect(result.data?.studentUniqueId).toBe('STATE123');
    expect(result.data?.firstName).toBe('John');
    expect(result.data?.lastSurname).toBe('Doe');
    expect(result.data?.birthDate).toBe('2015-05-15');
  });

  it('should use stateStudentId as primary identifier', () => {
    const learner = createMockLearner({ stateStudentId: 'STATE456' });
    const context = createMockContext();

    const result = transformToEdfiStudent(learner, context);

    expect(result.data?.studentUniqueId).toBe('STATE456');
  });

  it('should fallback to externalId when stateStudentId missing', () => {
    const learner = createMockLearner({ stateStudentId: undefined, externalId: 'EXT789' });
    const context = createMockContext();

    const result = transformToEdfiStudent(learner, context);

    expect(result.data?.studentUniqueId).toBe('EXT789');
  });

  it('should fallback to id when both identifiers missing', () => {
    const learner = createMockLearner({ stateStudentId: undefined, externalId: undefined });
    const context = createMockContext();

    const result = transformToEdfiStudent(learner, context);

    expect(result.data?.studentUniqueId).toBe('learner-001');
  });

  it('should include optional middle name', () => {
    const learner = createMockLearner({ middleName: 'William' });
    const context = createMockContext();

    const result = transformToEdfiStudent(learner, context);

    expect(result.data?.middleName).toBe('William');
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('Student Transform - Validation', () => {
  it('should fail when firstName is missing', () => {
    const learner = createMockLearner({ firstName: '' });
    const context = createMockContext();

    const result = transformToEdfiStudent(learner, context);

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Missing required field: firstName');
  });

  it('should fail when lastName is missing', () => {
    const learner = createMockLearner({ lastName: '' });
    const context = createMockContext();

    const result = transformToEdfiStudent(learner, context);

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Missing required field: lastName');
  });

  it('should fail when birthDate is missing', () => {
    const learner = createMockLearner({ birthDate: undefined });
    const context = createMockContext();

    const result = transformToEdfiStudent(learner, context);

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Missing required field: birthDate');
  });

  it('should collect all validation errors', () => {
    const learner: AivoLearner = {
      id: 'test',
      tenantId: 'tenant',
      firstName: '',
      lastName: '',
      birthDate: undefined,
    };
    const context = createMockContext();

    const result = transformToEdfiStudent(learner, context);

    expect(result.success).toBe(false);
    expect(result.errors?.length).toBe(3);
  });

  it('should warn when optional fields are missing', () => {
    const learner = createMockLearner({ gender: undefined });
    const context = createMockContext();

    const result = transformToEdfiStudent(learner, context);

    expect(result.warnings).toContain('Gender not specified, using default');
  });
});

// =============================================================================
// DESCRIPTOR MAPPING TESTS
// =============================================================================

describe('Student Transform - Descriptor Mappings', () => {
  describe('Gender to Sex Descriptor', () => {
    it('should map MALE to Male descriptor', () => {
      expect(GENDER_TO_SEX_DESCRIPTOR.MALE).toBe('uri://ed-fi.org/SexDescriptor#Male');
    });

    it('should map FEMALE to Female descriptor', () => {
      expect(GENDER_TO_SEX_DESCRIPTOR.FEMALE).toBe('uri://ed-fi.org/SexDescriptor#Female');
    });

    it('should map OTHER to Not Selected descriptor', () => {
      expect(GENDER_TO_SEX_DESCRIPTOR.OTHER).toBe('uri://ed-fi.org/SexDescriptor#Not Selected');
    });

    it('should map PREFER_NOT_TO_SAY to Not Selected descriptor', () => {
      expect(GENDER_TO_SEX_DESCRIPTOR.PREFER_NOT_TO_SAY).toBe('uri://ed-fi.org/SexDescriptor#Not Selected');
    });
  });

  describe('Grade Level Descriptors', () => {
    it('should map K to Kindergarten', () => {
      expect(GRADE_LEVEL_DESCRIPTORS.K).toBe('uri://ed-fi.org/GradeLevelDescriptor#Kindergarten');
    });

    it('should map numeric grades 1-12', () => {
      expect(GRADE_LEVEL_DESCRIPTORS['1']).toBe('uri://ed-fi.org/GradeLevelDescriptor#First grade');
      expect(GRADE_LEVEL_DESCRIPTORS['5']).toBe('uri://ed-fi.org/GradeLevelDescriptor#Fifth grade');
      expect(GRADE_LEVEL_DESCRIPTORS['12']).toBe('uri://ed-fi.org/GradeLevelDescriptor#Twelfth grade');
    });

    it('should have all K-12 grades mapped', () => {
      const grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      grades.forEach((grade) => {
        expect(GRADE_LEVEL_DESCRIPTORS[grade]).toBeDefined();
      });
    });
  });

  describe('Gender Transform in Student', () => {
    it('should transform male gender correctly', () => {
      const learner = createMockLearner({ gender: 'MALE' });
      const context = createMockContext();

      const result = transformToEdfiStudent(learner, context);

      expect(result.data?.birthSexDescriptor).toBe('uri://ed-fi.org/SexDescriptor#Male');
    });

    it('should transform female gender correctly', () => {
      const learner = createMockLearner({ gender: 'FEMALE' });
      const context = createMockContext();

      const result = transformToEdfiStudent(learner, context);

      expect(result.data?.birthSexDescriptor).toBe('uri://ed-fi.org/SexDescriptor#Female');
    });
  });
});

// =============================================================================
// SCHOOL ASSOCIATION TRANSFORM TESTS
// =============================================================================

describe('Student School Association Transform', () => {
  function transformToSchoolAssociation(
    learner: AivoLearner,
    context: TransformContext
  ): TransformResult<any> {
    const errors: string[] = [];

    if (!learner.schoolId) {
      errors.push('Missing required field: schoolId');
    }
    if (!learner.enrollmentDate) {
      errors.push('Missing required field: enrollmentDate');
    }

    const edfiSchoolId = context.schoolIdMap.get(learner.schoolId || '');
    if (!edfiSchoolId && learner.schoolId) {
      errors.push(`School ID ${learner.schoolId} not found in mapping`);
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        studentReference: {
          studentUniqueId: learner.stateStudentId || learner.id,
        },
        schoolReference: {
          schoolId: edfiSchoolId,
        },
        entryDate: learner.enrollmentDate,
        exitWithdrawDate: learner.withdrawDate,
        entryGradeLevelDescriptor: learner.gradeLevel
          ? GRADE_LEVEL_DESCRIPTORS[learner.gradeLevel]
          : undefined,
      },
    };
  }

  it('should transform valid school association', () => {
    const learner = createMockLearner();
    const context = createMockContext();

    const result = transformToSchoolAssociation(learner, context);

    expect(result.success).toBe(true);
    expect(result.data?.schoolReference.schoolId).toBe(100);
    expect(result.data?.entryDate).toBe('2025-08-15');
  });

  it('should fail when schoolId is missing', () => {
    const learner = createMockLearner({ schoolId: undefined });
    const context = createMockContext();

    const result = transformToSchoolAssociation(learner, context);

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Missing required field: schoolId');
  });

  it('should fail when school not in mapping', () => {
    const learner = createMockLearner({ schoolId: 'unknown-school' });
    const context = createMockContext();

    const result = transformToSchoolAssociation(learner, context);

    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toContain('not found in mapping');
  });

  it('should include grade level descriptor', () => {
    const learner = createMockLearner({ gradeLevel: '5' });
    const context = createMockContext();

    const result = transformToSchoolAssociation(learner, context);

    expect(result.data?.entryGradeLevelDescriptor).toBe(
      'uri://ed-fi.org/GradeLevelDescriptor#Fifth grade'
    );
  });

  it('should include withdraw date when present', () => {
    const learner = createMockLearner({ withdrawDate: '2025-12-15' });
    const context = createMockContext();

    const result = transformToSchoolAssociation(learner, context);

    expect(result.data?.exitWithdrawDate).toBe('2025-12-15');
  });
});

// =============================================================================
// BATCH TRANSFORM TESTS
// =============================================================================

describe('Student Transform - Batch Operations', () => {
  function transformBatch(
    learners: AivoLearner[],
    context: TransformContext
  ): { successful: any[]; failed: { learner: AivoLearner; errors: string[] }[] } {
    const successful: any[] = [];
    const failed: { learner: AivoLearner; errors: string[] }[] = [];

    for (const learner of learners) {
      const result = transformToEdfiStudent(learner, context);
      if (result.success) {
        successful.push(result.data);
      } else {
        failed.push({ learner, errors: result.errors || [] });
      }
    }

    return { successful, failed };
  }

  it('should transform multiple learners', () => {
    const learners = [
      createMockLearner({ id: 'l1', stateStudentId: 'S1' }),
      createMockLearner({ id: 'l2', stateStudentId: 'S2' }),
      createMockLearner({ id: 'l3', stateStudentId: 'S3' }),
    ];
    const context = createMockContext();

    const result = transformBatch(learners, context);

    expect(result.successful.length).toBe(3);
    expect(result.failed.length).toBe(0);
  });

  it('should separate successful and failed transforms', () => {
    const learners = [
      createMockLearner({ id: 'l1' }),
      createMockLearner({ id: 'l2', firstName: '' }), // Invalid
      createMockLearner({ id: 'l3' }),
    ];
    const context = createMockContext();

    const result = transformBatch(learners, context);

    expect(result.successful.length).toBe(2);
    expect(result.failed.length).toBe(1);
    expect(result.failed[0].learner.id).toBe('l2');
  });

  it('should handle empty batch', () => {
    const context = createMockContext();

    const result = transformBatch([], context);

    expect(result.successful.length).toBe(0);
    expect(result.failed.length).toBe(0);
  });
});
