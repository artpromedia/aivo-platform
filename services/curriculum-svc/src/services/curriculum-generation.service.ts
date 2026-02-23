/**
 * Curriculum Generation Service
 *
 * Orchestrates AI-powered curriculum generation from templates.
 * When a district onboards, this service:
 *   1. Looks up the relevant CurriculumTemplate(s) for the subject/gradeBand
 *   2. Creates a CurriculumGenerationJob record
 *   3. Iterates over unit blueprints and lesson topics
 *   4. Calls the AI Orchestrator to generate full lesson content
 *   5. Persists generated content as Curriculum → Units → Lessons → StandardAlignments
 *   6. Updates the job with progress, token usage, and completion status
 */

import type { PrismaClient, CurriculumStandard, GradeBand, SubjectArea } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface GenerationRequest {
  tenantId: string;
  templateId: string;
  targetStandards: string[];
  stateCode?: string;
  academicYear?: string;
  triggeredBy?: string;
}

export interface GenerationResult {
  jobId: string;
  curriculumId: string;
  lessonsGenerated: number;
  lessonsTotal: number;
  tokensUsed: number;
  estimatedCost: number;
  status: string;
  durationMs: number;
}

interface UnitBlueprintJson {
  title: string;
  description: string;
  essentialQuestions: string[];
  bigIdeas: string[];
  durationDays: number;
  lessonTopics: LessonTopicJson[];
}

interface LessonTopicJson {
  title: string;
  objectives: string[];
  durationMin: number;
  lessonType: string;
  materials: string[];
}

/** Shape returned by AI Orchestrator POST /generation/lessons */
interface AIGeneratedLesson {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  duration: number;
  blocks: AIContentBlock[];
  assessment?: AIAssessment;
  vocabulary?: AIVocabularyItem[];
  resources?: string[];
  teacherNotes?: string;
  standards?: string[];
  metadata: {
    generatedAt: string;
    model: string;
    provider: string;
    tokensUsed: number;
    latencyMs: number;
    cached: boolean;
  };
}

interface AIContentBlock {
  type: string;
  content: string;
  order: number;
  metadata?: Record<string, unknown>;
}

interface AIAssessment {
  questions: AIQuestion[];
  rubric?: string;
}

interface AIQuestion {
  question: string;
  type: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  points?: number;
}

interface AIVocabularyItem {
  term: string;
  definition: string;
  example?: string;
}

/** Maps GradeBand to the representative GradeLevel values the AI expects */
const GRADE_BAND_TO_LEVEL: Record<string, string> = {
  PRE_K: 'k',
  K_2: '1',
  G3_5: '4',
  G6_8: '7',
  G9_12: '10',
};

/** Maps SubjectArea enum to the AI orchestrator subject string */
const SUBJECT_MAP: Record<string, string> = {
  ELA: 'English Language Arts',
  MATH: 'Mathematics',
  SCIENCE: 'Science',
  SOCIAL_STUDIES: 'Social Studies',
  SEL: 'Social-Emotional Learning',
  ARTS: 'Arts',
  WORLD_LANGUAGE: 'World Languages',
  PHYSICAL_ED: 'Physical Education',
  TECHNOLOGY: 'Technology',
  CAREER_TECH: 'Career & Technical Education',
};

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class CurriculumGenerationService {
  private aiOrchestratorUrl: string;

  constructor(private prisma: PrismaClient) {
    this.aiOrchestratorUrl = process.env.AI_ORCHESTRATOR_URL ?? 'http://localhost:4010';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEMPLATE QUERIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * List all active templates, optionally filtered by subject/gradeBand
   */
  async listTemplates(options?: {
    subject?: SubjectArea;
    gradeBand?: GradeBand;
    isActive?: boolean;
  }) {
    return this.prisma.curriculumTemplate.findMany({
      where: {
        ...(options?.subject && { subject: options.subject }),
        ...(options?.gradeBand && { gradeBand: options.gradeBand }),
        isActive: options?.isActive ?? true,
      },
      orderBy: [{ subject: 'asc' }, { gradeBand: 'asc' }],
    });
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string) {
    return this.prisma.curriculumTemplate.findUnique({
      where: { id: templateId },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // JOB QUERIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * List generation jobs for a tenant
   */
  async listJobs(tenantId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.prisma.curriculumGenerationJob.findMany({
      where: {
        tenantId,
        ...(options?.status && { status: options.status as any }),
      },
      include: {
        template: {
          select: { name: true, subject: true, gradeBand: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  }

  /**
   * Get a single job by ID
   */
  async getJob(jobId: string) {
    return this.prisma.curriculumGenerationJob.findUnique({
      where: { id: jobId },
      include: {
        template: true,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Trigger curriculum generation from a template.
   *
   * Creates the generation job, then iterates over each unit blueprint and
   * lesson topic in the template, calling the AI Orchestrator to generate
   * full lesson content.  Generated content is persisted incrementally so
   * partial progress is preserved if the process is interrupted.
   */
  async generateFromTemplate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();

    // ── 1. Validate template ──────────────────────────────────────────────
    const template = await this.prisma.curriculumTemplate.findUnique({
      where: { id: request.templateId },
    });
    if (!template) {
      throw new Error(`Template not found: ${request.templateId}`);
    }

    const unitBlueprints = template.unitBlueprints as unknown as UnitBlueprintJson[];
    if (!unitBlueprints?.length) {
      throw new Error(`Template has no unit blueprints: ${template.name}`);
    }

    const academicYear = request.academicYear ?? template.academicYear;
    const totalLessons = unitBlueprints.reduce((acc, u) => acc + u.lessonTopics.length, 0);

    // ── 2. Check for existing job (idempotency) ───────────────────────────
    const existingJob = await this.prisma.curriculumGenerationJob.findUnique({
      where: {
        tenantId_templateId_academicYear: {
          tenantId: request.tenantId,
          templateId: request.templateId,
          academicYear,
        },
      },
    });

    if (existingJob && existingJob.status === 'COMPLETED') {
      return {
        jobId: existingJob.id,
        curriculumId: existingJob.generatedCurriculumId ?? '',
        lessonsGenerated: existingJob.lessonsGenerated,
        lessonsTotal: existingJob.lessonsTotal,
        tokensUsed: existingJob.tokensUsed,
        estimatedCost: existingJob.estimatedCost,
        status: 'ALREADY_COMPLETED',
        durationMs: 0,
      };
    }

    if (existingJob && existingJob.status === 'IN_PROGRESS') {
      throw new Error(`Generation already in progress for this template (job: ${existingJob.id})`);
    }

    // ── 3. Create or reset job ────────────────────────────────────────────
    const job = existingJob
      ? await this.prisma.curriculumGenerationJob.update({
          where: { id: existingJob.id },
          data: {
            status: 'IN_PROGRESS',
            lessonsGenerated: 0,
            lessonsTotal: totalLessons,
            tokensUsed: 0,
            estimatedCost: 0,
            errorMessage: null,
            startedAt: new Date(),
            completedAt: null,
            targetStandards: request.targetStandards,
            stateCode: request.stateCode,
            triggeredBy: request.triggeredBy,
          },
        })
      : await this.prisma.curriculumGenerationJob.create({
          data: {
            tenantId: request.tenantId,
            templateId: request.templateId,
            targetStandards: request.targetStandards,
            stateCode: request.stateCode,
            academicYear,
            status: 'IN_PROGRESS',
            lessonsTotal: totalLessons,
            triggeredBy: request.triggeredBy,
            startedAt: new Date(),
          },
        });

    // ── 4. Create parent Curriculum record ────────────────────────────────
    const standardEnum = this.mapStandardString(request.targetStandards[0]);

    const curriculum = await this.prisma.curriculum.create({
      data: {
        tenantId: request.tenantId,
        name: `${template.name} — ${request.stateCode ?? 'Generated'}`,
        description: `AI-generated from template "${template.name}" for ${request.targetStandards.join(', ')} standards`,
        standard: standardEnum,
        subject: template.subject,
        gradeBand: template.gradeBand,
        academicYear,
        createdBy: request.triggeredBy ?? 'system',
        isActive: true,
        version: 1,
      },
    });

    // Update job with curriculum reference
    await this.prisma.curriculumGenerationJob.update({
      where: { id: job.id },
      data: { generatedCurriculumId: curriculum.id },
    });

    // ── 5. Generate units & lessons ───────────────────────────────────────
    let lessonsGenerated = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let failedLessons = 0;

    const gradeLevel = GRADE_BAND_TO_LEVEL[template.gradeBand] ?? '5';
    const subjectName = SUBJECT_MAP[template.subject] ?? template.subject;

    for (let unitIdx = 0; unitIdx < unitBlueprints.length; unitIdx++) {
      const blueprint = unitBlueprints[unitIdx];

      // Create unit record
      const unit = await this.prisma.curriculumUnit.create({
        data: {
          curriculumId: curriculum.id,
          title: blueprint.title,
          description: blueprint.description,
          orderIndex: unitIdx,
          essentialQuestions: blueprint.essentialQuestions,
          bigIdeas: blueprint.bigIdeas,
          durationDays: blueprint.durationDays,
          status: 'DRAFT',
        },
      });

      // Generate each lesson via AI
      for (let lessonIdx = 0; lessonIdx < blueprint.lessonTopics.length; lessonIdx++) {
        const topic = blueprint.lessonTopics[lessonIdx];

        try {
          const generated = await this.callAIOrchestrator({
            tenantId: request.tenantId,
            userId: request.triggeredBy ?? 'system',
            topic: topic.title,
            subject: subjectName,
            gradeLevel,
            standards: request.targetStandards,
            duration: topic.durationMin,
            learningObjectives: topic.objectives,
            includeAssessment: true,
          });

          // Persist lesson
          const lesson = await this.prisma.lesson.create({
            data: {
              unitId: unit.id,
              title: generated.title || topic.title,
              description: generated.description,
              orderIndex: lessonIdx,
              objectives: generated.objectives?.length ? generated.objectives : topic.objectives,
              durationMin: generated.duration || topic.durationMin,
              lessonType: topic.lessonType,
              activities: generated.blocks as any,
              materials: topic.materials,
              differentiation: null,
              assessmentNotes: generated.assessment
                ? JSON.stringify(generated.assessment)
                : null,
            },
          });

          // Create standard alignments from AI-suggested standards
          const standardCodes = generated.standards ?? request.targetStandards;
          for (const code of standardCodes) {
            await this.prisma.standardAlignment.create({
              data: {
                standardCode: code,
                description: `AI-aligned standard for ${topic.title}`,
                category: template.subject,
                alignmentType: 'PRIMARY',
                lessonId: lesson.id,
                unitId: unit.id,
              },
            });
          }

          lessonsGenerated++;
          totalTokens += generated.metadata?.tokensUsed ?? 0;
          totalCost += this.estimateCost(generated.metadata?.tokensUsed ?? 0, generated.metadata?.provider);

        } catch (error) {
          failedLessons++;
          console.error(`[CurriculumGeneration] Failed to generate lesson "${topic.title}":`, error);

          // Create a placeholder lesson so we don't lose the structure
          await this.prisma.lesson.create({
            data: {
              unitId: unit.id,
              title: `[PENDING] ${topic.title}`,
              description: `Generation failed — will be retried. Error: ${error instanceof Error ? error.message : String(error)}`,
              orderIndex: lessonIdx,
              objectives: topic.objectives,
              durationMin: topic.durationMin,
              lessonType: topic.lessonType,
              activities: [],
              materials: topic.materials,
            },
          });
        }

        // Update progress periodically (every lesson)
        await this.prisma.curriculumGenerationJob.update({
          where: { id: job.id },
          data: {
            lessonsGenerated,
            tokensUsed: totalTokens,
            estimatedCost: totalCost,
          },
        });
      }
    }

    // ── 6. Finalize job ───────────────────────────────────────────────────
    const finalStatus = failedLessons === 0
      ? 'COMPLETED'
      : failedLessons === totalLessons
        ? 'FAILED'
        : 'PARTIALLY_COMPLETED';

    await this.prisma.curriculumGenerationJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        lessonsGenerated,
        tokensUsed: totalTokens,
        estimatedCost: totalCost,
        completedAt: new Date(),
        ...(failedLessons > 0 && {
          errorMessage: `${failedLessons}/${totalLessons} lessons failed to generate`,
        }),
      },
    });

    const durationMs = Date.now() - startTime;
    console.log(
      `[CurriculumGeneration] Job ${job.id} ${finalStatus}: ` +
      `${lessonsGenerated}/${totalLessons} lessons, ${totalTokens} tokens, ` +
      `$${totalCost.toFixed(4)}, ${(durationMs / 1000).toFixed(1)}s`
    );

    return {
      jobId: job.id,
      curriculumId: curriculum.id,
      lessonsGenerated,
      lessonsTotal: totalLessons,
      tokensUsed: totalTokens,
      estimatedCost: totalCost,
      status: finalStatus,
      durationMs,
    };
  }

  /**
   * Retry failed lessons in a partially-completed job
   */
  async retryFailedLessons(jobId: string): Promise<GenerationResult> {
    const job = await this.prisma.curriculumGenerationJob.findUnique({
      where: { id: jobId },
      include: { template: true },
    });
    if (!job) throw new Error(`Job not found: ${jobId}`);
    if (job.status !== 'PARTIALLY_COMPLETED' && job.status !== 'FAILED') {
      throw new Error(`Job ${jobId} is not in a retryable state (status: ${job.status})`);
    }
    if (!job.generatedCurriculumId) {
      throw new Error(`Job ${jobId} has no curriculum to retry lessons for`);
    }

    const startTime = Date.now();

    // Find [PENDING] lessons
    const pendingLessons = await this.prisma.lesson.findMany({
      where: {
        unit: { curriculumId: job.generatedCurriculumId },
        title: { startsWith: '[PENDING]' },
      },
      include: { unit: true },
    });

    if (pendingLessons.length === 0) {
      return {
        jobId: job.id,
        curriculumId: job.generatedCurriculumId,
        lessonsGenerated: job.lessonsGenerated,
        lessonsTotal: job.lessonsTotal,
        tokensUsed: job.tokensUsed,
        estimatedCost: job.estimatedCost,
        status: 'COMPLETED',
        durationMs: 0,
      };
    }

    await this.prisma.curriculumGenerationJob.update({
      where: { id: jobId },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    const gradeLevel = GRADE_BAND_TO_LEVEL[job.template.gradeBand] ?? '5';
    const subjectName = SUBJECT_MAP[job.template.subject] ?? job.template.subject;

    let retried = 0;
    let failed = 0;
    let tokens = job.tokensUsed;
    let cost = job.estimatedCost;

    for (const lesson of pendingLessons) {
      const cleanTitle = lesson.title.replace('[PENDING] ', '');

      try {
        const generated = await this.callAIOrchestrator({
          tenantId: job.tenantId,
          userId: job.triggeredBy ?? 'system',
          topic: cleanTitle,
          subject: subjectName,
          gradeLevel,
          standards: job.targetStandards,
          duration: lesson.durationMin,
          learningObjectives: lesson.objectives,
          includeAssessment: true,
        });

        await this.prisma.lesson.update({
          where: { id: lesson.id },
          data: {
            title: generated.title || cleanTitle,
            description: generated.description,
            objectives: generated.objectives?.length ? generated.objectives : lesson.objectives,
            durationMin: generated.duration || lesson.durationMin,
            activities: generated.blocks as any,
            assessmentNotes: generated.assessment
              ? JSON.stringify(generated.assessment)
              : null,
          },
        });

        retried++;
        tokens += generated.metadata?.tokensUsed ?? 0;
        cost += this.estimateCost(generated.metadata?.tokensUsed ?? 0, generated.metadata?.provider);

      } catch (error) {
        failed++;
        console.error(`[CurriculumGeneration] Retry failed for "${cleanTitle}":`, error);
      }
    }

    const finalStatus = failed === 0 ? 'COMPLETED' : 'PARTIALLY_COMPLETED';

    await this.prisma.curriculumGenerationJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        lessonsGenerated: job.lessonsGenerated + retried,
        tokensUsed: tokens,
        estimatedCost: cost,
        completedAt: new Date(),
        errorMessage: failed > 0 ? `${failed} lessons still failed after retry` : null,
      },
    });

    return {
      jobId: job.id,
      curriculumId: job.generatedCurriculumId,
      lessonsGenerated: job.lessonsGenerated + retried,
      lessonsTotal: job.lessonsTotal,
      tokensUsed: tokens,
      estimatedCost: cost,
      status: finalStatus,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Check if a curriculum already exists for a given tenant/subject/gradeBand/standards combo
   */
  async hasExistingCurriculum(tenantId: string, subject: SubjectArea, gradeBand: GradeBand, standards: string[]): Promise<boolean> {
    const existing = await this.prisma.curriculum.findFirst({
      where: {
        tenantId,
        subject,
        gradeBand,
        isActive: true,
        // Check if any of the target standards match
        standard: { in: standards.map(s => this.mapStandardString(s)) },
      },
    });
    return !!existing;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Call the AI Orchestrator's lesson generation endpoint
   */
  private async callAIOrchestrator(params: {
    tenantId: string;
    userId: string;
    topic: string;
    subject: string;
    gradeLevel: string;
    standards?: string[];
    duration?: number;
    learningObjectives?: string[];
    includeAssessment?: boolean;
  }): Promise<AIGeneratedLesson> {
    const url = `${this.aiOrchestratorUrl}/generation/lessons`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': params.tenantId,
        'x-user-id': params.userId,
      },
      body: JSON.stringify({
        topic: params.topic,
        subject: params.subject,
        gradeLevel: params.gradeLevel,
        standards: params.standards,
        duration: params.duration,
        learningObjectives: params.learningObjectives,
        includeAssessment: params.includeAssessment ?? true,
        contentStyle: 'interactive',
        difficultyLevel: 'medium',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI Orchestrator responded with ${response.status}: ${text}`);
    }

    return response.json() as Promise<AIGeneratedLesson>;
  }

  /**
   * Map standard string (e.g. "COMMON_CORE", "TEKS") to CurriculumStandard enum
   */
  private mapStandardString(standard: string): CurriculumStandard {
    const STANDARD_MAP: Record<string, CurriculumStandard> = {
      COMMON_CORE: 'COMMON_CORE' as CurriculumStandard,
      NGSS: 'NGSS' as CurriculumStandard,
      C3: 'C3' as CurriculumStandard,
      STATE_SPECIFIC: 'STATE_SPECIFIC' as CurriculumStandard,
      CUSTOM: 'CUSTOM' as CurriculumStandard,
      // State-specific standards map to STATE_SPECIFIC
      TEKS: 'STATE_SPECIFIC' as CurriculumStandard,
      SOL: 'STATE_SPECIFIC' as CurriculumStandard,
      NGSSS: 'STATE_SPECIFIC' as CurriculumStandard,
      CASEL: 'CUSTOM' as CurriculumStandard,
    };

    return STANDARD_MAP[standard.toUpperCase()] ?? ('STATE_SPECIFIC' as CurriculumStandard);
  }

  /**
   * Rough cost estimation based on token count and provider
   */
  private estimateCost(tokens: number, provider?: string): number {
    // $/1K tokens (rough estimates for generation prompts)
    const COST_PER_1K: Record<string, number> = {
      google: 0.00025,    // Gemini 1.5 Flash
      openai: 0.015,      // GPT-4o
      anthropic: 0.015,   // Claude 3.5 Sonnet
      ollama: 0,          // Local
    };

    const rate = COST_PER_1K[provider?.toLowerCase() ?? 'google'] ?? 0.005;
    return (tokens / 1000) * rate;
  }
}
