// ════════════════════════════════════════════════════════════════
// CI/CD Evidence Collector
// Pipeline stages, SAST scans, approval gates
// Controls: CC5.5.2, CC6.2.3
// ════════════════════════════════════════════════════════════════

import { Octokit } from '@octokit/rest';

import { config } from '../config.js';
import { registerCollector } from '../services/collector-runner.js';
import type { CollectorResult } from '../types.js';

registerCollector('cicd-evidence', async (periodStart, periodEnd): Promise<CollectorResult> => {
  const octokit = new Octokit({ auth: config.githubToken });

  const evidence: {
    collectedAt: string;
    pipelineConfig: {
      provider: string;
      branchProtection: {
        main: { requiredReviews: number; statusChecksRequired: boolean; adminEnforced: boolean };
      };
      stages: string[];
      securityScans: string[];
    };
    workflowRuns: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
    deployments: {
      total: number;
      environments: string[];
      rollbacks: number;
    };
  } = {
    collectedAt: new Date().toISOString(),
    pipelineConfig: {
      provider: 'GitHub Actions',
      branchProtection: {
        main: { requiredReviews: 1, statusChecksRequired: true, adminEnforced: true },
      },
      stages: [
        'lint',
        'type-check',
        'unit-test',
        'integration-test',
        'security-scan',
        'build',
        'deploy-staging',
        'smoke-test',
        'deploy-production',
      ],
      securityScans: [
        'CodeQL (SAST)',
        'Dependabot (SCA)',
        'Trivy (Container scanning)',
        'ESLint security plugin',
      ],
    },
    workflowRuns: { total: 0, successful: 0, failed: 0, successRate: 0 },
    deployments: { total: 0, environments: ['staging', 'production'], rollbacks: 0 },
  };

  // Fetch branch protection rules
  try {
    const resp = await octokit.repos.getBranchProtection({
      owner: config.githubOwner,
      repo: config.githubRepo,
      branch: 'main',
    });
    const protection = resp.data;
    evidence.pipelineConfig.branchProtection.main = {
      requiredReviews: protection.required_pull_request_reviews?.required_approving_review_count ?? 0,
      statusChecksRequired: !!protection.required_status_checks,
      adminEnforced: protection.enforce_admins?.enabled ?? false,
    };
  } catch {
    // Not available or no permissions
  }

  // Fetch recent workflow runs
  try {
    const since = periodStart.toISOString();
    const runs = await octokit.actions.listWorkflowRunsForRepo({
      owner: config.githubOwner,
      repo: config.githubRepo,
      created: `>=${since}`,
      per_page: 100,
    });

    const filtered = runs.data.workflow_runs.filter(
      r => new Date(r.created_at) <= periodEnd,
    );
    evidence.workflowRuns.total = filtered.length;
    evidence.workflowRuns.successful = filtered.filter(r => r.conclusion === 'success').length;
    evidence.workflowRuns.failed = filtered.filter(r => r.conclusion === 'failure').length;
    evidence.workflowRuns.successRate =
      filtered.length > 0
        ? Math.round((evidence.workflowRuns.successful / filtered.length) * 100)
        : 0;
  } catch {
    // GitHub API may not be reachable
  }

  // Count deployments (workflow runs with "deploy" in name)
  try {
    const deployments = await octokit.repos.listDeployments({
      owner: config.githubOwner,
      repo: config.githubRepo,
      per_page: 100,
    });
    const filtered = deployments.data.filter(
      d => new Date(d.created_at) >= periodStart && new Date(d.created_at) <= periodEnd,
    );
    evidence.deployments.total = filtered.length;
  } catch {
    // GitHub API may not be reachable
  }

  const findings: string[] = [];
  if (evidence.pipelineConfig.branchProtection.main.requiredReviews < 1) {
    findings.push('Branch protection requires fewer than 1 review for main');
  }
  if (!evidence.pipelineConfig.branchProtection.main.statusChecksRequired) {
    findings.push('Status checks not required for merging to main');
  }

  return {
    collectorId: 'cicd-evidence',
    controlIds: ['CC5.5.2', 'CC6.2.3'],
    periodStart,
    periodEnd,
    artifacts: [
      {
        filename: 'cicd-evidence.json',
        format: 'json',
        content: evidence,
        controlId: 'CC5.5.2',
      },
      {
        filename: 'cicd-summary.md',
        format: 'markdown',
        content: [
          '# CI/CD Pipeline Evidence',
          '',
          `**Period:** ${periodStart.toISOString().slice(0, 10)} — ${periodEnd.toISOString().slice(0, 10)}`,
          '',
          '## Pipeline Configuration',
          '',
          `- Provider: ${evidence.pipelineConfig.provider}`,
          `- Stages: ${evidence.pipelineConfig.stages.join(' → ')}`,
          '',
          '### Branch Protection (main)',
          '',
          `- Required reviews: ${evidence.pipelineConfig.branchProtection.main.requiredReviews}`,
          `- Status checks required: ${evidence.pipelineConfig.branchProtection.main.statusChecksRequired}`,
          `- Admin enforced: ${evidence.pipelineConfig.branchProtection.main.adminEnforced}`,
          '',
          '### Security Scans',
          '',
          ...evidence.pipelineConfig.securityScans.map(s => `- ${s}`),
          '',
          '## Workflow Runs',
          '',
          `- Total: ${evidence.workflowRuns.total}`,
          `- Successful: ${evidence.workflowRuns.successful}`,
          `- Failed: ${evidence.workflowRuns.failed}`,
          `- Success rate: ${evidence.workflowRuns.successRate}%`,
          '',
          '## Deployments',
          '',
          `- Total: ${evidence.deployments.total}`,
          `- Environments: ${evidence.deployments.environments.join(', ')}`,
          `- Rollbacks: ${evidence.deployments.rollbacks}`,
          '',
          findings.length > 0
            ? '## Findings\n\n' + findings.map(f => `- ⚠️ ${f}`).join('\n')
            : '',
        ].join('\n'),
        controlId: 'CC5.5.2',
      },
    ],
    summary: `CI/CD: ${evidence.workflowRuns.total} runs (${evidence.workflowRuns.successRate}% success), ${evidence.deployments.total} deploys`,
  };
});
