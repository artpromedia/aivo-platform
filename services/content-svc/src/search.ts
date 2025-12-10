/**
 * Content Search Service
 *
 * Provides search and discovery APIs for Learning Objects.
 * Used by teachers, lesson planners, and AI agents.
 */

import type { LearningObjectSubject, LearningObjectGradeBand } from '@prisma/client';

import { prisma } from './prisma.js';

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
 * Get LO IDs recently used by a learner (for deduplication).
 * This would query session events in a real implementation.
 * For now, returns a stub - to be integrated with session-svc.
 */
export async function getRecentlyUsedLOIds(
  _tenantId: string,
  _learnerId: string,
  _daysPast = 7
): Promise<string[]> {
  // TODO: Query session-svc for ACTIVITY_COMPLETED events
  // Return LO IDs from metadataJson.learningObjectId
  // For now, return empty array (stub)
  return [];
}

/**
 * Full-text search using PostgreSQL (for future enhancement).
 * Currently using simple LIKE matching.
 *
 * For vector/embedding search, would integrate with pgvector:
 * ```sql
 * SELECT id, title, 1 - (embedding <=> $1) as similarity
 * FROM learning_object_embeddings
 * WHERE embedding <=> $1 < 0.5
 * ORDER BY embedding <=> $1
 * LIMIT 20
 * ```
 */
export async function semanticSearch(
  _query: string,
  _options: { tenantId?: string; limit?: number }
): Promise<SearchResult[]> {
  // TODO: Implement pgvector semantic search when embeddings are available
  // For now, fall back to text search
  console.warn('Semantic search not yet implemented, falling back to text search');
  return [];
}
