import { notFound } from 'next/navigation';

import { requirePlatformAdmin } from '../../../lib/auth';
import type { LegalHold, LegalHoldCustodian, LegalHoldDataScope } from '../../../lib/types';

import { LegalHoldDetailClient } from './legal-hold-detail-client';

const LEGAL_HOLD_SVC_URL = process.env.LEGAL_HOLD_SVC_URL ?? 'http://localhost:4061';

// Mock data for development
const MOCK_LEGAL_HOLD: LegalHold = {
  id: 'hold-1',
  tenantId: 'tenant-1',
  tenantName: 'North Valley District',
  name: 'Smith v. District - Student Records',
  description: 'Litigation hold for Smith v. North Valley District lawsuit regarding student records access and FERPA compliance. All relevant communications, documents, and student data must be preserved.',
  holdType: 'LITIGATION',
  status: 'ACTIVE',
  matterNumber: 'LIT-2024-0123',
  custodians: [
    {
      id: 'cust-1',
      userId: 'user-1',
      learnerId: null,
      email: 'principal@northvalley.edu',
      name: 'Dr. Jane Smith',
      role: 'ADMIN',
      notifiedAt: '2024-03-01T10:30:00Z',
      acknowledgedAt: '2024-03-01T14:15:00Z',
    },
    {
      id: 'cust-2',
      userId: 'user-2',
      learnerId: null,
      email: 'counselor@northvalley.edu',
      name: 'Michael Johnson',
      role: 'STAFF',
      notifiedAt: '2024-03-01T10:30:00Z',
      acknowledgedAt: '2024-03-02T09:00:00Z',
    },
    {
      id: 'cust-3',
      userId: 'user-3',
      learnerId: null,
      email: 'teacher.williams@northvalley.edu',
      name: 'Sarah Williams',
      role: 'EDUCATOR',
      notifiedAt: '2024-03-01T10:30:00Z',
      acknowledgedAt: null,
    },
  ],
  dataScope: {
    includeEmails: true,
    includeDocuments: true,
    includeAiLogs: true,
    includeSessionData: true,
    includeAssessments: true,
    includeMessages: true,
    dateRangeStart: '2023-01-01T00:00:00Z',
    dateRangeEnd: null,
    keywords: ['student records', 'FERPA', 'Smith'],
  },
  startDate: '2024-03-01T00:00:00Z',
  endDate: null,
  releaseDate: null,
  releaseReason: null,
  createdByUserId: 'admin-1',
  createdByUserName: 'Legal Admin',
  createdAt: '2024-03-01T10:30:00Z',
  updatedAt: '2024-03-01T10:30:00Z',
};

async function getLegalHold(accessToken: string, holdId: string): Promise<LegalHold | null> {
  try {
    const res = await fetch(`${LEGAL_HOLD_SVC_URL}/api/v1/legal-holds/${holdId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
  } catch {
    // Return mock data in development
    if (holdId === 'hold-1' || holdId.startsWith('hold-')) {
      return MOCK_LEGAL_HOLD;
    }
    return null;
  }
}

interface PageProps {
  params: Promise<{ holdId: string }>;
}

export default async function LegalHoldDetailPage({ params }: PageProps) {
  const { holdId } = await params;
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    return null;
  }

  const hold = await getLegalHold(auth.accessToken, holdId);

  if (!hold) {
    notFound();
  }

  return <LegalHoldDetailClient hold={hold} accessToken={auth.accessToken} />;
}
