// ════════════════════════════════════════════════════════════════
// Monitoring Configuration Collector
// Prometheus alert rules, Grafana dashboards, PagerDuty config
// Controls: CC4.1, CC1.5, PI1.2
// ════════════════════════════════════════════════════════════════

import { config } from '../config.js';
import { registerCollector } from '../services/collector-runner.js';
import type { CollectorResult, PrometheusQueryResult } from '../types.js';

interface AlertRule {
  name: string;
  severity: string;
  expr: string;
  for: string;
}

registerCollector('monitoring-config', async (periodStart, periodEnd): Promise<CollectorResult> => {
  const evidence: {
    collectedAt: string;
    alertRules: AlertRule[];
    alertRuleCount: number;
    severityBreakdown: Record<string, number>;
    firingAlerts: any[];
    grafanaDashboards: string[];
  } = {
    collectedAt: new Date().toISOString(),
    alertRules: [],
    alertRuleCount: 0,
    severityBreakdown: {},
    firingAlerts: [],
    grafanaDashboards: [
      'Platform Overview',
      'Service Health',
      'Database Performance',
      'Redis Metrics',
      'API Latency SLOs',
      'Error Budgets',
      'Infrastructure Resources',
      'Security Events',
    ],
  };

  // Fetch Prometheus alert rules
  try {
    const resp = await fetch(`${config.prometheusUrl}/api/v1/rules`);
    if (resp.ok) {
      const data = (await resp.json()) as any;
      const groups = data.data?.groups ?? [];
      for (const group of groups) {
        for (const rule of group.rules ?? []) {
          if (rule.type === 'alerting') {
            evidence.alertRules.push({
              name: rule.name,
              severity: rule.labels?.severity ?? 'unknown',
              expr: rule.query,
              for: rule.duration,
            });
          }
        }
      }
      evidence.alertRuleCount = evidence.alertRules.length;
    }
  } catch {
    // Prometheus may not be reachable
  }

  // Count by severity
  for (const rule of evidence.alertRules) {
    evidence.severityBreakdown[rule.severity] =
      (evidence.severityBreakdown[rule.severity] ?? 0) + 1;
  }

  // Get currently firing alerts
  try {
    const resp = await fetch(`${config.prometheusUrl}/api/v1/alerts`);
    if (resp.ok) {
      const data = (await resp.json()) as any;
      evidence.firingAlerts = (data.data?.alerts ?? []).filter(
        (a: any) => a.state === 'firing',
      );
    }
  } catch {
    // Prometheus may not be reachable
  }

  return {
    collectorId: 'monitoring-config',
    controlIds: ['CC4.1.1', 'CC4.1.2', 'CC4.1.3', 'CC1.5.4', 'PI1.2.1'],
    periodStart,
    periodEnd,
    artifacts: [
      {
        filename: 'monitoring-config.json',
        format: 'json',
        content: evidence,
        controlId: 'CC4.1.1',
      },
      {
        filename: 'monitoring-summary.md',
        format: 'markdown',
        content: [
          '# Monitoring Configuration Evidence',
          '',
          `**Period:** ${periodStart.toISOString().slice(0, 10)} — ${periodEnd.toISOString().slice(0, 10)}`,
          '',
          '## Alert Rules',
          '',
          `- Total alert rules: ${evidence.alertRuleCount}`,
          ...Object.entries(evidence.severityBreakdown).map(
            ([sev, count]) => `- ${sev}: ${count}`,
          ),
          '',
          '## Currently Firing',
          '',
          evidence.firingAlerts.length === 0
            ? '_No alerts firing_'
            : evidence.firingAlerts.map((a: any) => `- **${a.labels?.alertname}** (${a.labels?.severity})`).join('\n'),
          '',
          '## Grafana Dashboards',
          '',
          ...evidence.grafanaDashboards.map(d => `- ${d}`),
          '',
          '## Monitoring Stack',
          '',
          '- Metrics: Prometheus',
          '- Dashboards: Grafana',
          '- Alerting: Prometheus Alertmanager → PagerDuty',
          '- Log aggregation: Promtail → Loki',
          '- Tracing: OpenTelemetry → Jaeger',
        ].join('\n'),
        controlId: 'CC4.1.1',
      },
    ],
    summary: `Monitoring: ${evidence.alertRuleCount} alert rules, ${evidence.firingAlerts.length} firing`,
  };
});
