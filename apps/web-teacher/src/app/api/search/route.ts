/**
 * Universal Search API Route
 *
 * GET /api/search?q=query&type=student,class,assignment,lesson&limit=20
 *
 * Aggregates results from the main API gateway (classroom-svc, content-svc)
 * and returns a unified result set grouped by entity type.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/* ─── types ───────────────────────────────────────────────────────────── */

interface SearchResult {
  type: 'student' | 'class' | 'assignment' | 'lesson' | 'report';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

/* ─── helpers ─────────────────────────────────────────────────────────── */

function headers(token: string, tenantId: string, userId: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Tenant-Id': tenantId,
    'X-User-Id': userId,
    'X-Internal-Service': 'web-teacher',
  };
}

async function searchStudents(
  q: string,
  hdrs: Record<string, string>,
): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/teacher/students?search=${encodeURIComponent(q)}`,
      { headers: hdrs },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items ?? []);
    return items.map(
      (s: { id: string; firstName?: string; lastName?: string; name?: string; email?: string; grade?: string }) => ({
        type: 'student' as const,
        id: s.id,
        title: s.name ?? `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
        subtitle: [s.email, s.grade ? `Grade ${s.grade}` : null]
          .filter(Boolean)
          .join(' · ') || 'Student',
        url: `/students/${s.id}`,
      }),
    );
  } catch {
    return [];
  }
}

async function searchClasses(
  q: string,
  hdrs: Record<string, string>,
): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/teacher/classes?search=${encodeURIComponent(q)}`,
      { headers: hdrs },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items ?? []);
    return items.map(
      (c: { id: string; name?: string; title?: string; subject?: string; period?: string }) => ({
        type: 'class' as const,
        id: c.id,
        title: c.name ?? c.title ?? 'Untitled Class',
        subtitle: [c.subject, c.period ? `Period ${c.period}` : null]
          .filter(Boolean)
          .join(' · ') || 'Class',
        url: `/classes/${c.id}`,
      }),
    );
  } catch {
    return [];
  }
}

async function searchAssignments(
  q: string,
  hdrs: Record<string, string>,
): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/teacher/assignments?search=${encodeURIComponent(q)}`,
      { headers: hdrs },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items ?? []);
    return items.map(
      (a: { id: string; title?: string; name?: string; subject?: string; dueDate?: string; type?: string }) => ({
        type: 'assignment' as const,
        id: a.id,
        title: a.title ?? a.name ?? 'Untitled Assignment',
        subtitle: [a.subject, a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString()}` : null, a.type]
          .filter(Boolean)
          .join(' · ') || 'Assignment',
        url: `/assignments/${a.id}`,
      }),
    );
  } catch {
    return [];
  }
}

async function searchLessons(
  q: string,
  hdrs: Record<string, string>,
): Promise<SearchResult[]> {
  const CONTENT_SVC_URL =
    process.env.NEXT_PUBLIC_CONTENT_SVC_URL || 'http://localhost:3010';
  try {
    const res = await fetch(
      `${CONTENT_SVC_URL}/lessons?search=${encodeURIComponent(q)}`,
      { headers: hdrs },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items ?? []);
    return items.map(
      (l: { id: string; title?: string; subject?: string; gradeLevel?: string }) => ({
        type: 'lesson' as const,
        id: l.id,
        title: l.title ?? 'Untitled Lesson',
        subtitle: [l.subject, l.gradeLevel].filter(Boolean).join(' · ') || 'Lesson',
        url: `/lessons/${l.id}`,
      }),
    );
  } catch {
    return [];
  }
}

/* ─── GET handler ─────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const typeFilter = searchParams.get('type');
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);

  const allowedTypes = typeFilter
    ? new Set(typeFilter.split(',').map((t) => t.trim()))
    : null;

  const hdrs = headers(session.accessToken, session.tenantId, session.userId);

  // Run all searches in parallel — only for requested types
  const [students, classes, assignments, lessons] = await Promise.all([
    !allowedTypes || allowedTypes.has('student') ? searchStudents(q, hdrs) : [],
    !allowedTypes || allowedTypes.has('class') ? searchClasses(q, hdrs) : [],
    !allowedTypes || allowedTypes.has('assignment')
      ? searchAssignments(q, hdrs)
      : [],
    !allowedTypes || allowedTypes.has('lesson') ? searchLessons(q, hdrs) : [],
  ]);

  let results: SearchResult[] = [
    ...students,
    ...classes,
    ...assignments,
    ...lessons,
  ];

  const total = results.length;
  results = results.slice(0, limit);

  return NextResponse.json({ results, total });
}
