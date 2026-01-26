/**
 * Curriculum Lookup Tool - Access curriculum standards and learning objectives
 */

import type { Tool, ToolContext, ToolResult } from '../../core/types';
import { defineTool, toolSuccess, toolError } from '../tool-types';

export interface CurriculumStandard {
  id: string;
  code: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  domain?: string;
  cluster?: string;
  prerequisites?: string[];
  relatedStandards?: string[];
  learningObjectives: string[];
  keywords: string[];
}

export interface CurriculumLookupParams {
  action: 'search' | 'get' | 'prerequisites' | 'related' | 'objectives';
  standardId?: string;
  query?: string;
  subject?: string;
  gradeLevel?: string;
  domain?: string;
}

/**
 * In-memory curriculum data store (replace with actual service in production)
 */
let curriculumData: CurriculumStandard[] = [];

/**
 * Configure the curriculum tool with data
 */
export function configureCurriculumData(data: CurriculumStandard[]): void {
  curriculumData = data;
}

/**
 * Create the curriculum lookup tool
 */
export function createCurriculumLookupTool(): Tool {
  return defineTool({
    name: 'curriculum_lookup',
    description:
      'Look up curriculum standards, learning objectives, prerequisites, and related standards. Use this to align instruction with educational standards.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'The lookup action to perform',
          enum: ['search', 'get', 'prerequisites', 'related', 'objectives'],
        },
        standardId: {
          type: 'string',
          description: 'The standard ID for get/prerequisites/related/objectives actions',
        },
        query: {
          type: 'string',
          description: 'Search query for the search action',
        },
        subject: {
          type: 'string',
          description: 'Filter by subject',
        },
        gradeLevel: {
          type: 'string',
          description: 'Filter by grade level',
        },
        domain: {
          type: 'string',
          description: 'Filter by domain (e.g., "Numbers and Operations")',
        },
      },
      required: ['action'],
    },
    execute: curriculumLookupExecute,
    validate: validateCurriculumParams,
    metadata: {
      category: 'curriculum',
      version: '1.0.0',
      tags: ['curriculum', 'standards', 'education', 'learning-objectives'],
      examples: [
        {
          description: 'Search for math standards',
          input: { action: 'search', query: 'fractions', subject: 'math' },
        },
        {
          description: 'Get a specific standard',
          input: { action: 'get', standardId: 'CCSS.MATH.4.NF.1' },
        },
        {
          description: 'Get prerequisites for a standard',
          input: { action: 'prerequisites', standardId: 'CCSS.MATH.5.NF.1' },
        },
      ],
    },
  });
}

/**
 * Validate curriculum lookup parameters
 */
function validateCurriculumParams(params: unknown): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  const p = params as CurriculumLookupParams;

  if (!p.action) {
    errors.push('Action is required');
    return { valid: false, errors };
  }

  if (p.action === 'search' && !p.query && !p.subject && !p.gradeLevel && !p.domain) {
    errors.push('At least one filter (query, subject, gradeLevel, or domain) is required for search');
  }

  if (['get', 'prerequisites', 'related', 'objectives'].includes(p.action) && !p.standardId) {
    errors.push(`standardId is required for ${p.action} action`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Curriculum lookup execution function
 */
async function curriculumLookupExecute(
  params: unknown,
  _context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const p = params as CurriculumLookupParams;

    switch (p.action) {
      case 'search':
        return await searchStandards(p, startTime);

      case 'get':
        return await getStandard(p.standardId!, startTime);

      case 'prerequisites':
        return await getPrerequisites(p.standardId!, startTime);

      case 'related':
        return await getRelatedStandards(p.standardId!, startTime);

      case 'objectives':
        return await getLearningObjectives(p.standardId!, startTime);

      default:
        return toolError(`Unknown action: ${p.action}`, Date.now() - startTime);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return toolError(err.message, Date.now() - startTime);
  }
}

/**
 * Search for curriculum standards
 */
async function searchStandards(
  params: CurriculumLookupParams,
  startTime: number
): Promise<ToolResult> {
  let results = [...curriculumData];

  // Filter by subject
  if (params.subject) {
    results = results.filter(
      s => s.subject.toLowerCase() === params.subject!.toLowerCase()
    );
  }

  // Filter by grade level
  if (params.gradeLevel) {
    results = results.filter(s => s.gradeLevel === params.gradeLevel);
  }

  // Filter by domain
  if (params.domain) {
    results = results.filter(
      s => s.domain?.toLowerCase().includes(params.domain!.toLowerCase())
    );
  }

  // Filter by query
  if (params.query) {
    const queryLower = params.query.toLowerCase();
    results = results.filter(s => {
      return (
        s.title.toLowerCase().includes(queryLower) ||
        s.description.toLowerCase().includes(queryLower) ||
        s.keywords.some(k => k.toLowerCase().includes(queryLower))
      );
    });
  }

  return toolSuccess(
    {
      action: 'search',
      totalResults: results.length,
      standards: results.map(s => ({
        id: s.id,
        code: s.code,
        title: s.title,
        subject: s.subject,
        gradeLevel: s.gradeLevel,
        domain: s.domain,
      })),
    },
    Date.now() - startTime
  );
}

/**
 * Get a specific standard by ID
 */
async function getStandard(
  standardId: string,
  startTime: number
): Promise<ToolResult> {
  const standard = curriculumData.find(s => s.id === standardId || s.code === standardId);

  if (!standard) {
    return toolError(`Standard not found: ${standardId}`, Date.now() - startTime);
  }

  return toolSuccess(
    {
      action: 'get',
      standard,
    },
    Date.now() - startTime
  );
}

/**
 * Get prerequisites for a standard
 */
async function getPrerequisites(
  standardId: string,
  startTime: number
): Promise<ToolResult> {
  const standard = curriculumData.find(s => s.id === standardId || s.code === standardId);

  if (!standard) {
    return toolError(`Standard not found: ${standardId}`, Date.now() - startTime);
  }

  const prerequisites: CurriculumStandard[] = [];
  if (standard.prerequisites) {
    for (const prereqId of standard.prerequisites) {
      const prereq = curriculumData.find(s => s.id === prereqId || s.code === prereqId);
      if (prereq) {
        prerequisites.push(prereq);
      }
    }
  }

  return toolSuccess(
    {
      action: 'prerequisites',
      standardId,
      prerequisites: prerequisites.map(s => ({
        id: s.id,
        code: s.code,
        title: s.title,
        description: s.description,
      })),
      learningPath: buildLearningPath(standard, curriculumData),
    },
    Date.now() - startTime
  );
}

/**
 * Get related standards
 */
async function getRelatedStandards(
  standardId: string,
  startTime: number
): Promise<ToolResult> {
  const standard = curriculumData.find(s => s.id === standardId || s.code === standardId);

  if (!standard) {
    return toolError(`Standard not found: ${standardId}`, Date.now() - startTime);
  }

  const related: CurriculumStandard[] = [];

  // Get explicitly related standards
  if (standard.relatedStandards) {
    for (const relatedId of standard.relatedStandards) {
      const rel = curriculumData.find(s => s.id === relatedId || s.code === relatedId);
      if (rel) {
        related.push(rel);
      }
    }
  }

  // Find standards in the same domain
  const sameDomain = curriculumData.filter(
    s =>
      s.id !== standard.id &&
      s.domain === standard.domain &&
      s.gradeLevel === standard.gradeLevel &&
      !related.some(r => r.id === s.id)
  );

  return toolSuccess(
    {
      action: 'related',
      standardId,
      relatedStandards: related.map(s => ({
        id: s.id,
        code: s.code,
        title: s.title,
        relationship: 'explicit',
      })),
      sameDomainStandards: sameDomain.slice(0, 5).map(s => ({
        id: s.id,
        code: s.code,
        title: s.title,
        relationship: 'same-domain',
      })),
    },
    Date.now() - startTime
  );
}

/**
 * Get learning objectives for a standard
 */
async function getLearningObjectives(
  standardId: string,
  startTime: number
): Promise<ToolResult> {
  const standard = curriculumData.find(s => s.id === standardId || s.code === standardId);

  if (!standard) {
    return toolError(`Standard not found: ${standardId}`, Date.now() - startTime);
  }

  return toolSuccess(
    {
      action: 'objectives',
      standardId,
      standard: {
        code: standard.code,
        title: standard.title,
      },
      learningObjectives: standard.learningObjectives,
      assessmentSuggestions: generateAssessmentSuggestions(standard.learningObjectives),
    },
    Date.now() - startTime
  );
}

/**
 * Build a learning path from prerequisites
 */
function buildLearningPath(
  standard: CurriculumStandard,
  allStandards: CurriculumStandard[]
): string[] {
  const path: string[] = [];
  const visited = new Set<string>();

  function traverse(s: CurriculumStandard): void {
    if (visited.has(s.id)) return;
    visited.add(s.id);

    if (s.prerequisites) {
      for (const prereqId of s.prerequisites) {
        const prereq = allStandards.find(x => x.id === prereqId || x.code === prereqId);
        if (prereq) {
          traverse(prereq);
        }
      }
    }

    path.push(s.code);
  }

  traverse(standard);
  return path;
}

/**
 * Generate assessment suggestions based on learning objectives
 */
function generateAssessmentSuggestions(objectives: string[]): string[] {
  const suggestions: string[] = [];

  for (const objective of objectives) {
    const lower = objective.toLowerCase();

    if (lower.includes('identify') || lower.includes('recognize')) {
      suggestions.push(`Multiple choice questions to assess identification of ${extractTopic(objective)}`);
    }

    if (lower.includes('solve') || lower.includes('calculate')) {
      suggestions.push(`Problem-solving exercises with step-by-step solutions for ${extractTopic(objective)}`);
    }

    if (lower.includes('explain') || lower.includes('describe')) {
      suggestions.push(`Short answer questions requiring explanation of ${extractTopic(objective)}`);
    }

    if (lower.includes('compare') || lower.includes('contrast')) {
      suggestions.push(`Comparison activities with Venn diagrams or tables for ${extractTopic(objective)}`);
    }

    if (lower.includes('apply') || lower.includes('use')) {
      suggestions.push(`Real-world application problems for ${extractTopic(objective)}`);
    }
  }

  return suggestions.length > 0 ? suggestions : ['No specific assessment suggestions generated'];
}

/**
 * Extract topic from learning objective
 */
function extractTopic(objective: string): string {
  // Simple extraction - take words after common verbs
  const verbs = ['identify', 'recognize', 'solve', 'calculate', 'explain', 'describe', 'compare', 'contrast', 'apply', 'use'];

  const lower = objective.toLowerCase();
  for (const verb of verbs) {
    const index = lower.indexOf(verb);
    if (index !== -1) {
      const rest = objective.slice(index + verb.length).trim();
      // Take first 50 characters
      return rest.slice(0, 50) + (rest.length > 50 ? '...' : '');
    }
  }

  return objective.slice(0, 50);
}

/**
 * Default curriculum lookup tool instance
 */
export const curriculumLookupTool = createCurriculumLookupTool();
