/**
 * Content Pipeline
 *
 * Manages the complete content authoring pipeline with AI integration:
 * 1. AI Draft Generation
 * 2. Human Review/Edit
 * 3. AI Quality Check
 * 4. Curriculum Validation
 * 5. Accessibility Check
 * 6. Final Approval
 */

import { v4 as uuidv4 } from 'uuid';

import type {
  ContentPipelineState,
  ContentPipelineStage,
  PipelineStageName,
  GeneratedDraft,
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

export interface PipelineConfig {
  qualityThreshold: number;
  alignmentThreshold: number;
  accessibilityThreshold: number;
  requireAllStages: boolean;
  autoAdvance: boolean;
}

export interface StageResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  warnings?: string[];
}

export type StageHandler = (
  contentId: string,
  content: string,
  context: AIRequestContext
) => Promise<StageResult>;

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT PIPELINE CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class ContentPipeline {
  private readonly draftGenerator: DraftGenerator;
  private readonly curriculumValidator: CurriculumValidator;
  private readonly qualityScorer: QualityScorer;
  private readonly config: PipelineConfig;

  // In-memory storage (would use database in production)
  private readonly pipelines: Map<string, ContentPipelineState> = new Map();
  private readonly content: Map<string, string> = new Map();
  private readonly drafts: Map<string, GeneratedDraft> = new Map();

  private readonly stageOrder: PipelineStageName[] = [
    'ai_draft_generation',
    'human_review_edit',
    'ai_quality_check',
    'curriculum_validation',
    'accessibility_check',
    'final_approval',
  ];

  constructor(
    draftGenerator?: DraftGenerator,
    curriculumValidator?: CurriculumValidator,
    qualityScorer?: QualityScorer,
    config?: Partial<PipelineConfig>
  ) {
    this.draftGenerator = draftGenerator ?? createDraftGenerator();
    this.curriculumValidator = curriculumValidator ?? createCurriculumValidator();
    this.qualityScorer = qualityScorer ?? createQualityScorer();
    this.config = {
      qualityThreshold: config?.qualityThreshold ?? 70,
      alignmentThreshold: config?.alignmentThreshold ?? 70,
      accessibilityThreshold: config?.accessibilityThreshold ?? 75,
      requireAllStages: config?.requireAllStages ?? true,
      autoAdvance: config?.autoAdvance ?? false,
    };
  }

  /**
   * Initialize a new content pipeline
   */
  async initializePipeline(
    contentId: string,
    options?: { skipStages?: PipelineStageName[] }
  ): Promise<ContentPipelineState> {
    const stages: ContentPipelineStage[] = this.stageOrder.map((name) => ({
      name,
      status: options?.skipStages?.includes(name) ? 'skipped' : 'pending',
    }));

    const state: ContentPipelineState = {
      contentId,
      stages,
      currentStage: stages.find((s) => s.status === 'pending')?.name ?? 'ai_draft_generation',
      overallStatus: 'in_progress',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pipelines.set(contentId, state);
    return state;
  }

  /**
   * Execute the AI draft generation stage
   */
  async executeDraftGeneration(
    contentId: string,
    draftRequest: Parameters<DraftGenerator['generateDraft']>[0],
    context: AIRequestContext
  ): Promise<StageResult> {
    const state = this.pipelines.get(contentId);
    if (!state) {
      throw new Error(`Pipeline not found for content ${contentId}`);
    }

    const stage = state.stages.find((s) => s.name === 'ai_draft_generation');
    if (!stage) {
      throw new Error('Draft generation stage not found');
    }

    stage.status = 'in_progress';
    stage.startedAt = new Date();
    this.updatePipeline(contentId, state);

    try {
      const draft = await this.draftGenerator.generateDraft(draftRequest);

      this.drafts.set(contentId, draft);
      this.content.set(contentId, draft.content);

      stage.status = 'completed';
      stage.completedAt = new Date();
      stage.result = {
        draftId: draft.id,
        title: draft.title,
        sectionCount: draft.sections.length,
        readabilityGrade: draft.readabilityScore.fleschKincaidGrade,
      };

      this.advanceToNextStage(contentId);

      return {
        success: true,
        data: { draft },
      };
    } catch (error) {
      stage.status = 'failed';
      stage.error = error instanceof Error ? error.message : 'Unknown error';
      this.updatePipelineStatus(contentId, 'blocked');

      return {
        success: false,
        error: stage.error,
      };
    }
  }

  /**
   * Mark human review as complete
   */
  async completeHumanReview(
    contentId: string,
    updatedContent: string,
    reviewerId: string,
    notes?: string
  ): Promise<StageResult> {
    const state = this.pipelines.get(contentId);
    if (!state) {
      throw new Error(`Pipeline not found for content ${contentId}`);
    }

    const stage = state.stages.find((s) => s.name === 'human_review_edit');
    if (!stage) {
      throw new Error('Human review stage not found');
    }

    // Update content with human edits
    this.content.set(contentId, updatedContent);

    stage.status = 'completed';
    stage.completedAt = new Date();
    stage.result = {
      reviewerId,
      notes,
      contentUpdated: true,
    };

    this.advanceToNextStage(contentId);

    return {
      success: true,
      data: { contentUpdated: true },
    };
  }

  /**
   * Execute the AI quality check stage
   */
  async executeQualityCheck(
    contentId: string,
    context: AIRequestContext
  ): Promise<StageResult> {
    const state = this.pipelines.get(contentId);
    if (!state) {
      throw new Error(`Pipeline not found for content ${contentId}`);
    }

    const content = this.content.get(contentId);
    if (!content) {
      throw new Error(`Content not found for ${contentId}`);
    }

    const stage = state.stages.find((s) => s.name === 'ai_quality_check');
    if (!stage) {
      throw new Error('Quality check stage not found');
    }

    stage.status = 'in_progress';
    stage.startedAt = new Date();
    this.updatePipeline(contentId, state);

    try {
      const score = await this.qualityScorer.scoreContent(
        content,
        {
          subject: 'OTHER',
          gradeLevel: 5,
          contentType: 'lesson',
        },
        context
      );

      const passed = score.overall >= this.config.qualityThreshold;
      const warnings = score.issues
        .filter((i) => i.severity === 'warning')
        .map((i) => i.description);

      stage.status = passed ? 'completed' : 'failed';
      stage.completedAt = new Date();
      stage.result = {
        score: score.overall,
        passed,
        issues: score.issues.length,
        suggestions: score.suggestions.length,
      };

      if (passed) {
        this.advanceToNextStage(contentId);
      } else {
        this.updatePipelineStatus(contentId, 'blocked');
      }

      return {
        success: passed,
        data: { qualityScore: score },
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      stage.status = 'failed';
      stage.error = error instanceof Error ? error.message : 'Unknown error';
      this.updatePipelineStatus(contentId, 'blocked');

      return {
        success: false,
        error: stage.error,
      };
    }
  }

  /**
   * Execute the curriculum validation stage
   */
  async executeCurriculumValidation(
    contentId: string,
    targetStandards: string[],
    context: AIRequestContext
  ): Promise<StageResult> {
    const state = this.pipelines.get(contentId);
    if (!state) {
      throw new Error(`Pipeline not found for content ${contentId}`);
    }

    const content = this.content.get(contentId);
    if (!content) {
      throw new Error(`Content not found for ${contentId}`);
    }

    const stage = state.stages.find((s) => s.name === 'curriculum_validation');
    if (!stage) {
      throw new Error('Curriculum validation stage not found');
    }

    if (targetStandards.length === 0) {
      stage.status = 'skipped';
      stage.result = { reason: 'No target standards specified' };
      this.advanceToNextStage(contentId);
      return { success: true, data: { skipped: true } };
    }

    stage.status = 'in_progress';
    stage.startedAt = new Date();
    this.updatePipeline(contentId, state);

    try {
      const alignment = await this.curriculumValidator.validateAlignment(
        content,
        targetStandards,
        'OTHER',
        5,
        context
      );

      const passed = alignment.coverageScore >= this.config.alignmentThreshold;

      stage.status = passed ? 'completed' : 'failed';
      stage.completedAt = new Date();
      stage.result = {
        coverageScore: alignment.coverageScore,
        passed,
        primaryStandards: alignment.primaryStandards.length,
        misalignments: alignment.misalignments.length,
      };

      if (passed) {
        this.advanceToNextStage(contentId);
      } else {
        this.updatePipelineStatus(contentId, 'blocked');
      }

      return {
        success: passed,
        data: { alignment },
      };
    } catch (error) {
      stage.status = 'failed';
      stage.error = error instanceof Error ? error.message : 'Unknown error';
      this.updatePipelineStatus(contentId, 'blocked');

      return {
        success: false,
        error: stage.error,
      };
    }
  }

  /**
   * Execute the accessibility check stage
   */
  async executeAccessibilityCheck(
    contentId: string,
    context: AIRequestContext
  ): Promise<StageResult> {
    const state = this.pipelines.get(contentId);
    if (!state) {
      throw new Error(`Pipeline not found for content ${contentId}`);
    }

    const content = this.content.get(contentId);
    if (!content) {
      throw new Error(`Content not found for ${contentId}`);
    }

    const stage = state.stages.find((s) => s.name === 'accessibility_check');
    if (!stage) {
      throw new Error('Accessibility check stage not found');
    }

    stage.status = 'in_progress';
    stage.startedAt = new Date();
    this.updatePipeline(contentId, state);

    try {
      const check = await this.qualityScorer.checkAccessibility(content, context);

      const passed = check.score >= this.config.accessibilityThreshold;
      const criticalIssues = check.issues.filter((i) => i.severity === 'critical');

      // Fail if there are critical issues regardless of score
      const actuallyPassed = passed && criticalIssues.length === 0;

      stage.status = actuallyPassed ? 'completed' : 'failed';
      stage.completedAt = new Date();
      stage.result = {
        score: check.score,
        wcagLevel: check.wcagLevel,
        passed: actuallyPassed,
        issues: check.issues.length,
        criticalIssues: criticalIssues.length,
      };

      if (actuallyPassed) {
        this.advanceToNextStage(contentId);
      } else {
        this.updatePipelineStatus(contentId, 'blocked');
      }

      return {
        success: actuallyPassed,
        data: { accessibilityCheck: check },
      };
    } catch (error) {
      stage.status = 'failed';
      stage.error = error instanceof Error ? error.message : 'Unknown error';
      this.updatePipelineStatus(contentId, 'blocked');

      return {
        success: false,
        error: stage.error,
      };
    }
  }

  /**
   * Execute final approval stage
   */
  async executeFinalApproval(
    contentId: string,
    approverId: string,
    approved: boolean,
    notes?: string
  ): Promise<StageResult> {
    const state = this.pipelines.get(contentId);
    if (!state) {
      throw new Error(`Pipeline not found for content ${contentId}`);
    }

    const stage = state.stages.find((s) => s.name === 'final_approval');
    if (!stage) {
      throw new Error('Final approval stage not found');
    }

    stage.status = approved ? 'completed' : 'failed';
    stage.completedAt = new Date();
    stage.result = {
      approverId,
      approved,
      notes,
    };

    if (approved) {
      this.updatePipelineStatus(contentId, 'completed');
    } else {
      this.updatePipelineStatus(contentId, 'failed');
    }

    return {
      success: approved,
      data: { approved, approverId },
    };
  }

  /**
   * Get pipeline state
   */
  getPipelineState(contentId: string): ContentPipelineState | undefined {
    return this.pipelines.get(contentId);
  }

  /**
   * Get draft for content
   */
  getDraft(contentId: string): GeneratedDraft | undefined {
    return this.drafts.get(contentId);
  }

  /**
   * Get current content
   */
  getContent(contentId: string): string | undefined {
    return this.content.get(contentId);
  }

  /**
   * Check if pipeline is complete
   */
  isPipelineComplete(contentId: string): boolean {
    const state = this.pipelines.get(contentId);
    if (!state) return false;

    return state.overallStatus === 'completed';
  }

  /**
   * Get all blocked pipelines
   */
  getBlockedPipelines(): ContentPipelineState[] {
    return Array.from(this.pipelines.values()).filter(
      (p) => p.overallStatus === 'blocked'
    );
  }

  /**
   * Reset a stage to retry
   */
  resetStage(contentId: string, stageName: PipelineStageName): void {
    const state = this.pipelines.get(contentId);
    if (!state) {
      throw new Error(`Pipeline not found for content ${contentId}`);
    }

    const stage = state.stages.find((s) => s.name === stageName);
    if (!stage) {
      throw new Error(`Stage ${stageName} not found`);
    }

    stage.status = 'pending';
    stage.startedAt = undefined;
    stage.completedAt = undefined;
    stage.result = undefined;
    stage.error = undefined;

    state.currentStage = stageName;
    state.overallStatus = 'in_progress';
    state.updatedAt = new Date();

    this.pipelines.set(contentId, state);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private updatePipeline(contentId: string, state: ContentPipelineState): void {
    state.updatedAt = new Date();
    this.pipelines.set(contentId, state);
  }

  private updatePipelineStatus(
    contentId: string,
    status: 'in_progress' | 'completed' | 'blocked' | 'failed'
  ): void {
    const state = this.pipelines.get(contentId);
    if (state) {
      state.overallStatus = status;
      state.updatedAt = new Date();
      this.pipelines.set(contentId, state);
    }
  }

  private advanceToNextStage(contentId: string): void {
    const state = this.pipelines.get(contentId);
    if (!state) return;

    const currentIndex = this.stageOrder.indexOf(state.currentStage);
    const nextStage = this.stageOrder
      .slice(currentIndex + 1)
      .find((name) => {
        const stage = state.stages.find((s) => s.name === name);
        return stage && stage.status === 'pending';
      });

    if (nextStage) {
      state.currentStage = nextStage;
      state.updatedAt = new Date();

      // Set stage to in_progress if autoAdvance is enabled
      if (this.config.autoAdvance) {
        const stage = state.stages.find((s) => s.name === nextStage);
        if (stage) {
          stage.status = 'in_progress';
          stage.startedAt = new Date();
        }
      }
    } else {
      // Check if all required stages are complete
      const allComplete = state.stages.every(
        (s) => s.status === 'completed' || s.status === 'skipped'
      );
      if (allComplete) {
        state.overallStatus = 'completed';
      }
    }

    this.pipelines.set(contentId, state);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

let pipelineInstance: ContentPipeline | null = null;

export function getContentPipeline(): ContentPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new ContentPipeline();
  }
  return pipelineInstance;
}

export function createContentPipeline(
  draftGenerator?: DraftGenerator,
  curriculumValidator?: CurriculumValidator,
  qualityScorer?: QualityScorer,
  config?: Partial<PipelineConfig>
): ContentPipeline {
  return new ContentPipeline(draftGenerator, curriculumValidator, qualityScorer, config);
}
