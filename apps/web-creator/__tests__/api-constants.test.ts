import { describe, it, expect } from 'vitest';

import {
  SUBJECTS,
  GRADE_BANDS,
  MODALITIES,
  ALLOWED_SCOPES,
  TOOL_SCOPES,
  VERSION_STATUS_LABELS,
  VERSION_STATUS_COLORS,
} from '../lib/api';
import type { VersionStatus } from '../lib/api';

// ── SUBJECTS ─────────────────────────────────────────────────────

describe('SUBJECTS', () => {
  it('has 10 entries', () => {
    expect(SUBJECTS).toHaveLength(10);
  });

  it('each entry has value and label', () => {
    for (const s of SUBJECTS) {
      expect(s.value).toBeTruthy();
      expect(s.label).toBeTruthy();
    }
  });

  it('includes MATH', () => {
    expect(SUBJECTS.find((s) => s.value === 'MATH')).toBeDefined();
  });

  it('includes SEL', () => {
    expect(SUBJECTS.find((s) => s.value === 'SEL')).toBeDefined();
  });
});

// ── GRADE_BANDS ──────────────────────────────────────────────────

describe('GRADE_BANDS', () => {
  it('has 6 entries', () => {
    expect(GRADE_BANDS).toHaveLength(6);
  });

  it('includes PRE_K through ALL_GRADES', () => {
    const values = GRADE_BANDS.map((g) => g.value);
    expect(values).toContain('PRE_K');
    expect(values).toContain('G9_12');
    expect(values).toContain('ALL_GRADES');
  });
});

// ── MODALITIES ───────────────────────────────────────────────────

describe('MODALITIES', () => {
  it('has 10 entries', () => {
    expect(MODALITIES).toHaveLength(10);
  });

  it('includes GAME and VIDEO', () => {
    const values = MODALITIES.map((m) => m.value);
    expect(values).toContain('GAME');
    expect(values).toContain('VIDEO');
  });
});

// ── ALLOWED_SCOPES ───────────────────────────────────────────────

describe('ALLOWED_SCOPES', () => {
  it('has 8 scope entries', () => {
    expect(ALLOWED_SCOPES).toHaveLength(8);
  });

  it('each scope has value, label, and description', () => {
    for (const scope of ALLOWED_SCOPES) {
      expect(scope.value).toBeTruthy();
      expect(scope.label).toBeTruthy();
      expect(scope.description).toBeTruthy();
    }
  });

  it('TOOL_SCOPES is same reference as ALLOWED_SCOPES', () => {
    expect(TOOL_SCOPES).toBe(ALLOWED_SCOPES);
  });
});

// ── VERSION_STATUS_LABELS ────────────────────────────────────────

describe('VERSION_STATUS_LABELS', () => {
  const allStatuses: VersionStatus[] = [
    'DRAFT', 'PENDING_REVIEW', 'IN_REVIEW', 'APPROVED',
    'REJECTED', 'PUBLISHED', 'DEPRECATED',
  ];

  it('has a label for every VersionStatus', () => {
    for (const status of allStatuses) {
      expect(VERSION_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('Draft label is "Draft"', () => {
    expect(VERSION_STATUS_LABELS.DRAFT).toBe('Draft');
  });

  it('Published label is "Published"', () => {
    expect(VERSION_STATUS_LABELS.PUBLISHED).toBe('Published');
  });
});

// ── VERSION_STATUS_COLORS ────────────────────────────────────────

describe('VERSION_STATUS_COLORS', () => {
  const allStatuses: VersionStatus[] = [
    'DRAFT', 'PENDING_REVIEW', 'IN_REVIEW', 'APPROVED',
    'REJECTED', 'PUBLISHED', 'DEPRECATED',
  ];

  it('has a color for every VersionStatus', () => {
    for (const status of allStatuses) {
      expect(VERSION_STATUS_COLORS[status]).toBeTruthy();
    }
  });

  it('colors are Tailwind class strings', () => {
    for (const color of Object.values(VERSION_STATUS_COLORS)) {
      expect(color).toMatch(/^bg-\w+/);
      expect(color).toContain('text-');
    }
  });
});
