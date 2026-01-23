/**
 * Gradebook Page
 */

'use client';

import * as React from 'react';

import {
  fetchGradebook,
  fetchTeacherClasses,
  updateGrade,
  type Gradebook as APIGradebook,
  type TeacherClass,
} from '../../../../lib/api/gradebook';

import { GradebookTable } from '@/components/gradebook/gradebook-table';
import { PageHeader } from '@/components/layout/breadcrumb';
import { useAccessToken } from '@/hooks';
import type { Gradebook } from '@/lib/types';

export default function GradebookPage() {
  const { accessToken, isLoading: authLoading } = useAccessToken();
  const [selectedClass, setSelectedClass] = React.useState('1');
  const [gradebook, setGradebook] = React.useState<APIGradebook | null>(null);
  const [classes, setClasses] = React.useState<TeacherClass[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      if (authLoading || !accessToken) return;
      try {
        setIsLoading(true);
        const [gradebookData, classesData] = await Promise.all([
          fetchGradebook(selectedClass, accessToken),
          fetchTeacherClasses(accessToken),
        ]);
        setGradebook(gradebookData);
        setClasses(classesData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load gradebook');
      } finally {
        setIsLoading(false);
      }
    }
    void loadData();
  }, [selectedClass, accessToken, authLoading]);

  // Transform API gradebook to component-compatible format
  const compatibleGradebook: Gradebook | null = gradebook
    ? {
        classId: gradebook.classId,
        className: gradebook.className,
        gradingPeriod: { id: 'current', name: gradebook.gradingPeriod },
        assignments: gradebook.assignments.map((a) => ({
          id: a.id,
          title: a.title,
          category: a.category,
          totalPoints: a.totalPoints,
          dueDate: a.dueDate,
          status: a.status,
        })),
        students: gradebook.students.map((s) => ({
          id: s.studentId,
          studentId: s.studentId,
          name: s.studentName,
          studentName: s.studentName,
          email: '',
          hasIep: false,
          accommodations: [],
          overallGrade: s.overallGrade,
          missingCount: s.missingCount,
          grades: s.grades.map((g) => ({
            studentId: g.studentId,
            assignmentId: g.assignmentId,
            score: g.score,
            status: g.status,
            feedback: g.feedback,
          })),
        })),
      }
    : null;

  const handleGradeChange = async (
    studentId: string,
    assignmentId: string,
    score: number | null
  ) => {
    if (!accessToken) return;
    try {
      // Find the grade ID
      const student = gradebook?.students.find((s) => s.studentId === studentId);
      const grade = student?.grades.find((g) => g.assignmentId === assignmentId);
      if (grade) {
        await updateGrade(grade.id, score, accessToken);
      }
    } catch {
      // Grade update failed silently
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !gradebook) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-600">{error ?? 'Failed to load gradebook'}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Gradebook"
        description="View and edit student grades"
        actions={
          <div className="flex gap-2">
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
              }}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              📥 Export
            </button>
            <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              ⚙️ Settings
            </button>
          </div>
        }
      />

      <div className="mt-4 text-sm text-gray-500">
        <p>💡 Tip: Double-click a cell to edit. Use arrow keys to navigate. Press Enter to save.</p>
      </div>

      <div className="mt-4">
        {compatibleGradebook && (
          <GradebookTable gradebook={compatibleGradebook} onGradeChange={handleGradeChange} />
        )}
      </div>
    </div>
  );
}
