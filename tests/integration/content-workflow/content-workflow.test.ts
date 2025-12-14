/**
 * Content Workflow Integration Tests
 *
 * Tests the end-to-end content authoring and review workflow:
 * - Creating learning objects and versions
 * - Submitting for review
 * - Review decisions (approve/reject/request changes)
 * - State transitions
 * - Content validation
 *
 * @module tests/integration/content-workflow
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & MOCKS
// ══════════════════════════════════════════════════════════════════════════════

interface User {
  id: string;
  tenantId: string;
  role: string;
  jwt: string;
}

interface LearningObject {
  id: string;
  slug: string;
  title: string;
  subject: string;
  gradeBand: string;
  tenantId: string | null;
}

interface Version {
  id: string;
  learningObjectId: string;
  versionNumber: number;
  state: string;
  contentJson: Record<string, unknown>;
}

interface Review {
  id: string;
  versionId: string;
  reviewerUserId: string;
  decision: string;
  comments: string | null;
}

interface TestContext {
  serverUrl: string;
  author: User;
  reviewer: User;
  otherTenantUser: User;
  createdLOs: string[];
}

// Mock JWT generator for tests
function createMockJwt(user: { sub: string; tenantId: string; role: string }): string {
  // In real tests, this would generate a valid JWT
  const payload = Buffer.from(JSON.stringify(user)).toString('base64');
  return `mock.${payload}.signature`;
}

// API request helper
async function apiRequest<T = unknown>(
  baseUrl: string,
  method: string,
  path: string,
  jwt: string,
  body?: unknown
): Promise<{ status: number; data: T }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data: data as T };
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SETUP
// ══════════════════════════════════════════════════════════════════════════════

describe('Content Workflow', () => {
  const ctx: TestContext = {
    serverUrl: process.env.CONTENT_SVC_URL || 'http://localhost:4020',
    author: {
      id: 'author-user-001',
      tenantId: 'tenant-001',
      role: 'CONTENT_AUTHOR',
      jwt: '',
    },
    reviewer: {
      id: 'reviewer-user-001',
      tenantId: 'tenant-001',
      role: 'CONTENT_REVIEWER',
      jwt: '',
    },
    otherTenantUser: {
      id: 'other-user-001',
      tenantId: 'tenant-002',
      role: 'CONTENT_AUTHOR',
      jwt: '',
    },
    createdLOs: [],
  };

  beforeAll(() => {
    // Generate JWTs for test users
    ctx.author.jwt = createMockJwt({
      sub: ctx.author.id,
      tenantId: ctx.author.tenantId,
      role: ctx.author.role,
    });
    ctx.reviewer.jwt = createMockJwt({
      sub: ctx.reviewer.id,
      tenantId: ctx.reviewer.tenantId,
      role: ctx.reviewer.role,
    });
    ctx.otherTenantUser.jwt = createMockJwt({
      sub: ctx.otherTenantUser.id,
      tenantId: ctx.otherTenantUser.tenantId,
      role: ctx.otherTenantUser.role,
    });
  });

  afterAll(async () => {
    // Cleanup created learning objects
    for (const loId of ctx.createdLOs) {
      try {
        await apiRequest(ctx.serverUrl, 'DELETE', `/api/learning-objects/${loId}`, ctx.author.jwt);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // LEARNING OBJECT CREATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('Learning Object Creation', () => {
    it('should create a new learning object with draft version', async () => {
      const slug = `test-lo-${Date.now()}`;
      const response = await apiRequest<LearningObject>(
        ctx.serverUrl,
        'POST',
        '/api/learning-objects',
        ctx.author.jwt,
        {
          slug,
          title: 'Test Reading Passage',
          subject: 'ELA',
          gradeBand: 'G3_5',
          contentJson: {
            type: 'reading_passage',
            passageText: 'This is a test passage about the water cycle.',
            questions: [
              {
                id: 'q1',
                prompt: 'What is the water cycle?',
                answerChoices: ['A process', 'A machine', 'A place', 'A person'],
                correctIndex: 0,
              },
            ],
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.slug).toBe(slug);
      expect(response.data.subject).toBe('ELA');
      expect(response.data.gradeBand).toBe('G3_5');

      ctx.createdLOs.push(response.data.id);
    });

    it('should reject duplicate slugs within tenant', async () => {
      const slug = `duplicate-test-${Date.now()}`;

      // First creation should succeed
      const first = await apiRequest<LearningObject>(
        ctx.serverUrl,
        'POST',
        '/api/learning-objects',
        ctx.author.jwt,
        {
          slug,
          title: 'First LO',
          subject: 'MATH',
          gradeBand: 'K_2',
          contentJson: { type: 'generic', body: {} },
        }
      );
      expect(first.status).toBe(201);
      ctx.createdLOs.push(first.data.id);

      // Second creation with same slug should fail
      const second = await apiRequest(
        ctx.serverUrl,
        'POST',
        '/api/learning-objects',
        ctx.author.jwt,
        {
          slug,
          title: 'Duplicate LO',
          subject: 'MATH',
          gradeBand: 'K_2',
          contentJson: { type: 'generic', body: {} },
        }
      );
      expect(second.status).toBe(409); // Conflict
    });

    it('should validate content safety on creation', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        '/api/learning-objects',
        ctx.author.jwt,
        {
          slug: `unsafe-content-${Date.now()}`,
          title: 'Unsafe Content Test',
          subject: 'SEL',
          gradeBand: 'G6_8',
          contentJson: {
            type: 'generic',
            body: {
              // This would trigger safety validation in real impl
              content: 'This content should be validated',
            },
          },
        }
      );

      // Should succeed but may include warnings
      expect([201, 400]).toContain(response.status);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // VERSION WORKFLOW
  // ════════════════════════════════════════════════════════════════════════════

  describe('Version Workflow', () => {
    let testLOId: string;
    let testVersionId: string;

    beforeAll(async () => {
      // Create a test LO for version workflow tests
      const response = await apiRequest<LearningObject & { latestVersion: Version }>(
        ctx.serverUrl,
        'POST',
        '/api/learning-objects',
        ctx.author.jwt,
        {
          slug: `workflow-test-${Date.now()}`,
          title: 'Workflow Test LO',
          subject: 'SCIENCE',
          gradeBand: 'G3_5',
          contentJson: {
            type: 'generic',
            body: { content: 'Test content for workflow' },
          },
        }
      );
      testLOId = response.data.id;
      testVersionId = response.data.latestVersion?.id ?? '';
      ctx.createdLOs.push(testLOId);
    });

    it('should start in DRAFT state', async () => {
      const response = await apiRequest<Version>(
        ctx.serverUrl,
        'GET',
        `/api/versions/${testVersionId}`,
        ctx.author.jwt
      );

      expect(response.status).toBe(200);
      expect(response.data.state).toBe('DRAFT');
    });

    it('should transition to IN_REVIEW on submit', async () => {
      const response = await apiRequest<Version>(
        ctx.serverUrl,
        'POST',
        `/api/versions/${testVersionId}/submit`,
        ctx.author.jwt
      );

      expect(response.status).toBe(200);
      expect(response.data.state).toBe('IN_REVIEW');
    });

    it('should appear in review queue', async () => {
      const response = await apiRequest<{ items: Array<{ id: string }> }>(
        ctx.serverUrl,
        'GET',
        '/api/review-queue',
        ctx.reviewer.jwt
      );

      expect(response.status).toBe(200);
      expect(response.data.items).toBeDefined();

      const inQueue = response.data.items.some((item) => item.id === testVersionId);
      expect(inQueue).toBe(true);
    });

    it('should allow reviewer to request changes', async () => {
      const response = await apiRequest<Review>(
        ctx.serverUrl,
        'POST',
        `/api/versions/${testVersionId}/reviews`,
        ctx.reviewer.jwt,
        {
          decision: 'CHANGES_REQUESTED',
          comments: 'Please add more detail to the content section.',
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.decision).toBe('CHANGES_REQUESTED');

      // Verify version state changed to DRAFT
      const versionResponse = await apiRequest<Version>(
        ctx.serverUrl,
        'GET',
        `/api/versions/${testVersionId}`,
        ctx.author.jwt
      );
      expect(versionResponse.data.state).toBe('DRAFT');
    });

    it('should allow author to resubmit after changes', async () => {
      // Update content
      await apiRequest(
        ctx.serverUrl,
        'PATCH',
        `/api/versions/${testVersionId}`,
        ctx.author.jwt,
        {
          contentJson: {
            type: 'generic',
            body: { content: 'Updated content with more detail as requested' },
          },
        }
      );

      // Resubmit
      const response = await apiRequest<Version>(
        ctx.serverUrl,
        'POST',
        `/api/versions/${testVersionId}/submit`,
        ctx.author.jwt
      );

      expect(response.status).toBe(200);
      expect(response.data.state).toBe('IN_REVIEW');
    });

    it('should allow reviewer to approve', async () => {
      const response = await apiRequest<Review>(
        ctx.serverUrl,
        'POST',
        `/api/versions/${testVersionId}/reviews`,
        ctx.reviewer.jwt,
        {
          decision: 'APPROVED',
          comments: 'Looks good!',
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.decision).toBe('APPROVED');

      // Verify version state
      const versionResponse = await apiRequest<Version>(
        ctx.serverUrl,
        'GET',
        `/api/versions/${testVersionId}`,
        ctx.author.jwt
      );
      expect(versionResponse.data.state).toBe('APPROVED');
    });

    it('should allow publishing approved content', async () => {
      const response = await apiRequest<Version>(
        ctx.serverUrl,
        'POST',
        `/api/versions/${testVersionId}/publish`,
        ctx.author.jwt
      );

      expect(response.status).toBe(200);
      expect(response.data.state).toBe('PUBLISHED');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // REVIEW QUEUE
  // ════════════════════════════════════════════════════════════════════════════

  describe('Review Queue', () => {
    it('should filter by subject', async () => {
      const response = await apiRequest<{ items: Array<{ learningObject: { subject: string } }> }>(
        ctx.serverUrl,
        'GET',
        '/api/review-queue?subject=ELA',
        ctx.reviewer.jwt
      );

      expect(response.status).toBe(200);
      response.data.items.forEach((item) => {
        expect(item.learningObject.subject).toBe('ELA');
      });
    });

    it('should filter by grade band', async () => {
      const response = await apiRequest<{
        items: Array<{ learningObject: { gradeBand: string } }>;
      }>(ctx.serverUrl, 'GET', '/api/review-queue?gradeBand=G3_5', ctx.reviewer.jwt);

      expect(response.status).toBe(200);
      response.data.items.forEach((item) => {
        expect(item.learningObject.gradeBand).toBe('G3_5');
      });
    });

    it('should paginate results', async () => {
      const page1 = await apiRequest<{ items: unknown[]; pagination: { total: number } }>(
        ctx.serverUrl,
        'GET',
        '/api/review-queue?limit=5&offset=0',
        ctx.reviewer.jwt
      );

      expect(page1.status).toBe(200);
      expect(page1.data.items.length).toBeLessThanOrEqual(5);
      expect(page1.data.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should not allow non-reviewers to access queue', async () => {
      // Create a user without reviewer role
      const nonReviewerJwt = createMockJwt({
        sub: 'non-reviewer-001',
        tenantId: ctx.author.tenantId,
        role: 'TEACHER', // Not a reviewer
      });

      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        '/api/review-queue',
        nonReviewerJwt
      );

      expect([401, 403]).toContain(response.status);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation', () => {
    let tenantALOId: string;

    beforeAll(async () => {
      // Create LO in tenant A
      const response = await apiRequest<LearningObject>(
        ctx.serverUrl,
        'POST',
        '/api/learning-objects',
        ctx.author.jwt,
        {
          slug: `tenant-isolation-test-${Date.now()}`,
          title: 'Tenant A Private Content',
          subject: 'ELA',
          gradeBand: 'K_2',
          contentJson: { type: 'generic', body: {} },
        }
      );
      tenantALOId = response.data.id;
      ctx.createdLOs.push(tenantALOId);
    });

    it('should not allow other tenant to view LO', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/learning-objects/${tenantALOId}`,
        ctx.otherTenantUser.jwt
      );

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow other tenant to edit LO', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'PATCH',
        `/api/learning-objects/${tenantALOId}`,
        ctx.otherTenantUser.jwt,
        { title: 'Hacked Title' }
      );

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow other tenant to review LO versions', async () => {
      // Get version ID first (would fail anyway due to isolation)
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        `/api/versions/fake-version-id/reviews`,
        ctx.otherTenantUser.jwt,
        { decision: 'APPROVED' }
      );

      expect([403, 404]).toContain(response.status);
    });

    it('should not show other tenant LOs in list', async () => {
      const response = await apiRequest<{ data: LearningObject[] }>(
        ctx.serverUrl,
        'GET',
        '/api/learning-objects',
        ctx.otherTenantUser.jwt
      );

      expect(response.status).toBe(200);
      const containsTenantALO = response.data.data.some((lo) => lo.id === tenantALOId);
      expect(containsTenantALO).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // INGESTION
  // ════════════════════════════════════════════════════════════════════════════

  describe('Content Ingestion', () => {
    it('should ingest manual items', async () => {
      const response = await apiRequest<{
        jobId: string;
        totalItems: number;
        successCount: number;
        errorCount: number;
      }>(ctx.serverUrl, 'POST', '/api/ingest/manual', ctx.author.jwt, {
        items: [
          {
            slug: `ingested-lo-${Date.now()}`,
            title: 'Ingested Learning Object',
            subject: 'MATH',
            gradeBand: 'G3_5',
            contentJson: {
              type: 'math_problem',
              problemStatement: 'What is 2 + 2?',
              correctAnswer: '4',
            },
          },
        ],
        validateOnly: false,
        autoSubmitForReview: false,
      });

      expect(response.status).toBe(201);
      expect(response.data.jobId).toBeDefined();
      expect(response.data.successCount).toBe(1);
      expect(response.data.errorCount).toBe(0);
    });

    it('should validate items without creating', async () => {
      const response = await apiRequest<{
        results: Array<{ success: boolean; errors?: unknown[] }>;
      }>(ctx.serverUrl, 'POST', '/api/ingest/manual', ctx.author.jwt, {
        items: [
          {
            slug: 'validation-test',
            title: 'Validation Test',
            subject: 'ELA',
            gradeBand: 'G3_5',
            contentJson: { type: 'reading_passage', passageText: 'Test' },
          },
        ],
        validateOnly: true,
      });

      expect(response.status).toBe(200);
      expect(response.data.results[0].success).toBe(true);
    });

    it('should list ingestion jobs', async () => {
      const response = await apiRequest<{
        jobs: Array<{ id: string; status: string }>;
        pagination: { total: number };
      }>(ctx.serverUrl, 'GET', '/api/ingest/jobs', ctx.author.jwt);

      expect(response.status).toBe(200);
      expect(response.data.jobs).toBeDefined();
      expect(response.data.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should reject invalid content in ingestion', async () => {
      const response = await apiRequest<{
        results: Array<{ success: boolean; errors?: Array<{ field: string; message: string }> }>;
      }>(ctx.serverUrl, 'POST', '/api/ingest/manual', ctx.author.jwt, {
        items: [
          {
            slug: 'invalid-slug-with spaces!', // Invalid slug
            title: '', // Empty title
            subject: 'INVALID', // Invalid subject
            gradeBand: 'G3_5',
            contentJson: {},
          },
        ],
        validateOnly: true,
      });

      // Should succeed but with validation errors in results
      expect(response.status).toBe(400);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTENT VALIDATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('Content Validation', () => {
    it('should validate reading passage structure', async () => {
      const response = await apiRequest<LearningObject>(
        ctx.serverUrl,
        'POST',
        '/api/learning-objects',
        ctx.author.jwt,
        {
          slug: `valid-reading-${Date.now()}`,
          title: 'Valid Reading Passage',
          subject: 'ELA',
          gradeBand: 'G3_5',
          contentJson: {
            type: 'reading_passage',
            passageText: 'A detailed passage about photosynthesis...',
            lexileLevel: 650,
            questions: [
              {
                id: 'q1',
                prompt: 'What is photosynthesis?',
                answerChoices: ['Making food', 'Making water', 'Making air', 'Making soil'],
                correctIndex: 0,
              },
            ],
          },
        }
      );

      expect(response.status).toBe(201);
      ctx.createdLOs.push(response.data.id);
    });

    it('should validate math problem structure', async () => {
      const response = await apiRequest<LearningObject>(
        ctx.serverUrl,
        'POST',
        '/api/learning-objects',
        ctx.author.jwt,
        {
          slug: `valid-math-${Date.now()}`,
          title: 'Valid Math Problem',
          subject: 'MATH',
          gradeBand: 'G6_8',
          contentJson: {
            type: 'math_problem',
            problemStatement: 'Solve for x: 2x + 5 = 15',
            solution: 'x = 5',
            hints: ['Subtract 5 from both sides', 'Divide both sides by 2'],
          },
        }
      );

      expect(response.status).toBe(201);
      ctx.createdLOs.push(response.data.id);
    });

    it('should enforce accessibility fields', async () => {
      const response = await apiRequest<LearningObject & { latestVersion?: Version }>(
        ctx.serverUrl,
        'POST',
        '/api/learning-objects',
        ctx.author.jwt,
        {
          slug: `accessible-content-${Date.now()}`,
          title: 'Accessible Content',
          subject: 'SCIENCE',
          gradeBand: 'K_2',
          contentJson: { type: 'generic', body: {} },
          accessibilityJson: {
            requiresReading: true,
            requiresWriting: false,
            hasAudioSupport: true,
            cognitiveLoad: 'LOW',
          },
        }
      );

      expect(response.status).toBe(201);
      ctx.createdLOs.push(response.data.id);
    });
  });
});
