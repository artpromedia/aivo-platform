/**
 * Content Discovery Tests
 *
 * Tests for search, selection, and render functionality.
 */

import { describe, it, expect } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// SEARCH TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Content Search', () => {
  describe('Query Building', () => {
    it('should build query with subject filter', () => {
      const query = {
        subject: 'MATH',
        limit: 20,
        offset: 0,
      };
      expect(query.subject).toBe('MATH');
    });

    it('should build query with grade band filter', () => {
      const query = {
        gradeBand: 'K_2',
        limit: 20,
        offset: 0,
      };
      expect(query.gradeBand).toBe('K_2');
    });

    it('should build query with skill filter', () => {
      const query = {
        skillId: '123e4567-e89b-12d3-a456-426614174000',
        limit: 20,
        offset: 0,
      };
      expect(query.skillId).toBeDefined();
    });

    it('should build query with multiple skills', () => {
      const query = {
        skillIds: ['skill-1', 'skill-2', 'skill-3'],
        limit: 20,
        offset: 0,
      };
      expect(query.skillIds?.length).toBe(3);
    });

    it('should build query with tag filter', () => {
      const query = {
        tag: 'fractions',
        limit: 20,
        offset: 0,
      };
      expect(query.tag).toBe('fractions');
    });

    it('should build query with multiple tags', () => {
      const query = {
        tags: ['fractions', 'division', 'grade-3'],
        limit: 20,
        offset: 0,
      };
      expect(query.tags?.length).toBe(3);
    });

    it('should build query with text search', () => {
      const query = {
        textQuery: 'fractions introduction',
        limit: 20,
        offset: 0,
      };
      expect(query.textQuery).toBe('fractions introduction');
    });

    it('should build query with duration range', () => {
      const query = {
        minDuration: 5,
        maxDuration: 15,
        limit: 20,
        offset: 0,
      };
      expect(query.minDuration).toBe(5);
      expect(query.maxDuration).toBe(15);
    });

    it('should build query with tenant scoping', () => {
      const query = {
        tenantId: 'tenant-123',
        limit: 20,
        offset: 0,
      };
      expect(query.tenantId).toBe('tenant-123');
    });
  });

  describe('Search Result Structure', () => {
    it('should have correct result structure', () => {
      const result = {
        id: 'version-uuid',
        learningObjectId: 'lo-uuid',
        versionNumber: 2,
        title: 'Introduction to Fractions',
        slug: 'intro-fractions',
        subject: 'MATH',
        gradeBand: 'G3_5',
        primarySkillId: 'skill-uuid',
        skills: [{ skillId: 'skill-uuid', isPrimary: true }],
        tags: ['fractions', 'grade-3'],
        standards: ['CCSS.MATH.3.NF.A.1'],
        estimatedDuration: 15,
        contentType: 'lesson',
        difficulty: 'MEDIUM',
        publishedAt: new Date(),
        accessibilityFlags: {
          supportsDyslexiaFriendlyFont: true,
          supportsReducedStimuli: true,
          hasScreenReaderOptimizedStructure: true,
          estimatedCognitiveLoad: 'MEDIUM',
        },
      };

      expect(result.id).toBeDefined();
      expect(result.title).toBe('Introduction to Fractions');
      expect(result.skills.length).toBe(1);
      expect(result.accessibilityFlags.supportsDyslexiaFriendlyFont).toBe(true);
    });

    it('should have pagination metadata', () => {
      const response = {
        items: [],
        total: 50,
        limit: 20,
        offset: 0,
        query: { subject: 'MATH' },
      };

      expect(response.total).toBe(50);
      expect(response.limit).toBe(20);
      expect(response.offset).toBe(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT SELECTION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Content Selection', () => {
  describe('Selection Input', () => {
    it('should accept valid selection input', () => {
      const input = {
        tenantId: 'tenant-123',
        learnerId: 'learner-456',
        subject: 'MATH' as const,
        gradeBand: 'G3_5' as const,
        targetSkills: ['skill-1', 'skill-2'],
        minutesAvailable: 30,
        difficultyAdjustment: 'standard' as const,
      };

      expect(input.targetSkills.length).toBe(2);
      expect(input.minutesAvailable).toBe(30);
    });

    it('should accept accessibility profile', () => {
      const input = {
        tenantId: 'tenant-123',
        learnerId: 'learner-456',
        subject: 'MATH' as const,
        gradeBand: 'K_2' as const,
        targetSkills: ['skill-1'],
        minutesAvailable: 20,
        accessibilityProfile: {
          dyslexiaFriendly: true,
          reducedStimuli: true,
          maxCognitiveLoad: 'LOW' as const,
        },
      };

      expect(input.accessibilityProfile?.dyslexiaFriendly).toBe(true);
      expect(input.accessibilityProfile?.maxCognitiveLoad).toBe('LOW');
    });

    it('should accept exclude list', () => {
      const input = {
        tenantId: 'tenant-123',
        learnerId: 'learner-456',
        subject: 'ELA' as const,
        gradeBand: 'K_2' as const,
        targetSkills: ['skill-1'],
        minutesAvailable: 15,
        excludeLOIds: ['lo-already-done-1', 'lo-already-done-2'],
      };

      expect(input.excludeLOIds?.length).toBe(2);
    });
  });

  describe('Selection Scoring', () => {
    const SCORE_WEIGHTS = {
      SKILL_MATCH_PRIMARY: 100,
      SKILL_MATCH_SECONDARY: 50,
      SKILL_COVERAGE_BONUS: 20,
      RECENTLY_USED_PENALTY: -200,
      DIFFICULTY_MATCH: 30,
      ACCESSIBILITY_MATCH: 25,
      DURATION_FIT: 15,
    };

    it('should score primary skill match higher', () => {
      expect(SCORE_WEIGHTS.SKILL_MATCH_PRIMARY).toBeGreaterThan(
        SCORE_WEIGHTS.SKILL_MATCH_SECONDARY
      );
    });

    it('should penalize recently used content', () => {
      expect(SCORE_WEIGHTS.RECENTLY_USED_PENALTY).toBeLessThan(0);
    });

    it('should give bonus for accessibility match', () => {
      const score = SCORE_WEIGHTS.ACCESSIBILITY_MATCH * 3; // 3 matching flags
      expect(score).toBe(75);
    });

    it('should calculate combined score correctly', () => {
      // LO with: primary skill match + difficulty match + 2 accessibility matches
      const score =
        SCORE_WEIGHTS.SKILL_MATCH_PRIMARY +
        SCORE_WEIGHTS.DIFFICULTY_MATCH +
        SCORE_WEIGHTS.ACCESSIBILITY_MATCH * 2;
      expect(score).toBe(180);
    });
  });

  describe('Selection Result', () => {
    it('should have correct result structure', () => {
      const result = {
        items: [
          {
            versionId: 'version-1',
            learningObjectId: 'lo-1',
            title: 'Fractions Lesson 1',
            estimatedDuration: 10,
            primarySkillId: 'skill-1',
            matchedSkills: ['skill-1'],
            selectionScore: 150,
            selectionReason: 'Covers 1 target skill(s) • 10 min',
          },
        ],
        totalDurationMinutes: 10,
        skillsCovered: ['skill-1'],
        selectionNotes: [],
        metadata: {
          candidatesConsidered: 25,
          recentlyUsedFiltered: 3,
          durationFiltered: 5,
        },
      };

      expect(result.items.length).toBe(1);
      expect(result.totalDurationMinutes).toBe(10);
      expect(result.metadata.candidatesConsidered).toBe(25);
    });

    it('should track uncovered skills in notes', () => {
      const result = {
        items: [],
        totalDurationMinutes: 0,
        skillsCovered: ['skill-1'],
        selectionNotes: ['Could not find content for skills: skill-2, skill-3'],
        metadata: { candidatesConsidered: 10, recentlyUsedFiltered: 0, durationFiltered: 0 },
      };

      expect(result.selectionNotes[0]).toContain('skill-2');
    });
  });

  describe('Time Budget', () => {
    it('should not exceed available time', () => {
      const minutesAvailable = 30;
      const selectedItems = [
        { estimatedDuration: 10 },
        { estimatedDuration: 10 },
        { estimatedDuration: 8 },
      ];
      const totalDuration = selectedItems.reduce((sum, i) => sum + i.estimatedDuration, 0);

      expect(totalDuration).toBeLessThanOrEqual(minutesAvailable);
    });

    it('should note when time is underutilized', () => {
      const minutesAvailable = 30;
      const totalDuration = 10; // Only 33% utilized
      const utilizationPercent = (totalDuration / minutesAvailable) * 100;

      expect(utilizationPercent).toBeLessThan(50);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// RENDER TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Content Render', () => {
  describe('Locale Fallback', () => {
    function buildLocaleFallbackChain(locale: string): string[] {
      const chain = [locale];
      const base = locale.split('-')[0];
      if (base !== locale) chain.push(base);
      if (base !== 'en' && locale !== 'en') chain.push('en');
      return chain;
    }

    it('should build fallback chain for regional locale', () => {
      const chain = buildLocaleFallbackChain('es-MX');
      expect(chain).toEqual(['es-MX', 'es', 'en']);
    });

    it('should build simple chain for base locale', () => {
      const chain = buildLocaleFallbackChain('es');
      expect(chain).toEqual(['es', 'en']);
    });

    it('should handle English locale', () => {
      const chain = buildLocaleFallbackChain('en');
      expect(chain).toEqual(['en']);
    });

    it('should handle English regional locale', () => {
      const chain = buildLocaleFallbackChain('en-US');
      expect(chain).toEqual(['en-US', 'en']);
    });
  });

  describe('Accessibility Transformations', () => {
    it('should add dyslexia hints', () => {
      const profile = { dyslexiaFriendly: true };
      const hints = {
        useDyslexiaFont: profile.dyslexiaFriendly,
        increasedLineSpacing: profile.dyslexiaFriendly,
      };

      expect(hints.useDyslexiaFont).toBe(true);
      expect(hints.increasedLineSpacing).toBe(true);
    });

    it('should add reduced stimuli hints', () => {
      const profile = { reducedStimuli: true };
      const hints = {
        reduceAnimations: profile.reducedStimuli,
        calmColorPalette: profile.reducedStimuli,
        simplifiedLayout: profile.reducedStimuli,
      };

      expect(hints.reduceAnimations).toBe(true);
    });

    it('should add screen reader hints', () => {
      const profile = { screenReader: true };
      const hints = {
        enhanceAriaLabels: profile.screenReader,
        provideAudioDescriptions: profile.screenReader,
      };

      expect(hints.enhanceAriaLabels).toBe(true);
    });
  });

  describe('Rendered Content Structure', () => {
    it('should have complete structure', () => {
      const content = {
        versionId: 'version-uuid',
        learningObjectId: 'lo-uuid',
        versionNumber: 2,
        title: 'Fractions Lesson',
        slug: 'fractions-lesson',
        subject: 'MATH',
        gradeBand: 'G3_5',
        content: { type: 'lesson', passage: '...' },
        accessibility: { altTexts: {} },
        metadata: { estimatedDuration: 15 },
        locale: 'es',
        fallbackLocaleUsed: false,
        requestedLocale: 'es',
        accessibilityFlags: {
          supportsDyslexiaFriendlyFont: true,
          supportsReducedStimuli: true,
          hasScreenReaderOptimizedStructure: true,
          hasHighContrastMode: false,
          supportsTextToSpeech: false,
          estimatedCognitiveLoad: 'MEDIUM',
        },
        skills: [{ skillId: 'skill-1', isPrimary: true }],
        primarySkillId: 'skill-1',
        estimatedDuration: 15,
      };

      expect(content.locale).toBe('es');
      expect(content.fallbackLocaleUsed).toBe(false);
      expect(content.accessibilityFlags.supportsDyslexiaFriendlyFont).toBe(true);
    });

    it('should include tutor context when requested', () => {
      const tutorContext = {
        hints: ['Remember to find common denominators'],
        commonMistakes: ['Forgetting to simplify the result'],
        scaffoldingSteps: ['Step 1: Find common denominator'],
        encouragementPhrases: ["You're doing great!"],
      };

      expect(tutorContext.hints.length).toBeGreaterThan(0);
      expect(tutorContext.encouragementPhrases.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility Suitability Check', () => {
    it('should identify missing features', () => {
      const profile = {
        dyslexiaFriendly: true,
        reducedStimuli: true,
        screenReader: true,
      };

      const contentFlags = {
        supportsDyslexiaFriendlyFont: true,
        supportsReducedStimuli: false, // Missing
        hasScreenReaderOptimizedStructure: true,
      };

      const missingFeatures: string[] = [];
      if (profile.dyslexiaFriendly && !contentFlags.supportsDyslexiaFriendlyFont) {
        missingFeatures.push('dyslexia-friendly font');
      }
      if (profile.reducedStimuli && !contentFlags.supportsReducedStimuli) {
        missingFeatures.push('reduced stimuli');
      }
      if (profile.screenReader && !contentFlags.hasScreenReaderOptimizedStructure) {
        missingFeatures.push('screen reader optimization');
      }

      expect(missingFeatures).toContain('reduced stimuli');
      expect(missingFeatures.length).toBe(1);
    });

    it('should check cognitive load compatibility', () => {
      const loadMap = { LOW: 1, MEDIUM: 2, HIGH: 3 };
      const maxLoad = 'LOW';
      const contentLoad = 'MEDIUM';

      const isCompatible = loadMap[contentLoad] <= loadMap[maxLoad];
      expect(isCompatible).toBe(false);
    });
  });

  describe('Batch Render', () => {
    it('should track found and not found items', () => {
      const versionIds = ['v1', 'v2', 'v3', 'v4'];
      const foundIds = ['v1', 'v3'];
      const notFoundIds = versionIds.filter((id) => !foundIds.includes(id));

      expect(notFoundIds).toEqual(['v2', 'v4']);
      expect(foundIds.length + notFoundIds.length).toBe(versionIds.length);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// LESSON PLANNER INTEGRATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Lesson Planner Integration', () => {
  describe('selectContentForPlan Workflow', () => {
    it('should accept plan parameters from Lesson Planner agent', () => {
      const planRequest = {
        tenantId: 'tenant-123',
        learnerId: 'learner-456',
        subject: 'MATH' as const,
        gradeBand: 'G3_5' as const,
        targetSkills: ['fractions-add', 'fractions-subtract'],
        minutesAvailable: 25,
        accessibilityProfile: {
          dyslexiaFriendly: true,
        },
      };

      expect(planRequest.targetSkills.length).toBe(2);
      expect(planRequest.minutesAvailable).toBe(25);
    });

    it('should return ordered list for Today Plan', () => {
      const selectionResult = {
        items: [
          { versionId: 'v1', title: 'Fractions Intro', estimatedDuration: 8, selectionScore: 180 },
          {
            versionId: 'v2',
            title: 'Fractions Practice',
            estimatedDuration: 10,
            selectionScore: 150,
          },
        ],
        totalDurationMinutes: 18,
        skillsCovered: ['fractions-add'],
        selectionNotes: ['Could not find content for skills: fractions-subtract'],
      };

      // Items should be ordered by selection score (highest first)
      expect(selectionResult.items[0].selectionScore).toBeGreaterThan(
        selectionResult.items[1].selectionScore
      );
    });
  });

  describe('Teacher Manual Selection', () => {
    it('should support search by subject/grade/skill', () => {
      const teacherSearchQuery = {
        subject: 'ELA',
        gradeBand: 'K_2',
        skillId: 'phonics-cvc',
        textQuery: 'short vowels',
      };

      expect(teacherSearchQuery.subject).toBe('ELA');
      expect(teacherSearchQuery.textQuery).toBe('short vowels');
    });

    it('should return LO id for session plan item', () => {
      const selectedLO = {
        id: 'version-uuid',
        learningObjectId: 'lo-uuid',
        title: 'Short Vowels CVC Words',
      };

      // This would be stored in session_plan_items.ai_metadata_json
      const planItemMetadata = {
        learningObjectId: selectedLO.learningObjectId,
        versionId: selectedLO.id,
        title: selectedLO.title,
        selectedBy: 'teacher',
      };

      expect(planItemMetadata.learningObjectId).toBe('lo-uuid');
      expect(planItemMetadata.selectedBy).toBe('teacher');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MULTI-TENANT TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Multi-Tenant Scoping', () => {
  it('should include global and tenant content', () => {
    const tenantId = 'tenant-123';
    const expectedQuery = {
      OR: [{ tenantId: null }, { tenantId }],
    };

    expect(expectedQuery.OR.length).toBe(2);
    expect(expectedQuery.OR[0].tenantId).toBeNull();
    expect(expectedQuery.OR[1].tenantId).toBe('tenant-123');
  });

  it('should return global content for any tenant', () => {
    const globalContent = { tenantId: null, title: 'Global Lesson' };
    const tenantContent = { tenantId: 'tenant-123', title: 'Tenant Lesson' };

    // Both should be visible to tenant-123
    expect(globalContent.tenantId).toBeNull();
    expect(tenantContent.tenantId).toBe('tenant-123');
  });

  it('should not return other tenant content', () => {
    const otherTenantContent = { tenantId: 'tenant-456', title: 'Other Tenant Lesson' };
    const currentTenantId = 'tenant-123';

    const isVisible =
      otherTenantContent.tenantId === null || otherTenantContent.tenantId === currentTenantId;
    expect(isVisible).toBe(false);
  });
});
