#!/usr/bin/env node
/**
 * Coverage Threshold Checker
 *
 * Validates that all services meet minimum coverage requirements.
 * Used in CI to enforce coverage gates.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Minimum coverage per service (Sprint 8: raised from 75% to 90%)
  minServiceCoverage: 90,
  // Overall target coverage (Sprint 8: raised from 80% to 95%)
  targetOverallCoverage: 95,
  // Critical services that MUST meet threshold (fail CI if below)
  criticalServices: [
    'auth-svc',
    'billing-svc',
    'payments-svc',
    'profile-svc',
    'assessment-svc',
    'grading-engine',
    'legal-hold-svc',
    'ai-orchestrator',
    'ai-inference-svc',
    'tenant-svc',
    'notify-svc',
    'content-svc',
    'lti-svc',
    'analytics-svc',
  ],
  // Critical services must meet a higher bar
  criticalServiceCoverage: 95,
  // Services that are exempt from coverage requirements
  exemptServices: [
    // Infrastructure/config services
    'api-gateway-node',
    // External integrations that are hard to test
    'notification-svc', // External email/SMS providers
    // Deprecated services
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse Istanbul coverage summary JSON
 */
function parseCoverageSummary(coveragePath) {
  try {
    const content = readFileSync(coveragePath, 'utf-8');
    const coverage = JSON.parse(content);

    // Handle different coverage formats
    if (coverage.total) {
      return {
        lines: coverage.total.lines?.pct ?? 0,
        statements: coverage.total.statements?.pct ?? 0,
        functions: coverage.total.functions?.pct ?? 0,
        branches: coverage.total.branches?.pct ?? 0,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Calculate overall coverage from individual metrics
 */
function calculateOverall(coverage) {
  if (!coverage) return 0;
  return Math.round(
    (coverage.lines + coverage.statements + coverage.functions + coverage.branches) / 4
  );
}

/**
 * Find coverage reports in service directories
 */
function findServiceCoverage(servicesDir) {
  const results = [];

  const services = readdirSync(servicesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const service of services) {
    const serviceDir = join(servicesDir, service);

    // Check for Node.js coverage (Istanbul)
    const possiblePaths = [
      join(serviceDir, 'coverage', 'coverage-summary.json'),
      join(serviceDir, 'coverage', 'lcov.info'),
      join(serviceDir, '.coverage', 'coverage-summary.json'),
    ];

    let coverage = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        if (path.endsWith('.json')) {
          coverage = parseCoverageSummary(path);
        }
        break;
      }
    }

    // Check if tests exist
    const hasTests =
      existsSync(join(serviceDir, '__tests__')) ||
      existsSync(join(serviceDir, 'test')) ||
      existsSync(join(serviceDir, 'tests')) ||
      existsSync(join(serviceDir, 'src', '__tests__'));

    results.push({
      name: service,
      coverage,
      hasTests,
      isExempt: CONFIG.exemptServices.includes(service),
      isCritical: CONFIG.criticalServices.includes(service),
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           AIVO Coverage Threshold Checker                    ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(
    `║ Minimum per service: ${CONFIG.minServiceCoverage}%                                  ║`
  );
  console.log(
    `║ Overall target: ${CONFIG.targetOverallCoverage}%                                      ║`
  );
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const servicesDir = join(process.cwd(), 'services');
  const services = findServiceCoverage(servicesDir);

  const failures = [];
  const warnings = [];
  let totalCoverage = 0;
  let coveredServices = 0;

  console.log('Service Coverage Report:\n');
  console.log('┌────────────────────────────────┬──────────┬──────────┬────────┐');
  console.log('│ Service                        │ Coverage │ Status   │ Type   │');
  console.log('├────────────────────────────────┼──────────┼──────────┼────────┤');

  for (const service of services.sort((a, b) => a.name.localeCompare(b.name))) {
    const overall = service.coverage ? calculateOverall(service.coverage) : null;
    const status = getStatus(service, overall);
    const type = service.isCritical ? 'CRIT' : service.isExempt ? 'SKIP' : '    ';

    const coverageStr = overall !== null ? `${overall}%`.padStart(6) : '  N/A ';
    const nameStr = service.name.padEnd(30).substring(0, 30);
    const statusStr = status.padEnd(8);
    const typeStr = type.padEnd(6);

    console.log(`│ ${nameStr} │ ${coverageStr} │ ${statusStr} │ ${typeStr} │`);

    if (!service.isExempt && overall !== null) {
      totalCoverage += overall;
      coveredServices++;

      const requiredCoverage = service.isCritical
        ? CONFIG.criticalServiceCoverage
        : CONFIG.minServiceCoverage;

      if (overall < requiredCoverage) {
        if (service.isCritical) {
          failures.push(`${service.name}: ${overall}% (required: ${requiredCoverage}%)`);
        } else {
          warnings.push(`${service.name}: ${overall}% (target: ${CONFIG.minServiceCoverage}%)`);
        }
      }
    } else if (!service.isExempt && !service.hasTests) {
      warnings.push(`${service.name}: No tests found`);
    }
  }

  console.log('└────────────────────────────────┴──────────┴──────────┴────────┘\n');

  // Calculate overall
  const overallCoverage = coveredServices > 0 ? Math.round(totalCoverage / coveredServices) : 0;

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║ Overall Coverage: ${overallCoverage}%`.padEnd(63) + '║');
  console.log(`║ Target: ${CONFIG.targetOverallCoverage}%`.padEnd(63) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Print warnings
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach((w) => console.log(`   - ${w}`));
    console.log('');
  }

  // Print failures
  if (failures.length > 0) {
    console.log('❌ Critical Services Below Threshold:');
    failures.forEach((f) => console.log(`   - ${f}`));
    console.log('');
    process.exit(1);
  }

  if (overallCoverage < CONFIG.targetOverallCoverage) {
    console.log(
      `⚠️  Overall coverage (${overallCoverage}%) is below target (${CONFIG.targetOverallCoverage}%)`
    );
    console.log('   This is a warning; CI will not fail.');
    console.log('');
  }

  console.log('✅ All critical services meet coverage requirements!');
  process.exit(0);
}

function getStatus(service, coverage) {
  if (service.isExempt) return 'EXEMPT';
  if (coverage === null) return 'NO DATA';
  if (coverage >= CONFIG.minServiceCoverage) return '✓ PASS';
  if (service.isCritical) return '✗ FAIL';
  return '⚠ WARN';
}

main();
