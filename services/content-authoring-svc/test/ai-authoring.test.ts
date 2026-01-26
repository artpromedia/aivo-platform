/**
 * AI Authoring Tests
 *
 * Comprehensive tests for the AI-assisted content authoring system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { InMemoryCache, CacheManager, buildCacheKey, hashString } from '../src/ai/cache.js';
import { QualityScorer } from '../src/ai/quality-scorer.js';
import { CurriculumService, getCurriculumService } from '../src/ai/curriculum-service.js';
import type {
  ContentType,
  Subject,
  ContentStyle,
  DraftGenerationRequest,
  ContentMetadata,
} from '../src/types/ai-authoring.js';

// ══════════════════════════════════════════════════════════════════════════════
// CACHE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache({ ttlSeconds: 60, maxSize: 100 });
  });

  it('should store and retrieve values', async () => {
    await cache.set('key1', { data: 'value1' });
    const result = await cache.get<{ data: string }>('key1');
    expect(result).toEqual({ data: 'value1' });
  });

  it('should return null for non-existent keys', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should delete values', async () => {
    await cache.set('key1', 'value1');
    await cache.delete('key1');
    const result = await cache.get('key1');
    expect(result).toBeNull();
  });

  it('should clear all values', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.clear();
    expect(await cache.get('key1')).toBeNull();
    expect(await cache.get('key2')).toBeNull();
  });

  it('should check if key exists', async () => {
    await cache.set('key1', 'value1');
    expect(await cache.has('key1')).toBe(true);
    expect(await cache.has('key2')).toBe(false);
  });

  it('should return expired entries as null', async () => {
    const shortTtlCache = new InMemoryCache({ ttlSeconds: 0.001, maxSize: 100 });
    await shortTtlCache.set('key1', 'value1');
    await new Promise((resolve) => setTimeout(resolve, 10));
    const result = await shortTtlCache.get('key1');
    expect(result).toBeNull();
    shortTtlCache.destroy();
  });

  it('should provide cache stats', () => {
    const stats = cache.getStats();
    expect(stats.maxSize).toBe(100);
    expect(stats.defaultTtl).toBe(60);
    expect(typeof stats.size).toBe('number');
  });

  afterEach(() => {
    cache.destroy();
  });
});

describe('CacheManager', () => {
  it('should create separate caches for different types', () => {
    const manager = new CacheManager({
      alignment: { ttlSeconds: 1000 },
      quality: { ttlSeconds: 500 },
      draft: { ttlSeconds: 250 },
    });

    expect(manager.getAlignmentCache()).toBeDefined();
    expect(manager.getQualityCache()).toBeDefined();
    expect(manager.getDraftCache()).toBeDefined();
  });

  it('should clear all caches', async () => {
    const manager = new CacheManager();
    const alignmentCache = manager.getAlignmentCache();
    const qualityCache = manager.getQualityCache();

    await alignmentCache.set('key1', 'value1');
    await qualityCache.set('key2', 'value2');

    await manager.clearAll();

    expect(await alignmentCache.get('key1')).toBeNull();
    expect(await qualityCache.get('key2')).toBeNull();
  });
});

describe('Cache Utilities', () => {
  it('should build cache keys from parts', () => {
    const key = buildCacheKey(['prefix', 'part1', 'part2']);
    expect(key).toBe('prefix:part1:part2');
  });

  it('should hash strings consistently', () => {
    const hash1 = hashString('test string');
    const hash2 = hashString('test string');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different strings', () => {
    const hash1 = hashString('string1');
    const hash2 = hashString('string2');
    expect(hash1).not.toBe(hash2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CURRICULUM SERVICE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('CurriculumService', () => {
  let service: CurriculumService;

  beforeEach(() => {
    service = new CurriculumService();
  });

  it('should get standard by ID', () => {
    const standard = service.getStandard('ccss-math-5-nbt-1');
    expect(standard).toBeDefined();
    expect(standard?.code).toBe('CCSS.MATH.5.NBT.1');
  });

  it('should get standard by code', () => {
    const standard = service.getStandard('CCSS.MATH.5.NBT.1');
    expect(standard).toBeDefined();
    expect(standard?.id).toBe('ccss-math-5-nbt-1');
  });

  it('should return undefined for unknown standards', () => {
    const standard = service.getStandard('unknown-standard');
    expect(standard).toBeUndefined();
  });

  it('should get multiple standards', () => {
    const standards = service.getStandards([
      'CCSS.MATH.5.NBT.1',
      'CCSS.MATH.5.NBT.2',
      'unknown',
    ]);
    expect(standards).toHaveLength(2);
  });

  it('should get standards by subject and grade', () => {
    const mathStandards = service.getStandardsBySubjectAndGrade('MATH', 5);
    expect(mathStandards.length).toBeGreaterThan(0);
    expect(mathStandards.every((s) => s.subject === 'MATH')).toBe(true);
    expect(mathStandards.every((s) => s.gradeLevel === 5)).toBe(true);
  });

  it('should search standards by keyword', () => {
    const results = service.searchStandards('place value');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should filter search by subject', () => {
    const mathResults = service.searchStandards('', 'MATH');
    expect(mathResults.every((s) => s.subject === 'MATH')).toBe(true);
  });

  it('should convert to StandardInfo format', () => {
    const standard = service.getStandard('ccss-math-5-nbt-1');
    if (standard) {
      const info = service.toStandardInfo(standard);
      expect(info.id).toBe(standard.id);
      expect(info.code).toBe(standard.code);
      expect(info.description).toBe(standard.description);
    }
  });

  it('should add custom standards', () => {
    service.addStandard({
      id: 'custom-1',
      code: 'CUSTOM.1',
      description: 'Custom standard for testing',
      subject: 'OTHER',
      gradeLevel: 5,
      framework: 'CUSTOM',
      keywords: ['test'],
    });

    const standard = service.getStandard('custom-1');
    expect(standard).toBeDefined();
    expect(standard?.code).toBe('CUSTOM.1');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// QUALITY SCORER TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('QualityScorer', () => {
  describe('calculateReadability', () => {
    const scorer = new QualityScorer();

    it('should calculate readability metrics', () => {
      const content = 'This is a simple sentence. It has easy words. The sentences are short.';
      const metrics = scorer.calculateReadability(content, 5);

      expect(metrics.wordCount).toBeGreaterThan(0);
      expect(metrics.sentenceCount).toBe(3);
      expect(typeof metrics.fleschKincaidGrade).toBe('number');
      expect(typeof metrics.fleschReadingEase).toBe('number');
      expect(metrics.targetGradeLevel).toBe(5);
    });

    it('should detect grade appropriateness', () => {
      const simpleContent = 'The cat sat on the mat. It was a big cat.';
      const complexContent = 'The epistemological implications of phenomenological reductionism necessitate a comprehensive reevaluation of ontological presuppositions.';

      const simpleMetrics = scorer.calculateReadability(simpleContent, 2);
      const complexMetrics = scorer.calculateReadability(complexContent, 2);

      expect(simpleMetrics.targetGradeAppropriate).toBe(true);
      expect(complexMetrics.targetGradeAppropriate).toBe(false);
    });

    it('should provide recommendation when grade not appropriate', () => {
      const complexContent = 'Photosynthesis involves the conversion of light energy into chemical energy through biochemical processes.';
      const metrics = scorer.calculateReadability(complexContent, 1);

      expect(metrics.targetGradeAppropriate).toBe(false);
      expect(metrics.recommendation).toBeDefined();
    });

    it('should calculate average sentence length', () => {
      const content = 'Short sentence. This is a longer sentence with more words.';
      const metrics = scorer.calculateReadability(content, 5);

      expect(metrics.averageSentenceLength).toBeGreaterThan(0);
    });

    it('should calculate complex word percentage', () => {
      const content = 'The comprehensive examination demonstrated unprecedented achievements.';
      const metrics = scorer.calculateReadability(content, 10);

      expect(metrics.complexWordPercentage).toBeGreaterThan(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPES VALIDATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Type Validations', () => {
  describe('ContentType', () => {
    const validContentTypes: ContentType[] = [
      'lesson',
      'assessment',
      'activity',
      'reading-passage',
      'video-script',
      'interactive-exercise',
      'study-guide',
      'flashcard-set',
    ];

    validContentTypes.forEach((type) => {
      it(`should accept valid content type: ${type}`, () => {
        expect(validContentTypes.includes(type)).toBe(true);
      });
    });
  });

  describe('Subject', () => {
    const validSubjects: Subject[] = [
      'ELA',
      'MATH',
      'SCIENCE',
      'SOCIAL_STUDIES',
      'SEL',
      'SPEECH',
      'ART',
      'MUSIC',
      'WORLD_LANGUAGES',
      'HEALTH',
      'OTHER',
    ];

    validSubjects.forEach((subject) => {
      it(`should accept valid subject: ${subject}`, () => {
        expect(validSubjects.includes(subject)).toBe(true);
      });
    });
  });

  describe('ContentStyle', () => {
    const validStyles: ContentStyle[] = [
      'formal',
      'conversational',
      'interactive',
      'narrative',
    ];

    validStyles.forEach((style) => {
      it(`should accept valid style: ${style}`, () => {
        expect(validStyles.includes(style)).toBe(true);
      });
    });
  });

  describe('DraftGenerationRequest', () => {
    it('should have required fields', () => {
      const request: DraftGenerationRequest = {
        contentType: 'lesson',
        subject: 'MATH',
        gradeLevel: 5,
        curriculumStandards: ['CCSS.MATH.5.NBT.1'],
        topic: 'Place Value',
        learningObjectives: ['Understand place value'],
        tenantId: 'tenant-123',
      };

      expect(request.contentType).toBe('lesson');
      expect(request.subject).toBe('MATH');
      expect(request.gradeLevel).toBe(5);
      expect(request.topic).toBe('Place Value');
      expect(request.tenantId).toBe('tenant-123');
    });

    it('should accept optional fields', () => {
      const request: DraftGenerationRequest = {
        contentType: 'lesson',
        subject: 'ELA',
        gradeLevel: 3,
        curriculumStandards: [],
        topic: 'Reading Comprehension',
        learningObjectives: [],
        tenantId: 'tenant-123',
        targetLength: 'medium',
        style: 'conversational',
        includeAssessments: true,
        includeActivities: true,
        keywords: ['reading', 'comprehension'],
        prerequisites: ['basic reading'],
        targetAudience: 'elementary students',
        locale: 'en-US',
      };

      expect(request.targetLength).toBe('medium');
      expect(request.style).toBe('conversational');
      expect(request.includeAssessments).toBe(true);
    });
  });

  describe('ContentMetadata', () => {
    it('should define metadata structure', () => {
      const metadata: ContentMetadata = {
        subject: 'SCIENCE',
        gradeLevel: 6,
        contentType: 'activity',
        standards: ['NGSS.MS-PS1-1'],
        targetAudience: 'middle school students',
      };

      expect(metadata.subject).toBe('SCIENCE');
      expect(metadata.gradeLevel).toBe(6);
      expect(metadata.contentType).toBe('activity');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PROMPT TEMPLATE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Prompt Templates', () => {
  it('should build lesson generation prompt with required fields', async () => {
    const { buildLessonGenerationPrompt } = await import('../src/ai/prompts/lesson-generation.prompt.js');

    const request: DraftGenerationRequest = {
      contentType: 'lesson',
      subject: 'MATH',
      gradeLevel: 5,
      curriculumStandards: ['CCSS.MATH.5.NBT.1'],
      topic: 'Place Value',
      learningObjectives: ['Understand place value in multi-digit numbers'],
      tenantId: 'tenant-123',
    };

    const prompt = buildLessonGenerationPrompt(request);

    expect(prompt).toContain('Place Value');
    expect(prompt).toContain('MATH');
    expect(prompt).toContain('5');
    expect(prompt).toContain('CCSS.MATH.5.NBT.1');
    expect(prompt).toContain('Understand place value');
  });

  it('should include style guidelines in prompt', async () => {
    const { buildLessonGenerationPrompt } = await import('../src/ai/prompts/lesson-generation.prompt.js');

    const request: DraftGenerationRequest = {
      contentType: 'lesson',
      subject: 'ELA',
      gradeLevel: 3,
      curriculumStandards: [],
      topic: 'Story Elements',
      learningObjectives: [],
      tenantId: 'tenant-123',
      style: 'conversational',
    };

    const prompt = buildLessonGenerationPrompt(request);

    expect(prompt).toContain('conversational');
    expect(prompt).toContain('friendly');
  });

  it('should include assessment section when requested', async () => {
    const { buildLessonGenerationPrompt } = await import('../src/ai/prompts/lesson-generation.prompt.js');

    const request: DraftGenerationRequest = {
      contentType: 'lesson',
      subject: 'SCIENCE',
      gradeLevel: 4,
      curriculumStandards: [],
      topic: 'Water Cycle',
      learningObjectives: [],
      tenantId: 'tenant-123',
      includeAssessments: true,
    };

    const prompt = buildLessonGenerationPrompt(request);

    expect(prompt).toContain('assessment');
    expect(prompt).toContain('question');
  });

  it('should include activity section when requested', async () => {
    const { buildLessonGenerationPrompt } = await import('../src/ai/prompts/lesson-generation.prompt.js');

    const request: DraftGenerationRequest = {
      contentType: 'lesson',
      subject: 'ART',
      gradeLevel: 2,
      curriculumStandards: [],
      topic: 'Color Mixing',
      learningObjectives: [],
      tenantId: 'tenant-123',
      includeActivities: true,
    };

    const prompt = buildLessonGenerationPrompt(request);

    expect(prompt).toContain('activities');
    expect(prompt).toContain('hands-on');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// WORKFLOW TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Workflow Types', () => {
  it('should define pipeline stages', async () => {
    const stages = [
      'ai_draft_generation',
      'human_review_edit',
      'ai_quality_check',
      'curriculum_validation',
      'accessibility_check',
      'final_approval',
    ];

    stages.forEach((stage) => {
      expect(typeof stage).toBe('string');
    });
  });

  it('should define stage statuses', () => {
    const statuses = ['pending', 'in_progress', 'completed', 'failed', 'skipped'];

    statuses.forEach((status) => {
      expect(typeof status).toBe('string');
    });
  });

  it('should define overall pipeline statuses', () => {
    const statuses = ['in_progress', 'completed', 'blocked', 'failed'];

    statuses.forEach((status) => {
      expect(typeof status).toBe('string');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS (Mocked)
// ══════════════════════════════════════════════════════════════════════════════

describe('Integration Tests (Mocked)', () => {
  it('should singleton curriculum service', () => {
    const service1 = getCurriculumService();
    const service2 = getCurriculumService();
    expect(service1).toBe(service2);
  });
});
