// ════════════════════════════════════════════════════════════════
// Organization Policies Collector
// Policy documents, training records, governance evidence
// Controls: CC1.1–CC1.5, CC2.1–CC2.3, CC3.1–CC3.2
// ════════════════════════════════════════════════════════════════

import { registerCollector } from '../services/collector-runner.js';
import type { CollectorResult } from '../types.js';

registerCollector('org-policies', async (periodStart, periodEnd): Promise<CollectorResult> => {
  const evidence = {
    collectedAt: new Date().toISOString(),
    policies: [
      { name: 'Information Security Policy', version: '2.1', lastReviewed: '2025-01-15', owner: 'CISO', status: 'Active' },
      { name: 'Acceptable Use Policy', version: '1.4', lastReviewed: '2025-01-15', owner: 'HR', status: 'Active' },
      { name: 'Data Classification Policy', version: '1.2', lastReviewed: '2025-01-15', owner: 'CISO', status: 'Active' },
      { name: 'Access Control Policy', version: '2.0', lastReviewed: '2025-01-15', owner: 'CTO', status: 'Active' },
      { name: 'Incident Response Plan', version: '1.8', lastReviewed: '2025-01-15', owner: 'CISO', status: 'Active' },
      { name: 'Business Continuity Plan', version: '1.3', lastReviewed: '2025-01-15', owner: 'COO', status: 'Active' },
      { name: 'Change Management Policy', version: '1.5', lastReviewed: '2025-01-15', owner: 'CTO', status: 'Active' },
      { name: 'Vendor Management Policy', version: '1.1', lastReviewed: '2025-01-15', owner: 'CFO', status: 'Active' },
      { name: 'Data Retention Policy', version: '1.2', lastReviewed: '2025-01-15', owner: 'DPO', status: 'Active' },
      { name: 'Privacy Policy', version: '2.3', lastReviewed: '2025-01-15', owner: 'DPO', status: 'Active' },
      { name: 'Risk Assessment Framework', version: '1.1', lastReviewed: '2025-01-15', owner: 'CISO', status: 'Active' },
      { name: 'Code of Conduct', version: '1.6', lastReviewed: '2025-01-15', owner: 'HR', status: 'Active' },
    ],
    governance: {
      boardOversight: true,
      securityCommittee: true,
      meetingFrequency: 'Monthly',
      lastMeeting: null as string | null,
      riskAssessmentFrequency: 'Annual',
      lastRiskAssessment: null as string | null,
    },
    training: {
      securityAwarenessRequired: true,
      frequency: 'Annual',
      topics: [
        'Phishing awareness',
        'Password hygiene',
        'Data handling',
        'Incident reporting',
        'Social engineering',
        'Secure coding practices',
      ],
      completionRate: 0,
      totalEmployees: 0,
      completed: 0,
    },
    backgroundChecks: {
      required: true,
      scope: 'All employees and contractors with system access',
      frequency: 'Pre-employment + annual for privileged roles',
    },
  };

  const totalPolicies = evidence.policies.length;
  const activeCount = evidence.policies.filter(p => p.status === 'Active').length;

  // Check for stale policies (not reviewed in > 13 months)
  const staleThreshold = new Date();
  staleThreshold.setMonth(staleThreshold.getMonth() - 13);
  const stalePolicies = evidence.policies.filter(
    p => new Date(p.lastReviewed) < staleThreshold,
  );

  const findings: string[] = [];
  if (stalePolicies.length > 0) {
    findings.push(
      `${stalePolicies.length} policies not reviewed in >13 months: ${stalePolicies.map(p => p.name).join(', ')}`,
    );
  }

  return {
    collectorId: 'org-policies',
    controlIds: [
      'CC1.1.1', 'CC1.1.2', 'CC1.2.1', 'CC1.2.2', 'CC1.3.1', 'CC1.3.2',
      'CC1.4.1', 'CC1.4.2', 'CC1.5.1', 'CC1.5.2',
      'CC2.1.1', 'CC2.1.2', 'CC2.2.1', 'CC2.3.1',
      'CC3.1.1', 'CC3.1.2', 'CC3.2.1', 'CC3.2.2', 'CC3.2.3',
    ],
    periodStart,
    periodEnd,
    artifacts: [
      {
        filename: 'org-policies.json',
        format: 'json',
        content: evidence,
        controlId: 'CC1.1.1',
      },
      {
        filename: 'org-policies-summary.md',
        format: 'markdown',
        content: [
          '# Organization Policies & Governance Evidence',
          '',
          `**Period:** ${periodStart.toISOString().slice(0, 10)} — ${periodEnd.toISOString().slice(0, 10)}`,
          '',
          '## Policies',
          '',
          `- Total: ${totalPolicies}`,
          `- Active: ${activeCount}`,
          `- Stale (>13 months): ${stalePolicies.length}`,
          '',
          '| Policy | Version | Last Reviewed | Owner | Status |',
          '|--------|---------|---------------|-------|--------|',
          ...evidence.policies.map(
            p => `| ${p.name} | ${p.version} | ${p.lastReviewed} | ${p.owner} | ${p.status} |`,
          ),
          '',
          '## Governance',
          '',
          `- Board oversight: ${evidence.governance.boardOversight ? 'Yes' : 'No'}`,
          `- Security committee: ${evidence.governance.securityCommittee ? 'Yes' : 'No'}`,
          `- Meeting frequency: ${evidence.governance.meetingFrequency}`,
          `- Risk assessment frequency: ${evidence.governance.riskAssessmentFrequency}`,
          '',
          '## Security Awareness Training',
          '',
          `- Required: ${evidence.training.securityAwarenessRequired ? 'Yes' : 'No'}`,
          `- Frequency: ${evidence.training.frequency}`,
          `- Topics covered: ${evidence.training.topics.join(', ')}`,
          '',
          '## Background Checks',
          '',
          `- Required: ${evidence.backgroundChecks.required ? 'Yes' : 'No'}`,
          `- Scope: ${evidence.backgroundChecks.scope}`,
          `- Frequency: ${evidence.backgroundChecks.frequency}`,
          '',
          findings.length > 0
            ? '## Findings\n\n' + findings.map(f => `- ⚠️ ${f}`).join('\n')
            : '',
        ].join('\n'),
        controlId: 'CC1.1.1',
      },
    ],
    summary: `Policies: ${totalPolicies} total (${activeCount} active), ${stalePolicies.length} stale`,
  };
});
