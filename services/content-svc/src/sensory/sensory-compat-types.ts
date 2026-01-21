/**
 * Sensory Compat Types - STUB
 *
 * Stubbed type definitions for sensory profiles.
 */

export interface SensoryProfile {
  id: string;
  tenantId: string;
  learnerId?: string;
  audioSensitivity?: number;
  visualSensitivity?: number;
  motionSensitivity?: number;
  auditorySensitivity?: number;
  preferredVolume?: number;
  prefersNoSuddenSounds?: boolean;
  prefersQuietEnvironment?: boolean;
  avoidsFlashing?: boolean;
  prefersSimpleVisuals?: boolean;
  prefersReducedMotion?: boolean;
  preferredAnimationSpeed?: 'normal' | 'slow' | 'fast';
  [key: string]: any;
}

export interface SensoryContentFilter {
  tenantId?: string;
  learnerIds?: string[];
  [key: string]: any;
}

export interface ContentSensoryMetadata {
  id: string;
  learningObjectVersionId: string;
  cognitiveLoad?: string;
  hasAudio?: boolean;
  visualComplexity?: string;
  [key: string]: any;
}

export interface CreateSensoryMetadataInput {
  learningObjectVersionId: string;
  [key: string]: any;
}

export interface CreateSensoryIncidentInput {
  learnerId: string;
  [key: string]: any;
}

export interface SensoryWarningInput {
  type: string;
  severity: string;
  description: string;
}

export interface IncidentAction {
  type: string;
  description?: string;
  performedByUserId?: string;
  performedAt: Date;
}

export type SensorySensitivity = number | { level: number; category?: string };

export function getSensitivityLevel(sensitivity: SensorySensitivity | undefined): number {
  if (sensitivity === undefined) return 5;
  if (typeof sensitivity === 'number') return sensitivity;
  return sensitivity.level ?? 5;
}
