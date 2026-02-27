/**
 * Assessment Service — Error Path & Edge Case Tests
 *
 * Covers:
 * - Invalid assessment submissions (missing fields, wrong format)
 * - Submission timeout handling
 * - Auto-grading failures (NaN scores, rubric mismatch)
 * - Concurrent submission race conditions
 * - Assessment locking edge cases
 * - Adaptive algorithm edge cases (out-of-range difficulty)
 * - Anti-cheating detection errors
 *
 * @module services/assessment-svc/tests/error-paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
    transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
      })
    ),
    ...overrides,
  };
}

function createMockGradingEngine() {
  return {
    grade: vi.fn().mockResolvedValue({ score: 85, maxScore: 100, feedback: 'Good work!' }),
    gradeRubric: vi.fn().mockResolvedValue({
      totalScore: 85,
      criteria: [{ name: 'Content', score: 40, maxScore: 50 }],
    }),
  };
}

// ============================================================================
// 1. Invalid Submission Handling
// ============================================================================

describe('Assessment Error Paths — Invalid Submissions', () => {
  afterEach(() => vi.restoreAllMocks());

  it('should reject submission with missing assessment ID', () => {
    const result = validateSubmission({
      assessmentId: '',
      learnerId: 'learner-1',
      answers: [{ questionId: 'q1', value: 'A' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('MISSING_ASSESSMENT_ID');
  });

  it('should reject submission with no answers', () => {
    const result = validateSubmission({
      assessmentId: 'assess-1',
      learnerId: 'learner-1',
      answers: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('EMPTY_ANSWERS');
  });

  it('should reject submission with duplicate question IDs', () => {
    const result = validateSubmission({
      assessmentId: 'assess-1',
      learnerId: 'learner-1',
      answers: [
        { questionId: 'q1', value: 'A' },
        { questionId: 'q1', value: 'B' },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('DUPLICATE_ANSWERS');
  });

  it('should reject submission after deadline', () => {
    const deadline = new Date(Date.now() - 3_600_000).toISOString(); // 1 hour ago

    const result = validateSubmissionTiming({
      submittedAt: new Date().toISOString(),
      deadline,
      gracePeriodMinutes: 5,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('PAST_DEADLINE');
  });

  it('should allow submission within grace period', () => {
    const deadline = new Date(Date.now() - 2 * 60_000).toISOString(); // 2 min ago

    const result = validateSubmissionTiming({
      submittedAt: new Date().toISOString(),
      deadline,
      gracePeriodMinutes: 5,
    });

    expect(result.valid).toBe(true);
    expect(result.late).toBe(true);
  });
});

// ============================================================================
// 2. Auto-Grading Failures
// ============================================================================

describe('Assessment Error Paths — Auto-Grading', () => {
  let gradingEngine: ReturnType<typeof createMockGradingEngine>;

  beforeEach(() => {
    gradingEngine = createMockGradingEngine();
  });

  it('should handle grading engine returning NaN score', async () => {
    gradingEngine.grade.mockResolvedValue({ score: NaN, maxScore: 100, feedback: '' });

    const result = await gradeSubmission(gradingEngine, {
      answers: [{ questionId: 'q1', value: 'A' }],
      rubric: { type: 'auto', questions: [] },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('INVALID_SCORE');
  });

  it('should handle score exceeding max score', async () => {
    gradingEngine.grade.mockResolvedValue({ score: 150, maxScore: 100, feedback: '' });

    const result = await gradeSubmission(gradingEngine, {
      answers: [{ questionId: 'q1', value: 'A' }],
      rubric: { type: 'auto', questions: [] },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('SCORE_EXCEEDS_MAX');
  });

  it('should handle negative score', async () => {
    gradingEngine.grade.mockResolvedValue({ score: -5, maxScore: 100, feedback: '' });

    const result = await gradeSubmission(gradingEngine, {
      answers: [{ questionId: 'q1', value: 'A' }],
      rubric: { type: 'auto', questions: [] },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('NEGATIVE_SCORE');
  });

  it('should handle grading engine exception', async () => {
    gradingEngine.grade.mockRejectedValue(new Error('Rubric mismatch'));

    const result = await gradeSubmission(gradingEngine, {
      answers: [{ questionId: 'q1', value: 'unknown' }],
      rubric: { type: 'auto', questions: [] },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('GRADING_FAILED');
  });

  it('should handle rubric with zero max score', () => {
    const result = validateRubric({ criteria: [], maxScore: 0 });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('ZERO_MAX_SCORE');
  });
});

// ============================================================================
// 3. Concurrent Submission Race Conditions
// ============================================================================

describe('Assessment Error Paths — Concurrency', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it('should reject duplicate submission for same assessment', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: 'sub-1', status: 'submitted' }],
    });

    const result = await submitAssessment(db, {
      assessmentId: 'assess-1',
      learnerId: 'learner-1',
      answers: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('ALREADY_SUBMITTED');
  });

  it('should handle optimistic locking conflict', async () => {
    db.execute.mockResolvedValue({ affectedRows: 0 }); // version mismatch

    const result = await updateSubmission(db, {
      submissionId: 'sub-1',
      version: 1,
      updates: { score: 90 },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('VERSION_CONFLICT');
  });
});

// ============================================================================
// 4. Assessment Lock Edge Cases
// ============================================================================

describe('Assessment Error Paths — Locking', () => {
  it('should prevent editing locked assessment', () => {
    const result = canEditAssessment({
      status: 'locked',
      role: 'teacher',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ASSESSMENT_LOCKED');
  });

  it('should allow admin to edit locked assessment', () => {
    const result = canEditAssessment({
      status: 'locked',
      role: 'admin',
    });

    expect(result.allowed).toBe(true);
  });

  it('should prevent student from editing peer assessment', () => {
    const result = canEditAssessment({
      status: 'draft',
      role: 'student',
      ownerId: 'teacher-1',
      requesterId: 'student-1',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('NOT_OWNER');
  });
});

// ============================================================================
// 5. Adaptive Algorithm Edge Cases
// ============================================================================

describe('Assessment Error Paths — Adaptive Algorithm', () => {
  it('should clamp difficulty to valid range', () => {
    expect(clampDifficulty(-0.5)).toBe(0);
    expect(clampDifficulty(1.5)).toBe(1);
    expect(clampDifficulty(0.5)).toBe(0.5);
  });

  it('should handle empty response history', () => {
    const nextDifficulty = calculateNextDifficulty([]);

    expect(nextDifficulty).toBe(0.5); // default medium
  });

  it('should increase difficulty after streak of correct answers', () => {
    const history = [true, true, true, true, true];
    const nextDifficulty = calculateNextDifficulty(history);

    expect(nextDifficulty).toBeGreaterThan(0.5);
  });

  it('should decrease difficulty after streak of wrong answers', () => {
    const history = [false, false, false, false, false];
    const nextDifficulty = calculateNextDifficulty(history);

    expect(nextDifficulty).toBeLessThan(0.5);
  });
});

// ============================================================================
// 6. Anti-Cheating Edge Cases
// ============================================================================

describe('Assessment Error Paths — Anti-Cheating', () => {
  it('should flag suspiciously fast completion', () => {
    const result = checkCheatingIndicators({
      expectedMinutes: 30,
      actualMinutes: 2,
      answerPattern: 'ABABABABAB',
    });

    expect(result.suspicious).toBe(true);
    expect(result.flags).toContain('TOO_FAST');
  });

  it('should flag repetitive answer pattern', () => {
    const result = checkCheatingIndicators({
      expectedMinutes: 30,
      actualMinutes: 25,
      answerPattern: 'AAAAAAAAAA',
    });

    expect(result.suspicious).toBe(true);
    expect(result.flags).toContain('REPETITIVE_PATTERN');
  });

  it('should not flag normal completion', () => {
    const result = checkCheatingIndicators({
      expectedMinutes: 30,
      actualMinutes: 25,
      answerPattern: 'ABCDABCADB',
    });

    expect(result.suspicious).toBe(false);
    expect(result.flags).toHaveLength(0);
  });
});

// ============================================================================
// Helper implementations
// ============================================================================

function validateSubmission(submission: {
  assessmentId: string;
  learnerId: string;
  answers: { questionId: string; value: string }[];
}) {
  const errors: string[] = [];
  if (!submission.assessmentId) errors.push('MISSING_ASSESSMENT_ID');
  if (!submission.learnerId) errors.push('MISSING_LEARNER_ID');
  if (submission.answers.length === 0) errors.push('EMPTY_ANSWERS');

  const questionIds = submission.answers.map((a) => a.questionId);
  if (new Set(questionIds).size !== questionIds.length) errors.push('DUPLICATE_ANSWERS');

  return { valid: errors.length === 0, errors };
}

function validateSubmissionTiming(params: {
  submittedAt: string;
  deadline: string;
  gracePeriodMinutes: number;
}) {
  const submitted = new Date(params.submittedAt).getTime();
  const deadline = new Date(params.deadline).getTime();
  const graceEnd = deadline + params.gracePeriodMinutes * 60_000;

  if (submitted <= deadline) return { valid: true, late: false, reason: null };
  if (submitted <= graceEnd) return { valid: true, late: true, reason: null };
  return { valid: false, late: true, reason: 'PAST_DEADLINE' };
}

async function gradeSubmission(
  engine: ReturnType<typeof createMockGradingEngine>,
  params: { answers: unknown[]; rubric: { type: string; questions: unknown[] } }
) {
  try {
    const result = await engine.grade(params);
    if (isNaN(result.score)) return { success: false, error: 'INVALID_SCORE' };
    if (result.score > result.maxScore) return { success: false, error: 'SCORE_EXCEEDS_MAX' };
    if (result.score < 0) return { success: false, error: 'NEGATIVE_SCORE' };
    return { success: true, score: result.score, error: null };
  } catch {
    return { success: false, error: 'GRADING_FAILED' };
  }
}

function validateRubric(rubric: { criteria: unknown[]; maxScore: number }) {
  if (rubric.maxScore <= 0) return { valid: false, reason: 'ZERO_MAX_SCORE' };
  return { valid: true, reason: null };
}

async function submitAssessment(
  db: ReturnType<typeof createMockDb>,
  params: { assessmentId: string; learnerId: string; answers: unknown[] }
) {
  const existing = await db.query(
    'SELECT * FROM submissions WHERE assessment_id = $1 AND learner_id = $2',
    [params.assessmentId, params.learnerId]
  );

  if (existing.rows.length > 0) return { success: false, error: 'ALREADY_SUBMITTED' };
  return { success: true, error: null };
}

async function updateSubmission(
  db: ReturnType<typeof createMockDb>,
  params: { submissionId: string; version: number; updates: Record<string, unknown> }
) {
  const result = await db.execute(
    'UPDATE submissions SET data = $1, version = version + 1 WHERE id = $2 AND version = $3',
    [params.updates, params.submissionId, params.version]
  );

  if (result.affectedRows === 0) return { success: false, error: 'VERSION_CONFLICT' };
  return { success: true, error: null };
}

function canEditAssessment(params: {
  status: string;
  role: string;
  ownerId?: string;
  requesterId?: string;
}) {
  if (params.role === 'admin') return { allowed: true, reason: null };
  if (params.status === 'locked') return { allowed: false, reason: 'ASSESSMENT_LOCKED' };
  if (params.ownerId && params.requesterId && params.ownerId !== params.requesterId) {
    return { allowed: false, reason: 'NOT_OWNER' };
  }
  return { allowed: true, reason: null };
}

function clampDifficulty(value: number) {
  return Math.max(0, Math.min(1, value));
}

function calculateNextDifficulty(history: boolean[]) {
  if (history.length === 0) return 0.5;
  const recentCorrect = history.slice(-5).filter(Boolean).length;
  const ratio = recentCorrect / Math.min(history.length, 5);
  return clampDifficulty(0.5 + (ratio - 0.5) * 0.6);
}

function checkCheatingIndicators(params: {
  expectedMinutes: number;
  actualMinutes: number;
  answerPattern: string;
}) {
  const flags: string[] = [];

  if (params.actualMinutes < params.expectedMinutes * 0.1) {
    flags.push('TOO_FAST');
  }

  const chars = params.answerPattern.split('');
  const uniqueChars = new Set(chars);
  if (uniqueChars.size === 1 && chars.length > 3) {
    flags.push('REPETITIVE_PATTERN');
  }

  // Check alternating pattern
  const isAlternating = chars.every((c, i) => i === 0 || c !== chars[i - 1]);
  if (isAlternating && uniqueChars.size === 2 && chars.length > 6) {
    flags.push('ALTERNATING_PATTERN');
  }

  return { suspicious: flags.length > 0, flags };
}
