// ════════════════════════════════════════════════════════════════
// Audit Package Builder — generates ZIP bundles for auditors
// ════════════════════════════════════════════════════════════════

import { Writable } from 'node:stream';

import type { PrismaClient } from '@prisma/client';
import archiver from 'archiver';


import { CONTROLS, COLLECTORS, getControlsByCategory } from '../control-registry.js';
import type { AuditPackageRequest, TrustServiceCategory } from '../types.js';

import { downloadEvidence, uploadEvidence, buildEvidenceKey } from './s3-client.js';

export async function generateAuditPackage(
  prisma: PrismaClient,
  req: AuditPackageRequest,
  generatedBy: string,
): Promise<{ packageId: string; s3Key: string; sizeBytes: number }> {
  const { periodStart, periodEnd, controlIds, categories, includeMarkdown, includeRawJson } = req;

  // Determine which controls to include
  let controlFilter = CONTROLS;
  if (controlIds?.length) {
    controlFilter = controlFilter.filter(c => controlIds.includes(c.id));
  }
  if (categories?.length) {
    controlFilter = controlFilter.filter(c => categories.includes(c.category));
  }

  // Fetch matching evidence records
  const evidenceRecords = await prisma.evidenceRecord.findMany({
    where: {
      controlId: { in: controlFilter.map(c => c.id) },
      collectedAt: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { collectedAt: 'desc' },
  });

  // Build ZIP archive in memory
  const chunks: Buffer[] = [];
  const writable = new Writable({
    write(chunk, _encoding, cb) {
      chunks.push(Buffer.from(chunk));
      cb();
    },
  });

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(writable);

  // Add table of contents
  const toc = generateTableOfContents(controlFilter, evidenceRecords, periodStart, periodEnd);
  archive.append(toc, { name: 'TABLE_OF_CONTENTS.md' });

  // Add control matrix summary
  const matrix = generateControlMatrixSummary(controlFilter);
  archive.append(matrix, { name: 'CONTROL_MATRIX.md' });

  // Group evidence by control → download and add each from S3
  const byControl = new Map<string, typeof evidenceRecords>();
  for (const rec of evidenceRecords) {
    const list = byControl.get(rec.controlId) ?? [];
    list.push(rec);
    byControl.set(rec.controlId, list);
  }

  for (const [controlId, records] of byControl) {
    for (const rec of records) {
      try {
        const data = await downloadEvidence(rec.s3Key);
        const ext = rec.format === 'json' ? '.json' : rec.format === 'markdown' ? '.md' : `.${rec.format}`;
        const filename = `${controlId}/${rec.collectorId}_${rec.collectedAt.toISOString().slice(0, 10)}${ext}`;
        archive.append(data, { name: filename });
      } catch (err) {
        // Skip unavailable evidence with a note
        archive.append(
          `Evidence unavailable: ${(err as Error).message}`,
          { name: `${controlId}/${rec.collectorId}_MISSING.txt` },
        );
      }
    }
  }

  await archive.finalize();
  await new Promise<void>(resolve => writable.on('finish', resolve));

  const zipBuffer = Buffer.concat(chunks);
  const s3Key = `audit-packages/${periodStart.toISOString().slice(0, 10)}_${periodEnd.toISOString().slice(0, 10)}_${Date.now()}.zip`;

  const upload = await uploadEvidence(s3Key, zipBuffer, 'json', {
    type: 'audit-package',
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  });

  const pkg = await prisma.auditPackage.create({
    data: {
      periodStart,
      periodEnd,
      controlCount: controlFilter.length,
      evidenceCount: evidenceRecords.length,
      s3Key: upload.s3Key,
      sizeBytes: upload.sizeBytes,
      generatedBy,
      categories: categories ?? [],
    },
  });

  return { packageId: pkg.id, s3Key: upload.s3Key, sizeBytes: upload.sizeBytes };
}

// ── Markdown Generators ──────────────────────────────────────

function generateTableOfContents(
  controls: typeof CONTROLS,
  evidence: { controlId: string; collectorId: string; collectedAt: Date; format: string }[],
  periodStart: Date,
  periodEnd: Date,
): string {
  const lines: string[] = [
    '# SOC 2 Type II — Audit Evidence Package',
    '',
    `**Audit Period:** ${periodStart.toISOString().slice(0, 10)} — ${periodEnd.toISOString().slice(0, 10)}`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Controls:** ${controls.length}`,
    `**Evidence Artifacts:** ${evidence.length}`,
    '',
    '## Contents',
    '',
    '| Control ID | Description | Evidence Count | Last Collected |',
    '|-----------|-------------|----------------|----------------|',
  ];

  for (const ctrl of controls) {
    const ctrlEvidence = evidence.filter(e => e.controlId === ctrl.id);
    const last = ctrlEvidence.length > 0
      ? ctrlEvidence[0].collectedAt.toISOString().slice(0, 10)
      : '—';
    lines.push(`| ${ctrl.id} | ${ctrl.description.slice(0, 60)} | ${ctrlEvidence.length} | ${last} |`);
  }

  return lines.join('\n');
}

function generateControlMatrixSummary(controls: typeof CONTROLS): string {
  const lines: string[] = [
    '# Control Matrix Summary',
    '',
    '| ID | Category | Section | Description | Type | Frequency | Owner |',
    '|----|----------|---------|-------------|------|-----------|-------|',
  ];

  for (const c of controls) {
    lines.push(`| ${c.id} | ${c.category} | ${c.section} | ${c.description.slice(0, 50)} | ${c.controlType} | ${c.frequency} | ${c.owner} |`);
  }

  return lines.join('\n');
}
