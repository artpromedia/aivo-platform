/**
 * Seed – LessonContentLink
 *
 * Creates links between curriculum-svc Lessons and content-svc LearningObjects.
 * Run this AFTER seeding both curriculum-svc (K-5, 6-8, 9-12) and content-svc
 * (seed-k12-content.ts).
 *
 * The script:
 *   1. Queries ALL lessons from curriculum-svc DB (in the dev tenant)
 *   2. For each lesson, looks up a matching LO in a predefined mapping table
 *      (keyed by subject + gradeBand + keyword in title)
 *   3. Creates a LessonContentLink row linking lesson → LO
 *
 * Usage:
 *   npx tsx prisma/seed-content-links.ts
 */

import 'dotenv/config';

type CurriculumStandard = 'COMMON_CORE' | 'NGSS' | 'C3' | 'STATE_SPECIFIC' | 'CUSTOM';
type GradeBand = 'PRE_K' | 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';
type SubjectArea = 'ELA' | 'MATH' | 'SCIENCE' | 'SOCIAL_STUDIES' | 'SEL' | 'ARTS' | 'WORLD_LANGUAGE' | 'PHYSICAL_ED' | 'TECHNOLOGY' | 'CAREER_TECH';

const { PrismaClient } = await import('../src/generated/prisma-client/index.js');
const prisma = new PrismaClient();

const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT LO ID TABLE
//
// These IDs are the deterministic values produced by seed-k12-content.ts
// (counter-based: 50000000-0000-0000-5000-NNNNNNNNNNNN).
// ═══════════════════════════════════════════════════════════════════════════════

function loId(n: number): string {
  return `50000000-0000-0000-5000-${String(n).padStart(12, '0')}`;
}

// Map: { subject, gradeBand, keywords[] } → LO ID
// The keywords are matched against the LESSON title (case-insensitive).
const LO_MAP: { subject: string; gradeBand: string; keywords: string[]; contentId: string }[] = [
  // ── K-2 LOs (IDs 1-10) ──────────────────────────────────────────────────
  { subject: 'ELA',     gradeBand: 'K_2',  keywords: ['phonics', 'letter sound'],      contentId: loId(1)  },
  { subject: 'ELA',     gradeBand: 'K_2',  keywords: ['sight word'],                    contentId: loId(2)  },
  { subject: 'ELA',     gradeBand: 'K_2',  keywords: ['fluency', 'reading fluency'],    contentId: loId(3)  },
  { subject: 'MATH',    gradeBand: 'K_2',  keywords: ['counting', 'number'],            contentId: loId(4)  },
  { subject: 'MATH',    gradeBand: 'K_2',  keywords: ['addition', 'subtraction'],       contentId: loId(5)  },
  { subject: 'MATH',    gradeBand: 'K_2',  keywords: ['shapes', 'geometry'],            contentId: loId(6)  },
  { subject: 'SCIENCE', gradeBand: 'K_2',  keywords: ['living', 'nonliving', 'life'],   contentId: loId(7)  },
  { subject: 'SCIENCE', gradeBand: 'K_2',  keywords: ['weather', 'season'],             contentId: loId(8)  },
  { subject: 'SEL',     gradeBand: 'K_2',  keywords: ['feeling', 'emotion'],            contentId: loId(9)  },
  { subject: 'SOCIAL_STUDIES', gradeBand: 'K_2', keywords: ['community', 'neighbor'],   contentId: loId(10) },

  // ── 3-5 LOs (IDs 11-20) ─────────────────────────────────────────────────
  { subject: 'ELA',     gradeBand: 'G3_5', keywords: ['story element', 'character', 'plot'],       contentId: loId(11) },
  { subject: 'ELA',     gradeBand: 'G3_5', keywords: ['informational', 'nonfiction', 'text'],      contentId: loId(12) },
  { subject: 'ELA',     gradeBand: 'G3_5', keywords: ['opinion', 'writing'],                       contentId: loId(13) },
  { subject: 'MATH',    gradeBand: 'G3_5', keywords: ['multiplication', 'division'],               contentId: loId(14) },
  { subject: 'MATH',    gradeBand: 'G3_5', keywords: ['fraction'],                                 contentId: loId(15) },
  { subject: 'MATH',    gradeBand: 'G3_5', keywords: ['area', 'perimeter'],                        contentId: loId(16) },
  { subject: 'SCIENCE', gradeBand: 'G3_5', keywords: ['ecosystem', 'food chain', 'habitat'],       contentId: loId(17) },
  { subject: 'SCIENCE', gradeBand: 'G3_5', keywords: ['matter', 'states of matter', 'physical'],   contentId: loId(18) },
  { subject: 'SOCIAL_STUDIES', gradeBand: 'G3_5', keywords: ['history', 'region', 'geography'],    contentId: loId(19) },
  { subject: 'SEL',     gradeBand: 'G3_5', keywords: ['growth mindset', 'mindset', 'motivation'],  contentId: loId(20) },

  // ── 6-8 LOs (IDs 21-31) ─────────────────────────────────────────────────
  { subject: 'ELA',     gradeBand: 'G6_8', keywords: ['literary analysis', 'theme', 'literature'],       contentId: loId(21) },
  { subject: 'ELA',     gradeBand: 'G6_8', keywords: ['argumentative', 'argument'],                      contentId: loId(22) },
  { subject: 'MATH',    gradeBand: 'G6_8', keywords: ['ratio', 'proportion'],                            contentId: loId(23) },
  { subject: 'MATH',    gradeBand: 'G6_8', keywords: ['expression', 'equation', 'algebra'],              contentId: loId(24) },
  { subject: 'SCIENCE', gradeBand: 'G6_8', keywords: ['cell', 'organelle'],                              contentId: loId(25) },
  { subject: 'SCIENCE', gradeBand: 'G6_8', keywords: ['plate', 'tectonic', 'earth'],                     contentId: loId(26) },
  { subject: 'SCIENCE', gradeBand: 'G6_8', keywords: ['force', 'motion', 'newton'],                      contentId: loId(27) },
  { subject: 'SOCIAL_STUDIES', gradeBand: 'G6_8', keywords: ['ancient', 'civilization'],                  contentId: loId(28) },
  { subject: 'SEL',     gradeBand: 'G6_8', keywords: ['identity', 'self-awareness', 'self'],             contentId: loId(29) },
  { subject: 'ARTS',    gradeBand: 'G6_8', keywords: ['art', 'element', 'design'],                       contentId: loId(30) },
  { subject: 'TECHNOLOGY', gradeBand: 'G6_8', keywords: ['digital', 'citizenship', 'cyber'],             contentId: loId(31) },

  // ── 9-12 LOs (IDs 32-48) ────────────────────────────────────────────────
  { subject: 'ELA',     gradeBand: 'G9_12', keywords: ['rhetoric', 'rhetorical'],                        contentId: loId(32) },
  { subject: 'ELA',     gradeBand: 'G9_12', keywords: ['literary analysis', 'essay'],                    contentId: loId(33) },
  { subject: 'ELA',     gradeBand: 'G9_12', keywords: ['synthesis', 'research'],                         contentId: loId(34) },
  { subject: 'MATH',    gradeBand: 'G9_12', keywords: ['linear', 'slope', 'function'],                   contentId: loId(35) },
  { subject: 'MATH',    gradeBand: 'G9_12', keywords: ['quadratic', 'parabola'],                         contentId: loId(36) },
  { subject: 'MATH',    gradeBand: 'G9_12', keywords: ['proof', 'congruent', 'geometry proof'],          contentId: loId(37) },
  { subject: 'MATH',    gradeBand: 'G9_12', keywords: ['trigonometry', 'trig', 'circle'],                contentId: loId(38) },
  { subject: 'SCIENCE', gradeBand: 'G9_12', keywords: ['cell biology', 'mitosis', 'organelle'],          contentId: loId(39) },
  { subject: 'SCIENCE', gradeBand: 'G9_12', keywords: ['genetics', 'dna', 'heredity'],                   contentId: loId(40) },
  { subject: 'SCIENCE', gradeBand: 'G9_12', keywords: ['bond', 'chemistry', 'chemical bond'],            contentId: loId(41) },
  { subject: 'SCIENCE', gradeBand: 'G9_12', keywords: ['kinematic', 'velocity', 'physics motion'],       contentId: loId(42) },
  { subject: 'SOCIAL_STUDIES', gradeBand: 'G9_12', keywords: ['revolution', 'world history'],            contentId: loId(43) },
  { subject: 'SOCIAL_STUDIES', gradeBand: 'G9_12', keywords: ['government', 'constitution', 'civic'],    contentId: loId(44) },
  { subject: 'SEL',     gradeBand: 'G9_12', keywords: ['college', 'career', 'readiness'],                contentId: loId(45) },
  { subject: 'ARTS',    gradeBand: 'G9_12', keywords: ['studio', 'painting', 'drawing'],                 contentId: loId(46) },
  { subject: 'TECHNOLOGY', gradeBand: 'G9_12', keywords: ['programming', 'coding', 'code'],              contentId: loId(47) },
  { subject: 'CAREER_TECH', gradeBand: 'G9_12', keywords: ['career exploration', 'employability'],       contentId: loId(48) },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MATCHING
// ═══════════════════════════════════════════════════════════════════════════════

/** Map curriculum-svc gradeBand → content-svc gradeBand */
function toContentGradeBand(gb: string): string {
  // K_2 → K_2, G3_5 → G3_5, G6_8 → G6_8, G9_12 → G9_12, PRE_K → K_2
  if (gb === 'PRE_K') return 'K_2';
  return gb;
}

function findMatchingLO(
  lessonTitle: string,
  currSubject: string,
  currGradeBand: string,
): string | null {
  const titleLower = lessonTitle.toLowerCase();
  const contentGradeBand = toContentGradeBand(currGradeBand);

  // First try exact subject + gradeBand match
  for (const entry of LO_MAP) {
    if (entry.subject !== currSubject) continue;
    if (entry.gradeBand !== contentGradeBand) continue;
    if (entry.keywords.some((kw) => titleLower.includes(kw.toLowerCase()))) {
      return entry.contentId;
    }
  }

  // Fallback: match by gradeBand only (cross-subject keyword match)
  for (const entry of LO_MAP) {
    if (entry.gradeBand !== contentGradeBand) continue;
    if (entry.keywords.some((kw) => titleLower.includes(kw.toLowerCase()))) {
      return entry.contentId;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEED
// ═══════════════════════════════════════════════════════════════════════════════

let linkCounter = 0;
function linkId(): string {
  linkCounter++;
  return `60000000-0000-0000-6000-${String(linkCounter).padStart(12, '0')}`;
}

async function seedContentLinks(): Promise<void> {
  console.log('Seeding LessonContentLinks...\n');

  // Get all curricula + units + lessons for the dev tenant
  const curricula = await prisma.curriculum.findMany({
    where: { tenantId: DEV_TENANT_ID },
    include: {
      units: {
        include: {
          lessons: { orderBy: { orderIndex: 'asc' } },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  let linked = 0;
  let skipped = 0;

  for (const curriculum of curricula) {
    for (const unit of curriculum.units) {
      for (const lesson of unit.lessons) {
        const contentId = findMatchingLO(
          lesson.title,
          curriculum.subject,
          curriculum.gradeBand,
        );

        if (!contentId) {
          skipped++;
          continue;
        }

        // Check if link already exists
        const existing = await prisma.lessonContentLink.findFirst({
          where: {
            lessonId: lesson.id,
            contentId,
          },
        });

        if (existing) {
          continue;
        }

        await prisma.lessonContentLink.create({
          data: {
            id: linkId(),
            lessonId: lesson.id,
            contentType: 'LEARNING_OBJECT',
            contentId,
            usageContext: 'INTRODUCTION',
            orderIndex: 0,
            isRequired: true,
          },
        });

        linked++;
        console.log(`  ✓ ${curriculum.subject} ${curriculum.gradeBand} | "${lesson.title}" → ${contentId}`);
      }
    }
  }

  console.log(`\n✅ Done. Linked: ${linked}, Skipped (no match): ${skipped}`);
}

seedContentLinks()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
