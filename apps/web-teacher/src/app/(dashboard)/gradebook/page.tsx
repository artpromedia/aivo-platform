/**
 * Gradebook Page
 */

'use client';

import * as React from 'react';

import { GradebookTable } from '@/components/gradebook/gradebook-table';
import { PageHeader } from '@/components/layout/breadcrumb';
import type { Gradebook } from '@/lib/types';

// Mock gradebook data
const mockGradebook: Gradebook = {
  classId: '1',
  className: 'Algebra I - Period 1',
  gradingPeriod: 'Q2 2024',
  assignments: [
    {
      id: 'a1',
      classId: '1',
      title: 'Quiz 1',
      type: 'quiz',
      category: 'Quizzes',
      totalPoints: 20,
      dueDate: '2024-12-01',
      status: 'closed',
    },
    {
      id: 'a2',
      classId: '1',
      title: 'HW Ch5',
      type: 'homework',
      category: 'Homework',
      totalPoints: 10,
      dueDate: '2024-12-05',
      status: 'closed',
    },
    {
      id: 'a3',
      classId: '1',
      title: 'Quiz 2',
      type: 'quiz',
      category: 'Quizzes',
      totalPoints: 20,
      dueDate: '2024-12-10',
      status: 'closed',
    },
    {
      id: 'a4',
      classId: '1',
      title: 'HW Ch6',
      type: 'homework',
      category: 'Homework',
      totalPoints: 10,
      dueDate: '2024-12-12',
      status: 'published',
    },
    {
      id: 'a5',
      classId: '1',
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

export default function GradebookPage() {
  const [selectedClass, setSelectedClass] = React.useState('1');

  const handleGradeChange = async (
    studentId: string,
    assignmentId: string,
    score: number | null
  ) => {
    // In production, this would call the API
    console.log('Grade change:', { studentId, assignmentId, score });
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
  };

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
              <option value="1">Algebra I - Period 1</option>
              <option value="2">Algebra I - Period 3</option>
              <option value="3">Geometry - Period 2</option>
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
        <GradebookTable gradebook={mockGradebook} onGradeChange={handleGradeChange} />
      </div>
    </div>
  );
}
