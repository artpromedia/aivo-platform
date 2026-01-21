#!/usr/bin/env tsx
/**
 * AIVO Platform - TODO/FIXME Triage Script
 * Sprint 4: Technical Debt Reduction
 *
 * Scans codebase for TODO/FIXME comments, categorizes them by type,
 * assigns priority, and generates a comprehensive report.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');

// Directories to scan
const SCAN_DIRS = ['apps', 'libs', 'packages', 'services', 'tests'];

// Directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.next',
  'coverage',
  '.dart_tool',
  '.flutter-plugins',
  'pubspec.lock',
  'android/build',
  'ios/Pods',
  '.git',
];

// File extensions to scan
const EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.dart',
  '.py',
  '.go',
  '.rs',
  '.prisma',
  '.graphql',
];

// TODO/FIXME patterns
const TODO_PATTERNS = [
  /\/\/\s*TODO[:\s](.+)/gi,
  /\/\/\s*FIXME[:\s](.+)/gi,
  /\/\*\s*TODO[:\s](.+)\*\//gi,
  /#\s*TODO[:\s](.+)/gi, // Python comments
  /\/\/\s*HACK[:\s](.+)/gi,
  /\/\/\s*XXX[:\s](.+)/gi,
  /\/\/\s*BUG[:\s](.+)/gi,
];

// Category keywords
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  security: [
    'auth',
    'security',
    'vulnerability',
    'injection',
    'xss',
    'csrf',
    'sanitize',
    'validate session',
    'permission',
    'authorization',
    'encrypt',
    'token',
    'credential',
    'password',
    'coppa',
    'ferpa',
    'consent',
  ],
  performance: [
    'performance',
    'slow',
    'optimize',
    'cache',
    'n+1',
    'memory',
    'leak',
    'batch',
    'lazy load',
    'debounce',
    'throttle',
    'async',
    'parallel',
  ],
  bug: [
    'bug',
    'fix',
    'broken',
    'workaround',
    'hack',
    'doesn\'t work',
    'not working',
    'issue',
    'error',
    'crash',
    'fail',
  ],
  feature: [
    'implement',
    'add',
    'integrate',
    'create',
    'build',
    'call api',
    'replace with',
    'connect to',
    'when ready',
    'when available',
  ],
  cleanup: [
    'cleanup',
    'clean up',
    'refactor',
    'remove',
    'delete',
    'deprecated',
    'tech debt',
    'legacy',
    'temporary',
    'temp',
  ],
};

// Priority keywords (P0 = critical, P3 = low)
const PRIORITY_KEYWORDS: Record<Priority, string[]> = {
  P0: [
    'security',
    'auth',
    'vulnerability',
    'critical',
    'urgent',
    'must',
    'coppa',
    'ferpa',
    'consent',
    'compliance',
    'authorization gap',
  ],
  P1: [
    'important',
    'needed',
    'required',
    'core functionality',
    'api integration',
    'real api',
    'production',
  ],
  P2: [
    'should',
    'nice to have',
    'improvement',
    'when needed',
    'when available',
  ],
  P3: [
    'cleanup',
    'refactor',
    'eventually',
    'later',
    'someday',
    'optional',
    'tech debt',
  ],
};

// Service ownership mapping
const SERVICE_OWNERS: Record<string, string> = {
  'lti-svc': 'Auth Team',
  'auth-svc': 'Auth Team',
  'api-gateway': 'Platform Team',
  'billing-svc': 'Billing Team',
  'analytics-svc': 'Data Team',
  'ai-orchestrator': 'AI Team',
  'content-svc': 'Content Team',
  'learner-model-svc': 'Learning Team',
  'focus-svc': 'Focus Team',
  'marketplace-svc': 'Marketplace Team',
  'research-svc': 'Research Team',
  'parent-svc': 'Parent Team',
  'realtime-svc': 'Realtime Team',
  'audit-svc': 'Compliance Team',
  'notification-svc': 'Platform Team',
  'web-district': 'Frontend Team',
  'web-teacher': 'Frontend Team',
  'web-learner': 'Frontend Team',
  'web-creator': 'Frontend Team',
  'web-marketing': 'Marketing Team',
  'mobile-teacher': 'Mobile Team',
  'mobile-parent': 'Mobile Team',
  'mobile-learner': 'Mobile Team',
};

// Types
type Category = 'security' | 'performance' | 'bug' | 'feature' | 'cleanup' | 'unknown';
type Priority = 'P0' | 'P1' | 'P2' | 'P3';

interface TodoItem {
  id: string;
  file: string;
  line: number;
  content: string;
  type: 'TODO' | 'FIXME' | 'HACK' | 'XXX' | 'BUG';
  category: Category;
  priority: Priority;
  owner: string;
  effortEstimate: 'XS' | 'S' | 'M' | 'L' | 'XL';
  stale: boolean;
  dateFound?: string;
}

interface TriageReport {
  generatedAt: string;
  summary: {
    total: number;
    byCategory: Record<Category, number>;
    byPriority: Record<Priority, number>;
    byOwner: Record<string, number>;
    staleCount: number;
  };
  items: TodoItem[];
}

// Utility functions
function shouldExclude(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some((pattern) => filePath.includes(pattern));
}

function hasValidExtension(filePath: string): boolean {
  return EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

function categorize(content: string): Category {
  const lowerContent = content.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lowerContent.includes(kw))) {
      return category as Category;
    }
  }

  return 'unknown';
}

function assignPriority(content: string, category: Category): Priority {
  const lowerContent = content.toLowerCase();

  // Security-related TODOs are always P0
  if (category === 'security') {
    return 'P0';
  }

  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some((kw) => lowerContent.includes(kw))) {
      return priority as Priority;
    }
  }

  // Default priority based on category
  switch (category) {
    case 'bug':
      return 'P1';
    case 'feature':
      return 'P1';
    case 'performance':
      return 'P2';
    case 'cleanup':
      return 'P3';
    default:
      return 'P2';
  }
}

function estimateEffort(content: string): 'XS' | 'S' | 'M' | 'L' | 'XL' {
  const lowerContent = content.toLowerCase();

  if (
    lowerContent.includes('simple') ||
    lowerContent.includes('just') ||
    lowerContent.includes('replace with')
  ) {
    return 'XS';
  }

  if (
    lowerContent.includes('integration') ||
    lowerContent.includes('implement') ||
    lowerContent.includes('complex')
  ) {
    return 'L';
  }

  if (
    lowerContent.includes('refactor') ||
    lowerContent.includes('redesign') ||
    lowerContent.includes('major')
  ) {
    return 'XL';
  }

  if (lowerContent.includes('add') || lowerContent.includes('create')) {
    return 'M';
  }

  return 'S';
}

function getOwner(filePath: string): string {
  for (const [service, owner] of Object.entries(SERVICE_OWNERS)) {
    if (filePath.includes(service)) {
      return owner;
    }
  }
  return 'Unassigned';
}

function isStale(filePath: string, content: string): boolean {
  // Check if TODO references old dates or completed features
  const stalePatterns = [
    /2023/,
    /2024/,
    /phase 1/i,
    /sprint 0/i,
    /later/i,
    /someday/i,
    /temporary/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(content));
}

function extractTodoType(line: string): 'TODO' | 'FIXME' | 'HACK' | 'XXX' | 'BUG' {
  if (/FIXME/i.test(line)) return 'FIXME';
  if (/HACK/i.test(line)) return 'HACK';
  if (/XXX/i.test(line)) return 'XXX';
  if (/BUG/i.test(line)) return 'BUG';
  return 'TODO';
}

function scanFile(filePath: string): TodoItem[] {
  const items: TodoItem[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const patterns = [
        /\/\/\s*(TODO|FIXME|HACK|XXX|BUG)[:\s]+(.+)/i,
        /#\s*(TODO|FIXME|HACK|XXX|BUG)[:\s]+(.+)/i,
        /\/\*\s*(TODO|FIXME|HACK|XXX|BUG)[:\s]+(.+)\*\//i,
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const todoContent = match[2].trim();
          const category = categorize(todoContent);
          const relativePath = path.relative(PROJECT_ROOT, filePath);

          items.push({
            id: `${relativePath}:${lineNumber}`,
            file: relativePath,
            line: lineNumber,
            content: todoContent,
            type: extractTodoType(line),
            category,
            priority: assignPriority(todoContent, category),
            owner: getOwner(filePath),
            effortEstimate: estimateEffort(todoContent),
            stale: isStale(filePath, todoContent),
            dateFound: new Date().toISOString().split('T')[0],
          });
          break; // Only match once per line
        }
      }
    });
  } catch (error) {
    console.error(`Error scanning file ${filePath}: ${error}`);
  }

  return items;
}

function walkDirectory(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (shouldExclude(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...walkDirectory(fullPath));
      } else if (entry.isFile() && hasValidExtension(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors
  }

  return files;
}

function generateReport(items: TodoItem[]): TriageReport {
  const summary = {
    total: items.length,
    byCategory: {} as Record<Category, number>,
    byPriority: {} as Record<Priority, number>,
    byOwner: {} as Record<string, number>,
    staleCount: 0,
  };

  // Initialize counters
  const categories: Category[] = ['security', 'performance', 'bug', 'feature', 'cleanup', 'unknown'];
  const priorities: Priority[] = ['P0', 'P1', 'P2', 'P3'];

  categories.forEach((cat) => (summary.byCategory[cat] = 0));
  priorities.forEach((pri) => (summary.byPriority[pri] = 0));

  // Count items
  items.forEach((item) => {
    summary.byCategory[item.category]++;
    summary.byPriority[item.priority]++;
    summary.byOwner[item.owner] = (summary.byOwner[item.owner] || 0) + 1;
    if (item.stale) summary.staleCount++;
  });

  return {
    generatedAt: new Date().toISOString(),
    summary,
    items: items.sort((a, b) => {
      // Sort by priority first (P0 first), then by category
      const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.category.localeCompare(b.category);
    }),
  };
}

function generateMarkdownReport(report: TriageReport): string {
  const lines: string[] = [
    '# TODO/FIXME Triage Report',
    '',
    `**Generated:** ${report.generatedAt}`,
    `**Total Items:** ${report.summary.total}`,
    `**Stale Items:** ${report.summary.staleCount} (candidates for removal)`,
    '',
    '---',
    '',
    '## Executive Summary',
    '',
    '### By Priority',
    '',
    '| Priority | Count | Description |',
    '|----------|-------|-------------|',
    `| **P0** | ${report.summary.byPriority.P0} | Security/Critical - Must fix before launch |`,
    `| **P1** | ${report.summary.byPriority.P1} | Core Functionality - Required for production |`,
    `| **P2** | ${report.summary.byPriority.P2} | Improvements - Nice to have |`,
    `| **P3** | ${report.summary.byPriority.P3} | Tech Debt - Can defer |`,
    '',
    '### By Category',
    '',
    '| Category | Count |',
    '|----------|-------|',
    `| 🔒 Security | ${report.summary.byCategory.security} |`,
    `| ⚡ Performance | ${report.summary.byCategory.performance} |`,
    `| 🐛 Bug | ${report.summary.byCategory.bug} |`,
    `| ✨ Feature | ${report.summary.byCategory.feature} |`,
    `| 🧹 Cleanup | ${report.summary.byCategory.cleanup} |`,
    `| ❓ Unknown | ${report.summary.byCategory.unknown} |`,
    '',
    '### By Owner',
    '',
    '| Team | Count |',
    '|------|-------|',
    ...Object.entries(report.summary.byOwner)
      .sort((a, b) => b[1] - a[1])
      .map(([owner, count]) => `| ${owner} | ${count} |`),
    '',
    '---',
    '',
    '## 🚨 P0 - Critical Items (Must Fix)',
    '',
  ];

  const p0Items = report.items.filter((item) => item.priority === 'P0');
  if (p0Items.length === 0) {
    lines.push('*No P0 items found.*');
  } else {
    lines.push('| File | Line | Category | Content | Owner | Effort |');
    lines.push('|------|------|----------|---------|-------|--------|');
    p0Items.forEach((item) => {
      const shortFile = item.file.length > 50 ? '...' + item.file.slice(-47) : item.file;
      const shortContent = item.content.length > 60 ? item.content.slice(0, 57) + '...' : item.content;
      lines.push(
        `| [${shortFile}](${item.file}#L${item.line}) | ${item.line} | ${item.category} | ${shortContent} | ${item.owner} | ${item.effortEstimate} |`
      );
    });
  }

  lines.push('', '---', '', '## P1 - Core Functionality', '');

  const p1Items = report.items.filter((item) => item.priority === 'P1');
  if (p1Items.length === 0) {
    lines.push('*No P1 items found.*');
  } else {
    lines.push('| File | Line | Category | Content | Owner |');
    lines.push('|------|------|----------|---------|-------|');
    p1Items.slice(0, 20).forEach((item) => {
      const shortFile = item.file.length > 40 ? '...' + item.file.slice(-37) : item.file;
      const shortContent = item.content.length > 50 ? item.content.slice(0, 47) + '...' : item.content;
      lines.push(`| [${shortFile}](${item.file}#L${item.line}) | ${item.line} | ${item.category} | ${shortContent} | ${item.owner} |`);
    });
    if (p1Items.length > 20) {
      lines.push(``, `*...and ${p1Items.length - 20} more P1 items*`);
    }
  }

  lines.push('', '---', '', '## 📋 Stale Items (Candidates for Removal)', '');

  const staleItems = report.items.filter((item) => item.stale);
  if (staleItems.length === 0) {
    lines.push('*No stale items found.*');
  } else {
    lines.push('| File | Line | Content | Reason |');
    lines.push('|------|------|---------|--------|');
    staleItems.slice(0, 15).forEach((item) => {
      const shortFile = item.file.length > 40 ? '...' + item.file.slice(-37) : item.file;
      const shortContent = item.content.length > 40 ? item.content.slice(0, 37) + '...' : item.content;
      lines.push(`| [${shortFile}](${item.file}#L${item.line}) | ${item.line} | ${shortContent} | Potentially outdated |`);
    });
    if (staleItems.length > 15) {
      lines.push(``, `*...and ${staleItems.length - 15} more stale items*`);
    }
  }

  lines.push(
    '',
    '---',
    '',
    '## Recommendations',
    '',
    '1. **Immediate Action:** Address all P0 security items before production launch',
    '2. **Sprint Planning:** Include P1 items in next sprint backlog',
    '3. **Cleanup:** Remove stale TODOs that reference completed work',
    '4. **Process:** Add ESLint rule to require dated TODOs: `TODO(YYYY-MM-DD): message`',
    '',
    '---',
    '',
    '*Report generated by `scripts/triage-todos.ts`*'
  );

  return lines.join('\n');
}

// Main execution
async function main() {
  console.log('🔍 AIVO TODO/FIXME Triage Script');
  console.log('================================\n');

  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Collect all files
  console.log('📁 Scanning directories:', SCAN_DIRS.join(', '));
  const allFiles: string[] = [];

  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(dirPath)) {
      allFiles.push(...walkDirectory(dirPath));
    }
  }

  console.log(`   Found ${allFiles.length} files to scan\n`);

  // Scan all files for TODOs
  console.log('🔎 Scanning for TODO/FIXME comments...');
  const allItems: TodoItem[] = [];

  for (const file of allFiles) {
    const items = scanFile(file);
    allItems.push(...items);
  }

  console.log(`   Found ${allItems.length} TODO/FIXME items\n`);

  // Generate report
  const report = generateReport(allItems);

  // Save JSON report
  const dateStr = new Date().toISOString().split('T')[0];
  const jsonPath = path.join(REPORTS_DIR, `todo-triage-${dateStr}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`📄 JSON report saved to: ${jsonPath}`);

  // Save Markdown report
  const mdPath = path.join(REPORTS_DIR, 'todo-triage-summary.md');
  fs.writeFileSync(mdPath, generateMarkdownReport(report));
  console.log(`📄 Markdown report saved to: ${mdPath}`);

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   Total TODOs: ${report.summary.total}`);
  console.log(`   P0 (Critical): ${report.summary.byPriority.P0}`);
  console.log(`   P1 (Core): ${report.summary.byPriority.P1}`);
  console.log(`   P2 (Improvements): ${report.summary.byPriority.P2}`);
  console.log(`   P3 (Tech Debt): ${report.summary.byPriority.P3}`);
  console.log(`   Stale (Remove): ${report.summary.staleCount}`);

  console.log('\n✅ Triage complete!\n');
}

main().catch(console.error);
