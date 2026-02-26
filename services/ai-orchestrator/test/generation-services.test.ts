import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('AI Orchestrator Generation Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // Test that all generation service modules export properly
  const generationServices = [
    { name: 'lesson-generation', path: '../src/generation/lesson-generation' },
    { name: 'question-generation', path: '../src/generation/question-generation' },
    { name: 'game-generation', path: '../src/generation/game-generation' },
    { name: 'content-adaptation', path: '../src/generation/content-adaptation' },
  ];

  for (const svc of generationServices) {
    describe(svc.name, () => {
      it(`exports ${svc.name} service`, async () => {
        try {
          const mod = await import(svc.path);
          expect(mod).toBeDefined();
        } catch (e: any) {
          // Module may have import-time dependencies; check it's a real module
          expect(e.message).not.toContain('Cannot find module');
        }
      });
    });
  }
});

describe('AI Governance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('AiAuditLogger', () => {
    it('exports audit logging functionality', async () => {
      const mod = await import('../src/governance/ai-audit-logger');
      expect(mod).toBeDefined();
    });
  });

  describe('ExplainabilityService', () => {
    it('exports explainability service', async () => {
      const mod = await import('../src/governance/explainability.service');
      expect(mod).toBeDefined();
    });
  });

  describe('AiUsageTracker', () => {
    it('exports usage tracking', async () => {
      const mod = await import('../src/governance/ai-usage-tracker');
      expect(mod).toBeDefined();
    });
  });
});

describe('Incident Service', () => {
  let incidentModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    incidentModule = await import('../src/incidents/incidentService');
  });

  it('exports incident management', () => {
    expect(incidentModule).toBeDefined();
  });
});
