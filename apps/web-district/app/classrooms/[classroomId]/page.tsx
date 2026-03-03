'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../../providers';

// ============================================================================
// Types
// ============================================================================

interface ClassroomDetail {
  id: string;
  name: string;
  gradeLevel: string | null;
  subject: string | null;
  school: { id: string; name: string } | null;
  schoolId: string | null;
  teacher: { id: string; firstName: string; lastName: string; email: string } | null;
  learners: Learner[];
  learnerCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Learner {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  gradeLevel: string | null;
}

interface School {
  id: string;
  name: string;
}

interface UserResult {
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
  'Pre-K', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
];

// ============================================================================
// Component
// ============================================================================

export default function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const router = useRouter();
  const { tenantId: authTenantId } = useAuth();
  const tenantId = authTenantId ?? '';

  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'details' | 'students' | 'teacher'>('details');

  // Edit mode (details tab)
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editSchoolId, setEditSchoolId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Schools for dropdown
  const [schools, setSchools] = useState<School[]>([]);

  // Teacher reassignment
  const [showTeacherSearch, setShowTeacherSearch] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherResults, setTeacherResults] = useState<UserResult[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const teacherTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Student management
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<UserResult[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [addingStudent, setAddingStudent] = useState<string | null>(null);
  const [removingStudent, setRemovingStudent] = useState<string | null>(null);
  const studentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Resolve params (Next.js 15: params is a Promise)
  useEffect(() => {
    void params.then((p) => {
      setClassroomId(p.classroomId);
    });
  }, [params]);

  // Load classroom
  const loadClassroom = useCallback(async () => {
    if (!classroomId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/classrooms/${classroomId}?tenantId=${tenantId}`);
      if (!res.ok) throw new Error(`Failed to load classroom (${res.status})`);
      const data = (await res.json()) as ClassroomDetail;
      setClassroom(data);
      setEditName(data.name);
      setEditGrade(data.gradeLevel ?? '');
      setEditSubject(data.subject ?? '');
      setEditSchoolId(data.schoolId ?? data.school?.id ?? '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load classroom');
    } finally {
      setLoading(false);
    }
  }, [classroomId, tenantId]);

  useEffect(() => {
    void loadClassroom();
  }, [loadClassroom]);

  // Load schools for edit dropdown
  useEffect(() => {
    async function loadSchools() {
      try {
        const res = await fetch(`/api/schools?tenantId=${tenantId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { items: School[] };
        setSchools(data.items ?? []);
      } catch {
        // Non-fatal
      }
    }
    void loadSchools();
  }, [tenantId]);

  // Debounced teacher search
  useEffect(() => {
    if (teacherTimer.current) clearTimeout(teacherTimer.current);
    if (!teacherSearch || teacherSearch.length < 2) {
      setTeacherResults([]);
      return;
    }
    teacherTimer.current = setTimeout(() => {
      void (async () => {
        try {
          setTeacherLoading(true);
          const p = new URLSearchParams({
            tenantId: tenantId,
            search: teacherSearch,
            role: 'TEACHER',
            limit: '10',
          });
          const res = await fetch(`/api/users?${p}`);
          if (!res.ok) throw new Error('Search failed');
          const data = (await res.json()) as { users?: UserResult[] };
          setTeacherResults(data.users ?? []);
        } catch {
          setTeacherResults([]);
        } finally {
          setTeacherLoading(false);
        }
      })();
    }, 300);
    return () => {
      if (teacherTimer.current) clearTimeout(teacherTimer.current);
    };
  }, [teacherSearch, tenantId]);

  // Debounced student search
  useEffect(() => {
    if (studentTimer.current) clearTimeout(studentTimer.current);
    if (!studentSearch || studentSearch.length < 2) {
      setStudentResults([]);
      return;
    }
    studentTimer.current = setTimeout(() => {
      void (async () => {
        try {
          setStudentLoading(true);
          const p = new URLSearchParams({
            tenantId: tenantId,
            search: studentSearch,
            role: 'LEARNER',
            limit: '10',
          });
          const res = await fetch(`/api/users?${p}`);
          if (!res.ok) throw new Error('Search failed');
          const data = (await res.json()) as { users?: UserResult[] };
          // Filter out already-enrolled students
          const enrolledIds = new Set((classroom?.learners ?? []).map((l) => l.id));
          setStudentResults((data.users ?? []).filter((u) => !enrolledIds.has(u.id)));
        } catch {
          setStudentResults([]);
        } finally {
          setStudentLoading(false);
        }
      })();
    }, 300);
    return () => {
      if (studentTimer.current) clearTimeout(studentTimer.current);
    };
  }, [studentSearch, classroom?.learners, tenantId]);

  // Save classroom details
  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!classroom) return;
    setSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch(`/api/classrooms/${classroom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: editName,
          gradeLevel: editGrade || null,
          subject: editSubject || null,
          schoolId: editSchoolId || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Failed to update classroom');
      }

      setSaveMsg('Classroom updated successfully.');
      setEditing(false);
      await loadClassroom();
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // Assign teacher
  async function handleAssignTeacher(teacher: UserResult) {
    if (!classroom) return;
    setAssigningTeacher(true);
    try {
      const res = await fetch(`/api/classrooms/${classroom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          teacherId: teacher.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to assign teacher');
      setShowTeacherSearch(false);
      setTeacherSearch('');
      setTeacherResults([]);
      await loadClassroom();
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed to assign teacher');
    } finally {
      setAssigningTeacher(false);
    }
  }

  // Add student
  async function handleAddStudent(student: UserResult) {
    if (!classroom) return;
    setAddingStudent(student.id);
    try {
      const res = await fetch(`/api/classrooms/${classroom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          addLearnerId: student.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to add student');
      setStudentSearch('');
      setStudentResults([]);
      await loadClassroom();
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setAddingStudent(null);
    }
  }

  // Remove student
  async function handleRemoveStudent(learnerId: string) {
    if (!classroom) return;
    setRemovingStudent(learnerId);
    try {
      const res = await fetch(`/api/classrooms/${classroom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          removeLearnerId: learnerId,
        }),
      });
      if (!res.ok) throw new Error('Failed to remove student');
      await loadClassroom();
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed to remove student');
    } finally {
      setRemovingStudent(null);
    }
  }

  // Delete classroom
  async function handleDelete() {
    if (!classroom) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/classrooms/${classroom.id}?tenantId=${tenantId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete classroom');
      router.push('/classrooms');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete classroom');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  // ---- Render ----

  if (loading) {
    return (
      <section className="space-y-5">
        <div className="p-8 text-center text-muted">Loading classroom...</div>
      </section>
    );
  }

  if (error || !classroom) {
    return (
      <section className="space-y-5">
        <nav className="text-sm text-muted">
          <Link href="/classrooms" className="hover:text-primary hover:underline">
            Classrooms
          </Link>
          <span className="mx-2">/</span>
          <span className="text-text">Not found</span>
        </nav>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? 'Classroom not found.'}
          <Link href="/classrooms" className="ml-4 underline hover:no-underline">
            Back to classrooms
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5" data-testid="classroom-detail-page">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted">
        <Link href="/classrooms" className="hover:text-primary hover:underline">
          Classrooms
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text">{classroom.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="Classroom" className="text-headline font-semibold">
          {classroom.name}
        </Heading>
        <div className="flex items-center gap-2">
          {!editing && activeTab === 'details' && (
            <Button
              variant="primary"
              data-testid="edit-classroom"
              onClick={() => {
                setEditing(true);
                setSaveMsg(null);
              }}
            >
              Edit
            </Button>
          )}
          <Button
            variant="ghost"
            data-testid="delete-classroom"
            onClick={() => { setShowDeleteConfirm(true); }}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Save/update message */}
      {saveMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {saveMsg}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <Card title="Edit Classroom">
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4 p-1">
            <div className="space-y-1">
              <label htmlFor="edit-name" className="block text-sm font-medium text-text">
                Classroom Name
              </label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => { setEditName(e.target.value); }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-school" className="block text-sm font-medium text-text">
                School
              </label>
              <select
                id="edit-school"
                value={editSchoolId}
                onChange={(e) => { setEditSchoolId(e.target.value); }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No school assigned</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-grade" className="block text-sm font-medium text-text">
                Grade Level
              </label>
              <select
                id="edit-grade"
                value={editGrade}
                onChange={(e) => { setEditGrade(e.target.value); }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No grade level</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-subject" className="block text-sm font-medium text-text">
                Subject
              </label>
              <input
                id="edit-subject"
                type="text"
                value={editSubject}
                onChange={(e) => { setEditSubject(e.target.value); }}
                placeholder="e.g. Mathematics, Reading"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditName(classroom.name);
                  setEditGrade(classroom.gradeLevel ?? '');
                  setEditSubject(classroom.subject ?? '');
                  setEditSchoolId(classroom.schoolId ?? classroom.school?.id ?? '');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => { setActiveTab('details'); }}
          data-testid="tab-details"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'details'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted hover:text-text'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => { setActiveTab('students'); }}
          data-testid="tab-students"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'students'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted hover:text-text'
          }`}
        >
          Students
        </button>
        <button
          onClick={() => { setActiveTab('teacher'); }}
          data-testid="tab-teacher"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'teacher'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted hover:text-text'
          }`}
        >
          Teacher
        </button>
      </div>

      {/* ================================================================ */}
      {/* Details Tab                                                      */}
      {/* ================================================================ */}
      {activeTab === 'details' && (
        <Card title="Classroom Information">
          <dl className="grid gap-4 sm:grid-cols-2 p-1">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Name</dt>
              <dd className="mt-1 text-sm text-text">{classroom.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">School</dt>
              <dd className="mt-1 text-sm text-text">{classroom.school?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Grade Level
              </dt>
              <dd className="mt-1 text-sm text-text">
                {classroom.gradeLevel ? (
                  <Badge tone="neutral">{classroom.gradeLevel}</Badge>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Subject</dt>
              <dd className="mt-1 text-sm text-text">{classroom.subject ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Teacher
              </dt>
              <dd className="mt-1 text-sm text-text">
                {classroom.teacher
                  ? `${classroom.teacher.firstName} ${classroom.teacher.lastName}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Students
              </dt>
              <dd className="mt-1 text-sm text-text">{classroom.learnerCount ?? classroom.learners?.length ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Created</dt>
              <dd className="mt-1 text-sm text-text">
                {new Date(classroom.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Last Updated
              </dt>
              <dd className="mt-1 text-sm text-text">
                {new Date(classroom.updatedAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {/* ================================================================ */}
      {/* Students Tab                                                     */}
      {/* ================================================================ */}
      {activeTab === 'students' && (
        <Card title="Enrolled Students">
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">
                {(classroom.learners ?? []).length} student
                {(classroom.learners ?? []).length !== 1 ? 's' : ''} enrolled.
              </p>
              <Button
                variant="primary"
                data-testid="add-student-btn"
                onClick={() => {
                  setShowStudentSearch(!showStudentSearch);
                  setStudentSearch('');
                  setStudentResults([]);
                }}
              >
                {showStudentSearch ? 'Cancel' : 'Add Student'}
              </Button>
            </div>

            {/* Add student search */}
            {showStudentSearch && (
              <div className="rounded-lg border border-border bg-surface-muted p-4">
                <label className="mb-1 block text-sm font-medium text-text">
                  Search for student to add
                </label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  data-testid="student-search-input"
                  value={studentSearch}
                  onChange={(e) => { setStudentSearch(e.target.value); }}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {studentLoading && (
                  <p className="mt-2 text-xs text-muted">Searching...</p>
                )}
                {studentResults.length > 0 && (
                  <ul className="mt-2 max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface" data-testid="student-results">
                    {studentResults.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          data-testid={`add-student-${s.id}`}
                          disabled={addingStudent === s.id}
                          onClick={() => void handleAddStudent(s)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-muted disabled:opacity-50"
                        >
                          <div>
                            <span className="font-medium text-text">
                              {s.firstName} {s.lastName}
                            </span>
                            <span className="ml-2 text-muted">{s.email}</span>
                          </div>
                          {addingStudent === s.id ? (
                            <span className="text-xs text-muted">Adding...</span>
                          ) : (
                            <span className="text-xs text-primary">+ Add</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {studentSearch.length >= 2 && !studentLoading && studentResults.length === 0 && (
                  <p className="mt-2 text-xs text-muted">No matching students found.</p>
                )}
              </div>
            )}

            {/* Enrolled students list */}
            <div data-testid="students-list">
              {(classroom.learners ?? []).length === 0 && (
                <p className="text-sm text-muted">
                  No students enrolled yet. Click &quot;Add Student&quot; to enroll learners.
                </p>
              )}
              {(classroom.learners ?? []).length > 0 && (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {classroom.learners.map((learner) => (
                    <div
                      key={learner.id}
                      className="flex items-center justify-between px-4 py-3"
                      data-testid={`student-row-${learner.id}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-text">
                          {learner.firstName} {learner.lastName}
                        </p>
                        {learner.email && (
                          <p className="text-xs text-muted">{learner.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {learner.gradeLevel && (
                          <Badge tone="neutral">{learner.gradeLevel}</Badge>
                        )}
                        <Button
                          variant="ghost"
                          data-testid={`remove-student-${learner.id}`}
                          onClick={() => void handleRemoveStudent(learner.id)}
                          disabled={removingStudent === learner.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {removingStudent === learner.id ? 'Removing...' : 'Remove'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ================================================================ */}
      {/* Teacher Tab                                                      */}
      {/* ================================================================ */}
      {activeTab === 'teacher' && (
        <Card title="Assigned Teacher">
          <div className="space-y-4 p-1">
            {classroom.teacher ? (
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3" data-testid="assigned-teacher">
                <div>
                  <p className="text-sm font-medium text-text">
                    {classroom.teacher.firstName} {classroom.teacher.lastName}
                  </p>
                  <p className="text-xs text-muted">{classroom.teacher.email}</p>
                </div>
                <Button
                  variant="primary"
                  data-testid="reassign-teacher-btn"
                  onClick={() => {
                    setShowTeacherSearch(!showTeacherSearch);
                    setTeacherSearch('');
                    setTeacherResults([]);
                  }}
                >
                  {showTeacherSearch ? 'Cancel' : 'Reassign'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">No teacher assigned to this classroom.</p>
                <Button
                  variant="primary"
                  data-testid="assign-teacher-btn"
                  onClick={() => {
                    setShowTeacherSearch(true);
                    setTeacherSearch('');
                    setTeacherResults([]);
                  }}
                >
                  Assign Teacher
                </Button>
              </div>
            )}

            {/* Teacher search */}
            {showTeacherSearch && (
              <div className="rounded-lg border border-border bg-surface-muted p-4">
                <label className="mb-1 block text-sm font-medium text-text">
                  Search for teacher
                </label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  data-testid="teacher-search-input"
                  value={teacherSearch}
                  onChange={(e) => { setTeacherSearch(e.target.value); }}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {teacherLoading && (
                  <p className="mt-2 text-xs text-muted">Searching...</p>
                )}
                {teacherResults.length > 0 && (
                  <ul className="mt-2 max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface" data-testid="teacher-results">
                    {teacherResults.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          data-testid={`assign-teacher-${t.id}`}
                          disabled={assigningTeacher}
                          onClick={() => void handleAssignTeacher(t)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-muted disabled:opacity-50"
                        >
                          <div>
                            <span className="font-medium text-text">
                              {t.firstName} {t.lastName}
                            </span>
                            <span className="ml-2 text-muted">{t.email}</span>
                          </div>
                          {assigningTeacher ? (
                            <span className="text-xs text-muted">Assigning...</span>
                          ) : (
                            <span className="text-xs text-primary">+ Assign</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {teacherSearch.length >= 2 && !teacherLoading && teacherResults.length === 0 && (
                  <p className="mt-2 text-xs text-muted">No matching teachers found.</p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="delete-confirm-dialog">
          <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-text">Delete Classroom</h3>
            <p className="mt-2 text-sm text-muted">
              Are you sure you want to delete <strong>{classroom.name}</strong>? This will remove
              all student enrollments and cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="ghost"
                data-testid="delete-cancel"
                onClick={() => { setShowDeleteConfirm(false); }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                data-testid="delete-confirm"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
