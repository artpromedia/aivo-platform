import type { Result, NodeResult } from 'axe-core';
import { AxeTestResult } from './axe-runner';

export interface A11yViolationReport {
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary: string;
  }>;
}

export interface A11yReport {
  timestamp: string;
  url: string;
  passed: boolean;
  summary: {
    violations: number;
    passes: number;
    incomplete: number;
    inapplicable: number;
  };
  violations: A11yViolationReport[];
  wcagCompliance: {
    level: 'A' | 'AA' | 'AAA' | 'Non-compliant';
    failedCriteria: string[];
  };
}

/**
 * Generate a comprehensive accessibility report
 */
export function generateA11yReport(results: AxeTestResult): A11yReport {
  const violations = results.violations.map((v): A11yViolationReport => ({
    id: v.id,
    impact: v.impact || 'unknown',
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    tags: v.tags,
    nodes: v.nodes.map((node) => ({
      target: node.target as string[],
      html: node.html,
      failureSummary: node.failureSummary || '',
    })),
  }));

  // Determine WCAG compliance level
  const wcagTags = results.violations.flatMap((v) =>
    v.tags.filter((t) => t.startsWith('wcag'))
  );

  const failsA = wcagTags.some((t) => t === 'wcag2a' || t === 'wcag21a');
  const failsAA = wcagTags.some((t) => t === 'wcag2aa' || t === 'wcag21aa');
  const failsAAA = wcagTags.some((t) => t === 'wcag2aaa' || t === 'wcag21aaa');

  let level: 'A' | 'AA' | 'AAA' | 'Non-compliant' = 'AAA';
  if (failsA) {
    level = 'Non-compliant';
  } else if (failsAA) {
    level = 'A';
  } else if (failsAAA) {
    level = 'AA';
  }

  // Extract failed WCAG criteria
  const failedCriteria = Array.from(
    new Set(
      results.violations.flatMap((v) =>
        v.tags.filter((t) => /^wcag\d+/.test(t) || t.includes('SC'))
      )
    )
  );

  return {
    timestamp: results.timestamp,
    url: results.url,
    passed: results.violations.length === 0,
    summary: {
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
    },
    violations,
    wcagCompliance: {
      level,
      failedCriteria,
    },
  };
}

/**
 * Format report as HTML
 */
export function formatReportAsHtml(report: A11yReport): string {
  const violationRows = report.violations
    .map(
      (v) => `
    <tr>
      <td><span class="impact impact-${v.impact}">${v.impact}</span></td>
      <td><strong>${v.id}</strong></td>
      <td>${v.description}</td>
      <td>${v.nodes.length}</td>
      <td><a href="${v.helpUrl}" target="_blank">Learn more</a></td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 2rem; }
    h1 { color: #333; }
    .summary { display: flex; gap: 2rem; margin: 1rem 0; }
    .stat { padding: 1rem; border-radius: 8px; text-align: center; }
    .stat.violations { background: #fee; color: #c00; }
    .stat.passes { background: #efe; color: #060; }
    .stat.incomplete { background: #ffe; color: #660; }
    .stat-number { font-size: 2rem; font-weight: bold; }
    .stat-label { font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 2rem; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .impact { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; text-transform: uppercase; }
    .impact-critical { background: #c00; color: white; }
    .impact-serious { background: #e60; color: white; }
    .impact-moderate { background: #fc0; color: #333; }
    .impact-minor { background: #9cf; color: #333; }
    .compliance { margin: 1rem 0; padding: 1rem; background: #f5f5f5; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>Accessibility Report</h1>
  <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
  <p>URL: ${report.url}</p>

  <div class="compliance">
    <strong>WCAG Compliance Level:</strong> ${report.wcagCompliance.level}
    ${report.wcagCompliance.failedCriteria.length > 0 ? `<br>Failed Criteria: ${report.wcagCompliance.failedCriteria.join(', ')}` : ''}
  </div>

  <div class="summary">
    <div class="stat violations">
      <div class="stat-number">${report.summary.violations}</div>
      <div class="stat-label">Violations</div>
    </div>
    <div class="stat passes">
      <div class="stat-number">${report.summary.passes}</div>
      <div class="stat-label">Passes</div>
    </div>
    <div class="stat incomplete">
      <div class="stat-number">${report.summary.incomplete}</div>
      <div class="stat-label">Incomplete</div>
    </div>
  </div>

  ${
    report.violations.length > 0
      ? `
  <h2>Violations</h2>
  <table>
    <thead>
      <tr>
        <th>Impact</th>
        <th>Rule</th>
        <th>Description</th>
        <th>Elements</th>
        <th>Help</th>
      </tr>
    </thead>
    <tbody>
      ${violationRows}
    </tbody>
  </table>
  `
      : '<p>No violations found! ✓</p>'
  }
</body>
</html>
  `;
}

/**
 * Format report as Markdown
 */
export function formatReportAsMarkdown(report: A11yReport): string {
  const violationList = report.violations
    .map(
      (v) => `
### ${v.id} (${v.impact})

${v.description}

**Affected elements:** ${v.nodes.length}

${v.nodes
  .slice(0, 5)
  .map((n) => `- \`${n.target.join(' ')}\``)
  .join('\n')}
${v.nodes.length > 5 ? `\n... and ${v.nodes.length - 5} more` : ''}

[Learn more](${v.helpUrl})
`
    )
    .join('\n---\n');

  return `
# Accessibility Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}
**URL:** ${report.url}
**WCAG Compliance:** ${report.wcagCompliance.level}

## Summary

| Metric | Count |
|--------|-------|
| Violations | ${report.summary.violations} |
| Passes | ${report.summary.passes} |
| Incomplete | ${report.summary.incomplete} |
| Inapplicable | ${report.summary.inapplicable} |

${
  report.violations.length > 0
    ? `
## Violations

${violationList}
`
    : '## ✓ No violations found!'
}
  `.trim();
}

/**
 * Format report as JSON
 */
export function formatReportAsJson(report: A11yReport): string {
  return JSON.stringify(report, null, 2);
}
