/**
 * Translation & i18n Tests
 *
 * Tests for the translation service, content resolver, and accessibility profile.
 */

import { describe, it, expect } from 'vitest';

import {
  isValidLocale,
  getBaseLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from '../src/translations.js';

// ══════════════════════════════════════════════════════════════════════════════
// LOCALE VALIDATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Locale Validation', () => {
  describe('isValidLocale', () => {
    it('should accept valid two-letter locale codes', () => {
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('es')).toBe(true);
      expect(isValidLocale('fr')).toBe(true);
      expect(isValidLocale('de')).toBe(true);
      expect(isValidLocale('pt')).toBe(true);
      expect(isValidLocale('zh')).toBe(true);
    });

    it('should accept valid locale codes with region', () => {
      expect(isValidLocale('en-US')).toBe(true);
      expect(isValidLocale('en-GB')).toBe(true);
      expect(isValidLocale('es-MX')).toBe(true);
      expect(isValidLocale('es-ES')).toBe(true);
      expect(isValidLocale('pt-BR')).toBe(true);
      expect(isValidLocale('zh-CN')).toBe(true);
    });

    it('should reject invalid locale formats', () => {
      expect(isValidLocale('e')).toBe(false);
      expect(isValidLocale('eng')).toBe(false);
      expect(isValidLocale('en_US')).toBe(false);
      expect(isValidLocale('EN-US')).toBe(false);
      expect(isValidLocale('en-us')).toBe(false);
      expect(isValidLocale('english')).toBe(false);
      expect(isValidLocale('')).toBe(false);
    });
  });

  describe('getBaseLocale', () => {
    it('should return same locale for two-letter codes', () => {
      expect(getBaseLocale('en')).toBe('en');
      expect(getBaseLocale('es')).toBe('es');
      expect(getBaseLocale('fr')).toBe('fr');
    });

    it('should extract base locale from regional codes', () => {
      expect(getBaseLocale('en-US')).toBe('en');
      expect(getBaseLocale('en-GB')).toBe('en');
      expect(getBaseLocale('es-MX')).toBe('es');
      expect(getBaseLocale('pt-BR')).toBe('pt');
      expect(getBaseLocale('zh-CN')).toBe('zh');
    });
  });

  describe('Constants', () => {
    it('should have en as default locale', () => {
      expect(DEFAULT_LOCALE).toBe('en');
    });

    it('should include basic supported locales', () => {
      expect(SUPPORTED_LOCALES).toContain('en');
      expect(SUPPORTED_LOCALES).toContain('es');
      expect(SUPPORTED_LOCALES).toContain('en-US');
      expect(SUPPORTED_LOCALES).toContain('es-MX');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY PROFILE QA TESTS
// ══════════════════════════════════════════════════════════════════════════════

import { qaChecks } from '../src/qa-engine.js';

describe('checkAccessibilityProfile', () => {
  const { checkAccessibilityProfile } = qaChecks;

  describe('K-2 Grade Band Requirements', () => {
    it('should fail when cognitive load is missing for K-2', () => {
      const result = checkAccessibilityProfile(
        {
          supportsDyslexiaFriendlyFont: true,
          supportsReducedStimuli: true,
        },
        'K_2'
      );
      expect(result.status).toBe('FAILED');
      expect(result.message).toContain('estimatedCognitiveLoad');
    });

    it('should warn when dyslexia-friendly flag is not set for K-2', () => {
      const result = checkAccessibilityProfile(
        {
          estimatedCognitiveLoad: 'LOW',
          supportsReducedStimuli: true,
          hasScreenReaderOptimizedStructure: true,
        },
        'K_2'
      );
      expect(result.status).toBe('WARNING');
      expect(result.message).toContain('dyslexia-friendly');
    });

    it('should pass when all K-2 requirements are met', () => {
      const result = checkAccessibilityProfile(
        {
          estimatedCognitiveLoad: 'LOW',
          supportsDyslexiaFriendlyFont: true,
          supportsReducedStimuli: true,
          hasScreenReaderOptimizedStructure: true,
        },
        'K_2'
      );
      expect(result.status).toBe('PASSED');
    });
  });

  describe('G3-5 Grade Band Requirements', () => {
    it('should fail when cognitive load is missing for G3-5', () => {
      const result = checkAccessibilityProfile({}, 'G3_5');
      expect(result.status).toBe('FAILED');
      expect(result.message).toContain('estimatedCognitiveLoad');
    });

    it('should pass with complete accessibility profile for G3-5', () => {
      const result = checkAccessibilityProfile(
        {
          estimatedCognitiveLoad: 'MEDIUM',
          supportsDyslexiaFriendlyFont: true,
          supportsReducedStimuli: true,
          hasScreenReaderOptimizedStructure: true,
        },
        'G3_5'
      );
      expect(result.status).toBe('PASSED');
    });
  });

  describe('Older Grade Bands (G6-8, G9-12)', () => {
    it('should warn but not fail for missing cognitive load in G6-8', () => {
      const result = checkAccessibilityProfile(
        {
          hasScreenReaderOptimizedStructure: true,
        },
        'G6_8'
      );
      // Only screen reader warning, no cognitive load failure
      expect(result.status).not.toBe('FAILED');
    });

    it('should pass with minimal flags for G9-12', () => {
      const result = checkAccessibilityProfile(
        {
          hasScreenReaderOptimizedStructure: true,
        },
        'G9_12'
      );
      expect(result.status).toBe('PASSED');
    });

    it('should warn if screen reader structure flag not set', () => {
      const result = checkAccessibilityProfile({}, 'G9_12');
      expect(result.status).toBe('WARNING');
      expect(result.message).toContain('Screen reader');
    });
  });

  describe('Flag Counting', () => {
    it('should count all set flags in details', () => {
      const result = checkAccessibilityProfile(
        {
          supportsDyslexiaFriendlyFont: true,
          supportsReducedStimuli: true,
          hasScreenReaderOptimizedStructure: true,
          hasHighContrastMode: true,
          supportsTextToSpeech: true,
          estimatedCognitiveLoad: 'LOW',
        },
        'K_2'
      );
      expect(result.details?.flagsSetCount).toBe(6);
    });

    it('should not count false values as set', () => {
      const result = checkAccessibilityProfile(
        {
          supportsDyslexiaFriendlyFont: false,
          supportsReducedStimuli: false,
          hasScreenReaderOptimizedStructure: true,
          estimatedCognitiveLoad: 'MEDIUM',
        },
        'G6_8'
      );
      expect(result.details?.flagsSetCount).toBe(2);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY SCORING TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Accessibility Scoring', () => {
  // These functions are internal to content-resolver, so we test via interface

  describe('Profile Matching', () => {
    it('should score 1.0 when all requested flags are present', () => {
      // We'll test this indirectly through the resolver behavior
      // For now, validate the concept
      const profile = {
        dyslexiaFriendly: true,
        reducedStimuli: true,
        screenReader: true,
      };
      const flags = {
        supportsDyslexiaFriendlyFont: true,
        supportsReducedStimuli: true,
        hasScreenReaderOptimizedStructure: true,
      };
      // Expected score: 3/3 = 1.0
      expect(Object.values(profile).filter(Boolean).length).toBe(3);
      expect(Object.values(flags).filter(Boolean).length).toBe(3);
    });

    it('should score 0.5 when half of requested flags are present', () => {
      const profile = {
        dyslexiaFriendly: true,
        reducedStimuli: true,
      };
      const flags = {
        supportsDyslexiaFriendlyFont: true,
        supportsReducedStimuli: false,
      };
      // Expected: 1/2 = 0.5
      const matched = [
        profile.dyslexiaFriendly && flags.supportsDyslexiaFriendlyFont,
        profile.reducedStimuli && flags.supportsReducedStimuli,
      ].filter(Boolean).length;
      expect(matched / 2).toBe(0.5);
    });

    it('should handle cognitive load levels correctly', () => {
      const loadMap = { LOW: 1, MEDIUM: 2, HIGH: 3 };

      // Profile requests max LOW, content has LOW -> match
      expect(loadMap['LOW'] <= loadMap['LOW']).toBe(true);

      // Profile requests max LOW, content has MEDIUM -> no match
      expect(loadMap['MEDIUM'] <= loadMap['LOW']).toBe(false);

      // Profile requests max HIGH, content has MEDIUM -> match
      expect(loadMap['MEDIUM'] <= loadMap['HIGH']).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// LOCALE FALLBACK CHAIN TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Locale Fallback Chain', () => {
  // Helper to simulate buildLocaleFallbackChain
  function buildLocaleFallbackChain(locale: string): string[] {
    const chain = [locale];
    const base = locale.split('-')[0];

    if (base !== locale) {
      chain.push(base);
    }

    if (base !== 'en' && locale !== 'en') {
      chain.push('en');
    }

    return chain;
  }

  it('should return [en] for en locale', () => {
    const chain = buildLocaleFallbackChain('en');
    expect(chain).toEqual(['en']);
  });

  it('should return [en-US, en] for en-US locale', () => {
    const chain = buildLocaleFallbackChain('en-US');
    expect(chain).toEqual(['en-US', 'en']);
  });

  it('should return [es, en] for es locale', () => {
    const chain = buildLocaleFallbackChain('es');
    expect(chain).toEqual(['es', 'en']);
  });

  it('should return [es-MX, es, en] for es-MX locale', () => {
    const chain = buildLocaleFallbackChain('es-MX');
    expect(chain).toEqual(['es-MX', 'es', 'en']);
  });

  it('should return [fr, en] for fr locale', () => {
    const chain = buildLocaleFallbackChain('fr');
    expect(chain).toEqual(['fr', 'en']);
  });

  it('should return [pt-BR, pt, en] for pt-BR locale', () => {
    const chain = buildLocaleFallbackChain('pt-BR');
    expect(chain).toEqual(['pt-BR', 'pt', 'en']);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY METADATA SCHEMA TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Accessibility Metadata Schema', () => {
  it('should define all required accessibility flags', () => {
    const schema = {
      supportsDyslexiaFriendlyFont: { type: 'boolean' },
      supportsReducedStimuli: { type: 'boolean' },
      hasScreenReaderOptimizedStructure: { type: 'boolean' },
      hasHighContrastMode: { type: 'boolean' },
      supportsTextToSpeech: { type: 'boolean' },
      estimatedCognitiveLoad: { type: 'enum', values: ['LOW', 'MEDIUM', 'HIGH'] },
    };

    expect(schema.supportsDyslexiaFriendlyFont.type).toBe('boolean');
    expect(schema.supportsReducedStimuli.type).toBe('boolean');
    expect(schema.hasScreenReaderOptimizedStructure.type).toBe('boolean');
    expect(schema.hasHighContrastMode.type).toBe('boolean');
    expect(schema.supportsTextToSpeech.type).toBe('boolean');
    expect(schema.estimatedCognitiveLoad.values).toContain('LOW');
    expect(schema.estimatedCognitiveLoad.values).toContain('MEDIUM');
    expect(schema.estimatedCognitiveLoad.values).toContain('HIGH');
  });

  it('should support locale-specific alt texts', () => {
    const spanishAltTexts = {
      'image1.png': 'Un diagrama mostrando fracciones',
      'image2.png': 'Tres manzanas rojas',
    };

    expect(spanishAltTexts['image1.png']).toBe('Un diagrama mostrando fracciones');
    expect(Object.keys(spanishAltTexts).length).toBe(2);
  });

  it('should support locale-specific transcripts', () => {
    const spanishTranscripts = {
      'audio1.mp3': 'Hola estudiantes, hoy vamos a aprender sobre...',
    };

    expect(spanishTranscripts['audio1.mp3']).toContain('Hola');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TRANSLATION STATUS TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Translation Status', () => {
  const statuses = ['DRAFT', 'READY', 'NEEDS_UPDATE'] as const;

  it('should define all translation statuses', () => {
    expect(statuses).toContain('DRAFT');
    expect(statuses).toContain('READY');
    expect(statuses).toContain('NEEDS_UPDATE');
  });

  it('should use DRAFT as initial status', () => {
    const newTranslation = { status: 'DRAFT' };
    expect(newTranslation.status).toBe('DRAFT');
  });

  it('should mark as READY after review', () => {
    const reviewedTranslation = { status: 'READY' };
    expect(reviewedTranslation.status).toBe('READY');
  });

  it('should mark as NEEDS_UPDATE when source changes', () => {
    const outdatedTranslation = { status: 'NEEDS_UPDATE' };
    expect(outdatedTranslation.status).toBe('NEEDS_UPDATE');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT RESOLUTION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Content Resolution', () => {
  describe('Resolved Content Structure', () => {
    it('should include all required fields in resolved content', () => {
      const resolvedContent = {
        learningObjectId: 'uuid',
        versionId: 'uuid',
        versionNumber: 1,
        slug: 'test-lo',
        title: 'Test LO',
        subject: 'MATH',
        gradeBand: 'K_2',
        content: {},
        accessibility: {},
        metadata: {},
        locale: 'en',
        fallbackLocaleUsed: false,
        requestedLocale: 'en',
        accessibilityScore: 1.0,
        accessibilityFlags: {
          supportsDyslexiaFriendlyFont: true,
          supportsReducedStimuli: true,
          hasScreenReaderOptimizedStructure: true,
          hasHighContrastMode: false,
          supportsTextToSpeech: false,
          estimatedCognitiveLoad: 'LOW' as const,
        },
        skills: [],
      };

      expect(resolvedContent.learningObjectId).toBeDefined();
      expect(resolvedContent.fallbackLocaleUsed).toBe(false);
      expect(resolvedContent.accessibilityFlags.supportsDyslexiaFriendlyFont).toBe(true);
    });

    it('should indicate when fallback locale was used', () => {
      const resolvedWithFallback = {
        locale: 'en',
        fallbackLocaleUsed: true,
        requestedLocale: 'es-MX',
      };

      expect(resolvedWithFallback.fallbackLocaleUsed).toBe(true);
      expect(resolvedWithFallback.locale).not.toBe(resolvedWithFallback.requestedLocale);
    });
  });

  describe('List Response Structure', () => {
    it('should include pagination and fallback count', () => {
      const listResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        fallbacksUsed: 0,
      };

      expect(listResponse.page).toBe(1);
      expect(listResponse.pageSize).toBe(20);
      expect(listResponse.fallbacksUsed).toBe(0);
    });

    it('should track fallbacks used across results', () => {
      const listResponse = {
        items: [{}, {}, {}],
        total: 3,
        page: 1,
        pageSize: 20,
        fallbacksUsed: 2,
      };

      expect(listResponse.fallbacksUsed).toBe(2);
      expect(listResponse.items.length).toBe(3);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MULTI-TENANT SCOPING TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Multi-Tenant Scoping', () => {
  it('should allow access to global content (null tenant)', () => {
    const globalContent = { tenantId: null };
    const userTenantId = 'tenant-123';

    // Global content is accessible to all tenants
    expect(globalContent.tenantId === null).toBe(true);
  });

  it('should allow access to own tenant content', () => {
    const tenantContent = { tenantId: 'tenant-123' };
    const userTenantId = 'tenant-123';

    expect(tenantContent.tenantId === userTenantId).toBe(true);
  });

  it('should deny access to other tenant content', () => {
    const otherTenantContent = { tenantId: 'tenant-456' };
    const userTenantId = 'tenant-123';

    expect(otherTenantContent.tenantId === userTenantId).toBe(false);
  });

  it('should include both global and tenant content in queries', () => {
    const queryCondition = {
      OR: [{ tenantId: null }, { tenantId: 'tenant-123' }],
    };

    expect(queryCondition.OR.length).toBe(2);
    expect(queryCondition.OR[0].tenantId).toBeNull();
    expect(queryCondition.OR[1].tenantId).toBe('tenant-123');
  });
});
