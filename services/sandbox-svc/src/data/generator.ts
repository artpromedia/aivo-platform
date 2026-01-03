/**
 * Synthetic Data Generator
 * 
 * Generates realistic test data for sandbox environments
 */

import type { ExtendedPrismaClient } from '../prisma-types.js';
import { v4 as uuidv4 } from 'uuid';

// Sample data pools
const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia',
  'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Aria', 'Sebastian',
  'Ella', 'Jack', 'Chloe', 'Aiden', 'Luna', 'Owen', 'Layla', 'Samuel',
  'Zoey', 'Ryan', 'Penelope', 'Nathan', 'Riley', 'Caleb', 'Nora', 'Dylan',
  'Lily', 'Luke', 'Eleanor', 'Isaac', 'Hazel', 'Gabriel', 'Violet', 'Julian',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
];

const subjects = ['Math', 'Reading', 'Science', 'Social Studies'];

const skillDomains = {
  math: [
    'math.number_sense',
    'math.operations',
    'math.fractions',
    'math.decimals',
    'math.algebra',
    'math.geometry',
    'math.measurement',
    'math.data_analysis',
  ],
  reading: [
    'reading.phonics',
    'reading.fluency',
    'reading.vocabulary',
    'reading.comprehension',
    'reading.inference',
    'reading.analysis',
  ],
  science: [
    'science.life_science',
    'science.earth_science',
    'science.physical_science',
    'science.scientific_method',
  ],
};

const sessionTypes = ['practice', 'assessment', 'baseline', 'review'];

/**
 * Random helper functions
 */
function randomChoice<T>(arr: readonly T[]): T {
  if (arr.length === 0) {
    throw new Error('Cannot select from empty array');
  }
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): Date {
  const now = new Date();
  const msAgo = randomInt(0, daysAgo * 24 * 60 * 60 * 1000);
  return new Date(now.getTime() - msAgo);
}

function generateEmail(firstName: string, lastName: string, domain: string): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

interface GenerateOptions {
  learnerCount: number;
  teacherCount: number;
  classCount: number;
}

interface GenerateResult {
  learners: number;
  teachers: number;
  classes: number;
  enrollments: number;
  sessions: number;
  progressRecords: number;
}

/**
 * Generate synthetic data for a sandbox tenant
 */
export async function generateSyntheticData(
  prisma: ExtendedPrismaClient,
  tenantId: string,
  options: GenerateOptions
): Promise<GenerateResult> {
  const { learnerCount, teacherCount, classCount } = options;

  const result: GenerateResult = {
    learners: 0,
    teachers: 0,
    classes: 0,
    enrollments: 0,
    sessions: 0,
    progressRecords: 0,
  };

  // Generate teachers
  const teachers: string[] = [];
  for (let i = 0; i < teacherCount; i++) {
    const firstName = randomChoice(firstNames);
    const lastName = randomChoice(lastNames);
    
    const teacher = await prisma.sandboxSyntheticTeacher.create({
      data: {
        tenantId,
        externalId: `teacher-${i + 1}`,
        firstName,
        lastName,
        email: generateEmail(firstName, lastName, 'school.sandbox.aivo.dev'),
        role: randomChoice(['teacher', 'teacher', 'teacher', 'lead_teacher']),
      },
    });
    
    teachers.push(teacher.id);
    result.teachers++;
  }

  // Generate classes
  const classes: Array<{ id: string; subject: string; gradeLevel: number }> = [];
  for (let i = 0; i < classCount; i++) {
    const subject = randomChoice(subjects);
    const gradeLevel = randomInt(3, 8);
    
    const cls = await prisma.sandboxSyntheticClass.create({
      data: {
        tenantId,
        externalId: `class-${i + 1}`,
        name: `${subject} Grade ${gradeLevel} - Period ${(i % 6) + 1}`,
        subject,
        gradeLevel,
        teacherId: teachers.length > 0 ? randomChoice(teachers) : null,
      },
    });
    
    classes.push({ id: cls.id, subject, gradeLevel });
    result.classes++;
  }

  // Generate learners
  const learners: string[] = [];
  for (let i = 0; i < learnerCount; i++) {
    const firstName = randomChoice(firstNames);
    const lastName = randomChoice(lastNames);
    const gradeLevel = randomInt(3, 8);
    
    const learner = await prisma.sandboxSyntheticLearner.create({
      data: {
        tenantId,
        externalId: `student-${i + 1}`,
        firstName,
        lastName,
        email: generateEmail(firstName, lastName, 'student.sandbox.aivo.dev'),
        gradeLevel,
        metadataJson: {
          timezone: 'America/New_York',
          preferredLanguage: 'en',
          accommodations: Math.random() > 0.9 ? ['extended_time'] : [],
        },
      },
    });
    
    learners.push(learner.id);
    result.learners++;

    // Enroll in 2-4 classes
    const numEnrollments = randomInt(2, 4);
    const enrolledClasses = new Set<string>();
    
    for (let j = 0; j < numEnrollments && j < classes.length; j++) {
      // Prefer classes of same grade level
      const eligibleClasses = classes.filter(
        c => !enrolledClasses.has(c.id) && Math.abs(c.gradeLevel - gradeLevel) <= 1
      );
      
      if (eligibleClasses.length > 0) {
        const cls = randomChoice(eligibleClasses);
        enrolledClasses.add(cls.id);
        
        await prisma.sandboxSyntheticEnrollment.create({
          data: {
            learnerId: learner.id,
            classId: cls.id,
            role: 'student',
          },
        });
        
        result.enrollments++;
      }
    }

    // Generate sessions (5-30 per learner)
    const numSessions = randomInt(5, 30);
    for (let s = 0; s < numSessions; s++) {
      const sessionType = randomChoice(sessionTypes);
      const subject = randomChoice(['math', 'reading', 'science']);
      const domain = randomChoice(skillDomains[subject as keyof typeof skillDomains]);
      
      const startedAt = randomDate(60);
      const durationSeconds = randomInt(300, 1800);
      const questionsAttempted = randomInt(5, 25);
      const questionsCorrect = randomInt(Math.floor(questionsAttempted * 0.4), questionsAttempted);
      
      await prisma.sandboxSyntheticSession.create({
        data: {
          learnerId: learner.id,
          sessionType,
          skillDomain: domain,
          startedAt,
          completedAt: new Date(startedAt.getTime() + durationSeconds * 1000),
          durationSeconds,
          questionsAttempted,
          questionsCorrect,
          accuracyPct: Math.round((questionsCorrect / questionsAttempted) * 100),
          xpEarned: randomInt(10, 100),
          eventsJson: generateSessionEvents(questionsAttempted),
        },
      });
      
      result.sessions++;
    }

    // Generate progress records
    const progressDomains = [
      ...skillDomains.math.slice(0, randomInt(3, 5)),
      ...skillDomains.reading.slice(0, randomInt(2, 4)),
    ];
    
    for (const domain of progressDomains) {
      await prisma.sandboxSyntheticLearnerProgress.create({
        data: {
          learnerId: learner.id,
          skillDomain: domain,
          skillId: `${domain}.${randomChoice(['basics', 'intermediate', 'advanced'])}`,
          masteryLevel: Math.random() * 0.9 + 0.1,
          progressPct: randomInt(10, 100),
          lastPracticed: randomDate(14),
          recordedAt: new Date(),
        },
      });
      
      result.progressRecords++;
    }
  }

  return result;
}

/**
 * Generate sample session events
 */
function generateSessionEvents(questionCount: number): object[] {
  const events: object[] = [];
  let currentTime = 0;
  
  events.push({
    type: 'session_started',
    timestamp: currentTime,
  });
  
  for (let i = 0; i < questionCount; i++) {
    currentTime += randomInt(5000, 30000);
    
    events.push({
      type: 'question_presented',
      timestamp: currentTime,
      questionIndex: i,
      difficulty: randomChoice(['easy', 'medium', 'hard']),
    });
    
    currentTime += randomInt(3000, 45000);
    
    events.push({
      type: 'answer_submitted',
      timestamp: currentTime,
      questionIndex: i,
      isCorrect: Math.random() > 0.3,
      responseTimeMs: currentTime - (events[events.length - 1] as any).timestamp,
    });
  }
  
  currentTime += 2000;
  
  events.push({
    type: 'session_completed',
    timestamp: currentTime,
  });
  
  return events;
}
