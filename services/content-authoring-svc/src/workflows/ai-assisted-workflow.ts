/**
 * AI-Assisted Workflow
 *
 * Integration of AI capabilities with the existing content approval workflow.
 * Provides automated review, suggestions, and quality gates.
 */

import { v4 as uuidv4 } from 'uuid';

import type {
  AIReviewSession,
  AIReviewSuggestion,
  QualityScore,
  CurriculumAlignment,
  AccessibilityCheck,
} from '../types/ai-authoring.js';
import { DraftGenerator, createDraftGenerator } from '../ai/draft-generator.js';
import { CurriculumValidator, createCurriculumValidator } from '../ai/curriculum-validator.js';
import { QualityScorer, createQualityScorer } from '../ai/quality-scorer.js';
import type { AIRequestContext } from '../ai/ai-orchestrator-client.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ReviewSessionOptions {
  runQualityCheck?: boolean;
  runAlignmentCheck?: boolean;
  runAccessibilityCheck?: boolean;
  targetStandards?: string[];
  qualityThreshold?: number;
}

export interface AIReview {
  sessionId: string;
  contentId: string;
  qualityScore?: QualityScore;
  alignmentResult?: CurriculumAlignment;
  accessibilityCheck?: AccessibilityCheck;
  overallStatus: 'passed' | 'needs_attention' | 'failed';
  suggestions: AIReviewSuggestion[];
  completedAt: Date;
}

export interface HumanReviewRequest {
  contentId: string;
  aiReview: AIReview;
  priority: 'normal' | 'high' | 'urgent';
  reason: string;
  assignedTo?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI-ASSISTED WORKFLOW CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class AIAssistedWorkflow {
  private readonly draftGenerator: DraftGenerator;
  private readonly curriculumValidator: CurriculumValidator;
  private readonly qualityScorer: QualityScorer;

  // In-memory storage (would use database in production)
  private readonly sessions: Map<string, AIReviewSession> = new Map();
  private readonly reviews: Map<string, AIReview> = new Map();
  private readonly humanReviewQueue: Map<string, HumanReviewRequest> = new Map();

  constructor(
    draftGenerator?: DraftGenerator,
    curriculumValidator?: CurriculumValidator,
    qualityScorer?: QualityScorer
  ) {
    this.draftGenerator = draftGenerator ?? createDraftGenerator();
    this.curriculumValidator = curriculumValidator ?? createCurriculumValidator();
    this.qualityScorer = qualityScorer ?? createQualityScorer();
  }

  /**
   * Initiate an AI review session for content
   */
  async initiateAIReview(
    contentId: string,
    content: string,
    options: ReviewSessionOptions,
    context: AIRequestContext
  ): Promise<AIReviewSession> {
    const sessionId = uuidv4();

    const session: AIReviewSession = {
      id: sessionId,
      contentId,
      status: 'in_progress',
      suggestions: [],
      startedAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    try {
      const suggestions: AIReviewSuggestion[] = [];

      // Run quality check
      if (options.runQualityCheck !== false) {
        session.qualityScore = await this.qualityScorer.scoreContent(
          content,
          {
            subject: 'OTHER',
            gradeLevel: 5,
            contentType: 'lesson',
          },
          context
        );

        // Generate suggestions from quality issues
        for (const issue of session.qualityScore.issues) {
          suggestions.push({
            id: uuidv4(),
            type: 'quality',
            title: `${issue.dimension}: ${issue.severity}`,
            description: issue.description,
            autoApplicable: false,
          });
        }

        // Add quality improvement suggestions
        for (const sug of session.qualityScore.suggestions) {
          suggestions.push({
            id: sug.id,
            type: 'quality',
            title: `Improve ${sug.dimension}`,
            description: sug.suggestion,
            autoApplicable: sug.effort === 'easy',
          });
        }
      }

      // Run alignment check
      if (options.runAlignmentCheck && options.targetStandards?.length) {
        session.alignmentResult = await this.curriculumValidator.validateAlignment(
          content,
          options.targetStandards,
          'OTHER',
          5,
          context
        );

        // Generate suggestions from alignment issues
        for (const misalignment of session.alignmentResult.misalignments) {
          suggestions.push({
            id: uuidv4(),
            type: 'alignment',
            title: `Standard ${misalignment.standardCode} not addressed`,
            description: misalignment.suggestion,
            autoApplicable: false,
          });
        }

        for (const sug of session.alignmentResult.suggestions) {
          suggestions.push({
            id: uuidv4(),
            type: 'alignment',
            title: sug.description,
            description: `Priority: ${sug.priority}, Impact: ${sug.estimatedImpact}%`,
            autoApplicable: false,
          });
        }
      }

      // Run accessibility check
      if (options.runAccessibilityCheck !== false) {
        session.accessibilityCheck = await this.qualityScorer.checkAccessibility(content, context);

        // Generate suggestions from accessibility issues
        for (const issue of session.accessibilityCheck.issues) {
          suggestions.push({
            id: uuidv4(),
            type: 'accessibility',
            title: `Accessibility: ${issue.type}`,
            description: issue.howToFix,
            autoApplicable: false,
          });
        }
      }

      session.suggestions = suggestions;
      session.status = 'completed';
      session.completedAt = new Date();

      this.sessions.set(sessionId, session);

      return session;
    } catch (error) {
      session.status = 'failed';
      this.sessions.set(sessionId, session);
      throw error;
    }
  }

  /**
   * Get AI suggestions for content
   */
  async getAISuggestions(
    contentId: string,
    content: string,
    context: AIRequestContext
  ): Promise<AIReviewSuggestion[]> {
    // Check for existing session
    for (const session of this.sessions.values()) {
      if (session.contentId === contentId && session.status === 'completed') {
        return session.suggestions;
      }
    }

    // Create new review session
    const session = await this.initiateAIReview(
      contentId,
      content,
      {
        runQualityCheck: true,
        runAccessibilityCheck: true,
      },
      context
    );

    return session.suggestions;
  }

  /**
   * Apply an AI suggestion to content
   */
  async applyAISuggestion(
    contentId: string,
    suggestionId: string,
    userId: string
  ): Promise<void> {
    // Find the suggestion in sessions
    for (const session of this.sessions.values()) {
      if (session.contentId === contentId) {
        const suggestion = session.suggestions.find((s) => s.id === suggestionId);
        if (suggestion) {
          suggestion.appliedAt = new Date();
          suggestion.appliedBy = userId;
          this.sessions.set(session.id, session);
          return;
        }
      }
    }

    throw new Error(`Suggestion ${suggestionId} not found for content ${contentId}`);
  }

  /**
   * Dismiss an AI suggestion
   */
  async dismissAISuggestion(
    contentId: string,
    suggestionId: string,
    reason: string
  ): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.contentId === contentId) {
        const suggestion = session.suggestions.find((s) => s.id === suggestionId);
        if (suggestion) {
          suggestion.dismissed = true;
          suggestion.dismissedReason = reason;
          this.sessions.set(session.id, session);
          return;
        }
      }
    }

    throw new Error(`Suggestion ${suggestionId} not found for content ${contentId}`);
  }

  /**
   * Request human review for content
   */
  async requestHumanReview(
    contentId: string,
    aiReview: AIReview,
    options?: { priority?: 'normal' | 'high' | 'urgent'; reason?: string; assignTo?: string }
  ): Promise<string> {
    const requestId = uuidv4();

    const request: HumanReviewRequest = {
      contentId,
      aiReview,
      priority: options?.priority ?? 'normal',
      reason: options?.reason ?? 'AI review requires human verification',
      assignedTo: options?.assignTo,
    };

    this.humanReviewQueue.set(requestId, request);
    this.reviews.set(contentId, aiReview);

    console.info('Human review requested', {
      requestId,
      contentId,
      priority: request.priority,
      status: aiReview.overallStatus,
    });

    return requestId;
  }

  /**
   * Complete AI review and determine if human review is needed
   */
  async completeAIReview(
    sessionId: string,
    qualityThreshold: number = 70
  ): Promise<AIReview> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'completed') {
      throw new Error(`Session ${sessionId} is not completed`);
    }

    // Determine overall status
    let overallStatus: 'passed' | 'needs_attention' | 'failed' = 'passed';

    if (session.qualityScore) {
      if (session.qualityScore.overall < qualityThreshold) {
        overallStatus = 'needs_attention';
      }
      if (session.qualityScore.overall < 50) {
        overallStatus = 'failed';
      }
    }

    if (session.alignmentResult) {
      if (session.alignmentResult.coverageScore < 70) {
        overallStatus = overallStatus === 'passed' ? 'needs_attention' : overallStatus;
      }
      if (session.alignmentResult.misalignments.length > 2) {
        overallStatus = 'needs_attention';
      }
    }

    if (session.accessibilityCheck) {
      const criticalIssues = session.accessibilityCheck.issues.filter(
        (i) => i.severity === 'critical'
      );
      if (criticalIssues.length > 0) {
        overallStatus = 'needs_attention';
      }
    }

    // Check for critical issues
    const criticalQualityIssues = session.qualityScore?.issues.filter(
      (i) => i.severity === 'critical'
    ) ?? [];
    if (criticalQualityIssues.length > 0) {
      overallStatus = 'failed';
    }

    const review: AIReview = {
      sessionId,
      contentId: session.contentId,
      qualityScore: session.qualityScore,
      alignmentResult: session.alignmentResult,
      accessibilityCheck: session.accessibilityCheck,
      overallStatus,
      suggestions: session.suggestions,
      completedAt: new Date(),
    };

    this.reviews.set(session.contentId, review);

    return review;
  }

  /**
   * Get review session by ID
   */
  getSession(sessionId: string): AIReviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get review by content ID
   */
  getReview(contentId: string): AIReview | undefined {
    return this.reviews.get(contentId);
  }

  /**
   * Get human review queue
   */
  getHumanReviewQueue(): HumanReviewRequest[] {
    return Array.from(this.humanReviewQueue.values());
  }

  /**
   * Check if content passes AI review gate
   */
  async passesAIReviewGate(
    contentId: string,
    content: string,
    context: AIRequestContext,
    options?: { qualityThreshold?: number; alignmentThreshold?: number }
  ): Promise<{ passes: boolean; reason?: string }> {
    const qualityThreshold = options?.qualityThreshold ?? 70;
    const alignmentThreshold = options?.alignmentThreshold ?? 70;

    // Get or create review
    let review = this.reviews.get(contentId);
    if (!review) {
      const session = await this.initiateAIReview(
        contentId,
        content,
        { runQualityCheck: true, runAlignmentCheck: false, runAccessibilityCheck: true },
        context
      );
      review = await this.completeAIReview(session.id, qualityThreshold);
    }

    if (review.overallStatus === 'failed') {
      return { passes: false, reason: 'Content failed AI review' };
    }

    if (review.qualityScore && review.qualityScore.overall < qualityThreshold) {
      return {
        passes: false,
        reason: `Quality score (${review.qualityScore.overall}) below threshold (${qualityThreshold})`,
      };
    }

    if (review.alignmentResult && review.alignmentResult.coverageScore < alignmentThreshold) {
      return {
        passes: false,
        reason: `Alignment score (${review.alignmentResult.coverageScore}) below threshold (${alignmentThreshold})`,
      };
    }

    return { passes: true };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

let workflowInstance: AIAssistedWorkflow | null = null;

export function getAIAssistedWorkflow(): AIAssistedWorkflow {
  if (!workflowInstance) {
    workflowInstance = new AIAssistedWorkflow();
  }
  return workflowInstance;
}

export function createAIAssistedWorkflow(
  draftGenerator?: DraftGenerator,
  curriculumValidator?: CurriculumValidator,
  qualityScorer?: QualityScorer
): AIAssistedWorkflow {
  return new AIAssistedWorkflow(draftGenerator, curriculumValidator, qualityScorer);
}
