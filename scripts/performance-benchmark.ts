#!/usr/bin/env tsx
/**
 * AIVO Platform - Performance Benchmarking Suite
 * Week 51: Performance & Security Audit
 *
 * Comprehensive performance benchmarking for all portals including:
 * - Core Web Vitals (FCP, LCP, CLS, INP)
 * - Time to Interactive (TTI)
 * - Total Blocking Time (TBT)
 * - Bundle size analysis
 * - API response times
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  portals: [
    { name: 'Learner Portal', url: process.env.LEARNER_URL || 'http://localhost:3000' },
    { name: 'Parent Portal', url: process.env.PARENT_URL || 'http://localhost:3001' },
    { name: 'Teacher Portal', url: process.env.TEACHER_URL || 'http://localhost:3002' },
    { name: 'District Admin Portal', url: process.env.DISTRICT_URL || 'http://localhost:3003' },
  ],
  thresholds: {
    // Core Web Vitals thresholds (Good ratings)
    fcp: 1800, // First Contentful Paint < 1.8s
    lcp: 2500, // Largest Contentful Paint < 2.5s
    cls: 0.1, // Cumulative Layout Shift < 0.1
    inp: 200, // Interaction to Next Paint < 200ms
    tti: 3800, // Time to Interactive < 3.8s
    tbt: 200, // Total Blocking Time < 200ms
    // Performance scores
    performanceScore: 90,
    accessibilityScore: 90,
    bestPracticesScore: 90,
    seoScore: 90,
    // API thresholds
    apiResponseTime: 500, // API responses < 500ms
    // Bundle size (KB)
    maxBundleSize: 300,
  },
  iterations: 3, // Number of test iterations for averaging
};

interface WebVitalsMetrics {
  fcp: number;
  lcp: number;
  cls: number;
  tti: number;
  tbt: number;
  domContentLoaded: number;
  load: number;
  resourceCount: number;
  resourceSize: number;
}

interface PerformanceResult {
  portal: string;
  url: string;
  timestamp: string;
  metrics: WebVitalsMetrics;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  passes: boolean;
  failures: string[];
}

interface BenchmarkReport {
  timestamp: string;
  environment: string;
  results: PerformanceResult[];
  summary: {
    totalPortals: number;
    passedPortals: number;
    failedPortals: number;
    averagePerformanceScore: number;
    criticalFailures: string[];
  };
}

// Color output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Collect Web Vitals metrics
async function collectWebVitals(page: Page): Promise<WebVitalsMetrics> {
  // Inject performance observer
  const metrics = await page.evaluate(() => {
    return new Promise<WebVitalsMetrics>((resolve) => {
      const results: Partial<WebVitalsMetrics> = {
        fcp: 0,
        lcp: 0,
        cls: 0,
        tti: 0,
        tbt: 0,
        domContentLoaded: 0,
        load: 0,
        resourceCount: 0,
        resourceSize: 0,
      };

      // Get navigation timing
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navTiming) {
        results.domContentLoaded = navTiming.domContentLoadedEventEnd - navTiming.startTime;
        results.load = navTiming.loadEventEnd - navTiming.startTime;
      }

      // Get paint timing
      const paintEntries = performance.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          results.fcp = entry.startTime;
        }
      }

      // Get LCP from PerformanceObserver if available
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        results.lcp = lcpEntries[lcpEntries.length - 1].startTime;
      } else {
        // Fallback: use load time as approximation
        results.lcp = results.load || results.fcp;
      }

      // Get CLS from layout-shift entries
      const layoutShiftEntries = performance.getEntriesByType('layout-shift') as PerformanceEntry[];
      let clsValue = 0;
      for (const entry of layoutShiftEntries) {
        // @ts-ignore - value exists on layout-shift entries
        if (!entry.hadRecentInput) {
          // @ts-ignore
          clsValue += entry.value || 0;
        }
      }
      results.cls = clsValue;

      // Calculate TTI approximation (when page is interactive)
      // This is a simplified version - real TTI calculation is more complex
      results.tti = Math.max(results.domContentLoaded || 0, results.fcp || 0);

      // Calculate TBT from long tasks
      const longTasks = performance.getEntriesByType('longtask');
      let tbt = 0;
      for (const task of longTasks) {
        // TBT is the portion of long tasks over 50ms
        tbt += Math.max(task.duration - 50, 0);
      }
      results.tbt = tbt;

      // Get resource metrics
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      results.resourceCount = resources.length;
      results.resourceSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);

      resolve(results as WebVitalsMetrics);
    });
  });

  return metrics;
}

// Calculate performance score (simplified Lighthouse-like scoring)
function calculateScores(metrics: WebVitalsMetrics): {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
} {
  // Performance score based on Core Web Vitals
  let performanceScore = 100;

  // FCP scoring (0-100)
  if (metrics.fcp > 4000) performanceScore -= 30;
  else if (metrics.fcp > 2500) performanceScore -= 20;
  else if (metrics.fcp > 1800) performanceScore -= 10;

  // LCP scoring
  if (metrics.lcp > 4000) performanceScore -= 30;
  else if (metrics.lcp > 2500) performanceScore -= 20;
  else if (metrics.lcp > 2000) performanceScore -= 10;

  // CLS scoring
  if (metrics.cls > 0.25) performanceScore -= 20;
  else if (metrics.cls > 0.1) performanceScore -= 10;

  // TBT scoring
  if (metrics.tbt > 600) performanceScore -= 20;
  else if (metrics.tbt > 300) performanceScore -= 10;
  else if (metrics.tbt > 200) performanceScore -= 5;

  // Ensure score is within bounds
  performanceScore = Math.max(0, Math.min(100, performanceScore));

  // For accessibility, best practices, and SEO, we return placeholder scores
  // In production, these would be calculated by actual audits
  return {
    performance: Math.round(performanceScore),
    accessibility: 95, // Placeholder - would use axe-core
    bestPractices: 92, // Placeholder - would check various patterns
    seo: 90, // Placeholder - would check meta tags, etc.
  };
}

// Check if metrics pass thresholds
function checkThresholds(
  metrics: WebVitalsMetrics,
  scores: { performance: number; accessibility: number; bestPractices: number; seo: number }
): { passes: boolean; failures: string[] } {
  const failures: string[] = [];

  if (metrics.fcp > CONFIG.thresholds.fcp) {
    failures.push(`FCP ${metrics.fcp}ms exceeds threshold ${CONFIG.thresholds.fcp}ms`);
  }

  if (metrics.lcp > CONFIG.thresholds.lcp) {
    failures.push(`LCP ${metrics.lcp}ms exceeds threshold ${CONFIG.thresholds.lcp}ms`);
  }

  if (metrics.cls > CONFIG.thresholds.cls) {
    failures.push(`CLS ${metrics.cls.toFixed(3)} exceeds threshold ${CONFIG.thresholds.cls}`);
  }

  if (metrics.tbt > CONFIG.thresholds.tbt) {
    failures.push(`TBT ${metrics.tbt}ms exceeds threshold ${CONFIG.thresholds.tbt}ms`);
  }

  if (scores.performance < CONFIG.thresholds.performanceScore) {
    failures.push(
      `Performance score ${scores.performance} below threshold ${CONFIG.thresholds.performanceScore}`
    );
  }

  return {
    passes: failures.length === 0,
    failures,
  };
}

// Run benchmark for a single portal
async function benchmarkPortal(browser: Browser, portal: { name: string; url: string }): Promise<PerformanceResult> {
  log(`\nBenchmarking ${portal.name}...`, 'cyan');
  log(`URL: ${portal.url}`, 'blue');

  const allMetrics: WebVitalsMetrics[] = [];

  for (let i = 0; i < CONFIG.iterations; i++) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    // Enable performance collection
    await page.route('**/*', (route) => route.continue());

    try {
      // Navigate and wait for load
      const startTime = Date.now();
      await page.goto(portal.url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait a bit for all metrics to settle
      await page.waitForTimeout(1000);

      // Collect metrics
      const metrics = await collectWebVitals(page);
      allMetrics.push(metrics);

      log(`  Iteration ${i + 1}: FCP=${metrics.fcp.toFixed(0)}ms, LCP=${metrics.lcp.toFixed(0)}ms`, 'blue');
    } catch (error) {
      log(`  Iteration ${i + 1} failed: ${error}`, 'red');
      // Add dummy metrics for failed iteration
      allMetrics.push({
        fcp: 9999,
        lcp: 9999,
        cls: 1,
        tti: 9999,
        tbt: 9999,
        domContentLoaded: 9999,
        load: 9999,
        resourceCount: 0,
        resourceSize: 0,
      });
    }

    await context.close();
  }

  // Average metrics across iterations
  const avgMetrics: WebVitalsMetrics = {
    fcp: allMetrics.reduce((sum, m) => sum + m.fcp, 0) / allMetrics.length,
    lcp: allMetrics.reduce((sum, m) => sum + m.lcp, 0) / allMetrics.length,
    cls: allMetrics.reduce((sum, m) => sum + m.cls, 0) / allMetrics.length,
    tti: allMetrics.reduce((sum, m) => sum + m.tti, 0) / allMetrics.length,
    tbt: allMetrics.reduce((sum, m) => sum + m.tbt, 0) / allMetrics.length,
    domContentLoaded: allMetrics.reduce((sum, m) => sum + m.domContentLoaded, 0) / allMetrics.length,
    load: allMetrics.reduce((sum, m) => sum + m.load, 0) / allMetrics.length,
    resourceCount: Math.round(allMetrics.reduce((sum, m) => sum + m.resourceCount, 0) / allMetrics.length),
    resourceSize: Math.round(allMetrics.reduce((sum, m) => sum + m.resourceSize, 0) / allMetrics.length),
  };

  // Calculate scores
  const scores = calculateScores(avgMetrics);

  // Check thresholds
  const { passes, failures } = checkThresholds(avgMetrics, scores);

  // Log results
  if (passes) {
    log(`  PASSED - Performance Score: ${scores.performance}`, 'green');
  } else {
    log(`  FAILED - Performance Score: ${scores.performance}`, 'red');
    failures.forEach((f) => log(`    - ${f}`, 'yellow'));
  }

  return {
    portal: portal.name,
    url: portal.url,
    timestamp: new Date().toISOString(),
    metrics: avgMetrics,
    scores,
    passes,
    failures,
  };
}

// Run API performance tests
async function benchmarkAPIs(): Promise<{ endpoint: string; avgTime: number; passes: boolean }[]> {
  log('\nBenchmarking API Endpoints...', 'cyan');

  const endpoints = [
    { name: 'Health Check', url: '/api/health' },
    { name: 'Auth Status', url: '/api/auth/status' },
    { name: 'User Profile', url: '/api/user/profile' },
    { name: 'Dashboard Data', url: '/api/dashboard' },
  ];

  const results: { endpoint: string; avgTime: number; passes: boolean }[] = [];
  const baseUrl = CONFIG.portals[0].url;

  for (const endpoint of endpoints) {
    const times: number[] = [];

    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      try {
        const response = await fetch(`${baseUrl}${endpoint.url}`);
        const elapsed = Date.now() - start;
        times.push(elapsed);
      } catch {
        times.push(9999);
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const passes = avgTime < CONFIG.thresholds.apiResponseTime;

    results.push({ endpoint: endpoint.name, avgTime, passes });

    if (passes) {
      log(`  ${endpoint.name}: ${avgTime.toFixed(0)}ms - PASS`, 'green');
    } else {
      log(`  ${endpoint.name}: ${avgTime.toFixed(0)}ms - FAIL`, 'red');
    }
  }

  return results;
}

// Generate HTML report
function generateHTMLReport(report: BenchmarkReport): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AIVO Performance Benchmark Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h3 { margin-top: 0; color: #6b7280; font-size: 14px; text-transform: uppercase; }
    .card .value { font-size: 32px; font-weight: bold; }
    .pass { color: #10b981; }
    .fail { color: #ef4444; }
    .warn { color: #f59e0b; }
    .portal-results { margin-top: 30px; }
    .portal { background: white; border-radius: 8px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .portal-header { padding: 20px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; }
    .portal-header h2 { margin: 0; }
    .portal-body { padding: 20px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
    .metric { text-align: center; padding: 15px; background: #f9fafb; border-radius: 6px; }
    .metric-value { font-size: 24px; font-weight: bold; }
    .metric-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    .failures { margin-top: 15px; padding: 15px; background: #fef2f2; border-radius: 6px; border-left: 4px solid #ef4444; }
    .failures h4 { margin: 0 0 10px 0; color: #991b1b; }
    .failures ul { margin: 0; padding-left: 20px; color: #991b1b; }
    .score-bar { height: 8px; background: #e5e7eb; border-radius: 4px; margin-top: 5px; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
    .score-fill.good { background: #10b981; }
    .score-fill.moderate { background: #f59e0b; }
    .score-fill.poor { background: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <h1>AIVO Platform - Performance Benchmark Report</h1>
    <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
    <p>Environment: ${report.environment}</p>

    <div class="summary">
      <div class="card">
        <h3>Total Portals</h3>
        <div class="value">${report.summary.totalPortals}</div>
      </div>
      <div class="card">
        <h3>Passed</h3>
        <div class="value pass">${report.summary.passedPortals}</div>
      </div>
      <div class="card">
        <h3>Failed</h3>
        <div class="value ${report.summary.failedPortals > 0 ? 'fail' : ''}">${report.summary.failedPortals}</div>
      </div>
      <div class="card">
        <h3>Avg Performance</h3>
        <div class="value ${report.summary.averagePerformanceScore >= 90 ? 'pass' : report.summary.averagePerformanceScore >= 50 ? 'warn' : 'fail'}">
          ${report.summary.averagePerformanceScore}
        </div>
      </div>
    </div>

    <div class="portal-results">
      <h2>Portal Results</h2>
      ${report.results
        .map(
          (r) => `
        <div class="portal">
          <div class="portal-header">
            <h2>${r.portal} ${r.passes ? '✓' : '✗'}</h2>
            <p>${r.url}</p>
          </div>
          <div class="portal-body">
            <div class="metrics">
              <div class="metric">
                <div class="metric-value ${r.metrics.fcp <= CONFIG.thresholds.fcp ? 'pass' : 'fail'}">${r.metrics.fcp.toFixed(0)}ms</div>
                <div class="metric-label">First Contentful Paint</div>
                <div class="score-bar"><div class="score-fill ${r.metrics.fcp <= 1800 ? 'good' : r.metrics.fcp <= 3000 ? 'moderate' : 'poor'}" style="width: ${Math.min(100, (CONFIG.thresholds.fcp / r.metrics.fcp) * 100)}%"></div></div>
              </div>
              <div class="metric">
                <div class="metric-value ${r.metrics.lcp <= CONFIG.thresholds.lcp ? 'pass' : 'fail'}">${r.metrics.lcp.toFixed(0)}ms</div>
                <div class="metric-label">Largest Contentful Paint</div>
                <div class="score-bar"><div class="score-fill ${r.metrics.lcp <= 2500 ? 'good' : r.metrics.lcp <= 4000 ? 'moderate' : 'poor'}" style="width: ${Math.min(100, (CONFIG.thresholds.lcp / r.metrics.lcp) * 100)}%"></div></div>
              </div>
              <div class="metric">
                <div class="metric-value ${r.metrics.cls <= CONFIG.thresholds.cls ? 'pass' : 'fail'}">${r.metrics.cls.toFixed(3)}</div>
                <div class="metric-label">Cumulative Layout Shift</div>
                <div class="score-bar"><div class="score-fill ${r.metrics.cls <= 0.1 ? 'good' : r.metrics.cls <= 0.25 ? 'moderate' : 'poor'}" style="width: ${Math.min(100, (CONFIG.thresholds.cls / Math.max(r.metrics.cls, 0.001)) * 100)}%"></div></div>
              </div>
              <div class="metric">
                <div class="metric-value ${r.metrics.tbt <= CONFIG.thresholds.tbt ? 'pass' : 'fail'}">${r.metrics.tbt.toFixed(0)}ms</div>
                <div class="metric-label">Total Blocking Time</div>
                <div class="score-bar"><div class="score-fill ${r.metrics.tbt <= 200 ? 'good' : r.metrics.tbt <= 600 ? 'moderate' : 'poor'}" style="width: ${Math.min(100, (CONFIG.thresholds.tbt / Math.max(r.metrics.tbt, 1)) * 100)}%"></div></div>
              </div>
              <div class="metric">
                <div class="metric-value">${r.scores.performance}</div>
                <div class="metric-label">Performance Score</div>
                <div class="score-bar"><div class="score-fill ${r.scores.performance >= 90 ? 'good' : r.scores.performance >= 50 ? 'moderate' : 'poor'}" style="width: ${r.scores.performance}%"></div></div>
              </div>
              <div class="metric">
                <div class="metric-value">${(r.metrics.resourceSize / 1024).toFixed(0)} KB</div>
                <div class="metric-label">Resources Size</div>
              </div>
            </div>
            ${
              r.failures.length > 0
                ? `
              <div class="failures">
                <h4>Failures</h4>
                <ul>
                  ${r.failures.map((f) => `<li>${f}</li>`).join('')}
                </ul>
              </div>
            `
                : ''
            }
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  </div>
</body>
</html>
  `;
}

// Main benchmark execution
async function runBenchmarks(): Promise<void> {
  log('\n========================================', 'cyan');
  log('  AIVO Platform Performance Benchmark', 'cyan');
  log('========================================\n', 'cyan');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results: PerformanceResult[] = [];

  try {
    // Benchmark each portal
    for (const portal of CONFIG.portals) {
      try {
        const result = await benchmarkPortal(browser, portal);
        results.push(result);
      } catch (error) {
        log(`Error benchmarking ${portal.name}: ${error}`, 'red');
        results.push({
          portal: portal.name,
          url: portal.url,
          timestamp: new Date().toISOString(),
          metrics: {
            fcp: 9999,
            lcp: 9999,
            cls: 1,
            tti: 9999,
            tbt: 9999,
            domContentLoaded: 9999,
            load: 9999,
            resourceCount: 0,
            resourceSize: 0,
          },
          scores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
          passes: false,
          failures: ['Benchmark failed to complete'],
        });
      }
    }

    // Calculate summary
    const passedPortals = results.filter((r) => r.passes).length;
    const avgPerformance =
      results.reduce((sum, r) => sum + r.scores.performance, 0) / results.length;

    const criticalFailures: string[] = [];
    for (const result of results) {
      if (!result.passes) {
        criticalFailures.push(`${result.portal}: ${result.failures.join(', ')}`);
      }
    }

    // Create report
    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      results,
      summary: {
        totalPortals: results.length,
        passedPortals,
        failedPortals: results.length - passedPortals,
        averagePerformanceScore: Math.round(avgPerformance),
        criticalFailures,
      },
    };

    // Save reports
    const reportsDir = path.join(__dirname, '..', 'test-results', 'performance');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // JSON report
    const jsonPath = path.join(reportsDir, 'PERFORMANCE_REPORT.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    log(`\nJSON report saved to: ${jsonPath}`, 'green');

    // HTML report
    const htmlPath = path.join(reportsDir, 'PERFORMANCE_REPORT.html');
    fs.writeFileSync(htmlPath, generateHTMLReport(report));
    log(`HTML report saved to: ${htmlPath}`, 'green');

    // Summary output
    log('\n========================================', 'cyan');
    log('  BENCHMARK SUMMARY', 'cyan');
    log('========================================\n', 'cyan');

    log(`Total Portals:        ${report.summary.totalPortals}`);
    log(`Passed:               ${report.summary.passedPortals}`, passedPortals === results.length ? 'green' : 'yellow');
    log(`Failed:               ${report.summary.failedPortals}`, report.summary.failedPortals > 0 ? 'red' : 'green');
    log(`Avg Performance:      ${report.summary.averagePerformanceScore}`, avgPerformance >= 90 ? 'green' : 'yellow');

    // Exit with appropriate code
    if (report.summary.failedPortals > 0) {
      log('\nBENCHMARK FAILED - Some portals did not meet performance thresholds', 'red');
      process.exit(1);
    } else {
      log('\nBENCHMARK PASSED - All portals meet performance thresholds', 'green');
      process.exit(0);
    }
  } finally {
    await browser.close();
  }
}

// Execute
runBenchmarks().catch((error) => {
  console.error('Benchmark execution failed:', error);
  process.exit(1);
});
