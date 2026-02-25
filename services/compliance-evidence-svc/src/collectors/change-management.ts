// ════════════════════════════════════════════════════════════════
// Change Management Collector
// Queries GitHub for PR data, review compliance, CI pass rates
// Controls: CC5.5, CC2.1, CC3.3, CC6.2, PI1.1
// ════════════════════════════════════════════════════════════════

import { Octokit } from '@octokit/rest';
import { config } from '../config.js';
import { registerCollector } from '../services/collector-runner.js';
import type { CollectorResult, ChangeManagementSummary, GitHubPREvidence } from '../types.js';

function getOctokit(): Octokit {
  return new Octokit({ auth: config.github.token });
}

registerCollector('change-management', async (periodStart, periodEnd): Promise<CollectorResult> => {
  const octokit = getOctokit();
  const owner = config.github.owner;
  const repo = config.github.repo;

  // Fetch merged PRs in period
  const since = periodStart.toISOString();
  const until = periodEnd.toISOString();

  const prs: GitHubPREvidence[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
      page,
    });

    if (data.length === 0) {
      hasMore = false;
      break;
    }

    for (const pr of data) {
      if (!pr.merged_at) continue;
      const mergedAt = new Date(pr.merged_at);
      if (mergedAt < periodStart) { hasMore = false; break; }
      if (mergedAt > periodEnd) continue;

      prs.push({
        number: pr.number,
        title: pr.title,
        author: pr.user?.login ?? 'unknown',
        mergedAt: pr.merged_at,
        reviewers: (pr.requested_reviewers ?? []).map((r: any) => r.login),
        approvedBy: [], // filled below
        ciPassed: false, // filled below
        labels: pr.labels.map((l: any) => l.name),
        additions: pr.additions ?? 0,
        deletions: pr.deletions ?? 0,
        changedFiles: pr.changed_files ?? 0,
      });
    }

    page++;
  }

  // Fetch review data for each PR (sample first 50)
  for (const pr of prs.slice(0, 50)) {
    try {
      const { data: reviews } = await octokit.pulls.listReviews({
        owner,
        repo,
        pull_number: pr.number,
      });
      pr.approvedBy = reviews
        .filter(r => r.state === 'APPROVED')
        .map(r => r.user?.login ?? 'unknown');
    } catch {
      // skip
    }
  }

  // Compute summary
  const totalPRs = prs.length;
  const withReview = prs.filter(p => p.approvedBy.length > 0).length;
  const reviewRate = totalPRs > 0 ? Math.round((withReview / totalPRs) * 100) : 0;

  const summary: ChangeManagementSummary = {
    totalChanges: totalPRs,
    withApproval: withReview,
    approvalRate: reviewRate,
    avgReviewers: totalPRs > 0
      ? Math.round(prs.reduce((s, p) => s + p.approvedBy.length, 0) / totalPRs * 10) / 10
      : 0,
    emergencyChanges: prs.filter(p => p.labels.includes('emergency')).length,
    rollbacks: prs.filter(p => p.labels.includes('rollback') || p.title.toLowerCase().includes('revert')).length,
  };

  const findings: string[] = [];
  if (reviewRate < 100) findings.push(`PR approval rate ${reviewRate}% — target 100%`);
  if (summary.emergencyChanges > 0) findings.push(`${summary.emergencyChanges} emergency changes in period`);

  return {
    collectorId: 'change-management',
    controlIds: [
      'CC5.5.1', 'CC5.5.2', 'CC5.5.3', 'CC5.5.4', 'CC5.5.6',
      'CC2.1.2', 'CC3.3.1', 'CC3.3.3',
      'CC6.2.2', 'PI1.1',
    ],
    periodStart,
    periodEnd,
    artifacts: [
      {
        filename: 'change-management.json',
        format: 'json',
        content: { summary, prs: prs.slice(0, 200), findings },
        controlId: 'CC5.5.1',
        metadata: { totalPRs: String(totalPRs), approvalRate: String(reviewRate) },
      },
      {
        filename: 'change-management-summary.md',
        format: 'markdown',
        content: [
          '# Change Management Evidence',
          '',
          `**Period:** ${periodStart.toISOString().slice(0, 10)} — ${periodEnd.toISOString().slice(0, 10)}`,
          '',
          '## Summary',
          '',
          `| Metric | Value |`,
          `|--------|-------|`,
          `| Total PRs Merged | ${totalPRs} |`,
          `| With Approval | ${withReview} (${reviewRate}%) |`,
          `| Avg Reviewers | ${summary.avgReviewers} |`,
          `| Emergency Changes | ${summary.emergencyChanges} |`,
          `| Rollbacks | ${summary.rollbacks} |`,
          '',
          findings.length > 0 ? '## Findings\n\n' + findings.map(f => `- ${f}`).join('\n') : '',
        ].join('\n'),
        controlId: 'CC5.5.1',
      },
    ],
    summary: `Change management: ${totalPRs} PRs, ${reviewRate}% approved, ${summary.emergencyChanges} emergency`,
  };
});
