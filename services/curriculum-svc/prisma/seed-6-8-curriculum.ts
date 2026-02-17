/**
 * 6-8 Middle School Curriculum Seed Data
 *
 * Seeds curriculum records for ALL subjects in grades 6-8:
 *   - ELA: Literary Analysis, Informational Text, Argumentative Writing, Vocabulary, Research
 *   - Math: Ratios & Proportional Relationships, Expressions & Equations, Geometry, Statistics
 *   - Science: Life Science, Earth & Space Science, Physical Science
 *   - Social Studies: World History, US History, Geography, Civics & Government
 *   - SEL: Identity, Stress Management, Social Awareness, Decision-Making
 *
 * Usage:
 *   npx tsx prisma/seed-6-8-curriculum.ts
 */

import 'dotenv/config';

type CurriculumStandard = 'COMMON_CORE' | 'NGSS' | 'C3' | 'STATE_SPECIFIC' | 'CUSTOM';
type GradeBand = 'PRE_K' | 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';
type SubjectArea = 'ELA' | 'MATH' | 'SCIENCE' | 'SOCIAL_STUDIES' | 'SEL' | 'ARTS' | 'WORLD_LANGUAGE' | 'PHYSICAL_ED' | 'TECHNOLOGY' | 'CAREER_TECH';
type UnitStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

const { PrismaClient } = await import('../src/generated/prisma-client/index.js');
const prisma = new PrismaClient();

const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const AUTHOR_USER_ID = '00000000-0000-0000-1000-000000000002';
const ACADEMIC_YEAR = '2025-2026';

// ─── ID generators (range 2xxxx to avoid collisions with K-5 seeds) ─────────

let curriculumCounter = 0;
function cid(): string {
  curriculumCounter++;
  return `20000000-0000-0000-0001-${String(curriculumCounter).padStart(12, '0')}`;
}

let unitCounter = 0;
function uid(): string {
  unitCounter++;
  return `20000000-0000-0000-0002-${String(unitCounter).padStart(12, '0')}`;
}

let lessonCounter = 0;
function lid(): string {
  lessonCounter++;
  return `20000000-0000-0000-0003-${String(lessonCounter).padStart(12, '0')}`;
}

let stdCounter = 0;
function sid(): string {
  stdCounter++;
  return `20000000-0000-0000-0004-${String(stdCounter).padStart(12, '0')}`;
}

interface LessonDef {
  title: string;
  objectives: string[];
  durationMin: number;
  lessonType: string;
  materials: string[];
  standardCodes: { code: string; description: string; category: string }[];
}

interface UnitDef {
  title: string;
  description: string;
  essentialQuestions: string[];
  bigIdeas: string[];
  durationDays: number;
  lessons: LessonDef[];
}

interface StrandDef {
  name: string;
  description: string;
  subject: SubjectArea;
  standard: CurriculumStandard;
  gradeBand: GradeBand;
  units: UnitDef[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELA 6-8
// ═══════════════════════════════════════════════════════════════════════════════

const ELA_68: StrandDef[] = [
  {
    name: 'Literary Analysis 6-8',
    description: 'Analyzing literature for theme, structure, characterization, and figurative language',
    subject: 'ELA',
    standard: 'COMMON_CORE',
    gradeBand: 'G6_8',
    units: [
      {
        title: 'Analyzing Narrative Structure',
        description: 'How authors structure plots and develop tension',
        essentialQuestions: ['How does plot structure create meaning?', 'What role does conflict play in a story?'],
        bigIdeas: ['Plot structure shapes the reader\'s experience', 'Conflict drives narrative development'],
        durationDays: 15,
        lessons: [
          { title: 'Elements of Plot', objectives: ['Identify exposition, rising action, climax, falling action, resolution'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Short stories', 'Plot diagram'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.6.5', description: 'Analyze how a particular sentence, chapter, scene, or stanza fits into the overall structure', category: 'Literature' }] },
          { title: 'Types of Conflict', objectives: ['Identify internal and external conflicts in literature'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Novel excerpts'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.6.3', description: 'Describe how a story\'s plot unfolds and how characters respond to events', category: 'Literature' }] },
          { title: 'Character Development', objectives: ['Analyze how characters change over the course of a text'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Character analysis chart'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.7.3', description: 'Analyze how particular elements of a story or drama interact', category: 'Literature' }] },
          { title: 'Figurative Language & Imagery', objectives: ['Identify and interpret figurative language including metaphor, simile, personification'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Poetry collection'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.7.4', description: 'Determine the meaning of words and phrases as they are used in a text', category: 'Literature' }] },
          { title: 'Theme Analysis', objectives: ['Determine theme and analyze its development through key details'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Text sets'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.8.2', description: 'Determine a theme or central idea of a text and analyze its development', category: 'Literature' }] },
        ],
      },
      {
        title: 'Argumentative Writing',
        description: 'Constructing evidence-based arguments with clear reasoning',
        essentialQuestions: ['How do we build a convincing argument?'],
        bigIdeas: ['Strong arguments use evidence and reasoning', 'Counterarguments strengthen a position'],
        durationDays: 20,
        lessons: [
          { title: 'Claims & Evidence', objectives: ['Write a clear claim and support it with relevant evidence'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Argument template'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.6.1', description: 'Write arguments to support claims with clear reasons and relevant evidence', category: 'Writing' }] },
          { title: 'Organizing an Argument', objectives: ['Organize reasons and evidence logically'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Graphic organizer'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.7.1.A', description: 'Introduce claims and organize reasons and evidence logically', category: 'Writing' }] },
          { title: 'Counterarguments', objectives: ['Acknowledge and respond to opposing viewpoints'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Debate topics'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.7.1.B', description: 'Support claims with logical reasoning and relevant evidence, acknowledging alternate claims', category: 'Writing' }] },
          { title: 'Formal Style & Tone', objectives: ['Establish and maintain a formal style in argumentative writing'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Style guide'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.8.1.D', description: 'Establish and maintain a formal style', category: 'Writing' }] },
          { title: 'Peer Review & Revision', objectives: ['Give and receive constructive feedback on argumentative essays'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Peer review rubric'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.8.5', description: 'Develop and strengthen writing by planning, revising, editing, rewriting', category: 'Writing' }] },
        ],
      },
      {
        title: 'Research & Informational Text',
        description: 'Evaluating sources, conducting research, and synthesizing information',
        essentialQuestions: ['How do we evaluate the credibility of sources?'],
        bigIdeas: ['Research requires evaluating sources for reliability', 'Synthesis creates new understanding'],
        durationDays: 15,
        lessons: [
          { title: 'Evaluating Sources', objectives: ['Assess the credibility and relevance of print and digital sources'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Source evaluation checklist'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.8.8', description: 'Gather relevant information from multiple print and digital sources', category: 'Writing' }] },
          { title: 'Note-Taking & Paraphrasing', objectives: ['Take organized notes and paraphrase information accurately'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Research notebooks'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.7.8', description: 'Gather relevant information from multiple sources', category: 'Writing' }] },
          { title: 'Synthesizing Multiple Sources', objectives: ['Synthesize information from multiple sources to answer a research question'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Source packets'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RI.8.9', description: 'Analyze a case in which two or more texts provide conflicting information', category: 'Informational Text' }] },
          { title: 'Citing Sources (MLA)', objectives: ['Properly cite sources using MLA format'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['MLA guide'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.8.8', description: 'Gather relevant information from multiple sources; assess the credibility and accuracy', category: 'Writing' }] },
          { title: 'Research Paper Draft', objectives: ['Write a focused research paper with evidence from multiple sources'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Writing tools'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.7.7', description: 'Conduct short research projects to answer a question', category: 'Writing' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MATH 6-8
// ═══════════════════════════════════════════════════════════════════════════════

const MATH_68: StrandDef[] = [
  {
    name: 'Ratios, Proportions & Pre-Algebra 6-8',
    description: 'Ratios, proportional relationships, expressions, equations, and functions',
    subject: 'MATH',
    standard: 'COMMON_CORE',
    gradeBand: 'G6_8',
    units: [
      {
        title: 'Ratios & Proportional Relationships',
        description: 'Understanding ratios and applying proportional reasoning',
        essentialQuestions: ['What is a ratio?', 'How do proportional relationships appear in real life?'],
        bigIdeas: ['Ratios compare two quantities', 'Proportional relationships have a constant rate'],
        durationDays: 15,
        lessons: [
          { title: 'Understanding Ratios', objectives: ['Write and interpret ratios in three forms'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Ratio cards', 'Manipulatives'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.6.RP.A.1', description: 'Understand the concept of a ratio', category: 'Ratios & Proportional Relationships' }] },
          { title: 'Unit Rates', objectives: ['Find unit rates and use them to solve problems'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Problem sets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.6.RP.A.2', description: 'Understand the concept of a unit rate', category: 'Ratios & Proportional Relationships' }] },
          { title: 'Proportional Relationships in Tables', objectives: ['Identify proportional relationships in tables of values'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Data tables'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.7.RP.A.2.A', description: 'Decide whether two quantities are in a proportional relationship', category: 'Ratios & Proportional Relationships' }] },
          { title: 'Graphing Proportional Relationships', objectives: ['Graph proportional relationships and interpret slope'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Graph paper', 'Calculators'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.7.RP.A.2.D', description: 'Explain what a point (x, y) on the graph means in terms of the situation', category: 'Ratios & Proportional Relationships' }] },
          { title: 'Percent Problems', objectives: ['Solve problems involving percent increase, decrease, markup, discount'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Problem sets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.7.RP.A.3', description: 'Use proportional relationships to solve multistep ratio and percent problems', category: 'Ratios & Proportional Relationships' }] },
        ],
      },
      {
        title: 'Expressions & Equations',
        description: 'Writing, evaluating, and solving algebraic expressions and equations',
        essentialQuestions: ['How do we represent unknown quantities?', 'How do we solve equations?'],
        bigIdeas: ['Variables represent unknown values', 'Equations can be solved by maintaining balance'],
        durationDays: 20,
        lessons: [
          { title: 'Writing Algebraic Expressions', objectives: ['Translate verbal expressions into algebraic expressions'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Expression cards'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.6.EE.A.2', description: 'Write, read, and evaluate expressions in which letters stand for numbers', category: 'Expressions & Equations' }] },
          { title: 'Evaluating Expressions', objectives: ['Evaluate expressions at specific values of the variable'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Worksheets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.6.EE.A.2.C', description: 'Evaluate expressions at specific values of their variables', category: 'Expressions & Equations' }] },
          { title: 'One-Step Equations', objectives: ['Solve one-step equations using inverse operations'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Algebra tiles'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.6.EE.B.7', description: 'Solve real-world and mathematical problems by writing and solving equations', category: 'Expressions & Equations' }] },
          { title: 'Two-Step Equations', objectives: ['Solve two-step equations'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Problem sets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.7.EE.B.4.A', description: 'Solve word problems leading to equations of the form px + q = r', category: 'Expressions & Equations' }] },
          { title: 'Linear Equations & Slope', objectives: ['Graph linear equations and interpret slope and y-intercept'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Graphing calculator', 'Grid paper'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.8.EE.B.6', description: 'Use similar triangles to explain why slope m is the same between any two points on a line', category: 'Expressions & Equations' }] },
        ],
      },
      {
        title: 'Geometry 6-8',
        description: 'Area, surface area, volume, angle relationships, and transformations',
        essentialQuestions: ['How do we measure 2D and 3D figures?'],
        bigIdeas: ['Geometric formulas describe measurable attributes', 'Transformations preserve or change properties'],
        durationDays: 15,
        lessons: [
          { title: 'Area of Triangles & Quadrilaterals', objectives: ['Calculate area of triangles, parallelograms, and trapezoids'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Formula sheet', 'Grid paper'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.6.G.A.1', description: 'Find the area of right triangles, other triangles, and special quadrilaterals', category: 'Geometry' }] },
          { title: 'Surface Area & Volume of Prisms', objectives: ['Calculate surface area and volume of rectangular prisms'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['3D models', 'Nets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.6.G.A.4', description: 'Represent 3D figures using nets and find surface area', category: 'Geometry' }] },
          { title: 'Circles: Circumference & Area', objectives: ['Calculate circumference and area of circles'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Compass', 'String'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.7.G.B.4', description: 'Know the formulas for the area and circumference of a circle', category: 'Geometry' }] },
          { title: 'Angle Relationships', objectives: ['Identify and solve for complementary, supplementary, and vertical angles'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Protractor'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.7.G.B.5', description: 'Use facts about supplementary, complementary, vertical, and adjacent angles', category: 'Geometry' }] },
          { title: 'Transformations', objectives: ['Describe the effects of translations, rotations, and reflections on 2D figures'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Coordinate grid', 'Tracing paper'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.8.G.A.1', description: 'Verify experimentally the properties of rotations, reflections, and translations', category: 'Geometry' }] },
        ],
      },
      {
        title: 'Statistics & Probability 6-8',
        description: 'Data distributions, measures of center, and probability',
        essentialQuestions: ['How do we analyze data?', 'What does probability tell us?'],
        bigIdeas: ['Statistical measures summarize data', 'Probability describes the likelihood of events'],
        durationDays: 12,
        lessons: [
          { title: 'Mean, Median, Mode, Range', objectives: ['Calculate and interpret measures of central tendency'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Data sets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.6.SP.B.5', description: 'Summarize numerical data sets in relation to their context', category: 'Statistics & Probability' }] },
          { title: 'Box Plots & Histograms', objectives: ['Display data using box plots and histograms'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Graph paper', 'Data sets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.6.SP.B.4', description: 'Display numerical data in plots on a number line, including dot plots, histograms, and box plots', category: 'Statistics & Probability' }] },
          { title: 'Random Sampling', objectives: ['Understand the role of random sampling in drawing inferences'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Sampling kits'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.7.SP.A.1', description: 'Understand that statistics can be used to gain information about a population', category: 'Statistics & Probability' }] },
          { title: 'Simple Probability', objectives: ['Find probability of simple and compound events'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Dice', 'Spinners', 'Coins'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.7.SP.C.5', description: 'Understand that the probability of a chance event is between 0 and 1', category: 'Statistics & Probability' }] },
          { title: 'Scatter Plots & Association', objectives: ['Construct and interpret scatter plots with lines of best fit'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Graph paper', 'Data sets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.8.SP.A.1', description: 'Construct and interpret scatter plots for bivariate measurement data', category: 'Statistics & Probability' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCIENCE 6-8
// ═══════════════════════════════════════════════════════════════════════════════

const SCIENCE_68: StrandDef[] = [
  {
    name: 'Life Science 6-8',
    description: 'Cells, body systems, genetics, and evolution',
    subject: 'SCIENCE',
    standard: 'NGSS',
    gradeBand: 'G6_8',
    units: [
      {
        title: 'Cells & Body Systems',
        description: 'Cell structure, function, and organization into body systems',
        essentialQuestions: ['How are cells organized into body systems?'],
        bigIdeas: ['Cells are the basic unit of life', 'Body systems work together to maintain homeostasis'],
        durationDays: 20,
        lessons: [
          { title: 'Cell Structure & Function', objectives: ['Identify major cell organelles and their functions'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Cell models', 'Microscopes'], standardCodes: [{ code: 'MS-LS1-2', description: 'Develop and use a model to describe the function of a cell as a whole', category: 'Life Science' }] },
          { title: 'Plant vs. Animal Cells', objectives: ['Compare and contrast plant and animal cells'], durationMin: 50, lessonType: 'LAB', materials: ['Microscopes', 'Prepared slides'], standardCodes: [{ code: 'MS-LS1-2', description: 'Develop and use a model to describe the function of a cell', category: 'Life Science' }] },
          { title: 'Cell Division (Mitosis)', objectives: ['Describe the stages of mitosis and its importance'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Mitosis diagrams'], standardCodes: [{ code: 'MS-LS1-4', description: 'Use argument based on evidence for how the body is a system of interacting subsystems', category: 'Life Science' }] },
          { title: 'Body Systems Overview', objectives: ['Identify major body systems and their functions'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Body system posters'], standardCodes: [{ code: 'MS-LS1-3', description: 'Use argument supported by evidence for how the body is a system of interacting subsystems', category: 'Life Science' }] },
          { title: 'System Interactions', objectives: ['Explain how two or more body systems interact'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Interaction diagrams'], standardCodes: [{ code: 'MS-LS1-3', description: 'Use argument for how the body is a system of interacting subsystems composed of groups of cells', category: 'Life Science' }] },
        ],
      },
      {
        title: 'Genetics & Heredity',
        description: 'DNA, inheritance, and genetic variation',
        essentialQuestions: ['How are traits passed from parents to offspring?'],
        bigIdeas: ['DNA carries genetic information', 'Traits are determined by genes and environment'],
        durationDays: 15,
        lessons: [
          { title: 'DNA Structure', objectives: ['Describe the structure of DNA and its role in heredity'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['DNA models'], standardCodes: [{ code: 'MS-LS3-1', description: 'Develop and use a model to describe why structural changes to genes can affect proteins', category: 'Life Science' }] },
          { title: 'Dominant & Recessive Traits', objectives: ['Use Punnett squares to predict inherited traits'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Punnett square worksheets'], standardCodes: [{ code: 'MS-LS3-2', description: 'Develop and use a model to describe why asexual reproduction results in offspring with identical genetic information', category: 'Life Science' }] },
          { title: 'Genetic Variation', objectives: ['Explain how genetic variation arises from sexual reproduction'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Variation cards'], standardCodes: [{ code: 'MS-LS3-2', description: 'Develop and use a model to describe why sexual reproduction results in offspring with genetic variation', category: 'Life Science' }] },
          { title: 'Mutations', objectives: ['Describe how mutations can affect an organism'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Mutation simulation'], standardCodes: [{ code: 'MS-LS3-1', description: 'Develop and use a model to describe why structural changes to genes can affect proteins', category: 'Life Science' }] },
          { title: 'Natural Selection', objectives: ['Explain how natural selection leads to adaptation'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Natural selection simulation'], standardCodes: [{ code: 'MS-LS4-4', description: 'Construct an explanation based on evidence that describes how genetic variations of traits in a population increase some individuals\' probability of surviving', category: 'Life Science' }] },
        ],
      },
    ],
  },
  {
    name: 'Earth & Space Science 6-8',
    description: 'Plate tectonics, weather systems, and the solar system',
    subject: 'SCIENCE',
    standard: 'NGSS',
    gradeBand: 'G6_8',
    units: [
      {
        title: 'Plate Tectonics & Earth\'s Structure',
        description: 'Earth\'s layers, plate boundaries, and geological events',
        essentialQuestions: ['How does the movement of tectonic plates shape Earth\'s surface?'],
        bigIdeas: ['Earth\'s surface is constantly changing', 'Tectonic plate movement causes earthquakes and volcanoes'],
        durationDays: 15,
        lessons: [
          { title: 'Earth\'s Layers', objectives: ['Describe the composition and properties of Earth\'s layers'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Earth model'], standardCodes: [{ code: 'MS-ESS2-1', description: 'Develop a model to describe the cycling of Earth\'s materials', category: 'Earth & Space Science' }] },
          { title: 'Plate Boundaries', objectives: ['Identify convergent, divergent, and transform boundaries'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Plate boundary maps'], standardCodes: [{ code: 'MS-ESS2-2', description: 'Construct an explanation based on evidence for how geoscience processes change Earth\'s surface', category: 'Earth & Space Science' }] },
          { title: 'Earthquakes', objectives: ['Explain how earthquakes occur and how they are measured'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Seismograph models'], standardCodes: [{ code: 'MS-ESS2-2', description: 'Construct an explanation for how geoscience processes change Earth\'s surface', category: 'Earth & Space Science' }] },
          { title: 'Volcanoes', objectives: ['Describe types of volcanoes and how they form'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Volcano models'], standardCodes: [{ code: 'MS-ESS2-2', description: 'Construct an explanation for how geoscience processes change Earth\'s surface', category: 'Earth & Space Science' }] },
          { title: 'Rock Cycle', objectives: ['Model the rock cycle and identify rock types'], durationMin: 50, lessonType: 'LAB', materials: ['Rock samples', 'Rock cycle diagram'], standardCodes: [{ code: 'MS-ESS2-1', description: 'Develop a model to describe the cycling of Earth\'s materials', category: 'Earth & Space Science' }] },
        ],
      },
    ],
  },
  {
    name: 'Physical Science 6-8',
    description: 'Forces, motion, energy, and waves',
    subject: 'SCIENCE',
    standard: 'NGSS',
    gradeBand: 'G6_8',
    units: [
      {
        title: 'Forces & Motion',
        description: 'Newton\'s Laws, gravity, and balanced/unbalanced forces',
        essentialQuestions: ['What causes objects to move or stop?'],
        bigIdeas: ['Forces cause changes in motion', 'Newton\'s Laws describe how forces act on objects'],
        durationDays: 15,
        lessons: [
          { title: 'Balanced & Unbalanced Forces', objectives: ['Distinguish between balanced and unbalanced forces and predict motion'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Spring scales', 'Carts'], standardCodes: [{ code: 'MS-PS2-2', description: 'Plan an investigation to provide evidence that the change in an object\'s motion depends on the sum of forces acting on the object', category: 'Physical Science' }] },
          { title: 'Newton\'s First Law (Inertia)', objectives: ['Explain inertia and its effect on objects at rest and in motion'], durationMin: 50, lessonType: 'LAB', materials: ['Coins', 'Cards', 'Cups'], standardCodes: [{ code: 'MS-PS2-1', description: 'Apply Newton\'s Third Law to design a solution to a problem involving the motion of two colliding objects', category: 'Physical Science' }] },
          { title: 'Newton\'s Second Law (F=ma)', objectives: ['Calculate force, mass, and acceleration using F=ma'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Calculators', 'Problem sets'], standardCodes: [{ code: 'MS-PS2-2', description: 'Plan an investigation to provide evidence that the change in motion depends on the sum of forces', category: 'Physical Science' }] },
          { title: 'Newton\'s Third Law (Action-Reaction)', objectives: ['Identify action-reaction force pairs'], durationMin: 50, lessonType: 'LAB', materials: ['Balloon rockets'], standardCodes: [{ code: 'MS-PS2-1', description: 'Apply Newton\'s Third Law to design a solution', category: 'Physical Science' }] },
          { title: 'Gravity & Friction', objectives: ['Describe how gravity and friction affect motion'], durationMin: 50, lessonType: 'LAB', materials: ['Ramps', 'Toy cars', 'Sandpaper'], standardCodes: [{ code: 'MS-PS2-4', description: 'Construct and present arguments using evidence to support the claim that gravitational interactions are attractive', category: 'Physical Science' }] },
        ],
      },
      {
        title: 'Energy',
        description: 'Forms of energy, energy transfer, and conservation',
        essentialQuestions: ['What is energy and how does it transfer?'],
        bigIdeas: ['Energy can change forms but is conserved', 'Energy transfer drives change'],
        durationDays: 15,
        lessons: [
          { title: 'Kinetic & Potential Energy', objectives: ['Distinguish between kinetic and potential energy'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Energy models'], standardCodes: [{ code: 'MS-PS3-1', description: 'Construct and interpret graphical displays of data to describe the relationships of kinetic energy', category: 'Physical Science' }] },
          { title: 'Energy Transformations', objectives: ['Trace energy transformations in systems'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Rube Goldberg materials'], standardCodes: [{ code: 'MS-PS3-5', description: 'Construct, use, and present arguments to support the claim that when the kinetic energy of an object changes, energy is transferred', category: 'Physical Science' }] },
          { title: 'Heat Transfer', objectives: ['Describe conduction, convection, and radiation'], durationMin: 50, lessonType: 'LAB', materials: ['Thermometers', 'Metal rods', 'Lamps'], standardCodes: [{ code: 'MS-PS3-3', description: 'Apply scientific principles to design a device that minimizes or maximizes thermal energy transfer', category: 'Physical Science' }] },
          { title: 'Waves & Sound', objectives: ['Describe wave properties: wavelength, frequency, amplitude'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Slinkys', 'Tuning forks'], standardCodes: [{ code: 'MS-PS4-1', description: 'Use mathematical representations to describe a simple model for waves', category: 'Physical Science' }] },
          { title: 'Light & Electromagnetic Spectrum', objectives: ['Describe the electromagnetic spectrum and properties of light'], durationMin: 50, lessonType: 'LAB', materials: ['Prisms', 'Flashlights'], standardCodes: [{ code: 'MS-PS4-2', description: 'Develop and use a model to describe that waves are reflected, absorbed, or transmitted', category: 'Physical Science' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL STUDIES 6-8
// ═══════════════════════════════════════════════════════════════════════════════

const SOCIAL_68: StrandDef[] = [
  {
    name: 'World History & Geography 6-8',
    description: 'Ancient civilizations, medieval world, and geographic reasoning',
    subject: 'SOCIAL_STUDIES',
    standard: 'C3',
    gradeBand: 'G6_8',
    units: [
      {
        title: 'Ancient Civilizations',
        description: 'Mesopotamia, Egypt, Greece, Rome, and their lasting impact',
        essentialQuestions: ['How did ancient civilizations shape the modern world?'],
        bigIdeas: ['Ancient civilizations developed key innovations', 'Geography influences civilization development'],
        durationDays: 20,
        lessons: [
          { title: 'Mesopotamia: Cradle of Civilization', objectives: ['Describe contributions of Mesopotamian civilizations'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Primary sources', 'Maps'], standardCodes: [{ code: 'D2.His.1.6-8', description: 'Analyze connections among events and developments in broader historical contexts', category: 'History' }] },
          { title: 'Ancient Egypt', objectives: ['Analyze the role of the Nile in Egyptian civilization'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Egyptian artifacts images'], standardCodes: [{ code: 'D2.His.14.6-8', description: 'Explain multiple causes and effects of events and developments', category: 'History' }] },
          { title: 'Ancient Greece: Democracy & Philosophy', objectives: ['Explain Greek contributions to democracy and philosophy'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Greek texts excerpts'], standardCodes: [{ code: 'D2.Civ.1.6-8', description: 'Distinguish the powers and responsibilities of citizens, political parties', category: 'Civics' }] },
          { title: 'Roman Republic & Empire', objectives: ['Analyze the rise and fall of the Roman Empire'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Timeline cards'], standardCodes: [{ code: 'D2.His.2.6-8', description: 'Classify series of historical events and developments as examples of change and/or continuity', category: 'History' }] },
          { title: 'Geographic Influences on Civilizations', objectives: ['Analyze how geography influenced the development of ancient civilizations'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Physical maps', 'Climate data'], standardCodes: [{ code: 'D2.Geo.4.6-8', description: 'Explain how cultural patterns and economic decisions influence environments', category: 'Geography' }] },
        ],
      },
      {
        title: 'US History: Constitution to Civil War',
        description: 'The founding era through the Civil War and Reconstruction',
        essentialQuestions: ['How did the nation grow and what tensions arose?'],
        bigIdeas: ['The Constitution established a framework for government', 'Sectionalism led to civil war'],
        durationDays: 20,
        lessons: [
          { title: 'The Constitution & Bill of Rights', objectives: ['Analyze the structure and principles of the Constitution'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Constitution text'], standardCodes: [{ code: 'D2.Civ.4.6-8', description: 'Explain the powers and limits of different levels of government', category: 'Civics' }] },
          { title: 'Westward Expansion', objectives: ['Analyze the causes and effects of westward expansion'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Maps', 'Primary sources'], standardCodes: [{ code: 'D2.His.14.6-8', description: 'Explain multiple causes and effects of events', category: 'History' }] },
          { title: 'Slavery & Abolition', objectives: ['Examine the institution of slavery and the abolitionist movement'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Primary source documents'], standardCodes: [{ code: 'D2.His.5.6-8', description: 'Explain how and why perspectives of people have changed over time', category: 'History' }] },
          { title: 'Causes of the Civil War', objectives: ['Analyze the political, economic, and social causes of the Civil War'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Document analysis packets'], standardCodes: [{ code: 'D2.His.14.6-8', description: 'Explain multiple causes and effects of events and developments', category: 'History' }] },
          { title: 'Civil War & Reconstruction', objectives: ['Evaluate the outcomes of the Civil War and Reconstruction'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Reconstruction documents'], standardCodes: [{ code: 'D2.His.16.6-8', description: 'Organize applicable evidence into a coherent argument about the past', category: 'History' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEL 6-8
// ═══════════════════════════════════════════════════════════════════════════════

const SEL_68: StrandDef[] = [
  {
    name: 'Social-Emotional Learning 6-8',
    description: 'Identity development, stress management, empathy, and responsible decision-making',
    subject: 'SEL',
    standard: 'CUSTOM',
    gradeBand: 'G6_8',
    units: [
      {
        title: 'Identity & Self-Awareness',
        description: 'Understanding personal identity, strengths, and growth areas',
        essentialQuestions: ['Who am I and how do I fit in?'],
        bigIdeas: ['Identity is multifaceted and evolving', 'Self-awareness enables personal growth'],
        durationDays: 10,
        lessons: [
          { title: 'My Identity Map', objectives: ['Explore dimensions of personal identity'], durationMin: 40, lessonType: 'WORKSHOP', materials: ['Identity map template'], standardCodes: [{ code: 'CASEL.SA.4', description: 'Identify personal, cultural, and linguistic assets', category: 'Self-Awareness' }] },
          { title: 'Strengths & Growth Areas', objectives: ['Identify personal strengths and areas for improvement'], durationMin: 40, lessonType: 'WORKSHOP', materials: ['Strengths inventory'], standardCodes: [{ code: 'CASEL.SA.2', description: 'Recognize personal strengths and areas for growth', category: 'Self-Awareness' }] },
          { title: 'Managing Stress & Anxiety', objectives: ['Identify stressors and apply coping strategies'], durationMin: 40, lessonType: 'WORKSHOP', materials: ['Stress management toolkit'], standardCodes: [{ code: 'CASEL.SM.3', description: 'Identify and practice strategies to manage stress and anxiety', category: 'Self-Management' }] },
          { title: 'Empathy in Action', objectives: ['Practice perspective-taking and show empathy'], durationMin: 40, lessonType: 'WORKSHOP', materials: ['Scenario cards'], standardCodes: [{ code: 'CASEL.SO.1', description: 'Take the perspective of and empathize with others', category: 'Social Awareness' }] },
          { title: 'Responsible Decision-Making', objectives: ['Apply a decision-making framework to real-life scenarios'], durationMin: 40, lessonType: 'WORKSHOP', materials: ['Decision matrix'], standardCodes: [{ code: 'CASEL.RDM.1', description: 'Demonstrate curiosity and open-mindedness when making decisions', category: 'Decision-Making' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL SUBJECTS 6-8: ARTS, TECHNOLOGY, PHYSICAL ED
// ═══════════════════════════════════════════════════════════════════════════════

const ARTS_68: StrandDef[] = [
  {
    name: 'Visual & Performing Arts 6-8',
    description: 'Art fundamentals including elements of art, design principles, and creative expression',
    subject: 'ARTS',
    standard: 'CUSTOM',
    gradeBand: 'G6_8',
    units: [
      {
        title: 'Elements of Art & Design',
        description: 'Line, shape, color, value, texture, form, and space',
        essentialQuestions: ['How do artists use the elements of art to create meaning?'],
        bigIdeas: ['Art elements are the building blocks of visual expression', 'Design principles organize elements effectively'],
        durationDays: 15,
        lessons: [
          { title: 'Line, Shape & Form', objectives: ['Use line, shape, and form to create visual compositions'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Sketchbooks', 'Drawing pencils'], standardCodes: [{ code: 'VA.CR.1.6', description: 'Combine concepts collaboratively to generate innovative ideas for creating art', category: 'Visual Arts' }] },
          { title: 'Color Theory', objectives: ['Apply color theory including primary, secondary, complementary colors'], durationMin: 50, lessonType: 'LAB', materials: ['Paints', 'Color wheel'], standardCodes: [{ code: 'VA.CR.2.6', description: 'Demonstrate openness in trying new ideas, materials, methods', category: 'Visual Arts' }] },
          { title: 'Value & Shading', objectives: ['Create value scales and apply shading techniques'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Drawing pencils', 'Charcoal'], standardCodes: [{ code: 'VA.CR.2.7', description: 'Demonstrate persistence in developing skills with various materials', category: 'Visual Arts' }] },
          { title: 'Perspective Drawing', objectives: ['Draw using one-point and two-point perspective'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Rulers', 'Grid paper'], standardCodes: [{ code: 'VA.CR.2.8', description: 'Demonstrate willingness to experiment, innovate, and take risks', category: 'Visual Arts' }] },
          { title: 'Art Critique & Reflection', objectives: ['Analyze and interpret works of art using critical vocabulary'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Art reproductions'], standardCodes: [{ code: 'VA.RE.7.6', description: 'Identify and interpret works of art that reveal how people live around the world', category: 'Visual Arts' }] },
        ],
      },
    ],
  },
];

const TECH_68: StrandDef[] = [
  {
    name: 'Digital Literacy & Technology 6-8',
    description: 'Digital citizenship, computational thinking, and basic programming',
    subject: 'TECHNOLOGY',
    standard: 'CUSTOM',
    gradeBand: 'G6_8',
    units: [
      {
        title: 'Digital Citizenship & Computational Thinking',
        description: 'Online safety, responsible use, and introductory programming concepts',
        essentialQuestions: ['How do we use technology responsibly?', 'What is computational thinking?'],
        bigIdeas: ['Digital citizens use technology ethically', 'Computational thinking breaks down complex problems'],
        durationDays: 15,
        lessons: [
          { title: 'Digital Footprint & Privacy', objectives: ['Understand digital footprint and protect personal information online'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Digital citizenship resources'], standardCodes: [{ code: 'ISTE.2.A', description: 'Cultivate and manage digital identity and reputation', category: 'Digital Citizenship' }] },
          { title: 'Cyberbullying Prevention', objectives: ['Identify cyberbullying and know how to respond'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Scenario cards'], standardCodes: [{ code: 'ISTE.2.B', description: 'Engage in positive, safe, legal, and ethical behavior online', category: 'Digital Citizenship' }] },
          { title: 'Introduction to Algorithms', objectives: ['Understand algorithms as step-by-step instructions'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Algorithm cards'], standardCodes: [{ code: 'ISTE.5.A', description: 'Formulate problem definitions suited for technology-assisted methods', category: 'Computational Thinker' }] },
          { title: 'Block-Based Programming', objectives: ['Create simple programs using block-based coding (Scratch)'], durationMin: 50, lessonType: 'LAB', materials: ['Computers', 'Scratch software'], standardCodes: [{ code: 'ISTE.5.D', description: 'Understand how automation works and use algorithmic thinking', category: 'Computational Thinker' }] },
          { title: 'Debugging & Iteration', objectives: ['Debug programs and iterate on designs'], durationMin: 50, lessonType: 'LAB', materials: ['Computers'], standardCodes: [{ code: 'ISTE.5.C', description: 'Break problems into component parts and develop solutions', category: 'Computational Thinker' }] },
        ],
      },
    ],
  },
];

const PE_68: StrandDef[] = [
  {
    name: 'Physical Education 6-8',
    description: 'Fitness concepts, skill development, and personal wellness',
    subject: 'PHYSICAL_ED',
    standard: 'CUSTOM',
    gradeBand: 'G6_8',
    units: [
      {
        title: 'Fitness & Wellness',
        description: 'Health-related fitness components and personal wellness planning',
        essentialQuestions: ['How does physical activity contribute to overall health?'],
        bigIdeas: ['Regular physical activity promotes health', 'Fitness has multiple components'],
        durationDays: 15,
        lessons: [
          { title: 'Components of Fitness', objectives: ['Identify the five health-related components of fitness'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Fitness cards'], standardCodes: [{ code: 'SHAPE.S3.M7.6', description: 'Identify and describe the components of skill- and health-related fitness', category: 'Physical Education' }] },
          { title: 'Cardiovascular Endurance', objectives: ['Participate in activities that build cardiovascular endurance'], durationMin: 45, lessonType: 'LAB', materials: ['Heart rate monitors'], standardCodes: [{ code: 'SHAPE.S3.M7.7', description: 'Distinguish between health- and skill-related fitness', category: 'Physical Education' }] },
          { title: 'Muscular Strength & Endurance', objectives: ['Perform exercises that develop muscular strength and endurance'], durationMin: 45, lessonType: 'LAB', materials: ['Resistance bands'], standardCodes: [{ code: 'SHAPE.S3.M7.8', description: 'Compare and contrast health-related fitness components', category: 'Physical Education' }] },
          { title: 'Flexibility & Balance', objectives: ['Demonstrate stretching and balance exercises'], durationMin: 45, lessonType: 'LAB', materials: ['Yoga mats'], standardCodes: [{ code: 'SHAPE.S3.M12.6', description: 'Identify each component of the overload principle for different types of fitness', category: 'Physical Education' }] },
          { title: 'Personal Fitness Plan', objectives: ['Create a personal fitness plan with SMART goals'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Fitness plan template'], standardCodes: [{ code: 'SHAPE.S3.M15.8', description: 'Design and implement a program of remediation for areas of weakness', category: 'Physical Education' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ALL 6-8 STRANDS
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_68_STRANDS: StrandDef[] = [
  ...ELA_68,
  ...MATH_68,
  ...SCIENCE_68,
  ...SOCIAL_68,
  ...SEL_68,
  ...ARTS_68,
  ...TECH_68,
  ...PE_68,
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEEDER
// ═══════════════════════════════════════════════════════════════════════════════

async function seedStrand(strand: StrandDef): Promise<void> {
  const curriculumId = cid();

  await prisma.curriculum.upsert({
    where: {
      tenantId_name_academicYear: {
        tenantId: DEV_TENANT_ID,
        name: strand.name,
        academicYear: ACADEMIC_YEAR,
      },
    },
    update: {},
    create: {
      id: curriculumId,
      tenantId: DEV_TENANT_ID,
      name: strand.name,
      description: strand.description,
      standard: strand.standard,
      subject: strand.subject,
      gradeBand: strand.gradeBand,
      academicYear: ACADEMIC_YEAR,
      version: 1,
      isActive: true,
      createdBy: AUTHOR_USER_ID,
    },
  });

  for (let ui = 0; ui < strand.units.length; ui++) {
    const unit = strand.units[ui];
    const unitId = uid();

    await prisma.curriculumUnit.create({
      data: {
        id: unitId,
        curriculumId,
        title: unit.title,
        description: unit.description,
        orderIndex: ui,
        essentialQuestions: unit.essentialQuestions,
        bigIdeas: unit.bigIdeas,
        durationDays: unit.durationDays,
        status: 'PUBLISHED',
      },
    });

    for (let li = 0; li < unit.lessons.length; li++) {
      const lesson = unit.lessons[li];
      const lessonId = lid();

      await prisma.lesson.create({
        data: {
          id: lessonId,
          unitId,
          title: lesson.title,
          description: lesson.objectives.join('; '),
          orderIndex: li,
          objectives: lesson.objectives,
          durationMin: lesson.durationMin,
          lessonType: lesson.lessonType,
          activities: [],
          materials: lesson.materials,
        },
      });

      for (const std of lesson.standardCodes) {
        await prisma.standardAlignment.create({
          data: {
            id: sid(),
            standardCode: std.code,
            description: std.description,
            category: std.category,
            alignmentType: 'PRIMARY',
            lessonId,
            unitId,
            curriculumId,
          },
        });
      }
    }
  }
}

async function main(): Promise<void> {
  console.log('🌱 Seeding 6-8 Curriculum (all subjects)...\n');

  let total = 0;
  let lessons = 0;
  let standards = 0;

  for (const strand of ALL_68_STRANDS) {
    const strandLessons = strand.units.reduce((a, u) => a + u.lessons.length, 0);
    const strandStandards = strand.units.reduce(
      (a, u) => a + u.lessons.reduce((b, l) => b + l.standardCodes.length, 0),
      0,
    );
    console.log(`  📚 ${strand.name} (${strand.gradeBand}): ${strand.units.length} units, ${strandLessons} lessons`);
    await seedStrand(strand);
    total += strand.units.length;
    lessons += strandLessons;
    standards += strandStandards;
  }

  console.log(`\n✅ 6-8 curriculum seeded: ${ALL_68_STRANDS.length} curricula, ${total} units, ${lessons} lessons, ${standards} standard alignments`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
