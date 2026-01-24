/**
 * AIVO Platform - Master Seed Data Configuration
 *
 * Shared constants and IDs for coordinated seed data across all services.
 * This file ensures referential integrity between service databases.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TENANT / DISTRICT IDs
// ══════════════════════════════════════════════════════════════════════════════

export const TENANTS = {
  DEV: '00000000-0000-0000-0000-000000000001',
  ANOKA_HENNEPIN: '00000000-0000-0000-0000-100000000001',
} as const;

export const SCHOOLS = {
  LINCOLN_ELEMENTARY: '00000000-0000-0000-0001-100000000001',
  ANOKA_MIDDLE: '00000000-0000-0000-0001-100000000002',
  CHAMPLIN_PARK_HIGH: '00000000-0000-0000-0001-100000000003',
  COON_RAPIDS_MIDDLE: '00000000-0000-0000-0001-100000000004',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// PARENT IDs
// ══════════════════════════════════════════════════════════════════════════════

export const PARENTS = {
  KAREN_HANSON: '00000000-0000-0000-3000-000000000001',
  ADAEZE_OFEM: '00000000-0000-0000-3000-000000000002',
  FUNKE_OLUWOLE: '00000000-0000-0000-3000-000000000003',
  JENNIFER_KOTZ: '00000000-0000-0000-3000-000000000004',
  ROBERT_ANDERSON: '00000000-0000-0000-3000-000000000005',
  MICHELLE_HUGHES: '00000000-0000-0000-3000-000000000006',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER IDs
// ══════════════════════════════════════════════════════════════════════════════

export const LEARNERS = {
  EMMA_HANSON: '00000000-0000-0000-2000-000000000101', // Profound - Grade 2
  JAYDEN_OFEM: '00000000-0000-0000-2000-000000000102', // Mild - Grade 6
  ADEBAYO_OLUWOLE: '00000000-0000-0000-2000-000000000103', // Moderate - Grade 3
  TYLER_KOTZ: '00000000-0000-0000-2000-000000000104', // Moderate - Grade 7
  SOPHIE_ANDERSON: '00000000-0000-0000-2000-000000000105', // Mild - Grade 4
  ETHAN_HUGHES: '00000000-0000-0000-2000-000000000106', // Mild - Grade 6
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER IDs
// ══════════════════════════════════════════════════════════════════════════════

export const TEACHERS = {
  SARAH_MARTINEZ: '00000000-0000-0000-4000-000000000001', // SpEd K-2
  MICHAEL_CHEN: '00000000-0000-0000-4000-000000000002', // SpEd 3-5
  JESSICA_THOMPSON: '00000000-0000-0000-4000-000000000003', // SpEd 6-8
  DAVID_WASHINGTON: '00000000-0000-0000-4000-000000000004', // Gen Ed 3rd
  EMILY_RODRIGUEZ: '00000000-0000-0000-4000-000000000005', // SLP
  JAMES_OBRIEN: '00000000-0000-0000-4000-000000000006', // OT
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// IEP IDs
// ══════════════════════════════════════════════════════════════════════════════

export const IEPS = {
  EMMA_HANSON: '00000000-0000-0000-5000-000000000001',
  JAYDEN_OFEM: '00000000-0000-0000-5000-000000000002',
  ADEBAYO_OLUWOLE: '00000000-0000-0000-5000-000000000003',
  TYLER_KOTZ: '00000000-0000-0000-5000-000000000004',
  SOPHIE_ANDERSON: '00000000-0000-0000-5000-000000000005',
  ETHAN_HUGHES: '00000000-0000-0000-5000-000000000006',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// PARENT ASSESSMENT IDs
// ══════════════════════════════════════════════════════════════════════════════

export const PARENT_ASSESSMENTS = {
  EMMA_HANSON: '00000000-0000-0000-6000-000000000001',
  JAYDEN_OFEM: '00000000-0000-0000-6000-000000000002',
  ADEBAYO_OLUWOLE: '00000000-0000-0000-6000-000000000003',
  TYLER_KOTZ: '00000000-0000-0000-6000-000000000004',
  SOPHIE_ANDERSON: '00000000-0000-0000-6000-000000000005',
  ETHAN_HUGHES: '00000000-0000-0000-6000-000000000006',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTIONING LEVELS & ASSESSMENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type FunctioningLevel = 'TYPICAL' | 'MILD' | 'MODERATE' | 'SEVERE' | 'PROFOUND';
export type AssessmentType = 'STANDARD' | 'STANDARD_WITH_ACCOMMODATIONS' | 'MODIFIED' | 'ALTERNATE';

export interface LearnerProfile {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  dateOfBirth: string;
  school: string;
  parentId: string;
  functioningLevel: FunctioningLevel;
  assessmentType: AssessmentType;
  primaryDisability: string;
  secondaryDisabilities: string[];
}

export const LEARNER_PROFILES: Record<string, LearnerProfile> = {
  EMMA_HANSON: {
    id: LEARNERS.EMMA_HANSON,
    firstName: 'Emma',
    lastName: 'Hanson',
    grade: '2',
    dateOfBirth: '2018-03-15',
    school: SCHOOLS.LINCOLN_ELEMENTARY,
    parentId: PARENTS.KAREN_HANSON,
    functioningLevel: 'PROFOUND',
    assessmentType: 'ALTERNATE',
    primaryDisability: 'Intellectual Disability',
    secondaryDisabilities: ['Autism Spectrum Disorder'],
  },
  JAYDEN_OFEM: {
    id: LEARNERS.JAYDEN_OFEM,
    firstName: 'Jayden',
    lastName: 'Ofem',
    grade: '6',
    dateOfBirth: '2014-07-22',
    school: SCHOOLS.COON_RAPIDS_MIDDLE,
    parentId: PARENTS.ADAEZE_OFEM,
    functioningLevel: 'MILD',
    assessmentType: 'STANDARD_WITH_ACCOMMODATIONS',
    primaryDisability: 'Autism Spectrum Disorder (Level 1)',
    secondaryDisabilities: ['ADHD'],
  },
  ADEBAYO_OLUWOLE: {
    id: LEARNERS.ADEBAYO_OLUWOLE,
    firstName: 'Adebayo',
    lastName: 'Oluwole',
    grade: '3',
    dateOfBirth: '2017-01-08',
    school: SCHOOLS.LINCOLN_ELEMENTARY,
    parentId: PARENTS.FUNKE_OLUWOLE,
    functioningLevel: 'MODERATE',
    assessmentType: 'MODIFIED',
    primaryDisability: 'Autism Spectrum Disorder (Level 2)',
    secondaryDisabilities: ['ADHD'],
  },
  TYLER_KOTZ: {
    id: LEARNERS.TYLER_KOTZ,
    firstName: 'Tyler',
    lastName: 'Kotz',
    grade: '7',
    dateOfBirth: '2013-09-30',
    school: SCHOOLS.ANOKA_MIDDLE,
    parentId: PARENTS.JENNIFER_KOTZ,
    functioningLevel: 'MODERATE',
    assessmentType: 'MODIFIED',
    primaryDisability: 'Specific Learning Disability',
    secondaryDisabilities: ['Anxiety Disorder', 'Dyslexia'],
  },
  SOPHIE_ANDERSON: {
    id: LEARNERS.SOPHIE_ANDERSON,
    firstName: 'Sophie',
    lastName: 'Anderson',
    grade: '4',
    dateOfBirth: '2016-05-12',
    school: SCHOOLS.LINCOLN_ELEMENTARY,
    parentId: PARENTS.ROBERT_ANDERSON,
    functioningLevel: 'MILD',
    assessmentType: 'STANDARD_WITH_ACCOMMODATIONS',
    primaryDisability: 'ADHD',
    secondaryDisabilities: [],
  },
  ETHAN_HUGHES: {
    id: LEARNERS.ETHAN_HUGHES,
    firstName: 'Ethan',
    lastName: 'Hughes',
    grade: '6',
    dateOfBirth: '2014-11-28',
    school: SCHOOLS.ANOKA_MIDDLE,
    parentId: PARENTS.MICHELLE_HUGHES,
    functioningLevel: 'MILD',
    assessmentType: 'STANDARD_WITH_ACCOMMODATIONS',
    primaryDisability: 'Autism Spectrum Disorder (Level 1)',
    secondaryDisabilities: ['Sensory Processing Disorder'],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// PARENT PROFILES
// ══════════════════════════════════════════════════════════════════════════════

export interface ParentProfile {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
  phone: string;
  relationship: string;
  learnerId: string;
}

export const PARENT_PROFILES: Record<string, ParentProfile> = {
  KAREN_HANSON: {
    id: PARENTS.KAREN_HANSON,
    email: 'karen.hanson@email.com',
    givenName: 'Karen',
    familyName: 'Hanson',
    phone: '(763) 555-0101',
    relationship: 'mother',
    learnerId: LEARNERS.EMMA_HANSON,
  },
  ADAEZE_OFEM: {
    id: PARENTS.ADAEZE_OFEM,
    email: 'adaeze.ofem@email.com',
    givenName: 'Adaeze',
    familyName: 'Ofem',
    phone: '(763) 555-0102',
    relationship: 'mother',
    learnerId: LEARNERS.JAYDEN_OFEM,
  },
  FUNKE_OLUWOLE: {
    id: PARENTS.FUNKE_OLUWOLE,
    email: 'funke.oluwole@email.com',
    givenName: 'Funke',
    familyName: 'Oluwole',
    phone: '(763) 555-0103',
    relationship: 'mother',
    learnerId: LEARNERS.ADEBAYO_OLUWOLE,
  },
  JENNIFER_KOTZ: {
    id: PARENTS.JENNIFER_KOTZ,
    email: 'jennifer.kotz@email.com',
    givenName: 'Jennifer',
    familyName: 'Kotz',
    phone: '(763) 555-0104',
    relationship: 'mother',
    learnerId: LEARNERS.TYLER_KOTZ,
  },
  ROBERT_ANDERSON: {
    id: PARENTS.ROBERT_ANDERSON,
    email: 'robert.anderson@email.com',
    givenName: 'Robert',
    familyName: 'Anderson',
    phone: '(763) 555-0105',
    relationship: 'father',
    learnerId: LEARNERS.SOPHIE_ANDERSON,
  },
  MICHELLE_HUGHES: {
    id: PARENTS.MICHELLE_HUGHES,
    email: 'michelle.hughes@email.com',
    givenName: 'Michelle',
    familyName: 'Hughes',
    phone: '(763) 555-0106',
    relationship: 'mother',
    learnerId: LEARNERS.ETHAN_HUGHES,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER PROFILES
// ══════════════════════════════════════════════════════════════════════════════

export interface TeacherProfile {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
  role: string;
  school: string;
  grades: string[];
}

export const TEACHER_PROFILES: Record<string, TeacherProfile> = {
  SARAH_MARTINEZ: {
    id: TEACHERS.SARAH_MARTINEZ,
    email: 'sarah.martinez@ahschools.us',
    givenName: 'Sarah',
    familyName: 'Martinez',
    role: 'Special Education Teacher',
    school: SCHOOLS.LINCOLN_ELEMENTARY,
    grades: ['K', '1', '2'],
  },
  MICHAEL_CHEN: {
    id: TEACHERS.MICHAEL_CHEN,
    email: 'michael.chen@ahschools.us',
    givenName: 'Michael',
    familyName: 'Chen',
    role: 'Special Education Teacher',
    school: SCHOOLS.LINCOLN_ELEMENTARY,
    grades: ['3', '4', '5'],
  },
  JESSICA_THOMPSON: {
    id: TEACHERS.JESSICA_THOMPSON,
    email: 'jessica.thompson@ahschools.us',
    givenName: 'Jessica',
    familyName: 'Thompson',
    role: 'Special Education Teacher',
    school: SCHOOLS.ANOKA_MIDDLE,
    grades: ['6', '7', '8'],
  },
  DAVID_WASHINGTON: {
    id: TEACHERS.DAVID_WASHINGTON,
    email: 'david.washington@ahschools.us',
    givenName: 'David',
    familyName: 'Washington',
    role: 'General Education Teacher',
    school: SCHOOLS.LINCOLN_ELEMENTARY,
    grades: ['3'],
  },
  EMILY_RODRIGUEZ: {
    id: TEACHERS.EMILY_RODRIGUEZ,
    email: 'emily.rodriguez@ahschools.us',
    givenName: 'Emily',
    familyName: 'Rodriguez',
    role: 'Speech-Language Pathologist',
    school: SCHOOLS.LINCOLN_ELEMENTARY,
    grades: ['K', '1', '2', '3', '4', '5', '6', '7', '8'],
  },
  JAMES_OBRIEN: {
    id: TEACHERS.JAMES_OBRIEN,
    email: 'james.obrien@ahschools.us',
    givenName: 'James',
    familyName: "O'Brien",
    role: 'Occupational Therapist',
    school: SCHOOLS.LINCOLN_ELEMENTARY,
    grades: ['K', '1', '2', '3', '4', '5', '6', '7', '8'],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// DISTRICT ADMIN
// ══════════════════════════════════════════════════════════════════════════════

export const DISTRICT_ADMIN = {
  id: '00000000-0000-0000-4000-000000000100',
  email: 'admin@ahschools.us',
  givenName: 'District',
  familyName: 'Administrator',
  role: 'DISTRICT_ADMIN',
};

// ══════════════════════════════════════════════════════════════════════════════
// TEST CREDENTIALS
// ══════════════════════════════════════════════════════════════════════════════

export const TEST_PASSWORD = 'AivoTest2024!';

// Pre-computed bcrypt hash for 'AivoTest2024!' with 10 rounds
// Generated with: bcrypt.hashSync('AivoTest2024!', 10)
export const TEST_PASSWORD_HASH = '$2b$10$rQHxK3hJ5YxGJQF8v7KqXOJVLm7mKMvQp8qH8vN5vE3vJ5vN5vQ8.';

// ══════════════════════════════════════════════════════════════════════════════
// PARENT ASSESSMENT RESPONSES
// ══════════════════════════════════════════════════════════════════════════════

export interface ParentAssessmentData {
  id: string;
  learnerId: string;
  parentId: string;
  assessmentType: AssessmentType;
  supportLevel: number;
  hasExistingIep: boolean;
  hasExisting504: boolean;
  disabilityCategories: string[];
  currentServices: string[];
  responsesJson: Record<string, unknown>;
  strengths: string;
  challenges: string;
  learningStyleNotes: string;
}

export const PARENT_ASSESSMENT_DATA: Record<string, ParentAssessmentData> = {
  EMMA_HANSON: {
    id: PARENT_ASSESSMENTS.EMMA_HANSON,
    learnerId: LEARNERS.EMMA_HANSON,
    parentId: PARENTS.KAREN_HANSON,
    assessmentType: 'ALTERNATE',
    supportLevel: 95,
    hasExistingIep: true,
    hasExisting504: false,
    disabilityCategories: ['intellectual_disability', 'autism'],
    currentServices: ['speech_therapy', 'occupational_therapy', 'physical_therapy', 'paraprofessional'],
    responsesJson: {
      primaryCommunicationMethod: 'picture_symbols',
      understandsSpokenLanguage: 'minimally',
      canFollowInstructions: 'needs_physical_prompts',
      canRecognizeLetters: false,
      canRecognizeNumbers: false,
      canMatchPictures: true,
      understandsCauseEffect: true,
      canSequenceEvents: false,
      selfCareLevel: 1,
      communicationLevel: 1,
      socialSkillsLevel: 1,
      needsConstantSupervision: true,
      needsPhysicalPrompting: true,
      needsVerbalPrompting: true,
      noiseSensitivity: 'high',
      lightSensitivity: 'medium',
    },
    strengths: 'Emma loves music and responds well to singing. She recognizes familiar faces and enjoys sensory play.',
    challenges: 'Emma needs full physical assistance and cannot be left unsupervised.',
    learningStyleNotes: 'Responds best to music, singing, and sensory activities. Prefers predictable routines.',
  },
  JAYDEN_OFEM: {
    id: PARENT_ASSESSMENTS.JAYDEN_OFEM,
    learnerId: LEARNERS.JAYDEN_OFEM,
    parentId: PARENTS.ADAEZE_OFEM,
    assessmentType: 'STANDARD_WITH_ACCOMMODATIONS',
    supportLevel: 28,
    hasExistingIep: true,
    hasExisting504: false,
    disabilityCategories: ['autism', 'other_health_impairment'],
    currentServices: ['counseling', 'social_skills_group'],
    responsesJson: {
      primaryCommunicationMethod: 'verbal',
      understandsSpokenLanguage: 'fully',
      canFollowInstructions: 'multi_step',
      canRecognizeLetters: true,
      canRecognizeNumbers: true,
      canMatchPictures: true,
      understandsCauseEffect: true,
      canSequenceEvents: true,
      selfCareLevel: 5,
      communicationLevel: 4,
      socialSkillsLevel: 3,
      needsConstantSupervision: false,
      needsPhysicalPrompting: false,
      needsVerbalPrompting: false,
      noiseSensitivity: 'medium',
      lightSensitivity: 'low',
    },
    strengths: 'Jayden is very creative and excels in art and music. He has a great memory for details and facts.',
    challenges: 'Jayden struggles with social interactions and reading social cues. Transitions between activities can be difficult.',
    learningStyleNotes: 'Prefers structured routines and clear expectations. Responds well to visual schedules and advance notice of changes.',
  },
  ADEBAYO_OLUWOLE: {
    id: PARENT_ASSESSMENTS.ADEBAYO_OLUWOLE,
    learnerId: LEARNERS.ADEBAYO_OLUWOLE,
    parentId: PARENTS.FUNKE_OLUWOLE,
    assessmentType: 'MODIFIED',
    supportLevel: 60,
    hasExistingIep: true,
    hasExisting504: false,
    disabilityCategories: ['autism', 'other_health_impairment'],
    currentServices: ['speech_therapy', 'counseling', 'social_skills_group'],
    responsesJson: {
      primaryCommunicationMethod: 'verbal',
      understandsSpokenLanguage: 'fully',
      canFollowInstructions: 'two_step',
      canRecognizeLetters: true,
      canRecognizeNumbers: true,
      canMatchPictures: true,
      understandsCauseEffect: true,
      canSequenceEvents: true,
      selfCareLevel: 3,
      communicationLevel: 3,
      socialSkillsLevel: 2,
      needsConstantSupervision: false,
      needsPhysicalPrompting: false,
      needsVerbalPrompting: true,
      noiseSensitivity: 'high',
      lightSensitivity: 'low',
    },
    strengths: 'Adebayo has strong visual memory and loves patterns. He is motivated by dinosaurs and space.',
    challenges: 'Transitions are very difficult. He needs advance warning and visual schedules.',
    learningStyleNotes: 'Visual learner. Needs predictable routines and advance notice of changes. Use special interests as motivators.',
  },
  TYLER_KOTZ: {
    id: PARENT_ASSESSMENTS.TYLER_KOTZ,
    learnerId: LEARNERS.TYLER_KOTZ,
    parentId: PARENTS.JENNIFER_KOTZ,
    assessmentType: 'MODIFIED',
    supportLevel: 45,
    hasExistingIep: true,
    hasExisting504: false,
    disabilityCategories: ['specific_learning_disability'],
    currentServices: ['reading_intervention', 'counseling'],
    responsesJson: {
      primaryCommunicationMethod: 'verbal',
      understandsSpokenLanguage: 'fully',
      canFollowInstructions: 'multi_step',
      canRecognizeLetters: true,
      canRecognizeNumbers: true,
      canMatchPictures: true,
      understandsCauseEffect: true,
      canSequenceEvents: true,
      selfCareLevel: 5,
      communicationLevel: 4,
      socialSkillsLevel: 4,
      needsConstantSupervision: false,
      needsPhysicalPrompting: false,
      needsVerbalPrompting: false,
      noiseSensitivity: 'low',
      lightSensitivity: 'low',
    },
    strengths: 'Tyler is creative and great at problem-solving. He excels at hands-on projects and math.',
    challenges: 'Reading is very frustrating for him. He has significant test anxiety.',
    learningStyleNotes: 'Kinesthetic learner. Needs text-to-speech for reading. Requires calm, quiet testing environment.',
  },
  SOPHIE_ANDERSON: {
    id: PARENT_ASSESSMENTS.SOPHIE_ANDERSON,
    learnerId: LEARNERS.SOPHIE_ANDERSON,
    parentId: PARENTS.ROBERT_ANDERSON,
    assessmentType: 'STANDARD_WITH_ACCOMMODATIONS',
    supportLevel: 25,
    hasExistingIep: true,
    hasExisting504: false,
    disabilityCategories: ['other_health_impairment'],
    currentServices: ['executive_function_coaching'],
    responsesJson: {
      primaryCommunicationMethod: 'verbal',
      understandsSpokenLanguage: 'fully',
      canFollowInstructions: 'multi_step',
      canRecognizeLetters: true,
      canRecognizeNumbers: true,
      canMatchPictures: true,
      understandsCauseEffect: true,
      canSequenceEvents: true,
      selfCareLevel: 5,
      communicationLevel: 5,
      socialSkillsLevel: 4,
      needsConstantSupervision: false,
      needsPhysicalPrompting: false,
      needsVerbalPrompting: false,
      noiseSensitivity: 'medium',
      lightSensitivity: 'low',
    },
    strengths: 'Sophie is very bright and creative. She loves art and reading when she can focus.',
    challenges: 'She loses things constantly and has trouble finishing work without reminders.',
    learningStyleNotes: 'Needs visual checklists and timers. Benefits from movement breaks. Chunked instructions work best.',
  },
  ETHAN_HUGHES: {
    id: PARENT_ASSESSMENTS.ETHAN_HUGHES,
    learnerId: LEARNERS.ETHAN_HUGHES,
    parentId: PARENTS.MICHELLE_HUGHES,
    assessmentType: 'STANDARD_WITH_ACCOMMODATIONS',
    supportLevel: 30,
    hasExistingIep: true,
    hasExisting504: false,
    disabilityCategories: ['autism'],
    currentServices: ['counseling', 'social_skills_group'],
    responsesJson: {
      primaryCommunicationMethod: 'verbal',
      understandsSpokenLanguage: 'fully',
      canFollowInstructions: 'multi_step',
      canRecognizeLetters: true,
      canRecognizeNumbers: true,
      canMatchPictures: true,
      understandsCauseEffect: true,
      canSequenceEvents: true,
      selfCareLevel: 5,
      communicationLevel: 4,
      socialSkillsLevel: 3,
      needsConstantSupervision: false,
      needsPhysicalPrompting: false,
      needsVerbalPrompting: false,
      noiseSensitivity: 'high',
      lightSensitivity: 'medium',
    },
    strengths: 'Ethan is extremely intelligent, especially in STEM subjects. He has an incredible memory for facts.',
    challenges: 'He struggles with unexpected changes and social nuances. Noisy environments are overwhelming.',
    learningStyleNotes: 'Prefers clear, direct instructions. Needs quiet environment. Give advance notice of any changes to schedule.',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// IEP GOALS DATA
// ══════════════════════════════════════════════════════════════════════════════

export interface IEPGoal {
  id: string;
  iepId: string;
  goalNumber: number;
  domain: string;
  description: string;
  baseline: string;
  targetCriteria: string;
  measurementMethod: string;
  status: string;
}

export const IEP_GOALS: Record<string, IEPGoal[]> = {
  EMMA_HANSON: [
    {
      id: '00000000-0000-0000-7000-000000000001',
      iepId: IEPS.EMMA_HANSON,
      goalNumber: 1,
      domain: 'COMMUNICATION',
      description: 'Emma will use PECS to request preferred items during structured activities',
      baseline: 'Emma currently uses inconsistent eye gaze to indicate wants',
      targetCriteria: '10 independent requests per day across 3 consecutive days',
      measurementMethod: 'Daily data collection by paraprofessional',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000002',
      iepId: IEPS.EMMA_HANSON,
      goalNumber: 2,
      domain: 'ADAPTIVE_BEHAVIOR',
      description: 'Emma will participate in hand washing routine with decreasing prompts',
      baseline: 'Requires full physical prompts for all steps',
      targetCriteria: 'Partial participation with verbal cues only for 80% of steps',
      measurementMethod: 'Weekly task analysis assessment',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000003',
      iepId: IEPS.EMMA_HANSON,
      goalNumber: 3,
      domain: 'SOCIAL_EMOTIONAL',
      description: 'Emma will engage with a peer during structured sensory activity',
      baseline: 'Isolated parallel play, no peer interaction',
      targetCriteria: '5 minutes of joint attention with peer 3 times per week',
      measurementMethod: 'Session observation data',
      status: 'NOT_STARTED',
    },
  ],
  JAYDEN_OFEM: [
    {
      id: '00000000-0000-0000-7000-000000000011',
      iepId: IEPS.JAYDEN_OFEM,
      goalNumber: 1,
      domain: 'SOCIAL_EMOTIONAL',
      description: 'Jayden will identify and appropriately respond to social cues in peer interactions',
      baseline: 'Identifies social cues correctly 35% of the time',
      targetCriteria: '75% accuracy in identifying and responding to social cues',
      measurementMethod: 'Weekly social skills assessment and teacher observation',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000012',
      iepId: IEPS.JAYDEN_OFEM,
      goalNumber: 2,
      domain: 'COMMUNICATION',
      description: 'Jayden will initiate and maintain a conversation with peers for 4 exchanges',
      baseline: 'Initiates conversation but ends after 1-2 exchanges',
      targetCriteria: '4 conversational exchanges maintaining topic 80% of opportunities',
      measurementMethod: 'Observation during lunch and recess',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000013',
      iepId: IEPS.JAYDEN_OFEM,
      goalNumber: 3,
      domain: 'ADAPTIVE_BEHAVIOR',
      description: 'Jayden will independently transition between classes using visual schedule',
      baseline: 'Requires verbal prompts for all transitions',
      targetCriteria: 'Independent transitions 90% of the time',
      measurementMethod: 'Daily transition tracking log',
      status: 'IN_PROGRESS',
    },
  ],
  ADEBAYO_OLUWOLE: [
    {
      id: '00000000-0000-0000-7000-000000000021',
      iepId: IEPS.ADEBAYO_OLUWOLE,
      goalNumber: 1,
      domain: 'READING',
      description: 'Adebayo will read 1st grade passages and answer comprehension questions',
      baseline: 'Currently reading at pre-primer level',
      targetCriteria: '1st grade level with 70% comprehension accuracy',
      measurementMethod: 'Monthly reading assessment with comprehension questions',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000022',
      iepId: IEPS.ADEBAYO_OLUWOLE,
      goalNumber: 2,
      domain: 'MATH',
      description: 'Adebayo will add single-digit numbers without using manipulatives',
      baseline: 'Requires manipulatives for all addition',
      targetCriteria: '80% accuracy on mental math single-digit addition',
      measurementMethod: 'Weekly math probes',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000023',
      iepId: IEPS.ADEBAYO_OLUWOLE,
      goalNumber: 3,
      domain: 'SOCIAL_EMOTIONAL',
      description: 'Adebayo will transition between activities with 2-minute warning and visual timer',
      baseline: 'Daily meltdowns during transitions',
      targetCriteria: 'Successful transitions 4 out of 5 times daily',
      measurementMethod: 'Daily transition data log',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000024',
      iepId: IEPS.ADEBAYO_OLUWOLE,
      goalNumber: 4,
      domain: 'COMMUNICATION',
      description: 'Adebayo will initiate peer interaction during unstructured times',
      baseline: '0 peer initiations observed',
      targetCriteria: '2 peer initiations per day',
      measurementMethod: 'Observation data during recess and lunch',
      status: 'NOT_STARTED',
    },
  ],
  TYLER_KOTZ: [
    {
      id: '00000000-0000-0000-7000-000000000031',
      iepId: IEPS.TYLER_KOTZ,
      goalNumber: 1,
      domain: 'READING',
      description: 'Tyler will decode multisyllabic words using syllable division strategies',
      baseline: '40% accuracy on multisyllabic word reading',
      targetCriteria: '80% accuracy on grade-level multisyllabic words',
      measurementMethod: 'Bi-weekly decoding assessments',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000032',
      iepId: IEPS.TYLER_KOTZ,
      goalNumber: 2,
      domain: 'READING',
      description: 'Tyler will answer comprehension questions about grade-level texts (with text-to-speech)',
      baseline: '50% accuracy on comprehension questions',
      targetCriteria: '75% accuracy on literal and inferential questions',
      measurementMethod: 'Weekly comprehension assessments',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000033',
      iepId: IEPS.TYLER_KOTZ,
      goalNumber: 3,
      domain: 'WRITING',
      description: 'Tyler will compose a 5-paragraph essay with clear organization',
      baseline: 'Writes 2 paragraphs with limited organization',
      targetCriteria: '5 paragraphs with introduction, body, and conclusion',
      measurementMethod: 'Monthly writing samples scored on rubric',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000034',
      iepId: IEPS.TYLER_KOTZ,
      goalNumber: 4,
      domain: 'SOCIAL_EMOTIONAL',
      description: 'Tyler will use coping strategies to manage test anxiety',
      baseline: 'Avoidance behaviors and refusal during assessments',
      targetCriteria: 'Self-advocacy and coping strategy use in 80% of test situations',
      measurementMethod: 'Teacher observation and student self-report',
      status: 'NOT_STARTED',
    },
  ],
  SOPHIE_ANDERSON: [
    {
      id: '00000000-0000-0000-7000-000000000041',
      iepId: IEPS.SOPHIE_ANDERSON,
      goalNumber: 1,
      domain: 'ADAPTIVE_BEHAVIOR',
      description: 'Sophie will independently use a checklist to track daily assignments',
      baseline: '0% independent use of organizational tools',
      targetCriteria: 'Independent checklist use 80% of school days',
      measurementMethod: 'Daily checklist review with teacher',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000042',
      iepId: IEPS.SOPHIE_ANDERSON,
      goalNumber: 2,
      domain: 'ADAPTIVE_BEHAVIOR',
      description: 'Sophie will complete classwork within allotted time using timer',
      baseline: '30% work completion within time limits',
      targetCriteria: '75% work completion within allotted time',
      measurementMethod: 'Daily work completion log',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000043',
      iepId: IEPS.SOPHIE_ANDERSON,
      goalNumber: 3,
      domain: 'SOCIAL_EMOTIONAL',
      description: 'Sophie will self-monitor attention using visual timer and checklist',
      baseline: '0 self-monitoring checks per class',
      targetCriteria: '5 self-checks per class period with 80% on-task following check',
      measurementMethod: 'Self-monitoring checklist and teacher verification',
      status: 'NOT_STARTED',
    },
  ],
  ETHAN_HUGHES: [
    {
      id: '00000000-0000-0000-7000-000000000051',
      iepId: IEPS.ETHAN_HUGHES,
      goalNumber: 1,
      domain: 'SOCIAL_EMOTIONAL',
      description: 'Ethan will identify emotions in social situations using visual supports',
      baseline: '40% accuracy identifying emotions',
      targetCriteria: '80% accuracy on emotion identification in context',
      measurementMethod: 'Weekly social skills assessment',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000052',
      iepId: IEPS.ETHAN_HUGHES,
      goalNumber: 2,
      domain: 'SOCIAL_EMOTIONAL',
      description: 'Ethan will use calming strategies when feeling overwhelmed',
      baseline: 'Uses calming strategies 1 of 10 times when prompted',
      targetCriteria: 'Independent use of calming strategies 8 of 10 times',
      measurementMethod: 'Behavior tracking log',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000053',
      iepId: IEPS.ETHAN_HUGHES,
      goalNumber: 3,
      domain: 'COMMUNICATION',
      description: 'Ethan will engage in reciprocal conversation maintaining topic',
      baseline: '2 conversational exchanges before topic drift',
      targetCriteria: '5 exchanges maintaining topic relevance',
      measurementMethod: 'Conversation samples during social skills group',
      status: 'IN_PROGRESS',
    },
    {
      id: '00000000-0000-0000-7000-000000000054',
      iepId: IEPS.ETHAN_HUGHES,
      goalNumber: 4,
      domain: 'ADAPTIVE_BEHAVIOR',
      description: 'Ethan will cope with unexpected schedule changes appropriately',
      baseline: 'Meltdowns with any schedule change',
      targetCriteria: 'Verbal protest only with recovery time under 5 minutes',
      measurementMethod: 'Incident tracking and recovery time log',
      status: 'NOT_STARTED',
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// ACCOMMODATIONS DATA
// ══════════════════════════════════════════════════════════════════════════════

export interface Accommodation {
  id: string;
  iepId: string;
  category: string;
  name: string;
  description: string;
  settings: string[];
}

export const ACCOMMODATIONS: Record<string, Accommodation[]> = {
  EMMA_HANSON: [
    { id: '00000000-0000-0000-8000-000000000001', iepId: IEPS.EMMA_HANSON, category: 'PRESENTATION', name: 'Picture Symbols', description: 'All instructions provided with PECS or picture symbols', settings: ['classroom', 'testing'] },
    { id: '00000000-0000-0000-8000-000000000002', iepId: IEPS.EMMA_HANSON, category: 'RESPONSE', name: 'Partner-Assisted Response', description: 'Caregiver or aide may record responses indicated by learner', settings: ['testing'] },
    { id: '00000000-0000-0000-8000-000000000003', iepId: IEPS.EMMA_HANSON, category: 'SETTING', name: 'Quiet Room', description: 'Testing in quiet, familiar environment', settings: ['testing'] },
    { id: '00000000-0000-0000-8000-000000000004', iepId: IEPS.EMMA_HANSON, category: 'ASSISTIVE_TECHNOLOGY', name: 'AAC Device', description: 'Access to PECS board or AAC device at all times', settings: ['classroom', 'testing'] },
  ],
  JAYDEN_OFEM: [
    { id: '00000000-0000-0000-8000-000000000011', iepId: IEPS.JAYDEN_OFEM, category: 'SCHEDULING', name: 'Advance Notice', description: 'Written schedule provided daily; 5-minute warning before transitions', settings: ['classroom'] },
    { id: '00000000-0000-0000-8000-000000000012', iepId: IEPS.JAYDEN_OFEM, category: 'SETTING', name: 'Preferential Seating', description: 'Seated away from distractions, near door for easy exit if needed', settings: ['classroom'] },
    { id: '00000000-0000-0000-8000-000000000013', iepId: IEPS.JAYDEN_OFEM, category: 'PRESENTATION', name: 'Visual Supports', description: 'Visual schedule and written instructions for multi-step tasks', settings: ['classroom', 'testing'] },
    { id: '00000000-0000-0000-8000-000000000014', iepId: IEPS.JAYDEN_OFEM, category: 'TIMING', name: 'Extended Time', description: '1.5x extended time for assessments', settings: ['testing'] },
  ],
  ADEBAYO_OLUWOLE: [
    { id: '00000000-0000-0000-8000-000000000021', iepId: IEPS.ADEBAYO_OLUWOLE, category: 'PRESENTATION', name: 'Visual Supports', description: 'Visual schedule and first-then boards for all activities', settings: ['classroom'] },
    { id: '00000000-0000-0000-8000-000000000022', iepId: IEPS.ADEBAYO_OLUWOLE, category: 'TIMING', name: 'Extended Time', description: '2x extended time for assessments', settings: ['testing'] },
    { id: '00000000-0000-0000-8000-000000000023', iepId: IEPS.ADEBAYO_OLUWOLE, category: 'PRESENTATION', name: 'Read Aloud', description: 'Text-to-speech or human reader for all reading content', settings: ['classroom', 'testing'] },
    { id: '00000000-0000-0000-8000-000000000024', iepId: IEPS.ADEBAYO_OLUWOLE, category: 'SETTING', name: 'Noise-Canceling Headphones', description: 'Access to noise-canceling headphones', settings: ['classroom', 'testing'] },
    { id: '00000000-0000-0000-8000-000000000025', iepId: IEPS.ADEBAYO_OLUWOLE, category: 'SCHEDULING', name: 'Transition Warnings', description: '5-minute and 2-minute warnings before all transitions', settings: ['classroom'] },
  ],
  TYLER_KOTZ: [
    { id: '00000000-0000-0000-8000-000000000031', iepId: IEPS.TYLER_KOTZ, category: 'TIMING', name: 'Extended Time', description: '1.5x extended time for all assessments', settings: ['testing'] },
    { id: '00000000-0000-0000-8000-000000000032', iepId: IEPS.TYLER_KOTZ, category: 'PRESENTATION', name: 'Text-to-Speech', description: 'Text-to-speech for all reading except decoding assessments', settings: ['classroom', 'testing'] },
    { id: '00000000-0000-0000-8000-000000000033', iepId: IEPS.TYLER_KOTZ, category: 'SETTING', name: 'Separate Setting', description: 'Testing in quiet room with minimal distractions', settings: ['testing'] },
    { id: '00000000-0000-0000-8000-000000000034', iepId: IEPS.TYLER_KOTZ, category: 'SCHEDULING', name: 'Breaks as Needed', description: 'May request breaks during testing', settings: ['testing'] },
  ],
  SOPHIE_ANDERSON: [
    { id: '00000000-0000-0000-8000-000000000041', iepId: IEPS.SOPHIE_ANDERSON, category: 'TIMING', name: 'Extended Time', description: '1.5x extended time for assessments', settings: ['testing'] },
    { id: '00000000-0000-0000-8000-000000000042', iepId: IEPS.SOPHIE_ANDERSON, category: 'PRESENTATION', name: 'Visual Checklists', description: 'Written checklists for multi-step tasks', settings: ['classroom'] },
    { id: '00000000-0000-0000-8000-000000000043', iepId: IEPS.SOPHIE_ANDERSON, category: 'SETTING', name: 'Preferential Seating', description: 'Seated near teacher, away from distractions', settings: ['classroom'] },
    { id: '00000000-0000-0000-8000-000000000044', iepId: IEPS.SOPHIE_ANDERSON, category: 'SCHEDULING', name: 'Movement Breaks', description: 'Scheduled movement breaks every 20 minutes', settings: ['classroom'] },
  ],
  ETHAN_HUGHES: [
    { id: '00000000-0000-0000-8000-000000000051', iepId: IEPS.ETHAN_HUGHES, category: 'SETTING', name: 'Noise-Canceling Headphones', description: 'Access to noise-canceling headphones at all times', settings: ['classroom', 'testing'] },
    { id: '00000000-0000-0000-8000-000000000052', iepId: IEPS.ETHAN_HUGHES, category: 'PRESENTATION', name: 'Reduced Visual Clutter', description: 'Worksheets and screens with minimal visual distractions', settings: ['classroom', 'testing'] },
    { id: '00000000-0000-0000-8000-000000000053', iepId: IEPS.ETHAN_HUGHES, category: 'SCHEDULING', name: 'Advance Notice', description: 'Written schedule provided daily; verbal warning before any changes', settings: ['classroom'] },
    { id: '00000000-0000-0000-8000-000000000054', iepId: IEPS.ETHAN_HUGHES, category: 'SCHEDULING', name: 'Sensory Breaks', description: 'Access to sensory break room as needed', settings: ['classroom'] },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// SERVICES DATA
// ══════════════════════════════════════════════════════════════════════════════

export interface IEPService {
  id: string;
  iepId: string;
  serviceType: string;
  frequency: string;
  duration: number;
  providerType: string;
}

export const SERVICES: Record<string, IEPService[]> = {
  EMMA_HANSON: [
    { id: '00000000-0000-0000-9000-000000000001', iepId: IEPS.EMMA_HANSON, serviceType: 'SPEECH_LANGUAGE', frequency: '3x weekly', duration: 30, providerType: 'Speech-Language Pathologist' },
    { id: '00000000-0000-0000-9000-000000000002', iepId: IEPS.EMMA_HANSON, serviceType: 'OCCUPATIONAL_THERAPY', frequency: '2x weekly', duration: 30, providerType: 'Occupational Therapist' },
    { id: '00000000-0000-0000-9000-000000000003', iepId: IEPS.EMMA_HANSON, serviceType: 'PHYSICAL_THERAPY', frequency: '1x weekly', duration: 30, providerType: 'Physical Therapist' },
    { id: '00000000-0000-0000-9000-000000000004', iepId: IEPS.EMMA_HANSON, serviceType: 'PARAPROFESSIONAL', frequency: 'Full day', duration: 360, providerType: '1:1 Paraprofessional' },
  ],
  JAYDEN_OFEM: [
    { id: '00000000-0000-0000-9000-000000000011', iepId: IEPS.JAYDEN_OFEM, serviceType: 'COUNSELING', frequency: '1x weekly', duration: 30, providerType: 'School Counselor' },
    { id: '00000000-0000-0000-9000-000000000012', iepId: IEPS.JAYDEN_OFEM, serviceType: 'OTHER', frequency: '2x weekly', duration: 30, providerType: 'Social Skills Group' },
  ],
  ADEBAYO_OLUWOLE: [
    { id: '00000000-0000-0000-9000-000000000021', iepId: IEPS.ADEBAYO_OLUWOLE, serviceType: 'SPEECH_LANGUAGE', frequency: '2x weekly', duration: 30, providerType: 'Speech-Language Pathologist' },
    { id: '00000000-0000-0000-9000-000000000022', iepId: IEPS.ADEBAYO_OLUWOLE, serviceType: 'COUNSELING', frequency: '1x weekly', duration: 30, providerType: 'School Counselor' },
    { id: '00000000-0000-0000-9000-000000000023', iepId: IEPS.ADEBAYO_OLUWOLE, serviceType: 'OTHER', frequency: '2x weekly', duration: 30, providerType: 'Social Skills Group' },
  ],
  TYLER_KOTZ: [
    { id: '00000000-0000-0000-9000-000000000031', iepId: IEPS.TYLER_KOTZ, serviceType: 'OTHER', frequency: '5x weekly', duration: 45, providerType: 'Reading Intervention Specialist' },
    { id: '00000000-0000-0000-9000-000000000032', iepId: IEPS.TYLER_KOTZ, serviceType: 'COUNSELING', frequency: '1x weekly', duration: 30, providerType: 'School Counselor' },
  ],
  SOPHIE_ANDERSON: [
    { id: '00000000-0000-0000-9000-000000000041', iepId: IEPS.SOPHIE_ANDERSON, serviceType: 'OTHER', frequency: '1x weekly', duration: 30, providerType: 'Executive Function Coach' },
  ],
  ETHAN_HUGHES: [
    { id: '00000000-0000-0000-9000-000000000051', iepId: IEPS.ETHAN_HUGHES, serviceType: 'COUNSELING', frequency: '1x weekly', duration: 30, providerType: 'School Counselor' },
    { id: '00000000-0000-0000-9000-000000000052', iepId: IEPS.ETHAN_HUGHES, serviceType: 'OTHER', frequency: '2x weekly', duration: 30, providerType: 'Social Skills Group' },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get all learner IDs as an array
 */
export function getAllLearnerIds(): string[] {
  return Object.values(LEARNERS);
}

/**
 * Get all parent IDs as an array
 */
export function getAllParentIds(): string[] {
  return Object.values(PARENTS);
}

/**
 * Get learner by functioning level
 */
export function getLearnersByFunctioningLevel(level: FunctioningLevel): LearnerProfile[] {
  return Object.values(LEARNER_PROFILES).filter((l) => l.functioningLevel === level);
}

/**
 * Get parent-learner mapping
 */
export function getParentLearnerMapping(): Array<{ parentId: string; learnerId: string }> {
  return Object.values(PARENT_PROFILES).map((p) => ({
    parentId: p.id,
    learnerId: p.learnerId,
  }));
}

/**
 * Get learners by grade band
 */
export function getLearnersByGradeBand(gradeBand: 'K5' | 'G6_8' | 'G9_12'): LearnerProfile[] {
  return Object.values(LEARNER_PROFILES).filter((l) => {
    const grade = parseInt(l.grade) || 0;
    switch (gradeBand) {
      case 'K5':
        return grade <= 5;
      case 'G6_8':
        return grade >= 6 && grade <= 8;
      case 'G9_12':
        return grade >= 9;
      default:
        return false;
    }
  });
}
