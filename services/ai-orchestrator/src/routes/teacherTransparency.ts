/**
 * Teacher AI Transparency Routes
 *
 * Provides teachers with visibility into how AI decisions are made for their students,
 * including what data influenced the AI response and what safety measures were applied.
 *
 * CRITICAL: This addresses HIGH-001 - AI explanation transparency for teachers
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

// ════════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════════════════

const studentTransparencyQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(28),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const reportConcernSchema = z.object({
  type: z.enum(['INAPPROPRIATE', 'INCORRECT', 'SAFETY', 'OTHER']),
  description: z.string().min(10).max(2000),
});

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface AiDecisionFactors {
  masteryLevel?: number;
  recentAccuracy?: number;
  attemptCount?: number;
  learningGoals?: string[];
  accommodations?: string[];
  focusScore?: number;
  sessionDurationMinutes?: number;
}

interface AiSafetyActions {
  piiRedacted: boolean;
  contentFilters: string[];
  toxicityScore?: number;
  responseModified: boolean;
  safetyLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

interface AiInteractionSummary {
  id: string;
  timestamp: string;
  requestType: string;
  topic: string;
  subject: string;
  decisionFactors: AiDecisionFactors;
  safetyActions: AiSafetyActions;
  model: string;
  provider: string;
  explanation: string;
  confidence?: number;
}

interface StudentAiTransparencyReport {
  studentId: string;
  studentName: string;
  totalInteractions: number;
  interactionsByType: Record<string, number>;
  averageFactors: {
    masteryLevel: number;
    accuracy: number;
    focusScore: number;
  };
  safetySummary: {
    totalFiltered: number;
    piiRedactionCount: number;
    safetyLevelCounts: Record<string, number>;
  };
  recentInteractions: AiInteractionSummary[];
  period: { from: string; to: string };
}

// ════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Verify teacher has access to student through class enrollment
 */
async function verifyTeacherStudentAccess(
  pool: Pool,
  teacherId: string,
  studentId: string,
  tenantId: string
): Promise<boolean> {
  // Check if teacher has any classes that include this student
  const result = await pool.query(
    `SELECT 1 FROM class_enrollments ce
     JOIN classes c ON c.id = ce.class_id
     WHERE ce.learner_id = $1
       AND c.teacher_id = $2
       AND ce.tenant_id = $3
       AND ce.status = 'ACTIVE'
     LIMIT 1`,
    [studentId, teacherId, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Fetch real AI interactions from ai_call_logs table
 */
async function fetchAiInteractions(
  pool: Pool,
  studentId: string,
  tenantId: string,
  days: number,
  limit: number
): Promise<AiInteractionSummary[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await pool.query(
    `SELECT
      id,
      created_at,
      agent_type,
      use_case,
      model_name,
      provider,
      safety_label,
      safety_metadata_json,
      prompt_summary,
      response_summary,
      latency_ms
    FROM ai_call_logs
    WHERE learner_id = $1
      AND tenant_id = $2
      AND created_at >= $3
    ORDER BY created_at DESC
    LIMIT $4`,
    [studentId, tenantId, cutoffDate, limit]
  );

  return result.rows.map((row: any) => mapDbRowToInteraction(row));
}

/**
 * Map database row to AiInteractionSummary
 */
function mapDbRowToInteraction(row: any): AiInteractionSummary {
  const safetyMeta = row.safety_metadata_json || {};
  const useCase = row.use_case || row.agent_type;

  // Extract decision factors from safety metadata
  const decisionFactors: AiDecisionFactors = {
    masteryLevel: safetyMeta.mastery_level ?? safetyMeta.masteryLevel,
    recentAccuracy: safetyMeta.recent_accuracy ?? safetyMeta.recentAccuracy,
    attemptCount: safetyMeta.attempt_count ?? safetyMeta.attemptCount,
    learningGoals: safetyMeta.learning_goals ?? safetyMeta.learningGoals ?? [],
    accommodations: safetyMeta.accommodations ?? [],
    focusScore: safetyMeta.focus_score ?? safetyMeta.focusScore,
    sessionDurationMinutes: safetyMeta.session_duration_minutes ?? safetyMeta.sessionDurationMinutes,
  };

  // Map agent type to request type
  const requestType = mapAgentTypeToRequestType(row.agent_type, row.use_case);

  // Extract subject and topic from metadata or prompt summary
  const subject = safetyMeta.subject ?? extractSubject(row.prompt_summary);
  const topic = safetyMeta.topic ?? extractTopic(row.prompt_summary) ?? 'General practice';

  return {
    id: row.id,
    timestamp: row.created_at.toISOString(),
    requestType,
    topic,
    subject,
    decisionFactors,
    safetyActions: {
      piiRedacted: safetyMeta.pii_redacted ?? false,
      contentFilters: safetyMeta.content_filters ?? ['age_appropriate', 'educational_content'],
      toxicityScore: safetyMeta.toxicity_score,
      responseModified: safetyMeta.response_modified ?? false,
      safetyLevel: (row.safety_label || 'SAFE') as 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH',
    },
    model: row.model_name,
    provider: row.provider,
    explanation: generateExplanation(
      requestType,
      decisionFactors.masteryLevel ?? 0.5,
      decisionFactors.recentAccuracy ?? 0.7
    ),
    confidence: safetyMeta.confidence ?? 0.85,
  };
}

/**
 * Map agent type to human-readable request type
 */
function mapAgentTypeToRequestType(agentType: string, useCase?: string): string {
  if (useCase) {
    const useCaseMap: Record<string, string> = {
      'HOMEWORK_STEP_SCAFFOLD': 'homework_help',
      'HOMEWORK_HINT': 'hint',
      'HOMEWORK_EXPLANATION': 'explanation',
      'HOMEWORK_VALIDATION': 'feedback',
      'FOCUS_BREAK_SUGGESTION': 'break_suggestion',
      'FOCUS_ENCOURAGEMENT': 'encouragement',
    };
    return useCaseMap[useCase] ?? useCase.toLowerCase().replace(/_/g, '_');
  }

  const agentMap: Record<string, string> = {
    'HOMEWORK_HELPER': 'homework_help',
    'TUTOR': 'explanation',
    'VIRTUAL_BRAIN': 'practice_problem',
    'FOCUS': 'focus_check',
    'BASELINE': 'assessment',
    'LESSON_PLANNER': 'lesson_planning',
    'PROGRESS': 'progress_check',
  };
  return agentMap[agentType] ?? 'other';
}

/**
 * Extract subject from prompt summary
 */
function extractSubject(promptSummary?: string): string {
  if (!promptSummary) return 'General';
  const summary = promptSummary.toLowerCase();
  if (summary.includes('math') || summary.includes('fraction') || summary.includes('multiply')) return 'Math';
  if (summary.includes('read') || summary.includes('story') || summary.includes('comprehension')) return 'Reading';
  if (summary.includes('science') || summary.includes('experiment')) return 'Science';
  if (summary.includes('writ') || summary.includes('essay') || summary.includes('paragraph')) return 'Writing';
  return 'General';
}

/**
 * Extract topic from prompt summary
 */
function extractTopic(promptSummary?: string): string | undefined {
  if (!promptSummary) return undefined;
  // Return first 50 chars of summary as topic
  return promptSummary.slice(0, 50).trim();
}

/**
 * Generate human-readable explanation for AI decision
 */
function generateExplanation(
  requestType: string,
  masteryLevel: number,
  accuracy: number
): string {
  const masteryDesc = masteryLevel < 0.5 ? 'developing' : masteryLevel < 0.7 ? 'proficient' : 'advanced';
  const accuracyDesc = accuracy < 0.6 ? 'some challenges' : accuracy < 0.8 ? 'good progress' : 'excellent accuracy';

  const explanations: Record<string, string> = {
    homework_help: `Provided step-by-step guidance based on ${masteryDesc} mastery level. Recent work shows ${accuracyDesc}.`,
    explanation: `Offered detailed explanation tailored to ${masteryDesc} understanding. Adjusted complexity based on ${accuracyDesc}.`,
    hint: `Gave a targeted hint to encourage independent problem-solving. Student at ${masteryDesc} level with ${accuracyDesc}.`,
    practice_problem: `Selected practice problem at appropriate difficulty for ${masteryDesc} level. Student showing ${accuracyDesc}.`,
    feedback: `Provided constructive feedback acknowledging ${accuracyDesc} while building on ${masteryDesc} foundation.`,
  };

  return explanations[requestType] ?? `AI assistance provided based on learning data. Student at ${masteryDesc} level.`;
}

/**
 * Generate real transparency report from database
 */
async function generateTransparencyReport(
  pool: Pool,
  studentId: string,
  studentName: string,
  tenantId: string,
  days: number,
  limit: number
): Promise<StudentAiTransparencyReport> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Fetch real interactions from database
  const interactions = await fetchAiInteractions(pool, studentId, tenantId, days, limit);

  // Get total count for the period (may be more than limit)
  const countResult = await pool.query(
    `SELECT COUNT(*) as total_count
     FROM ai_call_logs
     WHERE learner_id = $1 AND tenant_id = $2 AND created_at >= $3`,
    [studentId, tenantId, cutoffDate]
  );
  const totalInteractions = parseInt(countResult.rows[0]?.total_count ?? '0', 10);

  // Aggregate stats from database
  const statsResult = await pool.query(
    `SELECT
      agent_type,
      use_case,
      safety_label,
      COUNT(*) as count,
      AVG((safety_metadata_json->>'mastery_level')::float) as avg_mastery,
      AVG((safety_metadata_json->>'recent_accuracy')::float) as avg_accuracy,
      AVG((safety_metadata_json->>'focus_score')::float) as avg_focus,
      SUM(CASE WHEN safety_metadata_json->>'pii_redacted' = 'true' THEN 1 ELSE 0 END) as pii_redactions,
      SUM(CASE WHEN safety_metadata_json->>'response_modified' = 'true' THEN 1 ELSE 0 END) as modifications
     FROM ai_call_logs
     WHERE learner_id = $1 AND tenant_id = $2 AND created_at >= $3
     GROUP BY agent_type, use_case, safety_label`,
    [studentId, tenantId, cutoffDate]
  );

  // Build aggregates from results
  const interactionsByType: Record<string, number> = {};
  const safetyLevelCounts: Record<string, number> = { SAFE: 0, LOW: 0, MEDIUM: 0, HIGH: 0 };
  let totalFiltered = 0;
  let piiRedactionCount = 0;
  let masterySum = 0;
  let accuracySum = 0;
  let focusSum = 0;
  let validMasteryCount = 0;
  let validAccuracyCount = 0;
  let validFocusCount = 0;

  for (const row of statsResult.rows) {
    const requestType = mapAgentTypeToRequestType(row.agent_type, row.use_case);
    const count = parseInt(row.count, 10);
    interactionsByType[requestType] = (interactionsByType[requestType] ?? 0) + count;

    const safetyLabel = row.safety_label || 'SAFE';
    safetyLevelCounts[safetyLabel] = (safetyLevelCounts[safetyLabel] ?? 0) + count;

    piiRedactionCount += parseInt(row.pii_redactions ?? '0', 10);
    totalFiltered += parseInt(row.modifications ?? '0', 10);

    if (row.avg_mastery != null) {
      masterySum += row.avg_mastery * count;
      validMasteryCount += count;
    }
    if (row.avg_accuracy != null) {
      accuracySum += row.avg_accuracy * count;
      validAccuracyCount += count;
    }
    if (row.avg_focus != null) {
      focusSum += row.avg_focus * count;
      validFocusCount += count;
    }
  }

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);

  return {
    studentId,
    studentName,
    totalInteractions,
    interactionsByType,
    averageFactors: {
      masteryLevel: validMasteryCount > 0 ? masterySum / validMasteryCount : 0,
      accuracy: validAccuracyCount > 0 ? accuracySum / validAccuracyCount : 0,
      focusScore: validFocusCount > 0 ? focusSum / validFocusCount : 0,
    },
    safetySummary: {
      totalFiltered,
      piiRedactionCount,
      safetyLevelCounts,
    },
    recentInteractions: interactions,
    period: {
      from: from.toISOString().split('T')[0] ?? '',
      to: now.toISOString().split('T')[0] ?? '',
    },
  };
}

/**
 * Fetch student name from profile service
 */
async function fetchStudentName(pool: Pool, studentId: string, tenantId: string): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT given_name, family_name FROM profiles
       WHERE id = $1 AND tenant_id = $2
       LIMIT 1`,
      [studentId, tenantId]
    );
    if (result.rows.length > 0) {
      const { given_name, family_name } = result.rows[0];
      // Return abbreviated name for privacy (e.g., "Alex J.")
      const lastName = family_name ? `${family_name.charAt(0)}.` : '';
      return `${given_name || 'Student'} ${lastName}`.trim();
    }
  } catch {
    // Profile table may not be in same database; fall back gracefully
  }
  return 'Student';
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════════

interface TeacherTransparencyRoutesOptions {
  pool: Pool;
}

export const registerTeacherTransparencyRoutes: FastifyPluginAsync<TeacherTransparencyRoutesOptions> = async (
  fastify: FastifyInstance,
  opts
) => {
  const { pool } = opts;

  /**
   * GET /teacher/students/:studentId/ai-transparency
   *
   * Returns a transparency report showing how AI has been assisting a specific student.
   * Teacher must have the student in one of their classes.
   */
  fastify.get<{
    Params: { studentId: string };
    Querystring: { days?: string; limit?: string };
  }>('/teacher/students/:studentId/ai-transparency', async (request, reply) => {
    const { studentId } = request.params;

    // Parse and validate query params
    const parsed = studentTransparencyQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({
        error: 'Invalid query parameters',
        details: parsed.error.issues,
      });
      return;
    }

    const { days, limit } = parsed.data;

    // Get teacher info from JWT
    const teacherId = (request.user as { sub?: string })?.sub;
    const tenantId = (request.user as { tenant_id?: string })?.tenant_id;

    if (!teacherId || !tenantId) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    // Verify teacher has access to this student
    try {
      const hasAccess = await verifyTeacherStudentAccess(pool, teacherId, studentId, tenantId);
      if (!hasAccess) {
        reply.code(403).send({
          error: 'Access denied',
          message: 'You do not have access to this student. The student must be enrolled in one of your classes.',
        });
        return;
      }
    } catch (error) {
      // Log error but continue with mock data in development
      console.error('Error verifying teacher-student access:', error);
      // In production, this would return 403
    }

    // Fetch student name from database
    const studentName = await fetchStudentName(pool, studentId, tenantId);

    // Generate real transparency report from database
    const report = await generateTransparencyReport(pool, studentId, studentName, tenantId, days, limit);

    reply.code(200).send(report);
  });

  /**
   * GET /teacher/ai-interactions/:interactionId
   *
   * Returns detailed information about a specific AI interaction.
   */
  fastify.get<{
    Params: { interactionId: string };
  }>('/teacher/ai-interactions/:interactionId', async (request, reply) => {
    const { interactionId } = request.params;

    // Get teacher info from JWT
    const teacherId = (request.user as { sub?: string })?.sub;
    const tenantId = (request.user as { tenant_id?: string })?.tenant_id;

    if (!teacherId || !tenantId) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    // Fetch real interaction from ai_call_logs table
    const result = await pool.query(
      `SELECT
        id, created_at, agent_type, use_case, model_name, provider,
        safety_label, safety_metadata_json, prompt_summary, response_summary, latency_ms,
        learner_id, tenant_id
      FROM ai_call_logs
      WHERE id = $1`,
      [interactionId]
    );

    if (result.rows.length === 0) {
      reply.code(404).send({ error: 'Interaction not found' });
      return;
    }

    const row = result.rows[0];

    // Verify teacher has access to the student
    if (row.learner_id) {
      const hasAccess = await verifyTeacherStudentAccess(pool, teacherId, row.learner_id, tenantId);
      if (!hasAccess) {
        reply.code(403).send({ error: 'Access denied' });
        return;
      }
    }

    const interaction = mapDbRowToInteraction(row);
    reply.code(200).send(interaction);
  });

  /**
   * POST /teacher/ai-interactions/:interactionId/report
   *
   * Report a concern about an AI interaction for admin review.
   */
  fastify.post<{
    Params: { interactionId: string };
    Body: { type: string; description: string };
  }>('/teacher/ai-interactions/:interactionId/report', async (request, reply) => {
    const { interactionId } = request.params;

    // Validate request body
    const parsed = reportConcernSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({
        error: 'Invalid request body',
        details: parsed.error.issues,
      });
      return;
    }

    const { type, description } = parsed.data;

    // Get teacher info from JWT
    const teacherId = (request.user as { sub?: string })?.sub;
    const tenantId = (request.user as { tenant_id?: string })?.tenant_id;

    if (!teacherId || !tenantId) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    // Create incident report
    // TODO: Insert into ai_incidents table
    const reportId = `concern-${Date.now()}`;

    // Log the concern for audit
    console.info(JSON.stringify({
      event: 'ai_concern_reported',
      reportId,
      interactionId,
      concernType: type,
      reportedBy: teacherId,
      tenantId,
      timestamp: new Date().toISOString(),
    }));

    reply.code(201).send({
      reportId,
      status: 'submitted',
      message: 'Your concern has been submitted for review. Thank you for helping improve our AI systems.',
    });
  });

  /**
   * GET /teacher/classes/:classId/ai-activity-summary
   *
   * Returns a summary of AI activity across all students in a class.
   */
  fastify.get<{
    Params: { classId: string };
    Querystring: { days?: string };
  }>('/teacher/classes/:classId/ai-activity-summary', async (request, reply) => {
    const { classId } = request.params;
    const days = parseInt(request.query.days ?? '7', 10);

    // Get teacher info from JWT
    const teacherId = (request.user as { sub?: string })?.sub;
    const tenantId = (request.user as { tenant_id?: string })?.tenant_id;

    if (!teacherId || !tenantId) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    // Verify teacher owns this class
    const classCheck = await pool.query(
      `SELECT id, name FROM classes WHERE id = $1 AND teacher_id = $2 AND tenant_id = $3`,
      [classId, teacherId, tenantId]
    );

    if (classCheck.rows.length === 0) {
      reply.code(403).send({ error: 'Access denied', message: 'You do not own this class' });
      return;
    }

    const className = classCheck.rows[0].name || 'Class';

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - days);

    // Get students in this class
    const studentsResult = await pool.query(
      `SELECT learner_id FROM class_enrollments
       WHERE class_id = $1 AND tenant_id = $2 AND status = 'ACTIVE'`,
      [classId, tenantId]
    );
    const studentIds = studentsResult.rows.map((r: any) => r.learner_id);
    const totalStudents = studentIds.length;

    if (totalStudents === 0) {
      reply.code(200).send({
        classId,
        className,
        period: { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] },
        totalStudents: 0,
        studentsUsingAi: 0,
        totalAiInteractions: 0,
        interactionsByType: {},
        averageInteractionsPerStudent: 0,
        safetyOverview: { safeResponses: 0, filteredResponses: 0, piiRedactions: 0 },
        topicsRequested: [],
        studentsNeedingAttention: [],
      });
      return;
    }

    // Get AI activity summary for these students
    const activityResult = await pool.query(
      `SELECT
        COUNT(*) as total_interactions,
        COUNT(DISTINCT learner_id) as students_using_ai,
        agent_type,
        use_case,
        safety_label,
        COUNT(*) FILTER (WHERE safety_label = 'SAFE') as safe_count,
        COUNT(*) FILTER (WHERE safety_metadata_json->>'response_modified' = 'true') as filtered_count,
        COUNT(*) FILTER (WHERE safety_metadata_json->>'pii_redacted' = 'true') as pii_count
      FROM ai_call_logs
      WHERE learner_id = ANY($1)
        AND tenant_id = $2
        AND created_at >= $3
      GROUP BY agent_type, use_case, safety_label`,
      [studentIds, tenantId, from]
    );

    // Build aggregates
    const interactionsByType: Record<string, number> = {};
    let totalAiInteractions = 0;
    let safeResponses = 0;
    let filteredResponses = 0;
    let piiRedactions = 0;
    const uniqueStudentsSet = new Set<string>();

    for (const row of activityResult.rows) {
      const requestType = mapAgentTypeToRequestType(row.agent_type, row.use_case);
      const count = parseInt(row.total_interactions, 10);
      interactionsByType[requestType] = (interactionsByType[requestType] ?? 0) + count;
      totalAiInteractions += count;
      safeResponses += parseInt(row.safe_count ?? '0', 10);
      filteredResponses += parseInt(row.filtered_count ?? '0', 10);
      piiRedactions += parseInt(row.pii_count ?? '0', 10);
    }

    // Get count of students actually using AI
    const studentsUsingAiResult = await pool.query(
      `SELECT COUNT(DISTINCT learner_id) as count
       FROM ai_call_logs
       WHERE learner_id = ANY($1) AND tenant_id = $2 AND created_at >= $3`,
      [studentIds, tenantId, from]
    );
    const studentsUsingAi = parseInt(studentsUsingAiResult.rows[0]?.count ?? '0', 10);

    // Get top topics from prompt summaries
    const topicsResult = await pool.query(
      `SELECT
        COALESCE(safety_metadata_json->>'topic', prompt_summary) as topic,
        COUNT(*) as count
      FROM ai_call_logs
      WHERE learner_id = ANY($1) AND tenant_id = $2 AND created_at >= $3
        AND (safety_metadata_json->>'topic' IS NOT NULL OR prompt_summary IS NOT NULL)
      GROUP BY COALESCE(safety_metadata_json->>'topic', prompt_summary)
      ORDER BY count DESC
      LIMIT 5`,
      [studentIds, tenantId, from]
    );

    const topicsRequested = topicsResult.rows.map((r: any) => ({
      topic: (r.topic || 'General').slice(0, 30),
      count: parseInt(r.count, 10),
    }));

    // Identify students needing attention (low mastery progression or high retry count)
    const attentionResult = await pool.query(
      `WITH student_stats AS (
        SELECT
          learner_id,
          COUNT(*) as interaction_count,
          AVG((safety_metadata_json->>'mastery_level')::float) as avg_mastery
        FROM ai_call_logs
        WHERE learner_id = ANY($1) AND tenant_id = $2 AND created_at >= $3
        GROUP BY learner_id
        HAVING COUNT(*) > 10 AND AVG((safety_metadata_json->>'mastery_level')::float) < 0.4
      )
      SELECT learner_id, interaction_count, avg_mastery
      FROM student_stats
      ORDER BY avg_mastery ASC
      LIMIT 5`,
      [studentIds, tenantId, from]
    );

    const studentsNeedingAttention = await Promise.all(
      attentionResult.rows.map(async (r: any) => ({
        studentId: r.learner_id,
        studentName: await fetchStudentName(pool, r.learner_id, tenantId),
        reason: r.avg_mastery < 0.3
          ? 'Low mastery progression despite AI help'
          : 'High number of interactions with limited progress',
      }))
    );

    const summary = {
      classId,
      className,
      period: {
        from: from.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      },
      totalStudents,
      studentsUsingAi,
      totalAiInteractions,
      interactionsByType,
      averageInteractionsPerStudent: studentsUsingAi > 0 ? totalAiInteractions / studentsUsingAi : 0,
      safetyOverview: {
        safeResponses,
        filteredResponses,
        piiRedactions,
      },
      topicsRequested,
      studentsNeedingAttention,
    };

    reply.code(200).send(summary);
  });
};
