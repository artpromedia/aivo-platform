/**
 * 9-12 High School Curriculum Seed Data
 *
 * Seeds curriculum records for ALL subjects in grades 9-12:
 *   - ELA: American Literature, British/World Literature, Rhetoric & Composition, AP Language
 *   - Math: Algebra I, Geometry, Algebra II, Pre-Calculus / Statistics
 *   - Science: Biology, Chemistry, Physics, Environmental Science
 *   - Social Studies: World History, US History, Government & Civics, Economics
 *   - SEL: Self-Management, College & Career Readiness, Leadership
 *   - Arts: Studio Art, Music Theory
 *   - Technology: Computer Science Fundamentals
 *   - World Language: Spanish I Foundations
 *   - Career & Technical Education: Career Exploration
 *
 * Usage:
 *   npx tsx prisma/seed-9-12-curriculum.ts
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

// ─── ID generators (range 3xxxx to avoid collisions) ────────────────────────

let curriculumCounter = 0;
function cid(): string {
  curriculumCounter++;
  return `30000000-0000-0000-0001-${String(curriculumCounter).padStart(12, '0')}`;
}

let unitCounter = 0;
function uid(): string {
  unitCounter++;
  return `30000000-0000-0000-0002-${String(unitCounter).padStart(12, '0')}`;
}

let lessonCounter = 0;
function lid(): string {
  lessonCounter++;
  return `30000000-0000-0000-0003-${String(lessonCounter).padStart(12, '0')}`;
}

let stdCounter = 0;
function sid(): string {
  stdCounter++;
  return `30000000-0000-0000-0004-${String(stdCounter).padStart(12, '0')}`;
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
// ELA 9-12
// ═══════════════════════════════════════════════════════════════════════════════

const ELA_912: StrandDef[] = [
  {
    name: 'American Literature 9-12',
    description: 'Survey of American literature from colonial period to contemporary works',
    subject: 'ELA',
    standard: 'COMMON_CORE',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'Early American Literature & Rhetoric',
        description: 'Colonial and revolutionary-era texts including speeches, sermons, and founding documents',
        essentialQuestions: ['How did early writers define American identity?'],
        bigIdeas: ['Literature reflects cultural values', 'Rhetoric shapes political movements'],
        durationDays: 15,
        lessons: [
          { title: 'Puritan Literature & Sermons', objectives: ['Analyze the rhetorical strategies in Puritan sermons'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Sinners in the Hands of an Angry God excerpts'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RI.11-12.6', description: 'Determine an author\'s point of view or purpose in a text with effective rhetoric', category: 'Informational Text' }] },
          { title: 'Founding Documents', objectives: ['Analyze the rhetoric in the Declaration of Independence and Federalist Papers'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Founding document excerpts'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RI.11-12.9', description: 'Analyze seminal U.S. documents of historical and literary significance', category: 'Informational Text' }] },
          { title: 'Transcendentalism', objectives: ['Analyze themes in works by Emerson and Thoreau'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Self-Reliance, Walden excerpts'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.11-12.2', description: 'Determine two or more themes or central ideas and analyze their development', category: 'Literature' }] },
          { title: 'The American Renaissance', objectives: ['Analyze symbolism and allegory in Hawthorne and Melville'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Novel excerpts'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.11-12.4', description: 'Determine the meaning of words and phrases including figurative and connotative meanings', category: 'Literature' }] },
          { title: 'Slave Narratives & Abolitionist Literature', objectives: ['Analyze the rhetorical power of slave narratives'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Douglass Narrative excerpts'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RI.11-12.6', description: 'Determine an author\'s point of view or purpose', category: 'Informational Text' }] },
        ],
      },
      {
        title: 'Modern & Contemporary American Literature',
        description: 'Twentieth-century and contemporary American fiction, poetry, and drama',
        essentialQuestions: ['How does literature reflect social change?'],
        bigIdeas: ['Literature challenges and reflects society', 'Diverse voices enrich literary tradition'],
        durationDays: 20,
        lessons: [
          { title: 'The Harlem Renaissance', objectives: ['Analyze poetry and prose from the Harlem Renaissance'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Hughes, Hurston collections'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.11-12.3', description: 'Analyze the impact of the author\'s choices regarding how to develop and relate elements of a story', category: 'Literature' }] },
          { title: 'The Great Gatsby & the American Dream', objectives: ['Analyze symbolism and theme in The Great Gatsby'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Novel'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.11-12.5', description: 'Analyze how an author\'s choices concerning how to structure specific parts of a text contribute to its aesthetic impact', category: 'Literature' }] },
          { title: 'Post-War Literature & Disillusionment', objectives: ['Analyze themes of alienation and identity in post-WWII literature'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Catcher in the Rye or Invisible Man excerpts'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.11-12.2', description: 'Determine themes and analyze their development over the course of the text', category: 'Literature' }] },
          { title: 'Contemporary Voices', objectives: ['Analyze contemporary diverse American literature'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Contemporary short stories/poems'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.11-12.7', description: 'Analyze multiple interpretations of a story, drama, or poem', category: 'Literature' }] },
          { title: 'Literary Analysis Essay', objectives: ['Write a literary analysis essay with thesis, textual evidence, and analysis'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Writing rubric'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.11-12.1', description: 'Write arguments to support claims in an analysis of substantive topics or texts', category: 'Writing' }] },
        ],
      },
      {
        title: 'Rhetoric & Composition',
        description: 'Argumentative, analytical, and synthesis writing at the college level',
        essentialQuestions: ['How do writers persuade and inform effectively?'],
        bigIdeas: ['Effective writing requires structure, evidence, and style', 'Audience and purpose shape rhetorical choices'],
        durationDays: 20,
        lessons: [
          { title: 'Rhetorical Analysis', objectives: ['Analyze rhetorical strategies (ethos, pathos, logos) in speeches and essays'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Speeches collection'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RI.11-12.5', description: 'Analyze and evaluate the effectiveness of the structure an author uses', category: 'Informational Text' }] },
          { title: 'Argument Writing: Developing a Thesis', objectives: ['Craft a precise, arguable thesis statement'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Thesis writing guide'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.11-12.1.A', description: 'Introduce precise, knowledgeable claims', category: 'Writing' }] },
          { title: 'Using Evidence Effectively', objectives: ['Integrate quotations and paraphrases with analysis'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Evidence integration guide'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.11-12.1.B', description: 'Develop claims and counterclaims fairly and thoroughly', category: 'Writing' }] },
          { title: 'Synthesis Writing', objectives: ['Synthesize information from multiple sources into a coherent argument'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Source packets'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.11-12.7', description: 'Conduct short as well as sustained research projects', category: 'Writing' }] },
          { title: 'Style, Voice & Revision', objectives: ['Refine writing for style, voice, and clarity'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Revision checklist'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.11-12.5', description: 'Develop and strengthen writing by planning, revising, editing, rewriting', category: 'Writing' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MATH 9-12
// ═══════════════════════════════════════════════════════════════════════════════

const MATH_912: StrandDef[] = [
  {
    name: 'Algebra I & II 9-12',
    description: 'Linear equations, quadratics, polynomials, exponentials, and rational expressions',
    subject: 'MATH',
    standard: 'COMMON_CORE',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'Linear Functions',
        description: 'Slope, linear equations, systems of equations, and inequalities',
        essentialQuestions: ['How do we model linear relationships?'],
        bigIdeas: ['Linear functions have constant rates of change', 'Systems of equations model multiple constraints'],
        durationDays: 20,
        lessons: [
          { title: 'Slope & Rate of Change', objectives: ['Calculate and interpret slope from tables, graphs, and equations'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Graphing calculator'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSF.IF.B.6', description: 'Calculate and interpret the average rate of change of a function', category: 'Functions' }] },
          { title: 'Slope-Intercept & Point-Slope Form', objectives: ['Write linear equations in slope-intercept and point-slope form'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Graph paper', 'Calculators'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSA.CED.A.2', description: 'Create equations in two or more variables to represent relationships', category: 'Algebra' }] },
          { title: 'Systems of Linear Equations', objectives: ['Solve systems by graphing, substitution, and elimination'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Graphing calculator'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSA.REI.C.6', description: 'Solve systems of linear equations exactly and approximately', category: 'Algebra' }] },
          { title: 'Linear Inequalities', objectives: ['Graph and solve linear inequalities and systems of inequalities'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Graph paper'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSA.REI.D.12', description: 'Graph the solutions to a linear inequality in two variables', category: 'Algebra' }] },
          { title: 'Linear Modeling', objectives: ['Create and interpret linear models from real-world data'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Data sets', 'Calculators'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSS.ID.B.6', description: 'Represent data on two quantitative variables and describe relationships', category: 'Statistics' }] },
        ],
      },
      {
        title: 'Quadratic Functions',
        description: 'Quadratic equations, factoring, graphing parabolas, and the quadratic formula',
        essentialQuestions: ['How do quadratic functions model real-world situations?'],
        bigIdeas: ['Quadratic functions create parabolic curves', 'Multiple methods exist for solving quadratics'],
        durationDays: 20,
        lessons: [
          { title: 'Graphing Quadratics', objectives: ['Graph quadratic functions and identify vertex, axis of symmetry, intercepts'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Graphing calculator'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSF.IF.C.7.A', description: 'Graph linear and quadratic functions and show intercepts, maxima, and minima', category: 'Functions' }] },
          { title: 'Factoring Quadratics', objectives: ['Factor quadratic expressions to find solutions'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Algebra tiles'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSA.SSE.A.2', description: 'Use the structure of an expression to identify ways to rewrite it', category: 'Algebra' }] },
          { title: 'Completing the Square', objectives: ['Solve quadratics by completing the square'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Worksheets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSA.REI.B.4.A', description: 'Use the method of completing the square to transform any quadratic equation', category: 'Algebra' }] },
          { title: 'The Quadratic Formula', objectives: ['Apply the quadratic formula and interpret the discriminant'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Calculators'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSA.REI.B.4.B', description: 'Solve quadratic equations by inspection, taking square roots, completing the square, the quadratic formula', category: 'Algebra' }] },
          { title: 'Quadratic Applications', objectives: ['Model projectile motion and area optimization with quadratics'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Problem sets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSF.IF.B.4', description: 'For a function that models a relationship, interpret key features of graphs and tables', category: 'Functions' }] },
        ],
      },
      {
        title: 'Polynomials & Rational Expressions',
        description: 'Polynomial operations, factoring, and rational expressions',
        essentialQuestions: ['How do polynomial and rational functions extend algebraic thinking?'],
        bigIdeas: ['Polynomials generalize linear and quadratic patterns', 'Rational expressions model rates and proportions'],
        durationDays: 15,
        lessons: [
          { title: 'Polynomial Operations', objectives: ['Add, subtract, and multiply polynomials'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Worksheets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSA.APR.A.1', description: 'Understand that polynomials form a system analogous to integers', category: 'Algebra' }] },
          { title: 'Factoring Higher-Degree Polynomials', objectives: ['Factor polynomials using grouping and special patterns'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Problem sets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSA.SSE.A.2', description: 'Use the structure of an expression to identify ways to rewrite it', category: 'Algebra' }] },
          { title: 'Polynomial Graphs & End Behavior', objectives: ['Analyze polynomial graphs for zeros and end behavior'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Graphing calculator'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSF.IF.C.7.C', description: 'Graph polynomial functions, identifying zeros when suitable factorizations are available', category: 'Functions' }] },
          { title: 'Rational Expressions', objectives: ['Simplify rational expressions and identify restrictions'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Worksheets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSA.APR.D.6', description: 'Rewrite simple rational expressions in different forms', category: 'Algebra' }] },
          { title: 'Exponential & Logarithmic Functions', objectives: ['Graph and solve exponential and logarithmic equations'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Graphing calculator'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSF.LE.A.1', description: 'Distinguish between situations that can be modeled with linear and exponential functions', category: 'Functions' }] },
        ],
      },
    ],
  },
  {
    name: 'Geometry 9-12',
    description: 'Proofs, congruence, similarity, trigonometry, circles, and coordinate geometry',
    subject: 'MATH',
    standard: 'COMMON_CORE',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'Congruence & Proofs',
        description: 'Geometric proofs and triangle congruence theorems',
        essentialQuestions: ['How do we prove geometric relationships?'],
        bigIdeas: ['Proofs establish geometric truths through logical reasoning', 'Congruence transformations preserve size and shape'],
        durationDays: 20,
        lessons: [
          { title: 'Introduction to Proofs', objectives: ['Write two-column and paragraph proofs using postulates and theorems'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Proof templates'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSG.CO.C.9', description: 'Prove theorems about lines and angles', category: 'Geometry' }] },
          { title: 'Triangle Congruence: SSS & SAS', objectives: ['Prove triangles congruent using SSS and SAS'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Protractor', 'Ruler'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSG.CO.B.8', description: 'Explain how criteria for triangle congruence follow from the definition of congruence', category: 'Geometry' }] },
          { title: 'Triangle Congruence: ASA & AAS', objectives: ['Prove triangles congruent using ASA and AAS'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Compass', 'Straightedge'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSG.CO.B.8', description: 'Explain how criteria for triangle congruence follow from the definition', category: 'Geometry' }] },
          { title: 'CPCTC & Applications', objectives: ['Use CPCTC to prove additional parts of triangles congruent'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Problem sets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSG.CO.C.10', description: 'Prove theorems about triangles', category: 'Geometry' }] },
          { title: 'Similarity & Proportions', objectives: ['Establish similarity using AA, SAS~, SSS~ criteria; apply proportional reasoning'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Similar figures'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSG.SRT.B.5', description: 'Use congruence and similarity criteria for triangles to solve problems', category: 'Geometry' }] },
        ],
      },
      {
        title: 'Trigonometry & Circles',
        description: 'Right triangle trigonometry, unit circle, and circle theorems',
        essentialQuestions: ['How do ratios describe relationships in triangles and circles?'],
        bigIdeas: ['Trigonometric ratios relate angles to side lengths', 'Circles have unique geometric properties'],
        durationDays: 15,
        lessons: [
          { title: 'Right Triangle Trigonometry', objectives: ['Define and apply sine, cosine, and tangent ratios'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Scientific calculator'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSG.SRT.C.6', description: 'Understand that by similarity, side ratios in right triangles are properties of the angles', category: 'Geometry' }] },
          { title: 'Solving Right Triangles', objectives: ['Find unknown sides and angles using trigonometric ratios'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Calculator', 'Problem sets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSG.SRT.C.8', description: 'Use trigonometric ratios and the Pythagorean Theorem to solve right triangles', category: 'Geometry' }] },
          { title: 'Arc Length & Sector Area', objectives: ['Calculate arc length and sector area of circles'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Compass', 'Protractor'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSG.C.B.5', description: 'Derive formulas for arc length and area of a sector', category: 'Geometry' }] },
          { title: 'Circle Theorems', objectives: ['Apply inscribed angle, central angle, and tangent theorems'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Circle diagrams'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSG.C.A.2', description: 'Identify and describe relationships among inscribed angles, radii, and chords', category: 'Geometry' }] },
          { title: 'Coordinate Geometry', objectives: ['Use coordinates to prove geometric theorems algebraically'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Graph paper', 'Calculator'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.HSG.GPE.B.4', description: 'Use coordinates to prove simple geometric theorems algebraically', category: 'Geometry' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCIENCE 9-12
// ═══════════════════════════════════════════════════════════════════════════════

const SCIENCE_912: StrandDef[] = [
  {
    name: 'Biology 9-12',
    description: 'Cell biology, genetics, evolution, ecology, and human body systems',
    subject: 'SCIENCE',
    standard: 'NGSS',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'Cell Biology & Biochemistry',
        description: 'Cell structure, organelles, cellular respiration, and photosynthesis',
        essentialQuestions: ['How do cells obtain and use energy?'],
        bigIdeas: ['Cells are the fundamental unit of life', 'Energy transformations power living systems'],
        durationDays: 20,
        lessons: [
          { title: 'Cell Theory & Organelles', objectives: ['Describe cell theory and identify organelle functions'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Cell models', 'Microscopes'], standardCodes: [{ code: 'HS-LS1-2', description: 'Develop and use a model to illustrate the hierarchical organization of interacting systems', category: 'Life Science' }] },
          { title: 'Cell Membrane & Transport', objectives: ['Explain passive and active transport across cell membranes'], durationMin: 55, lessonType: 'LAB', materials: ['Dialysis tubing', 'Solutions'], standardCodes: [{ code: 'HS-LS1-2', description: 'Develop and use a model to illustrate hierarchical organization', category: 'Life Science' }] },
          { title: 'Enzymes & Biochemical Reactions', objectives: ['Describe how enzymes catalyze biochemical reactions'], durationMin: 55, lessonType: 'LAB', materials: ['Enzyme kits'], standardCodes: [{ code: 'HS-LS1-6', description: 'Construct and revise an explanation for how carbon, hydrogen, and oxygen from sugar molecules may combine with other elements', category: 'Life Science' }] },
          { title: 'Cellular Respiration', objectives: ['Summarize the stages of cellular respiration and ATP production'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Respiration diagrams'], standardCodes: [{ code: 'HS-LS1-7', description: 'Use a model to illustrate that cellular respiration is a chemical process', category: 'Life Science' }] },
          { title: 'Photosynthesis', objectives: ['Describe the light-dependent and light-independent reactions of photosynthesis'], durationMin: 55, lessonType: 'LAB', materials: ['Leaf disks', 'Light sources'], standardCodes: [{ code: 'HS-LS1-5', description: 'Use a model to illustrate how photosynthesis transforms light energy into stored chemical energy', category: 'Life Science' }] },
        ],
      },
      {
        title: 'Genetics & Evolution',
        description: 'Mendelian genetics, molecular genetics, natural selection, and speciation',
        essentialQuestions: ['How do organisms inherit traits?', 'How do species change over time?'],
        bigIdeas: ['DNA encodes genetic information', 'Evolution is driven by natural selection and genetic variation'],
        durationDays: 20,
        lessons: [
          { title: 'DNA Structure & Replication', objectives: ['Describe DNA structure and the process of replication'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['DNA models'], standardCodes: [{ code: 'HS-LS1-1', description: 'Construct an explanation based on evidence for the role of DNA', category: 'Life Science' }] },
          { title: 'Protein Synthesis', objectives: ['Explain transcription and translation'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Codon charts'], standardCodes: [{ code: 'HS-LS1-1', description: 'Construct an explanation for how the structure of DNA determines the structure of proteins', category: 'Life Science' }] },
          { title: 'Mendelian Genetics', objectives: ['Solve genetics problems using Punnett squares and probability'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Genetics problem sets'], standardCodes: [{ code: 'HS-LS3-3', description: 'Apply concepts of statistics and probability to explain the variation and distribution of expressed traits', category: 'Life Science' }] },
          { title: 'Evidence for Evolution', objectives: ['Analyze evidence for evolution from fossils, anatomy, and molecular biology'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Fossil casts', 'Homology diagrams'], standardCodes: [{ code: 'HS-LS4-1', description: 'Communicate scientific information that common ancestry and biological evolution are supported by multiple lines of evidence', category: 'Life Science' }] },
          { title: 'Natural Selection & Speciation', objectives: ['Explain how natural selection leads to adaptation and speciation'], durationMin: 55, lessonType: 'LAB', materials: ['Natural selection simulation'], standardCodes: [{ code: 'HS-LS4-3', description: 'Apply concepts of statistics and probability to support explanations that organisms with advantageous traits tend to survive', category: 'Life Science' }] },
        ],
      },
    ],
  },
  {
    name: 'Chemistry 9-12',
    description: 'Atomic structure, bonding, stoichiometry, reactions, and thermodynamics',
    subject: 'SCIENCE',
    standard: 'NGSS',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'Atomic Structure & Chemical Bonding',
        description: 'Atomic models, periodic trends, and types of chemical bonds',
        essentialQuestions: ['How does atomic structure determine chemical properties?'],
        bigIdeas: ['The periodic table organizes elements by properties', 'Chemical bonds form based on electron configurations'],
        durationDays: 20,
        lessons: [
          { title: 'Atomic Models & Electron Configuration', objectives: ['Describe models of the atom and write electron configurations'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Periodic table', 'Atom models'], standardCodes: [{ code: 'HS-PS1-1', description: 'Use the periodic table as a model to predict the relative properties of elements', category: 'Physical Science' }] },
          { title: 'Periodic Trends', objectives: ['Explain trends in atomic radius, ionization energy, and electronegativity'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Periodic table data'], standardCodes: [{ code: 'HS-PS1-1', description: 'Use the periodic table as a model to predict relative properties', category: 'Physical Science' }] },
          { title: 'Ionic Bonding', objectives: ['Describe ionic bond formation and predict ionic compound formulas'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Ion models'], standardCodes: [{ code: 'HS-PS1-2', description: 'Construct and revise an explanation for the outcome of a simple chemical reaction based on outermost electron states', category: 'Physical Science' }] },
          { title: 'Covalent Bonding & Lewis Structures', objectives: ['Draw Lewis structures and predict molecular geometry'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Molecular model kits'], standardCodes: [{ code: 'HS-PS1-2', description: 'Construct and revise an explanation based on outermost electron states of atoms', category: 'Physical Science' }] },
          { title: 'Metallic Bonding & Properties', objectives: ['Describe metallic bonding and relate it to metal properties'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Metal samples'], standardCodes: [{ code: 'HS-PS1-3', description: 'Plan and conduct an investigation to gather evidence to compare the structure of substances', category: 'Physical Science' }] },
        ],
      },
      {
        title: 'Chemical Reactions & Stoichiometry',
        description: 'Reaction types, balancing equations, mole concept, and stoichiometry',
        essentialQuestions: ['How do we predict the products and quantities in chemical reactions?'],
        bigIdeas: ['Matter is conserved in chemical reactions', 'The mole connects macroscopic and atomic scales'],
        durationDays: 20,
        lessons: [
          { title: 'Types of Chemical Reactions', objectives: ['Classify and predict products of synthesis, decomposition, single/double replacement, and combustion reactions'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Reaction cards'], standardCodes: [{ code: 'HS-PS1-2', description: 'Construct an explanation for the outcome of a simple chemical reaction', category: 'Physical Science' }] },
          { title: 'Balancing Chemical Equations', objectives: ['Balance chemical equations using the law of conservation of mass'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Equation worksheets'], standardCodes: [{ code: 'HS-PS1-7', description: 'Use mathematical representations to support the claim that atoms are conserved during a chemical reaction', category: 'Physical Science' }] },
          { title: 'The Mole Concept', objectives: ['Convert between moles, grams, and particles using Avogadro\'s number'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Calculators', 'Periodic table'], standardCodes: [{ code: 'HS-PS1-7', description: 'Use mathematical representations to support the claim that atoms are conserved', category: 'Physical Science' }] },
          { title: 'Stoichiometry', objectives: ['Use mole ratios to calculate quantities in chemical reactions'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Problem sets'], standardCodes: [{ code: 'HS-PS1-7', description: 'Use mathematical representations to support conservation of atoms', category: 'Physical Science' }] },
          { title: 'Limiting Reagent & Percent Yield', objectives: ['Identify limiting reagent and calculate theoretical and percent yield'], durationMin: 55, lessonType: 'LAB', materials: ['Lab equipment', 'Chemicals'], standardCodes: [{ code: 'HS-PS1-7', description: 'Use mathematical representations to support claim that atoms are conserved during a chemical reaction', category: 'Physical Science' }] },
        ],
      },
    ],
  },
  {
    name: 'Physics 9-12',
    description: 'Kinematics, dynamics, energy, waves, and electricity',
    subject: 'SCIENCE',
    standard: 'NGSS',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'Kinematics & Dynamics',
        description: 'Motion, Newton\'s Laws, momentum, and applications',
        essentialQuestions: ['How do forces affect the motion of objects?'],
        bigIdeas: ['Motion can be described mathematically', 'Forces cause acceleration according to Newton\'s Laws'],
        durationDays: 20,
        lessons: [
          { title: 'Displacement, Velocity & Acceleration', objectives: ['Calculate displacement, velocity, and acceleration from data and graphs'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Motion sensors', 'Graphing software'], standardCodes: [{ code: 'HS-PS2-1', description: 'Analyze data to support the claim that Newton\'s second law of motion describes the mathematical relationship among the net force on an object, its mass, and its acceleration', category: 'Physical Science' }] },
          { title: 'Kinematic Equations', objectives: ['Solve problems using kinematic equations for uniformly accelerated motion'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Problem sets', 'Calculators'], standardCodes: [{ code: 'HS-PS2-1', description: 'Analyze data to support Newton\'s second law', category: 'Physical Science' }] },
          { title: 'Newton\'s Laws (quantitative)', objectives: ['Apply F=ma to solve multi-force problems'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Force tables', 'Spring scales'], standardCodes: [{ code: 'HS-PS2-1', description: 'Analyze data to support Newton\'s second law of motion', category: 'Physical Science' }] },
          { title: 'Friction & Projectile Motion', objectives: ['Calculate friction forces and analyze projectile trajectories'], durationMin: 55, lessonType: 'LAB', materials: ['Projectile launchers', 'Stopwatches'], standardCodes: [{ code: 'HS-PS2-1', description: 'Analyze data to support Newton\'s second law', category: 'Physical Science' }] },
          { title: 'Momentum & Impulse', objectives: ['Apply conservation of momentum to collisions'], durationMin: 55, lessonType: 'LAB', materials: ['Dynamics carts', 'Track'], standardCodes: [{ code: 'HS-PS2-2', description: 'Use mathematical representations to support the claim that the total momentum of a system of objects is conserved', category: 'Physical Science' }] },
        ],
      },
      {
        title: 'Energy & Electricity',
        description: 'Work, energy conservation, circuits, and electromagnetism',
        essentialQuestions: ['How is energy transferred and conserved?'],
        bigIdeas: ['Energy is conserved in closed systems', 'Electricity results from charge flow'],
        durationDays: 15,
        lessons: [
          { title: 'Work & Energy', objectives: ['Calculate work and kinetic/potential energy'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Spring scales', 'Ramps'], standardCodes: [{ code: 'HS-PS3-1', description: 'Create a computational model to calculate the change in the energy of one component in a system', category: 'Physical Science' }] },
          { title: 'Conservation of Energy', objectives: ['Apply conservation of energy to mechanical systems'], durationMin: 55, lessonType: 'LAB', materials: ['Pendulums', 'Ramps', 'Photogates'], standardCodes: [{ code: 'HS-PS3-1', description: 'Create a computational model to calculate change in energy', category: 'Physical Science' }] },
          { title: 'Electric Circuits: Series & Parallel', objectives: ['Build and analyze series and parallel circuits'], durationMin: 55, lessonType: 'LAB', materials: ['Circuit boards', 'Multimeters'], standardCodes: [{ code: 'HS-PS3-5', description: 'Develop and use a model of two component systems to illustrate that energy at the macroscopic scale can be accounted for as a combination of energy of particles, electromagnetic fields', category: 'Physical Science' }] },
          { title: 'Ohm\'s Law', objectives: ['Apply Ohm\'s Law to calculate voltage, current, and resistance'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Problem sets', 'Circuit simulators'], standardCodes: [{ code: 'HS-PS3-5', description: 'Develop and use a model of two component systems to illustrate energy', category: 'Physical Science' }] },
          { title: 'Electromagnetic Induction', objectives: ['Describe how changing magnetic fields induce electric current'], durationMin: 55, lessonType: 'LAB', materials: ['Magnets', 'Coils', 'Galvanometers'], standardCodes: [{ code: 'HS-PS2-5', description: 'Plan and conduct an investigation to provide evidence that an electric current can produce a magnetic field', category: 'Physical Science' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL STUDIES 9-12
// ═══════════════════════════════════════════════════════════════════════════════

const SOCIAL_912: StrandDef[] = [
  {
    name: 'World History 9-12',
    description: 'Major historical eras from ancient civilizations to the modern world',
    subject: 'SOCIAL_STUDIES',
    standard: 'C3',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'Revolutions & Industrialization',
        description: 'Political and industrial revolutions of the 18th-19th centuries',
        essentialQuestions: ['How do revolutions transform societies?'],
        bigIdeas: ['Enlightenment ideas fueled political change', 'Industrialization reshaped economies and social structures'],
        durationDays: 20,
        lessons: [
          { title: 'The Enlightenment', objectives: ['Analyze Enlightenment philosophers and their impact on government'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Primary source excerpts'], standardCodes: [{ code: 'D2.His.1.9-12', description: 'Evaluate how historical events and developments were shaped by unique circumstances of time and place', category: 'History' }] },
          { title: 'The French Revolution', objectives: ['Analyze causes, events, and outcomes of the French Revolution'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Timeline', 'Primary sources'], standardCodes: [{ code: 'D2.His.14.9-12', description: 'Analyze multiple and complex causes and effects of events', category: 'History' }] },
          { title: 'The Industrial Revolution', objectives: ['Analyze the social, economic, and environmental effects of industrialization'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Data charts', 'Images'], standardCodes: [{ code: 'D2.Eco.1.9-12', description: 'Analyze how incentives influence choices that may result in policies with a range of costs and benefits', category: 'Economics' }] },
          { title: 'Imperialism & Colonialism', objectives: ['Evaluate the causes and impact of European imperialism'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Colonial maps', 'Documents'], standardCodes: [{ code: 'D2.His.5.9-12', description: 'Analyze how historical contexts shaped and continue to shape people\'s perspectives', category: 'History' }] },
          { title: 'Nationalism & Reform Movements', objectives: ['Analyze how nationalism and reform movements changed societies'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Case studies'], standardCodes: [{ code: 'D2.His.3.9-12', description: 'Use questions generated about individuals and groups to assess significance of their actions', category: 'History' }] },
        ],
      },
    ],
  },
  {
    name: 'US Government & Economics 9-12',
    description: 'Principles of American government, civic engagement, and economic systems',
    subject: 'SOCIAL_STUDIES',
    standard: 'C3',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'American Government',
        description: 'Constitutional principles, branches of government, and civil liberties',
        essentialQuestions: ['How does the Constitution protect individual rights while enabling governance?'],
        bigIdeas: ['Separation of powers prevents tyranny', 'The Constitution is a living document'],
        durationDays: 20,
        lessons: [
          { title: 'Constitutional Principles', objectives: ['Analyze federalism, separation of powers, and checks and balances'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Constitution text'], standardCodes: [{ code: 'D2.Civ.1.9-12', description: 'Distinguish the powers and responsibilities of local, state, tribal, national, and international civic and political institutions', category: 'Civics' }] },
          { title: 'The Bill of Rights & Civil Liberties', objectives: ['Analyze landmark Supreme Court cases related to civil liberties'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Case briefs'], standardCodes: [{ code: 'D2.Civ.4.9-12', description: 'Explain how the U.S. Constitution establishes a system of government that has powers, responsibilities, and limits', category: 'Civics' }] },
          { title: 'The Legislative Process', objectives: ['Trace the process of a bill becoming law'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Legislative simulation'], standardCodes: [{ code: 'D2.Civ.3.9-12', description: 'Analyze the impact of constitutions, laws, and institutions', category: 'Civics' }] },
          { title: 'Elections & Voting', objectives: ['Evaluate the electoral process and the role of political parties'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Election data'], standardCodes: [{ code: 'D2.Civ.7.9-12', description: 'Apply civic virtues and democratic principles in school and community settings', category: 'Civics' }] },
          { title: 'Economic Systems & Market Economy', objectives: ['Compare economic systems and analyze market principles'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Economic models'], standardCodes: [{ code: 'D2.Eco.1.9-12', description: 'Analyze how incentives influence choices', category: 'Economics' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEL 9-12
// ═══════════════════════════════════════════════════════════════════════════════

const SEL_912: StrandDef[] = [
  {
    name: 'Social-Emotional Learning 9-12',
    description: 'Self-management, identity development, college and career readiness, leadership',
    subject: 'SEL',
    standard: 'CUSTOM',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'College, Career & Life Readiness',
        description: 'Planning for post-secondary success and developing leadership skills',
        essentialQuestions: ['How do I prepare for my future?', 'What does it mean to be a leader?'],
        bigIdeas: ['Planning and self-awareness guide future success', 'Leadership involves service and responsibility'],
        durationDays: 15,
        lessons: [
          { title: 'Self-Assessment & Values', objectives: ['Identify core values, interests, and strengths'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Values card sort', 'Interest inventory'], standardCodes: [{ code: 'CASEL.SA.5', description: 'Identify personal assets and areas for growth related to future goals', category: 'Self-Awareness' }] },
          { title: 'Goal Setting & Action Planning', objectives: ['Create short-term and long-term goals with action steps'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Planning templates'], standardCodes: [{ code: 'CASEL.SM.4', description: 'Set personal and collective goals and plan strategically', category: 'Self-Management' }] },
          { title: 'Stress, Resilience & Wellness', objectives: ['Develop a personal wellness plan addressing academic and personal stress'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Wellness wheel'], standardCodes: [{ code: 'CASEL.SM.3', description: 'Identify and practice strategies to manage stress and anxiety', category: 'Self-Management' }] },
          { title: 'Ethical Decision-Making', objectives: ['Apply ethical frameworks to complex scenarios'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Ethical dilemma cards'], standardCodes: [{ code: 'CASEL.RDM.2', description: 'Evaluate personal, interpersonal, community, and institutional impacts of decisions', category: 'Decision-Making' }] },
          { title: 'Leadership & Service', objectives: ['Identify leadership styles and plan a service-learning project'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Leadership assessment', 'Project planner'], standardCodes: [{ code: 'CASEL.RS.3', description: 'Practice teamwork and collaborative problem-solving', category: 'Relationship Skills' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL SUBJECTS 9-12: ARTS, TECHNOLOGY, WORLD LANGUAGE, CAREER TECH
// ═══════════════════════════════════════════════════════════════════════════════

const ARTS_912: StrandDef[] = [
  {
    name: 'Studio Art & Music 9-12',
    description: 'Advanced visual art techniques, art history survey, and music theory foundations',
    subject: 'ARTS',
    standard: 'CUSTOM',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'Drawing & Painting',
        description: 'Advanced drawing techniques, composition, and painting media',
        essentialQuestions: ['How do artists communicate meaning through visual art?'],
        bigIdeas: ['Artistic mastery develops through practice and experimentation', 'Art communicates ideas, emotions, and perspectives'],
        durationDays: 20,
        lessons: [
          { title: 'Observational Drawing', objectives: ['Create detailed observational drawings using pencil, charcoal, or ink'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Still life objects', 'Drawing media'], standardCodes: [{ code: 'VA.CR.1.HS1', description: 'Use multiple approaches to begin creative endeavors', category: 'Visual Arts' }] },
          { title: 'Composition & Design', objectives: ['Apply principles of design: balance, emphasis, movement, pattern, rhythm'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Design examples'], standardCodes: [{ code: 'VA.CR.2.HS1', description: 'Demonstrate willingness to experiment, innovate, and take risks', category: 'Visual Arts' }] },
          { title: 'Color Mixing & Painting Techniques', objectives: ['Mix colors accurately and apply painting techniques'], durationMin: 55, lessonType: 'LAB', materials: ['Acrylic paints', 'Brushes', 'Canvas'], standardCodes: [{ code: 'VA.CR.2.HS2', description: 'Demonstrate acquisition of skills and knowledge through experimentation', category: 'Visual Arts' }] },
          { title: 'Art History: Major Movements', objectives: ['Survey major art movements from Renaissance to Contemporary'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Art history images'], standardCodes: [{ code: 'VA.CN.11.HS1', description: 'Describe how knowledge of culture, traditions, and history may influence personal responses to art', category: 'Visual Arts' }] },
          { title: 'Portfolio Development', objectives: ['Select and present artwork in a portfolio demonstrating growth'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Portfolio materials'], standardCodes: [{ code: 'VA.PR.6.HS1', description: 'Analyze and describe the impact that an exhibit has on a specific audience', category: 'Visual Arts' }] },
        ],
      },
    ],
  },
];

const TECH_912: StrandDef[] = [
  {
    name: 'Computer Science Fundamentals 9-12',
    description: 'Programming concepts, data structures, and computational problem-solving',
    subject: 'TECHNOLOGY',
    standard: 'CUSTOM',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'Introduction to Programming',
        description: 'Variables, control structures, functions, and basic algorithms',
        essentialQuestions: ['How do we instruct computers to solve problems?'],
        bigIdeas: ['Programs are composed of instructions that manipulate data', 'Abstraction and decomposition simplify complex problems'],
        durationDays: 20,
        lessons: [
          { title: 'Variables & Data Types', objectives: ['Declare variables and use appropriate data types'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Coding environment'], standardCodes: [{ code: 'CSTA.3A-AP-14', description: 'Use lists to simplify solutions, generalizing computational problems', category: 'Computer Science' }] },
          { title: 'Conditional Statements', objectives: ['Write programs using if/else conditional logic'], durationMin: 55, lessonType: 'LAB', materials: ['IDE', 'Problem sets'], standardCodes: [{ code: 'CSTA.3A-AP-15', description: 'Justify the selection of specific algorithmic solutions', category: 'Computer Science' }] },
          { title: 'Loops & Iteration', objectives: ['Use for and while loops to solve repetitive tasks'], durationMin: 55, lessonType: 'LAB', materials: ['IDE'], standardCodes: [{ code: 'CSTA.3A-AP-15', description: 'Justify the selection of specific algorithmic solutions', category: 'Computer Science' }] },
          { title: 'Functions & Modularity', objectives: ['Define and call functions to create modular programs'], durationMin: 55, lessonType: 'LAB', materials: ['IDE'], standardCodes: [{ code: 'CSTA.3A-AP-17', description: 'Decompose problems into smaller components through systematic analysis', category: 'Computer Science' }] },
          { title: 'Debugging & Testing', objectives: ['Test programs systematically and debug errors'], durationMin: 55, lessonType: 'LAB', materials: ['IDE', 'Test cases'], standardCodes: [{ code: 'CSTA.3A-AP-21', description: 'Evaluate and refine computational artifacts', category: 'Computer Science' }] },
        ],
      },
    ],
  },
];

const WORLD_LANG_912: StrandDef[] = [
  {
    name: 'World Language: Spanish I 9-12',
    description: 'Introductory Spanish: basic communication, grammar, and culture',
    subject: 'WORLD_LANGUAGE',
    standard: 'CUSTOM',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'Spanish I Foundations',
        description: 'Greetings, basic vocabulary, present tense, and cultural awareness',
        essentialQuestions: ['How do we communicate in another language?'],
        bigIdeas: ['Language opens doors to understanding other cultures', 'Communication requires vocabulary, grammar, and cultural context'],
        durationDays: 20,
        lessons: [
          { title: 'Greetings & Introductions', objectives: ['Introduce yourself and others in Spanish'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Dialogue cards'], standardCodes: [{ code: 'ACTFL.1.1', description: 'Interpersonal Communication: Learners interact and negotiate meaning', category: 'Communication' }] },
          { title: 'Numbers, Days & Months', objectives: ['Count to 100 and identify days, months, and dates in Spanish'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Calendar', 'Number cards'], standardCodes: [{ code: 'ACTFL.1.1', description: 'Interpersonal Communication', category: 'Communication' }] },
          { title: 'Present Tense: Regular Verbs', objectives: ['Conjugate regular -ar, -er, -ir verbs in the present tense'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Verb charts'], standardCodes: [{ code: 'ACTFL.1.3', description: 'Presentational Communication: Learners present information', category: 'Communication' }] },
          { title: 'Family & Descriptions', objectives: ['Describe family members and physical characteristics'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Family tree template'], standardCodes: [{ code: 'ACTFL.1.2', description: 'Interpretive Communication: Learners understand and interpret', category: 'Communication' }] },
          { title: 'Hispanic Culture & Traditions', objectives: ['Explore cultural practices and traditions of Spanish-speaking countries'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Cultural resources', 'Videos'], standardCodes: [{ code: 'ACTFL.2.1', description: 'Relating Cultural Practices to Perspectives', category: 'Cultures' }] },
        ],
      },
    ],
  },
];

const CAREER_TECH_912: StrandDef[] = [
  {
    name: 'Career & Technical Education 9-12',
    description: 'Career exploration, employability skills, and pathway planning',
    subject: 'CAREER_TECH',
    standard: 'CUSTOM',
    gradeBand: 'G9_12',
    units: [
      {
        title: 'Career Exploration & Employability',
        description: 'Exploring career clusters, developing resumes, and practicing interviews',
        essentialQuestions: ['What career pathway aligns with my interests and skills?'],
        bigIdeas: ['Career planning is a lifelong process', 'Employability skills transfer across careers'],
        durationDays: 15,
        lessons: [
          { title: 'Career Clusters & Pathways', objectives: ['Explore the 16 career clusters and identify pathways of interest'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Career cluster chart'], standardCodes: [{ code: 'CTE.CCR.1', description: 'Act as a responsible and contributing citizen and employee', category: 'Career Readiness' }] },
          { title: 'Resume Writing', objectives: ['Create a professional resume highlighting skills and experiences'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Resume templates'], standardCodes: [{ code: 'CTE.CCR.4', description: 'Communicate clearly, effectively, and with reason', category: 'Career Readiness' }] },
          { title: 'Interview Skills', objectives: ['Practice professional interview techniques'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Interview question bank'], standardCodes: [{ code: 'CTE.CCR.4', description: 'Communicate clearly, effectively, and with reason', category: 'Career Readiness' }] },
          { title: 'Financial Literacy', objectives: ['Create a personal budget and understand basic financial concepts'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Budget worksheet'], standardCodes: [{ code: 'CTE.CCR.9', description: 'Model integrity, ethical leadership, and effective management', category: 'Career Readiness' }] },
          { title: 'Workplace Collaboration', objectives: ['Demonstrate teamwork, problem-solving, and leadership in workplace scenarios'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Team challenge kits'], standardCodes: [{ code: 'CTE.CCR.12', description: 'Work productively in teams while using cultural global competence', category: 'Career Readiness' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ALL 9-12 STRANDS
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_912_STRANDS: StrandDef[] = [
  ...ELA_912,
  ...MATH_912,
  ...SCIENCE_912,
  ...SOCIAL_912,
  ...SEL_912,
  ...ARTS_912,
  ...TECH_912,
  ...WORLD_LANG_912,
  ...CAREER_TECH_912,
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
  console.log('🌱 Seeding 9-12 Curriculum (all subjects)...\n');

  let total = 0;
  let lessons = 0;
  let standards = 0;

  for (const strand of ALL_912_STRANDS) {
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

  console.log(`\n✅ 9-12 curriculum seeded: ${ALL_912_STRANDS.length} curricula, ${total} units, ${lessons} lessons, ${standards} standard alignments`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
