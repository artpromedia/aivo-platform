import type { AxeResults, Result, NodeResult, RunOptions, Spec } from 'axe-core';

export interface AxeConfig {
  rules?: Record<string, { enabled: boolean }>;
  tags?: string[];
  runOnly?: {
    type: 'tag' | 'rule';
    values: string[];
  };
  disabledRules?: string[];
  context?: string | string[] | HTMLElement | HTMLElement[];
}

export interface AxeTestResult {
  violations: Result[];
  passes: Result[];
  incomplete: Result[];
  inapplicable: Result[];
  timestamp: string;
  url: string;
  toolOptions: RunOptions;
}

// Default configuration for WCAG 2.1 Level AA
const defaultConfig: AxeConfig = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
  },
};

let globalConfig: AxeConfig = { ...defaultConfig };

/**
 * Configure axe-core globally
 */
export function configureAxe(config: Partial<AxeConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Run axe-core accessibility tests
 */
export async function runAxeTest(
  container: HTMLElement | Document = document,
  options: Partial<AxeConfig> = {}
): Promise<AxeTestResult> {
  const axe = await importAxe();
  const mergedConfig = { ...globalConfig, ...options };

  const runOptions: RunOptions = {};

  if (mergedConfig.runOnly) {
    runOptions.runOnly = mergedConfig.runOnly;
  }

  if (mergedConfig.rules) {
    runOptions.rules = mergedConfig.rules;
  }

  // Disable specific rules if needed
  if (mergedConfig.disabledRules?.length) {
    runOptions.rules = runOptions.rules || {};
    for (const rule of mergedConfig.disabledRules) {
      runOptions.rules[rule] = { enabled: false };
    }
  }

  const results: AxeResults = await axe.run(container, runOptions);

  return {
    violations: results.violations,
    passes: results.passes,
    incomplete: results.incomplete,
    inapplicable: results.inapplicable,
    timestamp: results.timestamp,
    url: results.url,
    toolOptions: runOptions,
  };
}

/**
 * Import axe-core dynamically
 */
async function importAxe(): Promise<typeof import('axe-core')> {
  const axe = await import('axe-core');
  return axe.default || axe;
}

/**
 * Axe runner class for more control
 */
export class AxeRunner {
  private config: AxeConfig;
  private axeInstance: typeof import('axe-core') | null = null;

  constructor(config: Partial<AxeConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Initialize axe-core
   */
  async init(): Promise<void> {
    this.axeInstance = await importAxe();
  }

  /**
   * Run accessibility tests
   */
  async run(
    container: HTMLElement | Document = document,
    options: Partial<AxeConfig> = {}
  ): Promise<AxeTestResult> {
    if (!this.axeInstance) {
      await this.init();
    }

    return runAxeTest(container, { ...this.config, ...options });
  }

  /**
   * Check if there are any violations
   */
  async hasViolations(
    container: HTMLElement | Document = document,
    options: Partial<AxeConfig> = {}
  ): Promise<boolean> {
    const results = await this.run(container, options);
    return results.violations.length > 0;
  }

  /**
   * Get violations only
   */
  async getViolations(
    container: HTMLElement | Document = document,
    options: Partial<AxeConfig> = {}
  ): Promise<Result[]> {
    const results = await this.run(container, options);
    return results.violations;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<AxeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...defaultConfig };
  }
}

// Export singleton instance
export const axeRunner = new AxeRunner();

/**
 * Format violation for console output
 */
export function formatViolation(violation: Result): string {
  const nodes = violation.nodes
    .map((node: NodeResult) => {
      const selector = node.target.join(' ');
      const summary = node.failureSummary || '';
      return `  - ${selector}\n    ${summary}`;
    })
    .join('\n');

  return `
[${violation.impact?.toUpperCase()}] ${violation.id}
${violation.description}
Help: ${violation.helpUrl}
Affected elements:
${nodes}
`;
}

/**
 * Log violations to console
 */
export function logViolations(violations: Result[]): void {
  if (violations.length === 0) {
    console.log('✓ No accessibility violations found');
    return;
  }

  console.error(`✗ Found ${violations.length} accessibility violation(s):`);
  violations.forEach((v) => console.error(formatViolation(v)));
}
