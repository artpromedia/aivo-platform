/**
 * Performance Budget Configuration
 *
 * Defines size limits for bundles and assets
 * Used by CI/CD to fail builds that exceed budgets
 */

export interface PerformanceBudget {
  name: string;
  type: 'bundle' | 'asset' | 'total';
  pattern?: RegExp;
  maxSize: number; // in bytes
  warnSize?: number; // in bytes
}

export const performanceBudgets: PerformanceBudget[] = [
  // Main bundle budgets
  {
    name: 'main-bundle',
    type: 'bundle',
    pattern: /^assets\/js\/index-.*\.js$/,
    maxSize: 250 * 1024, // 250KB
    warnSize: 200 * 1024, // 200KB
  },

  // Vendor chunk budgets
  {
    name: 'vendor-react',
    type: 'bundle',
    pattern: /^assets\/js\/vendor-react-.*\.js$/,
    maxSize: 150 * 1024, // 150KB
    warnSize: 120 * 1024,
  },
  {
    name: 'vendor-ui',
    type: 'bundle',
    pattern: /^assets\/js\/vendor-ui-.*\.js$/,
    maxSize: 100 * 1024, // 100KB
    warnSize: 80 * 1024,
  },
  {
    name: 'vendor-charts',
    type: 'bundle',
    pattern: /^assets\/js\/vendor-charts-.*\.js$/,
    maxSize: 200 * 1024, // 200KB
    warnSize: 150 * 1024,
  },

  // Individual chunk budgets
  {
    name: 'lazy-chunks',
    type: 'bundle',
    pattern: /^assets\/js\/(?!vendor|index).*\.js$/,
    maxSize: 100 * 1024, // 100KB per lazy chunk
    warnSize: 75 * 1024,
  },

  // CSS budgets
  {
    name: 'main-css',
    type: 'asset',
    pattern: /^assets\/css\/.*\.css$/,
    maxSize: 100 * 1024, // 100KB
    warnSize: 75 * 1024,
  },

  // Image budgets
  {
    name: 'images',
    type: 'asset',
    pattern: /\.(png|jpe?g|gif|webp)$/i,
    maxSize: 500 * 1024, // 500KB per image
    warnSize: 300 * 1024,
  },

  // Font budgets
  {
    name: 'fonts',
    type: 'asset',
    pattern: /\.(woff2?|ttf|eot)$/i,
    maxSize: 100 * 1024, // 100KB per font
    warnSize: 75 * 1024,
  },

  // Total bundle budget
  {
    name: 'total-js',
    type: 'total',
    pattern: /\.js$/,
    maxSize: 1024 * 1024, // 1MB total JS
    warnSize: 800 * 1024,
  },

  // Total initial load budget
  {
    name: 'initial-load',
    type: 'total',
    pattern: /^assets\/(js\/index|js\/vendor-react|css\/index)/,
    maxSize: 500 * 1024, // 500KB for initial load
    warnSize: 400 * 1024,
  },
];

export interface BudgetResult {
  budget: PerformanceBudget;
  actualSize: number;
  passed: boolean;
  warning: boolean;
  percentageUsed: number;
}

export function checkBudgets(
  files: Array<{ name: string; size: number }>
): BudgetResult[] {
  const results: BudgetResult[] = [];

  for (const budget of performanceBudgets) {
    let matchingFiles = files;

    if (budget.pattern) {
      matchingFiles = files.filter((f) => budget.pattern!.test(f.name));
    }

    let actualSize: number;

    if (budget.type === 'total') {
      actualSize = matchingFiles.reduce((sum, f) => sum + f.size, 0);
    } else {
      // For non-total, check each file individually
      for (const file of matchingFiles) {
        results.push({
          budget: { ...budget, name: `${budget.name}: ${file.name}` },
          actualSize: file.size,
          passed: file.size <= budget.maxSize,
          warning: budget.warnSize ? file.size > budget.warnSize : false,
          percentageUsed: (file.size / budget.maxSize) * 100,
        });
      }
      continue;
    }

    results.push({
      budget,
      actualSize,
      passed: actualSize <= budget.maxSize,
      warning: budget.warnSize ? actualSize > budget.warnSize : false,
      percentageUsed: (actualSize / budget.maxSize) * 100,
    });
  }

  return results;
}

export function formatBudgetReport(results: BudgetResult[]): string {
  const lines: string[] = ['# Performance Budget Report', ''];

  const failed = results.filter((r) => !r.passed);
  const warnings = results.filter((r) => r.passed && r.warning);
  const passed = results.filter((r) => r.passed && !r.warning);

  if (failed.length > 0) {
    lines.push('## ❌ Failed Budgets', '');
    for (const result of failed) {
      lines.push(
        `- **${result.budget.name}**: ${formatBytes(result.actualSize)} / ${formatBytes(result.budget.maxSize)} (${result.percentageUsed.toFixed(1)}%)`
      );
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('## ⚠️ Warnings', '');
    for (const result of warnings) {
      lines.push(
        `- **${result.budget.name}**: ${formatBytes(result.actualSize)} / ${formatBytes(result.budget.maxSize)} (${result.percentageUsed.toFixed(1)}%)`
      );
    }
    lines.push('');
  }

  lines.push('## ✅ Passed Budgets', '');
  for (const result of passed) {
    lines.push(
      `- ${result.budget.name}: ${formatBytes(result.actualSize)} / ${formatBytes(result.budget.maxSize)} (${result.percentageUsed.toFixed(1)}%)`
    );
  }

  return lines.join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
