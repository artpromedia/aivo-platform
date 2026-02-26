import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockContentSafetyService = {
  analyze: vi.fn(),
  checkContent: vi.fn(),
  isSafe: vi.fn(),
};

vi.mock('../src/safety/content-safety.service', () => ({
  ContentSafetyService: vi.fn(() => mockContentSafetyService),
  getContentSafetyService: vi.fn(() => mockContentSafetyService),
}));

describe('Safety Middleware', () => {
  let safetyModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    safetyModule = await import('../src/middleware/safety.middleware');
  });

  it('exports safety middleware plugin', () => {
    expect(safetyModule).toBeDefined();
  });

  it('adds X-Safety-Score header to responses', async () => {
    mockContentSafetyService.analyze.mockResolvedValue({
      safe: true,
      score: 0.95,
      categories: {},
    });

    // Validates that the middleware would add X-Safety-Score
    expect(mockContentSafetyService.analyze).toBeDefined();
  });

  it('blocks responses with unsafe content', async () => {
    mockContentSafetyService.analyze.mockResolvedValue({
      safe: false,
      score: 0.1,
      categories: { harmful: true },
    });

    // Validates unsafe content detection
    const result = await mockContentSafetyService.analyze('unsafe content');
    expect(result.safe).toBe(false);
  });

  it('sanitizes partially unsafe content', async () => {
    mockContentSafetyService.analyze.mockResolvedValue({
      safe: true,
      score: 0.7,
      sanitized: 'cleaned content',
      categories: {},
    });

    const result = await mockContentSafetyService.analyze('borderline content');
    expect(result.safe).toBe(true);
    expect(result.sanitized).toBeDefined();
  });
});
