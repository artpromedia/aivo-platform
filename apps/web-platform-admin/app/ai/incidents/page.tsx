import { listIncidents } from '../../../lib/api';
import { requirePlatformAdmin } from '../../../lib/auth';
import type { AiIncidentListItem, IncidentFilters } from '../../../lib/types';

import { IncidentsClient } from './incidents-client';

// Mock data for development
const MOCK_INCIDENTS: AiIncidentListItem[] = [
  {
    id: 'inc-1',
    tenantId: 'tenant-1',
    tenantName: 'North Valley District',
    severity: 'HIGH',
    category: 'SAFETY',
    status: 'OPEN',
    title: 'High safety score on homework help response',
    occurrenceCount: 3,
    firstSeenAt: '2024-06-10T14:30:00Z',
    lastSeenAt: '2024-06-11T09:15:00Z',
  },
  {
    id: 'inc-2',
    tenantId: 'tenant-1',
    tenantName: 'North Valley District',
    severity: 'MEDIUM',
    category: 'COST',
    status: 'INVESTIGATING',
    title: 'Elevated API cost threshold exceeded',
    occurrenceCount: 12,
    firstSeenAt: '2024-06-08T08:00:00Z',
    lastSeenAt: '2024-06-11T10:30:00Z',
  },
  {
    id: 'inc-3',
    tenantId: 'tenant-2',
    tenantName: 'Lakeside Charter',
    severity: 'LOW',
    category: 'PERFORMANCE',
    status: 'RESOLVED',
    title: 'Latency spike on lesson planning agent',
    occurrenceCount: 5,
    firstSeenAt: '2024-06-05T11:00:00Z',
    lastSeenAt: '2024-06-06T15:45:00Z',
  },
  {
    id: 'inc-4',
    tenantId: 'tenant-1',
    tenantName: 'North Valley District',
    severity: 'CRITICAL',
    category: 'PRIVACY',
    status: 'OPEN',
    title: 'Potential PII detected in AI response',
    occurrenceCount: 1,
    firstSeenAt: '2024-06-11T11:00:00Z',
    lastSeenAt: '2024-06-11T11:00:00Z',
  },
  {
    id: 'inc-5',
    tenantId: 'tenant-3',
    tenantName: 'Metro Catholic',
    severity: 'INFO',
    category: 'COMPLIANCE',
    status: 'DISMISSED',
    title: 'Content filter triggered (false positive)',
    occurrenceCount: 1,
    firstSeenAt: '2024-06-01T09:00:00Z',
    lastSeenAt: '2024-06-01T09:00:00Z',
  },
];

interface PageProps {
  searchParams: Promise<{
    severity?: string;
    category?: string;
    status?: string;
    search?: string;
    tenantId?: string;
    page?: string;
  }>;
}

export default async function IncidentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    return null; // Layout handles forbidden
  }

  const page = parseInt(params.page ?? '1', 10);
  const pageSize = 20;

  const filters: IncidentFilters = {};
  if (params.severity) filters.severity = params.severity as IncidentFilters['severity'];
  if (params.category) filters.category = params.category as IncidentFilters['category'];
  if (params.status) filters.status = params.status as IncidentFilters['status'];
  if (params.search) filters.search = params.search;
  if (params.tenantId) filters.tenantId = params.tenantId;

  let incidents: AiIncidentListItem[];
  let total: number;

  try {
    const result = await listIncidents(auth.accessToken, filters, page, pageSize);
    incidents = result.data;
    total = result.total;
  } catch {
    // Fallback to mock data - apply client-side filters
    let filtered = [...MOCK_INCIDENTS];
    if (filters.severity) {
      filtered = filtered.filter((i) => i.severity === filters.severity);
    }
    if (filters.category) {
      filtered = filtered.filter((i) => i.category === filters.category);
    }
    if (filters.status) {
      filtered = filtered.filter((i) => i.status === filters.status);
    }
    if (filters.tenantId) {
      filtered = filtered.filter((i) => i.tenantId === filters.tenantId);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (i) => i.title.toLowerCase().includes(search) || i.tenantName.toLowerCase().includes(search)
      );
    }
    incidents = filtered;
    total = filtered.length;
  }

  return <IncidentsClient incidents={incidents} total={total} page={page} pageSize={pageSize} />;
}
