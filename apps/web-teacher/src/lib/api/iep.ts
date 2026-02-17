/**
 * IEP API Service
 *
 * API client for IEP (Individualized Education Program) management.
 * Uses relative URLs that route through the Next.js API proxy at
 * /api/iep/[...path] → iep-svc (port 4070).
 */

import type {
  IEPGoal,
  IEPGoalStatus,
  AddIEPProgressDto,
  CreateIEPGoalDto,
  GenerateIEPReportDto,
} from '../types/iep';

// ---------------------------------------------------------------------------
// Summary DTOs (what the proxy returns, display-friendly shapes)
// ---------------------------------------------------------------------------

export interface IEPStudentSummary {
  id: string;
  name: string;
  grade: string;
  avatar?: string;
  iepId: string;
  iepStatus: 'draft' | 'active' | 'review_pending' | 'expired';
  eligibilityCategory: string;
  caseManager: string;
  nextMeetingDate: string;
  annualReviewDate: string;
  goals: IEPGoal[];
  services: IEPServiceSummary[];
  accommodations: string[];
  complianceAlerts: ComplianceAlert[];
}

export interface IEPServiceSummary {
  id: string;
  type: string;
  provider: string;
  frequency: string;
  duration: string;
  location: string;
  minutesDelivered: number;
  minutesRequired: number;
}

export interface ComplianceAlert {
  type: string;
  message: string;
  dueDate: string;
  severity: 'warning' | 'urgent';
}

export interface IEPMeeting {
  id: string;
  iepId: string;
  studentId?: string;
  studentName?: string;
  type: string;
  scheduledDate: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface IEPDashboard {
  totalStudents: number;
  activeIEPs: number;
  upcomingMeetings: IEPMeeting[];
  complianceAlerts: ComplianceAlert[];
  goalsAtRisk: number;
}

// ---------------------------------------------------------------------------
// Internal helpers — every call goes through /api/iep → iep-svc proxy
// ---------------------------------------------------------------------------

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    // Attempt to read the next-auth session for the Bearer token
    const res = await fetch('/api/auth/session');
    if (res.ok) {
      const session = await res.json();
      if (session?.accessToken) {
        headers.Authorization = `Bearer ${session.accessToken}`;
      }
    }
  } catch {
    // Session unavailable — headers will go without auth
  }
  return headers;
}

async function iepFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/iep${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IEP API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Exported API
// ---------------------------------------------------------------------------

export const iepApi = {
  // -- Students (iep-svc /students) ----------------------------------------

  /** List students with active IEPs for the current teacher */
  getStudentsWithIEP: () => iepFetch<IEPStudentSummary[]>('/students'),

  /** Get a single student record */
  getStudent: (studentId: string) => iepFetch<IEPStudentSummary>(`/students/${studentId}`),

  // -- IEP CRUD (iep-svc /ieps) --------------------------------------------

  /** List IEPs (optional query filters) */
  getIEPs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return iepFetch<unknown[]>(`/ieps${qs}`);
  },

  /** Get IEP detail by ID */
  getIEP: (iepId: string) => iepFetch<unknown>(`/ieps/${iepId}`),

  /** Get the teacher dashboard (stats, upcoming meetings, alerts) */
  getDashboard: () => iepFetch<IEPDashboard>('/ieps/dashboard'),

  // -- Goals (iep-svc /ieps/:iepId/goals) ----------------------------------

  /** Add a goal to an IEP */
  addGoal: (iepId: string, data: CreateIEPGoalDto) =>
    iepFetch<IEPGoal>(`/ieps/${iepId}/goals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update goal fields (status, currentValue, etc.) */
  updateGoal: (
    iepId: string,
    goalId: string,
    data: Partial<CreateIEPGoalDto> & { status?: IEPGoalStatus; currentValue?: number }
  ) =>
    iepFetch<IEPGoal>(`/ieps/${iepId}/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Record a progress data-point for a goal */
  addProgress: (iepId: string, goalId: string, data: AddIEPProgressDto) =>
    iepFetch<IEPGoal>(`/ieps/${iepId}/goals/${goalId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // -- Services (iep-svc /ieps/:iepId/services) ----------------------------

  /** Log service delivery minutes */
  logServiceDelivery: (
    iepId: string,
    serviceId: string,
    data: { minutes: number; date: string; notes?: string }
  ) =>
    iepFetch<{ success: boolean }>(`/ieps/${iepId}/services/${serviceId}/logs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // -- Meetings (iep-svc /ieps/:iepId/meetings) ----------------------------

  /** Schedule a new IEP meeting */
  scheduleMeeting: (iepId: string, data: { type: string; scheduledDate: string; notes?: string }) =>
    iepFetch<IEPMeeting>(`/ieps/${iepId}/meetings`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Mark a meeting as completed */
  completeMeeting: (
    iepId: string,
    meetingId: string,
    data: { notes?: string; outcomes?: string[] }
  ) =>
    iepFetch<IEPMeeting>(`/ieps/${iepId}/meetings/${meetingId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // -- Compliance (iep-svc /compliance) ------------------------------------

  /** Get compliance alerts for all IEP students */
  getComplianceAlerts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return iepFetch<ComplianceAlert[]>(`/compliance/alerts${qs}`);
  },

  /** Trigger a compliance check for the current tenant */
  runComplianceCheck: () =>
    iepFetch<{ newAlerts: number; alerts: ComplianceAlert[] }>('/compliance/check', {
      method: 'POST',
    }),

  // -- Reports (convenience — uses /ieps endpoints) ------------------------

  /** Generate an IEP progress report */
  generateReport: (iepId: string, data: GenerateIEPReportDto) =>
    iepFetch<Blob>(`/ieps/${iepId}/goals`, {
      // POST with report DTO; the download endpoint may differ on the backend
      method: 'POST',
      body: JSON.stringify(data),
      headers: { Accept: 'application/pdf' },
    }),
};
