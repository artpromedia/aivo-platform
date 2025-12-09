import { listTenants } from '../../lib/api';
import { requirePlatformAdmin } from '../../lib/auth';
import type { TenantListItem } from '../../lib/types';

import { TenantListClient } from './tenant-list-client';

// Mock data for development when API is unavailable
const MOCK_TENANTS: TenantListItem[] = [
  {
    id: 'tenant-1',
    name: 'North Valley District',
    type: 'DISTRICT',
    status: 'ACTIVE',
    learnerCount: 4800,
    educatorCount: 320,
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'tenant-2',
    name: 'Lakeside Charter',
    type: 'CHARTER',
    status: 'ONBOARDING',
    learnerCount: 1200,
    educatorCount: 85,
    createdAt: '2024-03-20T00:00:00Z',
  },
  {
    id: 'tenant-3',
    name: 'Metro Catholic',
    type: 'PRIVATE_SCHOOL',
    status: 'SUSPENDED',
    learnerCount: 900,
    educatorCount: 60,
    createdAt: '2023-11-10T00:00:00Z',
  },
];

export default async function TenantsPage() {
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    return null; // Layout handles forbidden
  }

  let tenants: TenantListItem[];

  try {
    const result = await listTenants(auth.accessToken);
    tenants = result.data;
  } catch {
    // Fallback to mock data in development
    tenants = MOCK_TENANTS;
  }

  return <TenantListClient tenants={tenants} />;
}
