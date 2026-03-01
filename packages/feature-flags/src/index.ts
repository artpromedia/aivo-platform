/**
 * Feature Flags for AIVO Platform (Web)
 *
 * Centralized feature flag management for gradual rollout of parity features.
 * Supports local configuration, remote config, and environment-based flags.
 */

/**
 * Stub Python AI/ML services that return 501 and should be feature-flagged.
 * These services are disabled by default in production until implemented.
 *
 * @see STUB_SERVICES.md for full documentation
 */
export enum StubService {
  /** Reinforcement learning tutoring - personalized tutoring strategies */
  RL_TUTORING = 'rlTutoring',
  /** Peer learning matching - collaborative learning groups */
  PEER_LEARNING = 'peerLearning',
  /** Multimodal analytics - cross-modal learning analysis */
  MULTIMODAL_ANALYTICS = 'multimodalAnalytics',
  /** Gamification Python models - achievement/reward optimization */
  GAMIFICATION_PYTHON = 'gamificationPython',
  /** Content intelligence - topic classification and tagging */
  CONTENT_INTELLIGENCE = 'contentIntelligence',
  /** Cognitive load assessment - mental load optimization */
  COGNITIVE_LOAD = 'cognitiveLoad',
  /** Accessibility AI - adaptive accessibility features */
  ACCESSIBILITY_AI = 'accessibilityAi',
  /** Specialized support - special education accommodations */
  SPECIALIZED_SUPPORT = 'specializedSupport',
}

/**
 * Stub service configuration with service metadata
 */
export interface StubServiceConfig {
  /** Whether the service is enabled */
  enabled: boolean;
  /** Service URL for routing */
  serviceUrl: string;
  /** Human-readable service name */
  displayName: string;
  /** Expected implementation date */
  expectedDate?: string;
  /** Fallback response message */
  fallbackMessage: string;
}

/**
 * Default stub service configurations - ALL DISABLED BY DEFAULT
 */
export const STUB_SERVICE_DEFAULTS: Record<StubService, StubServiceConfig> = {
  [StubService.RL_TUTORING]: {
    enabled: true,
    serviceUrl: 'http://rl-tutoring-svc:8000',
    displayName: 'Reinforcement Learning Tutoring',
    expectedDate: '2026-Q2',
    fallbackMessage:
      'AI-powered personalized tutoring is coming soon. Standard tutoring is available.',
  },
  [StubService.PEER_LEARNING]: {
    enabled: true,
    serviceUrl: 'http://peer-learning-svc:8000',
    displayName: 'Peer Learning & Collaboration',
    expectedDate: '2026-Q2',
    fallbackMessage:
      'AI-matched peer learning groups coming soon. Manual group creation is available.',
  },
  [StubService.MULTIMODAL_ANALYTICS]: {
    enabled: false,
    serviceUrl: 'http://multimodal-analytics-svc:8000',
    displayName: 'Multimodal Learning Analytics',
    expectedDate: '2026-Q3',
    fallbackMessage:
      'Advanced cross-modal analytics coming soon. Standard analytics are available.',
  },
  [StubService.GAMIFICATION_PYTHON]: {
    enabled: false,
    serviceUrl: 'http://gamification-svc:8000',
    displayName: 'AI Gamification Optimization',
    expectedDate: '2026-Q1',
    fallbackMessage: 'AI-optimized rewards coming soon. Standard gamification is active.',
  },
  [StubService.CONTENT_INTELLIGENCE]: {
    enabled: false,
    serviceUrl: 'http://content-intelligence-svc:8000',
    displayName: 'Content Intelligence',
    expectedDate: '2026-Q1',
    fallbackMessage: 'AI content analysis coming soon. Manual tagging is available.',
  },
  [StubService.COGNITIVE_LOAD]: {
    enabled: true,
    serviceUrl: 'http://cognitive-load-svc:8000',
    displayName: 'Cognitive Load Assessment',
    expectedDate: '2026-Q2',
    fallbackMessage: 'Cognitive load optimization coming soon. Standard pacing is available.',
  },
  [StubService.ACCESSIBILITY_AI]: {
    enabled: true,
    serviceUrl: 'http://accessibility-ai-svc:8000',
    displayName: 'AI Accessibility Adaptations',
    expectedDate: '2026-Q2',
    fallbackMessage: 'AI accessibility features coming soon. Manual accommodations are available.',
  },
  [StubService.SPECIALIZED_SUPPORT]: {
    enabled: true,
    serviceUrl: 'http://specialized-support-svc:8000',
    displayName: 'Specialized Learning Support',
    expectedDate: '2026-Q2',
    fallbackMessage: 'AI specialized support coming soon. Standard accommodations are available.',
  },
};

/**
 * Check if a stub service is enabled
 */
export function isStubServiceEnabled(service: StubService): boolean {
  // Check environment variable override first
  // Convert camelCase to SCREAMING_SNAKE_CASE for env var
  const envKey = `FEATURE_${service.toUpperCase().replaceAll(/([A-Z])/g, '_$1')}`;
  const envValue =
    typeof globalThis.process !== 'undefined' ? globalThis.process.env[envKey] : undefined;

  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }

  return STUB_SERVICE_DEFAULTS[service]?.enabled ?? false;
}

/**
 * Get stub service configuration
 */
export function getStubServiceConfig(service: StubService): StubServiceConfig {
  return STUB_SERVICE_DEFAULTS[service];
}

/**
 * Get all stub services and their status
 */
export function getAllStubServicesStatus(): Record<
  StubService,
  { enabled: boolean; config: StubServiceConfig }
> {
  const status: Record<string, { enabled: boolean; config: StubServiceConfig }> = {};

  for (const service of Object.values(StubService)) {
    status[service] = {
      enabled: isStubServiceEnabled(service),
      config: getStubServiceConfig(service),
    };
  }

  return status as Record<StubService, { enabled: boolean; config: StubServiceConfig }>;
}

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

  // Tutor-specific feature flags (Sprint 10 gradual rollout)
  TUTOR_ENABLED = 'tutorEnabled',
  TUTOR_VOICE_ENABLED = 'tutorVoiceEnabled',
  TUTOR_SUBJECTS_MATH = 'tutorSubjectsMath',
  TUTOR_SUBJECTS_ELA = 'tutorSubjectsEla',
  TUTOR_SUBJECTS_SCIENCE = 'tutorSubjectsScience',
  TUTOR_SUBJECTS_HISTORY = 'tutorSubjectsHistory',
  TUTOR_SUBJECTS_CODING = 'tutorSubjectsCoding',
  TUTOR_MARKETPLACE_VISIBLE = 'tutorMarketplaceVisible',
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

  // Tutor-specific flags — disabled by default for gradual rollout
  [ParityFeature.TUTOR_ENABLED]: {
    enabled: false,
    rolloutPercentage: 0,
  },
  [ParityFeature.TUTOR_VOICE_ENABLED]: {
    enabled: false,
    rolloutPercentage: 0,
  },
  [ParityFeature.TUTOR_SUBJECTS_MATH]: {
    enabled: false,
    rolloutPercentage: 0,
  },
  [ParityFeature.TUTOR_SUBJECTS_ELA]: {
    enabled: false,
    rolloutPercentage: 0,
  },
  [ParityFeature.TUTOR_SUBJECTS_SCIENCE]: {
    enabled: false,
    rolloutPercentage: 0,
  },
  [ParityFeature.TUTOR_SUBJECTS_HISTORY]: {
    enabled: false,
    rolloutPercentage: 0,
  },
  [ParityFeature.TUTOR_SUBJECTS_CODING]: {
    enabled: false,
    rolloutPercentage: 0,
  },
  [ParityFeature.TUTOR_MARKETPLACE_VISIBLE]: {
    enabled: false,
    rolloutPercentage: 0,
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
    hash = (hash << 5) - hash + char;
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
  private listeners = new Set<() => void>();
  private initialized = false;

  private constructor() {
    this.flags = new Map(Object.entries(DEFAULT_FLAGS) as [ParityFeature, FeatureFlagConfig][]);
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
        this.flags.set(feature as ParityFeature, config);
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
      if (
        this.userContext.schoolId &&
        config.allowedSchoolIds.includes(this.userContext.schoolId)
      ) {
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
    return Date.now() % 100 < config.rolloutPercentage;
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
      this.flags.set(feature as ParityFeature, config);
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
    this.listeners.forEach((listener) => {
      listener();
    });
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
    this.flags = new Map(Object.entries(DEFAULT_FLAGS) as [ParityFeature, FeatureFlagConfig][]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.notifyListeners();
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures(): ParityFeature[] {
    return Object.values(ParityFeature).filter((f) => this.isEnabled(f));
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
export function featureGate<T>(options: { feature: ParityFeature; enabled: T; disabled: T }): T {
  return featureFlags.isEnabled(options.feature) ? options.enabled : options.disabled;
}

/**
 * Map a tutor subject (e.g. 'MATH') to its corresponding feature flag
 */
const TUTOR_SUBJECT_FLAG_MAP: Record<string, ParityFeature> = {
  MATH: ParityFeature.TUTOR_SUBJECTS_MATH,
  ELA: ParityFeature.TUTOR_SUBJECTS_ELA,
  SCIENCE: ParityFeature.TUTOR_SUBJECTS_SCIENCE,
  HISTORY: ParityFeature.TUTOR_SUBJECTS_HISTORY,
  CODING: ParityFeature.TUTOR_SUBJECTS_CODING,
};

/**
 * Check if a tutor subject is enabled via feature flags
 */
export function isTutorSubjectEnabled(subject: string): boolean {
  const flag = TUTOR_SUBJECT_FLAG_MAP[subject.toUpperCase()];
  if (!flag) return false;
  return featureFlags.isEnabled(flag);
}
