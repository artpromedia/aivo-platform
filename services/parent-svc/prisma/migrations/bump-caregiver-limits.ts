/**
 * Data migration: bump caregiver limits from old default (2) → new default (3).
 *
 * Run manually:
 *   npx tsx prisma/migrations/bump-caregiver-limits.ts
 *
 * Safe to re-run — only touches records still at maxCaregivers=2.
 * Records with custom limits (e.g. PREMIUM → 5, FREE → 1) are untouched.
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await prisma.caregiverLimit.updateMany({
      where: { maxCaregivers: 2 },
      data: { maxCaregivers: 3 },
    });

    console.log(`✓ Bumped ${result.count} caregiver limit record(s) from 2 → 3`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
