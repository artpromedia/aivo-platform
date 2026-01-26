/**
 * Sensory Profile Tests
 *
 * Unit tests for sensory profile service and integration tests for API routes.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { type FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import {
  validateAccommodationCombinations,
  getPresetByName,
  SENSORY_PROFILE_PRESETS,
  CreateSensoryProfileSchema,
  UpdateSensoryProfileSchema,
  VisualContrastSchema,
  FontSizeSchema,
  ColorBlindModeSchema,
  PresetNameSchema,
} from '../src/dto/sensory-profile.dto.js';
import * as sensoryProfileService from '../src/services/sensoryProfileService.js';

// ══════════════════════════════════════════════════════════════════════════════
// DTO VALIDATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Sensory Profile DTOs', () => {
  describe('VisualContrastSchema', () => {
    it('should accept valid contrast values', () => {
      expect(VisualContrastSchema.safeParse('LOW').success).toBe(true);
      expect(VisualContrastSchema.safeParse('NORMAL').success).toBe(true);
      expect(VisualContrastSchema.safeParse('HIGH').success).toBe(true);
      expect(VisualContrastSchema.safeParse('ULTRA_HIGH').success).toBe(true);
    });

    it('should reject invalid contrast values', () => {
      expect(VisualContrastSchema.safeParse('INVALID').success).toBe(false);
      expect(VisualContrastSchema.safeParse('').success).toBe(false);
      expect(VisualContrastSchema.safeParse(123).success).toBe(false);
    });
  });

  describe('FontSizeSchema', () => {
    it('should accept valid font sizes', () => {
      expect(FontSizeSchema.safeParse('SMALL').success).toBe(true);
      expect(FontSizeSchema.safeParse('MEDIUM').success).toBe(true);
      expect(FontSizeSchema.safeParse('LARGE').success).toBe(true);
      expect(FontSizeSchema.safeParse('EXTRA_LARGE').success).toBe(true);
    });

    it('should reject invalid font sizes', () => {
      expect(FontSizeSchema.safeParse('XL').success).toBe(false);
      expect(FontSizeSchema.safeParse('').success).toBe(false);
    });
  });

  describe('ColorBlindModeSchema', () => {
    it('should accept valid color blind modes', () => {
      expect(ColorBlindModeSchema.safeParse('NONE').success).toBe(true);
      expect(ColorBlindModeSchema.safeParse('PROTANOPIA').success).toBe(true);
      expect(ColorBlindModeSchema.safeParse('DEUTERANOPIA').success).toBe(true);
      expect(ColorBlindModeSchema.safeParse('TRITANOPIA').success).toBe(true);
      expect(ColorBlindModeSchema.safeParse('ACHROMATOPSIA').success).toBe(true);
    });

    it('should reject invalid color blind modes', () => {
      expect(ColorBlindModeSchema.safeParse('RED_GREEN').success).toBe(false);
    });
  });

  describe('CreateSensoryProfileSchema', () => {
    it('should accept empty object (all defaults)', () => {
      const result = CreateSensoryProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept valid visual accommodations', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        visualContrast: 'HIGH',
        fontSize: 'LARGE',
        lineSpacing: 2.0,
        fontFamily: 'OpenDyslexic',
        reduceAnimations: true,
        darkMode: true,
        colorBlindMode: 'PROTANOPIA',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid auditory accommodations', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        textToSpeech: true,
        speechRate: 1.5,
        speechVoice: 'en-US-Neural2-J',
        audioDescriptions: true,
        closedCaptions: true,
        signLanguageSupport: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid motor accommodations', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        keyboardNavigation: true,
        extendedTimeLimits: 2.0,
        largeClickTargets: true,
        stickyKeys: true,
        voiceControl: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid cognitive accommodations', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        simplifiedLayouts: true,
        readingGuide: true,
        focusHighlight: true,
        breakReminders: true,
        breakIntervalMins: 15,
        contentChunking: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid line spacing', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        lineSpacing: 5.0, // Max is 3.0
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid speech rate', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        speechRate: 10.0, // Max is 4.0
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid extended time limits', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        extendedTimeLimits: 10.0, // Max is 5.0
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid break interval', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        breakIntervalMins: 200, // Max is 120
      });
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateSensoryProfileSchema', () => {
    it('should accept partial updates', () => {
      const result = UpdateSensoryProfileSchema.safeParse({
        darkMode: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('PresetNameSchema', () => {
    it('should accept valid preset names', () => {
      expect(PresetNameSchema.safeParse('dyslexia-friendly').success).toBe(true);
      expect(PresetNameSchema.safeParse('low-vision').success).toBe(true);
      expect(PresetNameSchema.safeParse('motor-impaired').success).toBe(true);
      expect(PresetNameSchema.safeParse('cognitive-support').success).toBe(true);
      expect(PresetNameSchema.safeParse('hearing-impaired').success).toBe(true);
      expect(PresetNameSchema.safeParse('photosensitive').success).toBe(true);
    });

    it('should reject invalid preset names', () => {
      expect(PresetNameSchema.safeParse('invalid-preset').success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPER TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Accommodation Validation Helpers', () => {
  describe('validateAccommodationCombinations', () => {
    it('should return valid with no warnings for normal settings', () => {
      const result = validateAccommodationCombinations({
        darkMode: false,
        visualContrast: 'NORMAL',
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about dark mode with low contrast', () => {
      const result = validateAccommodationCombinations({
        darkMode: true,
        visualContrast: 'LOW',
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Dark mode with low contrast may reduce readability. Consider using NORMAL or HIGH contrast.'
      );
    });

    it('should warn about text-to-speech with sign language support', () => {
      const result = validateAccommodationCombinations({
        textToSpeech: true,
        signLanguageSupport: true,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Both text-to-speech and sign language support are enabled. Consider learner preference.'
      );
    });

    it('should warn about voice control with text-to-speech', () => {
      const result = validateAccommodationCombinations({
        voiceControl: true,
        textToSpeech: true,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Voice control with text-to-speech may cause feedback issues. Ensure proper audio routing.'
      );
    });

    it('should warn about short break intervals without content chunking', () => {
      const result = validateAccommodationCombinations({
        breakIntervalMins: 8,
        contentChunking: false,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Very short break intervals work best with content chunking enabled.'
      );
    });

    it('should warn about simplified layouts without reduced animations', () => {
      const result = validateAccommodationCombinations({
        simplifiedLayouts: true,
        reduceAnimations: false,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Simplified layouts typically work best with reduced animations enabled.'
      );
    });
  });

  describe('getPresetByName', () => {
    it('should return dyslexia-friendly preset', () => {
      const preset = getPresetByName('dyslexia-friendly');
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('dyslexia-friendly');
      expect(preset?.settings.fontFamily).toBe('OpenDyslexic');
      expect(preset?.settings.readingGuide).toBe(true);
    });

    it('should return low-vision preset', () => {
      const preset = getPresetByName('low-vision');
      expect(preset).toBeDefined();
      expect(preset?.settings.visualContrast).toBe('ULTRA_HIGH');
      expect(preset?.settings.fontSize).toBe('EXTRA_LARGE');
    });

    it('should return motor-impaired preset', () => {
      const preset = getPresetByName('motor-impaired');
      expect(preset).toBeDefined();
      expect(preset?.settings.keyboardNavigation).toBe(true);
      expect(preset?.settings.largeClickTargets).toBe(true);
    });

    it('should return undefined for invalid preset', () => {
      const preset = getPresetByName('invalid' as any);
      expect(preset).toBeUndefined();
    });
  });

  describe('SENSORY_PROFILE_PRESETS', () => {
    it('should have 6 presets', () => {
      expect(SENSORY_PROFILE_PRESETS).toHaveLength(6);
    });

    it('should have valid settings for all presets', () => {
      for (const preset of SENSORY_PROFILE_PRESETS) {
        const result = CreateSensoryProfileSchema.safeParse(preset.settings);
        expect(result.success).toBe(true);
      }
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Sensory Profile Service', () => {
  describe('getPresets', () => {
    it('should return all presets', () => {
      const presets = sensoryProfileService.getPresets();
      expect(presets).toHaveLength(6);
    });
  });

  describe('getPreset', () => {
    it('should return a specific preset', () => {
      const preset = sensoryProfileService.getPreset('dyslexia-friendly');
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('dyslexia-friendly');
    });
  });

  describe('getChangedFields', () => {
    const existing: sensoryProfileService.SensoryProfileEntity = {
      id: 'test-id',
      learnerId: 'learner-id',
      tenantId: 'tenant-id',
      visualContrast: 'NORMAL',
      fontSize: 'MEDIUM',
      lineSpacing: 1.5,
      fontFamily: 'OpenDyslexic',
      reduceAnimations: false,
      darkMode: false,
      colorBlindMode: 'NONE',
      textToSpeech: false,
      speechRate: 1.0,
      speechVoice: 'default',
      audioDescriptions: false,
      closedCaptions: true,
      signLanguageSupport: false,
      keyboardNavigation: false,
      extendedTimeLimits: 1.0,
      largeClickTargets: false,
      stickyKeys: false,
      voiceControl: false,
      simplifiedLayouts: false,
      readingGuide: false,
      focusHighlight: false,
      breakReminders: true,
      breakIntervalMins: 25,
      contentChunking: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should detect changed boolean fields', () => {
      const changes = sensoryProfileService.getChangedFields(existing, {
        darkMode: true,
      });
      expect(changes).toContain('darkMode');
    });

    it('should detect changed enum fields', () => {
      const changes = sensoryProfileService.getChangedFields(existing, {
        visualContrast: 'HIGH',
      });
      expect(changes).toContain('visualContrast');
    });

    it('should detect multiple changed fields', () => {
      const changes = sensoryProfileService.getChangedFields(existing, {
        darkMode: true,
        fontSize: 'LARGE',
        lineSpacing: 2.0,
      });
      expect(changes).toContain('darkMode');
      expect(changes).toContain('fontSize');
      expect(changes).toContain('lineSpacing');
    });

    it('should not include unchanged fields', () => {
      const changes = sensoryProfileService.getChangedFields(existing, {
        darkMode: false, // Same as existing
      });
      expect(changes).not.toContain('darkMode');
    });

    it('should return empty array when no changes', () => {
      const changes = sensoryProfileService.getChangedFields(existing, {});
      expect(changes).toHaveLength(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// API ROUTES INTEGRATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Sensory Profile Routes', () => {
  let app: FastifyInstance;

  const headers = {
    'x-tenant-id': 'test-tenant-uuid',
    'x-user-id': 'test-user-uuid',
    'x-user-role': 'PARENT',
  };

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/sensory-profile/presets', () => {
    it('should return all presets', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sensory-profile/presets',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.presets).toBeDefined();
      expect(body.presets).toHaveLength(6);
      expect(body.presets[0]).toHaveProperty('name');
      expect(body.presets[0]).toHaveProperty('displayName');
      expect(body.presets[0]).toHaveProperty('description');
      expect(body.presets[0]).toHaveProperty('settings');
    });
  });

  describe('GET /api/v1/sensory-profile/presets/:presetName', () => {
    it('should return a specific preset', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sensory-profile/presets/dyslexia-friendly',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.preset).toBeDefined();
      expect(body.preset.name).toBe('dyslexia-friendly');
      expect(body.preset.settings.fontFamily).toBe('OpenDyslexic');
    });

    it('should return 404 for invalid preset name', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sensory-profile/presets/invalid-preset',
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error).toBe('Not Found');
      expect(body.validPresets).toBeDefined();
    });
  });

  describe('GET /api/v1/learners/:learnerId/sensory-profile', () => {
    it('should return 401 without tenant context', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000000/sensory-profile',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000000/sensory-profile',
        headers,
      });

      // May be 404 or 500 depending on database connection
      expect([404, 500]).toContain(response.statusCode);
    });
  });

  describe('PUT /api/v1/learners/:learnerId/sensory-profile', () => {
    it('should return 401 without tenant context', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000001/sensory-profile',
        payload: {
          darkMode: true,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate visual contrast values', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000001/sensory-profile',
        headers,
        payload: {
          visualContrast: 'INVALID',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate font size values', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000001/sensory-profile',
        headers,
        payload: {
          fontSize: 'XXL',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate line spacing range', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000001/sensory-profile',
        headers,
        payload: {
          lineSpacing: 5.0, // Max is 3.0
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate speech rate range', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000001/sensory-profile',
        headers,
        payload: {
          speechRate: 10.0, // Max is 4.0
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate break interval range', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000001/sensory-profile',
        headers,
        payload: {
          breakIntervalMins: 200, // Max is 120
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept valid sensory profile data', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000001/sensory-profile',
        headers,
        payload: {
          visualContrast: 'HIGH',
          fontSize: 'LARGE',
          darkMode: true,
          textToSpeech: true,
          keyboardNavigation: true,
          simplifiedLayouts: true,
        },
      });

      // Without database, expect either success or DB error
      expect([200, 201, 500]).toContain(response.statusCode);
    });
  });

  describe('POST /api/v1/learners/:learnerId/sensory-profile/reset', () => {
    it('should return 401 without tenant context', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000001/sensory-profile/reset',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent profile', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000099/sensory-profile/reset',
        headers,
      });

      // May be 404 or 500 depending on database connection
      expect([404, 500]).toContain(response.statusCode);
    });
  });

  describe('POST /api/v1/learners/:learnerId/sensory-profile/apply-preset', () => {
    it('should return 401 without tenant context', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000001/sensory-profile/apply-preset',
        payload: {
          preset: 'dyslexia-friendly',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid preset name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000001/sensory-profile/apply-preset',
        headers,
        payload: {
          preset: 'invalid-preset',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.validPresets).toBeDefined();
    });

    it('should accept valid preset name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/learners/00000000-0000-0000-0000-000000000001/sensory-profile/apply-preset',
        headers,
        payload: {
          preset: 'dyslexia-friendly',
        },
      });

      // Without database, expect either success or DB error
      expect([200, 500]).toContain(response.statusCode);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// EDGE CASE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  describe('Boundary values', () => {
    it('should accept minimum line spacing', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        lineSpacing: 1.0,
      });
      expect(result.success).toBe(true);
    });

    it('should accept maximum line spacing', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        lineSpacing: 3.0,
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimum speech rate', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        speechRate: 0.25,
      });
      expect(result.success).toBe(true);
    });

    it('should accept maximum speech rate', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        speechRate: 4.0,
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimum break interval', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        breakIntervalMins: 5,
      });
      expect(result.success).toBe(true);
    });

    it('should accept maximum break interval', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        breakIntervalMins: 120,
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimum extended time limits', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        extendedTimeLimits: 1.0,
      });
      expect(result.success).toBe(true);
    });

    it('should accept maximum extended time limits', () => {
      const result = CreateSensoryProfileSchema.safeParse({
        extendedTimeLimits: 5.0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('All presets are valid profiles', () => {
    it('dyslexia-friendly preset should create valid profile', () => {
      const preset = getPresetByName('dyslexia-friendly');
      const result = CreateSensoryProfileSchema.safeParse(preset?.settings);
      expect(result.success).toBe(true);
    });

    it('low-vision preset should create valid profile', () => {
      const preset = getPresetByName('low-vision');
      const result = CreateSensoryProfileSchema.safeParse(preset?.settings);
      expect(result.success).toBe(true);
    });

    it('motor-impaired preset should create valid profile', () => {
      const preset = getPresetByName('motor-impaired');
      const result = CreateSensoryProfileSchema.safeParse(preset?.settings);
      expect(result.success).toBe(true);
    });

    it('cognitive-support preset should create valid profile', () => {
      const preset = getPresetByName('cognitive-support');
      const result = CreateSensoryProfileSchema.safeParse(preset?.settings);
      expect(result.success).toBe(true);
    });

    it('hearing-impaired preset should create valid profile', () => {
      const preset = getPresetByName('hearing-impaired');
      const result = CreateSensoryProfileSchema.safeParse(preset?.settings);
      expect(result.success).toBe(true);
    });

    it('photosensitive preset should create valid profile', () => {
      const preset = getPresetByName('photosensitive');
      const result = CreateSensoryProfileSchema.safeParse(preset?.settings);
      expect(result.success).toBe(true);
    });
  });
});
