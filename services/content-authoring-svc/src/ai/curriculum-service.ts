/**
 * Curriculum Service
 *
 * Service for managing curriculum standards and their metadata.
 * In production, this would connect to a standards database.
 */

import type { Subject, StandardSuggestion } from '../types/ai-authoring.js';
import type { StandardInfo } from './prompts/curriculum-alignment.prompt.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CurriculumStandard {
  id: string;
  code: string;
  description: string;
  subject: Subject;
  gradeLevel: number;
  strand?: string;
  cluster?: string;
  framework: string;
  keywords: string[];
}

export interface CurriculumAlignment {
  primaryStandards: AlignedStandard[];
  secondaryStandards: AlignedStandard[];
  misalignments: Misalignment[];
  coverageScore: number;
  depthOfKnowledge: 1 | 2 | 3 | 4;
  suggestions: AlignmentSuggestion[];
  validatedAt: Date;
}

export interface AlignedStandard {
  standardId: string;
  standardCode: string;
  standardText: string;
  alignmentStrength: 'strong' | 'moderate' | 'weak';
  evidence: string[];
  confidence: number;
}

export interface Misalignment {
  standardId: string;
  standardCode: string;
  standardText: string;
  reason: string;
  suggestion: string;
}

export interface AlignmentSuggestion {
  type: 'add_content' | 'modify_content' | 'add_assessment' | 'adjust_depth';
  description: string;
  standardId?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: number;
}

export interface CurriculumGap {
  standardId: string;
  standardCode: string;
  standardText: string;
  gapType: 'missing' | 'insufficient' | 'off_target';
  severity: 'critical' | 'moderate' | 'minor';
  suggestedAdditions: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK STANDARDS DATABASE
// ══════════════════════════════════════════════════════════════════════════════

const MOCK_STANDARDS: CurriculumStandard[] = [
  // Math Standards
  {
    id: 'ccss-math-5-nbt-1',
    code: 'CCSS.MATH.5.NBT.1',
    description: 'Recognize that in a multi-digit number, a digit in one place represents 10 times as much as it represents in the place to its right and 1/10 of what it represents in the place to its left.',
    subject: 'MATH',
    gradeLevel: 5,
    strand: 'Number and Operations in Base Ten',
    framework: 'CCSS',
    keywords: ['place value', 'digit', 'multiply', 'divide', 'decimal'],
  },
  {
    id: 'ccss-math-5-nbt-2',
    code: 'CCSS.MATH.5.NBT.2',
    description: 'Explain patterns in the number of zeros of the product when multiplying a number by powers of 10.',
    subject: 'MATH',
    gradeLevel: 5,
    strand: 'Number and Operations in Base Ten',
    framework: 'CCSS',
    keywords: ['powers of 10', 'zeros', 'multiply', 'patterns'],
  },
  // ELA Standards
  {
    id: 'ccss-ela-ri-5-1',
    code: 'CCSS.ELA.RI.5.1',
    description: 'Quote accurately from a text when explaining what the text says explicitly and when drawing inferences from the text.',
    subject: 'ELA',
    gradeLevel: 5,
    strand: 'Reading: Informational Text',
    framework: 'CCSS',
    keywords: ['quote', 'inference', 'text evidence', 'explain'],
  },
  {
    id: 'ccss-ela-ri-5-2',
    code: 'CCSS.ELA.RI.5.2',
    description: 'Determine two or more main ideas of a text and explain how they are supported by key details; summarize the text.',
    subject: 'ELA',
    gradeLevel: 5,
    strand: 'Reading: Informational Text',
    framework: 'CCSS',
    keywords: ['main idea', 'details', 'summarize'],
  },
  // Science Standards (NGSS)
  {
    id: 'ngss-5-ps1-1',
    code: '5-PS1-1',
    description: 'Develop a model to describe that matter is made of particles too small to be seen.',
    subject: 'SCIENCE',
    gradeLevel: 5,
    strand: 'Matter and Its Interactions',
    framework: 'NGSS',
    keywords: ['matter', 'particles', 'atoms', 'model'],
  },
  {
    id: 'ngss-5-ls1-1',
    code: '5-LS1-1',
    description: 'Support an argument that plants get the materials they need for growth chiefly from air and water.',
    subject: 'SCIENCE',
    gradeLevel: 5,
    strand: 'From Molecules to Organisms: Structures and Processes',
    framework: 'NGSS',
    keywords: ['plants', 'growth', 'photosynthesis', 'air', 'water'],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// CURRICULUM SERVICE CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class CurriculumService {
  private standards: Map<string, CurriculumStandard>;

  constructor() {
    this.standards = new Map();
    // Load mock standards
    for (const standard of MOCK_STANDARDS) {
      this.standards.set(standard.id, standard);
      this.standards.set(standard.code, standard);
    }
  }

  /**
   * Get a standard by ID or code
   */
  getStandard(idOrCode: string): CurriculumStandard | undefined {
    return this.standards.get(idOrCode);
  }

  /**
   * Get multiple standards by IDs or codes
   */
  getStandards(idsOrCodes: string[]): CurriculumStandard[] {
    return idsOrCodes
      .map((id) => this.standards.get(id))
      .filter((s): s is CurriculumStandard => s !== undefined);
  }

  /**
   * Get standards by subject and grade level
   */
  getStandardsBySubjectAndGrade(subject: Subject, gradeLevel: number): CurriculumStandard[] {
    return Array.from(this.standards.values()).filter(
      (s) => s.subject === subject && s.gradeLevel === gradeLevel
    );
  }

  /**
   * Search standards by keywords
   */
  searchStandards(query: string, subject?: Subject, gradeLevel?: number): CurriculumStandard[] {
    const queryLower = query.toLowerCase();
    return Array.from(this.standards.values()).filter((s) => {
      if (subject && s.subject !== subject) return false;
      if (gradeLevel && s.gradeLevel !== gradeLevel) return false;

      return (
        s.description.toLowerCase().includes(queryLower) ||
        s.keywords.some((k) => k.toLowerCase().includes(queryLower)) ||
        s.code.toLowerCase().includes(queryLower)
      );
    });
  }

  /**
   * Convert to StandardInfo format for prompts
   */
  toStandardInfo(standard: CurriculumStandard): StandardInfo {
    return {
      id: standard.id,
      code: standard.code,
      description: standard.description,
      gradeLevel: standard.gradeLevel,
      subject: standard.subject,
      strand: standard.strand,
    };
  }

  /**
   * Placeholder for curriculum alignment validation
   * In production, this would be handled by the CurriculumValidator class
   */
  async validateAlignment(
    content: string,
    targetStandards: string[],
    subject: Subject,
    gradeLevel: number
  ): Promise<CurriculumAlignment> {
    // This is a placeholder - actual implementation is in CurriculumValidator
    const standards = this.getStandards(targetStandards);

    return {
      primaryStandards: standards.map((s) => ({
        standardId: s.id,
        standardCode: s.code,
        standardText: s.description,
        alignmentStrength: 'moderate' as const,
        evidence: [],
        confidence: 0.5,
      })),
      secondaryStandards: [],
      misalignments: [],
      coverageScore: 50,
      depthOfKnowledge: 2,
      suggestions: [],
      validatedAt: new Date(),
    };
  }

  /**
   * Add a new standard (for testing/custom standards)
   */
  addStandard(standard: CurriculumStandard): void {
    this.standards.set(standard.id, standard);
    this.standards.set(standard.code, standard);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

let serviceInstance: CurriculumService | null = null;

export function getCurriculumService(): CurriculumService {
  if (!serviceInstance) {
    serviceInstance = new CurriculumService();
  }
  return serviceInstance;
}
