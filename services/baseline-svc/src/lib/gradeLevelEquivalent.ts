/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/**
 * Grade Level Equivalent Calculator
 *
 * Maps assessment scores/adaptive ability to grade-level equivalents.
 * Uses psychometric norms to determine where a learner is performing
 * relative to grade-level expectations.
 * 
 * Example output: "Your 7th grader is performing at a 4th grade level in Math"
 */

import type { BaselineDomain, GradeBand } from '../types/baseline.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface GradeLevelEquivalent {
  /** Numeric grade level (0 = Kindergarten, 1 = 1st grade, etc.) */
  gradeLevel: number;
  /** Display string (e.g., "4th Grade", "Kindergarten") */
  gradeDisplay: string;
  /** Month within grade (1-10 for Sept-June) */
  gradeMonth?: number;
  /** Combined display (e.g., "4.2" or "Grade 4, Month 2") */
  gradeEquivalentDisplay: string;
  /** Comparison to actual grade ("below", "at", "above") */
  comparedToActualGrade: 'below' | 'at' | 'above';
  /** How many grade levels behind/ahead */
  gradeDifference: number;
  /** Descriptive message for parents */
  parentFriendlyMessage: string;
}

export interface DomainGradeLevelResult {
  domain: BaselineDomain;
  domainDisplayName: string;
  score: number;
  adaptiveAbility: number;
  gradeEquivalent: GradeLevelEquivalent;
  strengths: string[];
  growthAreas: string[];
}

export interface FullGradeLevelReport {
  learnerId: string;
  learnerName?: string;
  actualGrade: number;
  gradeBand: GradeBand;
  assessmentDate: string;
  overallGradeEquivalent: GradeLevelEquivalent;
  domainResults: DomainGradeLevelResult[];
  summary: string;
  recommendations: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Grade level ability thresholds
 * Based on psychometric norms: adaptive ability (0-1 scale from IRT) 
 * mapped to grade level expectations
 * 
 * These thresholds represent the typical ability level for a student
 * at the END of each grade level (mastery point)
 */
const GRADE_ABILITY_THRESHOLDS: Record<number, number> = {
  0: 0.15,   // Kindergarten mastery
  1: 0.22,   // 1st grade mastery
  2: 0.3,    // 2nd grade mastery
  3: 0.38,   // 3rd grade mastery
  4: 0.46,   // 4th grade mastery
  5: 0.54,   // 5th grade mastery
  6: 0.62,   // 6th grade mastery
  7: 0.7,    // 7th grade mastery
  8: 0.78,   // 8th grade mastery
  9: 0.84,   // 9th grade mastery
  10: 0.89,  // 10th grade mastery
  11: 0.94,  // 11th grade mastery
  12: 1,     // 12th grade mastery
};

/** Domain-specific adjustments for harder/easier subjects */
const DOMAIN_DIFFICULTY_ADJUSTMENTS: Record<string, number> = {
  MATH: 0,         // Baseline
  ELA: 0.02,       // Slightly easier
  SCIENCE: -0.02,  // Slightly harder
  SEL: 0.05,       // Easier (life skills)
  SPEECH: 0.03,
  LIFE_SKILLS: 0.05,
  SPELLING: 0,
  CREATIVE_WRITING: 0,
};

/** Grade display names */
const GRADE_DISPLAY_NAMES: Record<number, string> = {
  0: 'Kindergarten',
  1: '1st Grade',
  2: '2nd Grade',
  3: '3rd Grade',
  4: '4th Grade',
  5: '5th Grade',
  6: '6th Grade',
  7: '7th Grade',
  8: '8th Grade',
  9: '9th Grade',
  10: '10th Grade',
  11: '11th Grade',
  12: '12th Grade',
};

/** Domain display names */
const DOMAIN_DISPLAY_NAMES: Record<string, string> = {
  MATH: 'Mathematics',
  ELA: 'English Language Arts',
  SCIENCE: 'Science',
  SEL: 'Social-Emotional Learning',
  SPEECH: 'Speech & Language',
  LIFE_SKILLS: 'Life Skills',
  SPELLING: 'Spelling',
  CREATIVE_WRITING: 'Creative Writing',
};

// ══════════════════════════════════════════════════════════════════════════════
// CALCULATOR CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class GradeLevelEquivalentCalculator {
  /**
   * Convert adaptive ability score to grade level equivalent
   */
  calculateGradeEquivalent(
    adaptiveAbility: number,
    actualGrade: number,
    domain?: string
  ): GradeLevelEquivalent {
    // Apply domain-specific adjustment
    let adjustedAbility = adaptiveAbility;
    if (domain && DOMAIN_DIFFICULTY_ADJUSTMENTS[domain] !== undefined) {
      adjustedAbility += DOMAIN_DIFFICULTY_ADJUSTMENTS[domain];
    }
    adjustedAbility = Math.max(0, Math.min(1, adjustedAbility));

    // Find the grade level
    let gradeLevel = 0;
    let gradeMonth = 1;

    for (let grade = 0; grade <= 12; grade++) {
      const threshold = GRADE_ABILITY_THRESHOLDS[grade];
      const prevThreshold = grade > 0 ? GRADE_ABILITY_THRESHOLDS[grade - 1] : 0;

      if (adjustedAbility <= threshold) {
        gradeLevel = grade;
        // Calculate month within grade (1-10 for Sept-June school year)
        const rangeSize = threshold - prevThreshold;
        const positionInRange = adjustedAbility - prevThreshold;
        gradeMonth = Math.round((positionInRange / rangeSize) * 10) || 1;
        gradeMonth = Math.max(1, Math.min(10, gradeMonth));
        break;
      }
    }

    // If above 12th grade threshold
    if (adjustedAbility > GRADE_ABILITY_THRESHOLDS[12]) {
      gradeLevel = 12;
      gradeMonth = 10;
    }

    // Calculate comparison to actual grade
    const gradeDifference = gradeLevel - actualGrade;
    let comparedToActualGrade: 'below' | 'at' | 'above';
    if (gradeDifference < -0.5) {
      comparedToActualGrade = 'below';
    } else if (gradeDifference > 0.5) {
      comparedToActualGrade = 'above';
    } else {
      comparedToActualGrade = 'at';
    }

    // Create display strings
    const gradeDisplay = GRADE_DISPLAY_NAMES[gradeLevel] || `Grade ${gradeLevel}`;
    const gradeEquivalentDisplay = gradeLevel === 0 
      ? `K.${gradeMonth}` 
      : `${gradeLevel}.${gradeMonth}`;

    // Generate parent-friendly message
    const parentFriendlyMessage = this.generateParentMessage(
      gradeLevel,
      actualGrade,
      gradeDifference,
      domain
    );

    return {
      gradeLevel,
      gradeDisplay,
      gradeMonth,
      gradeEquivalentDisplay,
      comparedToActualGrade,
      gradeDifference,
      parentFriendlyMessage,
    };
  }

  /**
   * Generate a parent-friendly message explaining the grade equivalent
   */
  private generateParentMessage(
    gradeLevel: number,
    actualGrade: number,
    gradeDifference: number,
    domain?: string
  ): string {
    const domainName = domain 
      ? DOMAIN_DISPLAY_NAMES[domain] || domain 
      : 'this subject';
    const gradeDisplay = GRADE_DISPLAY_NAMES[gradeLevel] || `Grade ${gradeLevel}`;
    const actualGradeDisplay = GRADE_DISPLAY_NAMES[actualGrade] || `Grade ${actualGrade}`;

    if (Math.abs(gradeDifference) <= 0.5) {
      return `Your child is performing at grade level in ${domainName}. Great job!`;
    } else if (gradeDifference > 0) {
      const yearsAhead = Math.round(gradeDifference);
      return `Your child is performing ${yearsAhead} grade level${yearsAhead > 1 ? 's' : ''} ahead in ${domainName}! They're showing ${gradeDisplay} skills while in ${actualGradeDisplay}.`;
    } else {
      return `Your child is currently working at ${gradeDisplay} level in ${domainName}. While in ${actualGradeDisplay}, we'll focus on building foundational skills to help them catch up.`;
    }
  }

  /**
   * Calculate grade equivalents for all domains
   */
  calculateFullReport(
    learnerId: string,
    actualGrade: number,
    gradeBand: GradeBand,
    domainScores: {
      domain: string;
      correct: number;
      total: number;
      adaptiveAbility: number;
    }[],
    learnerName?: string
  ): FullGradeLevelReport {
    const domainResults: DomainGradeLevelResult[] = domainScores.map(ds => {
      const gradeEquivalent = this.calculateGradeEquivalent(
        ds.adaptiveAbility,
        actualGrade,
        ds.domain
      );

      return {
        domain: ds.domain as BaselineDomain,
        domainDisplayName: DOMAIN_DISPLAY_NAMES[ds.domain] || ds.domain,
        score: ds.correct / ds.total,
        adaptiveAbility: ds.adaptiveAbility,
        gradeEquivalent,
        strengths: this.identifyStrengths(ds.adaptiveAbility, ds.domain),
        growthAreas: this.identifyGrowthAreas(ds.adaptiveAbility, ds.domain),
      };
    });

    // Calculate overall grade equivalent (weighted average)
    const avgAbility = domainScores.length > 0
      ? domainScores.reduce((sum, ds) => sum + ds.adaptiveAbility, 0) / domainScores.length
      : 0.5;
    const overallGradeEquivalent = this.calculateGradeEquivalent(avgAbility, actualGrade);

    // Generate summary
    const summary = this.generateSummary(domainResults, actualGrade, overallGradeEquivalent);

    // Generate recommendations
    const recommendations = this.generateRecommendations(domainResults, actualGrade);

    return {
      learnerId,
      learnerName,
      actualGrade,
      gradeBand,
      assessmentDate: new Date().toISOString(),
      overallGradeEquivalent,
      domainResults,
      summary,
      recommendations,
    };
  }

  /**
   * Identify strengths based on performance
   */
  private identifyStrengths(adaptiveAbility: number, domain: string): string[] {
    const strengths: string[] = [];

    if (adaptiveAbility >= 0.8) {
      strengths.push(
        'Exceptional understanding of core concepts',
        'Ready for advanced content'
      );
    } else if (adaptiveAbility >= 0.65) {
      strengths.push(
        'Strong foundational skills',
        'Good problem-solving ability'
      );
    } else if (adaptiveAbility >= 0.5) {
      strengths.push('Developing understanding');
    }

    // Domain-specific strengths
    if (domain === 'MATH' && adaptiveAbility >= 0.6) {
      strengths.push('Shows logical thinking');
    }
    if (domain === 'ELA' && adaptiveAbility >= 0.6) {
      strengths.push('Good reading comprehension');
    }
    if (domain === 'SEL' && adaptiveAbility >= 0.6) {
      strengths.push('Strong emotional awareness');
    }

    return strengths;
  }

  /**
   * Identify growth areas based on performance
   */
  private identifyGrowthAreas(adaptiveAbility: number, domain: string): string[] {
    const growthAreas: string[] = [];

    if (adaptiveAbility < 0.4) {
      growthAreas.push(
        'Building foundational skills',
        'Practice with grade-level concepts'
      );
    } else if (adaptiveAbility < 0.6) {
      growthAreas.push('Strengthening core understanding');
    }

    // Domain-specific growth areas
    if (domain === 'MATH' && adaptiveAbility < 0.5) {
      growthAreas.push('Number sense and operations');
    }
    if (domain === 'ELA' && adaptiveAbility < 0.5) {
      growthAreas.push('Vocabulary and comprehension strategies');
    }
    if (domain === 'SPELLING' && adaptiveAbility < 0.5) {
      growthAreas.push('Phonics patterns and sight words');
    }

    return growthAreas;
  }

  /**
   * Generate an overall summary for parents
   */
  private generateSummary(
    domainResults: DomainGradeLevelResult[],
    actualGrade: number,
    overall: GradeLevelEquivalent
  ): string {
    const actualGradeDisplay = GRADE_DISPLAY_NAMES[actualGrade] || `Grade ${actualGrade}`;
    
    if (domainResults.length === 0) {
      return `Your child's assessment is complete. We'll create a personalized learning path.`;
    }

    // Find strongest and weakest domains
    const sorted = [...domainResults].sort(
      (a, b) => b.adaptiveAbility - a.adaptiveAbility
    );
    const strongest = sorted[0];
    const weakest = sorted.at(-1);

    const strongestName = strongest.domainDisplayName;
    const weakestName = weakest?.domainDisplayName ?? strongest.domainDisplayName;

    if (overall.comparedToActualGrade === 'at') {
      return `Overall, your child is performing at ${actualGradeDisplay} level. ` +
        `They're strongest in ${strongestName} and ` +
        `may benefit from extra support in ${weakestName}.`;
    } else if (overall.comparedToActualGrade === 'above') {
      return `Great news! Your child is performing above ${actualGradeDisplay} level overall. ` +
        `They're showing especially strong skills in ${strongestName}. ` +
        `We'll provide enrichment activities to keep them challenged.`;
    } else {
      return `Your child is currently working toward ${actualGradeDisplay} level skills. ` +
        `We'll create a personalized learning path focusing on building foundations, ` +
        `especially in ${weakestName}, while celebrating their strengths in ` +
        `${strongestName}.`;
    }
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(
    domainResults: DomainGradeLevelResult[],
    actualGrade: number
  ): string[] {
    const recommendations: string[] = [];

    // Find domains below grade level
    const belowGrade = domainResults.filter(
      dr => dr.gradeEquivalent.comparedToActualGrade === 'below'
    );
    const atGrade = domainResults.filter(
      dr => dr.gradeEquivalent.comparedToActualGrade === 'at'
    );
    const aboveGrade = domainResults.filter(
      dr => dr.gradeEquivalent.comparedToActualGrade === 'above'
    );

    // Recommendations for below-grade domains
    for (const domain of belowGrade.slice(0, 2)) {
      recommendations.push(
        `Focus on ${domain.domainDisplayName}: Start with ${domain.gradeEquivalent.gradeDisplay} concepts ` +
        `and progress systematically to ${GRADE_DISPLAY_NAMES[actualGrade]} level.`
      );
    }

    // Recommendations for at-grade domains
    if (atGrade.length > 0) {
      recommendations.push(
        `Continue practicing ${atGrade.map(d => d.domainDisplayName).join(', ')} ` +
        `to maintain grade-level proficiency.`
      );
    }

    // Recommendations for above-grade domains
    if (aboveGrade.length > 0) {
      recommendations.push(
        `Provide enrichment in ${aboveGrade.map(d => d.domainDisplayName).join(', ')} ` +
        `with more challenging content.`
      );
    }

    // General recommendation
    recommendations.push(
      'Regular 15-20 minute practice sessions are more effective than longer, less frequent sessions.'
    );

    return recommendations;
  }
}

// Singleton instance - lazily initialized
let calculatorInstance: GradeLevelEquivalentCalculator | null = null;

export function getGradeLevelCalculator(): GradeLevelEquivalentCalculator {
  calculatorInstance ??= new GradeLevelEquivalentCalculator();
  return calculatorInstance;
}

/**
 * Quick helper to convert adaptive ability to grade equivalent string
 */
export function abilityToGradeEquivalent(
  adaptiveAbility: number,
  actualGrade: number,
  domain?: string
): string {
  const calc = getGradeLevelCalculator();
  const result = calc.calculateGradeEquivalent(adaptiveAbility, actualGrade, domain);
  return result.gradeEquivalentDisplay;
}

/**
 * Get grade band from numeric grade
 */
export function gradeToGradeBand(grade: number): GradeBand {
  if (grade <= 5) return 'K5';
  if (grade <= 8) return 'G6_8';
  return 'G9_12';
}

/**
 * Get numeric grade from grade band (returns middle of range)
 */
export function gradeBandToGrade(gradeBand: GradeBand): number {
  switch (gradeBand) {
    case 'K5': return 3;
    case 'G6_8': return 7;
    case 'G9_12': return 10;
    default: return 5;
  }
}
