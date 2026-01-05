/**
 * Gradebook Page
 */

'use client';

import * as React from 'react';

import {
  fetchGradebook,
  fetchTeacherClasses,
  updateGrade,
  type Gradebook,
  type TeacherClass,
} from '../../../../lib/api/gradebook';

import { GradebookTable } from '@/components/gradebook/gradebook-table';
import { PageHeader } from '@/components/layout/breadcrumb';

export default function GradebookPage() {
  const [selectedClass, setSelectedClass] = React.useState('1');
  const [gradebook, setGradebook] = React.useState<Gradebook | null>(null);
  const [classes, setClasses] = React.useState<TeacherClass[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        // In production, get access token from auth context
        const accessToken = 'mock-token';
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
  }, [selectedClass]);

  const handleGradeChange = async (
    studentId: string,
    assignmentId: string,
    score: number | null
  ) => {
    try {
      const accessToken = 'mock-token';
      // Find the grade ID
      const student = gradebook?.students.find((s) => s.studentId === studentId);
      const grade = student?.grades.find((g) => g.assignmentId === assignmentId);
      if (grade) {
        await updateGrade(grade.id, score, accessToken);
      }
    } catch (err) {
      console.error('Failed to update grade:', err);
    }
  };

  if (isLoading) {
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
        <GradebookTable gradebook={gradebook} onGradeChange={handleGradeChange} />
      </div>
    </div>
  );
}
