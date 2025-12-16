/**
 * AIVO Platform - Content Service Seed Data
 *
 * Creates:
 * - Sample learning objects across subjects
 * - Learning object versions with content
 * - Tags for content discovery
 */

import {
  PrismaClient,
  LearningObjectSubject,
  LearningObjectGradeBand,
  LearningObjectVersionState,
} from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const AUTHOR_USER_ID = '00000000-0000-0000-1000-000000000002';

async function main() {
  console.log('🌱 Seeding content-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Learning Objects - Mathematics
  // ══════════════════════════════════════════════════════════════════════════

  const mathLearningObjects = [
    {
      id: '00000000-0000-0000-4000-000000000001',
      slug: 'intro-to-fractions',
      title: 'Introduction to Fractions',
      subject: LearningObjectSubject.MATH,
      gradeBand: LearningObjectGradeBand.G3_5,
      tags: ['fractions', 'numbers', 'beginner'],
      content: {
        blocks: [
          { type: 'heading', level: 1, content: 'What are Fractions?' },
          { type: 'paragraph', content: 'A fraction represents a part of a whole. Think of cutting a pizza into equal slices!' },
          { type: 'image', src: '/content/fractions/pizza-example.png', alt: 'Pizza divided into 8 slices' },
          { type: 'interactive', subtype: 'fraction-visualizer', config: { defaultNumerator: 1, defaultDenominator: 4 } },
          { type: 'paragraph', content: 'The top number (numerator) tells us how many parts we have. The bottom number (denominator) tells us how many equal parts make up the whole.' },
        ],
        estimatedMinutes: 15,
        difficulty: 'beginner',
      },
    },
    {
      id: '00000000-0000-0000-4000-000000000002',
      slug: 'adding-fractions-same-denominator',
      title: 'Adding Fractions with Same Denominators',
      subject: LearningObjectSubject.MATH,
      gradeBand: LearningObjectGradeBand.G3_5,
      tags: ['fractions', 'addition', 'operations'],
      content: {
        blocks: [
          { type: 'heading', level: 1, content: 'Adding Fractions' },
          { type: 'paragraph', content: 'When fractions have the same denominator, adding them is easy! Just add the numerators.' },
          { type: 'example', expression: '1/4 + 2/4 = 3/4' },
          { type: 'practice', problems: ['1/5 + 2/5', '3/8 + 2/8', '2/6 + 3/6'] },
        ],
        estimatedMinutes: 20,
        difficulty: 'intermediate',
        prerequisites: ['intro-to-fractions'],
      },
    },
    {
      id: '00000000-0000-0000-4000-000000000003',
      slug: 'multiplication-tables',
      title: 'Multiplication Tables 1-12',
      subject: LearningObjectSubject.MATH,
      gradeBand: LearningObjectGradeBand.K_2,
      tags: ['multiplication', 'times-tables', 'drill'],
      content: {
        blocks: [
          { type: 'heading', level: 1, content: 'Times Tables Practice' },
          { type: 'paragraph', content: 'Practice your multiplication facts with fun games and challenges!' },
          { type: 'interactive', subtype: 'times-table-drill', config: { maxFactor: 12, timeLimit: 60 } },
        ],
        estimatedMinutes: 10,
        difficulty: 'beginner',
      },
    },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Learning Objects - ELA
  // ══════════════════════════════════════════════════════════════════════════

  const elaLearningObjects = [
    {
      id: '00000000-0000-0000-4000-000000000010',
      slug: 'reading-comprehension-strategies',
      title: 'Reading Comprehension Strategies',
      subject: LearningObjectSubject.ELA,
      gradeBand: LearningObjectGradeBand.G3_5,
      tags: ['reading', 'comprehension', 'strategies'],
      content: {
        blocks: [
          { type: 'heading', level: 1, content: 'Understanding What You Read' },
          { type: 'paragraph', content: 'Good readers use strategies to help them understand and remember what they read.' },
          { type: 'list', items: ['Preview the text before reading', 'Ask questions as you read', 'Make connections to your own life', 'Visualize what\'s happening', 'Summarize in your own words'] },
        ],
        estimatedMinutes: 25,
        difficulty: 'intermediate',
      },
    },
    {
      id: '00000000-0000-0000-4000-000000000011',
      slug: 'parts-of-speech',
      title: 'Parts of Speech',
      subject: LearningObjectSubject.ELA,
      gradeBand: LearningObjectGradeBand.K_2,
      tags: ['grammar', 'nouns', 'verbs', 'adjectives'],
      content: {
        blocks: [
          { type: 'heading', level: 1, content: 'Words Have Jobs!' },
          { type: 'paragraph', content: 'Every word in a sentence has a special job. Let\'s learn about nouns, verbs, and adjectives!' },
          { type: 'definition', term: 'Noun', definition: 'A person, place, thing, or idea' },
          { type: 'definition', term: 'Verb', definition: 'An action word - something you can do' },
          { type: 'definition', term: 'Adjective', definition: 'A describing word' },
          { type: 'interactive', subtype: 'word-sort', config: { categories: ['Noun', 'Verb', 'Adjective'] } },
        ],
        estimatedMinutes: 15,
        difficulty: 'beginner',
      },
    },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Learning Objects - Science
  // ══════════════════════════════════════════════════════════════════════════

  const scienceLearningObjects = [
    {
      id: '00000000-0000-0000-4000-000000000020',
      slug: 'water-cycle',
      title: 'The Water Cycle',
      subject: LearningObjectSubject.SCIENCE,
      gradeBand: LearningObjectGradeBand.G3_5,
      tags: ['water-cycle', 'earth-science', 'weather'],
      content: {
        blocks: [
          { type: 'heading', level: 1, content: 'The Amazing Water Cycle' },
          { type: 'paragraph', content: 'Water is always moving! It goes up into the sky and comes back down as rain or snow.' },
          { type: 'image', src: '/content/science/water-cycle-diagram.png', alt: 'Water cycle diagram' },
          { type: 'definition', term: 'Evaporation', definition: 'When water heats up and turns into water vapor' },
          { type: 'definition', term: 'Condensation', definition: 'When water vapor cools and forms clouds' },
          { type: 'definition', term: 'Precipitation', definition: 'When water falls from clouds as rain, snow, sleet, or hail' },
          { type: 'interactive', subtype: 'water-cycle-animation', config: {} },
        ],
        estimatedMinutes: 20,
        difficulty: 'intermediate',
      },
    },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Learning Objects - SEL
  // ══════════════════════════════════════════════════════════════════════════

  const selLearningObjects = [
    {
      id: '00000000-0000-0000-4000-000000000030',
      slug: 'identifying-emotions',
      title: 'Identifying My Emotions',
      subject: LearningObjectSubject.SEL,
      gradeBand: LearningObjectGradeBand.K_2,
      tags: ['emotions', 'self-awareness', 'feelings'],
      content: {
        blocks: [
          { type: 'heading', level: 1, content: 'How Am I Feeling?' },
          { type: 'paragraph', content: 'Everyone has feelings! Learning to name your feelings helps you understand yourself better.' },
          { type: 'interactive', subtype: 'emotion-wheel', config: { emotions: ['happy', 'sad', 'angry', 'scared', 'surprised', 'calm'] } },
          { type: 'paragraph', content: 'It\'s okay to feel any emotion. What matters is how we handle our feelings.' },
        ],
        estimatedMinutes: 10,
        difficulty: 'beginner',
      },
    },
    {
      id: '00000000-0000-0000-4000-000000000031',
      slug: 'calm-down-strategies',
      title: 'Calm Down Strategies',
      subject: LearningObjectSubject.SEL,
      gradeBand: LearningObjectGradeBand.K_2,
      tags: ['self-regulation', 'calm', 'breathing'],
      content: {
        blocks: [
          { type: 'heading', level: 1, content: 'When I Need to Calm Down' },
          { type: 'paragraph', content: 'Sometimes we feel big emotions that are hard to control. Here are some things that can help:' },
          { type: 'list', items: ['Take 5 deep breaths', 'Count slowly to 10', 'Squeeze and release your hands', 'Think of a happy place', 'Talk to a trusted adult'] },
          { type: 'interactive', subtype: 'breathing-exercise', config: { type: 'box-breathing', seconds: 4 } },
        ],
        estimatedMinutes: 10,
        difficulty: 'beginner',
      },
    },
  ];

  // Combine all learning objects
  const allLearningObjects = [
    ...mathLearningObjects,
    ...elaLearningObjects,
    ...scienceLearningObjects,
    ...selLearningObjects,
  ];

  // Create each learning object with its version and tags
  for (const lo of allLearningObjects) {
    const { tags, content, ...loData } = lo;

    // Create the learning object
    const created = await prisma.learningObject.upsert({
      where: { id: lo.id },
      update: {},
      create: {
        ...loData,
        tenantId: DEV_TENANT_ID,
        createdByUserId: AUTHOR_USER_ID,
        isActive: true,
      },
    });

    // Create the initial published version
    await prisma.learningObjectVersion.upsert({
      where: {
        learningObjectId_versionNumber: {
          learningObjectId: created.id,
          versionNumber: 1,
        },
      },
      update: {},
      create: {
        learningObjectId: created.id,
        versionNumber: 1,
        state: LearningObjectVersionState.PUBLISHED,
        createdByUserId: AUTHOR_USER_ID,
        approvedByUserId: AUTHOR_USER_ID,
        contentJson: content,
        changeSummary: 'Initial version',
        publishedAt: new Date(),
      },
    });

    // Create tags
    for (const tag of tags) {
      await prisma.learningObjectTag.upsert({
        where: {
          learningObjectId_tag: {
            learningObjectId: created.id,
            tag,
          },
        },
        update: {},
        create: {
          learningObjectId: created.id,
          tag,
        },
      });
    }

    console.log(`  ✅ Created learning object: ${created.title}`);
  }

  console.log('');
  console.log('✅ content-svc seeding complete!');
  console.log('');
  console.log(`Created ${allLearningObjects.length} learning objects across:`);
  console.log(`  - Mathematics: ${mathLearningObjects.length}`);
  console.log(`  - ELA: ${elaLearningObjects.length}`);
  console.log(`  - Science: ${scienceLearningObjects.length}`);
  console.log(`  - SEL: ${selLearningObjects.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
