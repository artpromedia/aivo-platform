/**
 * Tests for status-page-svc components module — pure functions and data integrity.
 */
import { describe, it, expect } from 'vitest';
import {
  COMPONENTS,
  COMPONENT_GROUPS,
  getComponent,
  getComponentsByGroup,
  deriveOverallStatus,
} from '../src/components.js';
import type { StatusLevel } from '../src/types.js';

// ── Data Integrity ─────────────────────────────────────────────────────

describe('COMPONENTS', () => {
  it('has at least 10 components', () => {
    expect(COMPONENTS.length).toBeGreaterThanOrEqual(10);
  });

  it('every component has required fields', () => {
    for (const c of COMPONENTS) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.group).toBeTruthy();
      expect(typeof c.critical).toBe('boolean');
    }
  });

  it('has unique component IDs', () => {
    const ids = COMPONENTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every component belongs to a known group', () => {
    const groupIds = COMPONENT_GROUPS.map((g) => g.id);
    for (const c of COMPONENTS) {
      expect(groupIds).toContain(c.group);
    }
  });
});

describe('COMPONENT_GROUPS', () => {
  it('has at least 3 groups', () => {
    expect(COMPONENT_GROUPS.length).toBeGreaterThanOrEqual(3);
  });

  it('every group has id, name, order', () => {
    for (const g of COMPONENT_GROUPS) {
      expect(g.id).toBeTruthy();
      expect(g.name).toBeTruthy();
      expect(typeof g.order).toBe('number');
    }
  });

  it('has unique group IDs', () => {
    const ids = COMPONENT_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── getComponent ───────────────────────────────────────────────────────

describe('getComponent', () => {
  it('returns matching component by ID', () => {
    const first = COMPONENTS[0];
    const found = getComponent(first.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(first.id);
  });

  it('returns undefined for unknown ID', () => {
    expect(getComponent('nonexistent')).toBeUndefined();
  });
});

// ── getComponentsByGroup ───────────────────────────────────────────────

describe('getComponentsByGroup', () => {
  it('returns components for a known group', () => {
    const firstGroup = COMPONENT_GROUPS[0];
    const components = getComponentsByGroup(firstGroup.id);
    expect(components.length).toBeGreaterThanOrEqual(1);
    expect(components.every((c) => c.group === firstGroup.id)).toBe(true);
  });

  it('returns empty for unknown group', () => {
    expect(getComponentsByGroup('fake-group')).toEqual([]);
  });
});

// ── deriveOverallStatus ────────────────────────────────────────────────

describe('deriveOverallStatus', () => {
  it('returns operational when all components operational', () => {
    const statuses: Record<string, StatusLevel> = {
      'comp-1': 'operational',
      'comp-2': 'operational',
    };
    expect(deriveOverallStatus(statuses)).toBe('operational');
  });

  it('returns degraded when any component is degraded', () => {
    const statuses: Record<string, StatusLevel> = {
      'comp-1': 'operational',
      'comp-2': 'degraded',
    };
    expect(deriveOverallStatus(statuses)).toBe('degraded');
  });

  it('returns partial_outage when any component has partial outage', () => {
    const statuses: Record<string, StatusLevel> = {
      'comp-1': 'operational',
      'comp-2': 'partial_outage',
    };
    expect(deriveOverallStatus(statuses)).toBe('partial_outage');
  });

  it('returns major_outage when any component has major outage', () => {
    const statuses: Record<string, StatusLevel> = {
      'comp-1': 'operational',
      'comp-2': 'major_outage',
    };
    expect(deriveOverallStatus(statuses)).toBe('major_outage');
  });

  it('major_outage takes priority over partial_outage', () => {
    const statuses: Record<string, StatusLevel> = {
      'comp-1': 'partial_outage',
      'comp-2': 'major_outage',
    };
    expect(deriveOverallStatus(statuses)).toBe('major_outage');
  });

  it('partial_outage takes priority over degraded', () => {
    const statuses: Record<string, StatusLevel> = {
      'comp-1': 'degraded',
      'comp-2': 'partial_outage',
    };
    expect(deriveOverallStatus(statuses)).toBe('partial_outage');
  });

  it('maintenance is lowest non-operational priority', () => {
    const statuses: Record<string, StatusLevel> = {
      'comp-1': 'operational',
      'comp-2': 'maintenance',
    };
    expect(deriveOverallStatus(statuses)).toBe('maintenance');
  });

  it('returns operational for empty map', () => {
    expect(deriveOverallStatus({})).toBe('operational');
  });

  it('handles single component', () => {
    expect(deriveOverallStatus({ a: 'degraded' })).toBe('degraded');
  });
});
