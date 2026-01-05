/**
 * Gradebook API Client
 * Types and fetch functions for teacher gradebook.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  type: 'quiz' | 'homework' | 'test' | 'project';
  category: string;
  totalPoints: number;
  dueDate: string;
  status: 'draft' | 'published' | 'closed';
}

export interface Grade {
  id: string;
  studentId: string;
  assignmentId: string;
  score: number | null;
  status: 'graded' | 'pending' | 'missing' | 'late' | 'excused';
  feedback?: string;
  gradedAt?: string;
}

export interface StudentGrades {
  studentId: string;
  studentName: string;
  overallGrade: number;
  missingCount: number;
  grades: Grade[];
}

export interface Gradebook {
  classId: string;
  className: string;
  gradingPeriod: string;
  assignments: Assignment[];
  students: StudentGrades[];
}

export interface TeacherClass {
  id: string;
  name: string;
  period: string;
  studentCount: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

function mockGradebook(classId: string): Gradebook {
  return {
    classId,
    className: classId === '1' ? 'Algebra I - Period 1' : 'Algebra I - Period 3',
    gradingPeriod: 'Q2 2024',
    assignments: [
      {
        id: 'a1',
        classId,
        title: 'Quiz 1',
        type: 'quiz',
        category: 'Quizzes',
        totalPoints: 20,
        dueDate: '2024-12-01',
        status: 'closed',
      },
      {
        id: 'a2',
        classId,
        title: 'HW Ch5',
        type: 'homework',
        category: 'Homework',
        totalPoints: 10,
        dueDate: '2024-12-05',
        status: 'closed',
      },
      {
        id: 'a3',
        classId,
        title: 'Quiz 2',
        type: 'quiz',
        category: 'Quizzes',
        totalPoints: 20,
        dueDate: '2024-12-10',
        status: 'closed',
      },
      {
        id: 'a4',
        classId,
        title: 'HW Ch6',
        type: 'homework',
        category: 'Homework',
        totalPoints: 10,
        dueDate: '2024-12-12',
        status: 'published',
      },
      {
        id: 'a5',
        classId,
        title: 'Test 1',
        type: 'test',
        category: 'Tests',
        totalPoints: 100,
        dueDate: '2024-12-15',
        status: 'published',
      },
    ],
    students: [
      {
        studentId: 's1',
        studentName: 'Emma Wilson',
        overallGrade: 92,
        missingCount: 0,
        grades: [
          { id: 'g1', studentId: 's1', assignmentId: 'a1', score: 19, status: 'graded' },
          { id: 'g2', studentId: 's1', assignmentId: 'a2', score: 10, status: 'graded' },
          { id: 'g3', studentId: 's1', assignmentId: 'a3', score: 18, status: 'graded' },
          { id: 'g4', studentId: 's1', assignmentId: 'a4', score: 9, status: 'graded' },
          { id: 'g5', studentId: 's1', assignmentId: 'a5', score: 95, status: 'graded' },
        ],
      },
      {
        studentId: 's2',
        studentName: 'Michael Chen',
        overallGrade: 85,
        missingCount: 0,
        grades: [
          { id: 'g6', studentId: 's2', assignmentId: 'a1', score: 17, status: 'graded' },
          { id: 'g7', studentId: 's2', assignmentId: 'a2', score: 9, status: 'graded' },
          { id: 'g8', studentId: 's2', assignmentId: 'a3', score: 16, status: 'graded' },
          { id: 'g9', studentId: 's2', assignmentId: 'a4', score: 8, status: 'graded' },
          { id: 'g10', studentId: 's2', assignmentId: 'a5', score: 88, status: 'graded' },
        ],
      },
      {
        studentId: 's3',
        studentName: 'Olivia Brown',
        overallGrade: 78,
        missingCount: 1,
        grades: [
          { id: 'g11', studentId: 's3', assignmentId: 'a1', score: 15, status: 'graded' },
          { id: 'g12', studentId: 's3', assignmentId: 'a2', score: 8, status: 'graded' },
          { id: 'g13', studentId: 's3', assignmentId: 'a3', score: 14, status: 'graded' },
          { id: 'g14', studentId: 's3', assignmentId: 'a4', score: null, status: 'missing' },
          { id: 'g15', studentId: 's3', assignmentId: 'a5', score: 82, status: 'graded' },
        ],
      },
      {
        studentId: 's4',
        studentName: 'Alex Smith',
        overallGrade: 65,
        missingCount: 2,
        grades: [
          { id: 'g16', studentId: 's4', assignmentId: 'a1', score: 12, status: 'graded' },
          { id: 'g17', studentId: 's4', assignmentId: 'a2', score: null, status: 'missing' },
          { id: 'g18', studentId: 's4', assignmentId: 'a3', score: 13, status: 'graded' },
          { id: 'g19', studentId: 's4', assignmentId: 'a4', score: null, status: 'missing' },
          { id: 'g20', studentId: 's4', assignmentId: 'a5', score: 70, status: 'graded' },
        ],
      },
    ],
  };
}

function mockTeacherClasses(): TeacherClass[] {
  return [
    { id: '1', name: 'Algebra I - Period 1', period: '1', studentCount: 25 },
    { id: '2', name: 'Algebra I - Period 3', period: '3', studentCount: 28 },
    { id: '3', name: 'Geometry - Period 2', period: '2', studentCount: 22 },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchGradebook(classId: string, accessToken: string): Promise<Gradebook> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockGradebook(classId);
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/gradebook/${classId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch gradebook: ${res.status}`);
  }

  return res.json() as Promise<Gradebook>;
}

export async function fetchTeacherClasses(accessToken: string): Promise<TeacherClass[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockTeacherClasses();
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/teacher/classes`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch classes: ${res.status}`);
  }

  return res.json() as Promise<TeacherClass[]>;
}

export async function updateGrade(
  gradeId: string,
  score: number | null,
  accessToken: string
): Promise<Grade> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      id: gradeId,
      studentId: 's1',
      assignmentId: 'a1',
      score,
      status: score === null ? 'missing' : 'graded',
      gradedAt: new Date().toISOString(),
    };
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/grades/${gradeId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ score }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update grade: ${res.status}`);
  }

  return res.json() as Promise<Grade>;
}
