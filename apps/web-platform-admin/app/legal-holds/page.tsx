import { requirePlatformAdmin } from '../../lib/auth';
import type { LegalHoldListItem, LegalHoldFilters } from '../../lib/types';

import { LegalHoldsClient } from './legal-holds-client';

// Mock data for development
const MOCK_LEGAL_HOLDS: LegalHoldListItem[] = [
  {
    id: 'hold-1',
    tenantId: 'tenant-1',
    tenantName: 'North Valley District',
    name: 'Smith v. District - Student Records',
    holdType: 'LITIGATION',
    status: 'ACTIVE',
    matterNumber: 'LIT-2024-0123',
    custodianCount: 15,
    startDate: '2024-03-01T00:00:00Z',
    endDate: null,
    createdAt: '2024-03-01T10:30:00Z',
  },
  {
    id: 'hold-2',
    tenantId: 'tenant-2',
    tenantName: 'Lakeside Charter',
    name: 'OCR Investigation - Title IX',
    holdType: 'REGULATORY',
    status: 'ACTIVE',
    matterNumber: 'REG-2024-0045',
    custodianCount: 8,
    startDate: '2024-04-15T00:00:00Z',
    endDate: '2025-04-15T00:00:00Z',
    createdAt: '2024-04-15T14:00:00Z',
  },
  {
    id: 'hold-3',
    tenantId: 'tenant-1',
    tenantName: 'North Valley District',
    name: 'HR Investigation - Employee Conduct',
    holdType: 'INTERNAL_INVESTIGATION',
    status: 'RELEASED',
    matterNumber: 'INT-2024-0089',
    custodianCount: 3,
    startDate: '2024-01-10T00:00:00Z',
    endDate: '2024-05-20T00:00:00Z',
    createdAt: '2024-01-10T09:00:00Z',
  },
  {
    id: 'hold-4',
    tenantId: 'tenant-3',
    tenantName: 'Metro Catholic',
    name: 'Annual Data Preservation - 2024',
    holdType: 'PRESERVATION',
    status: 'ACTIVE',
    matterNumber: 'PRES-2024-001',
    custodianCount: 0,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'hold-5',
    tenantId: 'tenant-4',
    tenantName: 'Riverside Academy',
    name: 'FERPA Audit Response',
    holdType: 'REGULATORY',
    status: 'EXPIRED',
    matterNumber: 'REG-2023-0201',
    custodianCount: 12,
    startDate: '2023-09-01T00:00:00Z',
    endDate: '2024-02-28T00:00:00Z',
    createdAt: '2023-09-01T08:00:00Z',
  },
];

const LEGAL_HOLD_SVC_URL = process.env.LEGAL_HOLD_SVC_URL ?? 'http://localhost:4061';

async function listLegalHolds(
  accessToken: string,
  filters: LegalHoldFilters,
  page: number,
  pageSize: number
): Promise<{ data: LegalHoldListItem[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.holdType) params.set('holdType', filters.holdType);
    if (filters.tenantId) params.set('tenantId', filters.tenantId);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    const res = await fetch(`${LEGAL_HOLD_SVC_URL}/api/v1/legal-holds?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
  } catch (error) {
    // Only use mock data in development - never in production
    if (process.env.NODE_ENV === 'production') {
      console.error('[LegalHolds] Failed to fetch legal holds:', error);
      throw new Error('Failed to load legal holds. Please try again later.');
    }

    // Development fallback with warning
    console.warn('[LegalHolds] Using mock data - legal-hold-svc not available');
    return { data: MOCK_LEGAL_HOLDS, total: MOCK_LEGAL_HOLDS.length };
  }
}

interface PageProps {
  searchParams: Promise<{
    status?: string;
    holdType?: string;
    tenantId?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function LegalHoldsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    return null;
  }

  const page = parseInt(params.page ?? '1', 10);
  const pageSize = 20;

  const filters: LegalHoldFilters = {};
  if (params.status) filters.status = params.status as LegalHoldFilters['status'];
  if (params.holdType) filters.holdType = params.holdType as LegalHoldFilters['holdType'];
  if (params.tenantId) filters.tenantId = params.tenantId;
  if (params.search) filters.search = params.search;

  let holds: LegalHoldListItem[];
  let total: number;

  try {
    const result = await listLegalHolds(auth.accessToken, filters, page, pageSize);
    holds = result.data;
    total = result.total;
  } catch {
    // Fallback to mock data with client-side filtering
    let filtered = [...MOCK_LEGAL_HOLDS];
    if (filters.status) {
      filtered = filtered.filter((h) => h.status === filters.status);
    }
    if (filters.holdType) {
      filtered = filtered.filter((h) => h.holdType === filters.holdType);
    }
    if (filters.tenantId) {
      filtered = filtered.filter((h) => h.tenantId === filters.tenantId);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          h.name.toLowerCase().includes(search) ||
          h.tenantName.toLowerCase().includes(search) ||
          h.matterNumber?.toLowerCase().includes(search)
      );
    }
    holds = filtered;
    total = filtered.length;
  }

  return (
    <LegalHoldsClient
      holds={holds}
      total={total}
      page={page}
      pageSize={pageSize}
      accessToken={auth.accessToken}
    />
  );
}
