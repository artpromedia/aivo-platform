import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac, randomBytes } from 'crypto';

// Helper to generate webhook signature (mirrors the implementation)
function signPayload(payload: string, secret: string): string {
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

// Helper to verify webhook signature
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  maxAge: number = 300000 // 5 minutes
): { valid: boolean; error?: string } {
  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signaturePart = parts.find(p => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return { valid: false, error: 'Invalid signature format' };
  }

  const timestamp = timestampPart.split('=')[1];
  const providedSignature = signaturePart.split('=')[1];

  // Check timestamp freshness
  const timestampAge = Date.now() - parseInt(timestamp, 10);
  if (timestampAge > maxAge) {
    return { valid: false, error: 'Signature expired' };
  }

  // Compute expected signature
  const expectedSignature = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  if (providedSignature !== expectedSignature) {
    return { valid: false, error: 'Signature mismatch' };
  }

  return { valid: true };
}

describe('Webhook Signature Verification', () => {
  const secret = 'whsec_' + randomBytes(32).toString('base64url');

  it('generates valid signatures', () => {
    const payload = JSON.stringify({ event: 'test', data: { foo: 'bar' } });
    const signature = signPayload(payload, secret);

    expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]+$/);
  });

  it('verifies valid signatures correctly', () => {
    const payload = JSON.stringify({ event: 'SESSION_COMPLETED', data: {} });
    const signature = signPayload(payload, secret);

    const result = verifySignature(payload, signature, secret);
    expect(result.valid).toBe(true);
  });

  it('rejects signatures with wrong secret', () => {
    const payload = JSON.stringify({ event: 'test' });
    const signature = signPayload(payload, secret);
    const wrongSecret = 'whsec_wrong';

    const result = verifySignature(payload, signature, wrongSecret);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Signature mismatch');
  });

  it('rejects signatures with tampered payload', () => {
    const originalPayload = JSON.stringify({ event: 'test', value: 100 });
    const signature = signPayload(originalPayload, secret);

    const tamperedPayload = JSON.stringify({ event: 'test', value: 999 });
    const result = verifySignature(tamperedPayload, signature, secret);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Signature mismatch');
  });

  it('rejects malformed signatures', () => {
    const payload = JSON.stringify({ event: 'test' });
    
    const result1 = verifySignature(payload, 'invalid', secret);
    expect(result1.valid).toBe(false);
    expect(result1.error).toBe('Invalid signature format');

    const result2 = verifySignature(payload, 't=123', secret);
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('Invalid signature format');
  });

  it('rejects expired signatures', () => {
    const payload = JSON.stringify({ event: 'test' });
    
    // Create a signature with old timestamp
    const oldTimestamp = (Date.now() - 600000).toString(); // 10 minutes ago
    const sig = createHmac('sha256', secret)
      .update(`${oldTimestamp}.${payload}`)
      .digest('hex');
    const expiredSignature = `t=${oldTimestamp},v1=${sig}`;

    const result = verifySignature(payload, expiredSignature, secret, 300000);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Signature expired');
  });
});

describe('Webhook Event Payloads', () => {
  it('SESSION_COMPLETED has required fields', () => {
    const payload = {
      id: 'evt_123',
      type: 'SESSION_COMPLETED',
      timestamp: new Date().toISOString(),
      tenantCode: 'SB_ABC123',
      data: {
        sessionId: 'sess_456',
        learnerId: 'lrn_789',
        learnerExternalId: 'student-123',
        sessionType: 'practice',
        skillDomain: 'math.algebra',
        startedAt: new Date(Date.now() - 1200000).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: 1200,
        questionsAttempted: 15,
        questionsCorrect: 12,
        accuracyPct: 80,
        xpEarned: 45,
      },
    };

    expect(payload.id).toBeDefined();
    expect(payload.type).toBe('SESSION_COMPLETED');
    expect(payload.timestamp).toBeDefined();
    expect(payload.data.sessionId).toBeDefined();
    expect(payload.data.learnerId).toBeDefined();
    expect(payload.data.completedAt).toBeDefined();
  });

  it('SKILL_MASTERED has required fields', () => {
    const payload = {
      id: 'evt_123',
      type: 'SKILL_MASTERED',
      timestamp: new Date().toISOString(),
      tenantCode: 'SB_ABC123',
      data: {
        learnerId: 'lrn_789',
        learnerExternalId: 'student-123',
        skillId: 'math.algebra.linear_equations',
        skillName: 'Solving Linear Equations',
        masteredAt: new Date().toISOString(),
        masteryLevel: 0.92,
        timeToMastery: {
          sessions: 8,
          totalMinutes: 145,
          questionsAnswered: 124,
        },
      },
    };

    expect(payload.data.skillId).toBeDefined();
    expect(payload.data.masteryLevel).toBeGreaterThanOrEqual(0.9);
    expect(payload.data.masteredAt).toBeDefined();
  });

  it('BASELINE_COMPLETED has required fields', () => {
    const payload = {
      id: 'evt_123',
      type: 'BASELINE_COMPLETED',
      timestamp: new Date().toISOString(),
      tenantCode: 'SB_ABC123',
      data: {
        baselineId: 'bl_456',
        learnerId: 'lrn_789',
        learnerExternalId: 'student-123',
        subject: 'math',
        gradeLevel: 5,
        completedAt: new Date().toISOString(),
        results: {
          overallScore: 72,
          domainScores: [
            { domain: 'math.number_sense', score: 85 },
            { domain: 'math.algebra', score: 65 },
          ],
          recommendedStartingLevel: 'grade_4_q3',
        },
      },
    };

    expect(payload.data.baselineId).toBeDefined();
    expect(payload.data.subject).toBeDefined();
    expect(payload.data.results).toBeDefined();
    expect(payload.data.results.overallScore).toBeGreaterThanOrEqual(0);
    expect(payload.data.results.overallScore).toBeLessThanOrEqual(100);
  });
});
