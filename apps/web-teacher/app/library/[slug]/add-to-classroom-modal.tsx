'use client';

/**
 * Add to Classroom Modal
 *
 * Allows teachers to select one or more classrooms to add
 * a marketplace item to.
 */

import { Button } from '@aivo/ui-web';
import { useState, useEffect } from 'react';

import { type MarketplaceLibraryItem, addContentToClassroom } from '../../../lib/marketplace-api';

interface Classroom {
  id: string;
  name: string;
  gradeBand: string;
  studentCount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  item: MarketplaceLibraryItem;
}

// TODO: Replace with actual API call
const MOCK_CLASSROOMS: Classroom[] = [
  { id: 'classroom-1', name: 'Period 1 - Algebra I', gradeBand: 'GRADES_6_8', studentCount: 24 },
  { id: 'classroom-2', name: 'Period 2 - Geometry', gradeBand: 'GRADES_9_12', studentCount: 28 },
  {
    id: 'classroom-3',
    name: 'Period 3 - Pre-Calculus',
    gradeBand: 'GRADES_9_12',
    studentCount: 22,
  },
  { id: 'classroom-4', name: 'Period 4 - Algebra II', gradeBand: 'GRADES_9_12', studentCount: 26 },
];

// TODO: Get from auth context
const MOCK_TEACHER_ID = 'teacher-123';

export function AddToClassroomModal({ open, onClose, item }: Props) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setSelectedClassrooms(new Set());
      setSuccess(false);
      setError(null);
      // TODO: Fetch actual classrooms from API
      setTimeout(() => {
        setClassrooms(MOCK_CLASSROOMS);
        setLoading(false);
      }, 300);
    }
  }, [open]);

  function toggleClassroom(id: string) {
    setSelectedClassrooms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedClassrooms(new Set(classrooms.map((c) => c.id)));
  }

  function deselectAll() {
    setSelectedClassrooms(new Set());
  }

  async function handleAdd() {
    if (selectedClassrooms.size === 0) return;

    setAdding(true);
    setError(null);

    try {
      // Add to all selected classrooms
      await Promise.all(
        Array.from(selectedClassrooms).map((classroomId) =>
          addContentToClassroom(classroomId, item.id, MOCK_TEACHER_ID)
        )
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to classrooms');
    } finally {
      setAdding(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">Add to Classroom</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-text"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {success ? (
            <SuccessView item={item} classroomCount={selectedClassrooms.size} onClose={onClose} />
          ) : (
            <>
              {/* Item Summary */}
              <div className="mb-4 flex items-center gap-3 rounded-lg bg-surface-muted p-3">
                {item.iconUrl ? (
                  <img src={item.iconUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-xl">
                    {item.itemType === 'CONTENT_PACK' ? '📚' : '🔧'}
                  </div>
                )}
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted">{item.vendor.name}</p>
                </div>
              </div>

              {/* Classroom Selection */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted">Select classrooms:</p>
                  <div className="flex gap-2 text-xs">
                    <button onClick={selectAll} className="text-primary hover:underline">
                      Select all
                    </button>
                    <span className="text-muted">|</span>
                    <button onClick={deselectAll} className="text-primary hover:underline">
                      Clear
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
                    ))}
                  </div>
                ) : classrooms.length === 0 ? (
                  <div className="rounded-lg border border-border bg-surface-muted p-4 text-center">
                    <p className="text-sm text-muted">No classrooms available.</p>
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {classrooms.map((classroom) => (
                      <label
                        key={classroom.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                          selectedClassrooms.has(classroom.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-surface-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedClassrooms.has(classroom.id)}
                          onChange={() => {
                            toggleClassroom(classroom.id);
                          }}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{classroom.name}</p>
                          <p className="text-xs text-muted">{classroom.studentCount} students</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-3 border-t border-border p-4">
            <Button variant="ghost" onClick={onClose} disabled={adding}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={selectedClassrooms.size === 0 || adding}
            >
              {adding
                ? 'Adding...'
                : `Add to ${selectedClassrooms.size} Classroom${selectedClassrooms.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessView({
  item,
  classroomCount,
  onClose,
}: {
  item: MarketplaceLibraryItem;
  classroomCount: number;
  onClose: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-8 w-8 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold">Added Successfully!</h3>
      <p className="mt-2 text-sm text-muted">
        <strong>{item.title}</strong> has been added to {classroomCount} classroom
        {classroomCount !== 1 ? 's' : ''}.
      </p>
      <p className="mt-1 text-sm text-muted">You can now use it when creating lessons.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={onClose}>
          View Classrooms
        </Button>
      </div>
    </div>
  );
}
