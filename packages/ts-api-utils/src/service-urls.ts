/**
 * Service URL Configuration
 *
 * Provides centralized, environment-aware service URL configuration.
 * Replaces hardcoded localhost URLs throughout the codebase.
 *
 * CRITICAL: Addresses HIGH-002 - 189 files with localhost URLs
 *
 * Usage:
 * ```typescript
 * import { getServiceUrl, ServiceUrls } from '@aivo/ts-api-utils/service-urls';
 *
 * const authUrl = getServiceUrl('auth');
 * // Production: 'https://auth.aivo.internal'
 * // Development: 'http://localhost:3001'
 *
 * // Or use the full config
 * const urls = ServiceUrls.getAll();
 * ```
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Known service identifiers
 */
export type ServiceName =
  | 'auth'
  | 'profile'
  | 'learnerModel'
  | 'content'
  | 'contentAuthoring'
  | 'session'
  | 'assessment'
  | 'goal'
  | 'homework'
  | 'focus'
  | 'gamification'
  | 'messaging'
  | 'notify'
  | 'realtime'
  | 'analytics'
  | 'reports'
  | 'aiOrchestrator'
  | 'tenant'
  | 'billing'
  | 'dsr'
  | 'retention'
  | 'consent'
  | 'parent'
  | 'community'
  | 'gradebook'
  | 'marketplace'
  | 'lti'
  | 'sisSync'
  | 'integration'
  | 'research'
  | 'experimentation'
  | 'baseline'
  | 'sandbox'
  | 'scorm';

/**
 * Service URL configuration
 */
export interface ServiceUrlConfig {
  /** Environment variable name for this service */
  envVar: string;
  /** Default localhost port for development */
  devPort: number;
  /** Production URL pattern */
  prodUrl: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';

/**
 * Base URLs for different environments
 */
const BASE_URLS = {
  development: 'http://localhost',
  test: 'http://localhost',
  production: process.env.SERVICE_BASE_URL || 'https://api.aivo.app',
};

/**
 * Service configuration mapping
 */
const SERVICE_CONFIG: Record<ServiceName, ServiceUrlConfig> = {
  auth: { envVar: 'AUTH_SVC_URL', devPort: 3001, prodUrl: '/auth' },
  profile: { envVar: 'PROFILE_SVC_URL', devPort: 3002, prodUrl: '/profile' },
  learnerModel: { envVar: 'LEARNER_MODEL_SVC_URL', devPort: 3003, prodUrl: '/learner-model' },
  content: { envVar: 'CONTENT_SVC_URL', devPort: 3010, prodUrl: '/content' },
  contentAuthoring: { envVar: 'CONTENT_AUTHORING_SVC_URL', devPort: 3011, prodUrl: '/content-authoring' },
  session: { envVar: 'SESSION_SVC_URL', devPort: 3020, prodUrl: '/session' },
  assessment: { envVar: 'ASSESSMENT_SVC_URL', devPort: 3021, prodUrl: '/assessment' },
  goal: { envVar: 'GOAL_SVC_URL', devPort: 3022, prodUrl: '/goal' },
  homework: { envVar: 'HOMEWORK_SVC_URL', devPort: 3023, prodUrl: '/homework' },
  focus: { envVar: 'FOCUS_SVC_URL', devPort: 3024, prodUrl: '/focus' },
  gamification: { envVar: 'GAMIFICATION_SVC_URL', devPort: 3025, prodUrl: '/gamification' },
  messaging: { envVar: 'MESSAGING_SVC_URL', devPort: 3081, prodUrl: '/messaging' },
  notify: { envVar: 'NOTIFY_SVC_URL', devPort: 3082, prodUrl: '/notify' },
  realtime: { envVar: 'REALTIME_SVC_URL', devPort: 3083, prodUrl: '/realtime' },
  analytics: { envVar: 'ANALYTICS_SVC_URL', devPort: 4030, prodUrl: '/analytics' },
  reports: { envVar: 'REPORTS_SVC_URL', devPort: 4050, prodUrl: '/reports' },
  aiOrchestrator: { envVar: 'AI_ORCHESTRATOR_URL', devPort: 3060, prodUrl: '/ai' },
  tenant: { envVar: 'TENANT_SVC_URL', devPort: 4010, prodUrl: '/tenant' },
  billing: { envVar: 'BILLING_SVC_URL', devPort: 4060, prodUrl: '/billing' },
  dsr: { envVar: 'DSR_SVC_URL', devPort: 4070, prodUrl: '/dsr' },
  retention: { envVar: 'RETENTION_SVC_URL', devPort: 4071, prodUrl: '/retention' },
  consent: { envVar: 'CONSENT_SVC_URL', devPort: 4072, prodUrl: '/consent' },
  parent: { envVar: 'PARENT_SVC_URL', devPort: 3090, prodUrl: '/parent' },
  community: { envVar: 'COMMUNITY_SVC_URL', devPort: 3050, prodUrl: '/community' },
  gradebook: { envVar: 'GRADEBOOK_SVC_URL', devPort: 3051, prodUrl: '/gradebook' },
  marketplace: { envVar: 'MARKETPLACE_SVC_URL', devPort: 3052, prodUrl: '/marketplace' },
  lti: { envVar: 'LTI_SVC_URL', devPort: 3040, prodUrl: '/lti' },
  sisSync: { envVar: 'SIS_SYNC_SVC_URL', devPort: 4020, prodUrl: '/sis-sync' },
  integration: { envVar: 'INTEGRATION_SVC_URL', devPort: 4021, prodUrl: '/integration' },
  research: { envVar: 'RESEARCH_SVC_URL', devPort: 4040, prodUrl: '/research' },
  experimentation: { envVar: 'EXPERIMENTATION_SVC_URL', devPort: 4041, prodUrl: '/experimentation' },
  baseline: { envVar: 'BASELINE_SVC_URL', devPort: 3030, prodUrl: '/baseline' },
  sandbox: { envVar: 'SANDBOX_SVC_URL', devPort: 3031, prodUrl: '/sandbox' },
  scorm: { envVar: 'SCORM_SVC_URL', devPort: 3012, prodUrl: '/scorm' },
};

// ══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get the URL for a service based on environment.
 *
 * Resolution order:
 * 1. Environment variable (e.g., AUTH_SVC_URL)
 * 2. Production base URL + service path (in production)
 * 3. Localhost + dev port (in development/test)
 *
 * @param service - The service name
 * @returns The service URL
 */
export function getServiceUrl(service: ServiceName): string {
  const config = SERVICE_CONFIG[service];
  if (!config) {
    throw new Error(`Unknown service: ${service}`);
  }

  // 1. Check environment variable
  const envValue = process.env[config.envVar];
  if (envValue) {
    return envValue;
  }

  // 2. Check NEXT_PUBLIC variant (for frontend apps)
  const nextPublicValue = process.env[`NEXT_PUBLIC_${config.envVar}`];
  if (nextPublicValue) {
    return nextPublicValue;
  }

  // 3. Use production or development URL
  if (IS_PRODUCTION) {
    return `${BASE_URLS.production}${config.prodUrl}`;
  }

  // Development/test localhost URL
  const baseUrl = IS_TEST ? BASE_URLS.test : BASE_URLS.development;
  return `${baseUrl}:${config.devPort}`;
}

/**
 * Get all service URLs as a configuration object.
 * Useful for initial configuration or debugging.
 */
export function getAllServiceUrls(): Record<ServiceName, string> {
  const urls: Partial<Record<ServiceName, string>> = {};

  for (const service of Object.keys(SERVICE_CONFIG) as ServiceName[]) {
    urls[service] = getServiceUrl(service);
  }

  return urls as Record<ServiceName, string>;
}

/**
 * Get service configuration for debugging or documentation.
 */
export function getServiceConfig(service: ServiceName): ServiceUrlConfig {
  const config = SERVICE_CONFIG[service];
  if (!config) {
    throw new Error(`Unknown service: ${service}`);
  }
  return config;
}

/**
 * Check if a URL is a localhost URL (for validation/warnings).
 */
export function isLocalhostUrl(url: string): boolean {
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('0.0.0.0')
  );
}

/**
 * Validate that no localhost URLs are used in production.
 * Call this during service startup to catch configuration issues.
 *
 * @throws Error if localhost URLs are detected in production
 */
export function validateProductionUrls(): void {
  if (!IS_PRODUCTION) {
    return;
  }

  const errors: string[] = [];

  for (const service of Object.keys(SERVICE_CONFIG) as ServiceName[]) {
    const url = getServiceUrl(service);
    if (isLocalhostUrl(url)) {
      errors.push(`${service}: ${url}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `PRODUCTION ERROR: Localhost URLs detected!\n${errors.join('\n')}\n\n` +
      'Set appropriate environment variables for production deployment.'
    );
  }
}

/**
 * Log all service URLs (for debugging).
 * Only outputs in non-production environments.
 */
export function logServiceUrls(): void {
  if (IS_PRODUCTION) {
    return;
  }

  console.info('=== Service URLs ===');
  for (const service of Object.keys(SERVICE_CONFIG) as ServiceName[]) {
    const config = SERVICE_CONFIG[service];
    const url = getServiceUrl(service);
    const source = process.env[config.envVar] ? 'env' : 'default';
    console.info(`  ${service}: ${url} (${source})`);
  }
  console.info('====================');
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const ServiceUrls = {
  get: getServiceUrl,
  getAll: getAllServiceUrls,
  getConfig: getServiceConfig,
  isLocalhost: isLocalhostUrl,
  validate: validateProductionUrls,
  log: logServiceUrls,
  services: Object.keys(SERVICE_CONFIG) as ServiceName[],
};
