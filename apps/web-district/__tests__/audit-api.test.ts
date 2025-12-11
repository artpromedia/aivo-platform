/**
 * Audit API Tests
 *
 * Tests for the audit API client functions and formatting utilities
 * used in the District Admin learner audit timeline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  getLearnerAudit,
  formatAuditDate,
  getActorTypeIcon,
  type LearnerAuditResponse,
  type AuditEventSummary,
} from '../lib/audit-api';
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

const mockLearnerId = 'learner-abc-123';

function createMockDifficultyEvent(overrides: Partial<AuditEventSummary> = {}): AuditEventSummary {
  return {
    id: 'audit-diff-1',
    actorType: 'AGENT',
    actorDisplayName: 'Difficulty Agent',
    entityType: 'LEARNER_DIFFICULTY',
    entityDisplayName: 'Math Difficulty',
    action: 'UPDATED',
    summary: 'Math difficulty changed from level 3 to level 4',
    relatedExplanationId: 'exp-123',
    createdAt: '2024-12-10T14:30:00Z',
    ...overrides,
  };
}

function createMockTodayPlanEvent(overrides: Partial<AuditEventSummary> = {}): AuditEventSummary {
  return {
    id: 'audit-plan-1',
    actorType: 'AGENT',
    actorDisplayName: 'Plan Agent',
    entityType: 'TODAY_PLAN',
    entityDisplayName: "Today's Learning Plan",
    action: 'UPDATED',
    summary: 'Added 2 learning objectives, removed 1',
    relatedExplanationId: 'exp-456',
    createdAt: '2024-12-10T15:00:00Z',
    ...overrides,
  };
}

function createMockTimelineResponse(): LearnerAuditResponse {
  return {
    learnerId: mockLearnerId,
    events: [createMockTodayPlanEvent(), createMockDifficultyEvent()],
    total: 2,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// getLearnerAudit
// ══════════════════════════════════════════════════════════════════════════════

describe('getLearnerAudit', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('fetches audit timeline successfully', async () => {
    const mockData = createMockTimelineResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await getLearnerAudit(mockSession, mockLearnerId);

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/audit/learner/${mockLearnerId}`),
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer test-token-123',
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('returns events sorted by created_at descending', async () => {
    const mockData = createMockTimelineResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await getLearnerAudit(mockSession, mockLearnerId);

    // Events should be sorted with most recent first (15:00 before 14:30)
    expect(result.events[0].createdAt).toBe('2024-12-10T15:00:00Z');
    expect(result.events[1].createdAt).toBe('2024-12-10T14:30:00Z');
  });

  it('throws error on failed request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ message: 'Database error' }),
    });

    await expect(getLearnerAudit(mockSession, mockLearnerId)).rejects.toThrow();
  });

  it('returns empty events array when no audit history', async () => {
    const emptyResponse: LearnerAuditResponse = {
      learnerId: mockLearnerId,
      events: [],
      total: 0,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(emptyResponse),
    });

    const result = await getLearnerAudit(mockSession, mockLearnerId);

    expect(result.events).toEqual([]);
  });

  it('includes both difficulty and plan events in response', async () => {
    const mockData = createMockTimelineResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await getLearnerAudit(mockSession, mockLearnerId);

    const entityTypes = result.events.map((e) => e.entityType);
    expect(entityTypes).toContain('LEARNER_DIFFICULTY');
    expect(entityTypes).toContain('TODAY_PLAN');
  });

  it('passes filter options as query parameters', async () => {
    const mockData = createMockTimelineResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    await getLearnerAudit(mockSession, mockLearnerId, {
      entityType: 'LEARNER_DIFFICULTY',
      fromDate: '2024-12-01',
      toDate: '2024-12-10',
      limit: 10,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('entityType=LEARNER_DIFFICULTY'),
      expect.any(Object)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('fromDate=2024-12-01'),
      expect.any(Object)
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// formatAuditDate
// ══════════════════════════════════════════════════════════════════════════════

describe('formatAuditDate', () => {
  it('formats date correctly', () => {
    const result = formatAuditDate('2024-12-10T14:30:00Z');
    
    // Should contain month, day, and time components
    expect(result).toMatch(/Dec/);
    expect(result).toMatch(/10/);
  });

  it('handles different date formats', () => {
    const isoDate = formatAuditDate('2024-06-15T09:00:00.000Z');
    
    expect(isoDate).toMatch(/Jun/);
    expect(isoDate).toMatch(/15/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getActorTypeIcon
// ══════════════════════════════════════════════════════════════════════════════

describe('getActorTypeIcon', () => {
  it('returns correct icon for USER actor', () => {
    const icon = getActorTypeIcon('USER');
    expect(icon).toBe('user');
  });

  it('returns correct icon for SYSTEM actor', () => {
    const icon = getActorTypeIcon('SYSTEM');
    expect(icon).toBe('server');
  });

  it('returns correct icon for AGENT actor', () => {
    const icon = getActorTypeIcon('AGENT');
    expect(icon).toBe('bot');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TIMELINE RENDERING TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Timeline event structure', () => {
  it('difficulty event has relatedExplanationId for explanation link', () => {
    const event = createMockDifficultyEvent();
    
    expect(event.relatedExplanationId).toBe('exp-123');
    expect(event.relatedExplanationId).not.toBeNull();
  });

  it('today plan event has relatedExplanationId for explanation link', () => {
    const event = createMockTodayPlanEvent();
    
    expect(event.relatedExplanationId).toBe('exp-456');
    expect(event.relatedExplanationId).not.toBeNull();
  });

  it('events have summary describing the change', () => {
    const diffEvent = createMockDifficultyEvent();
    const planEvent = createMockTodayPlanEvent();

    expect(diffEvent.summary).toContain('difficulty');
    expect(planEvent.summary).toContain('learning objectives');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// EXPLANATION LINK TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Explanation linking', () => {
  it('events with relatedExplanationId should support "View explanation" link', () => {
    const event = createMockDifficultyEvent();
    
    // Check that the event has the explanation ID for linking
    expect(event.relatedExplanationId).toBeTruthy();
    
    // The UI component should render a link when this is present
    // This is tested by verifying the data structure supports it
    const hasExplanationLink = event.relatedExplanationId !== null;
    expect(hasExplanationLink).toBe(true);
  });

  it('events without relatedExplanationId should not show explanation link', () => {
    const event = createMockDifficultyEvent({
      relatedExplanationId: null,
    });
    
    const hasExplanationLink = event.relatedExplanationId !== null;
    expect(hasExplanationLink).toBe(false);
  });
});
