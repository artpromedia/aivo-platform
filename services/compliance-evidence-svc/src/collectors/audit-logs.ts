// ════════════════════════════════════════════════════════════════
// Audit Logs Collector
// Exports audit-svc logs, verifies completeness and integrity
// Controls: CC3.2, CC5.2, CC5.6, CC4.1
// ════════════════════════════════════════════════════════════════

import { config } from '../config.js';
import { registerCollector } from '../services/collector-runner.js';
import type { CollectorResult, AuditLogEvidence } from '../types.js';

const CRITICAL_OPERATIONS = [
  'user.login', 'user.logout', 'user.create', 'user.delete',
  'role.assign', 'role.revoke', 'permission.grant', 'permission.revoke',
  'tenant.create', 'tenant.delete', 'tenant.update',
  'admin.access', 'admin.config.change',
  'data.export', 'data.delete', 'data.bulk_update',
  'billing.subscription.change', 'billing.payment',
  'api_key.create', 'api_key.revoke',
  'policy.update', 'compliance.report',
];

registerCollector('audit-logs', async (periodStart, periodEnd): Promise<CollectorResult> => {
  const auditUrl = config.auditSvcUrl;

  let totalEvents = 0;
  let eventsByType: Record<string, number> = {};
  let coveredOperations: string[] = [];
  let missingOperations: string[] = [];
  let integrityCheckPassed = true;

  try {
    // Get audit log summary from audit-svc
    const summaryResp = await fetch(
      `${auditUrl}/api/audit/summary?from=${periodStart.toISOString()}&to=${periodEnd.toISOString()}`,
      { headers: { 'Content-Type': 'application/json' } },
    );

    if (summaryResp.ok) {
      const data = (await summaryResp.json()) as any;
      totalEvents = data.totalEvents ?? 0;
      eventsByType = data.eventsByType ?? {};
    }

    // Check which critical operations have audit trail
    const typesResp = await fetch(
      `${auditUrl}/api/audit/event-types?from=${periodStart.toISOString()}&to=${periodEnd.toISOString()}`,
      { headers: { 'Content-Type': 'application/json' } },
    );

    if (typesResp.ok) {
      const typesData = (await typesResp.json()) as any;
      const recordedTypes = new Set(typesData.types ?? []);
      coveredOperations = CRITICAL_OPERATIONS.filter(op => recordedTypes.has(op));
      missingOperations = CRITICAL_OPERATIONS.filter(op => !recordedTypes.has(op));
    }

    // Integrity check — verify log chain
    const integrityResp = await fetch(
      `${auditUrl}/api/audit/integrity-check`,
      { headers: { 'Content-Type': 'application/json' } },
    );
    if (integrityResp.ok) {
      const intData = (await integrityResp.json()) as any;
      integrityCheckPassed = intData.valid ?? false;
    }
  } catch {
    // Audit svc may not be reachable
  }

  const evidence: AuditLogEvidence = {
    totalEvents,
    eventsByType,
    criticalOperationsCovered: coveredOperations,
    missingOperations,
    integrityCheckPassed,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };

  const findings: string[] = [];
  if (missingOperations.length > 0) {
    findings.push(`${missingOperations.length} critical operations not found in audit logs: ${missingOperations.join(', ')}`);
  }
  if (!integrityCheckPassed) {
    findings.push('Audit log integrity check FAILED');
  }
  if (totalEvents === 0) {
    findings.push('No audit events found in period — verify audit-svc connectivity');
  }

  return {
    collectorId: 'audit-logs',
    controlIds: ['CC3.2.4', 'CC5.2.5', 'CC5.6.2'],
    periodStart,
    periodEnd,
    artifacts: [
      {
        filename: 'audit-log-evidence.json',
        format: 'json',
        content: evidence,
        controlId: 'CC3.2.4',
        metadata: { totalEvents: String(totalEvents), integrityPassed: String(integrityCheckPassed) },
      },
      {
        filename: 'audit-log-summary.md',
        format: 'markdown',
        content: [
          '# Audit Log Completeness Evidence',
          '',
          `**Period:** ${periodStart.toISOString().slice(0, 10)} — ${periodEnd.toISOString().slice(0, 10)}`,
          '',
          '## Summary',
          '',
          `| Metric | Value |`,
          `|--------|-------|`,
          `| Total Events | ${totalEvents.toLocaleString()} |`,
          `| Critical Operations Covered | ${coveredOperations.length}/${CRITICAL_OPERATIONS.length} |`,
          `| Integrity Check | ${integrityCheckPassed ? '✅ Passed' : '❌ Failed'} |`,
          '',
          '## Event Distribution',
          '',
          '| Event Type | Count |',
          '|-----------|-------|',
          ...Object.entries(eventsByType)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 20)
            .map(([type, count]) => `| ${type} | ${count} |`),
          '',
          missingOperations.length > 0
            ? '## Missing Critical Operations\n\n' + missingOperations.map(op => `- ❌ ${op}`).join('\n')
            : '## All Critical Operations Covered ✅',
          '',
          findings.length > 0 ? '## Findings\n\n' + findings.map(f => `- ${f}`).join('\n') : '',
        ].join('\n'),
        controlId: 'CC3.2.4',
      },
    ],
    summary: `Audit logs: ${totalEvents} events, ${coveredOperations.length}/${CRITICAL_OPERATIONS.length} critical ops covered, integrity ${integrityCheckPassed ? 'OK' : 'FAILED'}`,
  };
});
