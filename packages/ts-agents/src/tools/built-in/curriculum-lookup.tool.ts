/**
 * Curriculum lookup tool for educational content
 */

import { defineTool, type ExtendedTool } from '../tool-types.js';

export interface CurriculumStandard {
  id: string;
  code: string;
  gradeLevel: string;
  subject: string;
  domain?: string;
  cluster?: string;
  description: string;
  prerequisites?: string[];
  relatedStandards?: string[];
}

export interface LearningObjective {
  id: string;
  standardId: string;
  description: string;
  bloomsLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  keywords: string[];
}

export interface CurriculumProvider {
  lookupStandard(query: string): Promise<CurriculumStandard[]>;
  getStandardById(id: string): Promise<CurriculumStandard | null>;
  getPrerequisites(standardId: string): Promise<CurriculumStandard[]>;
  getLearningObjectives(standardId: string): Promise<LearningObjective[]>;
  searchByGradeAndSubject(
    gradeLevel: string,
    subject: string,
    domain?: string
  ): Promise<CurriculumStandard[]>;
}

/**
 * Create a curriculum lookup tool with a custom provider
 */
export function createCurriculumLookupTool(provider: CurriculumProvider): ExtendedTool {
  return defineTool<{
    action:
      | 'search'
      | 'getById'
      | 'prerequisites'
      | 'objectives'
      | 'byGradeSubject';
    query?: string;
    standardId?: string;
    gradeLevel?: string;
    subject?: string;
    domain?: string;
  }>({
    name: 'curriculum_lookup',
    description:
      'Look up curriculum standards, learning objectives, and prerequisites. ' +
      'Useful for aligning lessons with educational standards and identifying prerequisite knowledge.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['search', 'getById', 'prerequisites', 'objectives', 'byGradeSubject'],
          description:
            'The lookup action: search by text, get by ID, find prerequisites, get objectives, or search by grade/subject',
        },
        query: {
          type: 'string',
          description: 'Search query for finding standards (required for action="search")',
        },
        standardId: {
          type: 'string',
          description: 'Standard ID (required for getById, prerequisites, objectives)',
        },
        gradeLevel: {
          type: 'string',
          description: 'Grade level (e.g., "K", "1", "5", "9-12") for byGradeSubject action',
        },
        subject: {
          type: 'string',
          description: 'Subject area (e.g., "Math", "ELA", "Science") for byGradeSubject action',
        },
        domain: {
          type: 'string',
          description: 'Optional domain within subject (e.g., "Geometry", "Algebra")',
        },
      },
      required: ['action'],
    },
    execute: async (params) => {
      const { action, query, standardId, gradeLevel, subject, domain } = params;

      switch (action) {
        case 'search': {
          if (!query) {
            throw new Error('Search action requires a query parameter');
          }
          const results = await provider.lookupStandard(query);
          return {
            action,
            query,
            resultCount: results.length,
            standards: results,
          };
        }

        case 'getById': {
          if (!standardId) {
            throw new Error('getById action requires a standardId parameter');
          }
          const standard = await provider.getStandardById(standardId);
          if (!standard) {
            return {
              action,
              standardId,
              found: false,
              message: `Standard '${standardId}' not found`,
            };
          }
          return {
            action,
            standardId,
            found: true,
            standard,
          };
        }

        case 'prerequisites': {
          if (!standardId) {
            throw new Error('prerequisites action requires a standardId parameter');
          }
          const prerequisites = await provider.getPrerequisites(standardId);
          return {
            action,
            standardId,
            prerequisiteCount: prerequisites.length,
            prerequisites,
          };
        }

        case 'objectives': {
          if (!standardId) {
            throw new Error('objectives action requires a standardId parameter');
          }
          const objectives = await provider.getLearningObjectives(standardId);
          return {
            action,
            standardId,
            objectiveCount: objectives.length,
            objectives,
          };
        }

        case 'byGradeSubject': {
          if (!gradeLevel || !subject) {
            throw new Error('byGradeSubject action requires gradeLevel and subject parameters');
          }
          const results = await provider.searchByGradeAndSubject(gradeLevel, subject, domain);
          return {
            action,
            gradeLevel,
            subject,
            domain,
            resultCount: results.length,
            standards: results,
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
    metadata: {
      category: 'education',
      tags: ['curriculum', 'standards', 'learning', 'education'],
    },
  });
}

/**
 * Mock curriculum provider for testing
 */
export class MockCurriculumProvider implements CurriculumProvider {
  private readonly standards: CurriculumStandard[] = [
    {
      id: 'CCSS.MATH.CONTENT.6.EE.A.2',
      code: '6.EE.A.2',
      gradeLevel: '6',
      subject: 'Math',
      domain: 'Expressions and Equations',
      cluster: 'Apply and extend previous understandings of arithmetic to algebraic expressions',
      description:
        'Write, read, and evaluate expressions in which letters stand for numbers.',
      prerequisites: ['5.OA.A.2', '5.NBT.B.5'],
      relatedStandards: ['6.EE.A.3', '6.EE.A.4'],
    },
    {
      id: 'CCSS.MATH.CONTENT.8.EE.C.7',
      code: '8.EE.C.7',
      gradeLevel: '8',
      subject: 'Math',
      domain: 'Expressions and Equations',
      cluster: 'Analyze and solve linear equations and pairs of simultaneous linear equations',
      description: 'Solve linear equations in one variable.',
      prerequisites: ['7.EE.B.4', '6.EE.B.7'],
      relatedStandards: ['8.EE.C.8'],
    },
    {
      id: 'CCSS.ELA-LITERACY.RL.5.2',
      code: 'RL.5.2',
      gradeLevel: '5',
      subject: 'ELA',
      domain: 'Reading Literature',
      description:
        'Determine a theme of a story, drama, or poem from details in the text, including how characters in a story or drama respond to challenges.',
      prerequisites: ['RL.4.2'],
      relatedStandards: ['RL.5.1', 'RL.5.3'],
    },
  ];

  private readonly objectives: LearningObjective[] = [
    {
      id: 'obj-1',
      standardId: 'CCSS.MATH.CONTENT.6.EE.A.2',
      description: 'Identify parts of an expression using mathematical terms',
      bloomsLevel: 'understand',
      keywords: ['expression', 'term', 'coefficient', 'sum'],
    },
    {
      id: 'obj-2',
      standardId: 'CCSS.MATH.CONTENT.6.EE.A.2',
      description: 'Write expressions that record operations with numbers and letters',
      bloomsLevel: 'apply',
      keywords: ['write', 'expression', 'variable'],
    },
    {
      id: 'obj-3',
      standardId: 'CCSS.MATH.CONTENT.8.EE.C.7',
      description: 'Solve linear equations with one variable',
      bloomsLevel: 'apply',
      keywords: ['solve', 'linear', 'equation', 'variable'],
    },
  ];

  async lookupStandard(query: string): Promise<CurriculumStandard[]> {
    const queryLower = query.toLowerCase();
    return this.standards.filter(
      s =>
        s.description.toLowerCase().includes(queryLower) ||
        s.code.toLowerCase().includes(queryLower) ||
        s.domain?.toLowerCase().includes(queryLower)
    );
  }

  async getStandardById(id: string): Promise<CurriculumStandard | null> {
    return this.standards.find(s => s.id === id) ?? null;
  }

  async getPrerequisites(standardId: string): Promise<CurriculumStandard[]> {
    const standard = this.standards.find(s => s.id === standardId);
    if (!standard?.prerequisites) {
      return [];
    }

    return this.standards.filter(s =>
      standard.prerequisites?.some(p => s.code.includes(p))
    );
  }

  async getLearningObjectives(standardId: string): Promise<LearningObjective[]> {
    return this.objectives.filter(o => o.standardId === standardId);
  }

  async searchByGradeAndSubject(
    gradeLevel: string,
    subject: string,
    domain?: string
  ): Promise<CurriculumStandard[]> {
    return this.standards.filter(
      s =>
        s.gradeLevel === gradeLevel &&
        s.subject.toLowerCase() === subject.toLowerCase() &&
        (!domain || s.domain?.toLowerCase().includes(domain.toLowerCase()))
    );
  }
}

/**
 * Create a default curriculum lookup tool with mock provider
 */
export const curriculumLookupTool = createCurriculumLookupTool(
  new MockCurriculumProvider()
);
