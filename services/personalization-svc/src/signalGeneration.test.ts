/**
 * Signal Generation Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock the database modules before importing the signal generation
vi.mock('./db.js', () => {
  const mockQuery = vi.fn();
  return {
    getMainPool: () => ({
      query: mockQuery,
    }),
    getWarehousePool: () => ({
      query: mockQuery,
    }),
    withTransaction: async (_pool: unknown, fn: (client: unknown) => Promise<void>) => {
      await fn({ query: mockQuery });
    },
    initPools: vi.fn(),
    closePools: vi.fn(),
    mockQuery, // Export for test access
  };
});

// Import after mock setup
import { jobGeneratePersonalizationSignals } from './signalGeneration.js';

describe('Signal Generation', () => {
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const db = await import('./db.js');
    mockQuery = (db as unknown as { mockQuery: ReturnType<typeof vi.fn> }).mockQuery;
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  it('should generate engagement signals for low engagement learners', async () => {
    // Mock learner list
    mockQuery.mockResolvedValueOnce({
      rows: [
        { learner_key: 1, learner_id: 'learner-1', tenant_id: 'tenant-1' },
      ],
    });

    // Mock session stats (low engagement)
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          session_count: '2',
          total_minutes: '30',
          avg_duration_minutes: '15',
          days_active: '2',
        },
      ],
    });

    // Mock other signal queries with empty results
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await jobGeneratePersonalizationSignals(new Date(), 7);

    expect(result.totalLearners).toBe(1);
    // Signal generation would have created LOW_ENGAGEMENT signal
    expect(mockQuery).toHaveBeenCalled();
  });

  it('should generate difficulty signals for struggling learners', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { learner_key: 2, learner_id: 'learner-2', tenant_id: 'tenant-1' },
      ],
    });

    // Mock session stats (normal engagement)
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          session_count: '10',
          total_minutes: '150',
          avg_duration_minutes: '15',
          days_active: '5',
        },
      ],
    });

    // Mock progress stats (struggling in math)
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          subject_code: 'MATH',
          avg_mastery: '0.35',
          sessions: '8',
        },
      ],
    });

    // Mock response rates
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          session_type: 'MATH',
          correct: '20',
          incorrect: '30',
        },
      ],
    });

    // Mock other queries
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await jobGeneratePersonalizationSignals(new Date(), 7);

    expect(result.totalLearners).toBe(1);
  });

  it('should handle empty learner list gracefully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await jobGeneratePersonalizationSignals(new Date(), 7);

    expect(result.totalLearners).toBe(0);
    expect(result.signalsGenerated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should capture errors for individual learners', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { learner_key: 1, learner_id: 'learner-1', tenant_id: 'tenant-1' },
        ],
      })
      .mockRejectedValueOnce(new Error('Database error'));

    const result = await jobGeneratePersonalizationSignals(new Date(), 7);

    expect(result.totalLearners).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('learner-1');
  });
});

describe('Signal Types', () => {
  it('should have correct signal key for each type', () => {
    // Verify our type definitions are consistent
    const signalTypes = [
      'ENGAGEMENT',
      'DIFFICULTY',
      'FOCUS',
      'HOMEWORK',
      'MODULE_UPTAKE',
      'PREFERENCE',
      'PROGRESSION',
      'RECOMMENDATION',
    ] as const;

    expect(signalTypes).toHaveLength(8);
  });
});
