/**
 * AIVO Platform - Content Authoring Service Seed Data
 *
 * Creates:
 * - Learning objects (authored content)
 * - Learning object versions with workflow states
 * - Tags
 * - Skill alignments
 * - Workflow transitions
 * - QA checks
 * - Review notes
 * - Translations
 */

import {
  PrismaClient,
  LearningObjectSubject,
  LearningObjectGradeBand,
  LearningObjectVersionState,
  QaCheckType,
  QaCheckStatus,
  TranslationStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const AUTHOR_USER_ID = '00000000-0000-0000-1000-000000000002';
const ADMIN_USER_ID = '00000000-0000-0000-1000-000000000001';

// Learning Objects
const LO_FRACTIONS_ID = '00000000-0000-0000-ca00-000000000001';
const LO_READING_ID = '00000000-0000-0000-ca00-000000000002';
const LO_SEL_ID = '00000000-0000-0000-ca00-000000000003';
const LO_SCIENCE_ID = '00000000-0000-0000-ca00-000000000004';

// Versions
const LO_FRACTIONS_V1 = '00000000-0000-0000-ca10-000000000001';
const LO_FRACTIONS_V2 = '00000000-0000-0000-ca10-000000000002';
const LO_READING_V1 = '00000000-0000-0000-ca10-000000000010';
const LO_SEL_V1 = '00000000-0000-0000-ca10-000000000020';
const LO_SCIENCE_V1 = '00000000-0000-0000-ca10-000000000030';

// Skills (from learner-model-svc)
const SKILL_FRACTIONS = '00000000-0000-0000-f100-000000000006';
const SKILL_FRACTION_ADD = '00000000-0000-0000-f100-000000000007';
const SKILL_READING = '00000000-0000-0000-f100-000000000014';
const SKILL_VOCAB = '00000000-0000-0000-f100-000000000015';
const SKILL_SEL_AWARENESS = '00000000-0000-0000-f100-000000000020';

async function main() {
  console.log('🌱 Seeding content-authoring-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Learning Objects
  // ══════════════════════════════════════════════════════════════════════════

  const learningObjects = [
    {
      id: LO_FRACTIONS_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'intro-to-fractions-visual',
      title: 'Introduction to Fractions: A Visual Journey',
      subject: LearningObjectSubject.MATH,
      gradeBand: LearningObjectGradeBand.G3_5,
      primarySkillId: SKILL_FRACTIONS,
      isActive: true,
      createdByUserId: AUTHOR_USER_ID,
    },
    {
      id: LO_READING_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'reading-comprehension-strategies',
      title: 'Reading Detective: Finding Clues in Text',
      subject: LearningObjectSubject.ELA,
      gradeBand: LearningObjectGradeBand.G3_5,
      primarySkillId: SKILL_READING,
      isActive: true,
      createdByUserId: AUTHOR_USER_ID,
    },
    {
      id: LO_SEL_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'feelings-journal-activity',
      title: 'My Feelings Journal',
      subject: LearningObjectSubject.SEL,
      gradeBand: LearningObjectGradeBand.K_2,
      primarySkillId: SKILL_SEL_AWARENESS,
      isActive: true,
      createdByUserId: AUTHOR_USER_ID,
    },
    {
      id: LO_SCIENCE_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'life-cycle-butterfly',
      title: 'The Amazing Butterfly Life Cycle',
      subject: LearningObjectSubject.SCIENCE,
      gradeBand: LearningObjectGradeBand.K_2,
      isActive: true,
      createdByUserId: AUTHOR_USER_ID,
    },
  ];

  for (const lo of learningObjects) {
    await prisma.learningObject.upsert({
      where: { id: lo.id },
      update: {},
      create: lo,
    });
  }
  console.log(`  ✅ Created ${learningObjects.length} learning objects`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Learning Object Versions
  // ══════════════════════════════════════════════════════════════════════════

  const versions = [
    // Fractions V1 - Published
    {
      id: LO_FRACTIONS_V1,
      learningObjectId: LO_FRACTIONS_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.PUBLISHED,
      createdByUserId: AUTHOR_USER_ID,
      reviewedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      changeSummary: 'Initial version with visual fraction representations',
      contentJson: {
        type: 'interactive_lesson',
        sections: [
          { type: 'intro', content: 'Welcome to the world of fractions!' },
          { type: 'visual', content: 'pie_chart_fraction_demo' },
          { type: 'practice', questions: 5 },
          { type: 'summary', content: 'Great job learning about fractions!' },
        ],
        estimatedMinutes: 15,
      },
      accessibilityJson: {
        hasAltText: true,
        hasClosedCaptions: true,
        cognitiveLoad: 'MEDIUM',
        readingLevel: 3.5,
      },
      standardsJson: {
        commonCore: ['3.NF.A.1', '3.NF.A.2'],
      },
      publishedAt: new Date('2024-01-01'),
    },
    // Fractions V2 - Draft (improvements in progress)
    {
      id: LO_FRACTIONS_V2,
      learningObjectId: LO_FRACTIONS_ID,
      versionNumber: 2,
      state: LearningObjectVersionState.DRAFT,
      createdByUserId: AUTHOR_USER_ID,
      changeSummary: 'Adding interactive pizza fraction builder',
      contentJson: {
        type: 'interactive_lesson',
        sections: [
          { type: 'intro', content: 'Welcome to the world of fractions!' },
          { type: 'visual', content: 'pie_chart_fraction_demo' },
          { type: 'interactive', content: 'pizza_fraction_builder' },
          { type: 'practice', questions: 8 },
          { type: 'summary', content: 'Great job learning about fractions!' },
        ],
        estimatedMinutes: 18,
      },
      accessibilityJson: {
        hasAltText: true,
        hasClosedCaptions: true,
        cognitiveLoad: 'MEDIUM',
        readingLevel: 3.5,
      },
      standardsJson: {
        commonCore: ['3.NF.A.1', '3.NF.A.2', '3.NF.A.3'],
      },
    },
    // Reading V1 - In Review
    {
      id: LO_READING_V1,
      learningObjectId: LO_READING_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.IN_REVIEW,
      createdByUserId: AUTHOR_USER_ID,
      changeSummary: 'Initial reading comprehension lesson with detective theme',
      contentJson: {
        type: 'guided_reading',
        passage: {
          title: 'The Mystery of the Missing Cookies',
          text: 'One day, Max came home from school...',
          wordCount: 250,
        },
        questions: [
          { type: 'literal', question: 'Who came home from school?' },
          { type: 'inferential', question: 'How did Max feel?' },
          { type: 'vocabulary', question: 'What does "mysterious" mean?' },
        ],
        estimatedMinutes: 12,
      },
      accessibilityJson: {
        hasAltText: true,
        textToSpeech: true,
        highlightOnRead: true,
        readingLevel: 3.2,
      },
      standardsJson: {
        commonCore: ['RL.3.1', 'RL.3.4'],
      },
    },
    // SEL V1 - Approved (ready to publish)
    {
      id: LO_SEL_V1,
      learningObjectId: LO_SEL_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.APPROVED,
      createdByUserId: AUTHOR_USER_ID,
      reviewedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      changeSummary: 'Feelings journal with emoji selector and prompts',
      contentJson: {
        type: 'interactive_activity',
        components: [
          { type: 'emotion_picker', emotions: ['happy', 'sad', 'angry', 'scared', 'excited', 'calm'] },
          { type: 'journal_prompt', prompts: ['Today I feel... because...', 'Something that made me happy was...'] },
          { type: 'drawing_canvas', prompt: 'Draw how you feel' },
        ],
        estimatedMinutes: 8,
      },
      accessibilityJson: {
        hasAltText: true,
        colorBlindFriendly: true,
        cognitiveLoad: 'LOW',
      },
      standardsJson: {
        casel: ['Self-Awareness', 'Self-Management'],
      },
    },
    // Science V1 - Draft
    {
      id: LO_SCIENCE_V1,
      learningObjectId: LO_SCIENCE_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.DRAFT,
      createdByUserId: AUTHOR_USER_ID,
      changeSummary: 'Interactive butterfly life cycle with animations',
      contentJson: {
        type: 'animated_lesson',
        stages: ['egg', 'caterpillar', 'chrysalis', 'butterfly'],
        animations: true,
        quiz: true,
        estimatedMinutes: 10,
      },
      accessibilityJson: {
        hasAltText: true,
        hasClosedCaptions: true,
        reducedMotionOption: true,
      },
      standardsJson: {
        ngss: ['2-LS4-1'],
      },
    },
  ];

  for (const version of versions) {
    await prisma.learningObjectVersion.upsert({
      where: { id: version.id },
      update: {},
      create: {
        ...version,
        metadataJson: {},
      },
    });
  }
  console.log(`  ✅ Created ${versions.length} learning object versions`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Tags
  // ══════════════════════════════════════════════════════════════════════════

  const tags = [
    { id: '00000000-0000-0000-ca20-000000000001', learningObjectId: LO_FRACTIONS_ID, tag: 'visual-learning' },
    { id: '00000000-0000-0000-ca20-000000000002', learningObjectId: LO_FRACTIONS_ID, tag: 'fractions' },
    { id: '00000000-0000-0000-ca20-000000000003', learningObjectId: LO_FRACTIONS_ID, tag: 'interactive' },
    { id: '00000000-0000-0000-ca20-000000000004', learningObjectId: LO_READING_ID, tag: 'reading-comprehension' },
    { id: '00000000-0000-0000-ca20-000000000005', learningObjectId: LO_READING_ID, tag: 'detective-theme' },
    { id: '00000000-0000-0000-ca20-000000000006', learningObjectId: LO_SEL_ID, tag: 'feelings' },
    { id: '00000000-0000-0000-ca20-000000000007', learningObjectId: LO_SEL_ID, tag: 'journaling' },
    { id: '00000000-0000-0000-ca20-000000000008', learningObjectId: LO_SCIENCE_ID, tag: 'life-science' },
    { id: '00000000-0000-0000-ca20-000000000009', learningObjectId: LO_SCIENCE_ID, tag: 'butterflies' },
    { id: '00000000-0000-0000-ca20-00000000000a', learningObjectId: LO_SCIENCE_ID, tag: 'animations' },
  ];

  for (const tag of tags) {
    await prisma.learningObjectTag.upsert({
      where: { id: tag.id },
      update: {},
      create: tag,
    });
  }
  console.log(`  ✅ Created ${tags.length} tags`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Skill Alignments
  // ══════════════════════════════════════════════════════════════════════════

  const skills = [
    { id: '00000000-0000-0000-ca30-000000000001', learningObjectVersionId: LO_FRACTIONS_V1, skillId: SKILL_FRACTIONS, isPrimary: true, weight: new Decimal(0.7) },
    { id: '00000000-0000-0000-ca30-000000000002', learningObjectVersionId: LO_FRACTIONS_V1, skillId: SKILL_FRACTION_ADD, isPrimary: false, weight: new Decimal(0.3) },
    { id: '00000000-0000-0000-ca30-000000000003', learningObjectVersionId: LO_READING_V1, skillId: SKILL_READING, isPrimary: true, weight: new Decimal(0.6) },
    { id: '00000000-0000-0000-ca30-000000000004', learningObjectVersionId: LO_READING_V1, skillId: SKILL_VOCAB, isPrimary: false, weight: new Decimal(0.4) },
    { id: '00000000-0000-0000-ca30-000000000005', learningObjectVersionId: LO_SEL_V1, skillId: SKILL_SEL_AWARENESS, isPrimary: true, weight: new Decimal(1.0) },
  ];

  for (const skill of skills) {
    await prisma.learningObjectSkill.upsert({
      where: { id: skill.id },
      update: {},
      create: skill,
    });
  }
  console.log(`  ✅ Created ${skills.length} skill alignments`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create QA Checks
  // ══════════════════════════════════════════════════════════════════════════

  const qaChecks = [
    // Fractions V1 checks (all passed)
    { id: '00000000-0000-0000-ca40-000000000001', learningObjectVersionId: LO_FRACTIONS_V1, checkType: QaCheckType.ACCESSIBILITY, status: QaCheckStatus.PASSED, message: 'All images have alt text', details: { imagesChecked: 8, allHaveAltText: true } },
    { id: '00000000-0000-0000-ca40-000000000002', learningObjectVersionId: LO_FRACTIONS_V1, checkType: QaCheckType.METADATA_COMPLETENESS, status: QaCheckStatus.PASSED, message: 'All required metadata fields present', details: { completeness: 100 } },
    { id: '00000000-0000-0000-ca40-000000000003', learningObjectVersionId: LO_FRACTIONS_V1, checkType: QaCheckType.CONTENT_STRUCTURE, status: QaCheckStatus.PASSED, message: 'Content structure valid', details: { sectionsValid: true } },

    // Reading V1 checks (one warning)
    { id: '00000000-0000-0000-ca40-000000000010', learningObjectVersionId: LO_READING_V1, checkType: QaCheckType.ACCESSIBILITY, status: QaCheckStatus.PASSED, message: 'Accessibility requirements met' },
    { id: '00000000-0000-0000-ca40-000000000011', learningObjectVersionId: LO_READING_V1, checkType: QaCheckType.POLICY_LANGUAGE, status: QaCheckStatus.WARNING, message: 'Consider adding more diverse character names', details: { suggestion: 'Include culturally diverse names' } },
    { id: '00000000-0000-0000-ca40-000000000012', learningObjectVersionId: LO_READING_V1, checkType: QaCheckType.SKILL_ALIGNMENT, status: QaCheckStatus.PASSED, message: 'Skills properly aligned' },

    // SEL V1 checks
    { id: '00000000-0000-0000-ca40-000000000020', learningObjectVersionId: LO_SEL_V1, checkType: QaCheckType.ACCESSIBILITY, status: QaCheckStatus.PASSED, message: 'Color blind friendly palette verified' },
    { id: '00000000-0000-0000-ca40-000000000021', learningObjectVersionId: LO_SEL_V1, checkType: QaCheckType.CONTENT_STRUCTURE, status: QaCheckStatus.PASSED, message: 'Activity structure validated' },
  ];

  for (const check of qaChecks) {
    await prisma.learningObjectVersionCheck.upsert({
      where: { id: check.id },
      update: {},
      create: {
        ...check,
        details: check.details || {},
      },
    });
  }
  console.log(`  ✅ Created ${qaChecks.length} QA checks`);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Create Workflow Transitions
  // ══════════════════════════════════════════════════════════════════════════

  const transitions = [
    // Fractions V1 workflow
    { id: '00000000-0000-0000-ca50-000000000001', versionId: LO_FRACTIONS_V1, fromState: LearningObjectVersionState.DRAFT, toState: LearningObjectVersionState.IN_REVIEW, transitionedByUserId: AUTHOR_USER_ID, reason: 'Ready for review', transitionedAt: new Date('2024-01-01T10:00:00Z') },
    { id: '00000000-0000-0000-ca50-000000000002', versionId: LO_FRACTIONS_V1, fromState: LearningObjectVersionState.IN_REVIEW, toState: LearningObjectVersionState.APPROVED, transitionedByUserId: ADMIN_USER_ID, reason: 'Approved after review', transitionedAt: new Date('2024-01-01T14:00:00Z') },
    { id: '00000000-0000-0000-ca50-000000000003', versionId: LO_FRACTIONS_V1, fromState: LearningObjectVersionState.APPROVED, toState: LearningObjectVersionState.PUBLISHED, transitionedByUserId: ADMIN_USER_ID, reason: 'Publishing to production', transitionedAt: new Date('2024-01-01T15:00:00Z') },

    // Reading V1 workflow (in review)
    { id: '00000000-0000-0000-ca50-000000000010', versionId: LO_READING_V1, fromState: LearningObjectVersionState.DRAFT, toState: LearningObjectVersionState.IN_REVIEW, transitionedByUserId: AUTHOR_USER_ID, reason: 'Submitted for review', transitionedAt: new Date('2024-01-10T09:00:00Z') },

    // SEL V1 workflow (approved)
    { id: '00000000-0000-0000-ca50-000000000020', versionId: LO_SEL_V1, fromState: LearningObjectVersionState.DRAFT, toState: LearningObjectVersionState.IN_REVIEW, transitionedByUserId: AUTHOR_USER_ID, transitionedAt: new Date('2024-01-08T10:00:00Z') },
    { id: '00000000-0000-0000-ca50-000000000021', versionId: LO_SEL_V1, fromState: LearningObjectVersionState.IN_REVIEW, toState: LearningObjectVersionState.APPROVED, transitionedByUserId: ADMIN_USER_ID, reason: 'Excellent SEL content, ready to publish', transitionedAt: new Date('2024-01-08T16:00:00Z') },
  ];

  for (const transition of transitions) {
    await prisma.learningObjectVersionTransition.upsert({
      where: { id: transition.id },
      update: {},
      create: transition,
    });
  }
  console.log(`  ✅ Created ${transitions.length} workflow transitions`);

  // ══════════════════════════════════════════════════════════════════════════
  // 7. Create Review Notes
  // ══════════════════════════════════════════════════════════════════════════

  const reviewNotes = [
    { id: '00000000-0000-0000-ca60-000000000001', learningObjectVersionId: LO_FRACTIONS_V1, authorUserId: ADMIN_USER_ID, noteText: 'Great use of visual representations. The pie chart demo is very effective.', noteType: 'APPROVAL' },
    { id: '00000000-0000-0000-ca60-000000000002', learningObjectVersionId: LO_READING_V1, authorUserId: ADMIN_USER_ID, noteText: 'Story is engaging but consider adding more diverse character names as noted in QA check.', noteType: 'FEEDBACK' },
    { id: '00000000-0000-0000-ca60-000000000003', learningObjectVersionId: LO_SEL_V1, authorUserId: ADMIN_USER_ID, noteText: 'Perfect for young learners. The emoji selector is age-appropriate and engaging.', noteType: 'APPROVAL' },
  ];

  for (const note of reviewNotes) {
    await prisma.learningObjectVersionReviewNote.upsert({
      where: { id: note.id },
      update: {},
      create: note,
    });
  }
  console.log(`  ✅ Created ${reviewNotes.length} review notes`);

  // ══════════════════════════════════════════════════════════════════════════
  // 8. Create Translations
  // ══════════════════════════════════════════════════════════════════════════

  const translations = [
    {
      id: '00000000-0000-0000-ca70-000000000001',
      learningObjectVersionId: LO_FRACTIONS_V1,
      locale: 'es',
      status: TranslationStatus.READY,
      contentJson: {
        type: 'interactive_lesson',
        sections: [
          { type: 'intro', content: '¡Bienvenido al mundo de las fracciones!' },
          { type: 'visual', content: 'pie_chart_fraction_demo' },
          { type: 'practice', questions: 5 },
          { type: 'summary', content: '¡Excelente trabajo aprendiendo sobre fracciones!' },
        ],
      },
      accessibilityJson: {
        hasAltText: true,
        altTextTranslated: true,
      },
      translatedByUserId: AUTHOR_USER_ID,
      reviewedByUserId: ADMIN_USER_ID,
    },
    {
      id: '00000000-0000-0000-ca70-000000000002',
      learningObjectVersionId: LO_SEL_V1,
      locale: 'es',
      status: TranslationStatus.DRAFT,
      contentJson: {
        type: 'interactive_activity',
        components: [
          { type: 'emotion_picker', emotions: ['feliz', 'triste', 'enojado', 'asustado', 'emocionado', 'tranquilo'] },
          { type: 'journal_prompt', prompts: ['Hoy me siento... porque...', 'Algo que me hizo feliz fue...'] },
          { type: 'drawing_canvas', prompt: 'Dibuja cómo te sientes' },
        ],
      },
      accessibilityJson: {},
      translatedByUserId: AUTHOR_USER_ID,
    },
  ];

  for (const translation of translations) {
    await prisma.learningObjectTranslation.upsert({
      where: { id: translation.id },
      update: {},
      create: {
        ...translation,
        metadataJson: {},
      },
    });
  }
  console.log(`  ✅ Created ${translations.length} translations`);

  console.log('');
  console.log('✅ content-authoring-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 4 learning objects (Math, ELA, SEL, Science)');
  console.log('  - 5 versions (1 published, 1 approved, 1 in-review, 2 draft)');
  console.log('  - 10 tags for content discovery');
  console.log('  - 5 skill alignments');
  console.log('  - 8 QA checks');
  console.log('  - 6 workflow transitions');
  console.log('  - 3 review notes');
  console.log('  - 2 Spanish translations');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
