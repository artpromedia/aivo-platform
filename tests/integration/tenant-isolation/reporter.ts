/**
 * Tenant Isolation Test Report Generator
 *
 * Generates compliance-ready HTML reports for tenant isolation test results.
 * Reports can be used for:
 * - FERPA compliance audits
 * - Security assessments
 * - CI/CD pipeline artifacts
 *
 * @module tests/integration/tenant-isolation/reporter
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// Types
// ============================================================================

export interface IsolationTestResult {
  /** API endpoint tested */
  endpoint: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Test case description */
  testCase: string;
  /** Test category */
  category: TestCategory;
  /** Whether the test passed */
  passed: boolean;
  /** Additional details */
  details?: string;
  /** Whether cross-tenant access was attempted */
  attemptedCrossTenantAccess: boolean;
  /** Whether data actually leaked (critical failure) */
  dataLeaked: boolean;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Timestamp */
  timestamp: Date;
}

export type TestCategory =
  | 'api-endpoints'
  | 'query-injection'
  | 'body-injection'
  | 'header-attacks'
  | 'jwt-manipulation'
  | 'sql-injection'
  | 'database-isolation'
  | 'path-traversal'
  | 'mass-assignment'
  | 'idor';

export interface IsolationReportSummary {
  /** Total number of tests run */
  totalTests: number;
  /** Number of tests passed */
  passed: number;
  /** Number of tests failed */
  failed: number;
  /** Number of data leaks detected (critical) */
  dataLeaks: number;
  /** Overall status */
  status: 'PASSED' | 'FAILED' | 'CRITICAL';
  /** Test duration */
  durationMs: number;
  /** Timestamp */
  generatedAt: Date;
  /** Git commit SHA if available */
  commitSha?: string;
  /** Branch name if available */
  branch?: string;
}

export interface IsolationReport {
  summary: IsolationReportSummary;
  results: IsolationTestResult[];
  byCategory: Record<TestCategory, IsolationTestResult[]>;
}

// ============================================================================
// Report Builder
// ============================================================================

export class IsolationReportBuilder {
  private results: IsolationTestResult[] = [];
  private startTime: number = Date.now();

  /**
   * Add a test result
   */
  addResult(result: Omit<IsolationTestResult, 'timestamp'>): void {
    this.results.push({
      ...result,
      timestamp: new Date(),
    });
  }

  /**
   * Add a passing test result
   */
  addPass(
    category: TestCategory,
    endpoint: string,
    method: IsolationTestResult['method'],
    testCase: string,
    durationMs?: number
  ): void {
    this.addResult({
      endpoint,
      method,
      testCase,
      category,
      passed: true,
      attemptedCrossTenantAccess: true,
      dataLeaked: false,
      durationMs,
    });
  }

  /**
   * Add a failing test result
   */
  addFail(
    category: TestCategory,
    endpoint: string,
    method: IsolationTestResult['method'],
    testCase: string,
    details: string,
    dataLeaked: boolean = false,
    durationMs?: number
  ): void {
    this.addResult({
      endpoint,
      method,
      testCase,
      category,
      passed: false,
      details,
      attemptedCrossTenantAccess: true,
      dataLeaked,
      durationMs,
    });
  }

  /**
   * Add a critical data leak failure
   */
  addDataLeak(
    category: TestCategory,
    endpoint: string,
    method: IsolationTestResult['method'],
    testCase: string,
    details: string,
    durationMs?: number
  ): void {
    this.addFail(category, endpoint, method, testCase, details, true, durationMs);
  }

  /**
   * Build the final report
   */
  build(): IsolationReport {
    const endTime = Date.now();
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const dataLeaks = this.results.filter((r) => r.dataLeaked).length;

    let status: IsolationReportSummary['status'] = 'PASSED';
    if (dataLeaks > 0) {
      status = 'CRITICAL';
    } else if (failed > 0) {
      status = 'FAILED';
    }

    const byCategory = this.results.reduce(
      (acc, result) => {
        if (!acc[result.category]) {
          acc[result.category] = [];
        }
        acc[result.category].push(result);
        return acc;
      },
      {} as Record<TestCategory, IsolationTestResult[]>
    );

    return {
      summary: {
        totalTests: this.results.length,
        passed,
        failed,
        dataLeaks,
        status,
        durationMs: endTime - this.startTime,
        generatedAt: new Date(),
        commitSha: process.env.GITHUB_SHA,
        branch: process.env.GITHUB_REF_NAME || process.env.GITHUB_HEAD_REF,
      },
      results: this.results,
      byCategory,
    };
  }

  /**
   * Reset the builder
   */
  reset(): void {
    this.results = [];
    this.startTime = Date.now();
  }
}

// ============================================================================
// HTML Report Generator
// ============================================================================

/**
 * Generate an HTML report from test results
 */
export function generateHtmlReport(report: IsolationReport): string {
  const { summary, results, byCategory } = report;

  const statusColor =
    summary.status === 'PASSED' ? '#22c55e' : summary.status === 'CRITICAL' ? '#dc2626' : '#f59e0b';

  const statusEmoji = summary.status === 'PASSED' ? '✅' : summary.status === 'CRITICAL' ? '🚨' : '❌';

  const categoryLabels: Record<TestCategory, string> = {
    'api-endpoints': 'API Endpoint Tests',
    'query-injection': 'Query Parameter Injection',
    'body-injection': 'Request Body Injection',
    'header-attacks': 'Header Manipulation',
    'jwt-manipulation': 'JWT Manipulation',
    'sql-injection': 'SQL Injection Attempts',
    'database-isolation': 'Database-Level Isolation',
    'path-traversal': 'Path Traversal Attacks',
    'mass-assignment': 'Mass Assignment Attacks',
    idor: 'IDOR Attacks',
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tenant Isolation Test Report - AIVO</title>
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --success: #22c55e;
      --warning: #f59e0b;
      --error: #dc2626;
      --info: #3b82f6;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      padding: 2rem;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--bg-tertiary);
    }
    
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    
    .subtitle {
      color: var(--text-secondary);
      font-size: 1rem;
    }
    
    .meta {
      margin-top: 1rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .summary-card {
      background: var(--bg-secondary);
      padding: 1.5rem;
      border-radius: 0.5rem;
      text-align: center;
    }
    
    .summary-card.status {
      background: ${statusColor}20;
      border: 2px solid ${statusColor};
    }
    
    .summary-card h3 {
      font-size: 0.875rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }
    
    .summary-card .value {
      font-size: 2rem;
      font-weight: bold;
    }
    
    .summary-card.status .value {
      color: ${statusColor};
    }
    
    .summary-card .value.success { color: var(--success); }
    .summary-card .value.error { color: var(--error); }
    .summary-card .value.warning { color: var(--warning); }
    
    .section {
      background: var(--bg-secondary);
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    
    .section-header {
      padding: 1rem 1.5rem;
      background: var(--bg-tertiary);
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .badge.success { background: var(--success)20; color: var(--success); }
    .badge.error { background: var(--error)20; color: var(--error); }
    .badge.warning { background: var(--warning)20; color: var(--warning); }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--bg-tertiary);
    }
    
    th {
      background: var(--bg-primary);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-secondary);
    }
    
    tr:hover {
      background: var(--bg-tertiary)40;
    }
    
    .status-icon {
      display: inline-block;
      width: 1.5rem;
      text-align: center;
    }
    
    .method {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: monospace;
    }
    
    .method.GET { background: var(--info)20; color: var(--info); }
    .method.POST { background: var(--success)20; color: var(--success); }
    .method.PATCH, .method.PUT { background: var(--warning)20; color: var(--warning); }
    .method.DELETE { background: var(--error)20; color: var(--error); }
    
    .endpoint {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    
    .details {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    
    .critical-alert {
      background: var(--error)20;
      border: 2px solid var(--error);
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      text-align: center;
    }
    
    .critical-alert h2 {
      color: var(--error);
      margin-bottom: 0.5rem;
    }
    
    footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
      font-size: 0.875rem;
      border-top: 1px solid var(--bg-tertiary);
      margin-top: 2rem;
    }
    
    @media print {
      body { background: white; color: black; }
      .summary-card, .section { border: 1px solid #ddd; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔒 Tenant Isolation Test Report</h1>
      <p class="subtitle">AIVO Learning Platform - Multi-Tenant Security Verification</p>
      <p class="meta">
        Generated: ${summary.generatedAt.toISOString()}
        ${summary.commitSha ? ` | Commit: ${summary.commitSha.substring(0, 7)}` : ''}
        ${summary.branch ? ` | Branch: ${summary.branch}` : ''}
      </p>
    </header>

    ${
      summary.dataLeaks > 0
        ? `
    <div class="critical-alert">
      <h2>🚨 CRITICAL: DATA LEAK DETECTED</h2>
      <p>
        ${summary.dataLeaks} test(s) detected potential cross-tenant data exposure.
        <br>
        <strong>This PR cannot be merged until all leaks are fixed.</strong>
      </p>
    </div>
    `
        : ''
    }

    <div class="summary-grid">
      <div class="summary-card status">
        <h3>Status</h3>
        <div class="value">${statusEmoji} ${summary.status}</div>
      </div>
      <div class="summary-card">
        <h3>Total Tests</h3>
        <div class="value">${summary.totalTests}</div>
      </div>
      <div class="summary-card">
        <h3>Passed</h3>
        <div class="value success">${summary.passed}</div>
      </div>
      <div class="summary-card">
        <h3>Failed</h3>
        <div class="value ${summary.failed > 0 ? 'error' : ''}">${summary.failed}</div>
      </div>
      <div class="summary-card">
        <h3>Data Leaks</h3>
        <div class="value ${summary.dataLeaks > 0 ? 'error' : ''}">${summary.dataLeaks}</div>
      </div>
      <div class="summary-card">
        <h3>Duration</h3>
        <div class="value">${(summary.durationMs / 1000).toFixed(2)}s</div>
      </div>
    </div>

    ${Object.entries(byCategory)
      .map(([category, categoryResults]) => {
        const categoryPassed = categoryResults.filter((r) => r.passed).length;
        const categoryFailed = categoryResults.length - categoryPassed;
        const categoryLeaks = categoryResults.filter((r) => r.dataLeaked).length;

        return `
    <div class="section">
      <div class="section-header">
        <span>${categoryLabels[category as TestCategory] || category}</span>
        <span>
          <span class="badge success">${categoryPassed} passed</span>
          ${categoryFailed > 0 ? `<span class="badge error">${categoryFailed} failed</span>` : ''}
          ${categoryLeaks > 0 ? `<span class="badge error">${categoryLeaks} leaks</span>` : ''}
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 40px">Status</th>
            <th style="width: 80px">Method</th>
            <th>Endpoint</th>
            <th>Test Case</th>
            <th>Data Leaked</th>
          </tr>
        </thead>
        <tbody>
          ${categoryResults
            .map(
              (r) => `
          <tr>
            <td><span class="status-icon">${r.passed ? '✅' : r.dataLeaked ? '🚨' : '❌'}</span></td>
            <td><span class="method ${r.method}">${r.method}</span></td>
            <td class="endpoint">${escapeHtml(r.endpoint)}</td>
            <td>
              ${escapeHtml(r.testCase)}
              ${r.details ? `<div class="details">${escapeHtml(r.details)}</div>` : ''}
            </td>
            <td>${r.dataLeaked ? '<span class="badge error">⚠️ YES</span>' : '<span class="badge success">No</span>'}</td>
          </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
        `;
      })
      .join('')}

    <footer>
      <p>
        AIVO Tenant Isolation Test Suite v1.0
        <br>
        This report is generated automatically for FERPA compliance verification.
      </p>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// ============================================================================
// JSON Report Generator
// ============================================================================

/**
 * Generate a JSON report for programmatic consumption
 */
export function generateJsonReport(report: IsolationReport): string {
  return JSON.stringify(report, null, 2);
}

// ============================================================================
// JUnit XML Report Generator (for CI integration)
// ============================================================================

/**
 * Generate a JUnit XML report for CI systems
 */
export function generateJunitReport(report: IsolationReport): string {
  const { summary, results } = report;

  const testCases = results
    .map((r) => {
      const className = `TenantIsolation.${r.category}`;
      const testName = `${r.method} ${r.endpoint} - ${r.testCase}`;
      const time = ((r.durationMs || 0) / 1000).toFixed(3);

      if (r.passed) {
        return `    <testcase classname="${escapeXml(className)}" name="${escapeXml(testName)}" time="${time}" />`;
      } else {
        const failureType = r.dataLeaked ? 'DataLeak' : 'IsolationFailure';
        const message = r.details || 'Test failed';
        return `    <testcase classname="${escapeXml(className)}" name="${escapeXml(testName)}" time="${time}">
      <failure type="${failureType}" message="${escapeXml(message)}">
${escapeXml(r.details || 'Cross-tenant access was not properly blocked')}
      </failure>
    </testcase>`;
      }
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Tenant Isolation Tests" tests="${summary.totalTests}" failures="${summary.failed}" errors="${summary.dataLeaks}" time="${(summary.durationMs / 1000).toFixed(3)}">
  <testsuite name="TenantIsolation" tests="${summary.totalTests}" failures="${summary.failed}" errors="${summary.dataLeaks}" time="${(summary.durationMs / 1000).toFixed(3)}">
${testCases}
  </testsuite>
</testsuites>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// ============================================================================
// File Writers
// ============================================================================

/**
 * Write report to files
 */
export async function writeReports(
  report: IsolationReport,
  outputDir: string = 'test-results'
): Promise<void> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write HTML report
  const htmlPath = path.join(outputDir, 'tenant-isolation-report.html');
  fs.writeFileSync(htmlPath, generateHtmlReport(report), 'utf-8');
  console.log(`✅ HTML report written to: ${htmlPath}`);

  // Write JSON report
  const jsonPath = path.join(outputDir, 'tenant-isolation-report.json');
  fs.writeFileSync(jsonPath, generateJsonReport(report), 'utf-8');
  console.log(`✅ JSON report written to: ${jsonPath}`);

  // Write JUnit report
  const junitPath = path.join(outputDir, 'tenant-isolation-junit.xml');
  fs.writeFileSync(junitPath, generateJunitReport(report), 'utf-8');
  console.log(`✅ JUnit report written to: ${junitPath}`);
}

// ============================================================================
// Vitest Reporter Plugin
// ============================================================================

/**
 * Custom Vitest reporter for tenant isolation tests
 */
export function createVitestReporter() {
  const builder = new IsolationReportBuilder();

  return {
    onTestResult(test: { name: string; status: string; duration?: number; error?: Error }) {
      // Parse test metadata from name
      // Expected format: "category > test case description"
      const parts = test.name.split(' > ');
      const category = (parts[0]?.toLowerCase().replace(/\s+/g, '-') || 'unknown') as TestCategory;
      const testCase = parts.slice(1).join(' > ') || test.name;

      // Determine if it's a data leak (check error message)
      const isDataLeak = test.error?.message?.toLowerCase().includes('leak');

      if (test.status === 'pass') {
        builder.addPass(category, 'N/A', 'GET', testCase, test.duration);
      } else {
        builder.addFail(
          category,
          'N/A',
          'GET',
          testCase,
          test.error?.message || 'Test failed',
          isDataLeak,
          test.duration
        );
      }
    },

    async onFinished() {
      const report = builder.build();
      await writeReports(report);

      // Exit with error code if any data leaks
      if (report.summary.dataLeaks > 0) {
        console.error(`\n🚨 CRITICAL: ${report.summary.dataLeaks} data leak(s) detected!`);
        process.exitCode = 1;
      }
    },
  };
}
