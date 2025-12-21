/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Data Migration Template
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: [Describe what this migration does]
 * Created: [Date]
 * Author: [Your name]
 *
 * Usage:
 *   npx tsx prisma/data-migrations/template.ts up      # Apply migration
 *   npx tsx prisma/data-migrations/template.ts down    # Rollback migration
 *   npx tsx prisma/data-migrations/template.ts status  # Check progress
 *
 * Notes:
 *   - Always test on staging before production
 *   - This migration is idempotent (safe to run multiple times)
 *   - Progress is logged to console for monitoring
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { PrismaClient } from '../../generated/prisma-client/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const BATCH_SIZE = 1000;
const MIGRATION_NAME = 'template_migration';

// ══════════════════════════════════════════════════════════════════════════════
// PRISMA CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const prisma = new PrismaClient({
  log: process.env.DEBUG ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function logProgress(message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${MIGRATION_NAME}] ${message}`, data ? JSON.stringify(data) : '');
}

function logError(message: string, error: unknown) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${MIGRATION_NAME}] ERROR: ${message}`, error);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ══════════════════════════════════════════════════════════════════════════════
// UP MIGRATION
// ══════════════════════════════════════════════════════════════════════════════

async function up(): Promise<void> {
  logProgress('Starting UP migration');
  const startTime = Date.now();

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Get total count for progress reporting
    const totalCount = await prisma.user.count({
      where: {
        // Add your filter condition here
        // Example: emailVerified: false
      },
    });

    logProgress(`Found ${totalCount} records to process`);

    if (totalCount === 0) {
      logProgress('No records to process, migration complete');
      return;
    }

    // Process in batches
    let cursor: string | undefined;

    while (true) {
      // Fetch batch with cursor-based pagination (more efficient for large tables)
      const records = await prisma.user.findMany({
        where: {
          // Add your filter condition here
        },
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
      });

      if (records.length === 0) break;

      // Process batch in a transaction for atomicity
      const batchResults = await prisma.$transaction(async (tx) => {
        const results = [];

        for (const record of records) {
          try {
            // ════════════════════════════════════════════════════════════════
            // YOUR MIGRATION LOGIC HERE
            // ════════════════════════════════════════════════════════════════

            // Example: Update a field based on some condition
            // const shouldUpdate = someCondition(record);
            // if (!shouldUpdate) {
            //   results.push({ id: record.id, status: 'skipped' });
            //   continue;
            // }

            // await tx.user.update({
            //   where: { id: record.id },
            //   data: {
            //     // Your updates here
            //   },
            // });

            results.push({ id: record.id, status: 'success' });
          } catch (error) {
            logError(`Failed to process record ${record.id}`, error);
            results.push({ id: record.id, status: 'failed', error });
          }
        }

        return results;
      });

      // Count results
      for (const result of batchResults) {
        if (result.status === 'success') processed++;
        else if (result.status === 'failed') failed++;
        else if (result.status === 'skipped') skipped++;
      }

      // Update cursor for next batch
      cursor = records[records.length - 1]?.id;

      // Log progress
      const progress = Math.round(((processed + failed + skipped) / totalCount) * 100);
      logProgress(`Progress: ${progress}%`, {
        processed,
        failed,
        skipped,
        remaining: totalCount - processed - failed - skipped,
      });

      // Optional: Add delay between batches to reduce database load
      // await sleep(100);
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    logProgress('UP migration completed', {
      processed,
      failed,
      skipped,
      durationSeconds: duration,
    });

    if (failed > 0) {
      logError(`Migration completed with ${failed} failures`, null);
      process.exitCode = 1;
    }
  } catch (error) {
    logError('Migration failed', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DOWN MIGRATION (ROLLBACK)
// ══════════════════════════════════════════════════════════════════════════════

async function down(): Promise<void> {
  logProgress('Starting DOWN migration (rollback)');
  const startTime = Date.now();

  try {
    // ════════════════════════════════════════════════════════════════════════
    // YOUR ROLLBACK LOGIC HERE
    // ════════════════════════════════════════════════════════════════════════

    // Example: Revert the changes made by UP
    // const result = await prisma.user.updateMany({
    //   where: {
    //     // Condition to find affected records
    //   },
    //   data: {
    //     // Revert to original state
    //   },
    // });

    // logProgress(`Reverted ${result.count} records`);

    const duration = Math.round((Date.now() - startTime) / 1000);
    logProgress('DOWN migration completed', { durationSeconds: duration });
  } catch (error) {
    logError('Rollback failed', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STATUS CHECK
// ══════════════════════════════════════════════════════════════════════════════

async function status(): Promise<void> {
  logProgress('Checking migration status');

  try {
    // Check how many records still need processing
    const pendingCount = await prisma.user.count({
      where: {
        // Add your "needs processing" condition
      },
    });

    const completedCount = await prisma.user.count({
      where: {
        // Add your "already processed" condition
      },
    });

    logProgress('Migration status', {
      pending: pendingCount,
      completed: completedCount,
      percentComplete: completedCount > 0 
        ? Math.round((completedCount / (completedCount + pendingCount)) * 100) 
        : 0,
    });
  } catch (error) {
    logError('Status check failed', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DRY RUN
// ══════════════════════════════════════════════════════════════════════════════

async function dryRun(): Promise<void> {
  logProgress('Starting DRY RUN (no changes will be made)');

  try {
    const records = await prisma.user.findMany({
      where: {
        // Add your filter condition
      },
      take: 10, // Preview first 10
    });

    logProgress(`Would process ${records.length} records (preview):`);
    for (const record of records) {
      console.log(`  - ${record.id}: ${record.email}`);
    }

    const totalCount = await prisma.user.count({
      where: {
        // Same filter condition
      },
    });

    logProgress(`Total records that would be affected: ${totalCount}`);
  } catch (error) {
    logError('Dry run failed', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'up':
        await up();
        break;
      case 'down':
        await down();
        break;
      case 'status':
        await status();
        break;
      case 'dry-run':
        await dryRun();
        break;
      default:
        console.log(`
Usage: npx tsx prisma/data-migrations/${MIGRATION_NAME}.ts <command>

Commands:
  up       Apply the migration
  down     Rollback the migration
  status   Check migration progress
  dry-run  Preview what would be affected (no changes)

Examples:
  npx tsx prisma/data-migrations/${MIGRATION_NAME}.ts up
  npx tsx prisma/data-migrations/${MIGRATION_NAME}.ts dry-run
        `);
        process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
