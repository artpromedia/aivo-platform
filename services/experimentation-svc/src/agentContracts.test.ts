/**
 * Agent Contracts Tests
 *
 * Tests for agent integration patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the modules
vi.mock('./policy.js', () => ({
  isExperimentationEnabled: vi.fn(),
}));

vi.mock('./repository.js', () => ({
  getRunningExperimentsWithVariants: vi.fn(),
  getExperimentWithVariants: vi.fn(),
}));

import { isExperimentationEnabled } from './policy.js';
import { getRunningExperimentsWithVariants, getExperimentWithVariants } from './repository.js';
import {
  getAgentExperimentContext,
  getSingleExperimentAssignment,
  getFocusAgentExperimentConfig,
  getVirtualBrainExperimentConfig,
} from './agentContracts.js';
import type { ExperimentWithVariants } from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ════════════════════════════════════════════════════════════════════════════════

function createMockExperiment(
  key: string,
  config: Record<string, unknown> = {}
): ExperimentWithVariants {
  return {
    id: `exp-${key}`,
    key,
    name: `Test ${key}`,
    description: null,
    scope: 'LEARNER',
    status: 'RUNNING',
    config_json: {},
    start_at: null,
    end_at: null,
    created_by_user_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    variants: [
      {
        id: `var-${key}-control`,
        experiment_id: `exp-${key}`,
        key: 'control',
        allocation: 0.5,
        config_json: { ...config, variant: 'control' },
        created_at: new Date(),
      },
      {
        id: `var-${key}-treatment`,
        experiment_id: `exp-${key}`,
        key: 'treatment',
        allocation: 0.5,
        config_json: { ...config, variant: 'treatment' },
        created_at: new Date(),
      },
    ],
  };
}

const mockPool = {} as any;

// ════════════════════════════════════════════════════════════════════════════════
// AGENT CONTEXT TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('getAgentExperimentContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return experiments when enabled', async () => {
    const mockExperiments = [
      createMockExperiment('focus_session_length', { sessionMinutes: 25 }),
      createMockExperiment('recommendation_algorithm', { algorithm: 'cf' }),
    ];

    vi.mocked(isExperimentationEnabled).mockResolvedValue(true);
    vi.mocked(getRunningExperimentsWithVariants).mockResolvedValue(mockExperiments);

    const context = await getAgentExperimentContext(mockPool, {
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
      featureAreas: ['focus_agent'],
    });

    expect(context.experiments).toHaveLength(2);
    expect(context.experiments[0].key).toBeDefined();
    expect(context.experiments[0].variant).toBeDefined();
    expect(context.experiments[0].config).toBeDefined();
  });

  it('should return empty when experimentation disabled', async () => {
    const mockExperiments = [createMockExperiment('focus_session_length')];

    vi.mocked(isExperimentationEnabled).mockResolvedValue(false);
    vi.mocked(getRunningExperimentsWithVariants).mockResolvedValue(mockExperiments);

    const context = await getAgentExperimentContext(mockPool, {
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
      featureAreas: ['focus_agent'],
    });

    // When disabled, assignments won't be marked as assigned
    expect(context.experiments).toHaveLength(0);
  });

  it('should return empty when no running experiments', async () => {
    vi.mocked(isExperimentationEnabled).mockResolvedValue(true);
    vi.mocked(getRunningExperimentsWithVariants).mockResolvedValue([]);

    const context = await getAgentExperimentContext(mockPool, {
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
      featureAreas: ['focus_agent'],
    });

    expect(context.experiments).toHaveLength(0);
  });
});

describe('getSingleExperimentAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return assignment for existing experiment', async () => {
    const mockExperiment = createMockExperiment('focus_session_length', { sessionMinutes: 45 });

    vi.mocked(isExperimentationEnabled).mockResolvedValue(true);
    vi.mocked(getExperimentWithVariants).mockResolvedValue(mockExperiment);

    const result = await getSingleExperimentAssignment(mockPool, {
      experimentKey: 'focus_session_length',
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
    });

    expect(result).not.toBeNull();
    expect(result!.variant).toBeDefined();
    expect(['control', 'treatment']).toContain(result!.variant);
    expect(result!.config).toBeDefined();
  });

  it('should return null for non-existent experiment', async () => {
    vi.mocked(getExperimentWithVariants).mockResolvedValue(null);

    const result = await getSingleExperimentAssignment(mockPool, {
      experimentKey: 'nonexistent',
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
    });

    expect(result).toBeNull();
  });

  it('should return null when experimentation disabled', async () => {
    const mockExperiment = createMockExperiment('focus_session_length');

    vi.mocked(isExperimentationEnabled).mockResolvedValue(false);
    vi.mocked(getExperimentWithVariants).mockResolvedValue(mockExperiment);

    const result = await getSingleExperimentAssignment(mockPool, {
      experimentKey: 'focus_session_length',
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
    });

    expect(result).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SPECIALIZED CONFIG TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('getFocusAgentExperimentConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract focus-related config', async () => {
    const mockExperiments = [
      {
        ...createMockExperiment('focus_session_length'),
        variants: [
          {
            id: 'v1',
            experiment_id: 'exp-focus',
            key: 'extended',
            allocation: 1.0,
            config_json: { sessionMinutes: 45 },
            created_at: new Date(),
          },
        ],
      },
    ];

    vi.mocked(isExperimentationEnabled).mockResolvedValue(true);
    vi.mocked(getRunningExperimentsWithVariants).mockResolvedValue(mockExperiments);

    const config = await getFocusAgentExperimentConfig(mockPool, 'tenant-123', 'learner-456');

    // The config extraction happens based on experiment keys
    expect(config).toBeDefined();
  });

  it('should return empty config when no focus experiments', async () => {
    vi.mocked(isExperimentationEnabled).mockResolvedValue(true);
    vi.mocked(getRunningExperimentsWithVariants).mockResolvedValue([]);

    const config = await getFocusAgentExperimentConfig(mockPool, 'tenant-123', 'learner-456');

    expect(config.sessionDurationMinutes).toBeUndefined();
    expect(config.breakDurationMinutes).toBeUndefined();
  });
});

describe('getVirtualBrainExperimentConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract VB-related config', async () => {
    vi.mocked(isExperimentationEnabled).mockResolvedValue(true);
    vi.mocked(getRunningExperimentsWithVariants).mockResolvedValue([]);

    const config = await getVirtualBrainExperimentConfig(mockPool, 'tenant-123', 'learner-456');

    expect(config).toBeDefined();
  });
});
