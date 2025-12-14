#!/usr/bin/env node
/**
 * ETL CLI Runner
 *
 * Command-line interface for running ETL jobs.
 *
 * Usage:
 *   node dist/etl/cli.js run --date=2025-01-15
 *   node dist/etl/cli.js run --date=yesterday
 *   node dist/etl/cli.js run-job --job=build_fact_sessions --date=2025-01-15
 *   node dist/etl/cli.js sync-dimensions
 *   node dist/etl/cli.js status
 */

/* eslint-disable @typescript-eslint/use-unknown-in-catch-callback-variable */

import { parseArgs } from 'node:util';

import { getYesterday, parseDate, formatDate } from './dateUtils.js';
import { closeConnections } from './db.js';
import {
  runAllDimensionSyncs,
  runAllFactBuilds,
  jobSyncDimTenant,
  jobSyncDimLearner,
  jobSyncDimUser,
  jobSyncDimSubject,
  jobSyncDimSkill,
  jobSyncDimContent,
  jobBuildFactSessions,
  jobBuildFactFocusEvents,
  jobBuildFactHomeworkEvents,
  jobBuildFactLearningProgress,
  jobBuildFactRecommendationEvents,
  jobBuildFactActivityEvents,
  jobBuildFactAIUsage,
  jobBuildFactBilling,
} from './jobs/index.js';
import { getRecentJobRuns } from './logger.js';
import type { JobResult } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CLI CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const HELP_TEXT = `
Analytics ETL Pipeline

Usage:
  etl run [options]              Run full ETL pipeline (dimensions + facts)
  etl sync-dimensions [options]  Sync dimension tables only
  etl build-facts [options]      Build fact tables only
  etl run-job [options]          Run a specific job
  etl status                     Show recent job runs
  etl help                       Show this help message

Options:
  --date=YYYY-MM-DD  Target date for fact tables (default: yesterday)
  --date=yesterday   Use yesterday's date
  --force            Re-run even if already completed for date
  --dry-run          Log actions but don't commit (not implemented yet)

Jobs:
  Dimensions:
    sync_dim_tenant, sync_dim_learner, sync_dim_user,
    sync_dim_subject, sync_dim_skill, sync_dim_content

  Facts:
    build_fact_sessions, build_fact_focus_events,
    build_fact_homework_events, build_fact_learning_progress,
    build_fact_recommendation_events, build_fact_activity_events,
    build_fact_ai_usage, build_fact_billing

Examples:
  etl run --date=2025-01-15
  etl run --date=yesterday --force
  etl run-job --job=build_fact_sessions --date=2025-01-15
  etl sync-dimensions
  etl status
`;

// ══════════════════════════════════════════════════════════════════════════════
// JOB REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

const dimensionJobs: Record<string, (force: boolean) => Promise<JobResult>> = {
  sync_dim_tenant: jobSyncDimTenant,
  sync_dim_learner: jobSyncDimLearner,
  sync_dim_user: jobSyncDimUser,
  sync_dim_subject: jobSyncDimSubject,
  sync_dim_skill: jobSyncDimSkill,
  sync_dim_content: jobSyncDimContent,
};

const factJobs: Record<string, (date: Date, force: boolean) => Promise<JobResult>> = {
  build_fact_sessions: jobBuildFactSessions,
  build_fact_focus_events: jobBuildFactFocusEvents,
  build_fact_homework_events: jobBuildFactHomeworkEvents,
  build_fact_learning_progress: jobBuildFactLearningProgress,
  build_fact_recommendation_events: jobBuildFactRecommendationEvents,
  build_fact_activity_events: jobBuildFactActivityEvents,
  build_fact_ai_usage: jobBuildFactAIUsage,
  build_fact_billing: jobBuildFactBilling,
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function resolveDate(dateArg?: string): Date {
  if (!dateArg || dateArg === 'yesterday') {
    return getYesterday();
  }
  return parseDate(dateArg);
}

function printResults(results: JobResult[]): void {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('                         ETL RESULTS                                ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalDeleted = 0;
  let totalDuration = 0;
  let failed = 0;

  for (const result of results) {
    const statusIcon = result.status === 'SUCCESS' ? '✓' : result.status === 'SKIPPED' ? '○' : '✗';
    console.log(
      `  ${statusIcon} ${result.jobName.padEnd(35)} ${result.status.padEnd(10)} ` +
        `${result.rowsProcessed.toString().padStart(8)} rows  ${result.durationMs.toString().padStart(6)}ms`
    );

    if (result.status === 'FAILED') {
      console.log(`     Error: ${result.errorMessage}`);
      failed++;
    }

    totalProcessed += result.rowsProcessed;
    totalInserted += result.rowsInserted;
    totalUpdated += result.rowsUpdated;
    totalDeleted += result.rowsDeleted;
    totalDuration += result.durationMs;
  }

  console.log('\n───────────────────────────────────────────────────────────────────');
  console.log(`  Total: ${results.length} jobs, ${totalProcessed} rows processed`);
  console.log(`  Inserted: ${totalInserted}, Updated: ${totalUpdated}, Deleted: ${totalDeleted}`);
  console.log(`  Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log(`\n  ⚠ ${failed} job(s) failed`);
  } else {
    console.log('\n  ✓ All jobs completed successfully');
  }

  console.log('═══════════════════════════════════════════════════════════════════\n');
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMANDS
// ══════════════════════════════════════════════════════════════════════════════

async function runFullPipeline(targetDate: Date, force: boolean): Promise<void> {
  console.log(`\n🚀 Starting full ETL pipeline for ${formatDate(targetDate)}`);
  console.log(`   Force mode: ${force}\n`);

  const results: JobResult[] = [];

  // 1. Sync dimensions
  console.log('📊 Syncing dimensions...');
  const dimResults = await runAllDimensionSyncs(force);
  results.push(...dimResults);

  // 2. Build facts
  console.log('📈 Building facts...');
  const factResults = await runAllFactBuilds(targetDate, force);
  results.push(...factResults);

  printResults(results);
}

async function syncDimensionsCommand(force: boolean): Promise<void> {
  console.log('\n📊 Syncing dimension tables...\n');

  const results = await runAllDimensionSyncs(force);
  printResults(results);
}

async function buildFactsCommand(targetDate: Date, force: boolean): Promise<void> {
  console.log(`\n📈 Building fact tables for ${formatDate(targetDate)}...\n`);

  const results = await runAllFactBuilds(targetDate, force);
  printResults(results);
}

async function runSingleJob(
  jobName: string,
  targetDate: Date | null,
  force: boolean
): Promise<void> {
  console.log(`\n🔧 Running job: ${jobName}`);
  if (targetDate) {
    console.log(`   Target date: ${formatDate(targetDate)}`);
  }
  console.log(`   Force mode: ${force}\n`);

  let result: JobResult;

  if (jobName in dimensionJobs) {
    result = await dimensionJobs[jobName](force);
  } else if (jobName in factJobs) {
    if (!targetDate) {
      targetDate = getYesterday();
      console.log(`   Using default date: ${formatDate(targetDate)}`);
    }
    result = await factJobs[jobName](targetDate, force);
  } else {
    console.error(`Unknown job: ${jobName}`);
    console.log('\nAvailable jobs:');
    console.log('  Dimensions:', Object.keys(dimensionJobs).join(', '));
    console.log('  Facts:', Object.keys(factJobs).join(', '));
    process.exit(1);
  }

  printResults([result]);
}

async function showStatus(): Promise<void> {
  console.log('\n📋 Recent ETL Job Runs\n');

  try {
    const runs = await getRecentJobRuns(20);

    if (runs.length === 0) {
      console.log('  No job runs found (etl_job_runs table may be empty)\n');
      return;
    }

    console.log('  Job Name                           Target Date  Status    Rows    Duration');
    console.log('  ─────────────────────────────────────────────────────────────────────────────');

    for (const run of runs) {
      const targetDateStr = run.targetDate ? formatDate(new Date(run.targetDate)) : '          ';
      const statusIcon = run.status === 'SUCCESS' ? '✓' : run.status === 'RUNNING' ? '⟳' : '✗';

      console.log(
        `  ${statusIcon} ${run.jobName.padEnd(33)} ${targetDateStr}  ${run.status.padEnd(8)} ` +
          `${run.rowsProcessed.toString().padStart(6)}  ${run.durationMs.toString().padStart(8)}ms`
      );
    }

    console.log('');
  } catch (error) {
    console.log('  Could not fetch job runs (etl_job_runs table may not exist)\n');
    console.log('  Error:', error instanceof Error ? error.message : String(error));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    console.log(HELP_TEXT);
    return;
  }

  const command = args[0];

  // Parse remaining args
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      date: { type: 'string', short: 'd' },
      force: { type: 'boolean', short: 'f', default: false },
      job: { type: 'string', short: 'j' },
      'dry-run': { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  const force = values.force ?? false;
  const dateArg = values.date;

  try {
    switch (command) {
      case 'run':
        await runFullPipeline(resolveDate(dateArg), force);
        break;

      case 'sync-dimensions':
        await syncDimensionsCommand(force);
        break;

      case 'build-facts':
        await buildFactsCommand(resolveDate(dateArg), force);
        break;

      case 'run-job':
        if (!values.job) {
          console.error('Error: --job is required for run-job command');
          process.exit(1);
        }
        await runSingleJob(values.job, dateArg ? resolveDate(dateArg) : null, force);
        break;

      case 'status':
        await showStatus();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log(HELP_TEXT);
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ETL pipeline failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await closeConnections();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
