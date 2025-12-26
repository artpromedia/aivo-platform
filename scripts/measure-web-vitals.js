/**
 * Web Vitals Measurement Script
 *
 * Usage: node scripts/measure-web-vitals.js <url>
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function measureWebVitals(url) {
  console.log(`\n🔬 Measuring Web Vitals for: ${url}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const metrics = {
    url,
    timestamp: new Date().toISOString(),
    vitals: {},
    timing: {},
    resources: [],
  };

  // Inject web vitals measurement script
  await page.addInitScript(() => {
    window.__webVitals = {};

    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcp = entries[entries.length - 1];
      window.__webVitals.lcp = lcp.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // FCP
    new PerformanceObserver((list) => {
      const fcp = list.getEntries().find((e) => e.name === 'first-contentful-paint');
      if (fcp) window.__webVitals.fcp = fcp.startTime;
    }).observe({ type: 'paint', buffered: true });

    // CLS
    let cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
      window.__webVitals.cls = cls;
    }).observe({ type: 'layout-shift', buffered: true });

    // FID (simulated via first input)
    new PerformanceObserver((list) => {
      const entry = list.getEntries()[0];
      if (entry) {
        window.__webVitals.fid = entry.processingStart - entry.startTime;
      }
    }).observe({ type: 'first-input', buffered: true });
  });

  // Navigate and wait for load
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait a bit for all metrics to be collected
  await page.waitForTimeout(3000);

  // Collect web vitals
  const webVitals = await page.evaluate(() => window.__webVitals);
  metrics.vitals = webVitals;

  // Collect navigation timing
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      dns: nav.domainLookupEnd - nav.domainLookupStart,
      tcp: nav.connectEnd - nav.connectStart,
      ttfb: nav.responseStart - nav.requestStart,
      download: nav.responseEnd - nav.responseStart,
      domInteractive: nav.domInteractive,
      domComplete: nav.domComplete,
      load: nav.loadEventEnd,
    };
  });
  metrics.timing = timing;

  // Collect resource timing
  const resources = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map((r) => ({
      name: r.name.split('/').pop(),
      type: r.initiatorType,
      size: r.transferSize,
      duration: r.duration,
    }));
  });
  metrics.resources = resources.slice(0, 50); // Top 50 resources

  await browser.close();

  return metrics;
}

function rateMetric(name, value) {
  const thresholds = {
    lcp: { good: 2500, poor: 4000 },
    fcp: { good: 1800, poor: 3000 },
    cls: { good: 0.1, poor: 0.25 },
    fid: { good: 100, poor: 300 },
    ttfb: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[name];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function formatReport(metrics) {
  const lines = [
    '',
    '╔══════════════════════════════════════════════════════════════╗',
    '║                    WEB VITALS REPORT                          ║',
    '╠══════════════════════════════════════════════════════════════╣',
    '',
    '  Core Web Vitals:',
    '',
  ];

  const vitals = [
    { name: 'LCP', key: 'lcp', unit: 'ms', target: '≤2500ms' },
    { name: 'FCP', key: 'fcp', unit: 'ms', target: '≤1800ms' },
    { name: 'CLS', key: 'cls', unit: '', target: '≤0.1' },
    { name: 'FID', key: 'fid', unit: 'ms', target: '≤100ms' },
  ];

  for (const vital of vitals) {
    const value = metrics.vitals[vital.key];
    if (value !== undefined) {
      const rating = rateMetric(vital.key, value);
      const icon = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️ ' : '❌';
      const displayValue = vital.key === 'cls' ? value.toFixed(3) : Math.round(value);
      lines.push(`    ${icon} ${vital.name}: ${displayValue}${vital.unit} (target: ${vital.target})`);
    }
  }

  lines.push('');
  lines.push('  Navigation Timing:');
  lines.push('');
  lines.push(`    DNS Lookup: ${Math.round(metrics.timing.dns)}ms`);
  lines.push(`    TCP Connect: ${Math.round(metrics.timing.tcp)}ms`);
  lines.push(`    TTFB: ${Math.round(metrics.timing.ttfb)}ms`);
  lines.push(`    Download: ${Math.round(metrics.timing.download)}ms`);
  lines.push(`    DOM Interactive: ${Math.round(metrics.timing.domInteractive)}ms`);
  lines.push(`    DOM Complete: ${Math.round(metrics.timing.domComplete)}ms`);
  lines.push(`    Load Event: ${Math.round(metrics.timing.load)}ms`);

  lines.push('');
  lines.push('  Largest Resources:');
  lines.push('');

  const topResources = metrics.resources
    .sort((a, b) => b.size - a.size)
    .slice(0, 5);

  for (const res of topResources) {
    const size = (res.size / 1024).toFixed(1);
    lines.push(`    - ${res.name}: ${size}KB (${Math.round(res.duration)}ms)`);
  }

  lines.push('');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');

  return lines.join('\n');
}

async function main() {
  const url = process.argv[2] || 'http://localhost:4173';

  try {
    const metrics = await measureWebVitals(url);

    // Print report
    console.log(formatReport(metrics));

    // Save JSON report
    const reportPath = 'tests/performance/web-vitals-report.json';
    fs.mkdirSync('tests/performance', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);

    // Check if vitals pass
    const lcp = metrics.vitals.lcp || 0;
    const cls = metrics.vitals.cls || 0;

    if (lcp > 2500 || cls > 0.1) {
      console.log('\n❌ Web Vitals check FAILED\n');
      process.exit(1);
    }

    console.log('\n✅ Web Vitals check PASSED\n');
  } catch (error) {
    console.error('Error measuring web vitals:', error);
    process.exit(1);
  }
}

main();
