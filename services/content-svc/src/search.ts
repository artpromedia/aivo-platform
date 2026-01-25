/**
 * Content Search Service
 *
 * Provides search and discovery APIs for Learning Objects.
 * Used by teachers, lesson planners, and AI agents.
 */

import { config } from './config.js';
import { prisma } from './prisma.js';

// Local type definitions since Prisma types may not be exported
type LearningObjectSubject = 'ELA' | 'MATH' | 'SCIENCE' | 'SEL' | 'SPEECH' | 'OTHER';
type LearningObjectGradeBand = 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SearchQuery {
  tenantId?: string | null;
  subject?: LearningObjectSubject;
  gradeBand?: LearningObjectGradeBand;
  skillId?: string;
  skillIds?: string[];
  standardCode?: string;
  tag?: string;
  tags?: string[];
  textQuery?: string;
  contentType?: string;
  minDuration?: number;
  maxDuration?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string; // Version ID
  learningObjectId: string;
  versionNumber: number;
  title: string;
  slug: string;
  subject: LearningObjectSubject;
  gradeBand: LearningObjectGradeBand;
  primarySkillId: string | null;
  skills: { skillId: string; isPrimary: boolean }[];
  tags: string[];
  standards: string[];
  estimatedDuration: number | null;
  contentType: string | null;
  difficulty: string | null;
  publishedAt: Date | null;
  accessibilityFlags: {
    supportsDyslexiaFriendlyFont: boolean;
    supportsReducedStimuli: boolean;
    hasScreenReaderOptimizedStructure: boolean;
    estimatedCognitiveLoad: string | null;
  };
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
  limit: number;
  offset: number;
  query: SearchQuery;
}

// ══════════════════════════════════════════════════════════════════════════════
// SEARCH IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Search for published Learning Objects.
 * Supports filtering by subject, grade, skills, standards, tags, and text.
 */
export async function searchContent(query: SearchQuery): Promise<SearchResponse> {
  const {
    tenantId,
    subject,
    gradeBand,
    skillId,
    skillIds,
    standardCode,
    tag,
    tags,
    textQuery,
    contentType,
    minDuration,
    maxDuration,
    limit = 20,
    offset = 0,
  } = query;

  // Build the where clause
  const loWhere: Record<string, unknown> = {
    isActive: true,
  };

  // Tenant scoping: include global (null) + tenant-specific
  if (tenantId !== undefined) {
    loWhere.OR = [{ tenantId: null }, { tenantId }];
  }

  if (subject) loWhere.subject = subject;
  if (gradeBand) loWhere.gradeBand = gradeBand;

  // Tag filtering
  if (tag || (tags && tags.length > 0)) {
    const tagList = tags ?? (tag ? [tag] : []);
    loWhere.tags = {
      some: {
        tag: { in: tagList },
      },
    };
  }

  // Text search on title
  if (textQuery && textQuery.trim().length > 0) {
    loWhere.title = {
      contains: textQuery.trim(),
      mode: 'insensitive',
    };
  }

  // Build version filter
  const versionWhere: Record<string, unknown> = {
    state: 'PUBLISHED',
    learningObject: loWhere,
  };

  // Skill filtering
  const allSkillIds = [...(skillIds ?? []), ...(skillId ? [skillId] : [])];
  if (allSkillIds.length > 0) {
    versionWhere.skills = {
      some: {
        skillId: { in: allSkillIds },
      },
    };
  }

  // Standard code filtering (in standardsJson)
  if (standardCode) {
    versionWhere.standardsJson = {
      path: ['codes'],
      array_contains: standardCode,
    };
  }

  // Content type filtering (in metadataJson)
  if (contentType) {
    versionWhere.metadataJson = {
      path: ['contentType'],
      equals: contentType,
    };
  }

  // Get total count
  const total = await prisma.learningObjectVersion.count({
    where: versionWhere,
  });

  // Get results with related data
  const versions = await prisma.learningObjectVersion.findMany({
    where: versionWhere,
    orderBy: [{ publishedAt: 'desc' }, { learningObject: { title: 'asc' } }],
    skip: offset,
    take: limit,
    include: {
      learningObject: {
        include: {
          tags: { select: { tag: true } },
        },
      },
      skills: {
        select: { skillId: true, isPrimary: true },
      },
    },
  });

  // Filter by duration if specified (from metadataJson)
  let filteredVersions = versions;
  if (minDuration !== undefined || maxDuration !== undefined) {
    filteredVersions = versions.filter((v) => {
      const meta = v.metadataJson as Record<string, unknown> | null;
      const duration = (meta?.estimatedDuration ?? null) as number | null;
      if (duration === null) return true; // Include if no duration set
      if (minDuration !== undefined && duration < minDuration) return false;
      if (maxDuration !== undefined && duration > maxDuration) return false;
      return true;
    });
  }

  // Map to response format
  const items: SearchResult[] = filteredVersions.map((v) => {
    const meta = (v.metadataJson as Record<string, unknown> | null) ?? {};
    const accessibility = (v.accessibilityJson as Record<string, unknown> | null) ?? {};
    const standards = (v.standardsJson as Record<string, unknown> | null) ?? {};

    return {
      id: v.id,
      learningObjectId: v.learningObjectId,
      versionNumber: v.versionNumber,
      title: v.learningObject.title,
      slug: v.learningObject.slug,
      subject: v.learningObject.subject,
      gradeBand: v.learningObject.gradeBand,
      primarySkillId: v.learningObject.primarySkillId,
      skills: v.skills.map((s) => ({ skillId: s.skillId, isPrimary: s.isPrimary })),
      tags: v.learningObject.tags.map((t) => t.tag),
      standards: (standards.codes as string[] | undefined) ?? [],
      estimatedDuration: (meta.estimatedDuration as number | undefined) ?? null,
      contentType: (meta.contentType as string | undefined) ?? null,
      difficulty: (meta.difficulty as string | undefined) ?? null,
      publishedAt: v.publishedAt,
      accessibilityFlags: {
        supportsDyslexiaFriendlyFont:
          (accessibility.supportsDyslexiaFriendlyFont as boolean | undefined) ?? false,
        supportsReducedStimuli:
          (accessibility.supportsReducedStimuli as boolean | undefined) ?? false,
        hasScreenReaderOptimizedStructure:
          (accessibility.hasScreenReaderOptimizedStructure as boolean | undefined) ?? false,
        estimatedCognitiveLoad:
          (accessibility.estimatedCognitiveLoad as string | undefined) ?? null,
      },
    };
  });

  return {
    items,
    total,
    limit,
    offset,
    query,
  };
}

/**
 * Session event response from session-svc
 */
interface SessionEventResponse {
  id: string;
  eventType: string;
  eventTime: string;
  metadataJson?: Record<string, unknown> | null;
}

/**
 * Session response from session-svc
 */
interface SessionResponse {
  id: string;
  tenantId: string;
  learnerId: string;
  startedAt: string;
  endedAt?: string | null;
  events?: SessionEventResponse[];
}

/**
 * Get LO IDs recently used by a learner (for deduplication).
 * Queries session-svc for ACTIVITY_COMPLETED events within the specified time window.
 *
 * @param tenantId - The tenant ID
 * @param learnerId - The learner ID
 * @param daysPast - Number of days to look back (default: 7)
 * @returns Array of Learning Object IDs the learner has recently completed
 */
export async function getRecentlyUsedLOIds(
  tenantId: string,
  learnerId: string,
  daysPast = 7
): Promise<string[]> {
  try {
    // Build query parameters to fetch recent sessions
    const params = new URLSearchParams({
      tenantId,
      learnerId,
      limit: '100',
      offset: '0',
      includeIncomplete: 'false',
    });

    // Fetch recent sessions from session-svc
    const response = await fetch(`${config.sessionSvcUrl}/sessions?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(config.sessionSvcApiKey && { 'X-Internal-API-Key': config.sessionSvcApiKey }),
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`[getRecentlyUsedLOIds] session-svc returned ${response.status}, returning empty array`);
      return [];
    }

    const data = (await response.json()) as { items: SessionResponse[]; total: number };

    // Filter sessions by date (within daysPast)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysPast);

    const recentSessionIds = data.items
      .filter((session) => new Date(session.startedAt) >= cutoffDate)
      .map((session) => session.id);

    if (recentSessionIds.length === 0) {
      return [];
    }

    // Collect LO IDs from ACTIVITY_COMPLETED events in each session
    const loIds = new Set<string>();

    // Fetch events for each session (in parallel, but limited)
    const batchSize = 5;
    for (let i = 0; i < recentSessionIds.length; i += batchSize) {
      const batch = recentSessionIds.slice(i, i + batchSize);

      const eventPromises = batch.map(async (sessionId) => {
        try {
          const eventsResponse = await fetch(
            `${config.sessionSvcUrl}/sessions/${sessionId}/events`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(config.sessionSvcApiKey && { 'X-Internal-API-Key': config.sessionSvcApiKey }),
              },
              signal: AbortSignal.timeout(5000),
            }
          );

          if (!eventsResponse.ok) {
            return [];
          }

          const eventsData = (await eventsResponse.json()) as { events: SessionEventResponse[] };
          return eventsData.events || [];
        } catch {
          return [];
        }
      });

      const eventResults = await Promise.all(eventPromises);

      // Extract LO IDs from ACTIVITY_COMPLETED events
      for (const events of eventResults) {
        for (const event of events) {
          if (event.eventType === 'ACTIVITY_COMPLETED' && event.metadataJson) {
            const learningObjectId = event.metadataJson.learningObjectId as string | undefined;
            const contentId = event.metadataJson.contentId as string | undefined;
            const loId = learningObjectId || contentId;

            if (loId && typeof loId === 'string') {
              loIds.add(loId);
            }
          }
        }
      }
    }

    return Array.from(loIds);
  } catch (error) {
    // Log but don't fail - gracefully degrade to empty array
    console.warn('[getRecentlyUsedLOIds] Error querying session-svc:', error);
    return [];
  }
}

/**
 * Semantic search for Learning Objects.
 *
 * Currently falls back to text-based search using the existing searchContent function.
 * When pgvector and embeddings are available, this will use vector similarity search:
 * ```sql
 * SELECT id, title, 1 - (embedding <=> $1) as similarity
 * FROM learning_object_embeddings
 * WHERE embedding <=> $1 < 0.5
 * ORDER BY embedding <=> $1
 * LIMIT 20
 * ```
 */
export async function semanticSearch(
  query: string,
  options: { tenantId?: string; limit?: number } = {}
): Promise<SearchResult[]> {
  const { tenantId, limit = 20 } = options;

  // Fall back to text search until embedding infrastructure is available
  // This provides functionality while semantic search is being built out
  const response = await searchContent({
    tenantId,
    textQuery: query,
    limit,
    offset: 0,
  });

  return response.items;
}
