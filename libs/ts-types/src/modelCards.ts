/**
 * Model Card Types for AI Transparency
 *
 * Types for model cards that document AI capabilities, limitations,
 * and safety considerations for platform and district administrators.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export type ModelProvider =
  | 'OPENAI'
  | 'ANTHROPIC'
  | 'GOOGLE'
  | 'INTERNAL'
  | 'META'
  | 'MISTRAL'
  | 'COHERE';

export const MODEL_PROVIDERS: ModelProvider[] = [
  'OPENAI',
  'ANTHROPIC',
  'GOOGLE',
  'INTERNAL',
  'META',
  'MISTRAL',
  'COHERE',
];

// ══════════════════════════════════════════════════════════════════════════════
// MODEL CARD
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Model card metadata stored in JSONB
 */
export interface ModelCardMetadata {
  /** Semantic version of the model */
  version?: string;
  /** Base model used (if applicable) */
  baseModel?: string;
  /** Context window size in tokens */
  context_window?: number;
  /** Features this model supports */
  features?: string[];
  /** Algorithm types used */
  algorithms?: string[];
  /** Model type (e.g., 'hybrid', 'transformer') */
  type?: string;
  /** Framework alignment (e.g., 'CASEL' for SEL) */
  framework?: string;
  /** Additional custom fields */
  [key: string]: unknown;
}

/**
 * Full model card entity
 */
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

/**
 * Model card summary for list views
 */
export interface ModelCardSummary {
  id: string;
  modelKey: string;
  provider: ModelProvider;
  displayName: string;
  description: string;
  intendedUseCases: string;
  lastReviewedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TENANT MODEL ASSIGNMENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Assignment of a model to a tenant for a specific feature
 */
export interface TenantModelAssignment {
  id: string;
  tenantId: string;
  modelCardId: string;
  featureKey: string;
  isActive: boolean;
  assignedAt: string;
  assignedBy?: string | null;
}

/**
 * Model card with tenant context
 */
export interface TenantModelCard extends ModelCard {
  featureKey: string;
  isActive: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// API RESPONSES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Response for listing all model cards
 */
export interface ListModelCardsResponse {
  modelCards: ModelCardSummary[];
  total: number;
}

/**
 * Response for getting a single model card
 */
export interface GetModelCardResponse {
  modelCard: ModelCard;
}

/**
 * Response for tenant-specific model cards
 */
export interface TenantModelCardsResponse {
  tenantId: string;
  modelCards: TenantModelCard[];
  total: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Parsed "Best for" and "Not appropriate for" sections
 */
export interface ParsedUseCases {
  bestFor: string[];
  notAppropriateFor: string[];
}

/**
 * Parsed safety section with disclaimer
 */
export interface ParsedSafety {
  measures: string[];
  disclaimer?: string;
}

/**
 * Provider display information
 */
export const PROVIDER_DISPLAY: Record<ModelProvider, { name: string; color: string }> = {
  OPENAI: { name: 'OpenAI', color: 'emerald' },
  ANTHROPIC: { name: 'Anthropic', color: 'orange' },
  GOOGLE: { name: 'Google', color: 'blue' },
  INTERNAL: { name: 'Aivo', color: 'violet' },
  META: { name: 'Meta', color: 'sky' },
  MISTRAL: { name: 'Mistral', color: 'amber' },
  COHERE: { name: 'Cohere', color: 'pink' },
};

/**
 * Parse intended use cases into structured format
 */
export function parseUseCases(intendedUseCases: string, limitations: string): ParsedUseCases {
  const extractBullets = (text: string, header: string): string[] => {
    const headerIndex = text.toLowerCase().indexOf(header.toLowerCase());
    if (headerIndex === -1) return [];

    const afterHeader = text.slice(headerIndex + header.length);
    const lines = afterHeader.split('\n');
    const bullets: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        bullets.push(trimmed.replace(/^[•\-]\s*/, ''));
      } else if (trimmed && !trimmed.includes(':') && bullets.length > 0) {
        // Stop at next section header
        break;
      }
    }

    return bullets;
  };

  return {
    bestFor: extractBullets(intendedUseCases, 'Best for:'),
    notAppropriateFor: extractBullets(limitations, 'Not appropriate for:'),
  };
}

/**
 * Parse safety considerations into structured format
 */
export function parseSafety(safetyConsiderations: string): ParsedSafety {
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

    if (trimmed.toLowerCase().includes('disclaimer:')) {
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
