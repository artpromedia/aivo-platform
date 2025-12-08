/**
 * Seed script to populate the skills catalog.
 *
 * Usage: pnpm db:seed
 *
 * This creates the master skills library with prerequisite relationships.
 * Skills are organized by domain and grade band.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SkillDefinition {
  skillCode: string;
  domain: 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL';
  gradeBand: 'K5' | 'G6_8' | 'G9_12';
  displayName: string;
  description: string;
  prerequisites?: string[]; // skill codes that must be mastered first
}

// ── Skills Catalog ──────────────────────────────────────────────────────────

const SKILLS: SkillDefinition[] = [
  // ── ELA Skills ──────────────────────────────────────────────────────────────
  {
    skillCode: 'ELA_PHONEMIC_AWARENESS',
    domain: 'ELA',
    gradeBand: 'K5',
    displayName: 'Phonemic Awareness',
    description:
      'Understanding that spoken words are made up of individual sounds (phonemes) and being able to manipulate them.',
  },
  {
    skillCode: 'ELA_FLUENCY',
    domain: 'ELA',
    gradeBand: 'K5',
    displayName: 'Reading Fluency',
    description:
      'Reading text accurately, quickly, and with proper expression. Foundation for comprehension.',
    prerequisites: ['ELA_PHONEMIC_AWARENESS'],
  },
  {
    skillCode: 'ELA_VOCABULARY',
    domain: 'ELA',
    gradeBand: 'K5',
    displayName: 'Vocabulary Development',
    description:
      'Building a rich vocabulary through reading and direct instruction. Understanding word meanings in context.',
    prerequisites: ['ELA_PHONEMIC_AWARENESS'],
  },
  {
    skillCode: 'ELA_COMPREHENSION',
    domain: 'ELA',
    gradeBand: 'K5',
    displayName: 'Reading Comprehension',
    description:
      'Understanding and interpreting what is read. Making inferences, identifying main ideas, and analyzing text.',
    prerequisites: ['ELA_FLUENCY', 'ELA_VOCABULARY'],
  },
  {
    skillCode: 'ELA_WRITING',
    domain: 'ELA',
    gradeBand: 'K5',
    displayName: 'Written Expression',
    description:
      'Expressing ideas clearly in writing. Includes grammar, sentence structure, and organization.',
    prerequisites: ['ELA_VOCABULARY', 'ELA_COMPREHENSION'],
  },

  // ── Math Skills ─────────────────────────────────────────────────────────────
  {
    skillCode: 'MATH_NUMBER_SENSE',
    domain: 'MATH',
    gradeBand: 'K5',
    displayName: 'Number Sense',
    description:
      'Understanding numbers, their relationships, and magnitude. Foundation for all mathematical thinking.',
  },
  {
    skillCode: 'MATH_OPERATIONS',
    domain: 'MATH',
    gradeBand: 'K5',
    displayName: 'Basic Operations',
    description:
      'Fluency with addition, subtraction, multiplication, and division of whole numbers.',
    prerequisites: ['MATH_NUMBER_SENSE'],
  },
  {
    skillCode: 'MATH_FRACTIONS',
    domain: 'MATH',
    gradeBand: 'K5',
    displayName: 'Fractions & Decimals',
    description: 'Understanding and operating with fractions, decimals, and their relationships.',
    prerequisites: ['MATH_OPERATIONS'],
  },
  {
    skillCode: 'MATH_GEOMETRY',
    domain: 'MATH',
    gradeBand: 'K5',
    displayName: 'Geometry Basics',
    description: 'Understanding shapes, spatial relationships, and basic geometric concepts.',
    prerequisites: ['MATH_NUMBER_SENSE'],
  },
  {
    skillCode: 'MATH_PROBLEM_SOLVING',
    domain: 'MATH',
    gradeBand: 'K5',
    displayName: 'Mathematical Problem Solving',
    description: 'Applying mathematical concepts to solve real-world and abstract problems.',
    prerequisites: ['MATH_OPERATIONS', 'MATH_FRACTIONS', 'MATH_GEOMETRY'],
  },

  // ── Science Skills ──────────────────────────────────────────────────────────
  {
    skillCode: 'SCI_OBSERVATION',
    domain: 'SCIENCE',
    gradeBand: 'K5',
    displayName: 'Scientific Observation',
    description:
      'Using senses and tools to gather information about the natural world. Recording observations accurately.',
  },
  {
    skillCode: 'SCI_HYPOTHESIS',
    domain: 'SCIENCE',
    gradeBand: 'K5',
    displayName: 'Forming Hypotheses',
    description:
      'Making educated predictions based on observations. Understanding testable vs. non-testable questions.',
    prerequisites: ['SCI_OBSERVATION'],
  },
  {
    skillCode: 'SCI_EXPERIMENT',
    domain: 'SCIENCE',
    gradeBand: 'K5',
    displayName: 'Experimental Design',
    description: 'Planning and conducting fair tests. Understanding variables and controls.',
    prerequisites: ['SCI_HYPOTHESIS'],
  },
  {
    skillCode: 'SCI_DATA',
    domain: 'SCIENCE',
    gradeBand: 'K5',
    displayName: 'Data Collection & Analysis',
    description: 'Organizing, representing, and interpreting data from investigations.',
    prerequisites: ['SCI_EXPERIMENT'],
  },
  {
    skillCode: 'SCI_CONCLUSION',
    domain: 'SCIENCE',
    gradeBand: 'K5',
    displayName: 'Drawing Conclusions',
    description: 'Using evidence to support claims. Communicating findings effectively.',
    prerequisites: ['SCI_DATA'],
  },

  // ── Speech & Language Skills ────────────────────────────────────────────────
  {
    skillCode: 'SPEECH_ARTICULATION',
    domain: 'SPEECH',
    gradeBand: 'K5',
    displayName: 'Articulation',
    description: 'Producing speech sounds correctly. Clear pronunciation of words and phrases.',
  },
  {
    skillCode: 'SPEECH_FLUENCY',
    domain: 'SPEECH',
    gradeBand: 'K5',
    displayName: 'Speech Fluency',
    description: 'Speaking smoothly without disruptions. Managing disfluencies if present.',
    prerequisites: ['SPEECH_ARTICULATION'],
  },
  {
    skillCode: 'SPEECH_VOICE',
    domain: 'SPEECH',
    gradeBand: 'K5',
    displayName: 'Voice Control',
    description: 'Using appropriate volume, pitch, and quality. Projecting voice effectively.',
    prerequisites: ['SPEECH_ARTICULATION'],
  },
  {
    skillCode: 'SPEECH_LANGUAGE',
    domain: 'SPEECH',
    gradeBand: 'K5',
    displayName: 'Expressive Language',
    description:
      'Using vocabulary and grammar to express ideas. Formulating sentences and narratives.',
    prerequisites: ['SPEECH_FLUENCY', 'SPEECH_VOICE'],
  },
  {
    skillCode: 'SPEECH_PRAGMATICS',
    domain: 'SPEECH',
    gradeBand: 'K5',
    displayName: 'Social Communication',
    description:
      'Using language appropriately in social contexts. Turn-taking, topic maintenance, and non-verbal cues.',
    prerequisites: ['SPEECH_LANGUAGE'],
  },

  // ── Social-Emotional Learning Skills ────────────────────────────────────────
  {
    skillCode: 'SEL_SELF_AWARENESS',
    domain: 'SEL',
    gradeBand: 'K5',
    displayName: 'Self-Awareness',
    description:
      'Recognizing own emotions, strengths, and areas for growth. Understanding how thoughts and feelings influence behavior.',
  },
  {
    skillCode: 'SEL_SELF_MANAGEMENT',
    domain: 'SEL',
    gradeBand: 'K5',
    displayName: 'Self-Management',
    description: 'Regulating emotions and behaviors. Setting and working toward personal goals.',
    prerequisites: ['SEL_SELF_AWARENESS'],
  },
  {
    skillCode: 'SEL_SOCIAL_AWARENESS',
    domain: 'SEL',
    gradeBand: 'K5',
    displayName: 'Social Awareness',
    description:
      'Understanding perspectives of others. Showing empathy and respect for diverse backgrounds.',
    prerequisites: ['SEL_SELF_AWARENESS'],
  },
  {
    skillCode: 'SEL_RELATIONSHIPS',
    domain: 'SEL',
    gradeBand: 'K5',
    displayName: 'Relationship Skills',
    description:
      'Building and maintaining healthy relationships. Communicating clearly, cooperating, and resolving conflicts.',
    prerequisites: ['SEL_SELF_MANAGEMENT', 'SEL_SOCIAL_AWARENESS'],
  },
  {
    skillCode: 'SEL_DECISIONS',
    domain: 'SEL',
    gradeBand: 'K5',
    displayName: 'Responsible Decision-Making',
    description:
      'Making constructive choices about personal behavior and social interactions. Considering ethics, safety, and consequences.',
    prerequisites: ['SEL_RELATIONSHIPS'],
  },
];

// ── Main Seed Function ────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding skills catalog...');

  // Create skills first (without prerequisites)
  const skillIdMap = new Map<string, string>();

  for (const skill of SKILLS) {
    const created = await prisma.skill.upsert({
      where: { skillCode: skill.skillCode },
      update: {
        displayName: skill.displayName,
        description: skill.description,
        domain: skill.domain,
        gradeBand: skill.gradeBand,
      },
      create: {
        skillCode: skill.skillCode,
        domain: skill.domain,
        gradeBand: skill.gradeBand,
        displayName: skill.displayName,
        description: skill.description,
      },
    });

    skillIdMap.set(skill.skillCode, created.id);
    console.log(`  ✓ ${skill.domain}/${skill.skillCode}`);
  }

  console.log(`\n📊 Created ${skillIdMap.size} skills`);

  // Now create prerequisites
  console.log('\n🔗 Creating prerequisite relationships...');

  let prereqCount = 0;

  for (const skill of SKILLS) {
    if (!skill.prerequisites || skill.prerequisites.length === 0) continue;

    const dependentId = skillIdMap.get(skill.skillCode);
    if (!dependentId) continue;

    for (const prereqCode of skill.prerequisites) {
      const prereqId = skillIdMap.get(prereqCode);
      if (!prereqId) {
        console.warn(`  ⚠️ Missing prerequisite: ${prereqCode} for ${skill.skillCode}`);
        continue;
      }

      await prisma.skillPrerequisite.upsert({
        where: {
          prerequisiteSkillId_dependentSkillId: {
            prerequisiteSkillId: prereqId,
            dependentSkillId: dependentId,
          },
        },
        update: {},
        create: {
          prerequisiteSkillId: prereqId,
          dependentSkillId: dependentId,
        },
      });

      prereqCount++;
    }
  }

  console.log(`  ✓ Created ${prereqCount} prerequisite relationships`);

  // Summary
  const skillCount = await prisma.skill.count();
  const prereqRelCount = await prisma.skillPrerequisite.count();

  console.log('\n✅ Seed complete!');
  console.log(`   Skills: ${skillCount}`);
  console.log(`   Prerequisites: ${prereqRelCount}`);
}

main()
  .catch((e: unknown) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
