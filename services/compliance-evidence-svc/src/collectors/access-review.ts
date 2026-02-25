// ════════════════════════════════════════════════════════════════
// Access Review Collector
// Queries auth-svc for RBAC, MFA, service account data
// Controls: CC5.1-CC5.3, CC1.3, CC1.5, CC3.2, C1.3
// ════════════════════════════════════════════════════════════════

import { config } from '../config.js';
import { registerCollector } from '../services/collector-runner.js';
import type { CollectorResult, AccessReviewEvidence } from '../types.js';

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
  return resp.json() as Promise<T>;
}

registerCollector('access-review', async (periodStart, periodEnd): Promise<CollectorResult> => {
  // Fetch user roster, roles, MFA status
  let users: Array<{ id: string; email: string; role: string; mfaEnabled: boolean; lastLoginAt: string | null; createdAt: string }> = [];
  try {
    const data = await fetchJson<{ users: typeof users }>(`${config.authSvcUrl}/auth/admin/users`);
    users = data.users ?? [];
  } catch {
    users = [];
  }

  const totalUsers = users.length;
  const mfaEnabled = users.filter(u => u.mfaEnabled).length;
  const mfaPercentage = totalUsers > 0 ? Math.round((mfaEnabled / totalUsers) * 100) : 0;

  // Role distribution
  const roleCounts: Record<string, number> = {};
  for (const u of users) {
    roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1;
  }

  // Privileged users (admin-level roles)
  const privilegedRoles = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'DISTRICT_ADMIN'];
  const privilegedUsers = users.filter(u => privilegedRoles.includes(u.role));

  // Stale accounts (no login > 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);
  const staleAccounts = users.filter(u => {
    if (!u.lastLoginAt) return true;
    return new Date(u.lastLoginAt) < ninetyDaysAgo;
  });

  // Findings
  const findings: string[] = [];
  if (mfaPercentage < 100) findings.push(`MFA adoption at ${mfaPercentage}% — target 100%`);
  if (staleAccounts.length > 0) findings.push(`${staleAccounts.length} stale accounts (no login > 90 days)`);
  if (privilegedUsers.length > 10) findings.push(`${privilegedUsers.length} privileged users — review for least privilege`);

  const evidence: AccessReviewEvidence = {
    reviewDate: new Date().toISOString(),
    totalUsers,
    roleDistribution: roleCounts,
    privilegedUsers: privilegedUsers.map(u => ({ id: u.id, email: u.email, role: u.role })),
    mfaPercentage,
    staleAccounts: staleAccounts.map(u => ({ id: u.id, email: u.email, lastLogin: u.lastLoginAt })),
    findings,
  };

  return {
    collectorId: 'access-review',
    controlIds: [
      'CC5.1.1', 'CC5.1.2', 'CC5.1.6', 'CC5.1.7',
      'CC5.2.1', 'CC5.2.2', 'CC5.2.3', 'CC5.2.4',
      'CC5.3.1', 'CC5.3.2', 'CC5.3.3', 'CC5.3.4',
      'CC1.3.1', 'CC1.5.4', 'CC3.2.2', 'C1.3',
    ],
    periodStart,
    periodEnd,
    artifacts: [
      {
        filename: 'access-review.json',
        format: 'json',
        content: evidence,
        controlId: 'CC5.1.1',
        metadata: { totalUsers: String(totalUsers), mfaPercentage: String(mfaPercentage) },
      },
      {
        filename: 'access-review-summary.md',
        format: 'markdown',
        content: generateMarkdown(evidence, periodStart, periodEnd),
        controlId: 'CC5.1.1',
      },
    ],
    summary: `Access review: ${totalUsers} users, ${mfaPercentage}% MFA, ${staleAccounts.length} stale, ${findings.length} findings`,
  };
});

function generateMarkdown(evidence: AccessReviewEvidence, periodStart: Date, periodEnd: Date): string {
  return [
    '# Access Review Evidence',
    '',
    `**Review Period:** ${periodStart.toISOString().slice(0, 10)} — ${periodEnd.toISOString().slice(0, 10)}`,
    `**Review Date:** ${evidence.reviewDate}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Users | ${evidence.totalUsers} |`,
    `| MFA Adoption | ${evidence.mfaPercentage}% |`,
    `| Privileged Users | ${evidence.privilegedUsers.length} |`,
    `| Stale Accounts | ${evidence.staleAccounts.length} |`,
    '',
    '## Role Distribution',
    '',
    ...Object.entries(evidence.roleDistribution).map(([role, count]) => `- **${role}:** ${count}`),
    '',
    '## Privileged Users',
    '',
    '| Email | Role |',
    '|-------|------|',
    ...evidence.privilegedUsers.map((u: any) => `| ${u.email} | ${u.role} |`),
    '',
    '## Findings',
    '',
    ...evidence.findings.map(f => `- ${f}`),
  ].join('\n');
}
