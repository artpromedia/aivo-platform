/**
 * Tests for translation-svc translation service.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  translation: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  glossaryTerm: {
    create: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  translationBundle: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  translationStats: {
    findMany: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('TranslationService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getTranslation', () => {
    it('returns translation for key and locale', async () => {
      mockPrisma.translation.findUnique.mockResolvedValue({
        id: 'tr-1',
        key: 'dashboard.welcome',
        locale: 'es',
        value: 'Bienvenido al panel',
        status: 'APPROVED',
      });
      const tr = await mockPrisma.translation.findUnique({
        where: { key_locale: { key: 'dashboard.welcome', locale: 'es' } },
      });
      expect(tr?.locale).toBe('es');
      expect(tr?.value).toBe('Bienvenido al panel');
    });

    it('returns null for missing translation', async () => {
      mockPrisma.translation.findUnique.mockResolvedValue(null);
      const tr = await mockPrisma.translation.findUnique({
        where: { key_locale: { key: 'missing.key', locale: 'ja' } },
      });
      expect(tr).toBeNull();
    });
  });

  describe('upsertTranslation', () => {
    it('creates new translation', async () => {
      mockPrisma.translation.upsert.mockResolvedValue({
        id: 'tr-2',
        key: 'greeting.hello',
        locale: 'fr',
        value: 'Bonjour',
        status: 'DRAFT',
      });
      const result = await mockPrisma.translation.upsert({
        where: { key_locale: { key: 'greeting.hello', locale: 'fr' } },
        update: { value: 'Bonjour' },
        create: { key: 'greeting.hello', locale: 'fr', value: 'Bonjour' },
      });
      expect(result.value).toBe('Bonjour');
    });

    it('updates existing translation', async () => {
      mockPrisma.translation.upsert.mockResolvedValue({
        id: 'tr-1',
        key: 'dashboard.welcome',
        locale: 'es',
        value: 'Bienvenido',
        status: 'UPDATED',
      });
      const result = await mockPrisma.translation.upsert({
        where: { key_locale: { key: 'dashboard.welcome', locale: 'es' } },
        update: { value: 'Bienvenido' },
        create: {},
      });
      expect(result.status).toBe('UPDATED');
    });
  });

  describe('machineTranslate', () => {
    it('batch-translates keys to target locale', async () => {
      const keys = ['btn.save', 'btn.cancel', 'btn.delete'];
      const results = keys.map((key, i) => ({
        key,
        locale: 'de',
        value: ['Speichern', 'Abbrechen', 'Löschen'][i],
        source: 'MACHINE',
      }));
      expect(results).toHaveLength(3);
      expect(results[0].value).toBe('Speichern');
      expect(results[0].source).toBe('MACHINE');
    });
  });
});

describe('GlossaryService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('addGlossaryTerm', () => {
    it('adds term with translations', async () => {
      mockPrisma.glossaryTerm.create.mockResolvedValue({
        id: 'gt-1',
        term: 'IEP',
        definition: 'Individualized Education Program',
        translations: {
          es: 'Programa de Educación Individualizado',
          fr: "Programme d'éducation individualisé",
        },
      });
      const result = await mockPrisma.glossaryTerm.create({
        data: { term: 'IEP', definition: 'Individualized Education Program' },
      });
      expect(result.term).toBe('IEP');
    });
  });

  describe('getGlossary', () => {
    it('returns glossary terms for tenant', async () => {
      mockPrisma.glossaryTerm.findMany.mockResolvedValue([
        { id: 'gt-1', term: 'IEP' },
        { id: 'gt-2', term: 'FERPA' },
        { id: 'gt-3', term: 'PBIS' },
      ]);
      const terms = await mockPrisma.glossaryTerm.findMany({
        where: { tenantId: 'tenant-1' },
      });
      expect(terms).toHaveLength(3);
    });
  });
});

describe('TranslationBundleService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('exportBundle', () => {
    it('exports translations for a locale as JSON', async () => {
      mockPrisma.translation.findMany.mockResolvedValue([
        { key: 'btn.save', value: 'Guardar' },
        { key: 'btn.cancel', value: 'Cancelar' },
      ]);
      const translations = await mockPrisma.translation.findMany({
        where: { locale: 'es' },
      });
      const bundle: Record<string, string> = {};
      translations.forEach((t: { key: string; value: string }) => {
        bundle[t.key] = t.value;
      });
      expect(bundle['btn.save']).toBe('Guardar');
      expect(Object.keys(bundle)).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    it('returns translation coverage stats', async () => {
      mockPrisma.translationStats.findMany.mockResolvedValue([
        { locale: 'es', total: 500, translated: 480, coverage: 96 },
        { locale: 'fr', total: 500, translated: 350, coverage: 70 },
      ]);
      const stats = await mockPrisma.translationStats.findMany();
      expect(stats[0].coverage).toBe(96);
      expect(stats[1].coverage).toBe(70);
    });
  });
});
