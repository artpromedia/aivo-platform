/**
 * Baseline Completed Event Handler
 *
 * When a learner finishes their baseline assessment, this handler:
 * 1. Transforms skill estimates into the format expected by LearningPathService
 * 2. Calls ai-orchestrator to generate an adaptive learning path
 * 3. Persists the generated path to the database
 *
 * Triggered via:
 * - NATS event `aivo.baseline.completed`
 * - HTTP POST `/api/v1/brain/learners/:learnerId/generate-path`
 */

import { config } from '../config.js';
import { prisma } from '../prisma.js';

// ── Types ────────────────────────────────────────────────────────────────────

interface SkillEstimate {
  skillId: string;
  skillName: string;
  score: number;
  maxScore: number;
}

interface BaselineCompletedPayload {
  learnerId: string;
  tenantId: string;
  assessmentId: string;
  /** Raw skill estimates from the baseline assessment */
  skillEstimates: SkillEstimate[];
  completedAt: string;
  gradeLevel?: number;
}

interface GeneratedLearningPath {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  nodes: unknown[];
  milestones: unknown[];
  metadata: Record<string, unknown>;
}

// ── Handler ──────────────────────────────────────────────────────────────────

/**
 * Handle baseline completion — generate and persist an adaptive learning path.
 *
 * Idempotent: if an ACTIVE path already exists for the learner the call is a
 * no-op and the existing path is returned.
 */
export async function handleBaselineCompleted(
  payload: BaselineCompletedPayload
): Promise<{ pathId: string; alreadyExisted: boolean }> {
  const { learnerId, tenantId, skillEstimates } = payload;

  console.info('[baseline-completed] Processing', { learnerId, tenantId });

  // ── Idempotency: skip if an active path already exists ──────────────────
  const existing = await prisma.learningPath.findFirst({
    where: { learnerId, tenantId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (existing) {
    console.info('[baseline-completed] Active path already exists, skipping', {
      learnerId,
      pathId: existing.id,
    });
    return { pathId: existing.id, alreadyExisted: true };
  }

  // ── Call ai-orchestrator /generate-adaptive-path ─────────────────────────
  const aiOrchestratorUrl = config.services.aiOrchestrator;

  const assessmentResults = skillEstimates.map((se) => ({
    skillId: se.skillId,
    skillName: se.skillName,
    score: se.score,
    maxScore: se.maxScore,
  }));

  let generatedPath: GeneratedLearningPath;

  try {
    const response = await fetch(`${aiOrchestratorUrl}/api/v1/ai/learning-path/adaptive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentResults,
        targetLevel: resolveTargetLevel(skillEstimates),
        context: { tenantId, userId: learnerId },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`ai-orchestrator returned ${response.status}: ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as { data?: GeneratedLearningPath };
    generatedPath = json.data ?? (json as unknown as GeneratedLearningPath);
  } catch (err) {
    console.error('[baseline-completed] Failed to generate adaptive path', {
      learnerId,
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }

  // ── Persist to database ──────────────────────────────────────────────────
  const estimatedMinutes = parseDurationToMinutes(generatedPath.estimatedDuration);

  const path = await prisma.learningPath.create({
    data: {
      id: generatedPath.id,
      learnerId,
      tenantId,
      name: generatedPath.title,
      description: generatedPath.description,
      status: 'ACTIVE',
      activities: {
        orderedActivities: generatedPath.nodes,
        branchingPoints: [],
      },
      estimatedDuration: estimatedMinutes,
      metadata: {
        ...generatedPath.metadata,
        milestones: generatedPath.milestones,
        source: 'baseline-assessment',
        assessmentId: payload.assessmentId,
      },
      progress: {
        create: {
          completedActivityIds: [],
          totalProgress: 0,
          estimatedTimeRemaining: estimatedMinutes,
        },
      },
    },
  });

  console.info('[baseline-completed] Learning path created', {
    learnerId,
    pathId: path.id,
    nodeCount: generatedPath.nodes.length,
    milestoneCount: generatedPath.milestones.length,
  });

  return { pathId: path.id, alreadyExisted: false };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine target difficulty level from the aggregate baseline score.
 */
function resolveTargetLevel(skills: SkillEstimate[]): 'beginner' | 'intermediate' | 'advanced' {
  if (skills.length === 0) return 'beginner';

  const avgPct = skills.reduce((sum, s) => sum + s.score / s.maxScore, 0) / skills.length;

  if (avgPct >= 0.8) return 'advanced';
  if (avgPct >= 0.5) return 'intermediate';
  return 'beginner';
}

/**
 * Parse a human-friendly duration string ("4 weeks", "2 hours") into minutes.
 */
function parseDurationToMinutes(duration: string): number {
  const lower = duration.toLowerCase();
  const num = parseFloat(lower) || 4;

  if (lower.includes('week')) return num * 7 * 60;
  if (lower.includes('day')) return num * 60;
  if (lower.includes('hour')) return num * 60;
  if (lower.includes('min')) return num;
  // default: treat as weeks
  return num * 7 * 60;
}
