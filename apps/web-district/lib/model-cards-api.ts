/**
 * Model Cards API Client for District Admin
 *
 * Fetches tenant-specific AI model documentation for the district.
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

export interface TenantModelCard {
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
  featureKey: string;
  isActive: boolean;
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
 * Fetch model cards for a tenant
 */
export async function getTenantModelCards(
  tenantId: string,
  accessToken: string
): Promise<{
  tenantId: string;
  modelCards: TenantModelCard[];
  total: number;
}> {
  const res = await fetch(`${ANALYTICS_SVC_URL}/models/tenant/${tenantId}/cards`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch tenant model cards: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a single model card by key
 */
export async function getModelCard(
  modelKey: string,
  accessToken: string
): Promise<{ modelCard: TenantModelCard }> {
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

// ══════════════════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export const PROVIDER_DISPLAY: Record<ModelProvider, { name: string; colorClass: string }> = {
  OPENAI: { name: 'OpenAI', colorClass: 'bg-emerald-100 text-emerald-700' },
  ANTHROPIC: { name: 'Anthropic', colorClass: 'bg-orange-100 text-orange-700' },
  GOOGLE: { name: 'Google', colorClass: 'bg-blue-100 text-blue-700' },
  INTERNAL: { name: 'Aivo', colorClass: 'bg-primary/10 text-primary' },
  META: { name: 'Meta', colorClass: 'bg-sky-100 text-sky-700' },
  MISTRAL: { name: 'Mistral', colorClass: 'bg-amber-100 text-amber-700' },
  COHERE: { name: 'Cohere', colorClass: 'bg-pink-100 text-pink-700' },
};

export const FEATURE_DISPLAY: Record<string, { name: string; icon: string }> = {
  TUTORING: { name: 'AI Tutoring', icon: '🎓' },
  BASELINE: { name: 'Baseline Assessment', icon: '📊' },
  HOMEWORK_HELP: { name: 'Homework Helper', icon: '📝' },
  FOCUS: { name: 'Focus Support', icon: '🎯' },
  RECOMMENDATIONS: { name: 'Learning Path', icon: '🛤️' },
  HOMEWORK_PARSING: { name: 'Homework Vision', icon: '📷' },
  SEL: { name: 'SEL Activities', icon: '💚' },
  ALL: { name: 'All Features', icon: '✨' },
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
 * Extract disclaimer from limitations or safety text
 */
export function extractDisclaimer(text: string): string | undefined {
  const disclaimerMatch = text.match(/disclaimer:\s*(.+?)(?:\n\n|$)/is);
  if (disclaimerMatch) {
    return disclaimerMatch[1].trim();
  }

  const importantMatch = text.match(/important:\s*(.+?)(?:\n\n|$)/is);
  if (importantMatch) {
    return importantMatch[1].trim();
  }

  return undefined;
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
