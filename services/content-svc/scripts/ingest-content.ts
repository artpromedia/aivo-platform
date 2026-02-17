/**
 * Content Ingestion CLI
 *
 * Bulk-load Learning Object content from JSON files into content-svc.
 *
 * Reads a directory of JSON files, validates each against the LO schema,
 * and upserts records into the database.
 *
 * JSON file format:
 * {
 *   "slug": "g35-fractions-intro",
 *   "title": "Introduction to Fractions",
 *   "subject": "MATH",
 *   "gradeBand": "G3_5",
 *   "tags": ["fractions", "numbers"],
 *   "content": {
 *     "blocks": [...],
 *     "estimatedMinutes": 15,
 *     "difficulty": "beginner"
 *   }
 * }
 *
 * Usage:
 *   npx tsx scripts/ingest-content.ts <directory|file.json> [--dry-run] [--tenant <tenantId>]
 *
 * Examples:
 *   npx tsx scripts/ingest-content.ts ./content-packs/ela-k2/
 *   npx tsx scripts/ingest-content.ts myLesson.json --dry-run
 */

import 'dotenv/config';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import {
  PrismaClient,
  LearningObjectSubject,
  LearningObjectGradeBand,
  LearningObjectVersionState,
} from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

// ─── CLI argument parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);

function flag(name: string): boolean {
  return args.includes(`--${name}`);
}

function flagValue(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return fallback;
}

const DRY_RUN = flag('dry-run');
const TENANT_ID = flagValue('tenant', '00000000-0000-0000-0000-000000000001');
const AUTHOR_ID = flagValue('author', '00000000-0000-0000-1000-000000000002');

// First positional argument is the path
const inputPath = args.find((a) => !a.startsWith('--'));

if (!inputPath) {
  console.error('Usage: npx tsx scripts/ingest-content.ts <directory|file.json> [--dry-run] [--tenant <id>]');
  process.exit(1);
}

// ─── Validation ──────────────────────────────────────────────────────────────

const VALID_SUBJECTS = new Set(Object.values(LearningObjectSubject));
const VALID_GRADES = new Set(Object.values(LearningObjectGradeBand));
const VALID_BLOCK_TYPES = new Set([
  'heading',
  'paragraph',
  'list',
  'definition',
  'interactive',
  'practice',
  'example',
  'image',
]);
const VALID_DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);

interface ValidationError {
  field: string;
  message: string;
}

interface LOInput {
  slug: string;
  title: string;
  subject: string;
  gradeBand: string;
  tags: string[];
  content: {
    blocks: Array<{ type: string; [key: string]: unknown }>;
    estimatedMinutes: number;
    difficulty: string;
    prerequisites?: string[];
  };
}

function validateLO(data: unknown, filePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lo = data as Record<string, unknown>;

  if (!lo.slug || typeof lo.slug !== 'string') {
    errors.push({ field: 'slug', message: 'slug is required and must be a string' });
  }
  if (!lo.title || typeof lo.title !== 'string') {
    errors.push({ field: 'title', message: 'title is required and must be a string' });
  }
  if (!lo.subject || !VALID_SUBJECTS.has(lo.subject as LearningObjectSubject)) {
    errors.push({ field: 'subject', message: `subject must be one of: ${[...VALID_SUBJECTS].join(', ')}` });
  }
  if (!lo.gradeBand || !VALID_GRADES.has(lo.gradeBand as LearningObjectGradeBand)) {
    errors.push({ field: 'gradeBand', message: `gradeBand must be one of: ${[...VALID_GRADES].join(', ')}` });
  }
  if (!Array.isArray(lo.tags)) {
    errors.push({ field: 'tags', message: 'tags must be an array of strings' });
  }

  const content = lo.content as LOInput['content'] | undefined;
  if (!content || typeof content !== 'object') {
    errors.push({ field: 'content', message: 'content object is required' });
  } else {
    if (!Array.isArray(content.blocks) || content.blocks.length === 0) {
      errors.push({ field: 'content.blocks', message: 'content.blocks must be a non-empty array' });
    } else {
      for (let i = 0; i < content.blocks.length; i++) {
        const block = content.blocks[i];
        if (!block.type || !VALID_BLOCK_TYPES.has(block.type)) {
          errors.push({
            field: `content.blocks[${i}].type`,
            message: `block type "${block.type}" is not valid; must be one of: ${[...VALID_BLOCK_TYPES].join(', ')}`,
          });
        }
      }
    }
    if (typeof content.estimatedMinutes !== 'number' || content.estimatedMinutes <= 0) {
      errors.push({ field: 'content.estimatedMinutes', message: 'estimatedMinutes must be a positive number' });
    }
    if (!content.difficulty || !VALID_DIFFICULTIES.has(content.difficulty)) {
      errors.push({ field: 'content.difficulty', message: `difficulty must be one of: ${[...VALID_DIFFICULTIES].join(', ')}` });
    }
  }

  return errors;
}

// ─── File loading ────────────────────────────────────────────────────────────

function collectJsonFiles(pathArg: string): string[] {
  const resolved = resolve(pathArg);

  if (!existsSync(resolved)) {
    console.error(`Error: path not found: ${resolved}`);
    process.exit(1);
  }

  const stat = statSync(resolved);
  if (stat.isFile()) {
    if (extname(resolved) !== '.json') {
      console.error(`Error: file must be .json: ${resolved}`);
      process.exit(1);
    }
    return [resolved];
  }

  if (stat.isDirectory()) {
    return readdirSync(resolved)
      .filter((f) => extname(f) === '.json')
      .map((f) => join(resolved, f))
      .sort();
  }

  console.error(`Error: path is neither a file nor directory: ${resolved}`);
  process.exit(1);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n📦 Content Ingestion CLI`);
  console.log(`   Tenant:   ${TENANT_ID}`);
  console.log(`   Author:   ${AUTHOR_ID}`);
  console.log(`   Dry-run:  ${DRY_RUN ? 'YES' : 'no'}`);
  console.log(`   Input:    ${inputPath}\n`);

  const files = collectJsonFiles(inputPath);
  console.log(`Found ${files.length} JSON file(s)\n`);

  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (const file of files) {
    const fileName = file.split(/[\\/]/).pop()!;
    let raw: unknown;

    try {
      raw = JSON.parse(readFileSync(file, 'utf-8'));
    } catch (e) {
      console.error(`  ❌ ${fileName}: invalid JSON — ${(e as Error).message}`);
      failed++;
      continue;
    }

    // Support both single object and array of objects
    const items: unknown[] = Array.isArray(raw) ? raw : [raw];

    for (const item of items) {
      const lo = item as LOInput;
      const errors = validateLO(item, file);

      if (errors.length > 0) {
        console.error(`  ❌ ${fileName} (${lo.slug ?? 'unknown'}): validation errors:`);
        for (const err of errors) {
          console.error(`     - ${err.field}: ${err.message}`);
        }
        failed++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  🔍 [dry-run] ${lo.gradeBand} ${lo.subject}: ${lo.title}`);
        skipped++;
        continue;
      }

      try {
        const record = await prisma.learningObject.upsert({
          where: {
            tenantId_slug: {
              tenantId: TENANT_ID,
              slug: lo.slug,
            },
          },
          update: {
            title: lo.title,
            subject: lo.subject as LearningObjectSubject,
            gradeBand: lo.gradeBand as LearningObjectGradeBand,
          },
          create: {
            tenantId: TENANT_ID,
            slug: lo.slug,
            title: lo.title,
            subject: lo.subject as LearningObjectSubject,
            gradeBand: lo.gradeBand as LearningObjectGradeBand,
            createdByUserId: AUTHOR_ID,
            isActive: true,
          },
        });

        // Create new version (increment from latest)
        const latestVersion = await prisma.learningObjectVersion.findFirst({
          where: { learningObjectId: record.id },
          orderBy: { versionNumber: 'desc' },
          select: { versionNumber: true },
        });

        const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;

        await prisma.learningObjectVersion.create({
          data: {
            learningObjectId: record.id,
            versionNumber: nextVersion,
            state: LearningObjectVersionState.PUBLISHED,
            createdByUserId: AUTHOR_ID,
            approvedByUserId: AUTHOR_ID,
            contentJson: lo.content,
            changeSummary: `Ingested from ${fileName} (v${nextVersion})`,
            publishedAt: new Date(),
          },
        });

        // Sync tags
        for (const tag of lo.tags) {
          await prisma.learningObjectTag.upsert({
            where: {
              learningObjectId_tag: {
                learningObjectId: record.id,
                tag,
              },
            },
            update: {},
            create: {
              learningObjectId: record.id,
              tag,
            },
          });
        }

        console.log(`  ✅ ${lo.gradeBand} ${lo.subject}: ${lo.title} (v${nextVersion})`);
        successful++;
      } catch (e) {
        console.error(`  ❌ ${lo.slug}: database error — ${(e as Error).message}`);
        failed++;
      }
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${successful} succeeded, ${failed} failed, ${skipped} skipped (dry-run)`);
}

main()
  .catch((e) => {
    console.error('❌ Ingestion failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
