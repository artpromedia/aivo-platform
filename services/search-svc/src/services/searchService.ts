import type { IndexStatus, SearchEngine } from '../prisma.js';
import { prisma, Prisma } from '../prisma.js';

// Index Management
export async function createIndex(
  tenantId: string,
  data: {
    name: string;
    description?: string;
    engine?: SearchEngine;
    sourceType: string;
    sourceTable: string;
    fields: Record<string, unknown>;
    settings?: Record<string, unknown>;
    mappings?: Record<string, unknown>;
  }
) {
  return prisma.searchIndex.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description ?? undefined,
      engine: data.engine || 'POSTGRES_FTS',
      sourceType: data.sourceType,
      sourceTable: data.sourceTable,
      fields: data.fields,
      settings: data.settings ?? undefined,
      mappings: data.mappings ?? undefined,
      status: 'BUILDING',
    },
  });
}

export async function getIndex(tenantId: string, indexId: string) {
  return prisma.searchIndex.findFirst({
    where: { id: indexId, tenantId },
    include: {
      synonyms: { where: { isActive: true } },
      stopwords: { where: { isActive: true } },
      boostRules: { where: { isActive: true } },
    },
  });
}

export async function listIndexes(
  tenantId: string,
  filters?: {
    status?: IndexStatus;
    engine?: SearchEngine;
  }
) {
  return prisma.searchIndex.findMany({
    where: {
      tenantId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.engine && { engine: filters.engine }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateIndex(
  tenantId: string,
  indexId: string,
  data: {
    description?: string;
    fields?: Record<string, unknown>;
    settings?: Record<string, unknown>;
    mappings?: Record<string, unknown>;
  }
) {
  return prisma.searchIndex.update({
    where: { id: indexId, tenantId },
    data: {
      ...data,
      status: 'STALE', // Mark as stale to trigger rebuild
    },
  });
}

export async function deleteIndex(tenantId: string, indexId: string) {
  return prisma.searchIndex.delete({
    where: { id: indexId, tenantId },
  });
}

// Document Indexing
export async function indexDocument(
  tenantId: string,
  indexId: string,
  data: {
    sourceId: string;
    content: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
) {
  const searchVector = buildSearchVector(data.content);

  return prisma.searchDocument.upsert({
    where: {
      indexId_sourceId: { indexId, sourceId: data.sourceId },
    },
    create: {
      tenantId,
      indexId,
      sourceId: data.sourceId,
      content: data.content,
      metadata: data.metadata ?? undefined,
      searchVector,
      status: 'INDEXED',
      indexedAt: new Date(),
    },
    update: {
      content: data.content,
      metadata: data.metadata ?? undefined,
      searchVector,
      status: 'INDEXED',
      indexedAt: new Date(),
    },
  });
}

export async function bulkIndexDocuments(
  tenantId: string,
  indexId: string,
  documents: {
    sourceId: string;
    content: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }[]
) {
  const results = await Promise.allSettled(
    documents.map((doc) => indexDocument(tenantId, indexId, doc))
  );

  const indexed = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  // Update document count
  await prisma.searchIndex.update({
    where: { id: indexId },
    data: {
      documentCount: { increment: indexed },
      lastBuiltAt: new Date(),
      status: 'ACTIVE',
    },
  });

  return { indexed, failed, total: documents.length };
}

export async function deleteDocument(tenantId: string, indexId: string, sourceId: string) {
  return prisma.searchDocument.delete({
    where: {
      indexId_sourceId: { indexId, sourceId },
    },
  });
}

// Search Operations
export async function search(
  tenantId: string,
  params: {
    indexName: string;
    query: string;
    filters?: Record<string, unknown>;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    highlight?: boolean;
    facets?: string[];
  }
) {
  const startTime = Date.now();
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;

  const index = await prisma.searchIndex.findFirst({
    where: { tenantId, name: params.indexName },
    include: {
      boostRules: { where: { isActive: true } },
      synonyms: { where: { isActive: true } },
    },
  });

  if (!index) {
    throw new Error(`Index '${params.indexName}' not found`);
  }

  // Build search query with synonyms
  const expandedQuery = expandQueryWithSynonyms(params.query, index.synonyms);
  const searchTerms = expandedQuery.toLowerCase().split(/\s+/).filter(Boolean);

  // For PostgreSQL FTS, we use ILIKE for simplicity (real impl would use tsvector)
  const searchConditions = searchTerms.map((term) => ({
    searchVector: { contains: term },
  }));

  const [documents, totalCount] = await Promise.all([
    prisma.searchDocument.findMany({
      where: {
        indexId: index.id,
        tenantId,
        status: 'INDEXED',
        AND: searchConditions,
      },
      orderBy: params.sortBy
        ? { [params.sortBy]: params.sortOrder || 'desc' }
        : { indexedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.searchDocument.count({
      where: {
        indexId: index.id,
        tenantId,
        status: 'INDEXED',
        AND: searchConditions,
      },
    }),
  ]);

  const latencyMs = Date.now() - startTime;

  // Log search query for analytics
  await prisma.searchQuery.create({
    data: {
      tenantId,
      indexName: params.indexName,
      query: params.query,
      filters: params.filters ?? undefined,
      resultCount: totalCount,
      latencyMs,
    },
  });

  // Update suggestions
  await updateSuggestions(tenantId, params.indexName, params.query);

  const results = documents.map(
    (doc: { sourceId: string; content: unknown; metadata: unknown }) => ({
      id: doc.sourceId,
      score: 1.0, // Simplified scoring
      source: doc.content,
      metadata: doc.metadata,
      ...(params.highlight && {
        highlights: generateHighlights(doc.content as Record<string, unknown>, searchTerms),
      }),
    })
  );

  // Build facets if requested
  const facetResults = params.facets
    ? await buildFacets(index.id, tenantId, params.facets)
    : undefined;

  return {
    hits: results,
    total: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    latencyMs,
    facets: facetResults,
  };
}

export async function getSuggestions(
  tenantId: string,
  indexName: string,
  prefix: string,
  limit = 10
) {
  return prisma.searchSuggestion.findMany({
    where: {
      tenantId,
      indexName,
      phrase: { startsWith: prefix.toLowerCase() },
    },
    orderBy: { frequency: 'desc' },
    take: limit,
    select: { phrase: true, frequency: true },
  });
}

// Synonym Management
export async function addSynonym(
  tenantId: string,
  indexId: string,
  term: string,
  synonyms: string[]
) {
  return prisma.synonymRule.upsert({
    where: { indexId_term: { indexId, term } },
    create: { tenantId, indexId, term, synonyms },
    update: { synonyms },
  });
}

export async function removeSynonym(tenantId: string, indexId: string, term: string) {
  return prisma.synonymRule.delete({
    where: { indexId_term: { indexId, term } },
  });
}

// Boost Rules
export async function addBoostRule(
  tenantId: string,
  indexId: string,
  data: {
    field: string;
    boostFactor: number;
    condition?: Record<string, unknown>;
  }
) {
  return prisma.boostRule.create({
    data: {
      tenantId,
      indexId,
      field: data.field,
      boostFactor: data.boostFactor,
      condition: data.condition ?? undefined,
    },
  });
}

// Facet Configuration
export async function configureFacet(
  tenantId: string,
  indexName: string,
  data: {
    field: string;
    label: string;
    type?: string;
    settings?: Record<string, unknown>;
    sortOrder?: number;
  }
) {
  return prisma.facetConfig.upsert({
    where: {
      tenantId_indexName_field: { tenantId, indexName, field: data.field },
    },
    create: {
      tenantId,
      indexName,
      field: data.field,
      label: data.label,
      type: data.type || 'terms',
      settings: data.settings ?? Prisma.JsonNull,
      sortOrder: data.sortOrder || 0,
    },
    update: {
      label: data.label,
      ...(data.type !== undefined && { type: data.type }),
      ...(data.settings !== undefined && { settings: data.settings }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });
}

// Reindex Operations
export async function triggerReindex(tenantId: string, indexId: string) {
  const job = await prisma.reindexJob.create({
    data: {
      tenantId,
      indexId,
      status: 'pending',
    },
  });

  await prisma.searchIndex.update({
    where: { id: indexId },
    data: { status: 'REBUILDING' },
  });

  return job;
}

export async function getReindexStatus(tenantId: string, jobId: string) {
  return prisma.reindexJob.findFirst({
    where: { id: jobId, tenantId },
  });
}

// Analytics
export async function getSearchAnalytics(
  tenantId: string,
  params: {
    indexName?: string;
    startDate: Date;
    endDate: Date;
  }
) {
  const queries = await prisma.searchQuery.groupBy({
    by: ['indexName'],
    where: {
      tenantId,
      ...(params.indexName && { indexName: params.indexName }),
      timestamp: { gte: params.startDate, lte: params.endDate },
    },
    _count: true,
    _avg: { latencyMs: true, resultCount: true },
  });

  const topQueries = await prisma.searchQuery.groupBy({
    by: ['query'],
    where: {
      tenantId,
      ...(params.indexName && { indexName: params.indexName }),
      timestamp: { gte: params.startDate, lte: params.endDate },
    },
    _count: true,
    orderBy: { _count: { query: 'desc' } },
    take: 20,
  });

  const zeroResultQueries = await prisma.searchQuery.findMany({
    where: {
      tenantId,
      ...(params.indexName && { indexName: params.indexName }),
      resultCount: 0,
      timestamp: { gte: params.startDate, lte: params.endDate },
    },
    distinct: ['query'],
    take: 20,
  });

  return {
    summary: queries,
    topQueries: topQueries.map((q: { query: string; _count: number }) => ({
      query: q.query,
      count: q._count,
    })),
    zeroResultQueries: zeroResultQueries.map((q: { query: string }) => q.query),
  };
}

// Helper functions
function buildSearchVector(content: Record<string, unknown>): string {
  const values: string[] = [];
  for (const value of Object.values(content)) {
    if (typeof value === 'string') {
      values.push(value.toLowerCase());
    } else if (Array.isArray(value)) {
      values.push(...value.filter((v) => typeof v === 'string').map((v) => v.toLowerCase()));
    }
  }
  return values.join(' ');
}

function expandQueryWithSynonyms(
  query: string,
  synonyms: { term: string; synonyms: string[] }[]
): string {
  let expanded = query;
  for (const rule of synonyms) {
    if (query.toLowerCase().includes(rule.term.toLowerCase())) {
      expanded += ' ' + rule.synonyms.join(' ');
    }
  }
  return expanded;
}

function generateHighlights(
  content: Record<string, unknown>,
  terms: string[]
): Record<string, string[]> {
  const highlights: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(content)) {
    if (typeof value === 'string') {
      const matches = terms.filter((term) => value.toLowerCase().includes(term));
      if (matches.length > 0) {
        let highlighted = value;
        for (const term of matches) {
          const regex = new RegExp(`(${term})`, 'gi');
          highlighted = highlighted.replace(regex, '<em>$1</em>');
        }
        highlights[field] = [highlighted];
      }
    }
  }
  return highlights;
}

async function buildFacets(indexId: string, tenantId: string, facetFields: string[]) {
  const facets: Record<string, { value: string; count: number }[]> = {};

  for (const field of facetFields) {
    const documents = await prisma.searchDocument.findMany({
      where: { indexId, tenantId, status: 'INDEXED' },
      select: { content: true },
    });

    const valueCounts: Record<string, number> = {};
    for (const doc of documents) {
      const content = doc.content as Record<string, unknown>;
      const value = content[field];
      if (value && (typeof value === 'string' || typeof value === 'number')) {
        const key = String(value);
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      }
    }

    facets[field] = Object.entries(valueCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  return facets;
}

async function updateSuggestions(tenantId: string, indexName: string, query: string) {
  const phrase = query.toLowerCase().trim();
  if (phrase.length < 3) return;

  await prisma.searchSuggestion.upsert({
    where: {
      tenantId_indexName_phrase: { tenantId, indexName, phrase },
    },
    create: { tenantId, indexName, phrase, frequency: 1 },
    update: { frequency: { increment: 1 }, lastUsedAt: new Date() },
  });
}
