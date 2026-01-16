'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, Heading, Button } from '@aivo/ui-web';

// Types matching the backend service
interface Assignment {
  id: string;
  classId: string;
  title: string;
  type: 'quiz' | 'homework' | 'test' | 'project';
  category: string;
  totalPoints: number;
  dueDate: string;
  status: 'draft' | 'published' | 'closed';
}

interface Grade {
  id: string;
  studentId: string;
  assignmentId: string;
  score: number | null;
  status: 'graded' | 'pending' | 'missing' | 'late' | 'excused';
  feedback?: string;
  gradedAt?: string;
}

interface GradebookStudent {
  studentId: string;
  studentName: string;
  overallGrade: number;
  missingCount: number;
  grades: Grade[];
}

interface Gradebook {
  classId: string;
  className: string;
  gradingPeriod: string;
  assignments: Assignment[];
  students: GradebookStudent[];
}

interface TeacherClass {
  id: string;
  name: string;
  period: string;
  studentCount: number;
}

// Mock data for development
const MOCK_CLASSES: TeacherClass[] = [
  { id: '1', name: 'Algebra I - Period 1', period: '1', studentCount: 25 },
  { id: '2', name: 'Algebra I - Period 3', period: '3', studentCount: 28 },
  { id: '3', name: 'Geometry - Period 2', period: '2', studentCount: 22 },
];

function getMockGradebook(classId: string): Gradebook {
  return {
    classId,
    className: classId === '1' ? 'Algebra I - Period 1' : classId === '2' ? 'Algebra I - Period 3' : 'Geometry - Period 2',
    gradingPeriod: 'Q2 2024-25',
    assignments: [
      { id: 'a1', classId, title: 'Quiz 1: Equations', type: 'quiz', category: 'Quizzes', totalPoints: 20, dueDate: '2024-12-01', status: 'closed' },
      { id: 'a2', classId, title: 'HW Ch5: Linear Functions', type: 'homework', category: 'Homework', totalPoints: 10, dueDate: '2024-12-05', status: 'closed' },
      { id: 'a3', classId, title: 'Quiz 2: Graphing', type: 'quiz', category: 'Quizzes', totalPoints: 20, dueDate: '2024-12-10', status: 'closed' },
      { id: 'a4', classId, title: 'HW Ch6: Inequalities', type: 'homework', category: 'Homework', totalPoints: 10, dueDate: '2024-12-12', status: 'published' },
      { id: 'a5', classId, title: 'Unit Test 1', type: 'test', category: 'Tests', totalPoints: 100, dueDate: '2024-12-15', status: 'published' },
    ],
    students: [
      {
        studentId: 's1', studentName: 'Emma Wilson', overallGrade: 92, missingCount: 0,
        grades: [
          { id: 'g1', studentId: 's1', assignmentId: 'a1', score: 19, status: 'graded' },
          { id: 'g2', studentId: 's1', assignmentId: 'a2', score: 10, status: 'graded' },
          { id: 'g3', studentId: 's1', assignmentId: 'a3', score: 18, status: 'graded' },
          { id: 'g4', studentId: 's1', assignmentId: 'a4', score: 9, status: 'graded' },
          { id: 'g5', studentId: 's1', assignmentId: 'a5', score: 95, status: 'graded' },
        ],
      },
      {
        studentId: 's2', studentName: 'Michael Chen', overallGrade: 85, missingCount: 0,
        grades: [
          { id: 'g6', studentId: 's2', assignmentId: 'a1', score: 17, status: 'graded' },
          { id: 'g7', studentId: 's2', assignmentId: 'a2', score: 9, status: 'graded' },
          { id: 'g8', studentId: 's2', assignmentId: 'a3', score: 16, status: 'graded' },
          { id: 'g9', studentId: 's2', assignmentId: 'a4', score: 8, status: 'graded' },
          { id: 'g10', studentId: 's2', assignmentId: 'a5', score: 88, status: 'graded' },
        ],
      },
      {
        studentId: 's3', studentName: 'Olivia Brown', overallGrade: 78, missingCount: 1,
        grades: [
          { id: 'g11', studentId: 's3', assignmentId: 'a1', score: 15, status: 'graded' },
          { id: 'g12', studentId: 's3', assignmentId: 'a2', score: 8, status: 'graded' },
          { id: 'g13', studentId: 's3', assignmentId: 'a3', score: 14, status: 'graded' },
          { id: 'g14', studentId: 's3', assignmentId: 'a4', score: null, status: 'missing' },
          { id: 'g15', studentId: 's3', assignmentId: 'a5', score: 82, status: 'graded' },
        ],
      },
      {
        studentId: 's4', studentName: 'Alex Smith', overallGrade: 65, missingCount: 2,
        grades: [
          { id: 'g16', studentId: 's4', assignmentId: 'a1', score: 12, status: 'graded' },
          { id: 'g17', studentId: 's4', assignmentId: 'a2', score: null, status: 'missing' },
          { id: 'g18', studentId: 's4', assignmentId: 'a3', score: 13, status: 'graded' },
          { id: 'g19', studentId: 's4', assignmentId: 'a4', score: null, status: 'missing' },
          { id: 'g20', studentId: 's4', assignmentId: 'a5', score: 70, status: 'graded' },
        ],
      },
      {
        studentId: 's5', studentName: 'Sarah Johnson', overallGrade: 88, missingCount: 0,
        grades: [
          { id: 'g21', studentId: 's5', assignmentId: 'a1', score: 18, status: 'graded' },
          { id: 'g22', studentId: 's5', assignmentId: 'a2', score: 9, status: 'graded' },
          { id: 'g23', studentId: 's5', assignmentId: 'a3', score: 17, status: 'graded' },
          { id: 'g24', studentId: 's5', assignmentId: 'a4', score: 10, status: 'graded' },
          { id: 'g25', studentId: 's5', assignmentId: 'a5', score: 90, status: 'graded' },
        ],
      },
    ],
  };
}

function getGradeColor(grade: number): string {
  if (grade >= 90) return 'text-green-700 bg-green-50';
  if (grade >= 80) return 'text-blue-700 bg-blue-50';
  if (grade >= 70) return 'text-yellow-700 bg-yellow-50';
  if (grade >= 60) return 'text-orange-700 bg-orange-50';
  return 'text-red-700 bg-red-50';
}

function getLetterGrade(percentage: number): string {
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
}

export default function GradebookPage() {
  const [classes] = useState<TeacherClass[]>(MOCK_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState<string>(MOCK_CLASSES[0].id);
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'at-risk' | 'missing'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadGradebook = useCallback(async (classId: string) => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    setGradebook(getMockGradebook(classId));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGradebook(selectedClassId);
  }, [selectedClassId, loadGradebook]);

  const handleGradeSubmit = async (studentId: string, assignmentId: string) => {
    if (!gradebook) return;

    const numValue = editValue === '' ? null : parseFloat(editValue);
    if (editValue !== '' && (isNaN(numValue!) || numValue! < 0)) {
      return; // Invalid input
    }

    // Update local state (in production, this would call the API)
    setGradebook(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        students: prev.students.map(student => {
          if (student.studentId !== studentId) return student;
          return {
            ...student,
            grades: student.grades.map(grade => {
              if (grade.assignmentId !== assignmentId) return grade;
              return {
                ...grade,
                score: numValue,
                status: numValue === null ? 'missing' : 'graded',
                gradedAt: new Date().toISOString(),
              };
            }),
          };
        }),
      };
    });

    setEditingCell(null);
    setEditValue('');
  };

  const startEditing = (studentId: string, assignmentId: string, currentScore: number | null) => {
    setEditingCell({ studentId, assignmentId });
    setEditValue(currentScore?.toString() ?? '');
  };

  const filteredStudents = gradebook?.students.filter(student => {
    if (searchTerm && !student.studentName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filter === 'at-risk' && student.overallGrade >= 70) return false;
    if (filter === 'missing' && student.missingCount === 0) return false;
    return true;
  }) ?? [];

  const classStats = gradebook ? {
    classAverage: (gradebook.students.reduce((sum, s) => sum + s.overallGrade, 0) / gradebook.students.length).toFixed(1),
    atRiskCount: gradebook.students.filter(s => s.overallGrade < 70).length,
    totalMissing: gradebook.students.reduce((sum, s) => sum + s.missingCount, 0),
    totalStudents: gradebook.students.length,
  } : null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Heading kicker="Teacher Tools" className="text-headline font-semibold">
            Gradebook
          </Heading>
          <p className="text-muted mt-1">Manage grades for your classes</p>
        </div>

        {/* Class Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.studentCount} students)
              </option>
            ))}
          </select>
          <Button variant="primary" className="text-sm">
            + New Assignment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {classStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm text-muted">Class Average</p>
            <p className={`text-2xl font-bold ${getGradeColor(parseFloat(classStats.classAverage)).split(' ')[0]}`}>
              {classStats.classAverage}%
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Students at Risk</p>
            <p className={`text-2xl font-bold ${classStats.atRiskCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {classStats.atRiskCount}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Missing Assignments</p>
            <p className={`text-2xl font-bold ${classStats.totalMissing > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {classStats.totalMissing}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Total Students</p>
            <p className="text-2xl font-bold text-primary">{classStats.totalStudents}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <div className="flex rounded-lg border border-border">
            {(['all', 'at-risk', 'missing'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted hover:bg-muted/10'
                } ${f === 'all' ? 'rounded-l-lg' : f === 'missing' ? 'rounded-r-lg' : ''}`}
              >
                {f === 'all' ? 'All Students' : f === 'at-risk' ? 'At Risk (<70%)' : 'Missing Work'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="text-sm">
            Export CSV
          </Button>
          <Button variant="ghost" className="text-sm">
            Print
          </Button>
        </div>
      </div>

      {/* Gradebook Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-3" />
              <p className="text-muted">Loading gradebook...</p>
            </div>
          </div>
        ) : gradebook ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                {/* Category Row */}
                <tr className="bg-muted/30">
                  <th className="sticky left-0 z-20 bg-muted/30 border-b border-r border-border p-2 text-left" colSpan={2}>
                    <span className="text-xs font-semibold uppercase text-muted">
                      {gradebook.gradingPeriod}
                    </span>
                  </th>
                  {/* Group by category */}
                  {['Quizzes', 'Homework', 'Tests'].map(category => {
                    const count = gradebook.assignments.filter(a => a.category === category).length;
                    if (count === 0) return null;
                    return (
                      <th key={category} colSpan={count} className="border-b border-r border-border p-2 text-center">
                        <span className="text-xs font-semibold uppercase text-muted">{category}</span>
                      </th>
                    );
                  })}
                  <th className="border-b border-border p-2 text-center">
                    <span className="text-xs font-semibold uppercase text-muted">Final</span>
                  </th>
                </tr>
                {/* Assignment Row */}
                <tr className="bg-surface">
                  <th className="sticky left-0 z-20 bg-surface border-b border-r border-border p-3 text-left min-w-[180px]">
                    Student
                  </th>
                  <th className="sticky left-[180px] z-20 bg-surface border-b border-r border-border p-2 text-center w-16">
                    Avg
                  </th>
                  {gradebook.assignments.map((assignment) => (
                    <th
                      key={assignment.id}
                      className="border-b border-r border-border p-2 text-center min-w-[80px] cursor-pointer hover:bg-muted/10"
                      title={`${assignment.title}\nDue: ${new Date(assignment.dueDate).toLocaleDateString()}\nPoints: ${assignment.totalPoints}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-medium truncate max-w-[70px]">{assignment.title}</span>
                        <span className="text-[10px] text-muted">{assignment.totalPoints} pts</span>
                      </div>
                    </th>
                  ))}
                  <th className="border-b border-border p-2 text-center min-w-[80px]">
                    <span className="text-xs font-medium">Grade</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  const letterGrade = getLetterGrade(student.overallGrade);
                  const gradeColor = getGradeColor(student.overallGrade);

                  return (
                    <tr key={student.studentId} className={idx % 2 === 0 ? 'bg-surface' : 'bg-muted/10'}>
                      {/* Student Name */}
                      <td className="sticky left-0 z-10 border-b border-r border-border p-3 bg-inherit">
                        <Link href={`/students/${student.studentId}`} className="flex items-center gap-2 hover:text-primary">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {student.studentName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <span className="font-medium">{student.studentName}</span>
                            {student.missingCount > 0 && (
                              <span className="ml-2 text-xs text-red-500">{student.missingCount} missing</span>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Average */}
                      <td className="sticky left-[180px] z-10 border-b border-r border-border p-2 text-center bg-inherit">
                        <span className={`inline-block rounded px-2 py-1 text-sm font-medium ${gradeColor}`}>
                          {student.overallGrade.toFixed(1)}%
                        </span>
                      </td>

                      {/* Grade Cells */}
                      {gradebook.assignments.map((assignment) => {
                        const grade = student.grades.find(g => g.assignmentId === assignment.id);
                        const isEditing = editingCell?.studentId === student.studentId && editingCell?.assignmentId === assignment.id;
                        const percentage = grade?.score !== null && grade?.score !== undefined
                          ? (grade.score / assignment.totalPoints) * 100
                          : null;
                        const cellColor = percentage !== null ? getGradeColor(percentage) : '';

                        return (
                          <td
                            key={assignment.id}
                            className="border-b border-r border-border p-1 text-center"
                            onDoubleClick={() => startEditing(student.studentId, assignment.id, grade?.score ?? null)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleGradeSubmit(student.studentId, assignment.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleGradeSubmit(student.studentId, assignment.id);
                                  if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
                                }}
                                className="w-16 rounded border border-primary px-2 py-1 text-center text-sm"
                                autoFocus
                                min="0"
                                max={assignment.totalPoints * 1.5}
                              />
                            ) : (
                              <div className={`inline-flex items-center justify-center rounded px-2 py-1 ${cellColor}`}>
                                {grade?.score !== null && grade?.score !== undefined ? (
                                  <span className="text-sm font-medium">{grade.score}</span>
                                ) : grade?.status === 'missing' ? (
                                  <span className="text-xs text-red-500 font-medium">M</span>
                                ) : grade?.status === 'excused' ? (
                                  <span className="text-xs text-blue-500 font-medium">EX</span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Final Grade */}
                      <td className="border-b border-border p-2 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`rounded px-2 py-1 text-sm font-bold ${gradeColor}`}>
                            {letterGrade}
                          </span>
                          <span className="text-xs text-muted">{student.overallGrade.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer - Class Averages */}
              <tfoot>
                <tr className="bg-muted/30 font-medium">
                  <td className="sticky left-0 z-10 border-t border-r border-border p-3 bg-muted/30">
                    Class Average
                  </td>
                  <td className="sticky left-[180px] z-10 border-t border-r border-border p-2 text-center bg-muted/30">
                    {classStats?.classAverage}%
                  </td>
                  {gradebook.assignments.map((assignment) => {
                    const scores = gradebook.students
                      .map(s => s.grades.find(g => g.assignmentId === assignment.id)?.score)
                      .filter((s): s is number => s !== null && s !== undefined);
                    const avg = scores.length > 0
                      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
                      : '-';

                    return (
                      <td key={assignment.id} className="border-t border-r border-border p-2 text-center text-sm">
                        {avg}
                      </td>
                    );
                  })}
                  <td className="border-t border-border p-2 text-center">
                    {getLetterGrade(parseFloat(classStats?.classAverage ?? '0'))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}
      </Card>

      {/* Help Text */}
      <p className="text-center text-sm text-muted">
        Double-click on any grade cell to edit. Press Enter to save or Escape to cancel.
      </p>
    </section>
  );
}
