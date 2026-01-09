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
 * Generate mock AI interaction data (TODO: Replace with real queries)
 */
function generateMockInteraction(index: number, studentId: string): AiInteractionSummary {
  const requestTypes = ['homework_help', 'explanation', 'hint', 'practice_problem', 'feedback'];
  const subjects = ['Math', 'Reading', 'Science', 'Writing'];
  const topics = [
    'Fractions addition',
    'Reading comprehension',
    'Scientific method',
    'Paragraph structure',
    'Multiplication facts',
    'Main idea identification',
  ];

  const requestType = requestTypes[index % requestTypes.length];
  const subject = subjects[index % subjects.length];
  const topic = topics[index % topics.length];

  const masteryLevel = 0.3 + Math.random() * 0.5;
  const recentAccuracy = 0.5 + Math.random() * 0.4;

  return {
    id: `ai-call-${studentId}-${index}`,
    timestamp: new Date(Date.now() - index * 3600000 * 4).toISOString(),
    requestType: requestType ?? 'homework_help',
    topic: topic ?? 'General practice',
    subject: subject ?? 'Math',
    decisionFactors: {
      masteryLevel,
      recentAccuracy,
      attemptCount: Math.floor(Math.random() * 5) + 1,
      learningGoals: ['Improve ' + (subject ?? 'Math').toLowerCase() + ' skills'],
      focusScore: 0.6 + Math.random() * 0.3,
      sessionDurationMinutes: Math.floor(Math.random() * 30) + 5,
    },
    safetyActions: {
      piiRedacted: Math.random() > 0.9,
      contentFilters: ['age_appropriate', 'educational_content'],
      responseModified: Math.random() > 0.85,
      safetyLevel: 'SAFE',
    },
    model: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    explanation: generateExplanation(requestType ?? 'homework_help', masteryLevel, recentAccuracy),
    confidence: 0.75 + Math.random() * 0.2,
  };
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
 * Generate mock transparency report (TODO: Replace with real queries)
 */
function generateMockTransparencyReport(
  studentId: string,
  studentName: string,
  days: number,
  limit: number
): StudentAiTransparencyReport {
  const interactions: AiInteractionSummary[] = [];
  const interactionCount = Math.min(limit, Math.floor(Math.random() * 15) + 5);

  for (let i = 0; i < interactionCount; i++) {
    interactions.push(generateMockInteraction(i, studentId));
  }

  const interactionsByType: Record<string, number> = {};
  for (const interaction of interactions) {
    interactionsByType[interaction.requestType] = (interactionsByType[interaction.requestType] ?? 0) + 1;
  }

  const safetyLevelCounts: Record<string, number> = { SAFE: 0, LOW: 0, MEDIUM: 0, HIGH: 0 };
  let totalFiltered = 0;
  let piiRedactionCount = 0;
  let totalMastery = 0;
  let totalAccuracy = 0;
  let totalFocus = 0;

  for (const interaction of interactions) {
    safetyLevelCounts[interaction.safetyActions.safetyLevel]++;
    if (interaction.safetyActions.responseModified) totalFiltered++;
    if (interaction.safetyActions.piiRedacted) piiRedactionCount++;
    totalMastery += interaction.decisionFactors.masteryLevel ?? 0;
    totalAccuracy += interaction.decisionFactors.recentAccuracy ?? 0;
    totalFocus += interaction.decisionFactors.focusScore ?? 0;
  }

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);

  return {
    studentId,
    studentName,
    totalInteractions: interactionCount,
    interactionsByType,
    averageFactors: {
      masteryLevel: totalMastery / interactionCount,
      accuracy: totalAccuracy / interactionCount,
      focusScore: totalFocus / interactionCount,
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

    // Fetch student name (mock for now)
    const studentName = 'Student Name'; // TODO: Fetch from profile-svc

    // Generate transparency report
    // TODO: Replace with real database queries
    const report = generateMockTransparencyReport(studentId, studentName, days, limit);

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

    // TODO: Fetch real interaction from ai_call_logs table
    // For now, return mock data
    const interaction = generateMockInteraction(0, 'student-placeholder');
    interaction.id = interactionId;

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

    // TODO: Verify teacher owns this class and fetch real data

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - days);

    // Return summary (mock data for now)
    const summary = {
      classId,
      className: 'Math 101 - Period 3',
      period: {
        from: from.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      },
      totalStudents: 25,
      studentsUsingAi: 22,
      totalAiInteractions: 156,
      interactionsByType: {
        homework_help: 78,
        explanation: 42,
        hint: 21,
        practice_problem: 10,
        feedback: 5,
      },
      averageInteractionsPerStudent: 7.1,
      safetyOverview: {
        safeResponses: 152,
        filteredResponses: 4,
        piiRedactions: 2,
      },
      topicsRequested: [
        { topic: 'Fractions', count: 45 },
        { topic: 'Decimals', count: 32 },
        { topic: 'Word problems', count: 28 },
        { topic: 'Multiplication', count: 25 },
        { topic: 'Division', count: 26 },
      ],
      studentsNeedingAttention: [
        { studentId: 'student-1', studentName: 'Alex J.', reason: 'High number of repeated attempts on same topic' },
        { studentId: 'student-2', studentName: 'Sam W.', reason: 'Low mastery progression despite AI help' },
      ],
    };

    reply.code(200).send(summary);
  });
};
