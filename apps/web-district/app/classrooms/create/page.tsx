'use client';

import { Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../../providers';

// ============================================================================
// Types
// ============================================================================

interface School {
  id: string;
  name: string;
}

interface TeacherResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

// ============================================================================
// Helpers
// ============================================================================

const GRADE_LEVELS = [
  'Pre-K',
  'K',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

// ============================================================================
// Component
// ============================================================================

export default function CreateClassroomPage() {
  const router = useRouter();
  const { tenantId: authTenantId } = useAuth();
  const tenantId = authTenantId ?? '';

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Schools dropdown
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);

  // Teacher search
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherResults, setTeacherResults] = useState<TeacherResult[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherResult | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load schools on mount
  useEffect(() => {
    async function loadSchools() {
      try {
        const res = await fetch(`/api/schools?tenantId=${tenantId}`);
        if (!res.ok) throw new Error('Failed to load schools');
        const data = (await res.json()) as { items: School[] };
        setSchools(data.items ?? []);
      } catch {
        // Non-fatal — user can still create without selecting a school
      } finally {
        setSchoolsLoading(false);
      }
    }
    void loadSchools();
  }, [tenantId]);

  // Debounced teacher search
  const handleTeacherSearch = useCallback(
    (value: string) => {
      setTeacherSearch(value);
      if (searchTimer.current) clearTimeout(searchTimer.current);

      if (!value || value.length < 2) {
        setTeacherResults([]);
        return;
      }

      searchTimer.current = setTimeout(() => {
        void (async () => {
          try {
            setTeacherLoading(true);
            const params = new URLSearchParams({
              tenantId: tenantId,
              search: value,
              role: 'TEACHER',
              limit: '10',
            });
            const res = await fetch(`/api/users?${params}`);
            if (!res.ok) throw new Error('Search failed');
            const data = (await res.json()) as { users?: TeacherResult[] };
            setTeacherResults(data.users ?? []);
          } catch {
            setTeacherResults([]);
          } finally {
            setTeacherLoading(false);
          }
        })();
      }, 300);
    },
    [tenantId]
  );

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const form = new FormData(e.currentTarget);
    const name = (form.get('name') as string).trim();
    const schoolId = (form.get('schoolId') as string) || undefined;
    const gradeLevel = (form.get('gradeLevel') as string) || undefined;
    const teacherId = selectedTeacher?.id ?? undefined;

    if (!name) {
      setError('Classroom name is required.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name,
          schoolId,
          gradeLevel,
          teacherId,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Failed to create classroom (${res.status})`);
      }

      const classroom = (await res.json()) as { id: string };
      setSuccess(true);

      setTimeout(() => {
        router.push(`/classrooms/${classroom.id}`);
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create classroom');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted">
        <Link href="/classrooms" className="hover:text-primary hover:underline">
          Classrooms
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text">Create</span>
      </nav>

      <Heading kicker="New Classroom" className="text-headline font-semibold">
        Create Classroom
      </Heading>

      {/* Success message */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Classroom created successfully! Redirecting...
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card title="Classroom details">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 p-1"
          data-testid="create-classroom-form"
        >
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm font-medium text-text">
              Classroom Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              data-testid="classroom-name-input"
              placeholder="e.g. Mrs. Smith's 3rd Grade"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* School */}
          <div className="space-y-1">
            <label htmlFor="schoolId" className="block text-sm font-medium text-text">
              School
            </label>
            <select
              id="schoolId"
              name="schoolId"
              data-testid="classroom-school-select"
              disabled={schoolsLoading}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">
                {schoolsLoading ? 'Loading schools...' : 'Select a school (optional)'}
              </option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Level */}
          <div className="space-y-1">
            <label htmlFor="gradeLevel" className="block text-sm font-medium text-text">
              Grade Level
            </label>
            <select
              id="gradeLevel"
              name="gradeLevel"
              data-testid="classroom-grade-select"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select a grade level (optional)</option>
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher Assignment */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text">Teacher Assignment</label>
            {selectedTeacher ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
                <span className="font-medium text-text">
                  {selectedTeacher.firstName} {selectedTeacher.lastName}
                </span>
                <span className="text-muted">{selectedTeacher.email}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeacher(null);
                    setTeacherSearch('');
                  }}
                  className="ml-auto text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Search teachers by name or email..."
                  data-testid="teacher-search-input"
                  value={teacherSearch}
                  onChange={(e) => { handleTeacherSearch(e.target.value); }}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {teacherLoading && (
                  <p className="mt-1 text-xs text-muted">Searching...</p>
                )}
                {teacherResults.length > 0 && (
                  <ul className="mt-1 max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface" data-testid="teacher-results">
                    {teacherResults.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          data-testid={`select-teacher-${t.id}`}
                          onClick={() => {
                            setSelectedTeacher(t);
                            setTeacherSearch('');
                            setTeacherResults([]);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-muted"
                        >
                          <div>
                            <span className="font-medium text-text">
                              {t.firstName} {t.lastName}
                            </span>
                            <span className="ml-2 text-muted">{t.email}</span>
                          </div>
                          <span className="text-xs text-primary">+ Select</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {teacherSearch.length >= 2 && !teacherLoading && teacherResults.length === 0 && (
                  <p className="mt-1 text-xs text-muted">No teachers found.</p>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
            <Link href="/classrooms">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </section>
  );
}
