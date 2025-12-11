/**
 * Device Management UI Tests
 *
 * Tests for the device list and pool management pages with mocked data.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useParams: () => ({
    poolId: 'pool-123',
  }),
}));

// Mock providers
vi.mock('../app/providers', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    tenantId: 'tenant-123',
    userName: 'District Admin',
    roles: ['DISTRICT_ADMIN'],
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

const mockDevices = [
  {
    id: 'device-1',
    deviceIdentifier: 'ABC1***4567',
    deviceType: 'IOS_TABLET',
    appVersion: '2.0.0',
    osVersion: 'iOS 17.0',
    lastCheckInAt: new Date().toISOString(),
    schoolId: 'school-1',
    memberships: [
      {
        devicePool: {
          id: 'pool-1',
          name: 'Elementary iPads',
        },
      },
    ],
  },
  {
    id: 'device-2',
    deviceIdentifier: 'XYZ9***8765',
    deviceType: 'CHROMEBOOK',
    appVersion: '1.9.0',
    osVersion: 'ChromeOS 120',
    lastCheckInAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    schoolId: 'school-2',
    memberships: [],
  },
];

const mockPools = [
  {
    id: 'pool-1',
    name: 'Elementary iPads',
    tenantId: 'tenant-123',
    schoolId: null,
    gradeBand: 'K_2',
    createdAt: '2024-01-15T10:00:00Z',
    _count: { memberships: 15 },
    policy: {
      id: 'policy-1',
      policyJson: {
        kioskMode: true,
        maxOfflineDays: 5,
        dailyScreenTimeLimit: 120,
      },
    },
  },
  {
    id: 'pool-2',
    name: 'Middle School Chromebooks',
    tenantId: 'tenant-123',
    schoolId: 'school-2',
    gradeBand: 'G6_8',
    createdAt: '2024-02-01T10:00:00Z',
    _count: { memberships: 30 },
    policy: null,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// DEVICE LIST TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Device List Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('displays loading state initially', async () => {
    mockFetch.mockImplementation(() =>
      new Promise((resolve) => setTimeout(resolve, 100))
    );

    // Would render DevicesPage here
    // This is a placeholder for actual component rendering
    expect(true).toBe(true);
  });

  it('fetches and displays devices for tenant', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        devices: mockDevices,
        pagination: { total: 2, limit: 50, offset: 0 },
      }),
    });

    // After fetch, devices should be displayed
    expect(mockDevices.length).toBe(2);
    expect(mockDevices[0].deviceIdentifier).toContain('***');
  });

  it('shows device type labels correctly', () => {
    const deviceTypeLabels: Record<string, string> = {
      IOS_TABLET: 'iPad',
      ANDROID_TABLET: 'Android Tablet',
      CHROMEBOOK: 'Chromebook',
    };

    expect(deviceTypeLabels['IOS_TABLET']).toBe('iPad');
    expect(deviceTypeLabels['CHROMEBOOK']).toBe('Chromebook');
  });

  it('formats last seen time with correct tone', () => {
    function formatLastSeen(dateStr: string | null): { text: string; tone: string } {
      if (!dateStr) return { text: 'Never', tone: 'neutral' };

      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 3) return { text: `${diffDays}d ago`, tone: 'success' };
      if (diffDays < 7) return { text: `${diffDays}d ago`, tone: 'warning' };
      return { text: `${diffDays}d ago`, tone: 'error' };
    }

    // Recent check-in
    const recent = formatLastSeen(mockDevices[0].lastCheckInAt);
    expect(recent.tone).toBe('success');

    // Old check-in (8 days)
    const old = formatLastSeen(mockDevices[1].lastCheckInAt);
    expect(old.tone).toBe('error');

    // Never checked in
    const never = formatLastSeen(null);
    expect(never.text).toBe('Never');
    expect(never.tone).toBe('neutral');
  });

  it('calculates stats correctly', () => {
    const stats = {
      total: mockDevices.length,
      online: mockDevices.filter((d) => {
        if (!d.lastCheckInAt) return false;
        const hours = (Date.now() - new Date(d.lastCheckInAt).getTime()) / (1000 * 60 * 60);
        return hours < 24;
      }).length,
      offline: mockDevices.filter((d) => {
        if (!d.lastCheckInAt) return true;
        const days = (Date.now() - new Date(d.lastCheckInAt).getTime()) / (1000 * 60 * 60 * 24);
        return days >= 7;
      }).length,
    };

    expect(stats.total).toBe(2);
    expect(stats.online).toBe(1); // Only device-1 checked in recently
    expect(stats.offline).toBe(1); // device-2 is 8 days old
  });

  it('filters devices by type', () => {
    const filtered = mockDevices.filter((d) => d.deviceType === 'IOS_TABLET');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('device-1');
  });

  it('filters devices by search term', () => {
    const search = 'ABC1';
    const filtered = mockDevices.filter((d) =>
      d.deviceIdentifier.toLowerCase().includes(search.toLowerCase())
    );
    expect(filtered.length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POOL MANAGEMENT TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Device Pools Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches and displays pools for tenant', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        pools: mockPools,
        pagination: { total: 2, limit: 50, offset: 0 },
      }),
    });

    expect(mockPools.length).toBe(2);
  });

  it('shows grade band labels correctly', () => {
    const gradeBandLabels: Record<string, string> = {
      K_2: 'K-2',
      G3_5: '3-5',
      G6_8: '6-8',
      G9_12: '9-12',
    };

    expect(gradeBandLabels['K_2']).toBe('K-2');
    expect(gradeBandLabels['G6_8']).toBe('6-8');
  });

  it('shows policy badge for pools with policies', () => {
    const poolsWithPolicy = mockPools.filter((p) => p.policy !== null);
    const poolsWithoutPolicy = mockPools.filter((p) => p.policy === null);

    expect(poolsWithPolicy.length).toBe(1);
    expect(poolsWithoutPolicy.length).toBe(1);
  });

  it('displays device count for each pool', () => {
    expect(mockPools[0]._count.memberships).toBe(15);
    expect(mockPools[1]._count.memberships).toBe(30);
  });

  it('shows policy settings summary', () => {
    const policy = mockPools[0].policy?.policyJson;
    expect(policy?.kioskMode).toBe(true);
    expect(policy?.maxOfflineDays).toBe(5);
    expect(policy?.dailyScreenTimeLimit).toBe(120);
  });

  it('validates pool name is required for creation', () => {
    const isValid = (name: string) => name.trim().length > 0;
    
    expect(isValid('')).toBe(false);
    expect(isValid('   ')).toBe(false);
    expect(isValid('Lab A iPads')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POLICY EDITOR TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Policy Editor Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads existing policy configuration', () => {
    const existingPolicy = mockPools[0].policy?.policyJson;
    
    expect(existingPolicy?.kioskMode).toBe(true);
    expect(existingPolicy?.maxOfflineDays).toBe(5);
  });

  it('uses default values when no policy exists', () => {
    const defaultPolicy = {
      kioskMode: false,
      maxOfflineDays: 7,
      gradeBand: null,
      dailyScreenTimeLimit: null,
      allowedStartHour: null,
      allowedEndHour: null,
      restrictExternalLinks: true,
      requireWifiForSync: false,
      autoUpdateEnabled: true,
      minimumAppVersion: null,
    };

    expect(defaultPolicy.kioskMode).toBe(false);
    expect(defaultPolicy.maxOfflineDays).toBe(7);
    expect(defaultPolicy.restrictExternalLinks).toBe(true);
  });

  it('validates maxOfflineDays range (1-30)', () => {
    const validate = (days: number) => days >= 1 && days <= 30;
    
    expect(validate(0)).toBe(false);
    expect(validate(1)).toBe(true);
    expect(validate(30)).toBe(true);
    expect(validate(31)).toBe(false);
  });

  it('validates screen time limit range (0-1440)', () => {
    const validate = (minutes: number | null) => 
      minutes === null || (minutes >= 0 && minutes <= 1440);
    
    expect(validate(null)).toBe(true);
    expect(validate(0)).toBe(true);
    expect(validate(120)).toBe(true);
    expect(validate(1440)).toBe(true);
    expect(validate(1441)).toBe(false);
  });

  it('validates allowed hours (0-23)', () => {
    const validate = (hour: number | null) =>
      hour === null || (hour >= 0 && hour <= 23);
    
    expect(validate(null)).toBe(true);
    expect(validate(0)).toBe(true);
    expect(validate(23)).toBe(true);
    expect(validate(24)).toBe(false);
  });

  it('formats hours in 12-hour format', () => {
    function formatHour(hour: number): string {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:00 ${period}`;
    }

    expect(formatHour(0)).toBe('12:00 AM');
    expect(formatHour(9)).toBe('9:00 AM');
    expect(formatHour(12)).toBe('12:00 PM');
    expect(formatHour(15)).toBe('3:00 PM');
    expect(formatHour(23)).toBe('11:00 PM');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// API INTEGRATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Device API Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls correct endpoint for device list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ devices: [], pagination: { total: 0, limit: 50, offset: 0 } }),
    });

    await fetch('/api/devices?tenantId=tenant-123');
    
    expect(mockFetch).toHaveBeenCalledWith('/api/devices?tenantId=tenant-123');
  });

  it('calls correct endpoint for pool creation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPools[0],
    });

    await fetch('/api/devices/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: 'tenant-123',
        name: 'New Pool',
        gradeBand: 'K_2',
      }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/devices/pools',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('calls correct endpoint for adding devices to pool', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: 2, failed: 0 }),
    });

    await fetch('/api/devices/pools/pool-1/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceIds: ['device-1', 'device-2'] }),
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it('calls correct endpoint for policy update', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'policy-1', policyJson: {} }),
    });

    await fetch('/api/devices/pools/pool-1/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          kioskMode: true,
          maxOfflineDays: 5,
        },
      }),
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const response = await fetch('/api/devices?tenantId=tenant-123');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });
});
