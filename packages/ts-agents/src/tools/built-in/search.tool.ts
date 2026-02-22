/**
 * Search Tool - Basic search functionality for educational content
 */

import type { Tool, ToolContext, ToolResult } from '../../core/types';
import { defineTool, toolSuccess, toolError } from '../tool-types';

export interface SearchParams {
  query: string;
  maxResults?: number;
  filters?: {
    subject?: string;
    gradeLevel?: string;
    contentType?: string;
  };
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url?: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
}

/**
 * In-memory search data store (replace with actual search service in production)
 */
let searchData: SearchResult[] = [];

/**
 * Configure the search tool with data
 */
export function configureSearchData(data: SearchResult[]): void {
  searchData = data;
}

/**
 * Create the search tool
 */
export function createSearchTool(): Tool {
  return defineTool({
    name: 'search',
    description:
      'Search for educational content, resources, or information. Use this to find relevant materials for teaching or learning.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
          minLength: 1,
          maxLength: 500,
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          minimum: 1,
          maximum: 20,
        },
        filters: {
          type: 'object',
          description: 'Optional filters to narrow down results',
          properties: {
            subject: {
              type: 'string',
              description: 'Filter by subject (e.g., math, science, english)',
            },
            gradeLevel: {
              type: 'string',
              description: 'Filter by grade level (e.g., K-2, 3-5, 6-8, 9-12)',
            },
            contentType: {
              type: 'string',
              description: 'Filter by content type (e.g., video, article, worksheet)',
            },
          },
        },
      },
      required: ['query'],
    },
    execute: searchExecute,
    metadata: {
      category: 'search',
      version: '1.0.0',
      tags: ['search', 'education', 'content'],
      examples: [
        {
          description: 'Search for algebra lessons',
          input: { query: 'algebra equations', maxResults: 5 },
        },
        {
          description: 'Search with filters',
          input: {
            query: 'fractions',
            filters: { subject: 'math', gradeLevel: '3-5' },
          },
        },
      ],
    },
  });
}

/**
 * Search execution function
 */
async function searchExecute(params: unknown, _context: ToolContext): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { query, maxResults = 5, filters } = params as SearchParams;

    // Perform search
    let results = performSearch(query, searchData);

    // Apply filters
    if (filters) {
      results = applyFilters(results, filters);
    }

    // Limit results
    results = results.slice(0, maxResults);

    const executionTimeMs = Date.now() - startTime;

    return toolSuccess(
      {
        query,
        totalResults: results.length,
        results,
      },
      executionTimeMs
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return toolError(err.message, Date.now() - startTime);
  }
}

/**
 * Simple search implementation
 */
function performSearch(query: string, data: SearchResult[]): SearchResult[] {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const scored: { result: SearchResult; score: number }[] = [];

  for (const item of data) {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const snippetLower = item.snippet.toLowerCase();

    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        score += 3;
      }
      if (snippetLower.includes(term)) {
        score += 1;
      }
    }

    if (score > 0) {
      scored.push({ result: { ...item, relevanceScore: score }, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.result);
}

/**
 * Apply filters to results
 */
function applyFilters(results: SearchResult[], filters: SearchParams['filters']): SearchResult[] {
  if (!filters) return results;

  return results.filter((result) => {
    if (filters.subject && result.metadata.subject !== filters.subject) {
      return false;
    }
    if (filters.gradeLevel && result.metadata.gradeLevel !== filters.gradeLevel) {
      return false;
    }
    if (filters.contentType && result.metadata.contentType !== filters.contentType) {
      return false;
    }
    return true;
  });
}

/**
 * Default search tool instance
 */
export const searchTool = createSearchTool();
