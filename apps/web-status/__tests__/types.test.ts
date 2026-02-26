import { describe, it, expect } from 'vitest';

import {
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_TEXT_COLORS,
} from '@/lib/types';
import type {
  StatusLevel,
  IncidentSeverity,
  IncidentStatus,
  ComponentGroupInfo,
  ComponentInfo,
  Incident,
  IncidentUpdate,
  MaintenanceWindow,
  StatusResponse,
  UptimeHistory,
} from '@/lib/types';

// ── StatusLevel ──────────────────────────────────────────────────

describe('StatusLevel type', () => {
  const levels: StatusLevel[] = [
    'operational',
    'degraded',
    'partial_outage',
    'major_outage',
    'maintenance',
  ];

  it('STATUS_LABELS has all 5 levels', () => {
    for (const l of levels) {
      expect(STATUS_LABELS[l]).toBeTruthy();
    }
    expect(Object.keys(STATUS_LABELS)).toHaveLength(5);
  });

  it('STATUS_COLORS has a Tailwind class for each level', () => {
    for (const l of levels) {
      expect(STATUS_COLORS[l]).toMatch(/^bg-/);
    }
  });

  it('STATUS_TEXT_COLORS has a Tailwind class for each level', () => {
    for (const l of levels) {
      expect(STATUS_TEXT_COLORS[l]).toMatch(/^text-/);
    }
  });

  it('labels are user-friendly strings', () => {
    expect(STATUS_LABELS.operational).toBe('Operational');
    expect(STATUS_LABELS.major_outage).toBe('Major Outage');
    expect(STATUS_LABELS.maintenance).toBe('Under Maintenance');
  });
});

// ── IncidentSeverity ─────────────────────────────────────────────

describe('IncidentSeverity type', () => {
  it('supports minor, major, critical', () => {
    const values: IncidentSeverity[] = ['minor', 'major', 'critical'];
    expect(values).toHaveLength(3);
  });
});

// ── IncidentStatus type ──────────────────────────────────────────

describe('IncidentStatus type', () => {
  it('supports all 5 statuses', () => {
    const values: IncidentStatus[] = [
      'investigating',
      'identified',
      'monitoring',
      'resolved',
      'postmortem',
    ];
    expect(values).toHaveLength(5);
  });
});

// ── Interface shape tests ────────────────────────────────────────

describe('ComponentGroupInfo interface', () => {
  it('constructs a valid group', () => {
    const group: ComponentGroupInfo = {
      id: 'g1',
      name: 'Core Services',
      description: 'Main backend services',
      order: 1,
    };
    expect(group.id).toBe('g1');
    expect(group.order).toBe(1);
  });
});

describe('ComponentInfo interface', () => {
  it('constructs a valid component', () => {
    const comp: ComponentInfo = {
      id: 'c1',
      name: 'API Gateway',
      description: 'Main API entry point',
      status: 'operational',
    };
    expect(comp.status).toBe('operational');
  });
});

describe('Incident interface', () => {
  it('constructs a valid incident', () => {
    const incident: Incident = {
      id: 'inc-1',
      title: 'API Latency',
      severity: 'minor',
      status: 'investigating',
      message: 'Investigating elevated latency',
      components: ['c1', 'c2'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T01:00:00Z',
      resolved_at: null,
      is_auto: false,
    };
    expect(incident.resolved_at).toBeNull();
    expect(incident.components).toHaveLength(2);
  });
});

describe('MaintenanceWindow interface', () => {
  it('constructs a valid window', () => {
    const mw: MaintenanceWindow = {
      id: 'mw-1',
      title: 'DB Migration',
      description: 'Schema upgrade',
      components: ['db'],
      status: 'scheduled',
      scheduled_start: '2024-06-01T02:00:00Z',
      scheduled_end: '2024-06-01T04:00:00Z',
      actual_start: null,
      actual_end: null,
    };
    expect(mw.actual_start).toBeNull();
  });
});

describe('StatusResponse interface', () => {
  it('constructs a valid response', () => {
    const res: StatusResponse = {
      overall: 'operational',
      groups: [],
      active_incidents: [],
      upcoming_maintenance: [],
      updated_at: '2024-01-01T00:00:00Z',
    };
    expect(res.overall).toBe('operational');
    expect(res.groups).toHaveLength(0);
  });
});

describe('UptimeHistory interface', () => {
  it('constructs a valid history', () => {
    const history: UptimeHistory = {
      days: 90,
      components: {
        api: [{ date: '2024-01-01', uptime_percent: 99.95 }],
      },
    };
    expect(history.days).toBe(90);
    expect(history.components.api).toHaveLength(1);
  });
});
