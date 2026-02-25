// ════════════════════════════════════════════════════════════════
// Incident History Collector
// Incident tickets, post-mortems, MTTR, response times
// Controls: CC7.2, CC1.5, CC2.2, CC4.2, A1.6
// ════════════════════════════════════════════════════════════════

import { config } from '../config.js';
import { registerCollector } from '../services/collector-runner.js';
import type { CollectorResult } from '../types.js';

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  detectedAt: string;
  resolvedAt: string | null;
  rootCause: string | null;
  postMortemUrl: string | null;
}

registerCollector('incident-history', async (periodStart, periodEnd): Promise<CollectorResult> => {
  const evidence: {
    collectedAt: string;
    incidents: Incident[];
    totalIncidents: number;
    bySeverity: Record<string, number>;
    avgMttrMinutes: number | null;
    postMortemRate: number;
    slaCompliance: { target: string; met: number; total: number; rate: number };
  } = {
    collectedAt: new Date().toISOString(),
    incidents: [],
    totalIncidents: 0,
    bySeverity: {},
    avgMttrMinutes: null,
    postMortemRate: 0,
    slaCompliance: { target: 'P1 < 30min acknowledge, P2 < 1hr acknowledge', met: 0, total: 0, rate: 0 },
  };

  // Query audit-svc for incident events
  try {
    const params = new URLSearchParams({
      from: periodStart.toISOString(),
      to: periodEnd.toISOString(),
      eventType: 'incident',
    });
    const resp = await fetch(`${config.auditSvcUrl}/api/audit/events?${params}`);
    if (resp.ok) {
      const data = (await resp.json()) as any;
      evidence.incidents = (data.events ?? []).map((e: any) => ({
        id: e.id,
        title: e.metadata?.title ?? e.action ?? 'Unknown',
        severity: e.metadata?.severity ?? 'unknown',
        status: e.metadata?.status ?? 'unknown',
        detectedAt: e.createdAt,
        resolvedAt: e.metadata?.resolvedAt ?? null,
        rootCause: e.metadata?.rootCause ?? null,
        postMortemUrl: e.metadata?.postMortemUrl ?? null,
      }));
    }
  } catch {
    // audit-svc may not be reachable
  }

  evidence.totalIncidents = evidence.incidents.length;

  // Severity breakdown
  for (const inc of evidence.incidents) {
    evidence.bySeverity[inc.severity] = (evidence.bySeverity[inc.severity] ?? 0) + 1;
  }

  // Calculate MTTR for resolved incidents
  const resolved = evidence.incidents.filter(i => i.resolvedAt);
  if (resolved.length > 0) {
    const totalMinutes = resolved.reduce((sum, i) => {
      const detected = new Date(i.detectedAt).getTime();
      const resolvedAt = new Date(i.resolvedAt!).getTime();
      return sum + (resolvedAt - detected) / 60000;
    }, 0);
    evidence.avgMttrMinutes = Math.round(totalMinutes / resolved.length);
  }

  // Post-mortem completion rate
  const withPostMortem = evidence.incidents.filter(i => i.postMortemUrl);
  evidence.postMortemRate =
    evidence.totalIncidents > 0
      ? Math.round((withPostMortem.length / evidence.totalIncidents) * 100)
      : 100;

  return {
    collectorId: 'incident-history',
    controlIds: ['CC7.2.1', 'CC7.2.2', 'CC7.2.3', 'CC1.5.3', 'CC2.2.2', 'CC4.2.1', 'A1.6.1'],
    periodStart,
    periodEnd,
    artifacts: [
      {
        filename: 'incident-history.json',
        format: 'json',
        content: evidence,
        controlId: 'CC7.2.1',
      },
      {
        filename: 'incident-summary.md',
        format: 'markdown',
        content: [
          '# Incident History Evidence',
          '',
          `**Period:** ${periodStart.toISOString().slice(0, 10)} — ${periodEnd.toISOString().slice(0, 10)}`,
          '',
          '## Summary',
          '',
          `- Total incidents: ${evidence.totalIncidents}`,
          ...Object.entries(evidence.bySeverity).map(([sev, count]) => `- ${sev}: ${count}`),
          `- Average MTTR: ${evidence.avgMttrMinutes != null ? `${evidence.avgMttrMinutes} minutes` : 'N/A'}`,
          `- Post-mortem completion: ${evidence.postMortemRate}%`,
          '',
          '## Incident Log',
          '',
          evidence.incidents.length === 0
            ? '_No incidents recorded in this period_'
            : [
                '| ID | Title | Severity | Status | Detected | Resolved | Post-Mortem |',
                '|----|-------|----------|--------|----------|----------|-------------|',
                ...evidence.incidents.map(
                  i =>
                    `| ${i.id.slice(0, 8)} | ${i.title} | ${i.severity} | ${i.status} | ${i.detectedAt.slice(0, 16)} | ${i.resolvedAt?.slice(0, 16) ?? '-'} | ${i.postMortemUrl ? '✅' : '❌'} |`,
                ),
              ].join('\n'),
          '',
          '## Response SLA',
          '',
          `- Target: ${evidence.slaCompliance.target}`,
        ].join('\n'),
        controlId: 'CC7.2.1',
      },
    ],
    summary: `Incidents: ${evidence.totalIncidents} total, MTTR ${evidence.avgMttrMinutes ?? 'N/A'} min, ${evidence.postMortemRate}% post-mortems`,
  };
});
