/**
 * Tests for translation-svc AI translation and quality scoring.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAIProvider = {
  translate: vi.fn(),
  scoreQuality: vi.fn(),
  checkConsistency: vi.fn(),
};

describe('AITranslationService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('translate', () => {
    it('translates text with context', async () => {
      mockAIProvider.translate.mockResolvedValue({
        translation: 'Bienvenido al panel de control',
        confidence: 0.95,
        alternatives: ['Bienvenido al tablero'],
      });
      const result = await mockAIProvider.translate({
        text: 'Welcome to the dashboard',
        targetLocale: 'es',
        context: 'education platform UI',
      });
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.alternatives).toHaveLength(1);
    });

    it('handles untranslatable text', async () => {
      mockAIProvider.translate.mockResolvedValue({
        translation: 'API Key',
        confidence: 0.99,
        isIdentical: true,
      });
      const result = await mockAIProvider.translate({
        text: 'API Key',
        targetLocale: 'es',
      });
      expect(result.isIdentical).toBe(true);
    });

    it('translates with glossary enforcement', async () => {
      mockAIProvider.translate.mockResolvedValue({
        translation: 'Programa de Educación Individualizado (PEI)',
        confidence: 0.92,
        glossaryTermsUsed: ['IEP'],
      });
      const result = await mockAIProvider.translate({
        text: 'The student IEP must be reviewed annually',
        targetLocale: 'es',
        glossary: { IEP: 'Programa de Educación Individualizado' },
      });
      expect(result.glossaryTermsUsed).toContain('IEP');
    });
  });

  describe('scoreQuality', () => {
    it('scores high quality translation', async () => {
      mockAIProvider.scoreQuality.mockResolvedValue({
        score: 0.94,
        fluency: 0.96,
        adequacy: 0.92,
        issues: [],
      });
      const result = await mockAIProvider.scoreQuality({
        source: 'Welcome to the dashboard',
        translation: 'Bienvenido al panel de control',
        locale: 'es',
      });
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.issues).toHaveLength(0);
    });

    it('identifies quality issues', async () => {
      mockAIProvider.scoreQuality.mockResolvedValue({
        score: 0.65,
        fluency: 0.7,
        adequacy: 0.6,
        issues: [
          { type: 'MISTRANSLATION', severity: 'HIGH', segment: 'grade level' },
          { type: 'GRAMMAR', severity: 'LOW', segment: 'los estudiantes' },
        ],
      });
      const result = await mockAIProvider.scoreQuality({
        source: 'Students at this grade level',
        translation: 'Los estudiantes en este nivel de calificación',
        locale: 'es',
      });
      expect(result.score).toBeLessThan(0.7);
      expect(result.issues).toHaveLength(2);
    });
  });

  describe('checkConsistency', () => {
    it('detects consistent translations', async () => {
      mockAIProvider.checkConsistency.mockResolvedValue({
        consistent: true,
        inconsistencies: [],
      });
      const result = await mockAIProvider.checkConsistency({
        translations: [
          { key: 'btn.save', value: 'Guardar' },
          { key: 'action.save', value: 'Guardar' },
        ],
        locale: 'es',
      });
      expect(result.consistent).toBe(true);
    });

    it('flags inconsistent translations', async () => {
      mockAIProvider.checkConsistency.mockResolvedValue({
        consistent: false,
        inconsistencies: [
          {
            term: 'student',
            variants: ['estudiante', 'alumno'],
            keys: ['student.name', 'student.profile'],
          },
        ],
      });
      const result = await mockAIProvider.checkConsistency({
        translations: [
          { key: 'student.name', value: 'Nombre del estudiante' },
          { key: 'student.profile', value: 'Perfil del alumno' },
        ],
        locale: 'es',
      });
      expect(result.consistent).toBe(false);
      expect(result.inconsistencies[0].variants).toHaveLength(2);
    });
  });
});
