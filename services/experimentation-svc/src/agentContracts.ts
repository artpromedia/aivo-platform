/**
 * Agent Contracts
 *
 * Integration patterns for Focus Agent, Virtual Brain, and other agents
 * to consume experiment assignments.
 */

import type { Pool } from 'pg';

import { computeAssignment } from './assignment.js';
import { isExperimentationEnabled } from './policy.js';
import { getRunningExperimentsWithVariants, getExperimentWithVariants } from './repository.js';
import type { AgentExperimentContext, GetAgentContextInput, VariantConfig } from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// AGENT CONTEXT RETRIEVAL
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get all experiment assignments for an agent context.
 *
 * This is the primary integration point for agents like Focus Agent
 * and Virtual Brain. Returns all active experiments with their assigned
 * variants and configurations.
 *
 * @example
 * ```typescript
 * const context = await getAgentExperimentContext(pool, {
 *   tenantId: 'tenant-123',
 *   learnerId: 'learner-456',
 *   featureAreas: ['focus_agent', 'session_timing'],
 * });
 *
 * // Check for specific experiment
 * const focusSessionExp = context.experiments.find(e => e.key === 'focus_session_length');
 * if (focusSessionExp) {
 *   const sessionMinutes = focusSessionExp.config.sessionMinutes ?? 25;
 * }
 * ```
 */
export async function getAgentExperimentContext(
  pool: Pool,
  input: GetAgentContextInput
): Promise<AgentExperimentContext> {
  const { tenantId, learnerId, featureAreas: _featureAreas } = input;

  // Check if experimentation is enabled for this tenant
  const experimentationEnabled = await isExperimentationEnabled(tenantId);

  // Get all running experiments
  const experiments = await getRunningExperimentsWithVariants(pool);

  const assignedExperiments: AgentExperimentContext['experiments'] = [];

  for (const experiment of experiments) {
    // Compute assignment
    const result = computeAssignment({
      experiment,
      variants: experiment.variants,
      tenantId,
      ...(learnerId && { learnerId }),
      experimentationEnabled,
    });

    // Only include if actually assigned (not opted out)
    if (result.assigned) {
      assignedExperiments.push({
        key: experiment.key,
        variant: result.variantKey,
        config: result.config,
      });
    }
  }

  return { experiments: assignedExperiments };
}

/**
 * Get assignment for a single experiment.
 *
 * More efficient when you only need one specific experiment's assignment.
 *
 * @example
 * ```typescript
 * const assignment = await getSingleExperimentAssignment(pool, {
 *   experimentKey: 'focus_session_length',
 *   tenantId: 'tenant-123',
 *   learnerId: 'learner-456',
 * });
 *
 * if (assignment) {
 *   console.log(`Using variant: ${assignment.variant}`);
 *   console.log(`Session minutes: ${assignment.config.sessionMinutes}`);
 * }
 * ```
 */
export async function getSingleExperimentAssignment(
  pool: Pool,
  params: {
    experimentKey: string;
    tenantId: string;
    learnerId?: string;
  }
): Promise<{ variant: string; config: VariantConfig } | null> {
  const { experimentKey, tenantId, learnerId } = params;

  // Get experiment
  const experiment = await getExperimentWithVariants(pool, experimentKey);
  if (!experiment) {
    return null;
  }

  // Check if experimentation is enabled
  const experimentationEnabled = await isExperimentationEnabled(tenantId);

  // Compute assignment
  const result = computeAssignment({
    experiment,
    variants: experiment.variants,
    tenantId,
    ...(learnerId && { learnerId }),
    experimentationEnabled,
  });

  if (!result.assigned) {
    return null;
  }

  return {
    variant: result.variantKey,
    config: result.config,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// FOCUS AGENT INTEGRATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Focus Agent configuration derived from experiments.
 */
export interface FocusAgentExperimentConfig {
  /** Session duration in minutes */
  sessionDurationMinutes?: number;
  /** Break duration in minutes */
  breakDurationMinutes?: number;
  /** Whether to use adaptive session timing */
  adaptiveTimingEnabled?: boolean;
  /** Focus reminder frequency in minutes */
  reminderFrequencyMinutes?: number;
  /** Custom focus strategies */
  strategies?: string[];
}

/**
 * Get experiment-driven configuration for Focus Agent.
 *
 * This is a specialized helper that extracts Focus Agent-specific
 * configuration from active experiments.
 */
export async function getFocusAgentExperimentConfig(
  pool: Pool,
  tenantId: string,
  learnerId: string
): Promise<FocusAgentExperimentConfig> {
  const context = await getAgentExperimentContext(pool, {
    tenantId,
    learnerId,
    featureAreas: ['focus_agent'],
  });

  const config: FocusAgentExperimentConfig = {};

  for (const exp of context.experiments) {
    // Map known experiment keys to config fields
    if (exp.key === 'focus_session_length' || exp.key === 'session_duration') {
      const val = exp.config.sessionMinutes as number | undefined;
      if (val !== undefined) config.sessionDurationMinutes = val;
    }
    if (exp.key === 'focus_break_length' || exp.key === 'break_duration') {
      const val = exp.config.breakMinutes as number | undefined;
      if (val !== undefined) config.breakDurationMinutes = val;
    }
    if (exp.key === 'adaptive_timing') {
      const val = exp.config.enabled as boolean | undefined;
      if (val !== undefined) config.adaptiveTimingEnabled = val;
    }
    if (exp.key === 'focus_reminders') {
      const val = exp.config.frequencyMinutes as number | undefined;
      if (val !== undefined) config.reminderFrequencyMinutes = val;
    }
    if (exp.key === 'focus_strategies') {
      const val = exp.config.strategies as string[] | undefined;
      if (val !== undefined) config.strategies = val;
    }
  }

  return config;
}

// ════════════════════════════════════════════════════════════════════════════════
// VIRTUAL BRAIN INTEGRATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Virtual Brain configuration derived from experiments.
 */
export interface VirtualBrainExperimentConfig {
  /** Content selection algorithm variant */
  contentSelectionAlgorithm?: string;
  /** Difficulty adjustment sensitivity */
  difficultyAdjustmentSensitivity?: number;
  /** Whether to use personalization signals */
  usePersonalizationSignals?: boolean;
  /** Recommendation explanation style */
  explanationStyle?: string;
}

/**
 * Get experiment-driven configuration for Virtual Brain.
 */
export async function getVirtualBrainExperimentConfig(
  pool: Pool,
  tenantId: string,
  learnerId: string
): Promise<VirtualBrainExperimentConfig> {
  const context = await getAgentExperimentContext(pool, {
    tenantId,
    learnerId,
    featureAreas: ['virtual_brain', 'content_selection'],
  });

  const config: VirtualBrainExperimentConfig = {};

  for (const exp of context.experiments) {
    if (exp.key === 'content_selection_algorithm') {
      const val = exp.config.algorithm as string | undefined;
      if (val !== undefined) config.contentSelectionAlgorithm = val;
    }
    if (exp.key === 'difficulty_adjustment') {
      const val = exp.config.sensitivity as number | undefined;
      if (val !== undefined) config.difficultyAdjustmentSensitivity = val;
    }
    if (exp.key === 'personalization_signals_usage') {
      const val = exp.config.enabled as boolean | undefined;
      if (val !== undefined) config.usePersonalizationSignals = val;
    }
    if (exp.key === 'recommendation_explanation') {
      const val = exp.config.style as string | undefined;
      if (val !== undefined) config.explanationStyle = val;
    }
  }

  return config;
}
