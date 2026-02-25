// ════════════════════════════════════════════════════════════════
// Uptime & SLO Collector
// Queries Prometheus for availability metrics per service
// Controls: A1.1-A1.6
// ════════════════════════════════════════════════════════════════

import { config } from '../config.js';
import { registerCollector } from '../services/collector-runner.js';
import type { CollectorResult, UptimeEvidence } from '../types.js';

const SLO_TARGET = 99.9;

const SERVICES = [
  'auth-svc', 'tenant-svc', 'user-svc', 'billing-svc', 'notification-svc',
  'content-svc', 'lesson-svc', 'assessment-svc', 'analytics-svc', 'ai-orchestrator',
  'compliance-svc', 'audit-svc', 'file-svc', 'messaging-svc', 'marketplace-svc',
];

registerCollector('uptime', async (periodStart, periodEnd): Promise<CollectorResult> => {
  const promUrl = config.prometheusUrl;
  const durationDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86_400_000);
  const range = `${durationDays}d`;

  const serviceUptimes: Array<{
    service: string;
    uptime: number;
    totalRequests: number;
    errorRequests: number;
    sloMet: boolean;
  }> = [];

  for (const svc of SERVICES) {
    try {
      // Success rate query
      const query = encodeURIComponent(
        `(1 - (sum(rate(http_requests_total{service="${svc}",status_code=~"5.."}[${range}])) / sum(rate(http_requests_total{service="${svc}"}[${range}])))) * 100`
      );
      const resp = await fetch(`${promUrl}/api/v1/query?query=${query}`);
      const data = (await resp.json()) as any;
      const uptime = Number(data.data?.result?.[0]?.value?.[1] ?? 0);

      // Total requests
      const totalQuery = encodeURIComponent(`sum(increase(http_requests_total{service="${svc}"}[${range}]))`);
      const totalResp = await fetch(`${promUrl}/api/v1/query?query=${totalQuery}`);
      const totalData = (await totalResp.json()) as any;
      const totalRequests = Math.round(Number(totalData.data?.result?.[0]?.value?.[1] ?? 0));

      const errorQuery = encodeURIComponent(`sum(increase(http_requests_total{service="${svc}",status_code=~"5.."}[${range}]))`);
      const errorResp = await fetch(`${promUrl}/api/v1/query?query=${errorQuery}`);
      const errorData = (await errorResp.json()) as any;
      const errorRequests = Math.round(Number(errorData.data?.result?.[0]?.value?.[1] ?? 0));

      serviceUptimes.push({
        service: svc,
        uptime: Math.round(uptime * 1000) / 1000,
        totalRequests,
        errorRequests,
        sloMet: uptime >= SLO_TARGET,
      });
    } catch {
      serviceUptimes.push({
        service: svc,
        uptime: 0,
        totalRequests: 0,
        errorRequests: 0,
        sloMet: false,
      });
    }
  }

  const overallUptime = serviceUptimes.length > 0
    ? Math.round(
        (serviceUptimes.reduce((s, u) => s + u.uptime, 0) / serviceUptimes.length) * 1000,
      ) / 1000
    : 0;

  const evidence: UptimeEvidence = {
    overallUptime,
    sloTarget: SLO_TARGET,
    sloMet: overallUptime >= SLO_TARGET,
    serviceUptimes,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };

  const failing = serviceUptimes.filter(s => !s.sloMet && s.totalRequests > 0);
  const findings: string[] = [];
  if (failing.length > 0) {
    findings.push(`${failing.length} services below ${SLO_TARGET}% SLO: ${failing.map(s => s.service).join(', ')}`);
  }

  return {
    collectorId: 'uptime',
    controlIds: ['A1.1', 'A1.2', 'A1.5'],
    periodStart,
    periodEnd,
    artifacts: [
      {
        filename: 'uptime-metrics.json',
        format: 'json',
        content: { evidence, findings },
        controlId: 'A1.1',
        metadata: { overallUptime: String(overallUptime), sloMet: String(evidence.sloMet) },
      },
      {
        filename: 'uptime-summary.md',
        format: 'markdown',
        content: [
          '# Uptime & SLO Evidence',
          '',
          `**Period:** ${periodStart.toISOString().slice(0, 10)} — ${periodEnd.toISOString().slice(0, 10)}`,
          `**SLO Target:** ${SLO_TARGET}%`,
          `**Overall Uptime:** ${overallUptime}%`,
          `**SLO Met:** ${evidence.sloMet ? '✅' : '❌'}`,
          '',
          '## Service Uptime',
          '',
          '| Service | Uptime | Requests | Errors | SLO |',
          '|---------|--------|----------|--------|-----|',
          ...serviceUptimes.map(s =>
            `| ${s.service} | ${s.uptime}% | ${s.totalRequests} | ${s.errorRequests} | ${s.sloMet ? '✅' : '❌'} |`,
          ),
          '',
          findings.length > 0 ? '## Findings\n\n' + findings.map(f => `- ${f}`).join('\n') : '',
        ].join('\n'),
        controlId: 'A1.1',
      },
    ],
    summary: `Uptime: ${overallUptime}% overall, SLO ${evidence.sloMet ? 'met' : 'MISSED'}`,
  };
});
