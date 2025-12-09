import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ComplianceDashboardClient } from '../app/compliance/compliance-dashboard-client';
import { getDateRangeFromPreset } from '../lib/compliance-types';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

const mockAiStats = {
  totalCalls: 15782,
  callsByAgentType: {
    BASELINE: 4521,
    HOMEWORK_HELPER: 6834,
    FOCUS_MONITOR: 2145,
    SAFETY_MONITOR: 1982,
    VIRTUAL_BRAIN: 300,
  },
  safetyDistribution: {
    SAFE: 14892,
    LOW: 612,
    MEDIUM: 245,
    HIGH: 33,
  },
  avgLatencyMs: 423,
  p95LatencyMs: 1250,
  avgCostCentsPerCall: 0.12,
  totalCostCents: 1893.84,
  callsByProvider: {
    OPENAI: 12543,
    ANTHROPIC: 3239,
  },
  callsByStatus: {
    SUCCESS: 15634,
    ERROR: 148,
  },
  periodStart: '2025-11-09',
  periodEnd: '2025-12-09',
};

const mockIncidentStats = {
  totalIncidents: 47,
  incidentCountsBySeverity: {
    INFO: 12,
    LOW: 18,
    MEDIUM: 11,
    HIGH: 5,
    CRITICAL: 1,
  },
  incidentCountsByCategory: {
    SAFETY: 23,
    PRIVACY: 8,
    COMPLIANCE: 6,
    PERFORMANCE: 7,
    COST: 3,
  },
  incidentCountsByStatus: {
    OPEN: 14,
    INVESTIGATING: 8,
    RESOLVED: 21,
    DISMISSED: 4,
  },
  openIncidentsBySeverity: {
    INFO: 3,
    LOW: 5,
    MEDIUM: 4,
    HIGH: 2,
    CRITICAL: 0,
  },
  topTenantsByIncidentCount: [
    { tenantId: 'tenant-001', tenantName: 'Springfield School District', incidentCount: 12 },
    { tenantId: 'tenant-002', tenantName: 'Riverdale Academy', incidentCount: 8 },
  ],
  periodStart: '2025-11-09',
  periodEnd: '2025-12-09',
};

const mockDsrStats = {
  totalRequests: 34,
  countsByType: {
    EXPORT: 28,
    DELETE: 6,
  },
  countsByStatus: {
    PENDING: 3,
    IN_PROGRESS: 2,
    COMPLETED: 26,
    REJECTED: 2,
    FAILED: 1,
  },
  recentRequests: [
    {
      id: 'dsr-001',
      tenantId: 'tenant-001',
      tenantName: 'Springfield School District',
      requestType: 'EXPORT',
      status: 'PENDING',
      learnerId: 'learner-abc',
      createdAt: '2025-12-09T10:00:00Z',
      completedAt: null,
    },
  ],
  periodStart: '2025-11-09',
  periodEnd: '2025-12-09',
};

const mockPolicySummary = {
  globalPolicy: {
    id: 'policy-global-001',
    name: 'Global Default Policy v1',
    version: 1,
    updatedAt: '2025-12-01T00:00:00Z',
  },
  tenantOverrideCount: 3,
};

// ══════════════════════════════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════════════════════════════

describe('ComplianceDashboardClient', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock fetch for all API endpoints
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/ai-stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAiStats),
        });
      }
      if (url.includes('/incident-stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockIncidentStats),
        });
      }
      if (url.includes('/dsr-stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDsrStats),
        });
      }
      if (url.includes('/policy-summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPolicySummary),
        });
      }
      if (url.includes('/report')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            generatedAt: new Date().toISOString(),
            periodStart: '2025-11-09',
            periodEnd: '2025-12-09',
            aiStats: mockAiStats,
            incidentStats: mockIncidentStats,
            dsrStats: mockDsrStats,
            policyStatus: mockPolicySummary,
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as unknown as typeof fetch;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ════════════════════════════════════════════════════════════════════════════

  it('renders the dashboard header', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    expect(screen.getByText('AI Safety & Compliance')).toBeInTheDocument();
    expect(screen.getByText(/Monitor AI usage, safety incidents/)).toBeInTheDocument();
  });

  it('renders date range selector with default 30d preset', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    const last30Button = screen.getByRole('button', { name: 'Last 30 days' });
    expect(last30Button).toBeInTheDocument();
    expect(last30Button).toHaveClass('bg-blue-600');
  });

  it('renders AI usage stats after loading', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    await waitFor(() => {
      expect(screen.getByText('Total AI Calls')).toBeInTheDocument();
    });

    expect(screen.getByText('15,782')).toBeInTheDocument();
    expect(screen.getByText('423ms')).toBeInTheDocument();
  });

  it('renders incident stats after loading', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Incidents')).toBeInTheDocument();
    });

    expect(screen.getByText('47')).toBeInTheDocument();
  });

  it('renders DSR stats after loading', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    await waitFor(() => {
      expect(screen.getByText('Total DSR Requests')).toBeInTheDocument();
    });

    expect(screen.getByText('34')).toBeInTheDocument();
  });

  it('renders policy summary after loading', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    await waitFor(() => {
      expect(screen.getByText('Active Global Policy')).toBeInTheDocument();
    });

    expect(screen.getByText('Global Default Policy v1')).toBeInTheDocument();
    // Tenant override count shown in a label context
    expect(screen.getByText('Tenant Overrides')).toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // INTERACTION TESTS
  // ════════════════════════════════════════════════════════════════════════════

  it('changes date range when preset button is clicked', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    const last7Button = screen.getByRole('button', { name: 'Last 7 days' });
    fireEvent.click(last7Button);

    await waitFor(() => {
      expect(last7Button).toHaveClass('bg-blue-600');
    });

    // Should trigger new API calls
    expect(global.fetch).toHaveBeenCalled();
  });

  it('shows custom date inputs when Custom is selected', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    const customButton = screen.getByRole('button', { name: 'Custom' });
    fireEvent.click(customButton);

    await waitFor(() => {
      // Date inputs have type="date" - query by HTML element type
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // EXPORT TESTS
  // ════════════════════════════════════════════════════════════════════════════

  it('renders export button', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    expect(screen.getByRole('button', { name: /Export Compliance Report/i })).toBeInTheDocument();
  });

  it('triggers export when button is clicked', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    await waitFor(() => {
      expect(screen.getByText('Total AI Calls')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /Export Compliance Report/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      // Check that fetch was called for the report endpoint
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const reportCall = fetchCalls.find((call: unknown[]) => (call[0] as string).includes('/report'));
      expect(reportCall).toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ════════════════════════════════════════════════════════════════════════════

  it('displays error message when AI stats fetch fails', async () => {
    // Reset fetch mock for this specific test
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/ai-stats')) {
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      }
      // Other endpoints succeed
      if (url.includes('/incident-stats')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockIncidentStats) });
      }
      if (url.includes('/dsr-stats')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDsrStats) });
      }
      if (url.includes('/policy-summary')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPolicySummary) });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<ComplianceDashboardClient accessToken="test-token" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load AI stats/i)).toBeInTheDocument();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY TESTS
  // ════════════════════════════════════════════════════════════════════════════

  it('includes accessible text summaries', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    await waitFor(() => {
      // Check for text summaries (role="status" elements)
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
    });

    // Check for specific accessible text
    expect(screen.getByText(/% of AI calls were labeled HIGH risk/i)).toBeInTheDocument();
  });

  it('has proper heading hierarchy', async () => {
    render(<ComplianceDashboardClient accessToken="test-token" />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'AI Safety & Compliance', level: 1 })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'AI Usage & Safety', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Incidents Overview', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'DSR & Retention', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Policy Status', level: 2 })).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('getDateRangeFromPreset', () => {
  it('returns correct range for 7d preset', () => {
    const range = getDateRangeFromPreset('7d');
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    
    const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it('returns correct range for 30d preset', () => {
    const range = getDateRangeFromPreset('30d');
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    
    const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it('returns correct range for 90d preset', () => {
    const range = getDateRangeFromPreset('90d');
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    
    const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
  });
});
