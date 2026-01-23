/**
 * Environment Validator for AI Orchestrator
 *
 * Validates that all required environment variables are set before the service starts.
 * Prevents production deployments from running with mock data or missing configuration.
 *
 * @module utils/env-validator
 */

import 'dotenv/config';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: EnvironmentConfig;
}

interface EnvironmentConfig {
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  primaryProvider: string;
  fallbackOrder: string[];
  configuredProviders: string[];
  cacheEnabled: boolean;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const VALID_PROVIDERS = ['google', 'openai', 'anthropic', 'ollama'] as const;
const DEV_ONLY_PROVIDERS = ['ollama', 'mock'] as const;
const CLOUD_PROVIDERS = ['google', 'openai', 'anthropic'] as const;

// Provider API key environment variable mapping
const PROVIDER_API_KEYS: Record<string, string[]> = {
  google: ['GOOGLE_GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  ollama: [], // No API key required
};

// ════════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Check if a provider has its API key configured
 */
function isProviderConfigured(provider: string): boolean {
  const keyVars = PROVIDER_API_KEYS[provider.toLowerCase()];
  if (!keyVars || keyVars.length === 0) {
    // Provider doesn't need an API key (e.g., Ollama)
    return true;
  }
  return keyVars.some((keyVar) => {
    const value = process.env[keyVar];
    return value && value.length > 0 && !value.startsWith('your-') && !value.startsWith('sk-your');
  });
}

/**
 * Get list of all configured providers
 */
function getConfiguredProviders(): string[] {
  return VALID_PROVIDERS.filter((provider) => isProviderConfigured(provider));
}

/**
 * Build the environment configuration object
 */
function buildEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const primaryProvider = (process.env.LLM_PRIMARY_PROVIDER ?? 'mock').toLowerCase();
  const fallbackOrder = (process.env.LLM_FALLBACK_ORDER ?? primaryProvider)
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: process.env.IS_DEVELOPMENT === 'true' || nodeEnv === 'development',
    primaryProvider,
    fallbackOrder,
    configuredProviders: getConfiguredProviders(),
    cacheEnabled: process.env.LLM_CACHE_ENABLED !== 'false',
  };
}

/**
 * Validate production-specific environment requirements
 */
function validateProductionEnvironment(
  config: EnvironmentConfig,
  errors: string[],
  warnings: string[]
): void {
  const { primaryProvider, fallbackOrder, configuredProviders, cacheEnabled } = config;

  // 1. Primary provider must not be mock or ollama in production
  if (DEV_ONLY_PROVIDERS.includes(primaryProvider as (typeof DEV_ONLY_PROVIDERS)[number])) {
    errors.push(
      `CRITICAL: LLM_PRIMARY_PROVIDER="${primaryProvider}" is not allowed in production. ` +
        `Use one of: ${CLOUD_PROVIDERS.join(', ')}`
    );
  }

  // 2. IS_DEVELOPMENT must be false in production
  if (process.env.IS_DEVELOPMENT === 'true') {
    errors.push('CRITICAL: IS_DEVELOPMENT=true is not allowed in production');
  }

  // 3. At least one cloud provider must be configured
  const hasCloudProvider = CLOUD_PROVIDERS.some((p) => configuredProviders.includes(p));
  if (!hasCloudProvider) {
    errors.push(
      `CRITICAL: No cloud LLM provider configured. ` +
        `Set at least one of: GOOGLE_GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY`
    );
  }

  // 4. Primary provider must be configured
  if (!configuredProviders.includes(primaryProvider) && primaryProvider !== 'mock') {
    errors.push(
      `CRITICAL: Primary provider "${primaryProvider}" is not configured. ` +
        `Set the appropriate API key environment variable.`
    );
  }

  // 5. Warn if not all fallback providers are configured
  const missingFallbacks = fallbackOrder.filter(
    (p) =>
      !configuredProviders.includes(p) &&
      !DEV_ONLY_PROVIDERS.includes(p as (typeof DEV_ONLY_PROVIDERS)[number])
  );
  if (missingFallbacks.length > 0) {
    warnings.push(
      `Fallback providers not configured: ${missingFallbacks.join(', ')}. Failover may be limited.`
    );
  }

  // 6. Redis should be configured for caching in production
  if (cacheEnabled && !process.env.LLM_CACHE_REDIS_URL && !process.env.REDIS_URL) {
    warnings.push(
      'LLM caching is enabled but no Redis URL configured. ' +
        'Set LLM_CACHE_REDIS_URL or REDIS_URL for optimal performance.'
    );
  }

  // 7. Internal API key must be set
  if (!process.env.INTERNAL_API_KEY || process.env.INTERNAL_API_KEY === 'dev-only-key') {
    errors.push('CRITICAL: INTERNAL_API_KEY must be set to a secure value in production');
  }
}

/**
 * Validate development-specific environment settings
 */
function validateDevelopmentEnvironment(config: EnvironmentConfig, warnings: string[]): void {
  const { primaryProvider } = config;

  // Warn if using cloud providers in development (costs money)
  if (CLOUD_PROVIDERS.includes(primaryProvider as (typeof CLOUD_PROVIDERS)[number])) {
    warnings.push(
      `Using cloud provider "${primaryProvider}" in development. ` +
        `Consider using Ollama (LLM_PRIMARY_PROVIDER=ollama) to avoid API costs.`
    );
  }

  // Check if Ollama is reachable when it's the primary provider
  if (primaryProvider === 'ollama') {
    const ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    warnings.push(
      `Ollama configured at ${ollamaUrl}. Ensure Ollama is running with a model pulled.`
    );
  }
}

/**
 * Validate general environment settings (applies to all environments)
 */
function validateGeneralEnvironment(
  config: EnvironmentConfig,
  errors: string[],
  warnings: string[]
): void {
  const { primaryProvider, fallbackOrder } = config;

  // Validate primary provider is valid
  if (
    !VALID_PROVIDERS.includes(primaryProvider as (typeof VALID_PROVIDERS)[number]) &&
    primaryProvider !== 'mock'
  ) {
    errors.push(
      `Invalid LLM_PRIMARY_PROVIDER="${primaryProvider}". ` +
        `Valid options: ${VALID_PROVIDERS.join(', ')}, mock`
    );
  }

  // Validate all fallback providers are valid
  const invalidFallbacks = fallbackOrder.filter(
    (p) => !VALID_PROVIDERS.includes(p as (typeof VALID_PROVIDERS)[number]) && p !== 'mock'
  );
  if (invalidFallbacks.length > 0) {
    warnings.push(`Invalid providers in LLM_FALLBACK_ORDER: ${invalidFallbacks.join(', ')}`);
  }
}

/**
 * Validate the environment configuration
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config = buildEnvironmentConfig();

  // Run environment-specific validations
  if (config.isProduction) {
    validateProductionEnvironment(config, errors, warnings);
  }

  if (config.isDevelopment) {
    validateDevelopmentEnvironment(config, warnings);
  }

  // Run general validations
  validateGeneralEnvironment(config, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Log validation results with color-coded output
 */
export function logValidationResults(result: ValidationResult): void {
  const { valid, errors, warnings, config } = result;

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║            AI ORCHESTRATOR ENVIRONMENT VALIDATION                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Environment info
  console.log(`Environment:     ${config.nodeEnv}`);
  console.log(`Production:      ${config.isProduction ? 'YES' : 'NO'}`);
  console.log(`Primary LLM:     ${config.primaryProvider}`);
  console.log(`Fallback Order:  ${config.fallbackOrder.join(' → ')}`);
  console.log(`Configured:      ${config.configuredProviders.join(', ') || 'None'}`);
  console.log(`LLM Cache:       ${config.cacheEnabled ? 'Enabled' : 'Disabled'}`);
  console.log('');

  // Errors
  if (errors.length > 0) {
    console.error('┌─────────────────────────────────────────────────────────────────┐');
    console.error('│ ❌ ERRORS (Must fix before starting)                            │');
    console.error('└─────────────────────────────────────────────────────────────────┘');
    errors.forEach((err) => console.error(`  • ${err}`));
    console.error('');
  }

  // Warnings
  if (warnings.length > 0) {
    console.warn('┌─────────────────────────────────────────────────────────────────┐');
    console.warn('│ ⚠️  WARNINGS (Review recommended)                                │');
    console.warn('└─────────────────────────────────────────────────────────────────┘');
    warnings.forEach((warn) => console.warn(`  • ${warn}`));
    console.warn('');
  }

  // Summary
  if (valid) {
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ ✅ Environment validation PASSED                                 │');
    console.log('└─────────────────────────────────────────────────────────────────┘');
  } else {
    console.error('┌─────────────────────────────────────────────────────────────────┐');
    console.error('│ ❌ Environment validation FAILED                                │');
    console.error('└─────────────────────────────────────────────────────────────────┘');
  }
  console.log('');
}

/**
 * Validate environment and optionally fail if invalid
 * Call this at service startup
 */
export function validateAndStartOrFail(): EnvironmentConfig {
  const result = validateEnvironment();
  logValidationResults(result);

  if (!result.valid) {
    console.error('Service startup aborted due to invalid environment configuration.');
    console.error('Please fix the errors above and restart the service.');
    process.exit(1);
  }

  return result.config;
}

/**
 * Get the validated environment config without failing
 * Useful for testing or graceful degradation
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return validateEnvironment().config;
}

// Export for use in health checks
export { ValidationResult, EnvironmentConfig };
