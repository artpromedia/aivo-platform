'use client';

import { Card, Heading, Button } from '@aivo/ui-web';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

import { classesApi } from '@/lib/api';
import type { ClassSummary } from '@/lib/types';

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
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [editingCell, setEditingCell] = useState<{
    studentId: string;
    assignmentId: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'at-risk' | 'missing'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await classesApi.list();
        setClasses(data);
        if (data.length > 0) {
          setSelectedClassId(data[0].id);
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to load classes'));
      } finally {
        setClassesLoading(false);
      }
    };
    void fetchClasses();
  }, []);

  const loadGradebook = useCallback(async (classId: string) => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const data = (await classesApi.getGradebook(classId)) as unknown as Gradebook;
      setGradebook(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load gradebook'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      void loadGradebook(selectedClassId);
    }
  }, [selectedClassId, loadGradebook]);

  const handleGradeSubmit = async (studentId: string, assignmentId: string) => {
    if (!gradebook) return;

    const numValue = editValue === '' ? null : parseFloat(editValue);
    if (editValue !== '' && (isNaN(numValue!) || numValue! < 0)) {
      return; // Invalid input
    }

    // Update local state (in production, this would call the API)
    setGradebook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        students: prev.students.map((student) => {
          if (student.studentId !== studentId) return student;
          return {
            ...student,
            grades: student.grades.map((grade) => {
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

  const filteredStudents =
    gradebook?.students.filter((student) => {
      if (searchTerm && !student.studentName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filter === 'at-risk' && student.overallGrade >= 70) return false;
      if (filter === 'missing' && student.missingCount === 0) return false;
      return true;
    }) ?? [];

  const classStats = gradebook
    ? {
        classAverage: (
          gradebook.students.reduce((sum, s) => sum + s.overallGrade, 0) /
          (gradebook.students.length || 1)
        ).toFixed(1),
        atRiskCount: gradebook.students.filter((s) => s.overallGrade < 70).length,
        totalMissing: gradebook.students.reduce((sum, s) => sum + s.missingCount, 0),
        totalStudents: gradebook.students.length,
      }
    : null;

  // Show error if classes failed to load
  if (!classesLoading && error && classes.length === 0) {
    return (
      <section className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Heading kicker="Teacher Tools" className="text-headline font-semibold">
              Gradebook
            </Heading>
            <p className="text-muted mt-1">Manage grades for your classes</p>
          </div>
        </div>
        <Card className="p-6 text-center">
          <p className="text-red-600">{error.message}</p>
          <button
            onClick={() => {
              globalThis.location.reload();
            }}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </Card>
      </section>
    );
  }

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
            onChange={(e) => {
              setSelectedClassId(e.target.value);
            }}
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
            <p
              className={`text-2xl font-bold ${getGradeColor(parseFloat(classStats.classAverage)).split(' ')[0]}`}
            >
              {classStats.classAverage}%
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Students at Risk</p>
            <p
              className={`text-2xl font-bold ${classStats.atRiskCount > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {classStats.atRiskCount}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Missing Assignments</p>
            <p
              className={`text-2xl font-bold ${classStats.totalMissing > 0 ? 'text-orange-600' : 'text-green-600'}`}
            >
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
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <div className="flex rounded-lg border border-border">
            {(['all', 'at-risk', 'missing'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                }}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  filter === f ? 'bg-primary text-white' : 'bg-surface text-muted hover:bg-muted/10'
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
                  <th
                    className="sticky left-0 z-20 bg-muted/30 border-b border-r border-border p-2 text-left"
                    colSpan={2}
                  >
                    <span className="text-xs font-semibold uppercase text-muted">
                      {gradebook.gradingPeriod}
                    </span>
                  </th>
                  {/* Group by category */}
                  {['Quizzes', 'Homework', 'Tests'].map((category) => {
                    const count = gradebook.assignments.filter(
                      (a) => a.category === category
                    ).length;
                    if (count === 0) return null;
                    return (
                      <th
                        key={category}
                        colSpan={count}
                        className="border-b border-r border-border p-2 text-center"
                      >
                        <span className="text-xs font-semibold uppercase text-muted">
                          {category}
                        </span>
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
                        <span className="text-xs font-medium truncate max-w-[70px]">
                          {assignment.title}
                        </span>
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
                    <tr
                      key={student.studentId}
                      className={idx % 2 === 0 ? 'bg-surface' : 'bg-muted/10'}
                    >
                      {/* Student Name */}
                      <td className="sticky left-0 z-10 border-b border-r border-border p-3 bg-inherit">
                        <Link
                          href={`/students/${student.studentId}`}
                          className="flex items-center gap-2 hover:text-primary"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {student.studentName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <div>
                            <span className="font-medium">{student.studentName}</span>
                            {student.missingCount > 0 && (
                              <span className="ml-2 text-xs text-red-500">
                                {student.missingCount} missing
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Average */}
                      <td className="sticky left-[180px] z-10 border-b border-r border-border p-2 text-center bg-inherit">
                        <span
                          className={`inline-block rounded px-2 py-1 text-sm font-medium ${gradeColor}`}
                        >
                          {student.overallGrade.toFixed(1)}%
                        </span>
                      </td>

                      {/* Grade Cells */}
                      {gradebook.assignments.map((assignment) => {
                        const grade = student.grades.find((g) => g.assignmentId === assignment.id);
                        const isEditing =
                          editingCell?.studentId === student.studentId &&
                          editingCell?.assignmentId === assignment.id;
                        const percentage =
                          grade?.score !== null && grade?.score !== undefined
                            ? (grade.score / assignment.totalPoints) * 100
                            : null;
                        const cellColor = percentage !== null ? getGradeColor(percentage) : '';

                        return (
                          <td
                            key={assignment.id}
                            className="border-b border-r border-border p-1 text-center"
                            onDoubleClick={() => {
                              startEditing(student.studentId, assignment.id, grade?.score ?? null);
                            }}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                }}
                                onBlur={() => handleGradeSubmit(student.studentId, assignment.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter')
                                    handleGradeSubmit(student.studentId, assignment.id);
                                  if (e.key === 'Escape') {
                                    setEditingCell(null);
                                    setEditValue('');
                                  }
                                }}
                                className="w-16 rounded border border-primary px-2 py-1 text-center text-sm"
                                autoFocus
                                min="0"
                                max={assignment.totalPoints * 1.5}
                              />
                            ) : (
                              <div
                                className={`inline-flex items-center justify-center rounded px-2 py-1 ${cellColor}`}
                              >
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
                          <span className="text-xs text-muted">
                            {student.overallGrade.toFixed(1)}%
                          </span>
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
                      .map((s) => s.grades.find((g) => g.assignmentId === assignment.id)?.score)
                      .filter((s): s is number => s !== null && s !== undefined);
                    const avg =
                      scores.length > 0
                        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
                        : '-';

                    return (
                      <td
                        key={assignment.id}
                        className="border-t border-r border-border p-2 text-center text-sm"
                      >
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
