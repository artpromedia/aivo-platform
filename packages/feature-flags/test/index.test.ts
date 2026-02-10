import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StubService,
  STUB_SERVICE_DEFAULTS,
  isStubServiceEnabled,
  getStubServiceConfig,
  getAllStubServicesStatus,
  ParityFeature,
  FeatureFlagsService,
  featureFlags,
  isFeatureEnabled,
  featureGate,
} from '../src/index.js';

describe('StubService', () => {
  afterEach(() => {
    // Clean up any env vars we set
    for (const service of Object.values(StubService)) {
      const envKey = `FEATURE_${service.toUpperCase().replaceAll(/([A-Z])/g, '_$1')}`;
      delete process.env[envKey];
    }
  });

  describe('STUB_SERVICE_DEFAULTS', () => {
    it('has all stub services configured', () => {
      for (const service of Object.values(StubService)) {
        expect(STUB_SERVICE_DEFAULTS[service]).toBeDefined();
        expect(STUB_SERVICE_DEFAULTS[service].enabled).toBe(false);
        expect(STUB_SERVICE_DEFAULTS[service].displayName).toBeTruthy();
        expect(STUB_SERVICE_DEFAULTS[service].fallbackMessage).toBeTruthy();
        expect(STUB_SERVICE_DEFAULTS[service].serviceUrl).toMatch(/^http:\/\//);
      }
    });
  });

  describe('isStubServiceEnabled', () => {
    it('returns false by default for all stub services', () => {
      for (const service of Object.values(StubService)) {
        expect(isStubServiceEnabled(service)).toBe(false);
      }
    });

    it('returns true when env var is set to "true"', () => {
      const service = StubService.RL_TUTORING;
      const envKey = `FEATURE_${service.toUpperCase().replaceAll(/([A-Z])/g, '_$1')}`;
      process.env[envKey] = 'true';
      expect(isStubServiceEnabled(service)).toBe(true);
    });

    it('returns true when env var is set to "1"', () => {
      const service = StubService.PEER_LEARNING;
      const envKey = `FEATURE_${service.toUpperCase().replaceAll(/([A-Z])/g, '_$1')}`;
      process.env[envKey] = '1';
      expect(isStubServiceEnabled(service)).toBe(true);
    });

    it('returns false when env var is set to "false"', () => {
      const service = StubService.COGNITIVE_LOAD;
      const envKey = `FEATURE_${service.toUpperCase().replaceAll(/([A-Z])/g, '_$1')}`;
      process.env[envKey] = 'false';
      expect(isStubServiceEnabled(service)).toBe(false);
    });
  });

  describe('getStubServiceConfig', () => {
    it('returns config for a valid stub service', () => {
      const config = getStubServiceConfig(StubService.CONTENT_INTELLIGENCE);
      expect(config.displayName).toBe('Content Intelligence');
      expect(config.enabled).toBe(false);
    });
  });

  describe('getAllStubServicesStatus', () => {
    it('returns status for all stub services', () => {
      const status = getAllStubServicesStatus();
      const keys = Object.keys(status);
      expect(keys.length).toBe(Object.values(StubService).length);
      for (const key of keys) {
        expect(status[key as StubService].enabled).toBe(false);
        expect(status[key as StubService].config).toBeDefined();
      }
    });
  });
});

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;

  beforeEach(() => {
    service = FeatureFlagsService.getInstance();
    service.reset();
  });

  describe('singleton', () => {
    it('returns the same instance', () => {
      const a = FeatureFlagsService.getInstance();
      const b = FeatureFlagsService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('isEnabled', () => {
    it('returns true for features with 100% rollout', () => {
      expect(service.isEnabled(ParityFeature.SEL_MOBILE)).toBe(true);
      expect(service.isEnabled(ParityFeature.AI_TUTOR)).toBe(true);
    });

    it('returns false for disabled features', () => {
      service.updateFlag(ParityFeature.AI_TUTOR, {
        enabled: false,
        rolloutPercentage: 100,
      });
      expect(service.isEnabled(ParityFeature.AI_TUTOR)).toBe(false);
    });

    it('returns true for user in allowlist', () => {
      service.setUserContext({ userId: 'user-special' });
      service.updateFlag(ParityFeature.NEW_ONBOARDING, {
        enabled: true,
        rolloutPercentage: 0,
        allowedUserIds: ['user-special'],
      });
      expect(service.isEnabled(ParityFeature.NEW_ONBOARDING)).toBe(true);
    });

    it('returns true for school in allowlist', () => {
      service.setUserContext({ schoolId: 'school-vip' });
      service.updateFlag(ParityFeature.NEW_ONBOARDING, {
        enabled: true,
        rolloutPercentage: 0,
        allowedSchoolIds: ['school-vip'],
      });
      expect(service.isEnabled(ParityFeature.NEW_ONBOARDING)).toBe(true);
    });

    it('deterministic rollout based on userId hash', () => {
      service.updateFlag(ParityFeature.NEW_ONBOARDING, {
        enabled: true,
        rolloutPercentage: 50,
      });

      // With a specific userId, the result should be deterministic
      service.setUserContext({ userId: 'test-user-abc' });
      const first = service.isEnabled(ParityFeature.NEW_ONBOARDING);
      const second = service.isEnabled(ParityFeature.NEW_ONBOARDING);
      expect(first).toBe(second); // Same user = same result
    });

    it('returns false for 0% rollout without allowlist', () => {
      service.updateFlag(ParityFeature.AI_TUTOR, {
        enabled: true,
        rolloutPercentage: 0,
      });
      service.setUserContext({ userId: 'any-user' });
      expect(service.isEnabled(ParityFeature.AI_TUTOR)).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('returns config for a known feature', () => {
      const config = service.getConfig(ParityFeature.SEL_MOBILE);
      expect(config).toBeDefined();
      expect(config!.enabled).toBe(true);
      expect(config!.rolloutPercentage).toBe(100);
    });
  });

  describe('updateFlags', () => {
    it('updates multiple flags at once', () => {
      service.updateFlags({
        [ParityFeature.AI_TUTOR]: { enabled: false, rolloutPercentage: 0 },
        [ParityFeature.TEAM_CHALLENGES]: { enabled: false, rolloutPercentage: 0 },
      });
      expect(service.isEnabled(ParityFeature.AI_TUTOR)).toBe(false);
      expect(service.isEnabled(ParityFeature.TEAM_CHALLENGES)).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('notifies listeners on flag changes', () => {
      const listener = vi.fn();
      const unsub = service.subscribe(listener);

      service.updateFlag(ParityFeature.AI_TUTOR, {
        enabled: false,
        rolloutPercentage: 0,
      });

      expect(listener).toHaveBeenCalledTimes(1);
      unsub();

      service.updateFlag(ParityFeature.AI_TUTOR, {
        enabled: true,
        rolloutPercentage: 100,
      });
      // Should NOT be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getEnabledFeatures', () => {
    it('returns all features that are enabled', () => {
      const enabled = service.getEnabledFeatures();
      expect(enabled.length).toBeGreaterThan(0);
      expect(enabled).toContain(ParityFeature.SEL_MOBILE);
    });
  });

  describe('getAllFeaturesStatus', () => {
    it('returns status for all parity features', () => {
      const status = service.getAllFeaturesStatus();
      for (const feature of Object.values(ParityFeature)) {
        expect(feature in status).toBe(true);
      }
    });
  });

  describe('initialize', () => {
    it('marks service as initialized', async () => {
      const fresh = FeatureFlagsService.getInstance();
      fresh.reset();
      expect(fresh.isInitialized()).toBe(false);

      await fresh.initialize();
      expect(fresh.isInitialized()).toBe(true);
    });

    it('applies overrides during initialization', async () => {
      const fresh = FeatureFlagsService.getInstance();
      fresh.reset();

      await fresh.initialize({
        overrides: {
          [ParityFeature.AI_TUTOR]: { enabled: false, rolloutPercentage: 0 },
        },
      });

      expect(fresh.isEnabled(ParityFeature.AI_TUTOR)).toBe(false);
    });
  });

  describe('reset', () => {
    it('restores default flags', () => {
      service.updateFlag(ParityFeature.AI_TUTOR, {
        enabled: false,
        rolloutPercentage: 0,
      });
      expect(service.isEnabled(ParityFeature.AI_TUTOR)).toBe(false);

      service.reset();
      expect(service.isEnabled(ParityFeature.AI_TUTOR)).toBe(true);
    });
  });
});

describe('isFeatureEnabled', () => {
  it('delegates to singleton', () => {
    expect(isFeatureEnabled(ParityFeature.SEL_MOBILE)).toBe(true);
  });
});

describe('featureGate', () => {
  it('returns enabled value when feature is on', () => {
    const result = featureGate({
      feature: ParityFeature.SEL_MOBILE,
      enabled: 'ON',
      disabled: 'OFF',
    });
    expect(result).toBe('ON');
  });

  it('returns disabled value when feature is off', () => {
    featureFlags.updateFlag(ParityFeature.AI_TUTOR, {
      enabled: false,
      rolloutPercentage: 0,
    });

    const result = featureGate({
      feature: ParityFeature.AI_TUTOR,
      enabled: 'ON',
      disabled: 'OFF',
    });
    expect(result).toBe('OFF');

    // Cleanup
    featureFlags.reset();
  });
});
