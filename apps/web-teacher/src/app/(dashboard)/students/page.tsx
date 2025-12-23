/**
 * Students List Page
 */

import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

// Mock data
const students = [
  {
    id: '1',
    firstName: 'Emma',
    lastName: 'Wilson',
    grade: 8,
    currentGrade: 92,
    hasIep: false,
    missingAssignments: 0,
  },
  {
    id: '2',
    firstName: 'Michael',
    lastName: 'Chen',
    grade: 8,
    currentGrade: 85,
    hasIep: true,
    missingAssignments: 1,
  },
  {
    id: '3',
    firstName: 'Olivia',
    lastName: 'Brown',
    grade: 8,
    currentGrade: 78,
    hasIep: false,
    missingAssignments: 2,
  },
  {
    id: '4',
    firstName: 'Alex',
    lastName: 'Smith',
    grade: 8,
    currentGrade: 65,
    hasIep: true,
    missingAssignments: 4,
  },
  {
    id: '5',
    firstName: 'Sarah',
    lastName: 'Johnson',
    grade: 8,
    currentGrade: 88,
    hasIep: false,
    missingAssignments: 0,
  },
  {
    id: '6',
    firstName: 'David',
    lastName: 'Lee',
    grade: 8,
    currentGrade: 72,
    hasIep: false,
    missingAssignments: 3,
  },
];

export default function StudentsPage() {
  return (
    <div>
      <PageHeader
        title="Students"
        description="View and manage all your students"
        actions={
          <div className="flex gap-2">
            <select className="rounded-lg border px-3 py-2 text-sm">
              <option value="">All Classes</option>
              <option value="1">Algebra I - Period 1</option>
              <option value="2">Algebra I - Period 3</option>
              <option value="3">Geometry - Period 2</option>
            </select>
            <input
              type="search"
              placeholder="Search students..."
              className="rounded-lg border px-4 py-2 text-sm"
            />
          </div>
        }
      />

      <div className="mt-6 rounded-xl border bg-white">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Grade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Current Avg
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Missing
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/students/${student.id}`} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </div>
                    <span className="font-medium text-gray-900 hover:text-primary-600">
                      {student.firstName} {student.lastName}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{student.grade}</td>
                <td className="px-4 py-3">
                  <span className={getGradeClass(student.currentGrade)}>
                    {student.currentGrade}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  {student.hasIep && (
                    <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                      IEP
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {student.missingAssignments > 0 ? (
                    <span className="text-sm text-red-600">{student.missingAssignments}</span>
                  ) : (
                    <span className="text-sm text-green-600">✓</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/students/${student.id}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getGradeClass(grade: number): string {
  if (grade >= 90) return 'font-medium text-green-600';
  if (grade >= 80) return 'font-medium text-blue-600';
  if (grade >= 70) return 'font-medium text-yellow-600';
  if (grade >= 60) return 'font-medium text-orange-600';
  return 'font-medium text-red-600';
}
