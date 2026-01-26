/**
 * Search tool for querying external knowledge sources
 */

import { defineTool, type ExtendedTool } from '../tool-types.js';

export interface SearchResult {
  title: string;
  snippet: string;
  url?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

export interface SearchOptions {
  maxResults?: number;
  filters?: Record<string, string>;
  includeSnippets?: boolean;
}

/**
 * Create a search tool with a custom provider
 */
export function createSearchTool(provider: SearchProvider): ExtendedTool {
  return defineTool<{
    query: string;
    maxResults?: number;
    filters?: Record<string, string>;
  }>({
    name: 'search',
    description: 'Search for information on a topic. Returns relevant results from the knowledge base.',
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
          type: 'integer',
          description: 'Maximum number of results to return',
          minimum: 1,
          maximum: 20,
          default: 5,
        },
        filters: {
          type: 'object',
          description: 'Optional filters to narrow results',
          additionalProperties: true,
        },
      },
      required: ['query'],
    },
    execute: async (params) => {
      const results = await provider.search(params.query, {
        maxResults: params.maxResults ?? 5,
        filters: params.filters,
        includeSnippets: true,
      });

      return {
        query: params.query,
        resultCount: results.length,
        results: results.map(r => ({
          title: r.title,
          snippet: r.snippet,
          url: r.url,
        })),
      };
    },
    metadata: {
      category: 'knowledge',
      tags: ['search', 'information', 'lookup'],
    },
  });
}

/**
 * Mock search provider for testing
 */
export class MockSearchProvider implements SearchProvider {
  private readonly mockResults: SearchResult[];

  constructor(mockResults?: SearchResult[]) {
    this.mockResults = mockResults ?? [
      {
        title: 'Introduction to the Topic',
        snippet: 'This is a comprehensive introduction to the topic you searched for.',
        url: 'https://example.com/intro',
        score: 0.95,
      },
      {
        title: 'Advanced Concepts',
        snippet: 'Learn about advanced concepts and best practices.',
        url: 'https://example.com/advanced',
        score: 0.85,
      },
      {
        title: 'Tutorial and Examples',
        snippet: 'Step-by-step tutorials with practical examples.',
        url: 'https://example.com/tutorial',
        score: 0.75,
      },
    ];
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const maxResults = options?.maxResults ?? 5;

    // Simple query matching for mock
    const filtered = this.mockResults.filter(r =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.snippet.toLowerCase().includes(query.toLowerCase()) ||
      true // Return all for testing
    );

    return filtered.slice(0, maxResults);
  }
}

/**
 * Create a default search tool with mock provider
 */
export const searchTool = createSearchTool(new MockSearchProvider());
