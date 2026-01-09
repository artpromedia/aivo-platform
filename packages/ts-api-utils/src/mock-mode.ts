/**
 * Mock Mode Utilities
 *
 * Provides safe, production-aware mock mode handling.
 * CRITICAL: Addresses CRIT-010 - Mock data exposure in production
 *
 * Key principles:
 * - Mock mode is ONLY allowed in development/test environments
 * - Production builds should NEVER return mock data
 * - All mock usage is logged for debugging
 * - Explicit opt-in required (environment variable alone is not enough)
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT DETECTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if we're in a development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

/**
 * Check if we're in a production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if we're in a test environment
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test' || !!process.env.VITEST || !!process.env.JEST_WORKER_ID;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK MODE CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

interface MockModeConfig {
  /** Feature name for logging */
  feature: string;

  /** Environment variable to check for mock mode */
  envVar?: string;

  /** Allow mock mode in production (DANGEROUS - defaults to false) */
  allowInProduction?: boolean;

  /** Callback when mock mode is used */
  onMockUsed?: () => void;
}

/**
 * Check if mock mode is enabled for a feature.
 * Returns false in production unless explicitly allowed.
 */
export function isMockEnabled(config: MockModeConfig): boolean {
  const envVar = config.envVar ?? 'USE_MOCK';
  const envValue = typeof window !== 'undefined'
    ? (window as any).__ENV__?.[envVar] ?? process.env[envVar]
    : process.env[envVar];

  const mockRequested = envValue === 'true';

  // In production, NEVER return mock data unless explicitly allowed
  if (isProduction() && !config.allowInProduction) {
    if (mockRequested) {
      console.warn(
        `[MockMode] Mock mode requested for "${config.feature}" but blocked in production. ` +
        `Set allowInProduction: true if this is intentional.`
      );
    }
    return false;
  }

  // In development/test, respect the environment variable
  if (mockRequested) {
    console.info(`[MockMode] Using mock data for "${config.feature}"`);
    config.onMockUsed?.();
    return true;
  }

  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK MODE WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Options for withMockFallback
 */
interface MockFallbackOptions<T> {
  /** Feature name for logging */
  feature: string;

  /** Environment variable to check */
  envVar?: string;

  /** Mock data generator */
  mockFn: () => T | Promise<T>;

  /** Real data fetcher */
  realFn: () => Promise<T>;

  /** Artificial delay for mock data (ms) - only in development */
  mockDelay?: number;
}

/**
 * Wrapper that provides mock data in development or real data in production.
 * NEVER returns mock data in production unless the feature is explicitly configured.
 */
export async function withMockFallback<T>(options: MockFallbackOptions<T>): Promise<T> {
  const mockEnabled = isMockEnabled({
    feature: options.feature,
    envVar: options.envVar,
  });

  if (mockEnabled) {
    // Add artificial delay to simulate network latency (development only)
    if (options.mockDelay && options.mockDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.mockDelay));
    }

    const mockData = await options.mockFn();
    return mockData;
  }

  // Use real data
  return options.realFn();
}

// ══════════════════════════════════════════════════════════════════════════════
// DEVELOPMENT-ONLY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Ensure a function is only called in development.
 * Throws an error in production.
 */
export function developmentOnly<T extends (...args: any[]) => any>(
  fn: T,
  featureName: string
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    if (isProduction()) {
      throw new Error(
        `[MockMode] "${featureName}" is only available in development mode`
      );
    }
    return fn(...args);
  }) as T;
}

/**
 * Log mock mode usage metrics (for debugging)
 */
const mockUsageMetrics = new Map<string, number>();

export function recordMockUsage(feature: string): void {
  const count = mockUsageMetrics.get(feature) ?? 0;
  mockUsageMetrics.set(feature, count + 1);
}

export function getMockUsageMetrics(): Record<string, number> {
  return Object.fromEntries(mockUsageMetrics);
}

/**
 * Clear mock usage metrics (for testing)
 */
export function clearMockUsageMetrics(): void {
  mockUsageMetrics.clear();
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPE-SAFE MOCK REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Registry for mock implementations.
 * Allows centralized control of mock behavior.
 */
class MockRegistry {
  private mocks = new Map<string, () => unknown>();
  private enabled = new Set<string>();

  /**
   * Register a mock implementation for a feature
   */
  register<T>(feature: string, mockFn: () => T): void {
    if (isProduction()) {
      console.warn(`[MockRegistry] Ignoring mock registration for "${feature}" in production`);
      return;
    }
    this.mocks.set(feature, mockFn);
  }

  /**
   * Enable mock mode for a feature
   */
  enable(feature: string): void {
    if (isProduction()) {
      console.warn(`[MockRegistry] Cannot enable mock mode for "${feature}" in production`);
      return;
    }
    this.enabled.add(feature);
  }

  /**
   * Disable mock mode for a feature
   */
  disable(feature: string): void {
    this.enabled.delete(feature);
  }

  /**
   * Check if mock mode is enabled for a feature
   */
  isEnabled(feature: string): boolean {
    if (isProduction()) return false;
    return this.enabled.has(feature);
  }

  /**
   * Get mock data for a feature
   */
  getMock<T>(feature: string): T | null {
    if (!this.isEnabled(feature)) return null;
    const mockFn = this.mocks.get(feature);
    if (!mockFn) return null;
    recordMockUsage(feature);
    return mockFn() as T;
  }

  /**
   * Clear all registered mocks
   */
  clear(): void {
    this.mocks.clear();
    this.enabled.clear();
  }
}

export const mockRegistry = new MockRegistry();

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const MockMode = {
  isDevelopment,
  isProduction,
  isTest,
  isEnabled: isMockEnabled,
  withFallback: withMockFallback,
  developmentOnly,
  recordUsage: recordMockUsage,
  getUsageMetrics: getMockUsageMetrics,
  clearUsageMetrics: clearMockUsageMetrics,
  registry: mockRegistry,
};
