/**
 * Model Cards API Client for Platform Admin
 *
 * Fetches AI model documentation for transparency and governance views.
 */

import type { AuthSession } from './auth';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const ANALYTICS_SVC_URL = process.env.ANALYTICS_SVC_URL ?? 'http://localhost:4011';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ModelProvider =
  | 'OPENAI'
  | 'ANTHROPIC'
  | 'GOOGLE'
  | 'INTERNAL'
  | 'META'
  | 'MISTRAL'
  | 'COHERE';

export interface ModelCardMetadata {
  version?: string;
  baseModel?: string;
  context_window?: number;
  features?: string[];
  algorithms?: string[];
  type?: string;
  framework?: string;
  [key: string]: unknown;
}

export interface ModelCardSummary {
  id: string;
  modelKey: string;
  provider: ModelProvider;
  displayName: string;
  description: string;
  intendedUseCases: string;
  lastReviewedAt: string;
}

export interface ModelCard {
  id: string;
  modelKey: string;
  provider: ModelProvider;
  displayName: string;
  description: string;
  intendedUseCases: string;
  limitations: string;
  safetyConsiderations: string;
  inputTypes: string;
  outputTypes: string;
  dataSourcesSummary: string;
  lastReviewedAt: string;
  lastReviewedBy?: string | null;
  metadataJson: ModelCardMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface AIFeature {
  key: string;
  name: string;
  description: string;
  defaultModelKey: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all model cards
 */
export async function listModelCards(accessToken: string): Promise<{
  modelCards: ModelCardSummary[];
  total: number;
}> {
  const res = await fetch(`${ANALYTICS_SVC_URL}/models/cards`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch model cards: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a single model card by key
 */
export async function getModelCard(
  modelKey: string,
  accessToken: string
): Promise<{ modelCard: ModelCard }> {
  const res = await fetch(`${ANALYTICS_SVC_URL}/models/cards/${encodeURIComponent(modelKey)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch model card: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch available AI features
 */
export async function listAIFeatures(accessToken: string): Promise<{ features: AIFeature[] }> {
  const res = await fetch(`${ANALYTICS_SVC_URL}/models/features`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch AI features: ${res.status}`);
  }

  return res.json();
}

// ══════════════════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export const PROVIDER_DISPLAY: Record<ModelProvider, { name: string; colorClass: string }> = {
  OPENAI: { name: 'OpenAI', colorClass: 'bg-emerald-100 text-emerald-700' },
  ANTHROPIC: { name: 'Anthropic', colorClass: 'bg-orange-100 text-orange-700' },
  GOOGLE: { name: 'Google', colorClass: 'bg-blue-100 text-blue-700' },
  INTERNAL: { name: 'Aivo', colorClass: 'bg-violet-100 text-violet-700' },
  META: { name: 'Meta', colorClass: 'bg-sky-100 text-sky-700' },
  MISTRAL: { name: 'Mistral', colorClass: 'bg-amber-100 text-amber-700' },
  COHERE: { name: 'Cohere', colorClass: 'bg-pink-100 text-pink-700' },
};

/**
 * Parse "Best for" bullets from intended use cases
 */
export function parseBestFor(intendedUseCases: string): string[] {
  const lines = intendedUseCases.split('\n');
  const bullets: string[] = [];
  let inBestFor = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().includes('best for:')) {
      inBestFor = true;
      continue;
    }
    if (inBestFor && (trimmed.startsWith('•') || trimmed.startsWith('-'))) {
      bullets.push(trimmed.replace(/^[•\-]\s*/, ''));
    } else if (inBestFor && trimmed && !trimmed.startsWith('•') && !trimmed.startsWith('-')) {
      break;
    }
  }

  return bullets;
}

/**
 * Parse "Not appropriate for" bullets from limitations
 */
export function parseNotAppropriateFor(limitations: string): string[] {
  const lines = limitations.split('\n');
  const bullets: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().includes('not appropriate for:')) {
      inSection = true;
      continue;
    }
    if (inSection && (trimmed.startsWith('•') || trimmed.startsWith('-'))) {
      bullets.push(trimmed.replace(/^[•\-]\s*/, ''));
    } else if (inSection && trimmed.toLowerCase().includes('important:')) {
      break;
    }
  }

  return bullets;
}

/**
 * Parse safety measures from safety considerations
 */
export function parseSafetyMeasures(safetyConsiderations: string): {
  measures: string[];
  disclaimer?: string;
} {
  const lines = safetyConsiderations.split('\n');
  const measures: string[] = [];
  let disclaimer: string | undefined;
  let inMeasures = false;
  let inDisclaimer = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.toLowerCase().includes('safety measures')) {
      inMeasures = true;
      inDisclaimer = false;
      continue;
    }

    if (trimmed.toLowerCase().startsWith('disclaimer:')) {
      inMeasures = false;
      inDisclaimer = true;
      disclaimer = trimmed.replace(/^disclaimer:\s*/i, '');
      continue;
    }

    if (inMeasures && (trimmed.startsWith('•') || trimmed.startsWith('-'))) {
      measures.push(trimmed.replace(/^[•\-]\s*/, ''));
    }

    if (inDisclaimer && trimmed && !trimmed.startsWith('•')) {
      disclaimer = (disclaimer || '') + ' ' + trimmed;
    }
  }

  return { measures, disclaimer: disclaimer?.trim() };
}

/**
 * Format date for display
 */
export function formatReviewDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
