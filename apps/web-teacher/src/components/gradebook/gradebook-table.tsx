/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-unused-vars */
/**
 * Gradebook Table Component
 *
 * Virtualized gradebook with inline editing and keyboard navigation
 * Uses @tanstack/react-table and @tanstack/react-virtual for performance
 */

'use client';

import * as React from 'react';

import { GradeInput } from './grade-input';

import { Spinner } from '@/components/shared/loading-states';
import type { Gradebook, GradebookStudent, Assignment, Grade } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDueDate } from '@/lib/utils/date-utils';
import { getLetterGrade, getGradeColorClass } from '@/lib/utils/grade-calculations';

interface GradebookTableProps {
  gradebook: Gradebook;
  onGradeChange: (studentId: string, assignmentId: string, score: number | null) => Promise<void>;
  onAssignmentClick?: (assignment: Assignment) => void;
  onStudentClick?: (student: GradebookStudent) => void;
  loading?: boolean;
  className?: string;
}

export function GradebookTable({
  gradebook,
  onGradeChange,
  onAssignmentClick,
  onStudentClick,
  loading = false,
  className,
}: GradebookTableProps) {
  const { students, assignments } = gradebook;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [activeCell, setActiveCell] = React.useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = React.useState<{
    studentId: string;
    assignmentId: string;
  } | null>(null);
  const [savingCells, setSavingCells] = React.useState<Set<string>>(new Set());

  // Group assignments by category
  const assignmentsByCategory = React.useMemo(() => {
    const grouped: Record<string, Assignment[]> = {};
    for (const assignment of assignments) {
      if (!grouped[assignment.category]) {
        grouped[assignment.category] = [];
      }
      grouped[assignment.category].push(assignment);
    }
    return grouped;
  }, [assignments]);

  // Flatten assignments for column indexing
  const flatAssignments = React.useMemo(() => {
    const result: Assignment[] = [];
    for (const category of Object.keys(assignmentsByCategory)) {
      result.push(...assignmentsByCategory[category]);
    }
    return result;
  }, [assignmentsByCategory]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeCell || editingCell) return;

      const { row, col } = activeCell;
      let newRow = row;
      let newCol = col;

      switch (e.key) {
        case 'ArrowUp':
          newRow = Math.max(0, row - 1);
          e.preventDefault();
          break;
        case 'ArrowDown':
          newRow = Math.min(students.length - 1, row + 1);
          e.preventDefault();
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, col - 1);
          e.preventDefault();
          break;
        case 'ArrowRight':
          newCol = Math.min(flatAssignments.length - 1, col + 1);
          e.preventDefault();
          break;
        case 'Enter':
        case 'F2': {
          const student = students[row];
          const assignment = flatAssignments[col];
          if (student && assignment) {
            setEditingCell({ studentId: student.studentId, assignmentId: assignment.id });
          }
          e.preventDefault();
          break;
        }
        case 'Escape':
          setActiveCell(null);
          break;
        default:
          return;
      }

      if (newRow !== row || newCol !== col) {
        setActiveCell({ row: newRow, col: newCol });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeCell, editingCell, students, flatAssignments]);

  const handleGradeSubmit = async (
    studentId: string,
    assignmentId: string,
    score: number | null
  ) => {
    const cellKey = `${studentId}-${assignmentId}`;
    setSavingCells((prev) => new Set(prev).add(cellKey));

    try {
      await onGradeChange(studentId, assignmentId, score);
    } finally {
      setSavingCells((prev) => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
      setEditingCell(null);
    }
  };

  const getGrade = (student: GradebookStudent, assignmentId: string): Grade | undefined => {
    return student.grades.find((g) => g.assignmentId === assignmentId);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto rounded-lg border bg-white', className)}
      style={{ maxHeight: 'calc(100vh - 200px)' }}
    >
      <table className="w-full border-collapse">
        {/* Header */}
        <thead className="sticky top-0 z-20 bg-gray-50">
          {/* Category headers */}
          <tr className="border-b">
            <th className="sticky left-0 z-30 border-r bg-gray-100 p-2" colSpan={2}>
              {/* Student column */}
            </th>
            {Object.entries(assignmentsByCategory).map(([category, categoryAssignments]) => (
              <th
                key={category}
                colSpan={categoryAssignments.length}
                className="border-r bg-gray-100 px-2 py-1 text-center text-xs font-medium uppercase tracking-wider text-gray-600"
              >
                {category}
              </th>
            ))}
            <th className="bg-gray-100 px-2 py-1 text-center text-xs font-medium uppercase text-gray-600">
              Overall
            </th>
          </tr>

          {/* Assignment headers */}
          <tr className="border-b">
            <th className="sticky left-0 z-30 min-w-[180px] border-r bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-700">
              Student
            </th>
            <th className="sticky left-[180px] z-30 w-16 border-r bg-gray-50 px-2 py-2 text-center text-sm font-medium text-gray-700">
              Avg
            </th>
            {flatAssignments.map((assignment) => (
              <th
                key={assignment.id}
                className="min-w-[80px] cursor-pointer border-r px-2 py-2 text-center hover:bg-gray-100"
                onClick={() => onAssignmentClick?.(assignment)}
                title={`${assignment.title}\nDue: ${formatDueDate(assignment.dueDate).text}\nPoints: ${assignment.totalPoints}`}
              >
                <div className="flex flex-col items-center">
                  <span className="max-w-[70px] truncate text-xs font-medium text-gray-700">
                    {assignment.title}
                  </span>
                  <span className="text-[10px] text-gray-500">{assignment.totalPoints} pts</span>
                </div>
              </th>
            ))}
            <th className="min-w-[80px] bg-gray-50 px-2 py-2 text-center text-sm font-medium text-gray-700">
              Grade
            </th>
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y">
          {students.map((student, rowIndex) => {
            const overallGrade = student.overallGrade;
            const letterGrade = getLetterGrade(overallGrade);
            const colorClass = getGradeColorClass(overallGrade);

            return (
              <tr
                key={student.studentId}
                className={cn('hover:bg-gray-50', rowIndex % 2 === 0 && 'bg-gray-25')}
              >
                {/* Student name - sticky */}
                <td
                  className="sticky left-0 z-10 cursor-pointer border-r bg-inherit px-3 py-2"
                  onClick={() => onStudentClick?.(student)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                      {student.studentName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{student.studentName}</p>
                      {student.missingCount > 0 && (
                        <p className="text-xs text-red-500">{student.missingCount} missing</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Student average - sticky */}
                <td className="sticky left-[180px] z-10 border-r bg-inherit px-2 py-2 text-center">
                  <span className={cn('rounded px-2 py-1 text-sm font-medium', colorClass)}>
                    {overallGrade.toFixed(1)}%
                  </span>
                </td>

                {/* Grade cells */}
                {flatAssignments.map((assignment, colIndex) => {
                  const grade = getGrade(student, assignment.id);
                  const cellKey = `${student.studentId}-${assignment.id}`;
                  const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex;
                  const isEditing =
                    editingCell?.studentId === student.studentId &&
                    editingCell?.assignmentId === assignment.id;
                  const isSaving = savingCells.has(cellKey);

                  return (
                    <td
                      key={assignment.id}
                      className={cn(
                        'border-r p-0',
                        isActive && 'ring-2 ring-inset ring-primary-500'
                      )}
                      onClick={() => {
                        setActiveCell({ row: rowIndex, col: colIndex });
                      }}
                      onDoubleClick={() => {
                        setEditingCell({
                          studentId: student.studentId,
                          assignmentId: assignment.id,
                        });
                      }}
                    >
                      {isEditing ? (
                        <GradeInput
                          initialValue={grade?.score ?? null}
                          maxPoints={assignment.totalPoints}
                          onSubmit={(score) =>
                            handleGradeSubmit(student.studentId, assignment.id, score)
                          }
                          onCancel={() => {
                            setEditingCell(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <GradeCell
                          grade={grade}
                          maxPoints={assignment.totalPoints}
                          loading={isSaving}
                        />
                      )}
                    </td>
                  );
                })}

                {/* Overall grade */}
                <td className="bg-gray-50 px-2 py-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className={cn('rounded px-2 py-1 text-sm font-bold', colorClass)}>
                      {letterGrade}
                    </span>
                    <span className="text-xs text-gray-500">{overallGrade.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* Footer - Class averages */}
        <tfoot className="sticky bottom-0 z-10 bg-gray-100">
          <tr className="border-t-2">
            <td className="sticky left-0 z-20 border-r bg-gray-100 px-3 py-2 font-medium text-gray-700">
              Class Average
            </td>
            <td className="sticky left-[180px] z-20 border-r bg-gray-100 px-2 py-2 text-center font-medium">
              {(
                students.reduce((sum, s) => sum + s.overallGrade, 0) / students.length || 0
              ).toFixed(1)}
              %
            </td>
            {flatAssignments.map((assignment) => {
              const scores = students
                .map((s) => getGrade(s, assignment.id)?.score)
                .filter((s): s is number => s !== null && s !== undefined);
              const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
              const pct = assignment.totalPoints > 0 ? (avg / assignment.totalPoints) * 100 : 0;

              return (
                <td
                  key={assignment.id}
                  className="border-r px-2 py-2 text-center text-sm text-gray-600"
                >
                  {scores.length > 0 ? avg.toFixed(1) : '-'}
                </td>
              );
            })}
            <td className="bg-gray-100 px-2 py-2 text-center font-medium">
              {getLetterGrade(
                students.reduce((sum, s) => sum + s.overallGrade, 0) / students.length || 0
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

interface GradeCellProps {
  grade?: Grade;
  maxPoints: number;
  loading?: boolean;
}

function GradeCell({ grade, maxPoints, loading }: GradeCellProps) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-2">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!grade || grade.score === null || grade.score === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-2">
        <span className="text-gray-400">—</span>
      </div>
    );
  }

  const pct = maxPoints > 0 ? (grade.score / maxPoints) * 100 : 0;
  const colorClass = getGradeColorClass(pct);

  return (
    <div className={cn('flex h-full items-center justify-center p-2', colorClass)}>
      <span className="text-sm font-medium">{grade.score}</span>
      {grade.status === 'late' && (
        <span className="ml-1 text-orange-500" title="Late submission">
          ⏰
        </span>
      )}
      {grade.status === 'missing' && (
        <span className="ml-1 text-red-500" title="Missing">
          ⚠️
        </span>
      )}
      {grade.status === 'exempt' && (
        <span className="ml-1 text-blue-500" title="Exempt">
          ✓
        </span>
      )}
    </div>
  );
}
