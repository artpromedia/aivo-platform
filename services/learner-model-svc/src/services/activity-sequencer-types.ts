/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Activity Sequencer Types
 *
 * Types for intelligent activity sequencing based on:
 * - Mastery-based spacing
 * - Interleaving principles
 * - Zone of Proximal Development
 * - Neurodiverse accommodations
 */

import type {
  LearnerProfile,
  ActivityRecord,
  SkillMastery,
} from '../models/learner-model-types.js';

/**
 * Sequenced activity with additional context
 */
export interface SequencedActivity extends ActivityRecord {
  /** Position in the sequence (0-indexed) */
  sequencePosition: number;

  /** Reason for this placement */
  reason: string;

  /** Adaptations to apply */
  adaptations: string[];

  /** Expected mastery after completing */
  estimatedMastery: number;
}

/**
 * Complete session plan
 */
export interface SessionPlan {
  /** Unique session identifier */
  sessionId: string;

  /** Learner identifier */
  learnerId: string;

  /** Target duration in minutes */
  targetDuration: number;

  /** Sequenced activities */
  activities: SequencedActivity[];

  /** Session objectives */
  objectives: string[];

  /** Recommended break points (indices) */
  breakpoints: number[];

  /** Aggregated adaptations */
  adaptations: string[];

  /** Total estimated duration */
  estimatedDuration: number;
}

/**
 * Options for session plan generation
 */
export interface SessionPlanOptions {
  /** Target duration in minutes */
  targetDuration: number;

  /** Optional focus skills */
  focusSkills?: string[] | undefined;

  /** Activity IDs to exclude */
  excludeActivityIds?: string[] | undefined;

  /** Session type */
  sessionType?: 'practice' | 'assessment' | 'mixed' | undefined;

  /** Prefer interactive activities */
  preferInteractive?: boolean | undefined;
}

/**
 * Scoring result for activity selection
 */
export interface ActivityScore {
  /** Activity being scored */
  activity: ActivityRecord;

  /** Calculated score */
  score: number;

  /** Factors contributing to score */
  factors: string[];
}
