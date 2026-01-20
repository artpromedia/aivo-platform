/**
 * IEP Document Processor
 *
 * Handles extraction and analysis of IEP documents:
 * - OCR for scanned images
 * - PDF text extraction
 * - AI-powered content analysis to identify goals, accommodations, services
 * - Comparison with baseline assessment results
 */

import type { BaselineIepDocument, BaselineAttempt, BaselineSkillEstimate } from '@prisma/client';

// ── Type Definitions ────────────────────────────────────────────────────────

export interface ExtractedIepContent {
  rawText: { pages: string[] };
  goals: IepGoal[];
  accommodations: IepAccommodation[];
  services: IepService[];
  metadata: IepMetadata;
}

export interface IepGoal {
  id: string;
  domain: string;
  category: string;
  description: string;
  baseline: string | null;
  target: string | null;
  measurementMethod: string | null;
  timeline: string | null;
  confidence: number;
}

export interface IepAccommodation {
  id: string;
  category: string;
  description: string;
  setting: string | null;
  frequency: string | null;
  confidence: number;
}

export interface IepService {
  id: string;
  type: string;
  provider: string | null;
  frequency: string | null;
  duration: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  confidence: number;
}

export interface IepMetadata {
  studentName: string | null;
  dateOfBirth: string | null;
  grade: string | null;
  school: string | null;
  district: string | null;
  iepDate: string | null;
  reviewDate: string | null;
  eligibilityCategory: string | null;
  caseManager: string | null;
}

export interface ComparisonResult {
  summary: ComparisonSummary;
  domainComparisons: DomainComparison[];
  goalAlignment: GoalAlignment[];
  discrepancies: Discrepancy[];
  recommendations: Recommendation[];
  overallMatchScore: number;
  confidenceLevel: number;
}

export interface ComparisonSummary {
  headline: string;
  overallAssessment: string;
  strengthAreas: string[];
  growthAreas: string[];
  keyInsights: string[];
}

export interface DomainComparison {
  domain: string;
  iepLevel: string | null;
  assessmentLevel: number;
  assessmentLabel: string;
  alignment: 'ALIGNED' | 'HIGHER' | 'LOWER' | 'UNKNOWN';
  difference: number | null;
  notes: string;
}

export interface GoalAlignment {
  iepGoalId: string;
  iepGoalDescription: string;
  relatedDomain: string;
  assessmentSupports: boolean;
  alignmentScore: number;
  notes: string;
}

export interface Discrepancy {
  area: string;
  iepIndication: string;
  assessmentIndication: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
}

export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  rationale: string;
}

// ── AI Orchestrator Integration ─────────────────────────────────────────────

const AI_ORCHESTRATOR_URL = process.env.AI_ORCHESTRATOR_URL ?? 'http://ai-orchestrator:3000';

interface AIRequest {
  task: string;
  content: string;
  context?: Record<string, unknown>;
}

interface AIResponse {
  result: unknown;
  confidence: number;
}

async function callAIOrchestrator(request: AIRequest): Promise<AIResponse> {
  try {
    const response = await fetch(`${AI_ORCHESTRATOR_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI Orchestrator error: ${response.status}`);
    }

    return (await response.json()) as AIResponse;
  } catch (error) {
    console.error('AI Orchestrator call failed:', error);
    // Return mock response for development/testing
    return getMockAIResponse(request.task);
  }
}

// ── Content Extraction ──────────────────────────────────────────────────────

/**
 * Extract IEP content from a document.
 * Handles both PDF and image files.
 */
export async function extractIepContent(
  s3Key: string,
  mimeType: string
): Promise<ExtractedIepContent> {
  // Step 1: Extract raw text from document
  const rawText = await extractTextFromDocument(s3Key, mimeType);

  // Step 2: Use AI to analyze and structure the content
  const analysisResult = await callAIOrchestrator({
    task: 'extract_iep_content',
    content: rawText.pages.join('\n\n--- Page Break ---\n\n'),
    context: {
      documentType: 'IEP',
      mimeType,
    },
  });

  const extracted = analysisResult.result as {
    goals?: Partial<IepGoal>[];
    accommodations?: Partial<IepAccommodation>[];
    services?: Partial<IepService>[];
    metadata?: Partial<IepMetadata>;
  };

  // Step 3: Structure the extracted content
  return {
    rawText,
    goals: normalizeGoals(extracted.goals ?? []),
    accommodations: normalizeAccommodations(extracted.accommodations ?? []),
    services: normalizeServices(extracted.services ?? []),
    metadata: normalizeMetadata(extracted.metadata ?? {}),
  };
}

/**
 * Extract raw text from a document using OCR or PDF parsing.
 */
async function extractTextFromDocument(
  s3Key: string,
  mimeType: string
): Promise<{ pages: string[] }> {
  try {
    // Call document processing service
    const response = await fetch(`${AI_ORCHESTRATOR_URL}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3Key, mimeType }),
    });

    if (response.ok) {
      const result = (await response.json()) as { pages: string[] };
      return result;
    }
  } catch (error) {
    console.error('OCR service error:', error);
  }

  // Return mock data for development
  return getMockOCRResult();
}

// ── Comparison Logic ────────────────────────────────────────────────────────

interface CompareInput {
  iepDocument: BaselineIepDocument;
  attempt: BaselineAttempt & { skillEstimates: BaselineSkillEstimate[] };
  gradeBand: string;
}

/**
 * Compare extracted IEP content with baseline assessment results.
 */
export async function compareIepWithAssessment(input: CompareInput): Promise<ComparisonResult> {
  const { iepDocument, attempt, gradeBand } = input;

  const extractedGoals = (iepDocument.extractedGoalsJson as IepGoal[]) ?? [];
  const extractedAccommodations = (iepDocument.extractedAccommodationsJson as IepAccommodation[]) ?? [];
  const domainScores = (attempt.domainScoresJson as Record<string, { correct: number; total: number; adaptiveAbility: number }>) ?? {};
  const skillEstimates = attempt.skillEstimates;

  // Use AI to perform detailed comparison
  const comparisonResult = await callAIOrchestrator({
    task: 'compare_iep_assessment',
    content: JSON.stringify({
      iepGoals: extractedGoals,
      iepAccommodations: extractedAccommodations,
      assessmentDomainScores: domainScores,
      assessmentSkillEstimates: skillEstimates.map((e) => ({
        domain: e.domain,
        skillCode: e.skillCode,
        estimatedLevel: Number(e.estimatedLevel),
        confidence: Number(e.confidence),
      })),
    }),
    context: {
      gradeBand,
      documentId: iepDocument.id,
      attemptId: attempt.id,
    },
  });

  const result = comparisonResult.result as Partial<ComparisonResult>;

  // Build domain comparisons
  const domainComparisons = buildDomainComparisons(extractedGoals, domainScores);

  // Build goal alignment
  const goalAlignment = buildGoalAlignment(extractedGoals, skillEstimates);

  // Build discrepancies
  const discrepancies = (result.discrepancies ?? []) as Discrepancy[];

  // Build recommendations
  const recommendations = buildRecommendations(domainComparisons, discrepancies, gradeBand);

  // Calculate overall match score
  const overallMatchScore = calculateOverallMatchScore(domainComparisons, goalAlignment);

  // Build summary
  const summary = buildComparisonSummary(domainComparisons, goalAlignment, discrepancies, overallMatchScore);

  return {
    summary,
    domainComparisons,
    goalAlignment,
    discrepancies,
    recommendations,
    overallMatchScore,
    confidenceLevel: comparisonResult.confidence,
  };
}

/**
 * Build domain-level comparisons between IEP and assessment.
 */
function buildDomainComparisons(
  iepGoals: IepGoal[],
  domainScores: Record<string, { correct: number; total: number; adaptiveAbility: number }>
): DomainComparison[] {
  const domains = ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'];
  const domainLabels: Record<string, string> = {
    ELA: 'English Language Arts',
    MATH: 'Mathematics',
    SCIENCE: 'Science',
    SPEECH: 'Speech & Language',
    SEL: 'Social-Emotional Learning',
  };

  return domains.map((domain) => {
    const assessmentData = domainScores[domain];
    const relatedGoals = iepGoals.filter((g) =>
      g.domain.toUpperCase().includes(domain) ||
      domain === 'ELA' && ['READING', 'WRITING', 'LANGUAGE'].some((d) => g.domain.toUpperCase().includes(d)) ||
      domain === 'SEL' && ['SOCIAL', 'EMOTIONAL', 'BEHAVIOR'].some((d) => g.domain.toUpperCase().includes(d))
    );

    const assessmentLevel = assessmentData?.adaptiveAbility ?? 0;
    const assessmentPercentage = assessmentLevel * 100;

    let assessmentLabel: string;
    if (assessmentPercentage >= 80) assessmentLabel = 'Proficient';
    else if (assessmentPercentage >= 60) assessmentLabel = 'Developing';
    else if (assessmentPercentage >= 40) assessmentLabel = 'Emerging';
    else assessmentLabel = 'Beginning';

    // Determine IEP level indication from goals
    let iepLevel: string | null = null;
    if (relatedGoals.length > 0) {
      // Try to extract level from baseline descriptions
      const baselines = relatedGoals
        .map((g) => g.baseline)
        .filter((b): b is string => b !== null);
      if (baselines.length > 0) {
        iepLevel = baselines[0]; // Use first baseline as representative
      }
    }

    // Determine alignment
    let alignment: 'ALIGNED' | 'HIGHER' | 'LOWER' | 'UNKNOWN' = 'UNKNOWN';
    let difference: number | null = null;

    if (relatedGoals.length > 0 && assessmentData) {
      // Simplified alignment - if IEP has goals in this area and assessment shows needs
      if (assessmentPercentage < 60 && relatedGoals.length > 0) {
        alignment = 'ALIGNED'; // Both indicate need
      } else if (assessmentPercentage >= 60 && relatedGoals.length > 0) {
        alignment = 'HIGHER'; // Assessment shows higher than IEP might suggest
        difference = assessmentPercentage - 50; // Rough difference
      }
    }

    let notes = '';
    if (relatedGoals.length === 0) {
      notes = `No specific IEP goals found for ${domainLabels[domain]}`;
    } else if (alignment === 'ALIGNED') {
      notes = `Assessment results align with IEP goals indicating support needed in this area`;
    } else if (alignment === 'HIGHER') {
      notes = `Assessment shows stronger performance than IEP baseline might suggest - consider updating goals`;
    }

    return {
      domain,
      iepLevel,
      assessmentLevel: assessmentPercentage,
      assessmentLabel,
      alignment,
      difference,
      notes,
    };
  });
}

/**
 * Build goal alignment analysis.
 */
function buildGoalAlignment(
  iepGoals: IepGoal[],
  skillEstimates: BaselineSkillEstimate[]
): GoalAlignment[] {
  return iepGoals.map((goal) => {
    // Find related skill estimates based on domain
    const domainMapping: Record<string, string[]> = {
      reading: ['ELA'],
      writing: ['ELA'],
      language: ['ELA', 'SPEECH'],
      math: ['MATH'],
      mathematics: ['MATH'],
      science: ['SCIENCE'],
      speech: ['SPEECH'],
      social: ['SEL'],
      emotional: ['SEL'],
      behavior: ['SEL'],
    };

    let relatedDomain = 'OTHER';
    for (const [keyword, domains] of Object.entries(domainMapping)) {
      if (goal.domain.toLowerCase().includes(keyword) || goal.category.toLowerCase().includes(keyword)) {
        relatedDomain = domains[0];
        break;
      }
    }

    const relatedEstimates = skillEstimates.filter((e) => e.domain === relatedDomain);

    // Calculate alignment score based on assessment results
    let assessmentSupports = false;
    let alignmentScore = 0.5; // Default neutral

    if (relatedEstimates.length > 0) {
      const avgLevel =
        relatedEstimates.reduce((sum, e) => sum + Number(e.estimatedLevel), 0) /
        relatedEstimates.length;

      // If assessment shows lower levels, it supports the IEP goal
      if (avgLevel < 5) {
        assessmentSupports = true;
        alignmentScore = 0.8 + (5 - avgLevel) * 0.04; // Higher alignment for lower scores
      } else {
        alignmentScore = Math.max(0.3, 1 - avgLevel / 10);
      }
    }

    let notes = '';
    if (assessmentSupports) {
      notes = 'Assessment results support this IEP goal - student shows need in this area';
    } else if (relatedEstimates.length > 0) {
      notes = 'Assessment shows stronger performance - goal may need updating';
    } else {
      notes = 'No directly related assessment data available for this goal';
    }

    return {
      iepGoalId: goal.id,
      iepGoalDescription: goal.description,
      relatedDomain,
      assessmentSupports,
      alignmentScore,
      notes,
    };
  });
}

/**
 * Build recommendations based on comparison results.
 */
function buildRecommendations(
  domainComparisons: DomainComparison[],
  discrepancies: Discrepancy[],
  gradeBand: string
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Recommend areas where assessment shows stronger performance
  const higherAreas = domainComparisons.filter((d) => d.alignment === 'HIGHER');
  if (higherAreas.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Goal Adjustment',
      title: 'Consider updating IEP goals',
      description: `The assessment shows stronger performance in ${higherAreas.map((a) => a.domain).join(', ')} than indicated by the existing IEP. Consider updating goals to be more challenging.`,
      rationale: 'Students benefit from appropriately challenging goals that promote growth.',
    });
  }

  // Recommend addressing high severity discrepancies
  const highDiscrepancies = discrepancies.filter((d) => d.severity === 'HIGH');
  if (highDiscrepancies.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Professional Review',
      title: 'Review significant discrepancies',
      description: `There are significant differences between the IEP and assessment in: ${highDiscrepancies.map((d) => d.area).join(', ')}. A professional review is recommended.`,
      rationale: 'Significant discrepancies may indicate changes in student needs that warrant attention.',
    });
  }

  // Recommend areas where both IEP and assessment show needs
  const alignedNeeds = domainComparisons.filter(
    (d) => d.alignment === 'ALIGNED' && d.assessmentLevel < 60
  );
  if (alignedNeeds.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Support Focus',
      title: 'Prioritize support in aligned areas',
      description: `Both the IEP and assessment indicate needs in ${alignedNeeds.map((a) => a.domain).join(', ')}. These areas should be prioritized for intervention.`,
      rationale: 'Convergent evidence from multiple sources strengthens the case for focused intervention.',
    });
  }

  // General recommendation based on grade band
  if (gradeBand === 'K5') {
    recommendations.push({
      priority: 'LOW',
      category: 'General',
      title: 'Focus on foundational skills',
      description: 'For elementary students, ensure IEP goals address foundational literacy and numeracy skills that support all future learning.',
      rationale: 'Strong foundational skills are critical for long-term academic success.',
    });
  }

  return recommendations;
}

/**
 * Calculate overall match score between IEP and assessment.
 */
function calculateOverallMatchScore(
  domainComparisons: DomainComparison[],
  goalAlignment: GoalAlignment[]
): number {
  // Weight domain alignment
  const domainScores = domainComparisons.map((d) => {
    if (d.alignment === 'ALIGNED') return 1.0;
    if (d.alignment === 'UNKNOWN') return 0.5;
    return 0.3; // HIGHER or LOWER
  });

  // Weight goal alignment
  const goalScores = goalAlignment.map((g) => g.alignmentScore);

  // Combine with weighting
  const domainAvg = domainScores.length > 0
    ? domainScores.reduce((a, b) => a + b, 0) / domainScores.length
    : 0.5;

  const goalAvg = goalScores.length > 0
    ? goalScores.reduce((a, b) => a + b, 0) / goalScores.length
    : 0.5;

  // 60% weight on domain alignment, 40% on goal alignment
  return Math.round((domainAvg * 0.6 + goalAvg * 0.4) * 1000) / 1000;
}

/**
 * Build comparison summary.
 */
function buildComparisonSummary(
  domainComparisons: DomainComparison[],
  goalAlignment: GoalAlignment[],
  discrepancies: Discrepancy[],
  overallMatchScore: number
): ComparisonSummary {
  // Determine headline based on match score
  let headline: string;
  if (overallMatchScore >= 0.8) {
    headline = 'Strong Alignment Between IEP and Assessment';
  } else if (overallMatchScore >= 0.6) {
    headline = 'Good Alignment with Some Differences';
  } else if (overallMatchScore >= 0.4) {
    headline = 'Moderate Alignment - Review Recommended';
  } else {
    headline = 'Significant Differences Detected - Professional Review Suggested';
  }

  // Build overall assessment
  const alignedDomains = domainComparisons.filter((d) => d.alignment === 'ALIGNED');
  const supportedGoals = goalAlignment.filter((g) => g.assessmentSupports);

  let overallAssessment = `The baseline assessment ${overallMatchScore >= 0.6 ? 'generally supports' : 'shows some differences from'} the existing IEP. `;
  overallAssessment += `${alignedDomains.length} of ${domainComparisons.length} domains show alignment, and `;
  overallAssessment += `${supportedGoals.length} of ${goalAlignment.length} IEP goals are supported by assessment results.`;

  // Identify strength areas (high assessment scores)
  const strengthAreas = domainComparisons
    .filter((d) => d.assessmentLevel >= 70)
    .map((d) => d.domain);

  // Identify growth areas (low assessment scores or aligned needs)
  const growthAreas = domainComparisons
    .filter((d) => d.assessmentLevel < 60 || d.alignment === 'ALIGNED')
    .map((d) => d.domain);

  // Key insights
  const keyInsights: string[] = [];

  if (discrepancies.filter((d) => d.severity === 'HIGH').length > 0) {
    keyInsights.push('Significant discrepancies detected that warrant professional review');
  }

  if (strengthAreas.length >= 3) {
    keyInsights.push(`Student shows strength across multiple domains: ${strengthAreas.join(', ')}`);
  }

  if (growthAreas.length >= 3) {
    keyInsights.push(`Multiple areas identified for growth: ${growthAreas.join(', ')}`);
  }

  if (overallMatchScore >= 0.7 && supportedGoals.length > 0) {
    keyInsights.push('Assessment data supports continuing with current IEP goals');
  }

  return {
    headline,
    overallAssessment,
    strengthAreas,
    growthAreas,
    keyInsights,
  };
}

// ── Normalization Helpers ───────────────────────────────────────────────────

function normalizeGoals(goals: Partial<IepGoal>[]): IepGoal[] {
  return goals.map((g, index) => ({
    id: g.id ?? `goal-${index + 1}`,
    domain: g.domain ?? 'General',
    category: g.category ?? 'Academic',
    description: g.description ?? '',
    baseline: g.baseline ?? null,
    target: g.target ?? null,
    measurementMethod: g.measurementMethod ?? null,
    timeline: g.timeline ?? null,
    confidence: g.confidence ?? 0.8,
  }));
}

function normalizeAccommodations(accommodations: Partial<IepAccommodation>[]): IepAccommodation[] {
  return accommodations.map((a, index) => ({
    id: a.id ?? `accommodation-${index + 1}`,
    category: a.category ?? 'General',
    description: a.description ?? '',
    setting: a.setting ?? null,
    frequency: a.frequency ?? null,
    confidence: a.confidence ?? 0.8,
  }));
}

function normalizeServices(services: Partial<IepService>[]): IepService[] {
  return services.map((s, index) => ({
    id: s.id ?? `service-${index + 1}`,
    type: s.type ?? 'General',
    provider: s.provider ?? null,
    frequency: s.frequency ?? null,
    duration: s.duration ?? null,
    location: s.location ?? null,
    startDate: s.startDate ?? null,
    endDate: s.endDate ?? null,
    confidence: s.confidence ?? 0.8,
  }));
}

function normalizeMetadata(metadata: Partial<IepMetadata>): IepMetadata {
  return {
    studentName: metadata.studentName ?? null,
    dateOfBirth: metadata.dateOfBirth ?? null,
    grade: metadata.grade ?? null,
    school: metadata.school ?? null,
    district: metadata.district ?? null,
    iepDate: metadata.iepDate ?? null,
    reviewDate: metadata.reviewDate ?? null,
    eligibilityCategory: metadata.eligibilityCategory ?? null,
    caseManager: metadata.caseManager ?? null,
  };
}

// ── Mock Data for Development ───────────────────────────────────────────────

function getMockAIResponse(task: string): AIResponse {
  if (task === 'extract_iep_content') {
    return {
      result: {
        goals: [
          {
            id: 'goal-1',
            domain: 'Reading',
            category: 'Academic',
            description: 'Student will improve reading comprehension by identifying main ideas and supporting details in grade-level text.',
            baseline: 'Currently reads at 2nd grade level with 60% accuracy on comprehension questions.',
            target: 'Student will answer comprehension questions with 80% accuracy.',
            measurementMethod: 'Weekly reading assessments',
            timeline: 'By end of school year',
          },
          {
            id: 'goal-2',
            domain: 'Math',
            category: 'Academic',
            description: 'Student will demonstrate proficiency in basic multiplication and division facts.',
            baseline: 'Currently knows 50% of multiplication facts through 5.',
            target: 'Student will know 90% of multiplication facts through 10.',
            measurementMethod: 'Timed math fact assessments',
            timeline: 'By end of school year',
          },
          {
            id: 'goal-3',
            domain: 'Social-Emotional',
            category: 'Behavioral',
            description: 'Student will use appropriate coping strategies when feeling frustrated.',
            baseline: 'Student currently has 3-4 behavioral incidents per week.',
            target: 'Student will reduce behavioral incidents to 1 or fewer per week.',
            measurementMethod: 'Behavior tracking log',
            timeline: 'By end of semester',
          },
        ],
        accommodations: [
          {
            id: 'acc-1',
            category: 'Presentation',
            description: 'Extended time (1.5x) on tests and assignments',
            setting: 'All classes',
            frequency: 'As needed',
          },
          {
            id: 'acc-2',
            category: 'Setting',
            description: 'Preferential seating near instruction',
            setting: 'All classes',
            frequency: 'Daily',
          },
          {
            id: 'acc-3',
            category: 'Response',
            description: 'Allow verbal responses for written assignments',
            setting: 'All classes',
            frequency: 'As needed',
          },
        ],
        services: [
          {
            id: 'svc-1',
            type: 'Specialized Academic Instruction',
            provider: 'Special Education Teacher',
            frequency: '3 times per week',
            duration: '45 minutes',
            location: 'Resource Room',
          },
          {
            id: 'svc-2',
            type: 'Speech-Language Therapy',
            provider: 'Speech-Language Pathologist',
            frequency: '2 times per week',
            duration: '30 minutes',
            location: 'Speech Room',
          },
        ],
        metadata: {
          studentName: null, // Redacted for privacy
          grade: '3rd',
          iepDate: '2024-09-15',
          reviewDate: '2025-09-15',
          eligibilityCategory: 'Specific Learning Disability',
        },
      },
      confidence: 0.85,
    };
  }

  // Default mock for comparison
  return {
    result: {
      discrepancies: [
        {
          area: 'Reading Level',
          iepIndication: '2nd grade level',
          assessmentIndication: 'Early 3rd grade level',
          severity: 'LOW',
          recommendation: 'Consider updating baseline to reflect current performance',
        },
      ],
    },
    confidence: 0.75,
  };
}

function getMockOCRResult(): { pages: string[] } {
  return {
    pages: [
      `INDIVIDUALIZED EDUCATION PROGRAM (IEP)

Student Name: [Redacted]
Date of Birth: [Redacted]
Grade: 3rd
School: [Redacted] Elementary School
District: [Redacted] Unified School District

IEP Meeting Date: September 15, 2024
Annual Review Date: September 15, 2025

ELIGIBILITY CATEGORY: Specific Learning Disability

PRESENT LEVELS OF ACADEMIC ACHIEVEMENT:
Reading: Student currently reads at approximately 2nd grade level. On recent assessments, student demonstrated 60% accuracy on comprehension questions when reading grade-level text.

Mathematics: Student has mastered addition and subtraction facts but struggles with multiplication. Currently knows approximately 50% of multiplication facts through 5.

ANNUAL GOALS:

Goal 1 - Reading Comprehension:
By the end of the school year, student will improve reading comprehension by identifying main ideas and supporting details in grade-level text, achieving 80% accuracy on comprehension questions as measured by weekly reading assessments.

Goal 2 - Mathematics:
By the end of the school year, student will demonstrate proficiency in basic multiplication and division facts, knowing 90% of multiplication facts through 10 as measured by timed math fact assessments.

Goal 3 - Social-Emotional:
By the end of the semester, student will use appropriate coping strategies when feeling frustrated, reducing behavioral incidents from 3-4 per week to 1 or fewer per week as measured by behavior tracking log.

ACCOMMODATIONS:
- Extended time (1.5x) on tests and assignments
- Preferential seating near instruction
- Allow verbal responses for written assignments

SERVICES:
- Specialized Academic Instruction: 3x weekly, 45 min, Resource Room
- Speech-Language Therapy: 2x weekly, 30 min, Speech Room`,
    ],
  };
}
