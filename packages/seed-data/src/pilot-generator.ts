/**
 * AIVO Platform — Pilot District Data Generator
 *
 * Generates realistic test data matching pilot district structure:
 * - 1 district (Anoka-Hennepin)
 * - 5 schools
 * - 50 teachers (10 per school)
 * - 500 students
 * - 400 parents (some with multiple children)
 * - 450 IEPs with goals, accommodations, and services
 *
 * Uses deterministic UUIDs so data is reproducible across environments.
 */

import {
  TENANTS,
  SCHOOLS,
  LEARNER_PROFILES,
  PARENT_PROFILES,
  TEACHER_PROFILES,
  DISTRICT_ADMIN,
  IEPS,
  type FunctioningLevel,
  type AssessmentType,
  type LearnerProfile,
  type ParentProfile,
  type TeacherProfile,
  type IEPGoal,
  type Accommodation,
  type IEPService,
} from '@aivo/seed-data';

// =============================================================================
// CONFIGURATION
// =============================================================================

export const PILOT_CONFIG = {
  district: {
    id: TENANTS.ANOKA_HENNEPIN,
    name: 'Anoka-Hennepin School District',
    state: 'MN',
    nces_id: '2703000',
  },
  schools: 5,
  teachersPerSchool: 10,
  totalStudents: 500,
  totalParents: 400,
  totalIeps: 450,
  targetDate: '2026-08-15', // Pilot start date
} as const;

// =============================================================================
// DETERMINISTIC UUID GENERATION
// =============================================================================

function pilotUuid(prefix: string, index: number): string {
  const hex = index.toString(16).padStart(12, '0');
  const prefixMap: Record<string, string> = {
    school: '00000000-0000-0000-0001-',
    teacher: '00000000-0000-0000-4000-',
    student: '00000000-0000-0000-2000-',
    parent: '00000000-0000-0000-3000-',
    iep: '00000000-0000-0000-5000-',
    goal: '00000000-0000-0000-7000-',
    accommodation: '00000000-0000-0000-8000-',
    service: '00000000-0000-0000-9000-',
    assessment: '00000000-0000-0000-6000-',
  };
  return `${prefixMap[prefix] || '00000000-0000-0000-0000-'}${hex}`;
}

// =============================================================================
// SCHOOLS
// =============================================================================

const SCHOOL_TEMPLATES = [
  { name: 'Lincoln Elementary', grades: ['K', '1', '2', '3', '4', '5'], type: 'elementary' },
  { name: 'Anoka Middle School', grades: ['6', '7', '8'], type: 'middle' },
  { name: 'Champlin Park High School', grades: ['9', '10', '11', '12'], type: 'high' },
  { name: 'Coon Rapids Middle School', grades: ['6', '7', '8'], type: 'middle' },
  { name: 'Roosevelt Elementary', grades: ['K', '1', '2', '3', '4', '5'], type: 'elementary' },
];

export interface PilotSchool {
  id: string;
  name: string;
  tenantId: string;
  grades: string[];
  type: string;
  address: string;
  phone: string;
  principalName: string;
}

export function generateSchools(): PilotSchool[] {
  const addresses = [
    '6345 Main Street, Anoka, MN 55303',
    '3100 7th Avenue, Anoka, MN 55303',
    '6025 109th Avenue N, Champlin, MN 55316',
    '10200 Hanson Blvd NW, Coon Rapids, MN 55433',
    '1313 Pierce Street, Anoka, MN 55303',
  ];
  const principals = [
    'Dr. Sarah Mitchell',
    'Mr. James Park',
    'Ms. Lisa Ramirez',
    'Dr. Robert Kim',
    'Mrs. Amanda Nguyen',
  ];

  return SCHOOL_TEMPLATES.map((tpl, i) => ({
    id: i < 4 ? Object.values(SCHOOLS)[i] : pilotUuid('school', 100 + i),
    name: tpl.name,
    tenantId: TENANTS.ANOKA_HENNEPIN,
    grades: tpl.grades,
    type: tpl.type,
    address: addresses[i],
    phone: `(763) 506-${(1000 + i).toString()}`,
    principalName: principals[i],
  }));
}

// =============================================================================
// TEACHERS
// =============================================================================

const FIRST_NAMES = [
  'Sarah',
  'Michael',
  'Jessica',
  'David',
  'Emily',
  'James',
  'Amanda',
  'Robert',
  'Jennifer',
  'Daniel',
  'Lisa',
  'Christopher',
  'Nicole',
  'Andrew',
  'Stephanie',
  'Brian',
  'Melissa',
  'Kevin',
  'Rachel',
  'Matthew',
  'Laura',
  'Jason',
  'Kimberly',
  'Ryan',
  'Angela',
  'Justin',
  'Maria',
  'Brandon',
  'Heather',
  'Eric',
  'Samantha',
  'Jeffrey',
  'Christine',
  'Patrick',
  'Rebecca',
  'Thomas',
  'Danielle',
  'Timothy',
  'Megan',
  'Steven',
  'Amy',
  'Nathan',
  'Brittany',
  'Mark',
  'Crystal',
  'Scott',
  'Lauren',
  'Kenneth',
  'Tiffany',
  'Gregory',
];

const LAST_NAMES = [
  'Martinez',
  'Chen',
  'Thompson',
  'Washington',
  'Rodriguez',
  "O'Brien",
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Wilson',
  'Anderson',
  'Taylor',
  'Thomas',
  'Jackson',
  'White',
  'Harris',
  'Clark',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Adams',
  'Baker',
  'Nelson',
  'Carter',
  'Mitchell',
  'Perez',
  'Roberts',
  'Turner',
  'Phillips',
  'Campbell',
  'Parker',
  'Evans',
  'Edwards',
  'Collins',
  'Stewart',
  'Morris',
  'Murphy',
  'Rivera',
  'Cook',
  'Rogers',
  'Morgan',
];

const TEACHER_ROLES = [
  'Special Education Teacher',
  'General Education Teacher',
  'Speech-Language Pathologist',
  'Occupational Therapist',
  'School Psychologist',
  'Reading Specialist',
  'Behavior Specialist',
  'ESL Teacher',
  'Physical Therapist',
  'Paraprofessional Supervisor',
];

export function generateTeachers(schools: PilotSchool[]): TeacherProfile[] {
  const teachers: TeacherProfile[] = [];

  // First, include the 6 core seed teachers
  const coreTeachers = Object.values(TEACHER_PROFILES);
  teachers.push(...coreTeachers);

  let teacherIdx = coreTeachers.length;

  for (const school of schools) {
    const existingForSchool = teachers.filter((t) => t.school === school.id).length;
    const needed = 10 - existingForSchool;

    for (let i = 0; i < needed && teacherIdx < 50; i++) {
      const firstName = FIRST_NAMES[teacherIdx % FIRST_NAMES.length];
      const lastName = LAST_NAMES[teacherIdx % LAST_NAMES.length];
      const role = TEACHER_ROLES[teacherIdx % TEACHER_ROLES.length];

      teachers.push({
        id: pilotUuid('teacher', 100 + teacherIdx),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace("'", '')}@ahschools.us`,
        givenName: firstName,
        familyName: lastName,
        role,
        school: school.id,
        grades: school.grades,
      });

      teacherIdx++;
    }
  }

  return teachers;
}

// =============================================================================
// STUDENTS
// =============================================================================

const STUDENT_FIRST_NAMES = [
  'Liam',
  'Olivia',
  'Noah',
  'Emma',
  'Oliver',
  'Ava',
  'Elijah',
  'Charlotte',
  'James',
  'Amelia',
  'William',
  'Sophia',
  'Benjamin',
  'Isabella',
  'Lucas',
  'Mia',
  'Henry',
  'Evelyn',
  'Alexander',
  'Harper',
  'Mason',
  'Camila',
  'Ethan',
  'Gianna',
  'Daniel',
  'Abigail',
  'Jacob',
  'Luna',
  'Logan',
  'Ella',
  'Jackson',
  'Elizabeth',
  'Levi',
  'Sofia',
  'Sebastian',
  'Emily',
  'Mateo',
  'Avery',
  'Jack',
  'Mila',
  'Owen',
  'Scarlett',
  'Theodore',
  'Eleanor',
  'Aiden',
  'Madison',
  'Samuel',
  'Layla',
  'Ryan',
  'Penelope',
  'Jayden',
  'Riley',
  'Leo',
  'Zoey',
  'Luke',
  'Nora',
  'Caleb',
  'Lily',
  'Isaiah',
  'Chloe',
  'Isaac',
  'Hannah',
  'Lincoln',
  'Hazel',
  'Joshua',
  'Violet',
  'Nathan',
  'Aurora',
  'Andrew',
  'Savannah',
  'Gabriel',
  'Audrey',
  'Anthony',
  'Brooklyn',
  'Dylan',
  'Bella',
  'Ezra',
  'Claire',
  'David',
  'Skylar',
  'Adrian',
  'Lucy',
  'Josiah',
  'Paisley',
  'John',
  'Everly',
  'Christian',
  'Anna',
  'Hunter',
  'Caroline',
  'Thomas',
  'Nova',
  'Connor',
  'Genesis',
  'Aaron',
  'Emilia',
  'Eli',
  'Kennedy',
];

const STUDENT_LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
];

const DISABILITIES: {
  primary: string;
  secondary: string[];
  functioningLevel: FunctioningLevel;
  assessmentType: AssessmentType;
  weight: number; // Distribution weight
}[] = [
  {
    primary: 'Specific Learning Disability',
    secondary: [],
    functioningLevel: 'MILD',
    assessmentType: 'STANDARD_WITH_ACCOMMODATIONS',
    weight: 35,
  },
  {
    primary: 'Autism Spectrum Disorder (Level 1)',
    secondary: ['ADHD'],
    functioningLevel: 'MILD',
    assessmentType: 'STANDARD_WITH_ACCOMMODATIONS',
    weight: 15,
  },
  {
    primary: 'ADHD',
    secondary: [],
    functioningLevel: 'MILD',
    assessmentType: 'STANDARD_WITH_ACCOMMODATIONS',
    weight: 15,
  },
  {
    primary: 'Speech/Language Impairment',
    secondary: [],
    functioningLevel: 'MILD',
    assessmentType: 'STANDARD_WITH_ACCOMMODATIONS',
    weight: 10,
  },
  {
    primary: 'Autism Spectrum Disorder (Level 2)',
    secondary: ['ADHD'],
    functioningLevel: 'MODERATE',
    assessmentType: 'MODIFIED',
    weight: 8,
  },
  {
    primary: 'Emotional Disturbance',
    secondary: ['Anxiety Disorder'],
    functioningLevel: 'MODERATE',
    assessmentType: 'MODIFIED',
    weight: 5,
  },
  {
    primary: 'Intellectual Disability',
    secondary: [],
    functioningLevel: 'MODERATE',
    assessmentType: 'MODIFIED',
    weight: 4,
  },
  {
    primary: 'Developmental Delay',
    secondary: [],
    functioningLevel: 'MODERATE',
    assessmentType: 'MODIFIED',
    weight: 3,
  },
  {
    primary: 'Intellectual Disability',
    secondary: ['Autism Spectrum Disorder'],
    functioningLevel: 'SEVERE',
    assessmentType: 'ALTERNATE',
    weight: 3,
  },
  {
    primary: 'Multiple Disabilities',
    secondary: ['Intellectual Disability', 'Physical Disability'],
    functioningLevel: 'PROFOUND',
    assessmentType: 'ALTERNATE',
    weight: 2,
  },
];

function getDisabilityProfile(index: number) {
  // Weighted random selection (deterministic via index)
  const totalWeight = DISABILITIES.reduce((sum, d) => sum + d.weight, 0);
  let roll = (index * 7 + 13) % totalWeight;
  for (const d of DISABILITIES) {
    roll -= d.weight;
    if (roll < 0) return d;
  }
  return DISABILITIES[0];
}

function generateDateOfBirth(grade: string): string {
  const gradeNum = grade === 'K' ? 0 : parseInt(grade) || 0;
  const birthYear = 2026 - 6 - gradeNum; // Age 6 for kindergarten
  const month = ((gradeNum * 3 + 1) % 12) + 1;
  const day = ((gradeNum * 7 + 5) % 28) + 1;
  return `${birthYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function generateStudents(schools: PilotSchool[]): LearnerProfile[] {
  const students: LearnerProfile[] = [];

  // Include 6 core seed learners first
  const coreLearners = Object.values(LEARNER_PROFILES);
  students.push(...coreLearners);

  const studentIdx = coreLearners.length;

  for (let i = studentIdx; i < 500; i++) {
    const school = schools[i % schools.length];
    const grade = school.grades[i % school.grades.length];
    const firstName = STUDENT_FIRST_NAMES[i % STUDENT_FIRST_NAMES.length];
    const lastName = STUDENT_LAST_NAMES[i % STUDENT_LAST_NAMES.length];
    const disability = getDisabilityProfile(i);

    students.push({
      id: pilotUuid('student', 1000 + i),
      firstName,
      lastName,
      grade,
      dateOfBirth: generateDateOfBirth(grade),
      school: school.id,
      parentId: pilotUuid('parent', 1000 + Math.floor(i * 0.8)), // ~400 parents for 500 kids
      functioningLevel: disability.functioningLevel,
      assessmentType: disability.assessmentType,
      primaryDisability: disability.primary,
      secondaryDisabilities: disability.secondary,
    });
  }

  return students;
}

// =============================================================================
// PARENTS
// =============================================================================

export function generateParents(students: LearnerProfile[]): ParentProfile[] {
  const parents: ParentProfile[] = [];
  const parentIdSet = new Set<string>();

  // Core seed parents
  const coreParents = Object.values(PARENT_PROFILES);
  coreParents.forEach((p) => {
    parents.push(p);
    parentIdSet.add(p.id);
  });

  // Generate parents for remaining students
  for (const student of students) {
    if (parentIdSet.has(student.parentId)) continue;
    parentIdSet.add(student.parentId);

    const parentIdx = parents.length;
    const firstName = FIRST_NAMES[parentIdx % FIRST_NAMES.length];
    const relationship = parentIdx % 3 === 0 ? 'father' : 'mother';

    parents.push({
      id: student.parentId,
      email: `${firstName.toLowerCase()}.${student.lastName.toLowerCase()}@email.com`,
      givenName: firstName,
      familyName: student.lastName,
      phone: `(763) 555-${(1000 + parentIdx).toString().padStart(4, '0')}`,
      relationship,
      learnerId: student.id,
    });
  }

  return parents;
}

// =============================================================================
// IEPs
// =============================================================================

export interface PilotIEP {
  id: string;
  learnerId: string;
  tenantId: string;
  schoolId: string;
  caseManagerId: string;
  status: 'ACTIVE' | 'DRAFT' | 'REVIEW';
  startDate: string;
  endDate: string;
  nextReviewDate: string;
  goals: IEPGoal[];
  accommodations: Accommodation[];
  services: IEPService[];
}

const GOAL_DOMAINS = [
  'READING',
  'MATH',
  'WRITING',
  'COMMUNICATION',
  'SOCIAL_EMOTIONAL',
  'ADAPTIVE_BEHAVIOR',
  'EXECUTIVE_FUNCTION',
  'MOTOR_SKILLS',
];

const GOAL_TEMPLATES: Record<string, string[]> = {
  READING: [
    'will decode multisyllabic words using syllable division strategies',
    'will read grade-level passages with comprehension support',
    'will increase reading fluency to grade-level benchmarks',
  ],
  MATH: [
    'will solve multi-step word problems with graphic organizers',
    'will demonstrate understanding of grade-level math concepts',
    'will apply problem-solving strategies independently',
  ],
  WRITING: [
    'will compose organized paragraphs with topic sentences',
    'will use editing checklists to improve writing quality',
    'will write complete sentences with correct grammar',
  ],
  COMMUNICATION: [
    'will initiate and maintain conversations with peers',
    'will express needs and wants appropriately',
    'will follow multi-step verbal directions',
  ],
  SOCIAL_EMOTIONAL: [
    'will use coping strategies when frustrated',
    'will identify emotions in self and others',
    'will participate in group activities with peers',
  ],
  ADAPTIVE_BEHAVIOR: [
    'will independently complete daily routines using visual supports',
    'will transition between activities with minimal prompts',
    'will organize materials and track assignments',
  ],
  EXECUTIVE_FUNCTION: [
    'will use planning tools to break down assignments',
    'will self-monitor attention during instruction',
    'will manage time effectively during independent work',
  ],
  MOTOR_SKILLS: [
    'will improve fine motor skills for handwriting',
    'will navigate school environment independently',
    'will participate in physical education activities',
  ],
};

export function generateIEPs(
  students: LearnerProfile[],
  teachers: TeacherProfile[],
  _schools: PilotSchool[]
): PilotIEP[] {
  const ieps: PilotIEP[] = [];

  // First 6 students use core seed IEP data
  const _coreStudentIds = new Set(Object.values(LEARNER_PROFILES).map((l) => l.id));

  for (let i = 0; i < Math.min(students.length, 450); i++) {
    const student = students[i];
    const schoolTeachers = teachers.filter((t) => t.school === student.school);
    const caseManager = schoolTeachers[i % schoolTeachers.length] || teachers[0];

    const iepId = i < 6 ? Object.values(IEPS)[i] : pilotUuid('iep', 1000 + i);

    // Generate goals
    const numGoals =
      student.functioningLevel === 'PROFOUND'
        ? 3
        : student.functioningLevel === 'SEVERE'
          ? 3
          : student.functioningLevel === 'MODERATE'
            ? 4
            : student.functioningLevel === 'MILD'
              ? 3
              : 2;

    const goals: IEPGoal[] = [];
    for (let g = 0; g < numGoals; g++) {
      const domain = GOAL_DOMAINS[(i + g) % GOAL_DOMAINS.length];
      const templates = GOAL_TEMPLATES[domain] || GOAL_TEMPLATES.READING;

      goals.push({
        id: pilotUuid('goal', i * 10 + g + 10000),
        iepId,
        goalNumber: g + 1,
        domain,
        description: `${student.firstName} ${templates[g % templates.length]}`,
        baseline: 'Current performance level documented in evaluation',
        targetCriteria: '80% accuracy across 3 consecutive measurement periods',
        measurementMethod: 'Progress monitoring data collection and teacher observation',
        status: g === 0 ? 'IN_PROGRESS' : g < numGoals - 1 ? 'IN_PROGRESS' : 'NOT_STARTED',
      });
    }

    // Generate accommodations
    const accommodationCategories = ['TIMING', 'SETTING', 'PRESENTATION', 'RESPONSE', 'SCHEDULING'];
    const numAccomm =
      student.functioningLevel === 'PROFOUND'
        ? 5
        : student.functioningLevel === 'SEVERE'
          ? 4
          : student.functioningLevel === 'MODERATE'
            ? 4
            : student.functioningLevel === 'MILD'
              ? 3
              : 2;

    const accommodations: Accommodation[] = [];
    for (let a = 0; a < numAccomm; a++) {
      accommodations.push({
        id: pilotUuid('accommodation', i * 10 + a + 10000),
        iepId,
        category: accommodationCategories[a % accommodationCategories.length],
        name: `Accommodation ${a + 1}`,
        description: `Accommodation for ${student.primaryDisability}`,
        settings: ['classroom', 'testing'],
      });
    }

    // Generate services
    const serviceTypes = ['SPEECH_LANGUAGE', 'OCCUPATIONAL_THERAPY', 'COUNSELING', 'OTHER'];
    const numServices =
      student.functioningLevel === 'PROFOUND'
        ? 4
        : student.functioningLevel === 'SEVERE'
          ? 3
          : student.functioningLevel === 'MODERATE'
            ? 2
            : 1;

    const services: IEPService[] = [];
    for (let s = 0; s < numServices; s++) {
      services.push({
        id: pilotUuid('service', i * 10 + s + 10000),
        iepId,
        serviceType: serviceTypes[s % serviceTypes.length],
        frequency: s === 0 ? '2x weekly' : '1x weekly',
        duration: 30,
        providerType: serviceTypes[s % serviceTypes.length].replace(/_/g, ' '),
      });
    }

    ieps.push({
      id: iepId,
      learnerId: student.id,
      tenantId: TENANTS.ANOKA_HENNEPIN,
      schoolId: student.school,
      caseManagerId: caseManager.id,
      status: i % 20 === 0 ? 'REVIEW' : i % 50 === 0 ? 'DRAFT' : 'ACTIVE',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      nextReviewDate: '2026-03-01',
      goals,
      accommodations,
      services,
    });
  }

  return ieps;
}

// =============================================================================
// FULL PILOT DATA GENERATOR
// =============================================================================

export interface PilotData {
  district: typeof PILOT_CONFIG.district;
  districtAdmin: typeof DISTRICT_ADMIN;
  schools: PilotSchool[];
  teachers: TeacherProfile[];
  students: LearnerProfile[];
  parents: ParentProfile[];
  ieps: PilotIEP[];
  stats: {
    schools: number;
    teachers: number;
    students: number;
    parents: number;
    ieps: number;
    totalGoals: number;
    totalAccommodations: number;
    totalServices: number;
  };
}

export function generatePilotData(): PilotData {
  const schools = generateSchools();
  const teachers = generateTeachers(schools);
  const students = generateStudents(schools);
  const parents = generateParents(students);
  const ieps = generateIEPs(students, teachers, schools);

  return {
    district: PILOT_CONFIG.district,
    districtAdmin: DISTRICT_ADMIN,
    schools,
    teachers,
    students,
    parents,
    ieps,
    stats: {
      schools: schools.length,
      teachers: teachers.length,
      students: students.length,
      parents: parents.length,
      ieps: ieps.length,
      totalGoals: ieps.reduce((sum, iep) => sum + iep.goals.length, 0),
      totalAccommodations: ieps.reduce((sum, iep) => sum + iep.accommodations.length, 0),
      totalServices: ieps.reduce((sum, iep) => sum + iep.services.length, 0),
    },
  };
}
