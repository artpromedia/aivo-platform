/**
 * Feature Flags for AIVO Platform (Web)
 *
 * Centralized feature flag management for gradual rollout of parity features.
 * Supports local configuration, remote config, and environment-based flags.
 */

/**
 * Feature flag identifiers for web-mobile parity features
 */
export enum ParityFeature {
  // Sprint 2: SEL + Social Stories
  SEL_MOBILE = 'selMobile',
  SOCIAL_STORIES_WEB = 'socialStoriesWeb',

  // Sprint 3: Executive Function + Motor Skills
  EXECUTIVE_FUNCTION_MOBILE_ENHANCED = 'executiveFunctionMobileEnhanced',
  MOTOR_SKILLS_WEB = 'motorSkillsWeb',

  // Sprint 4: Study Skills + Visual Learning
  STUDY_SKILLS_MOBILE = 'studySkillsMobile',
  VISUAL_LEARNING_MOBILE = 'visualLearningMobile',

  // Sprint 5: Teams + Offline
  TEAMS_WEB_FULL = 'teamsWebFull',
  OFFLINE_WEB_PWA = 'offlineWebPwa',

  // General feature flags
  NEW_ONBOARDING = 'newOnboarding',
  AI_TUTOR = 'aiTutor',
  TEAM_CHALLENGES = 'teamChallenges',
  ADAPTIVE_ASSESSMENTS = 'adaptiveAssessments',
}

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage: number;
  allowedUserIds?: string[];
  allowedSchoolIds?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * User context for feature flag evaluation
 */
export interface UserContext {
  userId?: string;
  schoolId?: string;
  email?: string;
  role?: string;
}

/**
 * Default feature flag configurations
 */
const DEFAULT_FLAGS: Record<ParityFeature, FeatureFlagConfig> = {
  // Sprint 2 features - enabled for gradual rollout
  [ParityFeature.SEL_MOBILE]: {
    enabled: true,
    rolloutPercentage: 100,
  },
  [ParityFeature.SOCIAL_STORIES_WEB]: {
    enabled: true,
    rolloutPercentage: 100,
  },

  // Sprint 3 features
  [ParityFeature.EXECUTIVE_FUNCTION_MOBILE_ENHANCED]: {
    enabled: true,
    rolloutPercentage: 100,
  },
  [ParityFeature.MOTOR_SKILLS_WEB]: {
    enabled: true,
    rolloutPercentage: 100,
  },

  // Sprint 4 features
  [ParityFeature.STUDY_SKILLS_MOBILE]: {
    enabled: true,
    rolloutPercentage: 100,
  },
  [ParityFeature.VISUAL_LEARNING_MOBILE]: {
    enabled: true,
    rolloutPercentage: 100,
  },

  // Sprint 5 features
  [ParityFeature.TEAMS_WEB_FULL]: {
    enabled: true,
    rolloutPercentage: 100,
  },
  [ParityFeature.OFFLINE_WEB_PWA]: {
    enabled: true,
    rolloutPercentage: 100,
  },

  // General features
  [ParityFeature.NEW_ONBOARDING]: {
    enabled: true,
    rolloutPercentage: 50,
  },
  [ParityFeature.AI_TUTOR]: {
    enabled: true,
    rolloutPercentage: 100,
  },
  [ParityFeature.TEAM_CHALLENGES]: {
    enabled: true,
    rolloutPercentage: 100,
  },
  [ParityFeature.ADAPTIVE_ASSESSMENTS]: {
    enabled: true,
    rolloutPercentage: 75,
  },
};

/**
 * Storage key for persisted flags
 */
const STORAGE_KEY = 'aivo_feature_flags';

/**
 * Hash function for deterministic rollout
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Feature Flags Service
 */
export class FeatureFlagsService {
  private static instance: FeatureFlagsService;
  private flags: Map<ParityFeature, FeatureFlagConfig>;
  private userContext: UserContext = {};
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  private constructor() {
    this.flags = new Map(
      Object.entries(DEFAULT_FLAGS) as [ParityFeature, FeatureFlagConfig][]
    );
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): FeatureFlagsService {
    if (!FeatureFlagsService.instance) {
      FeatureFlagsService.instance = new FeatureFlagsService();
    }
    return FeatureFlagsService.instance;
  }

  /**
   * Initialize the feature flags service
   */
  async initialize(options?: {
    userContext?: UserContext;
    overrides?: Partial<Record<ParityFeature, FeatureFlagConfig>>;
  }): Promise<void> {
    if (options?.userContext) {
      this.userContext = options.userContext;
    }

    // Load from storage
    this.loadFromStorage();

    // Apply overrides
    if (options?.overrides) {
      for (const [feature, config] of Object.entries(options.overrides)) {
        this.flags.set(feature as ParityFeature, config as FeatureFlagConfig);
      }
    }

    this.initialized = true;
    this.notifyListeners();
  }

  /**
   * Set user context for feature evaluation
   */
  setUserContext(context: UserContext): void {
    this.userContext = context;
    this.notifyListeners();
  }

  /**
   * Check if a feature is enabled for the current user
   */
  isEnabled(feature: ParityFeature): boolean {
    const config = this.flags.get(feature) ?? DEFAULT_FLAGS[feature];
    if (!config) return false;

    // Feature must be enabled
    if (!config.enabled) return false;

    // Check user allowlist
    if (config.allowedUserIds?.length) {
      if (this.userContext.userId && config.allowedUserIds.includes(this.userContext.userId)) {
        return true;
      }
    }

    // Check school allowlist
    if (config.allowedSchoolIds?.length) {
      if (this.userContext.schoolId && config.allowedSchoolIds.includes(this.userContext.schoolId)) {
        return true;
      }
    }

    // Check rollout percentage
    if (config.rolloutPercentage >= 100) return true;
    if (config.rolloutPercentage <= 0) return false;

    // Deterministic rollout based on user ID
    if (this.userContext.userId) {
      const hash = hashCode(this.userContext.userId) % 100;
      return hash < config.rolloutPercentage;
    }

    // Random rollout for anonymous users
    return (Date.now() % 100) < config.rolloutPercentage;
  }

  /**
   * Get the configuration for a feature
   */
  getConfig(feature: ParityFeature): FeatureFlagConfig | undefined {
    return this.flags.get(feature) ?? DEFAULT_FLAGS[feature];
  }

  /**
   * Update a feature flag configuration
   */
  updateFlag(feature: ParityFeature, config: FeatureFlagConfig): void {
    this.flags.set(feature, config);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Update multiple flags at once
   */
  updateFlags(flags: Partial<Record<ParityFeature, FeatureFlagConfig>>): void {
    for (const [feature, config] of Object.entries(flags)) {
      this.flags.set(feature as ParityFeature, config as FeatureFlagConfig);
    }
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Subscribe to flag changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Load flags from storage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Record<string, FeatureFlagConfig>;
        for (const [feature, config] of Object.entries(data)) {
          if (Object.values(ParityFeature).includes(feature as ParityFeature)) {
            this.flags.set(feature as ParityFeature, config);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load feature flags from storage:', e);
    }
  }

  /**
   * Save flags to storage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data: Record<string, FeatureFlagConfig> = {};
      this.flags.forEach((config, feature) => {
        data[feature] = config;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save feature flags to storage:', e);
    }
  }

  /**
   * Fetch remote configuration
   */
  async fetchRemoteConfig(endpoint?: string): Promise<void> {
    // TODO: Implement remote config fetch
    // This would typically call a remote config service
    console.log('Remote config fetch not implemented', endpoint);
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.flags = new Map(
      Object.entries(DEFAULT_FLAGS) as [ParityFeature, FeatureFlagConfig][]
    );
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.notifyListeners();
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures(): ParityFeature[] {
    return Object.values(ParityFeature).filter(f => this.isEnabled(f));
  }

  /**
   * Get all features status
   */
  getAllFeaturesStatus(): Record<ParityFeature, boolean> {
    const status: Record<string, boolean> = {};
    for (const feature of Object.values(ParityFeature)) {
      status[feature] = this.isEnabled(feature);
    }
    return status as Record<ParityFeature, boolean>;
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const featureFlags = FeatureFlagsService.getInstance();

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(feature: ParityFeature): boolean {
  return featureFlags.isEnabled(feature);
}

/**
 * React hook for feature flags (optional React integration)
 */
export function useFeatureFlag(feature: ParityFeature): boolean {
  // This is a simple implementation - for React, use the hook from @aivo/feature-flags/react
  return featureFlags.isEnabled(feature);
}

/**
 * Feature gate helper
 */
export function featureGate<T>(options: {
  feature: ParityFeature;
  enabled: T;
  disabled: T;
}): T {
  return featureFlags.isEnabled(options.feature) ? options.enabled : options.disabled;
}
