/**
 * Personalization Signal Generation Job Runner
 *
 * Standalone entry point for running signal generation as a batch job.
 * Can be called from analytics-svc ETL or run independently.
 */

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-floating-promises */

import { initPools, closePools } from './db.js';
import { jobGeneratePersonalizationSignals, cleanupExpiredSignals } from './signalGeneration.js';

interface JobOptions {
  targetDate?: Date;
  lookbackDays?: number;
  cleanupExpired?: boolean;
}

async function runJob(options: JobOptions = {}): Promise<void> {
  const startTime = Date.now();
  console.log('[job] Starting personalization signal generation job');
  console.log(`[job] Options: ${JSON.stringify(options)}`);

  try {
    // Initialize database pools
    initPools();
    console.log('[job] Database pools initialized');

    // Run cleanup if requested
    if (options.cleanupExpired !== false) {
      console.log('[job] Cleaning up expired signals...');
      const cleaned = await cleanupExpiredSignals();
      console.log(`[job] Cleaned ${cleaned} expired signals`);
    }

    // Run signal generation
    console.log('[job] Generating personalization signals...');
    const result = await jobGeneratePersonalizationSignals(
      options.targetDate,
      options.lookbackDays
    );

    // Report results
    console.log('[job] Job completed:');
    console.log(`  Total learners: ${result.totalLearners}`);
    console.log(`  Signals generated: ${result.signalsGenerated}`);
    console.log(`  Signals updated: ${result.signalsUpdated}`);
    console.log(`  Signals deleted: ${result.signalsDeleted}`);
    console.log(`  Duration: ${result.durationMs}ms`);

    if (result.errors.length > 0) {
      console.warn(`[job] Errors encountered: ${result.errors.length}`);
      for (const error of result.errors.slice(0, 10)) {
        console.warn(`  - ${error}`);
      }
      if (result.errors.length > 10) {
        console.warn(`  ... and ${result.errors.length - 10} more`);
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[job] Total job duration: ${totalDuration}ms`);

    // Exit with error code if there were failures
    if (result.errors.length > result.totalLearners * 0.1) {
      console.error('[job] Too many errors, marking job as failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('[job] Job failed:', error);
    process.exit(1);
  } finally {
    await closePools();
  }
}

// Parse CLI arguments
function parseArgs(): JobOptions {
  const args = process.argv.slice(2);
  const options: JobOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--date' && args[i + 1]) {
      options.targetDate = new Date(args[i + 1]!);
      i++;
    } else if (arg === '--lookback' && args[i + 1]) {
      options.lookbackDays = parseInt(args[i + 1]!, 10);
      i++;
    } else if (arg === '--no-cleanup') {
      options.cleanupExpired = false;
    } else if (arg === '--help') {
      console.log(`
Personalization Signal Generation Job

Usage:
  npx tsx src/job.ts [options]

Options:
  --date <YYYY-MM-DD>   Target date for signal generation (default: today)
  --lookback <days>     Number of days to look back (default: 7)
  --no-cleanup          Skip cleanup of expired signals
  --help                Show this help message

Examples:
  npx tsx src/job.ts
  npx tsx src/job.ts --date 2025-01-15 --lookback 14
  npx tsx src/job.ts --no-cleanup
`);
      process.exit(0);
    }
  }

  return options;
}

// Run if called directly
const options = parseArgs();
runJob(options);
