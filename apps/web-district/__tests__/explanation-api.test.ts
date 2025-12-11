import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  getExplanationsByEntity,
  getRecentExplanations,
  getActionTypeLabel,
  getActionTypeIcon,
  formatRelativeDate,
  type Explanation,
  type ExplanationsResponse,
} from '../lib/explanation-api';
import type { AuthSession } from '../lib/auth';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock session with all required properties
const mockSession: AuthSession = {
  userId: 'user-1',
  tenantId: 'tenant-123',
  roles: [],
  accessToken: 'test-token-123',
};

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

function createMockExplanation(overrides: Partial<Explanation> = {}): Explanation {
  return {
    id: 'exp-1',
    sourceType: 'VIRTUAL_BRAIN',
    actionType: 'CONTENT_SELECTION',
    relatedEntityType: 'LEARNING_OBJECT_VERSION',
    relatedEntityId: 'lo-123',
    summary: 'This activity matches the learner\'s current reading level.',
    details: {
      reasons: [
        { label: 'Matches skill level', description: 'Good alignment' },
      ],
      inputs: [
        { label: 'Reading Level', value: '4.2', unit: 'grade' },
      ],
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockResponse(
  explanations: Explanation[] = [createMockExplanation()],
  hasFallback = false
): ExplanationsResponse {
  return {
    explanations,
    hasFallback,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// getExplanationsByEntity
// ══════════════════════════════════════════════════════════════════════════════

describe('getExplanationsByEntity', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('fetches explanations successfully', async () => {
    const mockData = createMockResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await getExplanationsByEntity(
      'LEARNING_OBJECT_VERSION',
      'lo-123',
      mockSession
    );

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/explanations/by-entity?'),
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer test-token-123',
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('includes learnerId in query params when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockResponse()),
    });

    await getExplanationsByEntity(
      'LEARNING_OBJECT_VERSION',
      'lo-123',
      mockSession,
      { learnerId: 'learner-456' }
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('learnerId=learner-456'),
      expect.any(Object)
    );
  });

  it('uses custom limit when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockResponse()),
    });

    await getExplanationsByEntity(
      'SKILL',
      'skill-789',
      mockSession,
      { limit: 5 }
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=5'),
      expect.any(Object)
    );
  });

  it('returns fallback on API error (non-ok response)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await getExplanationsByEntity(
      'LEARNING_OBJECT_VERSION',
      'lo-error',
      mockSession
    );

    expect(result.hasFallback).toBe(true);
    expect(result.explanations).toHaveLength(1);
    expect(result.explanations[0].id).toBe('fallback');
  });

  it('returns fallback on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await getExplanationsByEntity(
      'LEARNING_OBJECT_VERSION',
      'lo-network-error',
      mockSession
    );

    expect(result.hasFallback).toBe(true);
    expect(result.explanations).toHaveLength(1);
    expect(result.explanations[0].id).toBe('fallback');
  });

  it('returns appropriate fallback message for SKILL entity type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await getExplanationsByEntity('SKILL', 'skill-123', mockSession);

    expect(result.explanations[0].summary).toContain('skill');
  });

  it('returns appropriate fallback message for MODULE entity type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await getExplanationsByEntity('MODULE', 'mod-123', mockSession);

    expect(result.explanations[0].summary).toContain('module');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getRecentExplanations
// ══════════════════════════════════════════════════════════════════════════════

describe('getRecentExplanations', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('fetches recent explanations successfully', async () => {
    const mockData = {
      learnerId: 'learner-1',
      total: 2,
      explanations: [createMockExplanation(), createMockExplanation({ id: 'exp-2' })],
      byActionType: {},
      actionTypeLabels: {},
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await getRecentExplanations('learner-1', mockSession);

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/explanations/learners/learner-1/recent'),
      expect.any(Object)
    );
  });

  it('includes action types filter when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ explanations: [] }),
    });

    await getRecentExplanations('learner-1', mockSession, {
      actionTypes: ['CONTENT_SELECTION', 'DIFFICULTY_CHANGE'],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('actionTypes=CONTENT_SELECTION%2CDIFFICULTY_CHANGE'),
      expect.any(Object)
    );
  });

  it('returns null on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await getRecentExplanations('learner-error', mockSession);

    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await getRecentExplanations('learner-network', mockSession);

    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getActionTypeLabel
// ══════════════════════════════════════════════════════════════════════════════

describe('getActionTypeLabel', () => {
  it('returns correct label for CONTENT_SELECTION', () => {
    expect(getActionTypeLabel('CONTENT_SELECTION')).toBe('Activity Selection');
  });

  it('returns correct label for DIFFICULTY_CHANGE', () => {
    expect(getActionTypeLabel('DIFFICULTY_CHANGE')).toBe('Difficulty Adjustment');
  });

  it('returns correct label for FOCUS_BREAK_TRIGGER', () => {
    expect(getActionTypeLabel('FOCUS_BREAK_TRIGGER')).toBe('Focus Break');
  });

  it('returns correct label for MODULE_RECOMMENDATION', () => {
    expect(getActionTypeLabel('MODULE_RECOMMENDATION')).toBe('Module Suggestion');
  });

  it('returns correct label for SCAFFOLDING_DECISION', () => {
    expect(getActionTypeLabel('SCAFFOLDING_DECISION')).toBe('Learning Support');
  });

  it('converts unknown action types to readable format', () => {
    expect(getActionTypeLabel('CUSTOM_ACTION_TYPE')).toBe('CUSTOM ACTION TYPE');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getActionTypeIcon
// ══════════════════════════════════════════════════════════════════════════════

describe('getActionTypeIcon', () => {
  it('returns sparkles for CONTENT_SELECTION', () => {
    expect(getActionTypeIcon('CONTENT_SELECTION')).toBe('sparkles');
  });

  it('returns sliders-horizontal for DIFFICULTY_CHANGE', () => {
    expect(getActionTypeIcon('DIFFICULTY_CHANGE')).toBe('sliders-horizontal');
  });

  it('returns timer for FOCUS_BREAK_TRIGGER', () => {
    expect(getActionTypeIcon('FOCUS_BREAK_TRIGGER')).toBe('timer');
  });

  it('returns lightbulb for unknown action types', () => {
    expect(getActionTypeIcon('UNKNOWN_ACTION')).toBe('lightbulb');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// formatRelativeDate
// ══════════════════════════════════════════════════════════════════════════════

describe('formatRelativeDate', () => {
  it('formats minutes ago correctly', () => {
    const date = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    expect(formatRelativeDate(date)).toBe('15m ago');
  });

  it('formats hours ago correctly', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(date)).toBe('3h ago');
  });

  it('formats days ago correctly', () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(date)).toBe('2d ago');
  });

  it('formats older dates as locale date string', () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeDate(date);
    // Should be a date string like "12/1/2024" or similar
    expect(result).toMatch(/\d+\/\d+\/\d+/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FALLBACK BEHAVIOR
// ══════════════════════════════════════════════════════════════════════════════

describe('Fallback behavior', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('fallback explanation has id "fallback"', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await getExplanationsByEntity('LEARNING_OBJECT_VERSION', 'test', mockSession);

    expect(result.explanations[0].id).toBe('fallback');
    expect(result.explanations[0].sourceType).toBe('SYSTEM');
    expect(result.explanations[0].actionType).toBe('UNKNOWN');
  });

  it('fallback has empty details', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await getExplanationsByEntity('LEARNING_OBJECT_VERSION', 'test', mockSession);

    expect(result.explanations[0].details.reasons).toEqual([]);
    expect(result.explanations[0].details.inputs).toEqual([]);
  });

  it('fallback preserves entity type and id', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await getExplanationsByEntity('CUSTOM_TYPE', 'custom-id-123', mockSession);

    expect(result.explanations[0].relatedEntityType).toBe('CUSTOM_TYPE');
    expect(result.explanations[0].relatedEntityId).toBe('custom-id-123');
  });
});
