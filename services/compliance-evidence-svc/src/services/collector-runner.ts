// ════════════════════════════════════════════════════════════════
// Collector Runner — executes evidence collectors, stores results
// ════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { getCollector, getControl } from '../control-registry.js';
import {
  buildEvidenceKey,
  uploadEvidence,
  type UploadResult,
} from './s3-client.js';
import type {
  CollectorResult,
  EvidenceArtifact,
  EvidenceFormat,
} from '../types.js';

// ── Collector Function Registry ──────────────────────────────

export type CollectorFn = (
  periodStart: Date,
  periodEnd: Date,
) => Promise<CollectorResult>;

const collectorFunctions = new Map<string, CollectorFn>();

/** Register a collector implementation */
export function registerCollector(id: string, fn: CollectorFn): void {
  collectorFunctions.set(id, fn);
}

/** Get a registered collector function */
export function getCollectorFn(id: string): CollectorFn | undefined {
  return collectorFunctions.get(id);
}

// ── Runner ───────────────────────────────────────────────────

export interface RunOptions {
  collectorId: string;
  periodStart?: Date;
  periodEnd?: Date;
  triggeredBy?: 'scheduled' | 'manual' | 'ci';
}

export async function runCollector(
  prisma: PrismaClient,
  opts: RunOptions,
): Promise<{ runId: string; evidenceCount: number }> {
  const collector = getCollector(opts.collectorId);
  if (!collector) throw new Error(`Unknown collector: ${opts.collectorId}`);

  const fn = collectorFunctions.get(opts.collectorId);
  if (!fn) throw new Error(`No implementation for collector: ${opts.collectorId}`);

  const now = new Date();
  const periodEnd = opts.periodEnd ?? now;
  const periodStart = opts.periodStart ?? new Date(now.getTime() - 7 * 86_400_000);

  // Create run record
  const run = await prisma.collectionRun.create({
    data: {
      collectorId: opts.collectorId,
      status: 'running',
      triggeredBy: opts.triggeredBy ?? 'manual',
    },
  });

  const startMs = Date.now();

  try {
    const result = await fn(periodStart, periodEnd);
    const uploads: UploadResult[] = [];

    // Upload each artifact to S3
    for (const artifact of result.artifacts) {
      for (const controlId of result.controlIds) {
        const s3Key = buildEvidenceKey(
          controlId,
          opts.collectorId,
          artifact.filename,
          now,
        );

        const content =
          typeof artifact.content === 'string'
            ? artifact.content
            : JSON.stringify(artifact.content, null, 2);

        const uploadResult = await uploadEvidence(
          s3Key,
          content,
          artifact.format,
          {
            collectorId: opts.collectorId,
            controlId,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
          },
        );
        uploads.push(uploadResult);

        // Persist evidence record
        await prisma.evidenceRecord.create({
          data: {
            collectorId: opts.collectorId,
            controlId,
            category: getControl(controlId)?.category ?? 'CC',
            s3Key: uploadResult.s3Key,
            s3Bucket: uploadResult.s3Bucket,
            format: artifact.format,
            sizeBytes: uploadResult.sizeBytes,
            sha256: uploadResult.sha256,
            periodStart,
            periodEnd,
            metadata: artifact.metadata ?? {},
            runId: run.id,
          },
        });
      }
    }

    const durationMs = Date.now() - startMs;

    // Update run as completed
    await prisma.collectionRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        evidenceCount: uploads.length,
        durationMs,
      },
    });

    // Update schedule last run
    await prisma.collectorSchedule
      .updateMany({
        where: { collectorId: opts.collectorId },
        data: { lastRunAt: new Date() },
      })
      .catch(() => {});

    return { runId: run.id, evidenceCount: uploads.length };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    await prisma.collectionRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: (err as Error).message,
        durationMs,
      },
    });
    throw err;
  }
}

// ── Run All Collectors ───────────────────────────────────────

export async function runAllCollectors(
  prisma: PrismaClient,
  triggeredBy: 'scheduled' | 'manual' | 'ci' = 'scheduled',
): Promise<{ results: Array<{ collectorId: string; success: boolean; evidenceCount: number; error?: string }> }> {
  const results: Array<{ collectorId: string; success: boolean; evidenceCount: number; error?: string }> = [];

  for (const [collectorId] of collectorFunctions) {
    try {
      const { evidenceCount } = await runCollector(prisma, {
        collectorId,
        triggeredBy,
      });
      results.push({ collectorId, success: true, evidenceCount });
    } catch (err) {
      results.push({
        collectorId,
        success: false,
        evidenceCount: 0,
        error: (err as Error).message,
      });
    }
  }

  return { results };
}
