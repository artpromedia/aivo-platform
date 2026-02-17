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
// G6_8
const LO_RATIOS_ID = '00000000-0000-0000-ca00-000000000010';
const LO_TEXT_ANALYSIS_ID = '00000000-0000-0000-ca00-000000000011';
const LO_CELLS_ID = '00000000-0000-0000-ca00-000000000012';
const LO_CONFLICT_ID = '00000000-0000-0000-ca00-000000000013';
// G9_12
const LO_ALGEBRA_ID = '00000000-0000-0000-ca00-000000000020';
const LO_RHETORIC_ID = '00000000-0000-0000-ca00-000000000021';
const LO_CHEMISTRY_ID = '00000000-0000-0000-ca00-000000000022';
const LO_ETHICS_ID = '00000000-0000-0000-ca00-000000000023';

// Versions
const LO_FRACTIONS_V1 = '00000000-0000-0000-ca10-000000000001';
const LO_FRACTIONS_V2 = '00000000-0000-0000-ca10-000000000002';
const LO_READING_V1 = '00000000-0000-0000-ca10-000000000010';
const LO_SEL_V1 = '00000000-0000-0000-ca10-000000000020';
const LO_SCIENCE_V1 = '00000000-0000-0000-ca10-000000000030';
// G6_8 versions
const LO_RATIOS_V1 = '00000000-0000-0000-ca10-000000000040';
const LO_TEXT_ANALYSIS_V1 = '00000000-0000-0000-ca10-000000000041';
const LO_CELLS_V1 = '00000000-0000-0000-ca10-000000000042';
const LO_CONFLICT_V1 = '00000000-0000-0000-ca10-000000000043';
// G9_12 versions
const LO_ALGEBRA_V1 = '00000000-0000-0000-ca10-000000000050';
const LO_RHETORIC_V1 = '00000000-0000-0000-ca10-000000000051';
const LO_CHEMISTRY_V1 = '00000000-0000-0000-ca10-000000000052';
const LO_ETHICS_V1 = '00000000-0000-0000-ca10-000000000053';

// Skills (from learner-model-svc)
const SKILL_FRACTIONS = '00000000-0000-0000-f100-000000000006';
const SKILL_FRACTION_ADD = '00000000-0000-0000-f100-000000000007';
const SKILL_READING = '00000000-0000-0000-f100-000000000014';
const SKILL_VOCAB = '00000000-0000-0000-f100-000000000015';
const SKILL_SEL_AWARENESS = '00000000-0000-0000-f100-000000000020';
// G6_8 skills
const SKILL_RATIOS = '00000000-0000-0000-f100-000000000040';
const SKILL_TEXT_ANALYSIS = '00000000-0000-0000-f100-000000000050';
const SKILL_CELLS = '00000000-0000-0000-f100-000000000061';
const SKILL_CONFLICT_RES = '00000000-0000-0000-f100-000000000071';
// G9_12 skills
const SKILL_ALGEBRA = '00000000-0000-0000-f100-000000000080';
const SKILL_RHETORIC = '00000000-0000-0000-f100-000000000090';
const SKILL_CHEMISTRY = '00000000-0000-0000-f100-0000000000a0';
const SKILL_ETHICS = '00000000-0000-0000-f100-0000000000b0';

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

    // ── G6_8 Learning Objects ────────────────────────────────────────────

    {
      id: LO_RATIOS_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'ratios-proportions-real-world',
      title: 'Ratios & Proportions in the Real World',
      subject: LearningObjectSubject.MATH,
      gradeBand: LearningObjectGradeBand.G6_8,
      primarySkillId: SKILL_RATIOS,
      isActive: true,
      createdByUserId: AUTHOR_USER_ID,
    },
    {
      id: LO_TEXT_ANALYSIS_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'evidence-based-text-analysis',
      title: 'Evidence-Based Text Analysis',
      subject: LearningObjectSubject.ELA,
      gradeBand: LearningObjectGradeBand.G6_8,
      primarySkillId: SKILL_TEXT_ANALYSIS,
      isActive: true,
      createdByUserId: AUTHOR_USER_ID,
    },
    {
      id: LO_CELLS_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'exploring-cells-microscope',
      title: 'Exploring Cells Under the Microscope',
      subject: LearningObjectSubject.SCIENCE,
      gradeBand: LearningObjectGradeBand.G6_8,
      primarySkillId: SKILL_CELLS,
      isActive: true,
      createdByUserId: AUTHOR_USER_ID,
    },
    {
      id: LO_CONFLICT_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'navigating-conflict-constructively',
      title: 'Navigating Conflict Constructively',
      subject: LearningObjectSubject.SEL,
      gradeBand: LearningObjectGradeBand.G6_8,
      primarySkillId: SKILL_CONFLICT_RES,
      isActive: true,
      createdByUserId: AUTHOR_USER_ID,
    },

    // ── G9_12 Learning Objects ───────────────────────────────────────────

    {
      id: LO_ALGEBRA_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'algebra-equations-inequalities',
      title: 'Algebra: Equations & Inequalities',
      subject: LearningObjectSubject.MATH,
      gradeBand: LearningObjectGradeBand.G9_12,
      primarySkillId: SKILL_ALGEBRA,
      isActive: true,
      createdByUserId: AUTHOR_USER_ID,
    },
    {
      id: LO_RHETORIC_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'rhetorical-analysis-seminal-documents',
      title: 'Rhetorical Analysis of Seminal Documents',
      subject: LearningObjectSubject.ELA,
      gradeBand: LearningObjectGradeBand.G9_12,
      primarySkillId: SKILL_RHETORIC,
      isActive: true,
      createdByUserId: AUTHOR_USER_ID,
    },
    {
      id: LO_CHEMISTRY_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'atomic-structure-periodic-table',
      title: 'Atomic Structure & the Periodic Table',
      subject: LearningObjectSubject.SCIENCE,
      gradeBand: LearningObjectGradeBand.G9_12,
      primarySkillId: SKILL_CHEMISTRY,
      isActive: true,
      createdByUserId: AUTHOR_USER_ID,
    },
    {
      id: LO_ETHICS_ID,
      tenantId: DEV_TENANT_ID,
      slug: 'ethical-decision-making-scenarios',
      title: 'Ethical Decision-Making: Real-World Scenarios',
      subject: LearningObjectSubject.SEL,
      gradeBand: LearningObjectGradeBand.G9_12,
      primarySkillId: SKILL_ETHICS,
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
          {
            type: 'emotion_picker',
            emotions: ['happy', 'sad', 'angry', 'scared', 'excited', 'calm'],
          },
          {
            type: 'journal_prompt',
            prompts: ['Today I feel... because...', 'Something that made me happy was...'],
          },
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

    // ── G6_8 Versions ──────────────────────────────────────────────────

    // Ratios V1 - Published
    {
      id: LO_RATIOS_V1,
      learningObjectId: LO_RATIOS_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.PUBLISHED,
      createdByUserId: AUTHOR_USER_ID,
      reviewedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      changeSummary: 'Interactive ratios lesson with real-world scenarios',
      contentJson: {
        type: 'interactive_lesson',
        sections: [
          { type: 'intro', content: 'Ratios are everywhere — recipes, maps, and sports stats!' },
          { type: 'interactive', content: 'ratio_table_builder' },
          { type: 'scenario', content: 'recipe_scaling_challenge' },
          { type: 'practice', questions: 10 },
          { type: 'summary', content: 'You can now use ratios to solve real-world problems!' },
        ],
        estimatedMinutes: 20,
      },
      accessibilityJson: {
        hasAltText: true,
        hasClosedCaptions: true,
        cognitiveLoad: 'MEDIUM',
        readingLevel: 6.5,
      },
      standardsJson: {
        commonCore: ['6.RP.A.1', '6.RP.A.2', '6.RP.A.3'],
      },
      publishedAt: new Date('2024-03-01'),
    },

    // Text Analysis V1 - Published
    {
      id: LO_TEXT_ANALYSIS_V1,
      learningObjectId: LO_TEXT_ANALYSIS_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.PUBLISHED,
      createdByUserId: AUTHOR_USER_ID,
      reviewedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      changeSummary: 'Evidence-based analysis with guided annotation tools',
      contentJson: {
        type: 'guided_reading',
        passage: {
          title: 'The Challenge of Exploration',
          text: 'In 1804, Meriwether Lewis and William Clark set out on an expedition...',
          wordCount: 650,
        },
        questions: [
          { type: 'evidence', question: 'What evidence supports the author\'s claim about hardship?' },
          { type: 'inference', question: 'Why did the author choose to open with this scene?' },
          { type: 'vocabulary', question: 'What does "uncharted" mean in this context?' },
          { type: 'argument', question: 'Do you agree with the author\'s conclusion? Cite evidence.' },
        ],
        estimatedMinutes: 25,
      },
      accessibilityJson: {
        hasAltText: true,
        textToSpeech: true,
        highlightOnRead: true,
        readingLevel: 7.0,
      },
      standardsJson: {
        commonCore: ['RL.6.1', 'RL.6.4', 'RI.7.1'],
      },
      publishedAt: new Date('2024-03-15'),
    },

    // Cells V1 - In Review
    {
      id: LO_CELLS_V1,
      learningObjectId: LO_CELLS_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.IN_REVIEW,
      createdByUserId: AUTHOR_USER_ID,
      changeSummary: 'Virtual microscope lab with cell identification challenges',
      contentJson: {
        type: 'interactive_lab',
        components: [
          { type: 'virtual_microscope', samples: ['plant_cell', 'animal_cell', 'bacteria'] },
          { type: 'labeling', target: 'cell_diagram', labels: ['nucleus', 'membrane', 'mitochondria', 'ribosome'] },
          { type: 'comparison_table', compare: ['plant_cell', 'animal_cell'] },
          { type: 'quiz', questions: 8 },
        ],
        estimatedMinutes: 30,
      },
      accessibilityJson: {
        hasAltText: true,
        hasClosedCaptions: true,
        cognitiveLoad: 'HIGH',
        readingLevel: 7.5,
      },
      standardsJson: {
        ngss: ['MS-LS1-1', 'MS-LS1-2'],
      },
    },

    // Conflict V1 - Approved
    {
      id: LO_CONFLICT_V1,
      learningObjectId: LO_CONFLICT_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.APPROVED,
      createdByUserId: AUTHOR_USER_ID,
      reviewedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      changeSummary: 'Interactive scenarios for navigating peer conflicts',
      contentJson: {
        type: 'interactive_scenarios',
        scenarios: [
          { title: 'The Group Project', dilemma: 'A teammate isn\'t doing their share', choices: 3 },
          { title: 'The Rumor', dilemma: 'Someone is spreading false information', choices: 3 },
          { title: 'The Misunderstanding', dilemma: 'A text message was taken out of context', choices: 3 },
        ],
        reflection: { type: 'journal', prompts: ['What strategy worked best?', 'How would you feel in this situation?'] },
        estimatedMinutes: 15,
      },
      accessibilityJson: {
        hasAltText: true,
        cognitiveLoad: 'MEDIUM',
        readingLevel: 6.0,
      },
      standardsJson: {
        casel: ['Relationship Skills', 'Responsible Decision Making'],
      },
    },

    // ── G9_12 Versions ─────────────────────────────────────────────────

    // Algebra V1 - Published
    {
      id: LO_ALGEBRA_V1,
      learningObjectId: LO_ALGEBRA_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.PUBLISHED,
      createdByUserId: AUTHOR_USER_ID,
      reviewedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      changeSummary: 'Step-by-step equation solving with graphing visualizations',
      contentJson: {
        type: 'interactive_lesson',
        sections: [
          { type: 'intro', content: 'Equations are the language of algebra — let\'s decode them.' },
          { type: 'worked_example', content: 'solving_linear_equations_step_by_step' },
          { type: 'interactive', content: 'equation_balance_visualizer' },
          { type: 'graphing', content: 'desmos_linear_inequality_explorer' },
          { type: 'practice', questions: 12 },
        ],
        estimatedMinutes: 25,
      },
      accessibilityJson: {
        hasAltText: true,
        hasClosedCaptions: true,
        cognitiveLoad: 'HIGH',
        readingLevel: 9.0,
      },
      standardsJson: {
        commonCore: ['HSA-CED.A.1', 'HSA-REI.B.3', 'HSA-REI.D.10'],
      },
      publishedAt: new Date('2024-04-01'),
    },

    // Rhetoric V1 - Published
    {
      id: LO_RHETORIC_V1,
      learningObjectId: LO_RHETORIC_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.PUBLISHED,
      createdByUserId: AUTHOR_USER_ID,
      reviewedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      changeSummary: 'Rhetorical analysis of historical American documents',
      contentJson: {
        type: 'guided_reading',
        documents: [
          { title: 'Declaration of Independence (excerpt)', wordCount: 400 },
          { title: 'Letter from Birmingham Jail (excerpt)', wordCount: 500 },
        ],
        activities: [
          { type: 'annotation', tool: 'highlight_rhetorical_devices' },
          { type: 'comparison', prompt: 'Compare the rhetorical strategies used in both documents' },
          { type: 'essay', prompt: 'Analyze how the author uses ethos, pathos, and logos', minWords: 250 },
        ],
        estimatedMinutes: 40,
      },
      accessibilityJson: {
        hasAltText: true,
        textToSpeech: true,
        highlightOnRead: true,
        readingLevel: 11.0,
      },
      standardsJson: {
        commonCore: ['RI.9-10.6', 'RI.9-10.8', 'RI.9-10.9'],
      },
      publishedAt: new Date('2024-04-15'),
    },

    // Chemistry V1 - In Review
    {
      id: LO_CHEMISTRY_V1,
      learningObjectId: LO_CHEMISTRY_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.IN_REVIEW,
      createdByUserId: AUTHOR_USER_ID,
      changeSummary: 'Interactive periodic table exploration with electron configuration',
      contentJson: {
        type: 'interactive_lab',
        components: [
          { type: 'periodic_table', mode: 'interactive', highlights: ['groups', 'periods', 'trends'] },
          { type: 'electron_config', tool: 'orbital_diagram_builder' },
          { type: 'simulation', content: 'atomic_bonding_simulator' },
          { type: 'quiz', questions: 10 },
        ],
        estimatedMinutes: 35,
      },
      accessibilityJson: {
        hasAltText: true,
        hasClosedCaptions: true,
        cognitiveLoad: 'HIGH',
        readingLevel: 10.5,
      },
      standardsJson: {
        ngss: ['HS-PS1-1', 'HS-PS1-2'],
      },
    },

    // Ethics V1 - Approved
    {
      id: LO_ETHICS_V1,
      learningObjectId: LO_ETHICS_ID,
      versionNumber: 1,
      state: LearningObjectVersionState.APPROVED,
      createdByUserId: AUTHOR_USER_ID,
      reviewedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      changeSummary: 'Ethical decision-making framework with real-world dilemmas',
      contentJson: {
        type: 'interactive_scenarios',
        framework: 'ethical_decision_matrix',
        scenarios: [
          { title: 'The Scholarship Essay', dilemma: 'Discovering a friend used AI to write their essay', perspectives: 4 },
          { title: 'The Social Media Post', dilemma: 'Witnessing cyberbullying of a classmate', perspectives: 3 },
          { title: 'The Part-Time Job', dilemma: 'Pressured to falsify work hours', perspectives: 3 },
        ],
        reflection: { type: 'structured_essay', prompts: ['Evaluate the ethical implications', 'Propose an action plan'], minWords: 150 },
        estimatedMinutes: 25,
      },
      accessibilityJson: {
        hasAltText: true,
        cognitiveLoad: 'MEDIUM',
        readingLevel: 9.5,
      },
      standardsJson: {
        casel: ['Responsible Decision Making', 'Social Awareness'],
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
    {
      id: '00000000-0000-0000-ca20-000000000001',
      learningObjectId: LO_FRACTIONS_ID,
      tag: 'visual-learning',
    },
    {
      id: '00000000-0000-0000-ca20-000000000002',
      learningObjectId: LO_FRACTIONS_ID,
      tag: 'fractions',
    },
    {
      id: '00000000-0000-0000-ca20-000000000003',
      learningObjectId: LO_FRACTIONS_ID,
      tag: 'interactive',
    },
    {
      id: '00000000-0000-0000-ca20-000000000004',
      learningObjectId: LO_READING_ID,
      tag: 'reading-comprehension',
    },
    {
      id: '00000000-0000-0000-ca20-000000000005',
      learningObjectId: LO_READING_ID,
      tag: 'detective-theme',
    },
    { id: '00000000-0000-0000-ca20-000000000006', learningObjectId: LO_SEL_ID, tag: 'feelings' },
    { id: '00000000-0000-0000-ca20-000000000007', learningObjectId: LO_SEL_ID, tag: 'journaling' },
    {
      id: '00000000-0000-0000-ca20-000000000008',
      learningObjectId: LO_SCIENCE_ID,
      tag: 'life-science',
    },
    {
      id: '00000000-0000-0000-ca20-000000000009',
      learningObjectId: LO_SCIENCE_ID,
      tag: 'butterflies',
    },
    {
      id: '00000000-0000-0000-ca20-00000000000a',
      learningObjectId: LO_SCIENCE_ID,
      tag: 'animations',
    },

    // G6_8 tags
    { id: '00000000-0000-0000-ca20-000000000010', learningObjectId: LO_RATIOS_ID, tag: 'ratios' },
    { id: '00000000-0000-0000-ca20-000000000011', learningObjectId: LO_RATIOS_ID, tag: 'proportions' },
    { id: '00000000-0000-0000-ca20-000000000012', learningObjectId: LO_RATIOS_ID, tag: 'real-world-math' },
    { id: '00000000-0000-0000-ca20-000000000013', learningObjectId: LO_TEXT_ANALYSIS_ID, tag: 'text-analysis' },
    { id: '00000000-0000-0000-ca20-000000000014', learningObjectId: LO_TEXT_ANALYSIS_ID, tag: 'evidence-based' },
    { id: '00000000-0000-0000-ca20-000000000015', learningObjectId: LO_CELLS_ID, tag: 'cell-biology' },
    { id: '00000000-0000-0000-ca20-000000000016', learningObjectId: LO_CELLS_ID, tag: 'virtual-lab' },
    { id: '00000000-0000-0000-ca20-000000000017', learningObjectId: LO_CONFLICT_ID, tag: 'conflict-resolution' },
    { id: '00000000-0000-0000-ca20-000000000018', learningObjectId: LO_CONFLICT_ID, tag: 'peer-relationships' },

    // G9_12 tags
    { id: '00000000-0000-0000-ca20-000000000020', learningObjectId: LO_ALGEBRA_ID, tag: 'algebra' },
    { id: '00000000-0000-0000-ca20-000000000021', learningObjectId: LO_ALGEBRA_ID, tag: 'equations' },
    { id: '00000000-0000-0000-ca20-000000000022', learningObjectId: LO_ALGEBRA_ID, tag: 'graphing' },
    { id: '00000000-0000-0000-ca20-000000000023', learningObjectId: LO_RHETORIC_ID, tag: 'rhetorical-analysis' },
    { id: '00000000-0000-0000-ca20-000000000024', learningObjectId: LO_RHETORIC_ID, tag: 'primary-sources' },
    { id: '00000000-0000-0000-ca20-000000000025', learningObjectId: LO_CHEMISTRY_ID, tag: 'chemistry' },
    { id: '00000000-0000-0000-ca20-000000000026', learningObjectId: LO_CHEMISTRY_ID, tag: 'periodic-table' },
    { id: '00000000-0000-0000-ca20-000000000027', learningObjectId: LO_ETHICS_ID, tag: 'ethics' },
    { id: '00000000-0000-0000-ca20-000000000028', learningObjectId: LO_ETHICS_ID, tag: 'decision-making' },
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
    {
      id: '00000000-0000-0000-ca30-000000000001',
      learningObjectVersionId: LO_FRACTIONS_V1,
      skillId: SKILL_FRACTIONS,
      isPrimary: true,
      weight: new Decimal(0.7),
    },
    {
      id: '00000000-0000-0000-ca30-000000000002',
      learningObjectVersionId: LO_FRACTIONS_V1,
      skillId: SKILL_FRACTION_ADD,
      isPrimary: false,
      weight: new Decimal(0.3),
    },
    {
      id: '00000000-0000-0000-ca30-000000000003',
      learningObjectVersionId: LO_READING_V1,
      skillId: SKILL_READING,
      isPrimary: true,
      weight: new Decimal(0.6),
    },
    {
      id: '00000000-0000-0000-ca30-000000000004',
      learningObjectVersionId: LO_READING_V1,
      skillId: SKILL_VOCAB,
      isPrimary: false,
      weight: new Decimal(0.4),
    },
    {
      id: '00000000-0000-0000-ca30-000000000005',
      learningObjectVersionId: LO_SEL_V1,
      skillId: SKILL_SEL_AWARENESS,
      isPrimary: true,
      weight: new Decimal(1),
    },

    // G6_8 skills
    {
      id: '00000000-0000-0000-ca30-000000000010',
      learningObjectVersionId: LO_RATIOS_V1,
      skillId: SKILL_RATIOS,
      isPrimary: true,
      weight: new Decimal(1),
    },
    {
      id: '00000000-0000-0000-ca30-000000000011',
      learningObjectVersionId: LO_TEXT_ANALYSIS_V1,
      skillId: SKILL_TEXT_ANALYSIS,
      isPrimary: true,
      weight: new Decimal(1),
    },
    {
      id: '00000000-0000-0000-ca30-000000000012',
      learningObjectVersionId: LO_CELLS_V1,
      skillId: SKILL_CELLS,
      isPrimary: true,
      weight: new Decimal(1),
    },
    {
      id: '00000000-0000-0000-ca30-000000000013',
      learningObjectVersionId: LO_CONFLICT_V1,
      skillId: SKILL_CONFLICT_RES,
      isPrimary: true,
      weight: new Decimal(1),
    },

    // G9_12 skills
    {
      id: '00000000-0000-0000-ca30-000000000020',
      learningObjectVersionId: LO_ALGEBRA_V1,
      skillId: SKILL_ALGEBRA,
      isPrimary: true,
      weight: new Decimal(1),
    },
    {
      id: '00000000-0000-0000-ca30-000000000021',
      learningObjectVersionId: LO_RHETORIC_V1,
      skillId: SKILL_RHETORIC,
      isPrimary: true,
      weight: new Decimal(1),
    },
    {
      id: '00000000-0000-0000-ca30-000000000022',
      learningObjectVersionId: LO_CHEMISTRY_V1,
      skillId: SKILL_CHEMISTRY,
      isPrimary: true,
      weight: new Decimal(1),
    },
    {
      id: '00000000-0000-0000-ca30-000000000023',
      learningObjectVersionId: LO_ETHICS_V1,
      skillId: SKILL_ETHICS,
      isPrimary: true,
      weight: new Decimal(1),
    },
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
    {
      id: '00000000-0000-0000-ca40-000000000001',
      learningObjectVersionId: LO_FRACTIONS_V1,
      checkType: QaCheckType.ACCESSIBILITY,
      status: QaCheckStatus.PASSED,
      message: 'All images have alt text',
      details: { imagesChecked: 8, allHaveAltText: true },
    },
    {
      id: '00000000-0000-0000-ca40-000000000002',
      learningObjectVersionId: LO_FRACTIONS_V1,
      checkType: QaCheckType.METADATA_COMPLETENESS,
      status: QaCheckStatus.PASSED,
      message: 'All required metadata fields present',
      details: { completeness: 100 },
    },
    {
      id: '00000000-0000-0000-ca40-000000000003',
      learningObjectVersionId: LO_FRACTIONS_V1,
      checkType: QaCheckType.CONTENT_STRUCTURE,
      status: QaCheckStatus.PASSED,
      message: 'Content structure valid',
      details: { sectionsValid: true },
    },

    // Reading V1 checks (one warning)
    {
      id: '00000000-0000-0000-ca40-000000000010',
      learningObjectVersionId: LO_READING_V1,
      checkType: QaCheckType.ACCESSIBILITY,
      status: QaCheckStatus.PASSED,
      message: 'Accessibility requirements met',
    },
    {
      id: '00000000-0000-0000-ca40-000000000011',
      learningObjectVersionId: LO_READING_V1,
      checkType: QaCheckType.POLICY_LANGUAGE,
      status: QaCheckStatus.WARNING,
      message: 'Consider adding more diverse character names',
      details: { suggestion: 'Include culturally diverse names' },
    },
    {
      id: '00000000-0000-0000-ca40-000000000012',
      learningObjectVersionId: LO_READING_V1,
      checkType: QaCheckType.SKILL_ALIGNMENT,
      status: QaCheckStatus.PASSED,
      message: 'Skills properly aligned',
    },

    // SEL V1 checks
    {
      id: '00000000-0000-0000-ca40-000000000020',
      learningObjectVersionId: LO_SEL_V1,
      checkType: QaCheckType.ACCESSIBILITY,
      status: QaCheckStatus.PASSED,
      message: 'Color blind friendly palette verified',
    },
    {
      id: '00000000-0000-0000-ca40-000000000021',
      learningObjectVersionId: LO_SEL_V1,
      checkType: QaCheckType.CONTENT_STRUCTURE,
      status: QaCheckStatus.PASSED,
      message: 'Activity structure validated',
    },

    // G6_8 QA checks
    {
      id: '00000000-0000-0000-ca40-000000000030',
      learningObjectVersionId: LO_RATIOS_V1,
      checkType: QaCheckType.ACCESSIBILITY,
      status: QaCheckStatus.PASSED,
      message: 'All interactive elements have alt text',
    },
    {
      id: '00000000-0000-0000-ca40-000000000031',
      learningObjectVersionId: LO_RATIOS_V1,
      checkType: QaCheckType.CONTENT_STRUCTURE,
      status: QaCheckStatus.PASSED,
      message: 'Lesson structure and practice problems validated',
    },
    {
      id: '00000000-0000-0000-ca40-000000000032',
      learningObjectVersionId: LO_TEXT_ANALYSIS_V1,
      checkType: QaCheckType.ACCESSIBILITY,
      status: QaCheckStatus.PASSED,
      message: 'Text-to-speech and highlight support verified',
    },
    {
      id: '00000000-0000-0000-ca40-000000000033',
      learningObjectVersionId: LO_CELLS_V1,
      checkType: QaCheckType.ACCESSIBILITY,
      status: QaCheckStatus.WARNING,
      message: 'Virtual microscope may need keyboard navigation improvements',
      details: { suggestion: 'Add keyboard shortcuts for zoom and pan controls' },
    },
    {
      id: '00000000-0000-0000-ca40-000000000034',
      learningObjectVersionId: LO_CONFLICT_V1,
      checkType: QaCheckType.POLICY_LANGUAGE,
      status: QaCheckStatus.PASSED,
      message: 'Scenarios are age-appropriate and culturally sensitive',
    },

    // G9_12 QA checks
    {
      id: '00000000-0000-0000-ca40-000000000040',
      learningObjectVersionId: LO_ALGEBRA_V1,
      checkType: QaCheckType.CONTENT_STRUCTURE,
      status: QaCheckStatus.PASSED,
      message: 'Equation solver steps and graphing validated',
    },
    {
      id: '00000000-0000-0000-ca40-000000000041',
      learningObjectVersionId: LO_ALGEBRA_V1,
      checkType: QaCheckType.SKILL_ALIGNMENT,
      status: QaCheckStatus.PASSED,
      message: 'Standards alignment verified for HSA cluster',
    },
    {
      id: '00000000-0000-0000-ca40-000000000042',
      learningObjectVersionId: LO_RHETORIC_V1,
      checkType: QaCheckType.ACCESSIBILITY,
      status: QaCheckStatus.PASSED,
      message: 'Primary source excerpts have text-to-speech support',
    },
    {
      id: '00000000-0000-0000-ca40-000000000043',
      learningObjectVersionId: LO_CHEMISTRY_V1,
      checkType: QaCheckType.ACCESSIBILITY,
      status: QaCheckStatus.WARNING,
      message: 'Simulation requires WebGL — provide fallback for unsupported browsers',
      details: { suggestion: 'Add static diagram fallback for non-WebGL environments' },
    },
    {
      id: '00000000-0000-0000-ca40-000000000044',
      learningObjectVersionId: LO_ETHICS_V1,
      checkType: QaCheckType.POLICY_LANGUAGE,
      status: QaCheckStatus.PASSED,
      message: 'Scenarios are balanced and do not promote specific viewpoints',
    },
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
    {
      id: '00000000-0000-0000-ca50-000000000001',
      versionId: LO_FRACTIONS_V1,
      fromState: LearningObjectVersionState.DRAFT,
      toState: LearningObjectVersionState.IN_REVIEW,
      transitionedByUserId: AUTHOR_USER_ID,
      reason: 'Ready for review',
      transitionedAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000002',
      versionId: LO_FRACTIONS_V1,
      fromState: LearningObjectVersionState.IN_REVIEW,
      toState: LearningObjectVersionState.APPROVED,
      transitionedByUserId: ADMIN_USER_ID,
      reason: 'Approved after review',
      transitionedAt: new Date('2024-01-01T14:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000003',
      versionId: LO_FRACTIONS_V1,
      fromState: LearningObjectVersionState.APPROVED,
      toState: LearningObjectVersionState.PUBLISHED,
      transitionedByUserId: ADMIN_USER_ID,
      reason: 'Publishing to production',
      transitionedAt: new Date('2024-01-01T15:00:00Z'),
    },

    // Reading V1 workflow (in review)
    {
      id: '00000000-0000-0000-ca50-000000000010',
      versionId: LO_READING_V1,
      fromState: LearningObjectVersionState.DRAFT,
      toState: LearningObjectVersionState.IN_REVIEW,
      transitionedByUserId: AUTHOR_USER_ID,
      reason: 'Submitted for review',
      transitionedAt: new Date('2024-01-10T09:00:00Z'),
    },

    // SEL V1 workflow (approved)
    {
      id: '00000000-0000-0000-ca50-000000000020',
      versionId: LO_SEL_V1,
      fromState: LearningObjectVersionState.DRAFT,
      toState: LearningObjectVersionState.IN_REVIEW,
      transitionedByUserId: AUTHOR_USER_ID,
      transitionedAt: new Date('2024-01-08T10:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000021',
      versionId: LO_SEL_V1,
      fromState: LearningObjectVersionState.IN_REVIEW,
      toState: LearningObjectVersionState.APPROVED,
      transitionedByUserId: ADMIN_USER_ID,
      reason: 'Excellent SEL content, ready to publish',
      transitionedAt: new Date('2024-01-08T16:00:00Z'),
    },

    // ── G6_8 Transitions ────────────────────────────────────────────────

    // Ratios V1 workflow (published)
    {
      id: '00000000-0000-0000-ca50-000000000030',
      versionId: LO_RATIOS_V1,
      fromState: LearningObjectVersionState.DRAFT,
      toState: LearningObjectVersionState.IN_REVIEW,
      transitionedByUserId: AUTHOR_USER_ID,
      reason: 'Ready for review',
      transitionedAt: new Date('2024-03-01T09:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000031',
      versionId: LO_RATIOS_V1,
      fromState: LearningObjectVersionState.IN_REVIEW,
      toState: LearningObjectVersionState.APPROVED,
      transitionedByUserId: ADMIN_USER_ID,
      reason: 'Strong real-world connections, approved',
      transitionedAt: new Date('2024-03-01T14:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000032',
      versionId: LO_RATIOS_V1,
      fromState: LearningObjectVersionState.APPROVED,
      toState: LearningObjectVersionState.PUBLISHED,
      transitionedByUserId: ADMIN_USER_ID,
      reason: 'Publishing to production',
      transitionedAt: new Date('2024-03-01T15:00:00Z'),
    },

    // Text Analysis V1 workflow (published)
    {
      id: '00000000-0000-0000-ca50-000000000033',
      versionId: LO_TEXT_ANALYSIS_V1,
      fromState: LearningObjectVersionState.DRAFT,
      toState: LearningObjectVersionState.IN_REVIEW,
      transitionedByUserId: AUTHOR_USER_ID,
      transitionedAt: new Date('2024-03-10T09:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000034',
      versionId: LO_TEXT_ANALYSIS_V1,
      fromState: LearningObjectVersionState.IN_REVIEW,
      toState: LearningObjectVersionState.APPROVED,
      transitionedByUserId: ADMIN_USER_ID,
      transitionedAt: new Date('2024-03-12T14:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000035',
      versionId: LO_TEXT_ANALYSIS_V1,
      fromState: LearningObjectVersionState.APPROVED,
      toState: LearningObjectVersionState.PUBLISHED,
      transitionedByUserId: ADMIN_USER_ID,
      transitionedAt: new Date('2024-03-15T10:00:00Z'),
    },

    // Cells V1 workflow (in review)
    {
      id: '00000000-0000-0000-ca50-000000000036',
      versionId: LO_CELLS_V1,
      fromState: LearningObjectVersionState.DRAFT,
      toState: LearningObjectVersionState.IN_REVIEW,
      transitionedByUserId: AUTHOR_USER_ID,
      reason: 'Virtual lab ready for review',
      transitionedAt: new Date('2024-03-20T09:00:00Z'),
    },

    // Conflict V1 workflow (approved)
    {
      id: '00000000-0000-0000-ca50-000000000037',
      versionId: LO_CONFLICT_V1,
      fromState: LearningObjectVersionState.DRAFT,
      toState: LearningObjectVersionState.IN_REVIEW,
      transitionedByUserId: AUTHOR_USER_ID,
      transitionedAt: new Date('2024-03-05T10:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000038',
      versionId: LO_CONFLICT_V1,
      fromState: LearningObjectVersionState.IN_REVIEW,
      toState: LearningObjectVersionState.APPROVED,
      transitionedByUserId: ADMIN_USER_ID,
      reason: 'Scenarios are well-crafted for middle school',
      transitionedAt: new Date('2024-03-06T16:00:00Z'),
    },

    // ── G9_12 Transitions ───────────────────────────────────────────────

    // Algebra V1 workflow (published)
    {
      id: '00000000-0000-0000-ca50-000000000040',
      versionId: LO_ALGEBRA_V1,
      fromState: LearningObjectVersionState.DRAFT,
      toState: LearningObjectVersionState.IN_REVIEW,
      transitionedByUserId: AUTHOR_USER_ID,
      transitionedAt: new Date('2024-04-01T09:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000041',
      versionId: LO_ALGEBRA_V1,
      fromState: LearningObjectVersionState.IN_REVIEW,
      toState: LearningObjectVersionState.APPROVED,
      transitionedByUserId: ADMIN_USER_ID,
      transitionedAt: new Date('2024-04-01T14:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000042',
      versionId: LO_ALGEBRA_V1,
      fromState: LearningObjectVersionState.APPROVED,
      toState: LearningObjectVersionState.PUBLISHED,
      transitionedByUserId: ADMIN_USER_ID,
      transitionedAt: new Date('2024-04-01T15:00:00Z'),
    },

    // Rhetoric V1 workflow (published)
    {
      id: '00000000-0000-0000-ca50-000000000043',
      versionId: LO_RHETORIC_V1,
      fromState: LearningObjectVersionState.DRAFT,
      toState: LearningObjectVersionState.IN_REVIEW,
      transitionedByUserId: AUTHOR_USER_ID,
      transitionedAt: new Date('2024-04-10T09:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000044',
      versionId: LO_RHETORIC_V1,
      fromState: LearningObjectVersionState.IN_REVIEW,
      toState: LearningObjectVersionState.APPROVED,
      transitionedByUserId: ADMIN_USER_ID,
      transitionedAt: new Date('2024-04-12T14:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000045',
      versionId: LO_RHETORIC_V1,
      fromState: LearningObjectVersionState.APPROVED,
      toState: LearningObjectVersionState.PUBLISHED,
      transitionedByUserId: ADMIN_USER_ID,
      transitionedAt: new Date('2024-04-15T10:00:00Z'),
    },

    // Chemistry V1 workflow (in review)
    {
      id: '00000000-0000-0000-ca50-000000000046',
      versionId: LO_CHEMISTRY_V1,
      fromState: LearningObjectVersionState.DRAFT,
      toState: LearningObjectVersionState.IN_REVIEW,
      transitionedByUserId: AUTHOR_USER_ID,
      reason: 'Periodic table simulation ready for review',
      transitionedAt: new Date('2024-04-20T09:00:00Z'),
    },

    // Ethics V1 workflow (approved)
    {
      id: '00000000-0000-0000-ca50-000000000047',
      versionId: LO_ETHICS_V1,
      fromState: LearningObjectVersionState.DRAFT,
      toState: LearningObjectVersionState.IN_REVIEW,
      transitionedByUserId: AUTHOR_USER_ID,
      transitionedAt: new Date('2024-04-05T10:00:00Z'),
    },
    {
      id: '00000000-0000-0000-ca50-000000000048',
      versionId: LO_ETHICS_V1,
      fromState: LearningObjectVersionState.IN_REVIEW,
      toState: LearningObjectVersionState.APPROVED,
      transitionedByUserId: ADMIN_USER_ID,
      reason: 'Well-balanced ethical scenarios for high school',
      transitionedAt: new Date('2024-04-06T16:00:00Z'),
    },
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
    {
      id: '00000000-0000-0000-ca60-000000000001',
      learningObjectVersionId: LO_FRACTIONS_V1,
      authorUserId: ADMIN_USER_ID,
      noteText: 'Great use of visual representations. The pie chart demo is very effective.',
      noteType: 'APPROVAL',
    },
    {
      id: '00000000-0000-0000-ca60-000000000002',
      learningObjectVersionId: LO_READING_V1,
      authorUserId: ADMIN_USER_ID,
      noteText:
        'Story is engaging but consider adding more diverse character names as noted in QA check.',
      noteType: 'FEEDBACK',
    },
    {
      id: '00000000-0000-0000-ca60-000000000003',
      learningObjectVersionId: LO_SEL_V1,
      authorUserId: ADMIN_USER_ID,
      noteText: 'Perfect for young learners. The emoji selector is age-appropriate and engaging.',
      noteType: 'APPROVAL',
    },
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
          {
            type: 'emotion_picker',
            emotions: ['feliz', 'triste', 'enojado', 'asustado', 'emocionado', 'tranquilo'],
          },
          {
            type: 'journal_prompt',
            prompts: ['Hoy me siento... porque...', 'Algo que me hizo feliz fue...'],
          },
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
  console.log('  - 12 learning objects (4 per grade band: K_2, G3_5, G6_8, G9_12)');
  console.log('  - 13 versions (5 published, 2 approved, 2 in-review, 4 draft)');
  console.log('  - 28 tags for content discovery');
  console.log('  - 13 skill alignments');
  console.log('  - 19 QA checks');
  console.log('  - 22 workflow transitions');
  console.log('  - 3 review notes');
  console.log('  - 2 Spanish translations');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
