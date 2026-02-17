/**
 * Content Service Client
 *
 * Fetches learning content from content-svc for session content selection.
 * Used when creating LEARNING sessions to populate them with relevant content.
 */

import { config } from '../config.js';
import { logger } from '../logger.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type Subject = 'ELA' | 'MATH' | 'SCIENCE' | 'SEL' | 'SPEECH' | 'OTHER';
export type GradeBand = 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';

export interface ContentSearchParams {
  tenantId?: string;
  subject?: Subject;
  gradeBand?: GradeBand;
  limit?: number;
  offset?: number;
}

export interface ContentItem {
  id: string;
  learningObjectId: string;
  versionNumber: number;
  title: string;
  slug: string;
  subject: Subject;
  gradeBand: GradeBand;
  primarySkillId: string | null;
  skills: { skillId: string; isPrimary: boolean }[];
  tags: string[];
  standards: string[];
  estimatedDuration: number | null;
  contentType: string | null;
  difficulty: string | null;
  publishedAt: string | null;
  accessibilityFlags: {
    supportsDyslexiaFriendlyFont: boolean;
    supportsReducedStimuli: boolean;
    hasScreenReaderOptimizedStructure: boolean;
    estimatedCognitiveLoad: string | null;
  };
}

export interface ContentSearchResponse {
  items: ContentItem[];
  total: number;
  limit: number;
  offset: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// GRADE MAPPING
// ══════════════════════════════════════════════════════════════════════════════

/** Convert a grade level string (e.g. "5", "K", "10") to a GradeBand */
export function gradeToGradeBand(grade: string): GradeBand {
  const g = grade.toUpperCase().trim();
  if (g === 'K' || g === '0' || g === '1' || g === '2' || g === 'PK' || g === 'PRE-K') {
    return 'K_2';
  }
  const num = Number.parseInt(g, 10);
  if (Number.isNaN(num)) return 'K_2';
  if (num <= 2) return 'K_2';
  if (num <= 5) return 'G3_5';
  if (num <= 8) return 'G6_8';
  return 'G9_12';
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Search content-svc for published Learning Objects matching the given criteria.
 * Returns a list of content items suitable for a learning session.
 */
export async function searchContent(params: ContentSearchParams): Promise<ContentSearchResponse> {
  const baseUrl = config.contentServiceUrl;
  const url = new URL('/api/content/search', baseUrl);

  if (params.tenantId) url.searchParams.set('tenantId', params.tenantId);
  if (params.subject) url.searchParams.set('subject', params.subject);
  if (params.gradeBand) url.searchParams.set('gradeBand', params.gradeBand);
  if (params.limit) url.searchParams.set('limit', String(params.limit));
  if (params.offset) url.searchParams.set('offset', String(params.offset));

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'session-svc',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(
        { status: response.status, error: errorText },
        '[content-client] content-svc search returned non-OK status'
      );
      return { items: [], total: 0, limit: params.limit ?? 20, offset: params.offset ?? 0 };
    }

    const data = (await response.json()) as ContentSearchResponse;
    logger.info(
      { subject: params.subject, gradeBand: params.gradeBand, count: data.items?.length ?? 0 },
      '[content-client] Content search completed'
    );
    return data;
  } catch (err) {
    logger.error({ err }, '[content-client] Failed to reach content-svc');
    return { items: [], total: 0, limit: params.limit ?? 20, offset: params.offset ?? 0 };
  }
}

/**
 * Select content for a learning session.
 *
 * Fetches up to `maxItems` published Learning Objects from content-svc that
 * match the learner's subject and grade band. Returns an ordered list for the
 * session's activity queue.
 */
export async function selectSessionContent(options: {
  tenantId: string;
  subject: Subject;
  gradeBand: GradeBand;
  maxItems?: number;
}): Promise<ContentItem[]> {
  const { tenantId, subject, gradeBand, maxItems = 10 } = options;

  const result = await searchContent({
    tenantId,
    subject,
    gradeBand,
    limit: maxItems,
  });

  return result.items;
}
