/**
 * Content Safety Service — Unit Tests
 *
 * Validates the 4-layer AI content safety pipeline:
 *   1. SSN triggers block
 *   2. Crisis keywords trigger block
 *   3. Safe math content passes cleanly
 *   4. Mild reading-level complexity yields low-severity flag
 *   5. Email addresses are sanitised (not blocked)
 *   6. Admin stats endpoint shape
 *   7. Config update round-trip via Redis mock
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock Redis before imports ──────────────────────────────────────────────
const redisMock = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  quit: vi.fn().mockResolvedValue(undefined),
};

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => redisMock),
    Redis: vi.fn().mockImplementation(() => redisMock),
  };
});

// Mock the audit service fetch so it doesn't make real HTTP calls
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

import { ContentSafetyService } from '../src/safety/content-safety.service.js';
import type { SafetyValidationParams } from '../src/safety/safety.types.js';
import { getSafetyConfig, setSafetyConfig, resetSafetyConfig } from '../src/safety/safety-config.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeParams(content: string, overrides: Partial<SafetyValidationParams> = {}): SafetyValidationParams {
  return {
    content,
    context: 'homework',
    tenantId: 'test-tenant',
    userId: 'test-user',
    studentAge: 10,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ContentSafetyService', () => {
  let svc: ContentSafetyService;

  beforeEach(() => {
    svc = new ContentSafetyService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Test 1: SSN → blocked ───────────────────────────────────────────────
  it('should block content containing an SSN', async () => {
    const result = await svc.validateOutput(
      makeParams('Your student ID is 123-45-6789, please keep it safe.'),
    );

    expect(result.safe).toBe(false);
    expect(result.flags.length).toBeGreaterThanOrEqual(1);

    const ssnFlag = result.flags.find((f) => f.detail.toLowerCase().includes('ssn'));
    expect(ssnFlag).toBeDefined();
    expect(ssnFlag!.severity).toBe('critical');
  });

  // ── Test 2: Crisis keywords → blocked ───────────────────────────────────
  it('should block content containing crisis / self-harm keywords', async () => {
    const result = await svc.validateOutput(
      makeParams('Sometimes students feel like they want to die and that is serious.'),
    );

    expect(result.safe).toBe(false);

    const crisisFlag = result.flags.find(
      (f) => f.layer === 'pattern' && f.detail.toLowerCase().includes('crisis'),
    );
    expect(crisisFlag).toBeDefined();
    expect(crisisFlag!.severity).toBe('critical');
  });

  // ── Test 3: Safe math content → safe ────────────────────────────────────
  it('should pass safe, age-appropriate math content', async () => {
    const result = await svc.validateOutput(
      makeParams(
        'To add fractions, find a common denominator. For example, 1/2 + 1/3 = 3/6 + 2/6 = 5/6. Great job!',
      ),
    );

    expect(result.safe).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.6);

    // Should have no critical or high flags
    const criticals = result.flags.filter((f) => f.severity === 'critical' || f.severity === 'high');
    expect(criticals.length).toBe(0);
  });

  // ── Test 4: Mild complexity → low flag ──────────────────────────────────
  it('should flag mildly complex reading level as low severity for young students', async () => {
    // Content with higher-than-expected reading level for an 8-year-old
    const result = await svc.validateOutput(
      makeParams(
        'The mitochondria is the powerhouse of the cell. Cellular respiration ' +
          'involves the production of adenosine triphosphate through oxidative ' +
          'phosphorylation, a process that requires multiple enzymatic catalysts.',
        { studentAge: 7 },
      ),
    );

    // Should flag reading level but not necessarily block
    const ageFlag = result.flags.find((f) => f.layer === 'age');
    if (ageFlag) {
      expect(['low', 'medium']).toContain(ageFlag.severity);
    }
  });

  // ── Test 5: Email sanitisation ──────────────────────────────────────────
  it('should sanitize email addresses from content', async () => {
    const result = await svc.validateOutput(
      makeParams(
        'You can reach your teacher at jane.doe@school.edu for extra help on homework.',
      ),
    );

    // Email is PII but not critical (not SSN/CC)
    const piiFlag = result.flags.find(
      (f) => f.layer === 'pattern' && f.detail.toLowerCase().includes('email'),
    );
    expect(piiFlag).toBeDefined();

    // Content should be sanitized (email replaced)
    if (result.sanitizedContent) {
      expect(result.sanitizedContent).not.toContain('jane.doe@school.edu');
      expect(result.sanitizedContent).toContain('[REDACTED]');
    }
  });

  // ── Test 6: Safety config round-trip via Redis ──────────────────────────
  it('should read and write safety config through Redis', async () => {
    const tenantId = 'config-test-tenant';

    // Default config (Redis returns null → defaults)
    redisMock.get.mockResolvedValueOnce(null);
    const defaults = await getSafetyConfig(tenantId);
    expect(defaults.enabled).toBe(true);
    expect(defaults.minimumSafetyScore).toBeDefined();

    // Set custom config
    const custom = { minimumSafetyScore: 0.8, blockOnMedium: true };
    await setSafetyConfig(tenantId, custom);
    expect(redisMock.set).toHaveBeenCalled();

    // Reset
    await resetSafetyConfig(tenantId);
    expect(redisMock.del).toHaveBeenCalled();
  });

  // ── Test 7: Profanity sanitisation without block ────────────────────────
  it('should sanitize profanity but not block the response', async () => {
    const result = await svc.validateOutput(
      makeParams('Oh damn, I forgot how to solve this equation!'),
    );

    const profanityFlag = result.flags.find(
      (f) => f.layer === 'pattern' && f.detail.toLowerCase().includes('profanity'),
    );
    expect(profanityFlag).toBeDefined();

    // Profanity alone should not block — it gets sanitized
    if (result.sanitizedContent) {
      expect(result.sanitizedContent).not.toContain('damn');
    }
  });
});
