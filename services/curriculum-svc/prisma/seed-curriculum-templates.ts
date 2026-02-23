/**
 * Curriculum Template Seed Data
 *
 * Seeds CurriculumTemplate records — structural blueprints that the AI
 * orchestrator uses to generate district-specific, standards-aligned
 * curriculum content on demand.
 *
 * Each template defines:
 *   - Subject + GradeBand scope
 *   - Unit blueprints (titles, descriptions, essential questions, big ideas)
 *   - Lesson topic outlines (titles, objectives, duration, type, materials)
 *   - Base standards the template was designed around
 *
 * The AI fills in the specific standard codes (TEKS, SOL, CCSS, etc.)
 * and generates full lesson content at generation time.
 *
 * Usage:
 *   npx tsx prisma/seed-curriculum-templates.ts
 */

import 'dotenv/config';

// We use dynamic import so this script works with tsx across monorepo configs
const { PrismaClient } = await import('../src/generated/prisma-client/index.js');
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type SubjectArea = 'ELA' | 'MATH' | 'SCIENCE' | 'SOCIAL_STUDIES' | 'SEL' | 'ARTS' | 'WORLD_LANGUAGE' | 'PHYSICAL_ED' | 'TECHNOLOGY' | 'CAREER_TECH';
type GradeBand = 'PRE_K' | 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';

interface LessonTopicBlueprint {
  title: string;
  objectives: string[];
  durationMin: number;
  lessonType: string;
  materials: string[];
}

interface UnitBlueprint {
  title: string;
  description: string;
  essentialQuestions: string[];
  bigIdeas: string[];
  durationDays: number;
  lessonTopics: LessonTopicBlueprint[];
}

interface TemplateDef {
  name: string;
  description: string;
  subject: SubjectArea;
  gradeBand: GradeBand;
  unitBlueprints: UnitBlueprint[];
  baseStandards: string[];
  tags: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELA TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const ELA_K2: TemplateDef = {
  name: 'ELA Foundations K-2',
  description: 'Foundational literacy: phonics, fluency, comprehension, vocabulary, and early writing',
  subject: 'ELA',
  gradeBand: 'K_2',
  baseStandards: ['COMMON_CORE'],
  tags: ['phonics', 'fluency', 'comprehension', 'early-reading', 'foundational-literacy'],
  unitBlueprints: [
    {
      title: 'Phonics & Word Recognition',
      description: 'Foundation phonics skills including letter-sound correspondence, blending, and decoding',
      essentialQuestions: ['How do letters represent sounds?', 'How do we decode words?'],
      bigIdeas: ['Letters have sounds', 'Sounds combine to form words'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Consonant Sounds', objectives: ['Identify consonant sounds', 'Match letters to sounds'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Letter cards', 'Sound chart'] },
        { title: 'Short Vowel Sounds', objectives: ['Distinguish short vowel sounds', 'Read CVC words with short vowels'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Vowel cards', 'Decodable readers'] },
        { title: 'Blending CVC Words', objectives: ['Blend consonant-vowel-consonant words', 'Read simple CVC words fluently'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Word cards', 'Magnetic letters'] },
        { title: 'Consonant Blends & Digraphs', objectives: ['Identify and read words with blends and digraphs'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Blend cards', 'Digraph cards'] },
        { title: 'Long Vowel Patterns', objectives: ['Read CVCe words with long vowels', 'Read words with vowel teams'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Word cards', 'Sorting mats'] },
      ],
    },
    {
      title: 'Reading Fluency',
      description: 'Building reading speed, accuracy, and prosody through repeated practice',
      essentialQuestions: ['What does fluent reading sound like?', 'Why do some words need to be memorized?'],
      bigIdeas: ['Some words appear very often in text', 'Fluent readers read smoothly and with expression'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Sight Word Mastery', objectives: ['Read high-frequency sight words automatically'], durationMin: 20, lessonType: 'DIRECT_INSTRUCTION', materials: ['Flashcards', 'Word wall'] },
        { title: 'Echo & Choral Reading', objectives: ['Model and practice fluent reading'], durationMin: 20, lessonType: 'WORKSHOP', materials: ['Read-aloud text', 'Poetry anthology'] },
        { title: 'Partner Reading', objectives: ['Build fluency through repeated partner reading'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Leveled readers'] },
        { title: 'Reading with Expression', objectives: ['Use punctuation to guide expression', 'Read dialogue with character voices'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Script readers'] },
        { title: 'Timed Reading Assessment', objectives: ['Demonstrate fluency at grade-level rate'], durationMin: 15, lessonType: 'ASSESSMENT', materials: ['Assessment passage', 'Timer'] },
      ],
    },
    {
      title: 'Reading Comprehension Foundations',
      description: 'Basic comprehension strategies for early readers',
      essentialQuestions: ['How do we understand what we read?', 'How do we retell a story?'],
      bigIdeas: ['Good readers think while they read', 'Stories have a beginning, middle, and end'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Asking Questions While Reading', objectives: ['Generate questions before, during, and after reading'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Picture books', 'Question stems'] },
        { title: 'Retelling a Story', objectives: ['Retell familiar stories with key details'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Story sequence cards'] },
        { title: 'Identifying Characters & Setting', objectives: ['Identify characters, setting, and major events'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Graphic organizers'] },
        { title: 'Making Predictions', objectives: ['Use text clues and illustrations to make predictions'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Picture books'] },
        { title: 'Main Idea & Details', objectives: ['Identify main topic and key details in informational text'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Informational texts'] },
      ],
    },
    {
      title: 'Vocabulary Development',
      description: 'Building word knowledge through context, morphology, and word relationships',
      essentialQuestions: ['How can we figure out what a new word means?'],
      bigIdeas: ['Context clues help readers understand new words', 'Word parts provide meaning clues'],
      durationDays: 12,
      lessonTopics: [
        { title: 'Using Picture & Sentence Clues', objectives: ['Use illustrations and context to understand word meaning'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Picture books', 'Sentence strips'] },
        { title: 'Prefixes & Suffixes', objectives: ['Understand how affixes change word meaning'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Prefix/suffix cards'] },
        { title: 'Compound Words', objectives: ['Identify and read compound words', 'Use word parts to determine meaning'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Compound word puzzles'] },
        { title: 'Synonyms & Antonyms', objectives: ['Identify word relationships'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Word pair cards'] },
        { title: 'Academic Vocabulary', objectives: ['Learn and use grade-level academic vocabulary'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Vocabulary journal'] },
      ],
    },
  ],
};

const ELA_35: TemplateDef = {
  name: 'ELA Reading & Writing 3-5',
  description: 'Advanced comprehension, literary analysis, informational text, and multi-genre writing',
  subject: 'ELA',
  gradeBand: 'G3_5',
  baseStandards: ['COMMON_CORE'],
  tags: ['comprehension', 'literary-analysis', 'writing-workshop', 'informational-text'],
  unitBlueprints: [
    {
      title: 'Story Elements & Theme',
      description: 'Analyzing narrative structure and identifying themes',
      essentialQuestions: ['How do authors develop themes?', 'What makes a story compelling?'],
      bigIdeas: ['Stories convey universal themes', 'Authors use literary elements purposefully'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Character Traits & Motivations', objectives: ['Describe characters using evidence from the text'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Chapter books', 'Character map'] },
        { title: 'Plot Structure', objectives: ['Map plot events using a story mountain'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Story mountain template'] },
        { title: 'Point of View', objectives: ['Distinguish between first and third person narration'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Paired passages'] },
        { title: 'Identifying Theme', objectives: ['Determine the theme of a story from details'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Short stories'] },
        { title: 'Comparing Themes Across Texts', objectives: ['Compare and contrast themes and topics across texts'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Text sets'] },
      ],
    },
    {
      title: 'Informational Text Analysis',
      description: 'Reading and analyzing nonfiction texts',
      essentialQuestions: ['How do we evaluate informational text?', 'How do text features support comprehension?'],
      bigIdeas: ['Nonfiction texts have structures that aid understanding', 'Critical readers evaluate evidence'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Text Features', objectives: ['Use text features to locate information efficiently'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Nonfiction books'] },
        { title: 'Main Idea & Supporting Details', objectives: ['Determine the main idea and explain how details support it'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Nonfiction articles'] },
        { title: 'Text Structures', objectives: ['Identify organizational structures in informational text'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Graphic organizers'] },
        { title: "Author's Purpose & Reasoning", objectives: ['Explain how an author uses reasons and evidence to support points'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Persuasive articles'] },
        { title: 'Integrating Information from Multiple Sources', objectives: ['Integrate information from several texts on the same topic'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Text sets'] },
      ],
    },
    {
      title: 'Writing Workshop',
      description: 'Developing narrative, informational, and opinion writing skills',
      essentialQuestions: ['How do writers organize their ideas?', 'How do we write for different purposes?'],
      bigIdeas: ['Writing is a process', 'Different purposes require different structures'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Narrative Writing: Personal Narratives', objectives: ['Write a focused personal narrative with details'], durationMin: 45, lessonType: 'WORKSHOP', materials: ["Writer's notebook"] },
        { title: 'Opinion Writing: Stating a Claim', objectives: ['Write opinion pieces supporting a point of view with reasons'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Graphic organizer'] },
        { title: 'Informational Writing: Research Reports', objectives: ['Write informative texts with organized facts and details'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Research sources'] },
        { title: 'Revising & Editing', objectives: ['Strengthen writing through revision and editing'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Editing checklist'] },
        { title: 'Publishing & Sharing', objectives: ['Produce clear and coherent writing for publication'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Publishing tools'] },
      ],
    },
  ],
};

const ELA_68: TemplateDef = {
  name: 'ELA Literary Analysis 6-8',
  description: 'Middle-school literary analysis, argumentative writing, and research skills',
  subject: 'ELA',
  gradeBand: 'G6_8',
  baseStandards: ['COMMON_CORE'],
  tags: ['literary-analysis', 'argumentative-writing', 'research', 'middle-school'],
  unitBlueprints: [
    {
      title: 'Literary Analysis & Close Reading',
      description: 'Analyzing literature through close reading and evidence-based discussion',
      essentialQuestions: ['How do authors craft their messages?', 'What makes literature timeless?'],
      bigIdeas: ['Close reading reveals deeper meaning', 'Authors make deliberate craft choices'],
      durationDays: 18,
      lessonTopics: [
        { title: 'Figurative Language & Imagery', objectives: ['Analyze figurative language and its impact on meaning'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Poetry anthology', 'Annotation guides'] },
        { title: 'Analyzing Narrative Structure', objectives: ['Analyze how plot structure creates tension and meaning'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Novels', 'Plot diagrams'] },
        { title: 'Character Development & Motivation', objectives: ['Track character development across a text'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Character analysis charts'] },
        { title: 'Theme Development', objectives: ['Trace how themes emerge and develop through a text'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Theme tracking organizer'] },
        { title: 'Comparing Texts Across Genres', objectives: ['Compare and contrast treatments of similar themes across genres'], durationMin: 50, lessonType: 'SEMINAR', materials: ['Paired text sets'] },
      ],
    },
    {
      title: 'Argumentative & Research Writing',
      description: 'Building evidence-based arguments and conducting research',
      essentialQuestions: ['What makes an argument persuasive?', 'How do we evaluate sources?'],
      bigIdeas: ['Strong arguments are supported by evidence', 'Research requires evaluating source credibility'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Constructing Claims & Thesis Statements', objectives: ['Write clear, arguable claims supported by reasoning'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Claim examples'] },
        { title: 'Gathering & Evaluating Evidence', objectives: ['Identify credible sources and relevant evidence'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Source evaluation rubric'] },
        { title: 'Counterarguments & Rebuttals', objectives: ['Acknowledge and address counterarguments'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Debate frameworks'] },
        { title: 'Research Paper Drafting', objectives: ['Draft a research-based argumentative essay'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Outline templates'] },
        { title: 'Peer Review & Revision', objectives: ['Provide and incorporate constructive feedback'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Peer review checklist'] },
      ],
    },
  ],
};

const ELA_912: TemplateDef = {
  name: 'ELA American Literature 9-12',
  description: 'American literature survey, rhetorical analysis, and college-prep writing',
  subject: 'ELA',
  gradeBand: 'G9_12',
  baseStandards: ['COMMON_CORE'],
  tags: ['american-literature', 'rhetorical-analysis', 'college-prep', 'high-school'],
  unitBlueprints: [
    {
      title: 'American Literary Movements',
      description: 'Major American literary periods from Puritanism through Modernism',
      essentialQuestions: ['How does literature reflect society?', 'What makes American literature distinct?'],
      bigIdeas: ['Literature mirrors cultural values', 'Literary movements respond to historical context'],
      durationDays: 25,
      lessonTopics: [
        { title: 'Puritan & Enlightenment Literature', objectives: ['Analyze foundational American texts in historical context'], durationMin: 55, lessonType: 'SEMINAR', materials: ['Primary source excerpts'] },
        { title: 'Romanticism & Transcendentalism', objectives: ['Compare Romantic and Transcendentalist philosophies in literature'], durationMin: 55, lessonType: 'SEMINAR', materials: ['Emerson, Thoreau, Hawthorne excerpts'] },
        { title: 'Realism & Naturalism', objectives: ['Analyze how Realist authors depicted social issues'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Twain, Crane excerpts'] },
        { title: 'Harlem Renaissance', objectives: ['Analyze the cultural impact of Harlem Renaissance literature'], durationMin: 55, lessonType: 'SEMINAR', materials: ['Hughes, Hurston works'] },
        { title: 'Modernism & Postmodernism', objectives: ['Evaluate modernist techniques and postmodern experimentation'], durationMin: 55, lessonType: 'SEMINAR', materials: ['Fitzgerald, Morrison excerpts'] },
      ],
    },
    {
      title: 'Rhetorical Analysis & Persuasion',
      description: 'Analyzing rhetoric in speeches, essays, and multimedia',
      essentialQuestions: ['How do speakers and writers persuade?', 'What rhetorical strategies are most effective?'],
      bigIdeas: ['Rhetoric shapes public discourse', 'Understanding rhetoric creates critical consumers of media'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Ethos, Pathos, Logos', objectives: ['Identify rhetorical appeals in speeches and essays'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Famous speeches'] },
        { title: 'Rhetorical Devices', objectives: ['Analyze the effect of rhetorical devices on meaning'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Speech transcripts'] },
        { title: 'Rhetorical Analysis Essay', objectives: ['Write a rhetorical analysis essay with evidence'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Essay templates'] },
        { title: 'Multimedia Rhetoric', objectives: ['Analyze persuasive techniques in visual and digital media'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Media examples'] },
        { title: 'Peer Review & Final Draft', objectives: ['Revise rhetorical analysis for publication'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Revision rubric'] },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// MATH TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const MATH_K2: TemplateDef = {
  name: 'Mathematics Foundations K-2',
  description: 'Number sense, counting, addition & subtraction, geometry, and measurement',
  subject: 'MATH',
  gradeBand: 'K_2',
  baseStandards: ['COMMON_CORE'],
  tags: ['number-sense', 'counting', 'addition', 'subtraction', 'geometry', 'measurement'],
  unitBlueprints: [
    {
      title: 'Counting & Cardinality',
      description: 'Counting to 100 and understanding quantity',
      essentialQuestions: ['How do we count?', 'What do numbers represent?'],
      bigIdeas: ['Numbers represent quantity', 'Counting follows a specific sequence'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Counting to 20', objectives: ['Count forward from any given number within 20', 'Write numbers 0-20'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Number line', 'Counters'] },
        { title: 'Counting to 100', objectives: ['Count to 100 by ones and tens'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Hundreds chart'] },
        { title: 'Skip Counting', objectives: ['Skip count by twos, fives, and tens'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Hundreds chart', 'Counters'] },
        { title: 'Comparing Numbers', objectives: ['Compare two numbers using greater than, less than, equal to'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Comparison cards'] },
        { title: 'Counting Assessment', objectives: ['Demonstrate counting skills to 100'], durationMin: 20, lessonType: 'ASSESSMENT', materials: ['Assessment sheet'] },
      ],
    },
    {
      title: 'Place Value',
      description: 'Understanding tens and ones in two- and three-digit numbers',
      essentialQuestions: ['Why does position matter in a number?'],
      bigIdeas: ['The value of a digit depends on its position', 'Numbers can be composed and decomposed'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Tens and Ones', objectives: ['Understand that two-digit numbers are composed of tens and ones'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Base-ten blocks', 'Place value chart'] },
        { title: 'Composing Numbers', objectives: ['Compose and decompose two-digit numbers'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Base-ten blocks'] },
        { title: 'Expanded Form', objectives: ['Write two-digit numbers in expanded form'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Place value chart'] },
        { title: 'Comparing Two-Digit Numbers', objectives: ['Compare two-digit numbers using >, <, = symbols'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Comparison symbols'] },
        { title: 'Three-Digit Place Value', objectives: ['Understand hundreds, tens, ones in three-digit numbers'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Base-ten blocks', 'Place value chart'] },
      ],
    },
    {
      title: 'Addition & Subtraction',
      description: 'Fluency with addition and subtraction facts within 20',
      essentialQuestions: ['What strategies help us add and subtract?'],
      bigIdeas: ['Addition and subtraction are inverse operations', 'Strategies help build fact fluency'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Addition within 10', objectives: ['Add within 10 using objects, drawings, and strategies'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Counters', 'Ten frames'] },
        { title: 'Subtraction within 10', objectives: ['Subtract within 10 using concrete models'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Counters', 'Ten frames'] },
        { title: 'Making 10 Strategy', objectives: ['Use the making 10 strategy to add'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Double ten frames'] },
        { title: 'Doubles & Near Doubles', objectives: ['Use doubles and near doubles facts for addition'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Doubles cards'] },
        { title: 'Fact Fluency Assessment', objectives: ['Demonstrate fluency with addition and subtraction within 20'], durationMin: 20, lessonType: 'ASSESSMENT', materials: ['Fact fluency assessment'] },
      ],
    },
    {
      title: '2D & 3D Shapes',
      description: 'Recognizing, describing, and composing shapes',
      essentialQuestions: ['How do we describe shapes?', 'Where do we see shapes in the world?'],
      bigIdeas: ['Shapes can be described by their attributes', 'Shapes are all around us'],
      durationDays: 12,
      lessonTopics: [
        { title: 'Identifying 2D Shapes', objectives: ['Identify circles, triangles, squares, rectangles'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Shape manipulatives'] },
        { title: 'Attributes of 2D Shapes', objectives: ['Describe shape attributes: sides, vertices, angles'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Geoboards'] },
        { title: 'Identifying 3D Shapes', objectives: ['Identify cubes, spheres, cylinders, cones'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['3D shape models'] },
        { title: 'Composing & Partitioning Shapes', objectives: ['Create new shapes by composing and partition into equal parts'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Tangrams', 'Pattern blocks'] },
        { title: 'Shapes in the World', objectives: ['Find and describe shapes in real-world environments'], durationMin: 25, lessonType: 'LAB', materials: ['Camera', 'Observation journal'] },
      ],
    },
    {
      title: 'Measurement & Data',
      description: 'Measuring length, telling time, and representing data',
      essentialQuestions: ['How do we measure the world around us?'],
      bigIdeas: ['Measurement is comparing to a standard', 'We use tools to measure accurately'],
      durationDays: 10,
      lessonTopics: [
        { title: 'Comparing Lengths', objectives: ['Compare two objects by length using direct comparison'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Rulers', 'Objects to measure'] },
        { title: 'Measuring with Non-Standard Units', objectives: ['Measure length using non-standard units'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Paper clips', 'Unifix cubes'] },
        { title: 'Measuring with Rulers', objectives: ['Measure objects using rulers in inches and centimeters'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Rulers'] },
        { title: 'Telling Time', objectives: ['Tell time to the nearest five minutes using analog and digital clocks'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Clock models'] },
        { title: 'Collecting & Graphing Data', objectives: ['Collect data and create simple bar graphs'], durationMin: 30, lessonType: 'LAB', materials: ['Graphing templates'] },
      ],
    },
  ],
};

const MATH_35: TemplateDef = {
  name: 'Mathematics 3-5',
  description: 'Multiplication, division, fractions, geometry, and measurement',
  subject: 'MATH',
  gradeBand: 'G3_5',
  baseStandards: ['COMMON_CORE'],
  tags: ['multiplication', 'division', 'fractions', 'area', 'perimeter', 'volume'],
  unitBlueprints: [
    {
      title: 'Multiplication Concepts',
      description: 'Understanding multiplication as equal groups and arrays',
      essentialQuestions: ['What does multiplication represent?'],
      bigIdeas: ['Multiplication is repeated addition of equal groups', 'Arrays model multiplication'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Equal Groups & Arrays', objectives: ['Interpret products of whole numbers as equal groups and arrays'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Counters', 'Grid paper'] },
        { title: 'Multiplication Facts 0-5', objectives: ['Know multiplication facts for 0-5 from memory'], durationMin: 40, lessonType: 'WORKSHOP', materials: ['Flashcards'] },
        { title: 'Multiplication Facts 6-9', objectives: ['Know multiplication facts for 6-9 from memory'], durationMin: 40, lessonType: 'WORKSHOP', materials: ['Flashcards'] },
        { title: 'Multi-Digit Multiplication', objectives: ['Multiply multi-digit numbers using the standard algorithm'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Graph paper'] },
        { title: 'Multiplication Word Problems', objectives: ['Solve real-world multiplication problems'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Problem sets'] },
      ],
    },
    {
      title: 'Division Concepts',
      description: 'Understanding division as sharing and grouping',
      essentialQuestions: ['What does division mean?', 'How are multiplication and division related?'],
      bigIdeas: ['Division is the inverse of multiplication', 'Division can mean equal sharing or grouping'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Division as Equal Sharing', objectives: ['Interpret whole-number quotients as sharing'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Counters'] },
        { title: 'Fact Families', objectives: ['Understand the relationship between multiplication and division'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Fact family triangles'] },
        { title: 'Division Facts', objectives: ['Fluently divide within 100'], durationMin: 40, lessonType: 'WORKSHOP', materials: ['Flashcards'] },
        { title: 'Long Division', objectives: ['Divide multi-digit numbers using the standard algorithm'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Graph paper'] },
        { title: 'Word Problems with All Operations', objectives: ['Solve multi-step word problems using four operations'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Problem sets'] },
      ],
    },
    {
      title: 'Fractions',
      description: 'Understanding, comparing, and operating with fractions',
      essentialQuestions: ['What are fractions?', 'How do we add and subtract fractions?'],
      bigIdeas: ['Fractions are numbers', 'Equivalent fractions represent the same value'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Introduction to Fractions', objectives: ['Understand unit fractions as parts of a whole'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Fraction circles', 'Fraction strips'] },
        { title: 'Equivalent Fractions', objectives: ['Generate equivalent fractions using visual models'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Fraction bars'] },
        { title: 'Comparing Fractions', objectives: ['Compare fractions with different numerators and denominators'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Number line', 'Fraction tiles'] },
        { title: 'Adding & Subtracting Fractions', objectives: ['Add and subtract fractions with like denominators'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Fraction models'] },
        { title: 'Multiplying Fractions', objectives: ['Multiply a fraction by a whole number and by a fraction'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Area models'] },
      ],
    },
    {
      title: 'Geometry & Measurement',
      description: 'Area, perimeter, volume, and geometric reasoning',
      essentialQuestions: ['What is the difference between area and perimeter?'],
      bigIdeas: ['Area measures space inside a shape', 'Perimeter measures the distance around a shape'],
      durationDays: 12,
      lessonTopics: [
        { title: 'Understanding Perimeter', objectives: ['Find the perimeter of polygons'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Grid paper', 'Rulers'] },
        { title: 'Understanding Area', objectives: ['Measure areas by counting unit squares'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Unit tiles', 'Grid paper'] },
        { title: 'Area Formula for Rectangles', objectives: ['Use length × width to find area'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Grid paper'] },
        { title: 'Area of Composite Shapes', objectives: ['Find area of composite shapes by decomposing'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Tangrams'] },
        { title: 'Volume of Rectangular Prisms', objectives: ['Find volume by counting unit cubes and using formulas'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Unit cubes'] },
      ],
    },
  ],
};

const MATH_68: TemplateDef = {
  name: 'Mathematics Pre-Algebra 6-8',
  description: 'Ratios, proportions, expressions, equations, and statistical reasoning',
  subject: 'MATH',
  gradeBand: 'G6_8',
  baseStandards: ['COMMON_CORE'],
  tags: ['pre-algebra', 'ratios', 'proportions', 'expressions', 'equations', 'statistics'],
  unitBlueprints: [
    {
      title: 'Ratios & Proportional Relationships',
      description: 'Understanding ratios, unit rates, and proportional reasoning',
      essentialQuestions: ['How are ratios used in everyday life?', 'What makes two quantities proportional?'],
      bigIdeas: ['Ratios compare quantities', 'Proportional relationships have a constant rate'],
      durationDays: 18,
      lessonTopics: [
        { title: 'Introduction to Ratios', objectives: ['Understand ratio concepts and use ratio language'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Ratio cards', 'Real-world examples'] },
        { title: 'Unit Rates', objectives: ['Compute unit rates and use them to solve problems'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Calculator', 'Problem sets'] },
        { title: 'Proportional Relationships', objectives: ['Identify proportional relationships in tables and graphs'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Graph paper', 'Tables'] },
        { title: 'Percent Problems', objectives: ['Solve percent problems using proportional reasoning'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Percent models'] },
        { title: 'Scale Drawings', objectives: ['Use scale factors to reproduce drawings and solve problems'], durationMin: 50, lessonType: 'LAB', materials: ['Grid paper', 'Rulers'] },
      ],
    },
    {
      title: 'Expressions & Equations',
      description: 'Writing, simplifying, and solving algebraic expressions and equations',
      essentialQuestions: ['How do we represent unknown quantities?', 'How do we solve equations?'],
      bigIdeas: ['Variables represent unknown values', 'Inverse operations help solve equations'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Writing Algebraic Expressions', objectives: ['Translate verbal phrases into algebraic expressions'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Expression translator'] },
        { title: 'Simplifying Expressions', objectives: ['Combine like terms and use distributive property'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Algebra tiles'] },
        { title: 'Solving One-Step Equations', objectives: ['Solve one-step equations using inverse operations'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Balance model'] },
        { title: 'Solving Two-Step Equations', objectives: ['Solve two-step equations'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Equation mats'] },
        { title: 'Inequalities', objectives: ['Write, solve, and graph inequalities on a number line'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Number lines'] },
      ],
    },
  ],
};

const MATH_912: TemplateDef = {
  name: 'Mathematics Algebra & Geometry 9-12',
  description: 'Algebra I/II, geometry, and pre-calculus concepts',
  subject: 'MATH',
  gradeBand: 'G9_12',
  baseStandards: ['COMMON_CORE'],
  tags: ['algebra', 'geometry', 'functions', 'proofs', 'high-school'],
  unitBlueprints: [
    {
      title: 'Linear Functions & Systems',
      description: 'Graphing, writing, and solving linear equations and systems',
      essentialQuestions: ['How do we model linear relationships?', 'How do we solve systems?'],
      bigIdeas: ['Linear functions have a constant rate of change', 'Systems of equations model real-world situations'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Slope & Rate of Change', objectives: ['Calculate and interpret slope as rate of change'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Graphing calculator', 'Graph paper'] },
        { title: 'Slope-Intercept Form', objectives: ['Write and graph equations in slope-intercept form'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Graphing software'] },
        { title: 'Standard Form & Point-Slope Form', objectives: ['Convert between equation forms'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Practice problems'] },
        { title: 'Solving Systems by Graphing & Substitution', objectives: ['Solve systems using graphing and substitution'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Graphing calculator'] },
        { title: 'Solving Systems by Elimination', objectives: ['Solve systems using elimination method'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Practice problems'] },
      ],
    },
    {
      title: 'Quadratic Functions',
      description: 'Analyzing and solving quadratic equations',
      essentialQuestions: ['How do quadratic functions model real-world phenomena?'],
      bigIdeas: ['Parabolas are symmetric U-shaped curves', 'Quadratics can be solved multiple ways'],
      durationDays: 18,
      lessonTopics: [
        { title: 'Graphing Quadratics', objectives: ['Graph quadratic functions and identify vertex, axis of symmetry'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Graphing calculator'] },
        { title: 'Factoring Quadratics', objectives: ['Factor quadratic expressions'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Algebra tiles'] },
        { title: 'Completing the Square', objectives: ['Solve quadratics by completing the square'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Algebra tiles'] },
        { title: 'Quadratic Formula', objectives: ['Use the quadratic formula to solve equations'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Calculator'] },
        { title: 'Quadratic Applications', objectives: ['Model real-world scenarios with quadratic functions'], durationMin: 55, lessonType: 'LAB', materials: ['Motion sensors', 'Data collection'] },
      ],
    },
    {
      title: 'Geometric Proofs & Reasoning',
      description: 'Logical reasoning, proofs, and geometric theorems',
      essentialQuestions: ['Why do we prove things in mathematics?', 'How do we reason deductively?'],
      bigIdeas: ['Proofs establish mathematical truth', 'Deductive reasoning builds on axioms and definitions'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Inductive & Deductive Reasoning', objectives: ['Distinguish between inductive and deductive reasoning'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Pattern blocks'] },
        { title: 'Two-Column Proofs', objectives: ['Write two-column proofs using postulates and theorems'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Proof templates'] },
        { title: 'Triangle Congruence', objectives: ['Prove triangles congruent using SSS, SAS, ASA, AAS'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Geometry tools'] },
        { title: 'Parallel Lines & Transversals', objectives: ['Prove angle relationships with parallel lines'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Protractors'] },
        { title: 'Pythagorean Theorem', objectives: ['Prove and apply the Pythagorean Theorem'], durationMin: 55, lessonType: 'LAB', materials: ['Grid paper', 'Manipulatives'] },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCIENCE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const SCIENCE_K2: TemplateDef = {
  name: 'Science Foundations K-2',
  description: 'Life science, earth & space, and physical science foundations',
  subject: 'SCIENCE',
  gradeBand: 'K_2',
  baseStandards: ['NGSS'],
  tags: ['life-science', 'earth-science', 'physical-science', 'engineering-design'],
  unitBlueprints: [
    {
      title: 'Living Things & Habitats',
      description: 'Distinguishing living from non-living, understanding habitats and life cycles',
      essentialQuestions: ['What makes something alive?', 'Why do animals live where they do?'],
      bigIdeas: ['Living things grow, reproduce, and respond to their environment', 'Habitats provide what organisms need'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Characteristics of Living Things', objectives: ['Identify characteristics shared by all living things'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Sorting cards', 'Nature specimens'] },
        { title: 'Plant & Animal Needs', objectives: ['Describe what plants and animals need to survive'], durationMin: 30, lessonType: 'LAB', materials: ['Seeds', 'Soil', 'Pots'] },
        { title: 'Animal Habitats', objectives: ['Compare different habitats and their organisms'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Habitat comparison chart'] },
        { title: 'Life Cycles', objectives: ['Describe the stages of plant and animal life cycles'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Life cycle diagrams'] },
        { title: 'Parents & Offspring', objectives: ['Observe that offspring resemble their parents'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Animal family photos'] },
      ],
    },
    {
      title: 'Weather & Seasons',
      description: 'Observing, describing, and recording weather patterns',
      essentialQuestions: ['How does weather affect our daily lives?'],
      bigIdeas: ['Weather changes day to day and seasonally', 'We can observe and measure weather'],
      durationDays: 12,
      lessonTopics: [
        { title: 'Describing Weather', objectives: ['Use weather vocabulary: sunny, rainy, windy, cloudy'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Weather cards'] },
        { title: 'Recording Weather Data', objectives: ['Record daily weather on a calendar'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Weather journal'] },
        { title: 'The Four Seasons', objectives: ['Describe the characteristics of four seasons'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Season posters'] },
        { title: 'Weather Safety', objectives: ['Identify severe weather and safety precautions'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Safety brochures'] },
        { title: 'Weather Data Analysis', objectives: ['Analyze weather data to find patterns'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Weather charts'] },
      ],
    },
  ],
};

const SCIENCE_35: TemplateDef = {
  name: 'Science 3-5',
  description: 'Ecosystems, matter, energy, forces, and engineering design',
  subject: 'SCIENCE',
  gradeBand: 'G3_5',
  baseStandards: ['NGSS'],
  tags: ['ecosystems', 'matter', 'energy', 'forces', 'engineering'],
  unitBlueprints: [
    {
      title: 'Ecosystems & Food Webs',
      description: 'Interactions among organisms in an ecosystem',
      essentialQuestions: ['How do organisms depend on each other?'],
      bigIdeas: ['Energy flows through food chains and webs', 'Organisms depend on their environment'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Producers, Consumers, Decomposers', objectives: ['Classify organisms by their role in energy transfer'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Organism cards'] },
        { title: 'Food Chains & Food Webs', objectives: ['Construct food chains and webs showing energy flow'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Food chain cards', 'String'] },
        { title: 'Ecosystem Disruption', objectives: ['Predict effects of removing an organism from an ecosystem'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Simulation software'] },
        { title: 'Adaptations', objectives: ['Explain how structural and behavioral adaptations help organisms survive'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Adaptation cards'] },
        { title: 'Ecosystem Research Project', objectives: ['Research and present on a specific ecosystem'], durationMin: 50, lessonType: 'LAB', materials: ['Research materials'] },
      ],
    },
    {
      title: 'Properties of Matter',
      description: 'Observing, measuring, and classifying matter',
      essentialQuestions: ['What is matter?', 'How can we describe matter?'],
      bigIdeas: ['Matter has observable and measurable properties', 'Matter can change forms'],
      durationDays: 12,
      lessonTopics: [
        { title: 'States of Matter', objectives: ['Describe properties of solids, liquids, and gases'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Matter samples'] },
        { title: 'Measuring Matter', objectives: ['Measure mass and volume of objects'], durationMin: 45, lessonType: 'LAB', materials: ['Balance scale', 'Graduated cylinder'] },
        { title: 'Physical Changes', objectives: ['Distinguish between physical and chemical changes'], durationMin: 45, lessonType: 'LAB', materials: ['Lab supplies'] },
        { title: 'Chemical Changes', objectives: ['Observe and record evidence of chemical changes'], durationMin: 45, lessonType: 'LAB', materials: ['Baking soda', 'Vinegar'] },
        { title: 'Mixtures & Solutions', objectives: ['Separate mixtures using physical properties'], durationMin: 45, lessonType: 'LAB', materials: ['Mixture samples', 'Filters'] },
      ],
    },
  ],
};

const SCIENCE_68: TemplateDef = {
  name: 'Science 6-8',
  description: 'Life science, earth & space science, and physical science for middle school',
  subject: 'SCIENCE',
  gradeBand: 'G6_8',
  baseStandards: ['NGSS'],
  tags: ['cells', 'genetics', 'earth-systems', 'chemistry', 'physics', 'middle-school'],
  unitBlueprints: [
    {
      title: 'Cells & Organisms',
      description: 'Cell structure, function, and organization in living systems',
      essentialQuestions: ['How are cells the building blocks of life?', 'How do cells work together?'],
      bigIdeas: ['All living things are made of cells', 'Cells have specialized structures and functions'],
      durationDays: 18,
      lessonTopics: [
        { title: 'Cell Theory', objectives: ['Explain the main principles of cell theory'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Microscopes', 'Cell slides'] },
        { title: 'Cell Structure & Organelles', objectives: ['Identify major organelles and their functions'], durationMin: 50, lessonType: 'LAB', materials: ['Cell models', 'Microscopes'] },
        { title: 'Plant vs. Animal Cells', objectives: ['Compare and contrast plant and animal cells'], durationMin: 50, lessonType: 'LAB', materials: ['Prepared slides'] },
        { title: 'Cell Division', objectives: ['Describe the stages of mitosis'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Cell division models'] },
        { title: 'Body Systems', objectives: ['Explain how organ systems work together'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Body system models'] },
      ],
    },
    {
      title: 'Earth Systems & Space',
      description: 'Plate tectonics, weather systems, and the solar system',
      essentialQuestions: ['How does Earth change over time?', "What is Earth's place in the universe?"],
      bigIdeas: ['Earth is a dynamic system', 'Plate tectonics shape the surface'],
      durationDays: 18,
      lessonTopics: [
        { title: 'Plate Tectonics', objectives: ['Explain the theory of plate tectonics and its evidence'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Tectonic plate maps'] },
        { title: 'Earthquakes & Volcanoes', objectives: ['Explain how seismic and volcanic activity relate to plate boundaries'], durationMin: 50, lessonType: 'LAB', materials: ['Simulation software'] },
        { title: 'Rock Cycle', objectives: ['Describe the processes of the rock cycle'], durationMin: 50, lessonType: 'LAB', materials: ['Rock samples'] },
        { title: 'Weather & Climate', objectives: ['Distinguish between weather and climate and explain factors that affect both'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Weather data sets'] },
        { title: 'Solar System & Beyond', objectives: ['Compare objects in the solar system and describe scale'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Scale models'] },
      ],
    },
  ],
};

const SCIENCE_912: TemplateDef = {
  name: 'Science 9-12',
  description: 'Biology, chemistry, and physics for high school',
  subject: 'SCIENCE',
  gradeBand: 'G9_12',
  baseStandards: ['NGSS'],
  tags: ['biology', 'chemistry', 'physics', 'lab-science', 'high-school'],
  unitBlueprints: [
    {
      title: 'Biology: Genetics & Evolution',
      description: 'DNA, heredity, natural selection, and evolutionary theory',
      essentialQuestions: ['How is genetic information passed from parent to offspring?', 'How do species change over time?'],
      bigIdeas: ['DNA encodes traits', 'Natural selection drives evolution'],
      durationDays: 22,
      lessonTopics: [
        { title: 'DNA Structure & Replication', objectives: ['Describe the structure of DNA and the process of replication'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['DNA models'] },
        { title: 'Gene Expression: Transcription & Translation', objectives: ['Explain how genes are expressed as proteins'], durationMin: 55, lessonType: 'LAB', materials: ['Protein synthesis kits'] },
        { title: 'Mendelian Genetics', objectives: ['Use Punnett squares to predict inheritance patterns'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Punnett square worksheets'] },
        { title: 'Natural Selection & Adaptation', objectives: ['Explain the mechanism of natural selection'], durationMin: 55, lessonType: 'SEMINAR', materials: ['Case studies'] },
        { title: 'Evidence for Evolution', objectives: ['Evaluate fossil, genetic, and anatomical evidence for evolution'], durationMin: 55, lessonType: 'LAB', materials: ['Fossil casts', 'Comparative anatomy models'] },
      ],
    },
    {
      title: 'Chemistry: Atomic Structure & Reactions',
      description: 'Atomic theory, periodic trends, bonding, and chemical reactions',
      essentialQuestions: ['How does atomic structure determine chemical behavior?'],
      bigIdeas: ['Elements are organized by atomic structure', 'Chemical reactions rearrange atoms'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Atomic Structure & Electron Configuration', objectives: ['Describe subatomic particles and electron configuration'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Periodic table', 'Models'] },
        { title: 'Periodic Trends', objectives: ['Explain trends in atomic radius, ionization energy, and electronegativity'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Periodic table data'] },
        { title: 'Chemical Bonding', objectives: ['Compare ionic, covalent, and metallic bonding'], durationMin: 55, lessonType: 'LAB', materials: ['Molecular model kits'] },
        { title: 'Balancing Chemical Equations', objectives: ['Balance chemical equations and classify reaction types'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Equation balancing cards'] },
        { title: 'Stoichiometry', objectives: ['Calculate reactant and product quantities using mole ratios'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Calculators'] },
      ],
    },
    {
      title: 'Physics: Motion & Forces',
      description: "Newton's laws, motion, energy, and wave phenomena",
      essentialQuestions: ['What causes objects to move?', 'How is energy transferred?'],
      bigIdeas: ['Forces cause changes in motion', 'Energy is conserved in all interactions'],
      durationDays: 18,
      lessonTopics: [
        { title: 'Kinematics: Describing Motion', objectives: ['Use equations to describe motion with constant acceleration'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Motion sensors', 'Ramps'] },
        { title: "Newton's Laws of Motion", objectives: ['Apply Newton\'s three laws to real-world situations'], durationMin: 55, lessonType: 'LAB', materials: ['Force sensors', 'Carts'] },
        { title: 'Work, Energy, & Power', objectives: ['Calculate work, kinetic and potential energy'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Springs', 'Ramps'] },
        { title: 'Momentum & Collisions', objectives: ['Apply conservation of momentum to collision problems'], durationMin: 55, lessonType: 'LAB', materials: ['Collision carts'] },
        { title: 'Wave Properties & Sound', objectives: ['Describe wave behavior and properties of sound'], durationMin: 55, lessonType: 'LAB', materials: ['Slinkies', 'Tuning forks'] },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL STUDIES TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const SOCIAL_K2: TemplateDef = {
  name: 'Social Studies K-2',
  description: 'Community, civics, maps, and cultural awareness',
  subject: 'SOCIAL_STUDIES',
  gradeBand: 'K_2',
  baseStandards: ['C3'],
  tags: ['community', 'civics', 'maps', 'citizenship'],
  unitBlueprints: [
    {
      title: 'My Community',
      description: 'Exploring the people, places, and services in a community',
      essentialQuestions: ['What makes a community?', 'How do we help each other?'],
      bigIdeas: ['Communities are made up of people with different roles', 'Rules help communities function'],
      durationDays: 12,
      lessonTopics: [
        { title: 'What is a Community?', objectives: ['Define community and identify its members'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Community photos'] },
        { title: 'Community Helpers', objectives: ['Identify community helpers and their roles'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Role cards'] },
        { title: 'Rules & Laws', objectives: ['Explain why communities need rules'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Rule sorting cards'] },
        { title: 'Being a Good Citizen', objectives: ['Identify ways to be a responsible citizen'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Citizenship scenarios'] },
        { title: 'My Community Map', objectives: ['Create a simple map of the school or neighborhood'], durationMin: 30, lessonType: 'LAB', materials: ['Map templates', 'Crayons'] },
      ],
    },
  ],
};

const SOCIAL_35: TemplateDef = {
  name: 'Social Studies US History 3-5',
  description: 'Early American history, geography skills, and government',
  subject: 'SOCIAL_STUDIES',
  gradeBand: 'G3_5',
  baseStandards: ['C3'],
  tags: ['us-history', 'geography', 'government', 'exploration'],
  unitBlueprints: [
    {
      title: 'Early American History',
      description: 'Exploration, colonization, and founding of the United States',
      essentialQuestions: ['How was America founded?', 'What conflicts shaped the nation?'],
      bigIdeas: ['The United States was founded on democratic principles', 'Historical events have causes and effects'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Indigenous Peoples of North America', objectives: ['Describe the cultures and lives of Native American groups'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Cultural maps', 'Primary sources'] },
        { title: 'European Exploration', objectives: ['Explain why Europeans explored the Americas'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Explorer maps'] },
        { title: 'Colonial Life', objectives: ['Compare daily life in the thirteen colonies'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Primary source documents'] },
        { title: 'American Revolution', objectives: ['Identify causes and key events of the Revolution'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Timeline cards'] },
        { title: 'The Constitution', objectives: ['Explain the purpose and structure of the Constitution'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Constitution excerpts'] },
      ],
    },
  ],
};

const SOCIAL_68: TemplateDef = {
  name: 'Social Studies World History 6-8',
  description: 'World civilizations, geography, and global connections',
  subject: 'SOCIAL_STUDIES',
  gradeBand: 'G6_8',
  baseStandards: ['C3'],
  tags: ['world-history', 'civilizations', 'geography', 'global-connections'],
  unitBlueprints: [
    {
      title: 'Ancient Civilizations',
      description: 'Mesopotamia, Egypt, Greece, Rome, and their lasting influences',
      essentialQuestions: ['How did ancient civilizations shape the modern world?'],
      bigIdeas: ['Civilizations develop around resources', 'Ideas from ancient cultures persist today'],
      durationDays: 22,
      lessonTopics: [
        { title: 'Mesopotamia & the Fertile Crescent', objectives: ['Explain how geography influenced Mesopotamian civilization'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Maps', 'Primary sources'] },
        { title: 'Ancient Egypt', objectives: ['Describe Egyptian achievements in architecture, writing, and governance'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Artifact images'] },
        { title: 'Ancient Greece', objectives: ['Analyze Greek contributions to democracy, philosophy, and science'], durationMin: 50, lessonType: 'SEMINAR', materials: ['Primary source excerpts'] },
        { title: 'Ancient Rome', objectives: ['Evaluate Roman achievements in law, engineering, and governance'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Maps', 'Documents'] },
        { title: 'Comparing Civilizations', objectives: ['Compare and contrast ancient civilizations across themes'], durationMin: 50, lessonType: 'ASSESSMENT', materials: ['Comparison charts'] },
      ],
    },
  ],
};

const SOCIAL_912: TemplateDef = {
  name: 'Social Studies US Government & Economics 9-12',
  description: 'US government, constitutional law, and economic systems',
  subject: 'SOCIAL_STUDIES',
  gradeBand: 'G9_12',
  baseStandards: ['C3'],
  tags: ['us-government', 'economics', 'constitutional-law', 'high-school'],
  unitBlueprints: [
    {
      title: 'Foundations of American Government',
      description: 'Constitutional principles, federalism, and the three branches',
      essentialQuestions: ['How does the Constitution structure our government?', 'What is the balance of power?'],
      bigIdeas: ['Separation of powers prevents tyranny', 'Federalism divides authority between levels of government'],
      durationDays: 18,
      lessonTopics: [
        { title: 'Constitutional Principles', objectives: ['Analyze the six principles of the Constitution'], durationMin: 55, lessonType: 'SEMINAR', materials: ['Constitution text'] },
        { title: 'Federalism', objectives: ['Compare powers of federal, state, and local governments'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Federalism charts'] },
        { title: 'Legislative Branch', objectives: ['Explain the structure and functions of Congress'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Legislative process diagrams'] },
        { title: 'Executive Branch', objectives: ['Analyze the powers and roles of the President'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Executive orders examples'] },
        { title: 'Judicial Branch & Landmark Cases', objectives: ['Evaluate the impact of landmark Supreme Court cases'], durationMin: 55, lessonType: 'SEMINAR', materials: ['Case excerpts'] },
      ],
    },
    {
      title: 'Economic Systems & Personal Finance',
      description: 'Market economies, fiscal policy, and financial literacy',
      essentialQuestions: ['How do economic systems allocate resources?', 'How do we make smart financial decisions?'],
      bigIdeas: ['Markets are driven by supply and demand', 'Financial literacy empowers individuals'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Economic Systems: Market, Command, Mixed', objectives: ['Compare economic systems and their trade-offs'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['Comparison charts'] },
        { title: 'Supply & Demand', objectives: ['Analyze how supply and demand determine prices'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Supply/demand models'] },
        { title: 'GDP & Economic Indicators', objectives: ['Interpret key economic indicators'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Economic data sets'] },
        { title: 'Budgeting & Saving', objectives: ['Create a personal budget and understand compound interest'], durationMin: 55, lessonType: 'LAB', materials: ['Budget templates', 'Calculators'] },
        { title: 'Investing & Credit', objectives: ['Evaluate investment options and understand credit scores'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Investment simulators'] },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const SEL_K2: TemplateDef = {
  name: 'Social-Emotional Learning K-2',
  description: 'Self-awareness, self-management, and relationship skills for young learners',
  subject: 'SEL',
  gradeBand: 'K_2',
  baseStandards: ['CUSTOM'],
  tags: ['sel', 'emotions', 'self-awareness', 'self-management', 'friendship'],
  unitBlueprints: [
    {
      title: 'Understanding Emotions',
      description: 'Identifying, expressing, and managing emotions',
      essentialQuestions: ['What are emotions?', 'How do I express my feelings?'],
      bigIdeas: ['Everyone has emotions', 'We can learn to manage our emotions'],
      durationDays: 12,
      lessonTopics: [
        { title: 'Naming Our Feelings', objectives: ['Identify and name basic emotions'], durationMin: 20, lessonType: 'DIRECT_INSTRUCTION', materials: ['Emotion cards', 'Feelings chart'] },
        { title: 'Body Clues for Emotions', objectives: ['Recognize physical signs of emotions'], durationMin: 20, lessonType: 'WORKSHOP', materials: ['Body outline'] },
        { title: 'Calm-Down Strategies', objectives: ['Practice breathing and calming techniques'], durationMin: 20, lessonType: 'WORKSHOP', materials: ['Breathing cards'] },
        { title: 'Being a Good Friend', objectives: ['Identify qualities of a good friend'], durationMin: 20, lessonType: 'WORKSHOP', materials: ['Friendship scenario cards'] },
        { title: 'Solving Problems Together', objectives: ['Use steps to solve conflicts peacefully'], durationMin: 20, lessonType: 'WORKSHOP', materials: ['Problem-solving steps poster'] },
      ],
    },
  ],
};

const SEL_35: TemplateDef = {
  name: 'Social-Emotional Learning 3-5',
  description: 'Growth mindset, empathy, conflict resolution, and decision-making',
  subject: 'SEL',
  gradeBand: 'G3_5',
  baseStandards: ['CUSTOM'],
  tags: ['sel', 'growth-mindset', 'empathy', 'conflict-resolution', 'goal-setting'],
  unitBlueprints: [
    {
      title: 'Growth Mindset & Goal Setting',
      description: 'Developing resilience and setting achievable goals',
      essentialQuestions: ['How does my thinking affect my learning?'],
      bigIdeas: ['Effort and persistence lead to growth', 'Mistakes are part of learning'],
      durationDays: 12,
      lessonTopics: [
        { title: 'Fixed vs. Growth Mindset', objectives: ['Distinguish between fixed and growth mindset thinking'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Mindset scenarios'] },
        { title: 'Learning from Mistakes', objectives: ['Reframe mistakes as learning opportunities'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Journal'] },
        { title: 'Setting SMART Goals', objectives: ['Set specific, measurable, achievable goals'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Goal worksheet'] },
        { title: 'Empathy & Perspective-Taking', objectives: ["Consider others' perspectives and feelings"], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Perspective cards'] },
        { title: 'Conflict Resolution', objectives: ['Use steps to resolve conflicts peacefully'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Conflict resolution steps poster'] },
      ],
    },
  ],
};

const SEL_68: TemplateDef = {
  name: 'Social-Emotional Learning 6-8',
  description: 'Identity, resilience, social skills, and responsible decision-making',
  subject: 'SEL',
  gradeBand: 'G6_8',
  baseStandards: ['CUSTOM'],
  tags: ['sel', 'identity', 'resilience', 'peer-pressure', 'middle-school'],
  unitBlueprints: [
    {
      title: 'Identity & Resilience',
      description: 'Understanding identity, building resilience, and navigating social pressures',
      essentialQuestions: ['Who am I?', 'How do I bounce back from challenges?'],
      bigIdeas: ['Identity is multi-faceted', 'Resilience can be developed through practice'],
      durationDays: 14,
      lessonTopics: [
        { title: 'Exploring Identity', objectives: ['Reflect on personal identity and values'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Identity wheel'] },
        { title: 'Building Resilience', objectives: ['Identify strategies for coping with setbacks'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Resilience scenarios'] },
        { title: 'Navigating Peer Pressure', objectives: ['Practice refusal skills for negative peer pressure'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Role-play scripts'] },
        { title: 'Digital Citizenship & Social Media', objectives: ['Evaluate the impact of social media on well-being'], durationMin: 45, lessonType: 'SEMINAR', materials: ['Case studies'] },
        { title: 'Responsible Decision-Making', objectives: ['Apply a decision-making framework to real scenarios'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Decision matrix'] },
      ],
    },
  ],
};

const SEL_912: TemplateDef = {
  name: 'Social-Emotional Learning 9-12',
  description: 'Leadership, stress management, career readiness, and civic engagement',
  subject: 'SEL',
  gradeBand: 'G9_12',
  baseStandards: ['CUSTOM'],
  tags: ['sel', 'leadership', 'stress-management', 'career-readiness', 'high-school'],
  unitBlueprints: [
    {
      title: 'Leadership & Life Skills',
      description: 'Developing leadership, managing stress, and preparing for post-secondary life',
      essentialQuestions: ['What makes an effective leader?', 'How do I prepare for life after high school?'],
      bigIdeas: ['Leadership is about service and influence', 'Self-management is key to success'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Leadership Styles', objectives: ['Identify and compare different leadership styles'], durationMin: 50, lessonType: 'SEMINAR', materials: ['Leadership style assessments'] },
        { title: 'Stress Management & Mindfulness', objectives: ['Practice evidence-based stress management techniques'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Mindfulness guides'] },
        { title: 'Communication & Collaboration', objectives: ['Apply effective communication skills in group settings'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Collaboration rubrics'] },
        { title: 'Career Exploration', objectives: ['Research career paths and create a career plan'], durationMin: 50, lessonType: 'LAB', materials: ['Career databases'] },
        { title: 'Civic Engagement', objectives: ['Identify ways to participate in civic life'], durationMin: 50, lessonType: 'SEMINAR', materials: ['Community project templates'] },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ARTS TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const ARTS_68: TemplateDef = {
  name: 'Visual & Performing Arts 6-8',
  description: 'Visual art, music, and drama foundations for middle school',
  subject: 'ARTS',
  gradeBand: 'G6_8',
  baseStandards: ['STATE_SPECIFIC'],
  tags: ['visual-art', 'music', 'drama', 'arts', 'middle-school'],
  unitBlueprints: [
    {
      title: 'Visual Arts Foundations',
      description: 'Elements of art, principles of design, and studio practice',
      essentialQuestions: ['How do artists communicate ideas?', 'What are the building blocks of visual art?'],
      bigIdeas: ['Art is a visual language', 'The elements and principles guide artistic expression'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Elements of Art: Line, Shape, Form', objectives: ['Identify and apply elements of art in compositions'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Art supplies', 'Sketchbooks'] },
        { title: 'Color Theory', objectives: ['Understand color relationships and mixing'], durationMin: 50, lessonType: 'LAB', materials: ['Paints', 'Color wheel'] },
        { title: 'Principles of Design', objectives: ['Apply balance, rhythm, and emphasis in compositions'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Art examples', 'Supplies'] },
        { title: 'Art History: Major Movements', objectives: ['Identify key art movements and their characteristics'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Art prints'] },
        { title: 'Studio Project: Self-Expression', objectives: ['Create a work of art expressing personal themes'], durationMin: 60, lessonType: 'LAB', materials: ['Mixed media supplies'] },
      ],
    },
  ],
};

const ARTS_912: TemplateDef = {
  name: 'Studio Art & Music 9-12',
  description: 'Advanced studio art, music theory, and performance',
  subject: 'ARTS',
  gradeBand: 'G9_12',
  baseStandards: ['STATE_SPECIFIC'],
  tags: ['studio-art', 'music-theory', 'performance', 'high-school'],
  unitBlueprints: [
    {
      title: 'Advanced Studio Practice',
      description: 'Portfolio development, mixed media, and art criticism',
      essentialQuestions: ['How do artists develop a personal style?', 'How do we critique art constructively?'],
      bigIdeas: ['Artistic growth requires practice and reflection', 'Critique strengthens artistic expression'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Drawing & Rendering Techniques', objectives: ['Apply advanced drawing techniques for realistic rendering'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Graphite sets', 'Toned paper'] },
        { title: 'Mixed Media & Collage', objectives: ['Create mixed media artworks combining multiple materials'], durationMin: 55, lessonType: 'LAB', materials: ['Found materials', 'Adhesives'] },
        { title: 'Art Criticism & Analysis', objectives: ['Analyze artworks using formal criticism methods'], durationMin: 55, lessonType: 'SEMINAR', materials: ['Art prints', 'Analysis framework'] },
        { title: 'Portfolio Development', objectives: ['Curate a portfolio demonstrating artistic growth'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Portfolio materials'] },
        { title: 'Artist Statement & Exhibition', objectives: ['Write an artist statement and prepare work for exhibition'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Exhibition materials'] },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNOLOGY TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const TECH_68: TemplateDef = {
  name: 'Digital Literacy & Technology 6-8',
  description: 'Digital citizenship, basic coding, and technology skills',
  subject: 'TECHNOLOGY',
  gradeBand: 'G6_8',
  baseStandards: ['STATE_SPECIFIC'],
  tags: ['digital-literacy', 'coding', 'digital-citizenship', 'middle-school'],
  unitBlueprints: [
    {
      title: 'Digital Citizenship & Coding Basics',
      description: 'Online safety, digital footprint, and introduction to programming',
      essentialQuestions: ['How do we stay safe online?', 'How do computers solve problems?'],
      bigIdeas: ['Digital citizenship requires responsibility', 'Computational thinking solves problems systematically'],
      durationDays: 15,
      lessonTopics: [
        { title: 'Digital Footprint & Privacy', objectives: ['Understand how online actions create a digital footprint'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Case studies'] },
        { title: 'Cyberbullying Prevention', objectives: ['Identify cyberbullying and practice response strategies'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Scenario cards'] },
        { title: 'Introduction to Algorithms', objectives: ['Write step-by-step algorithms for everyday tasks'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Pseudocode templates'] },
        { title: 'Block-Based Coding', objectives: ['Create simple programs using block-based coding'], durationMin: 50, lessonType: 'LAB', materials: ['Coding platform access'] },
        { title: 'Web Research & Source Evaluation', objectives: ['Evaluate the credibility of online sources'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Source evaluation rubric'] },
      ],
    },
  ],
};

const TECH_912: TemplateDef = {
  name: 'Computer Science Fundamentals 9-12',
  description: 'Programming, data structures, and computer science principles',
  subject: 'TECHNOLOGY',
  gradeBand: 'G9_12',
  baseStandards: ['STATE_SPECIFIC'],
  tags: ['computer-science', 'programming', 'data-structures', 'high-school'],
  unitBlueprints: [
    {
      title: 'Programming Fundamentals',
      description: 'Variables, control flow, functions, and basic data structures',
      essentialQuestions: ['How do we instruct computers to solve problems?'],
      bigIdeas: ['Programs are sequences of instructions', 'Abstraction simplifies complex problems'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Variables & Data Types', objectives: ['Declare variables and use appropriate data types'], durationMin: 55, lessonType: 'DIRECT_INSTRUCTION', materials: ['IDE access'] },
        { title: 'Control Flow: Conditionals & Loops', objectives: ['Write programs using if/else and loops'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Practice problems'] },
        { title: 'Functions & Modularity', objectives: ['Define and call functions to organize code'], durationMin: 55, lessonType: 'WORKSHOP', materials: ['Function design patterns'] },
        { title: 'Arrays & Lists', objectives: ['Store and manipulate collections of data'], durationMin: 55, lessonType: 'LAB', materials: ['Practice problems'] },
        { title: 'Debugging & Testing', objectives: ['Identify and fix bugs using systematic techniques'], durationMin: 55, lessonType: 'LAB', materials: ['Buggy code samples'] },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHYSICAL EDUCATION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const PE_68: TemplateDef = {
  name: 'Physical Education 6-8',
  description: 'Fitness, sports skills, and health-related fitness concepts',
  subject: 'PHYSICAL_ED',
  gradeBand: 'G6_8',
  baseStandards: ['STATE_SPECIFIC'],
  tags: ['fitness', 'sports', 'health', 'physical-education', 'middle-school'],
  unitBlueprints: [
    {
      title: 'Fitness & Wellness',
      description: 'Components of fitness, exercise planning, and healthy lifestyles',
      essentialQuestions: ['What does it mean to be physically fit?', 'How do I create a fitness plan?'],
      bigIdeas: ['Physical fitness has multiple components', 'Regular activity improves health and well-being'],
      durationDays: 14,
      lessonTopics: [
        { title: 'Components of Physical Fitness', objectives: ['Identify and demonstrate the five components of fitness'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Fitness equipment'] },
        { title: 'Cardiovascular Endurance', objectives: ['Participate in activities that build cardiovascular fitness'], durationMin: 50, lessonType: 'LAB', materials: ['Heart rate monitors'] },
        { title: 'Muscular Strength & Flexibility', objectives: ['Perform exercises for muscular strength and flexibility'], durationMin: 50, lessonType: 'LAB', materials: ['Resistance bands', 'Mats'] },
        { title: 'Creating a Fitness Plan', objectives: ['Design a personal fitness plan with goals'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Fitness plan templates'] },
        { title: 'Nutrition & Wellness', objectives: ['Explain how nutrition supports physical activity'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Nutrition guides'] },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD LANGUAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const WORLD_LANG_912: TemplateDef = {
  name: 'World Language: Spanish I 9-12',
  description: 'Beginning Spanish: greetings, grammar, vocabulary, and cultural awareness',
  subject: 'WORLD_LANGUAGE',
  gradeBand: 'G9_12',
  baseStandards: ['STATE_SPECIFIC'],
  tags: ['spanish', 'world-language', 'culture', 'grammar', 'high-school'],
  unitBlueprints: [
    {
      title: 'Spanish Foundations',
      description: 'Basic communication, greetings, introductions, and present tense',
      essentialQuestions: ['How do we introduce ourselves in Spanish?', 'How do cultural norms differ?'],
      bigIdeas: ['Language connects people and cultures', 'Communication requires vocabulary and grammar'],
      durationDays: 20,
      lessonTopics: [
        { title: 'Greetings & Introductions', objectives: ['Greet others and introduce yourself in Spanish'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Dialogue cards'] },
        { title: 'Alphabet & Pronunciation', objectives: ['Pronounce Spanish sounds correctly'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Audio recordings'] },
        { title: 'Present Tense Regular Verbs', objectives: ['Conjugate regular -ar, -er, -ir verbs in present tense'], durationMin: 50, lessonType: 'DIRECT_INSTRUCTION', materials: ['Conjugation charts'] },
        { title: 'Describing Yourself & Others', objectives: ['Use adjectives to describe people'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Adjective cards', 'Photos'] },
        { title: 'Cultural Exploration: Hispanic World', objectives: ['Explore cultural practices in Spanish-speaking countries'], durationMin: 50, lessonType: 'SEMINAR', materials: ['Cultural videos', 'Maps'] },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CAREER & TECHNICAL EDUCATION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const CTE_912: TemplateDef = {
  name: 'Career & Technical Education 9-12',
  description: 'Career exploration, workplace skills, and financial literacy',
  subject: 'CAREER_TECH',
  gradeBand: 'G9_12',
  baseStandards: ['STATE_SPECIFIC'],
  tags: ['career-exploration', 'workplace-skills', 'financial-literacy', 'high-school'],
  unitBlueprints: [
    {
      title: 'Career Pathways & Workplace Skills',
      description: 'Exploring careers, professional skills, and workplace readiness',
      essentialQuestions: ['What career path is right for me?', 'What skills do employers value?'],
      bigIdeas: ['Career planning starts with self-assessment', 'Professional skills transfer across industries'],
      durationDays: 18,
      lessonTopics: [
        { title: 'Career Interest Inventory', objectives: ['Complete a career interest assessment and identify potential pathways'], durationMin: 50, lessonType: 'LAB', materials: ['Career assessment tools'] },
        { title: 'Resume & Cover Letter Writing', objectives: ['Write a professional resume and cover letter'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Resume templates'] },
        { title: 'Interview Skills', objectives: ['Practice professional interview techniques'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Interview question bank'] },
        { title: 'Workplace Communication', objectives: ['Demonstrate professional written and verbal communication'], durationMin: 50, lessonType: 'WORKSHOP', materials: ['Email templates', 'Role-play scripts'] },
        { title: 'Financial Literacy Basics', objectives: ['Create a budget and understand paycheck deductions'], durationMin: 50, lessonType: 'LAB', materials: ['Budget simulators'] },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_TEMPLATES: TemplateDef[] = [
  // ELA
  ELA_K2, ELA_35, ELA_68, ELA_912,
  // Math
  MATH_K2, MATH_35, MATH_68, MATH_912,
  // Science
  SCIENCE_K2, SCIENCE_35, SCIENCE_68, SCIENCE_912,
  // Social Studies
  SOCIAL_K2, SOCIAL_35, SOCIAL_68, SOCIAL_912,
  // SEL
  SEL_K2, SEL_35, SEL_68, SEL_912,
  // Arts
  ARTS_68, ARTS_912,
  // Technology
  TECH_68, TECH_912,
  // Physical Education
  PE_68,
  // World Language
  WORLD_LANG_912,
  // Career & Technical Education
  CTE_912,
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEEDER
// ═══════════════════════════════════════════════════════════════════════════════

async function seedTemplates(): Promise<void> {
  console.log('🌱 Seeding Curriculum Templates...\n');

  let created = 0;
  let updated = 0;
  let totalUnits = 0;
  let totalLessons = 0;

  for (const template of ALL_TEMPLATES) {
    const lessonCount = template.unitBlueprints.reduce((a, u) => a + u.lessonTopics.length, 0);
    totalUnits += template.unitBlueprints.length;
    totalLessons += lessonCount;

    console.log(`  📋 ${template.name} (${template.subject} / ${template.gradeBand}): ${template.unitBlueprints.length} units, ${lessonCount} lesson topics`);

    const result = await prisma.curriculumTemplate.upsert({
      where: {
        name_subject_gradeBand: {
          name: template.name,
          subject: template.subject,
          gradeBand: template.gradeBand,
        },
      },
      update: {
        description: template.description,
        unitBlueprints: template.unitBlueprints as any,
        baseStandards: template.baseStandards,
        tags: template.tags,
        isActive: true,
        version: 1,
      },
      create: {
        name: template.name,
        description: template.description,
        subject: template.subject,
        gradeBand: template.gradeBand,
        unitBlueprints: template.unitBlueprints as any,
        baseStandards: template.baseStandards,
        academicYear: '2025-2026',
        version: 1,
        isActive: true,
        tags: template.tags,
      },
    });

    // Check if it was an update or create by checking timestamps
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`\n✅ Curriculum templates seeded: ${created} created, ${updated} updated`);
  console.log(`   📊 Total: ${ALL_TEMPLATES.length} templates, ${totalUnits} units, ${totalLessons} lesson topics`);
  console.log(`   📚 Subjects: ${new Set(ALL_TEMPLATES.map(t => t.subject)).size}`);
  console.log(`   🎓 Grade bands: ${new Set(ALL_TEMPLATES.map(t => t.gradeBand)).size}`);
}

seedTemplates()
  .catch((e) => {
    console.error('❌ Template seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
