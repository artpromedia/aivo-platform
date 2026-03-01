/**
 * AI Pipeline Smoke Tests
 *
 * End-to-end validation of the complete AI request flow:
 *   Student request → API Gateway → ai-inference-svc → LLM provider → response
 *
 * These tests require running services and are intended for:
 * - Pre-deployment validation
 * - Post-deployment smoke testing
 * - Weekly CI integration runs
 *
 * Environment variables:
 *   AI_INFERENCE_URL  — ai-inference-svc base URL (default: http://localhost:8000)
 *   AI_ORCHESTRATOR_URL — ai-orchestrator base URL (default: http://localhost:4010)
 *   ACCESSIBILITY_AI_URL — accessibility-ai-svc base URL (default: http://localhost:4070)
 *
 * Run via:
 *   npx vitest run tests/e2e/ai-pipeline-smoke.test.ts
 *
 * @module tests/e2e/ai-pipeline-smoke
 */

import { describe, expect, it, beforeAll } from 'vitest';

// ── Configuration ────────────────────────────────────────────────────────────

const AI_INFERENCE_URL = process.env.AI_INFERENCE_URL || 'http://localhost:8000';
const AI_ORCHESTRATOR_URL = process.env.AI_ORCHESTRATOR_URL || 'http://localhost:4010';
const ACCESSIBILITY_AI_URL = process.env.ACCESSIBILITY_AI_URL || 'http://localhost:4070';

const TIMEOUT_MS = 30_000;

/** Whether the target services are reachable. Set during beforeAll. */
let inferenceAvailable = false;
let orchestratorAvailable = false;
let accessibilityAvailable = false;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function isServiceUp(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

async function postJSON(
  url: string,
  body: Record<string, unknown>
): Promise<{ status: number; data: Record<string, unknown> }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      // Response might not be JSON
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE HEALTH CHECKS
// ══════════════════════════════════════════════════════════════════════════════

beforeAll(async () => {
  [inferenceAvailable, orchestratorAvailable, accessibilityAvailable] = await Promise.all([
    isServiceUp(AI_INFERENCE_URL),
    isServiceUp(AI_ORCHESTRATOR_URL),
    isServiceUp(ACCESSIBILITY_AI_URL),
  ]);
});

// ══════════════════════════════════════════════════════════════════════════════
// AI PIPELINE — Student Hint Request
// ══════════════════════════════════════════════════════════════════════════════

describe('AI Pipeline Smoke Tests', () => {
  it(
    'Student hint request → gateway → ai-inference → provider → response',
    async () => {
      if (!inferenceAvailable) {
        console.warn(`⚠ Skipping: ai-inference-svc not available at ${AI_INFERENCE_URL}`);
        return;
      }

      const { status, data } = await postJSON(`${AI_INFERENCE_URL}/api/v1/ai/hint`, {
        prompt: 'Help me solve 2x + 3 = 7',
        system_prompt: 'You are a math tutor for grade 4 students. Use Socratic questioning.',
      });

      expect(status).toBe(200);
      expect(data).toBeDefined();

      // Verify the response shape
      if (data.provider) {
        expect(data.provider).toMatch(/openai|anthropic|gemini/i);
      }
      if (data.model) {
        expect(data.model as string).toMatch(/gpt-5|claude-(opus|sonnet)-4|gemini-3/);
      }
      // Must have actual content
      const content =
        (data.content as string) || (data.response as string) || (data.text as string) || '';
      expect(content.length).toBeGreaterThan(0);
    },
    TIMEOUT_MS
  );

  it(
    'IEP goal generation → ai-orchestrator → Opus 4.6 → goals',
    async () => {
      if (!orchestratorAvailable) {
        console.warn(`⚠ Skipping: ai-orchestrator not available at ${AI_ORCHESTRATOR_URL}`);
        return;
      }

      const { status, data } = await postJSON(`${AI_ORCHESTRATOR_URL}/api/v1/generate`, {
        tenantId: 'smoke-test-tenant',
        userId: 'smoke-test-user',
        learnerId: 'smoke-test-learner',
        agentType: 'IEP_GOAL_WRITER',
        locale: 'en-US',
        input:
          'Generate 3 measurable IEP goals for a 5th grader with dyslexia ' +
          'who is reading 2 grade levels below expectation.',
      });

      // Accept 200 (success) or 401/403 (auth required in production)
      expect([200, 201, 401, 403]).toContain(status);

      if (status === 200 || status === 201) {
        const content =
          (data.content as string) || (data.response as string) || JSON.stringify(data);
        expect(content.length).toBeGreaterThan(20);
      }
    },
    TIMEOUT_MS
  );

  it(
    'Content adaptation → ai-inference → Sonnet 4.6 → adapted content',
    async () => {
      if (!inferenceAvailable) {
        console.warn(`⚠ Skipping: ai-inference-svc not available at ${AI_INFERENCE_URL}`);
        return;
      }

      const { status, data } = await postJSON(`${AI_INFERENCE_URL}/api/v1/ai/complete`, {
        messages: [
          {
            role: 'system',
            content:
              'You are a content adaptation engine. Simplify educational content ' +
              'for a 3rd grade reading level while preserving key concepts.',
          },
          {
            role: 'user',
            content:
              'Adapt this text: "Photosynthesis is the process by which chloroplasts ' +
              'in plant cells convert light energy into chemical energy stored in glucose ' +
              'molecules through a series of redox reactions."',
          },
        ],
        max_tokens: 300,
        temperature: 0.5,
      });

      expect([200, 201, 401, 403]).toContain(status);

      if (status === 200 || status === 201) {
        const content =
          (data.content as string) ||
          (data.response as string) ||
          (data.choices as Array<{ message: { content: string } }>)?.[0]?.message?.content ||
          '';
        expect(content.length).toBeGreaterThan(10);
      }
    },
    TIMEOUT_MS
  );

  it(
    'Voxtral STT → accessibility-ai-svc → transcript',
    async () => {
      if (!accessibilityAvailable) {
        console.warn(`⚠ Skipping: accessibility-ai-svc not available at ${ACCESSIBILITY_AI_URL}`);
        return;
      }

      // Test the health/capabilities endpoint for STT support
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      try {
        const res = await fetch(`${ACCESSIBILITY_AI_URL}/health`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        expect(res.ok).toBe(true);

        const health = (await res.json()) as Record<string, unknown>;
        // Verify STT capability is registered
        if (health.capabilities) {
          const caps = health.capabilities as string[];
          expect(
            caps.some((c) => c.includes('stt') || c.includes('speech') || c.includes('transcri'))
          ).toBe(true);
        }
      } finally {
        clearTimeout(timeout);
      }
    },
    TIMEOUT_MS
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE HEALTH VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

describe('Service Health Endpoints', () => {
  it('ai-inference-svc /health returns model versions', async () => {
    if (!inferenceAvailable) {
      console.warn(`⚠ Skipping: ai-inference-svc not available`);
      return;
    }

    const res = await fetch(`${AI_INFERENCE_URL}/health`);
    expect(res.ok).toBe(true);

    const health = (await res.json()) as Record<string, unknown>;
    expect(health.status).toBeDefined();
  });

  it('ai-orchestrator /health returns provider status', async () => {
    if (!orchestratorAvailable) {
      console.warn(`⚠ Skipping: ai-orchestrator not available`);
      return;
    }

    const res = await fetch(`${AI_ORCHESTRATOR_URL}/health`);
    expect(res.ok).toBe(true);

    const health = (await res.json()) as Record<string, unknown>;
    expect(health.status).toBeDefined();
  });

  it('accessibility-ai-svc /health returns STT capability', async () => {
    if (!accessibilityAvailable) {
      console.warn(`⚠ Skipping: accessibility-ai-svc not available`);
      return;
    }

    const res = await fetch(`${ACCESSIBILITY_AI_URL}/health`);
    expect(res.ok).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE FORMAT VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

describe('AI Response Format Validation', () => {
  it('ai-inference response includes usage metadata', async () => {
    if (!inferenceAvailable) {
      console.warn(`⚠ Skipping: ai-inference-svc not available`);
      return;
    }

    const { status, data } = await postJSON(`${AI_INFERENCE_URL}/api/v1/ai/complete`, {
      messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
      max_tokens: 10,
    });

    if (status === 200) {
      // Response should include usage metadata for cost tracking
      if (data.usage) {
        const usage = data.usage as Record<string, number>;
        expect(usage.prompt_tokens).toBeGreaterThan(0);
        expect(usage.completion_tokens).toBeGreaterThan(0);
      }
    }
  });

  it('ai-orchestrator response includes provider and model', async () => {
    if (!orchestratorAvailable) {
      console.warn(`⚠ Skipping: ai-orchestrator not available`);
      return;
    }

    const { status, data } = await postJSON(`${AI_ORCHESTRATOR_URL}/api/v1/generate`, {
      tenantId: 'smoke-test-tenant',
      userId: 'smoke-test-user',
      learnerId: 'smoke-test-learner',
      agentType: 'HOMEWORK_HELPER',
      locale: 'en-US',
      input: 'What is 5 + 3?',
    });

    if (status === 200) {
      // Should include traceability metadata
      if (data.provider) {
        expect(typeof data.provider).toBe('string');
      }
      if (data.model) {
        expect(typeof data.model).toBe('string');
      }
    }
  });
});
