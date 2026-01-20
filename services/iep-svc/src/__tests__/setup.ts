/**
 * AIVO IEP Service - Test Setup and Mocks
 */

import { vi } from 'vitest';

// Mock Prisma Client
export const mockPrisma = {
  iEP: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  iEPGoal: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  objective: {
    createMany: vi.fn(),
  },
  progressData: {
    create: vi.fn(),
  },
  accommodation: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  modification: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  service: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  serviceLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  meeting: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  student: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  teamMember: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  evaluation: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  complianceAlert: {
    findMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  },
  progressReport: {
    findMany: vi.fn(),
  },
};

// Mock the prisma module
vi.mock('../prisma.js', () => ({
  prisma: mockPrisma,
}));

// Reset all mocks before each test
export function resetMocks() {
  vi.clearAllMocks();
}

// Test data factories
export const testData = {
  tenantId: 'tenant-123',
  userId: 'user-456',

  student: {
    id: 'student-789',
    tenantId: 'tenant-123',
    studentId: 'STU-001',
    stateId: 'STATE-001',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('2015-05-15'),
    gender: 'Male',
    grade: '3',
    school: 'Lincoln Elementary',
    district: 'Springfield District',
    primaryLanguage: 'English',
    primaryDisability: 'Specific Learning Disability',
    secondaryDisabilities: [],
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  iep: {
    id: 'iep-001',
    tenantId: 'tenant-123',
    studentId: 'student-789',
    iepNumber: 'IEP-1',
    version: 1,
    iepType: 'INITIAL',
    status: 'DRAFT',
    meetingDate: new Date('2024-01-15'),
    effectiveDate: new Date('2024-01-20'),
    annualReviewDate: new Date('2025-01-20'),
    reevaluationDate: new Date('2027-01-20'),
    academicLevel: 'Student reads at grade level 2.5',
    functionalLevel: 'Student demonstrates age-appropriate social skills',
    parentConcerns: 'Parents are concerned about reading progress',
    studentStrengths: 'Strong verbal communication skills',
    participatesInGenEd: true,
    genEdPercentage: 80,
    placementType: 'Regular class with resource',
    esyEligible: false,
    parentConsent: false,
    createdBy: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  goal: {
    id: 'goal-001',
    iepId: 'iep-001',
    goalNumber: 1,
    domain: 'READING',
    description: 'Student will improve reading fluency',
    baseline: 'Currently reads 45 WPM with 85% accuracy',
    targetCriteria: '80 WPM with 95% accuracy',
    measurementMethod: 'Weekly fluency probes',
    targetDate: new Date('2024-12-15'),
    standardsAligned: ['ELA.RF.3.4'],
    status: 'NOT_STARTED',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  objective: {
    id: 'obj-001',
    goalId: 'goal-001',
    objectiveNumber: 1,
    description: 'Read grade-level passages at 60 WPM',
    criteria: '3 consecutive probes at 60 WPM',
    status: 'NOT_STARTED',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  accommodation: {
    id: 'acc-001',
    iepId: 'iep-001',
    category: 'PRESENTATION',
    name: 'Extended Time',
    description: 'Student receives 1.5x extended time on tests',
    settings: ['Classroom', 'Testing'],
    subjects: ['All'],
    frequency: 'As needed',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  modification: {
    id: 'mod-001',
    iepId: 'iep-001',
    subject: 'Mathematics',
    description: 'Modified curriculum at grade level 2',
    rationale: 'Student requires instruction at instructional level',
    gradeLevel: '2',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  service: {
    id: 'svc-001',
    iepId: 'iep-001',
    serviceType: 'SPEECH_LANGUAGE',
    description: 'Speech therapy for articulation',
    frequency: '2x weekly',
    duration: 30,
    startDate: new Date('2024-01-20'),
    endDate: new Date('2025-01-20'),
    location: 'Speech room',
    groupSize: 'Individual',
    providerType: 'Speech-Language Pathologist',
    providerName: 'Jane Smith, SLP',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  serviceLog: {
    id: 'log-001',
    serviceId: 'svc-001',
    sessionDate: new Date('2024-02-01'),
    duration: 30,
    attended: true,
    notes: 'Worked on /r/ sounds',
    activities: ['Articulation drills', 'Conversation practice'],
    providerId: 'provider-001',
    providerName: 'Jane Smith, SLP',
    createdAt: new Date(),
  },

  meeting: {
    id: 'meeting-001',
    iepId: 'iep-001',
    meetingType: 'INITIAL',
    scheduledDate: new Date('2024-01-15'),
    scheduledTime: '10:00 AM',
    duration: 60,
    location: 'Conference Room A',
    virtualLink: null,
    purpose: 'Initial IEP meeting',
    agenda: 'Review evaluation results and develop IEP',
    status: 'SCHEDULED',
    notificationSent: true,
    createdBy: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  teamMember: {
    id: 'team-001',
    tenantId: 'tenant-123',
    studentId: 'student-789',
    userId: 'user-parent-001',
    name: 'Mary Doe',
    email: 'mary.doe@email.com',
    phone: '555-0100',
    role: 'PARENT_GUARDIAN',
    title: null,
    organization: null,
    relationToStudent: 'Mother',
    isPrimaryContact: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  complianceAlert: {
    id: 'alert-001',
    tenantId: 'tenant-123',
    alertType: 'ANNUAL_REVIEW_DUE',
    severity: 'High',
    studentId: 'student-789',
    iepId: 'iep-001',
    description: 'Annual review due in 7 days for John Doe',
    dueDate: new Date('2025-01-20'),
    status: 'OPEN',
    createdAt: new Date(),
  },

  progressData: {
    id: 'progress-001',
    goalId: 'goal-001',
    recordDate: new Date('2024-02-15'),
    progressLevel: 'SOME_PROGRESS',
    measurementType: 'WPM',
    measurementValue: 55,
    notes: 'Student showing improvement in fluency',
    recordedBy: 'user-456',
    createdAt: new Date(),
  },
};

// Helper to create full IEP with relations
export function createFullIEP() {
  return {
    ...testData.iep,
    student: testData.student,
    goals: [{ ...testData.goal, objectives: [testData.objective] }],
    accommodations: [testData.accommodation],
    modifications: [testData.modification],
    services: [testData.service],
    transitionPlan: null,
    _count: {
      meetings: 1,
      progressReports: 0,
      amendments: 0,
    },
  };
}
