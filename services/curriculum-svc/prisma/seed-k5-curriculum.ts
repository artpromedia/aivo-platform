/**
 * K-5 Curriculum Seed Data
 *
 * Seeds curriculum records for ALL subjects in grades K-5:
 *   - Reading & Literacy (ELA): Phonics, Fluency, Comprehension, Vocabulary, Writing
 *   - Mathematics: Number Sense, Geometry, Measurement & Data, Operations & Algebraic Thinking
 *   - Science: Life Science, Earth & Space, Physical Science, Engineering & Design
 *   - Social Studies: History, Geography, Civics, Economics
 *   - SEL: Self-Awareness, Self-Management, Social Awareness, Relationship Skills, Decision-Making
 *
 * Each strand has 3+ units with 5 lessons each, aligned to Common Core / NGSS / C3 standards.
 *
 * Usage:
 *   npx tsx prisma/seed-k5-curriculum.ts
 */

import 'dotenv/config';

// ---------------------------------------------------------------------------
// Inline Prisma client types – the generated client uses these exact enum
// values so we mirror them here to avoid import-path issues across monorepo
// build configurations.
// ---------------------------------------------------------------------------

type CurriculumStandard = 'COMMON_CORE' | 'NGSS' | 'C3' | 'STATE_SPECIFIC' | 'CUSTOM';
type GradeBand = 'PRE_K' | 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';
type SubjectArea = 'ELA' | 'MATH' | 'SCIENCE' | 'SOCIAL_STUDIES' | 'SEL' | 'ARTS' | 'WORLD_LANGUAGE' | 'PHYSICAL_ED' | 'TECHNOLOGY' | 'CAREER_TECH';
type UnitStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

// We use dynamic import so this script can run with tsx regardless of output path
const { PrismaClient } = await import('../src/generated/prisma-client/index.js');
const prisma = new PrismaClient();

const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const AUTHOR_USER_ID = '00000000-0000-0000-1000-000000000002';
const ACADEMIC_YEAR = '2025-2026';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

let curriculumCounter = 0;
function cid(): string {
  curriculumCounter++;
  return `10000000-0000-0000-0001-${String(curriculumCounter).padStart(12, '0')}`;
}

let unitCounter = 0;
function uid(): string {
  unitCounter++;
  return `10000000-0000-0000-0002-${String(unitCounter).padStart(12, '0')}`;
}

let lessonCounter = 0;
function lid(): string {
  lessonCounter++;
  return `10000000-0000-0000-0003-${String(lessonCounter).padStart(12, '0')}`;
}

let stdCounter = 0;
function sid(): string {
  stdCounter++;
  return `10000000-0000-0000-0004-${String(stdCounter).padStart(12, '0')}`;
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
// ELA  K-2
// ═══════════════════════════════════════════════════════════════════════════════

const ELA_K2: StrandDef[] = [
  {
    name: 'Phonics & Word Recognition K-2',
    description: 'Foundation phonics skills including letter-sound correspondence, blending, and decoding',
    subject: 'ELA',
    standard: 'COMMON_CORE',
    gradeBand: 'K_2',
    units: [
      {
        title: 'Letter-Sound Correspondence',
        description: 'Learning individual letter sounds and their written forms',
        essentialQuestions: ['How do letters represent sounds?', 'How do we decode words?'],
        bigIdeas: ['Letters have sounds', 'Sounds combine to form words'],
        durationDays: 15,
        lessons: [
          { title: 'Consonant Sounds: B, C, D, F', objectives: ['Identify consonant sounds B-F', 'Match letters to sounds'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Letter cards', 'Sound chart'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.K.3.A', description: 'Demonstrate basic knowledge of one-to-one letter-sound correspondences', category: 'Phonics' }] },
          { title: 'Consonant Sounds: G, H, J, K, L', objectives: ['Identify consonant sounds G-L'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Letter cards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.K.3.A', description: 'Demonstrate basic knowledge of one-to-one letter-sound correspondences', category: 'Phonics' }] },
          { title: 'Short Vowel Sounds: A, E', objectives: ['Distinguish short vowel sounds a and e', 'Read CVC words with short a and e'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Vowel cards', 'Decodable readers'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.K.3.B', description: 'Associate the long and short sounds with common spellings', category: 'Phonics' }] },
          { title: 'Short Vowel Sounds: I, O, U', objectives: ['Distinguish short vowel sounds i, o, u', 'Read CVC words with short i, o, u'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Vowel cards', 'Decodable readers'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.K.3.B', description: 'Associate the long and short sounds with common spellings', category: 'Phonics' }] },
          { title: 'Blending CVC Words', objectives: ['Blend consonant-vowel-consonant words', 'Read simple CVC words fluently'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Word cards', 'Magnetic letters'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.K.2.D', description: 'Isolate and pronounce initial, medial, and final sounds', category: 'Phonological Awareness' }] },
        ],
      },
      {
        title: 'Consonant Blends & Digraphs',
        description: 'Two-letter consonant combinations and digraph sounds',
        essentialQuestions: ['What happens when two consonants appear together?'],
        bigIdeas: ['Some letter combinations create new sounds', 'Digraphs represent a single sound'],
        durationDays: 12,
        lessons: [
          { title: 'Initial Blends: bl, cl, fl', objectives: ['Identify and read words with bl, cl, fl blends'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Blend cards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.3.A', description: 'Know the spelling-sound correspondences for common consonant digraphs', category: 'Phonics' }] },
          { title: 'Initial Blends: br, cr, dr, gr', objectives: ['Identify and read words with r-blends'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Blend cards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.3.A', description: 'Know the spelling-sound correspondences for common consonant digraphs', category: 'Phonics' }] },
          { title: 'Digraphs: sh, ch, th', objectives: ['Recognize digraph sounds', 'Read words with sh, ch, th'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Digraph cards', 'Sort mats'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.3.A', description: 'Know the spelling-sound correspondences for common consonant digraphs', category: 'Phonics' }] },
          { title: 'Digraphs: wh, ph, ck', objectives: ['Recognize digraph sounds wh, ph, ck'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Digraph cards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.3.A', description: 'Know the spelling-sound correspondences for common consonant digraphs', category: 'Phonics' }] },
          { title: 'Blends & Digraphs Review', objectives: ['Distinguish between blends and digraphs', 'Read decodable text with blends and digraphs'], durationMin: 30, lessonType: 'ASSESSMENT', materials: ['Decodable readers', 'Assessment sheet'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.3', description: 'Know and apply grade-level phonics and word analysis skills', category: 'Phonics' }] },
        ],
      },
      {
        title: 'Long Vowel Patterns',
        description: 'CVCe and vowel team patterns for long vowel sounds',
        essentialQuestions: ['How does silent e change a vowel sound?', 'What are vowel teams?'],
        bigIdeas: ['Silent e makes the vowel say its name', 'Two vowels together often make a long sound'],
        durationDays: 15,
        lessons: [
          { title: 'Long a: CVCe Words (a_e)', objectives: ['Read CVCe words with long a', 'Distinguish short a vs long a'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Word cards', 'Sorting mats'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.3.C', description: 'Know final -e and common vowel team conventions', category: 'Phonics' }] },
          { title: 'Long i: CVCe Words (i_e)', objectives: ['Read CVCe words with long i'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Word cards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.3.C', description: 'Know final -e and common vowel team conventions', category: 'Phonics' }] },
          { title: 'Long o: CVCe Words (o_e)', objectives: ['Read CVCe words with long o'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Word cards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.3.C', description: 'Know final -e and common vowel team conventions', category: 'Phonics' }] },
          { title: 'Vowel Teams: ai, ay, ea, ee', objectives: ['Read words with vowel teams ai, ay, ea, ee'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Vowel team cards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.2.3.B', description: 'Know spelling-sound correspondences for additional common vowel teams', category: 'Phonics' }] },
          { title: 'Vowel Teams: oa, ow, oo, ou', objectives: ['Read words with vowel teams oa, ow, oo, ou'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Vowel team cards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.2.3.B', description: 'Know spelling-sound correspondences for additional common vowel teams', category: 'Phonics' }] },
        ],
      },
    ],
  },
  {
    name: 'Reading Fluency K-2',
    description: 'Building reading speed, accuracy, and prosody',
    subject: 'ELA',
    standard: 'COMMON_CORE',
    gradeBand: 'K_2',
    units: [
      {
        title: 'Sight Word Mastery',
        description: 'High-frequency words for automatic recognition',
        essentialQuestions: ['Why do some words need to be memorized?'],
        bigIdeas: ['Some words appear very often in text', 'Automatic word recognition improves reading speed'],
        durationDays: 20,
        lessons: [
          { title: 'Dolch Pre-Primer Words Set 1', objectives: ['Read 10 pre-primer sight words automatically'], durationMin: 20, lessonType: 'DIRECT_INSTRUCTION', materials: ['Flashcards', 'Word wall'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.K.3.C', description: 'Read common high-frequency words by sight', category: 'Fluency' }] },
          { title: 'Dolch Pre-Primer Words Set 2', objectives: ['Read 10 more pre-primer sight words'], durationMin: 20, lessonType: 'DIRECT_INSTRUCTION', materials: ['Flashcards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.K.3.C', description: 'Read common high-frequency words by sight', category: 'Fluency' }] },
          { title: 'Dolch Primer Words', objectives: ['Read primer-level sight words'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Flashcards', 'Sentence strips'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.3.G', description: 'Recognize and read grade-appropriate irregularly spelled words', category: 'Fluency' }] },
          { title: 'Grade 1 Dolch Words', objectives: ['Read first-grade sight words in context'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Decodable readers'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.3.G', description: 'Recognize and read grade-appropriate irregularly spelled words', category: 'Fluency' }] },
          { title: 'Grade 2 Dolch Words', objectives: ['Read second-grade sight words fluently'], durationMin: 25, lessonType: 'ASSESSMENT', materials: ['Assessment passages'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.2.3.F', description: 'Recognize and read grade-appropriate irregularly spelled words', category: 'Fluency' }] },
        ],
      },
      {
        title: 'Oral Reading Fluency',
        description: 'Reading aloud with appropriate rate, accuracy, and expression',
        essentialQuestions: ['What does fluent reading sound like?'],
        bigIdeas: ['Fluent readers read smoothly and with expression', 'Practice builds automaticity'],
        durationDays: 15,
        lessons: [
          { title: 'Echo Reading', objectives: ['Model fluent reading through echo reading'], durationMin: 20, lessonType: 'DIRECT_INSTRUCTION', materials: ['Read-aloud text'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.4.B', description: 'Read grade-level text orally with accuracy, rate, and expression', category: 'Fluency' }] },
          { title: 'Choral Reading', objectives: ['Practice fluency through choral reading'], durationMin: 20, lessonType: 'WORKSHOP', materials: ['Poetry anthology'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.1.4.B', description: 'Read grade-level text orally with accuracy, rate, and expression', category: 'Fluency' }] },
          { title: 'Partner Reading', objectives: ['Build fluency through repeated partner reading'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Leveled readers'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.2.4.B', description: 'Read grade-level text orally with accuracy, rate, and expression', category: 'Fluency' }] },
          { title: 'Reading with Expression', objectives: ['Use punctuation to guide expression', 'Read dialogue with character voices'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Script readers'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.2.4.B', description: 'Read grade-level text orally with accuracy, rate, and expression', category: 'Fluency' }] },
          { title: 'Timed Reading Assessment', objectives: ['Demonstrate fluency at grade-level rate'], durationMin: 15, lessonType: 'ASSESSMENT', materials: ['Assessment passage', 'Timer'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RF.2.4', description: 'Read with sufficient accuracy and fluency', category: 'Fluency' }] },
        ],
      },
      {
        title: 'Reading Comprehension Foundations',
        description: 'Basic comprehension strategies for early readers',
        essentialQuestions: ['How do we understand what we read?', 'How do we retell a story?'],
        bigIdeas: ['Good readers think while they read', 'Stories have a beginning, middle, and end'],
        durationDays: 15,
        lessons: [
          { title: 'Asking Questions While Reading', objectives: ['Generate questions before, during, and after reading'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Picture books', 'Question stems'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.K.1', description: 'Ask and answer questions about key details', category: 'Comprehension' }] },
          { title: 'Retelling a Story', objectives: ['Retell familiar stories with key details'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Story sequence cards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.K.2', description: 'Retell familiar stories with key details', category: 'Comprehension' }] },
          { title: 'Identifying Characters & Setting', objectives: ['Identify characters, setting, and major events'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Graphic organizers'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.1.3', description: 'Describe characters, settings, and major events', category: 'Comprehension' }] },
          { title: 'Making Predictions', objectives: ['Use text clues and illustrations to make predictions'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Picture books'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.1.7', description: 'Use illustrations and details to describe characters, setting, or events', category: 'Comprehension' }] },
          { title: 'Main Idea & Details', objectives: ['Identify main topic and key details in informational text'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Informational texts'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RI.2.2', description: 'Identify the main topic of a multi-paragraph text', category: 'Comprehension' }] },
        ],
      },
    ],
  },
  {
    name: 'Vocabulary Development K-2',
    description: 'Building word knowledge through context, morphology, and word relationships',
    subject: 'ELA',
    standard: 'COMMON_CORE',
    gradeBand: 'K_2',
    units: [
      {
        title: 'Word Meaning Strategies',
        description: 'Using context clues and word parts to determine meaning',
        essentialQuestions: ['How can we figure out what a new word means?'],
        bigIdeas: ['Context clues help readers understand new words', 'Word parts provide meaning clues'],
        durationDays: 12,
        lessons: [
          { title: 'Using Picture Clues', objectives: ['Use illustrations to understand word meaning'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Picture books'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.L.K.4.A', description: 'Identify new meanings for familiar words', category: 'Vocabulary' }] },
          { title: 'Using Sentence Clues', objectives: ['Use surrounding words to determine meaning'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Sentence strips'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.L.1.4.A', description: 'Use sentence-level context as a clue to the meaning of a word', category: 'Vocabulary' }] },
          { title: 'Prefixes: un-, re-', objectives: ['Understand how prefixes change word meaning'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Prefix cards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.L.2.4.B', description: 'Determine the meaning of the new word formed with a known prefix', category: 'Vocabulary' }] },
          { title: 'Suffixes: -er, -est, -ful', objectives: ['Understand how suffixes change word meaning'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Suffix cards'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.L.2.4.B', description: 'Determine the meaning of the new word formed with a known suffix', category: 'Vocabulary' }] },
          { title: 'Compound Words', objectives: ['Identify and read compound words', 'Use word parts to determine meaning'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Compound word puzzles'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.L.2.4.D', description: 'Use knowledge of individual words to predict the meaning of compound words', category: 'Vocabulary' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ELA 3-5
// ═══════════════════════════════════════════════════════════════════════════════

const ELA_35: StrandDef[] = [
  {
    name: 'Reading Comprehension 3-5',
    description: 'Advanced comprehension strategies for upper-elementary readers',
    subject: 'ELA',
    standard: 'COMMON_CORE',
    gradeBand: 'G3_5',
    units: [
      {
        title: 'Story Elements & Theme',
        description: 'Analyzing narrative structure and identifying themes',
        essentialQuestions: ['How do authors develop themes?', 'What makes a story compelling?'],
        bigIdeas: ['Stories convey universal themes', 'Authors use literary elements purposefully'],
        durationDays: 15,
        lessons: [
          { title: 'Character Traits & Motivations', objectives: ['Describe characters using evidence from the text'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Chapter books', 'Character map'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.3.3', description: 'Describe characters and explain how their actions contribute to events', category: 'Literature' }] },
          { title: 'Plot Structure: Beginning, Middle, End', objectives: ['Map plot events using a story mountain'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Story mountain template'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.3.5', description: 'Refer to parts of stories, dramas, and poems', category: 'Literature' }] },
          { title: 'Point of View', objectives: ['Distinguish between first and third person narration'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Paired passages'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.4.6', description: 'Compare and contrast the point of view from which stories are narrated', category: 'Literature' }] },
          { title: 'Identifying Theme', objectives: ['Determine the theme of a story from details'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Short stories'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.4.2', description: 'Determine a theme of a story from details in the text', category: 'Literature' }] },
          { title: 'Comparing Themes Across Texts', objectives: ['Compare and contrast themes and topics across texts'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Text sets'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RL.5.9', description: 'Compare and contrast stories in the same genre on their themes and topics', category: 'Literature' }] },
        ],
      },
      {
        title: 'Informational Text Analysis',
        description: 'Reading and analyzing nonfiction texts',
        essentialQuestions: ['How do we evaluate informational text?', 'How do text features support comprehension?'],
        bigIdeas: ['Nonfiction texts have structures that aid understanding', 'Critical readers evaluate evidence'],
        durationDays: 15,
        lessons: [
          { title: 'Text Features: Headings, Glossaries, Indexes', objectives: ['Use text features to locate information efficiently'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Nonfiction books'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RI.3.5', description: 'Use text features and search tools to locate information', category: 'Informational Text' }] },
          { title: 'Main Idea & Supporting Details', objectives: ['Determine the main idea and explain how details support it'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Nonfiction articles'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RI.4.2', description: 'Determine the main idea and explain how it is supported by key details', category: 'Informational Text' }] },
          { title: 'Text Structures: Cause/Effect & Compare/Contrast', objectives: ['Identify organizational structures in informational text'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Graphic organizers'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RI.4.5', description: 'Describe the overall structure of events, ideas, concepts, or information', category: 'Informational Text' }] },
          { title: 'Author\'s Purpose & Reasoning', objectives: ['Explain how an author uses reasons and evidence to support points'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Persuasive articles'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RI.5.8', description: 'Explain how an author uses reasons and evidence to support particular points', category: 'Informational Text' }] },
          { title: 'Integrating Information from Multiple Sources', objectives: ['Integrate information from several texts on the same topic'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Text sets'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.RI.5.9', description: 'Integrate information from several texts on the same topic', category: 'Informational Text' }] },
        ],
      },
      {
        title: 'Writing Workshop 3-5',
        description: 'Developing narrative, informational, and opinion writing skills',
        essentialQuestions: ['How do writers organize their ideas?', 'How do we write for different purposes?'],
        bigIdeas: ['Writing is a process', 'Different purposes require different structures'],
        durationDays: 20,
        lessons: [
          { title: 'Narrative Writing: Personal Narratives', objectives: ['Write a focused personal narrative with details'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Writer\'s notebook'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.3.3', description: 'Write narratives to develop real or imagined experiences', category: 'Writing' }] },
          { title: 'Opinion Writing: Stating a Claim', objectives: ['Write opinion pieces supporting a point of view with reasons'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Graphic organizer'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.4.1', description: 'Write opinion pieces on topics supporting a point of view with reasons', category: 'Writing' }] },
          { title: 'Informational Writing: Research Reports', objectives: ['Write informative texts with organized facts and details'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Research sources'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.4.2', description: 'Write informative/explanatory texts to examine a topic', category: 'Writing' }] },
          { title: 'Revising & Editing', objectives: ['Strengthen writing through revision and editing'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Editing checklist'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.5.5', description: 'Develop and strengthen writing by planning, revising, editing', category: 'Writing' }] },
          { title: 'Publishing & Sharing', objectives: ['Produce clear and coherent writing for publication'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Publishing tools'], standardCodes: [{ code: 'CCSS.ELA-LITERACY.W.5.6', description: 'Use technology to produce and publish writing', category: 'Writing' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MATH K-2
// ═══════════════════════════════════════════════════════════════════════════════

const MATH_K2: StrandDef[] = [
  {
    name: 'Number Sense & Counting K-2',
    description: 'Counting, number recognition, place value, and number relationships',
    subject: 'MATH',
    standard: 'COMMON_CORE',
    gradeBand: 'K_2',
    units: [
      {
        title: 'Counting & Cardinality',
        description: 'Counting to 100 and understanding quantity',
        essentialQuestions: ['How do we count?', 'What do numbers represent?'],
        bigIdeas: ['Numbers represent quantity', 'Counting follows a specific sequence'],
        durationDays: 15,
        lessons: [
          { title: 'Counting to 20', objectives: ['Count forward from any given number within 20', 'Write numbers 0-20'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Number line', 'Counters'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.K.CC.A.1', description: 'Count to 100 by ones and tens', category: 'Counting & Cardinality' }] },
          { title: 'Counting to 100 by Ones', objectives: ['Count to 100 by ones'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Hundreds chart'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.K.CC.A.1', description: 'Count to 100 by ones and tens', category: 'Counting & Cardinality' }] },
          { title: 'Counting to 100 by Tens', objectives: ['Skip count by tens to 100'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Base-ten blocks', 'Hundreds chart'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.K.CC.A.1', description: 'Count to 100 by ones and tens', category: 'Counting & Cardinality' }] },
          { title: 'Comparing Numbers', objectives: ['Compare two numbers between 1 and 10 using greater than, less than, equal to'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Comparison cards'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.K.CC.C.6', description: 'Identify whether the number of objects in one group is greater than, less than, or equal to the number in another group', category: 'Counting & Cardinality' }] },
          { title: 'Counting Assessment', objectives: ['Demonstrate counting skills to 100'], durationMin: 20, lessonType: 'ASSESSMENT', materials: ['Assessment sheet'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.K.CC.A.2', description: 'Count forward beginning from a given number', category: 'Counting & Cardinality' }] },
        ],
      },
      {
        title: 'Place Value',
        description: 'Understanding tens and ones in two- and three-digit numbers',
        essentialQuestions: ['Why does position matter in a number?'],
        bigIdeas: ['The value of a digit depends on its position', 'Numbers can be composed and decomposed'],
        durationDays: 15,
        lessons: [
          { title: 'Tens and Ones', objectives: ['Understand that two-digit numbers are composed of tens and ones'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Base-ten blocks', 'Place value chart'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.1.NBT.B.2', description: 'Understand that the two digits of a two-digit number represent amounts of tens and ones', category: 'Number & Operations in Base Ten' }] },
          { title: 'Composing Two-Digit Numbers', objectives: ['Compose and decompose numbers from 11 to 19'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Base-ten blocks'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.K.NBT.A.1', description: 'Compose and decompose numbers from 11 to 19', category: 'Number & Operations in Base Ten' }] },
          { title: 'Expanded Form', objectives: ['Write two-digit numbers in expanded form'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Place value chart'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.2.NBT.A.3', description: 'Read and write numbers to 1000 using expanded form', category: 'Number & Operations in Base Ten' }] },
          { title: 'Comparing Two-Digit Numbers', objectives: ['Compare two two-digit numbers using >, <, = symbols'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Comparison symbols'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.1.NBT.B.3', description: 'Compare two two-digit numbers using >, =, and < symbols', category: 'Number & Operations in Base Ten' }] },
          { title: 'Three-Digit Place Value', objectives: ['Understand hundreds, tens, ones in three-digit numbers'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Base-ten blocks', 'Place value chart'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.2.NBT.A.1', description: 'Understand that the three digits of a three-digit number represent hundreds, tens, and ones', category: 'Number & Operations in Base Ten' }] },
        ],
      },
      {
        title: 'Addition & Subtraction within 20',
        description: 'Fluency with addition and subtraction facts',
        essentialQuestions: ['What strategies help us add and subtract?'],
        bigIdeas: ['Addition and subtraction are inverse operations', 'Strategies help build fact fluency'],
        durationDays: 20,
        lessons: [
          { title: 'Addition within 10', objectives: ['Add within 10 using objects, drawings, and strategies'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Counters', 'Ten frames'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.K.OA.A.2', description: 'Solve addition word problems within 10', category: 'Operations & Algebraic Thinking' }] },
          { title: 'Subtraction within 10', objectives: ['Subtract within 10 using concrete models'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Counters', 'Ten frames'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.K.OA.A.2', description: 'Solve subtraction word problems within 10', category: 'Operations & Algebraic Thinking' }] },
          { title: 'Making 10 Strategy', objectives: ['Use the making 10 strategy to add'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Double ten frames'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.1.OA.C.6', description: 'Add and subtract within 20 using strategies such as making ten', category: 'Operations & Algebraic Thinking' }] },
          { title: 'Doubles & Near Doubles', objectives: ['Use doubles and near doubles facts for addition'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Doubles cards'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.1.OA.C.6', description: 'Add and subtract within 20', category: 'Operations & Algebraic Thinking' }] },
          { title: 'Fact Fluency Assessment', objectives: ['Demonstrate fluency with addition and subtraction within 20'], durationMin: 20, lessonType: 'ASSESSMENT', materials: ['Fact fluency assessment'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.2.OA.B.2', description: 'Fluently add and subtract within 20', category: 'Operations & Algebraic Thinking' }] },
        ],
      },
    ],
  },
  {
    name: 'Geometry K-2',
    description: 'Identifying, describing, and composing shapes',
    subject: 'MATH',
    standard: 'COMMON_CORE',
    gradeBand: 'K_2',
    units: [
      {
        title: '2D & 3D Shapes',
        description: 'Recognizing and describing two- and three-dimensional shapes',
        essentialQuestions: ['How do we describe shapes?', 'Where do we see shapes in the world?'],
        bigIdeas: ['Shapes can be described by their attributes', 'Shapes are all around us'],
        durationDays: 12,
        lessons: [
          { title: 'Identifying 2D Shapes', objectives: ['Identify circles, triangles, squares, rectangles'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Shape manipulatives'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.K.G.A.2', description: 'Correctly name shapes regardless of their orientations or overall size', category: 'Geometry' }] },
          { title: 'Attributes of 2D Shapes', objectives: ['Describe shape attributes: sides, vertices, angles'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Geoboards'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.1.G.A.1', description: 'Distinguish between defining attributes versus non-defining attributes', category: 'Geometry' }] },
          { title: 'Identifying 3D Shapes', objectives: ['Identify cubes, spheres, cylinders, cones'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['3D shape models'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.K.G.A.3', description: 'Identify shapes as two-dimensional or three-dimensional', category: 'Geometry' }] },
          { title: 'Composing Shapes', objectives: ['Create new shapes by composing two or more shapes'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Tangrams', 'Pattern blocks'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.1.G.A.2', description: 'Compose two-dimensional or three-dimensional shapes to create a composite shape', category: 'Geometry' }] },
          { title: 'Partitioning Shapes', objectives: ['Partition shapes into halves, thirds, and fourths'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Fraction circles'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.2.G.A.3', description: 'Partition circles and rectangles into two, three, or four equal shares', category: 'Geometry' }] },
        ],
      },
    ],
  },
  {
    name: 'Measurement & Data K-2',
    description: 'Measuring length, telling time, and representing data',
    subject: 'MATH',
    standard: 'COMMON_CORE',
    gradeBand: 'K_2',
    units: [
      {
        title: 'Length & Measurement',
        description: 'Measuring and comparing lengths using standard and non-standard units',
        essentialQuestions: ['How do we measure the world around us?'],
        bigIdeas: ['Measurement is comparing to a standard', 'We use tools to measure accurately'],
        durationDays: 10,
        lessons: [
          { title: 'Comparing Lengths', objectives: ['Compare two objects by length using direct comparison'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Rulers', 'Objects to measure'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.K.MD.A.2', description: 'Directly compare two objects with a measurable attribute in common', category: 'Measurement & Data' }] },
          { title: 'Measuring with Non-Standard Units', objectives: ['Measure length using non-standard units'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Paper clips', 'Unifix cubes'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.1.MD.A.2', description: 'Express the length of an object as a whole number of length units', category: 'Measurement & Data' }] },
          { title: 'Measuring with Rulers (inches)', objectives: ['Measure objects using a ruler in inches'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Rulers'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.2.MD.A.1', description: 'Measure the length of an object with appropriate tools', category: 'Measurement & Data' }] },
          { title: 'Measuring with Rulers (centimeters)', objectives: ['Measure objects using a ruler in centimeters'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Metric rulers'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.2.MD.A.1', description: 'Measure the length of an object with appropriate tools', category: 'Measurement & Data' }] },
          { title: 'Telling Time', objectives: ['Tell time to the nearest five minutes using analog and digital clocks'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Clock models'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.2.MD.C.7', description: 'Tell and write time to the nearest five minutes', category: 'Measurement & Data' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MATH 3-5
// ═══════════════════════════════════════════════════════════════════════════════

const MATH_35: StrandDef[] = [
  {
    name: 'Multiplication & Division 3-5',
    description: 'Multi-digit multiplication, division, and algebraic thinking',
    subject: 'MATH',
    standard: 'COMMON_CORE',
    gradeBand: 'G3_5',
    units: [
      {
        title: 'Multiplication Concepts',
        description: 'Understanding multiplication as equal groups and arrays',
        essentialQuestions: ['What does multiplication represent?'],
        bigIdeas: ['Multiplication is repeated addition of equal groups', 'Arrays model multiplication'],
        durationDays: 15,
        lessons: [
          { title: 'Equal Groups', objectives: ['Interpret products of whole numbers as equal groups'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Counters', 'Cups'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.OA.A.1', description: 'Interpret products of whole numbers', category: 'Operations & Algebraic Thinking' }] },
          { title: 'Arrays & Area Models', objectives: ['Use arrays to model multiplication'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Grid paper', 'Color tiles'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.OA.A.1', description: 'Interpret products of whole numbers', category: 'Operations & Algebraic Thinking' }] },
          { title: 'Multiplication Facts: 0-5', objectives: ['Know multiplication facts for 0-5 from memory'], durationMin: 40, lessonType: 'WORKSHOP', materials: ['Flashcards'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.OA.C.7', description: 'Fluently multiply within 100', category: 'Operations & Algebraic Thinking' }] },
          { title: 'Multiplication Facts: 6-9', objectives: ['Know multiplication facts for 6-9 from memory'], durationMin: 40, lessonType: 'WORKSHOP', materials: ['Flashcards'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.OA.C.7', description: 'Fluently multiply within 100', category: 'Operations & Algebraic Thinking' }] },
          { title: 'Multi-Digit Multiplication', objectives: ['Multiply multi-digit numbers using the standard algorithm'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Graph paper'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.5.NBT.B.5', description: 'Fluently multiply multi-digit whole numbers', category: 'Number & Operations in Base Ten' }] },
        ],
      },
      {
        title: 'Division Concepts',
        description: 'Understanding division as sharing and grouping',
        essentialQuestions: ['What does division mean?', 'How are multiplication and division related?'],
        bigIdeas: ['Division is the inverse of multiplication', 'Division can mean equal sharing or grouping'],
        durationDays: 15,
        lessons: [
          { title: 'Division as Equal Sharing', objectives: ['Interpret whole-number quotients as sharing'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Counters'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.OA.A.2', description: 'Interpret whole-number quotients of whole numbers', category: 'Operations & Algebraic Thinking' }] },
          { title: 'Fact Families', objectives: ['Understand the relationship between multiplication and division'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Fact family triangles'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.OA.B.6', description: 'Understand division as an unknown-factor problem', category: 'Operations & Algebraic Thinking' }] },
          { title: 'Division Facts', objectives: ['Fluently divide within 100'], durationMin: 40, lessonType: 'WORKSHOP', materials: ['Flashcards'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.OA.C.7', description: 'Fluently divide within 100', category: 'Operations & Algebraic Thinking' }] },
          { title: 'Long Division', objectives: ['Divide multi-digit numbers using the standard algorithm'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Graph paper'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.4.NBT.B.6', description: 'Find quotients and remainders with up to four-digit dividends', category: 'Number & Operations in Base Ten' }] },
          { title: 'Word Problems with All Operations', objectives: ['Solve multi-step word problems using four operations'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Problem sets'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.4.OA.A.3', description: 'Solve multistep word problems with whole numbers', category: 'Operations & Algebraic Thinking' }] },
        ],
      },
      {
        title: 'Fractions 3-5',
        description: 'Understanding, comparing, and operating with fractions',
        essentialQuestions: ['What are fractions?', 'How do we add and subtract fractions?'],
        bigIdeas: ['Fractions are numbers', 'Equivalent fractions represent the same value'],
        durationDays: 20,
        lessons: [
          { title: 'Introduction to Fractions', objectives: ['Understand unit fractions as parts of a whole'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Fraction circles', 'Fraction strips'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.NF.A.1', description: 'Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts', category: 'Number & Operations—Fractions' }] },
          { title: 'Equivalent Fractions', objectives: ['Generate equivalent fractions using visual models'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Fraction bars'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.NF.A.3', description: 'Explain equivalence of fractions and compare fractions', category: 'Number & Operations—Fractions' }] },
          { title: 'Comparing Fractions', objectives: ['Compare fractions with different numerators and denominators'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Number line', 'Fraction tiles'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.4.NF.A.2', description: 'Compare two fractions with different numerators and different denominators', category: 'Number & Operations—Fractions' }] },
          { title: 'Adding & Subtracting Fractions', objectives: ['Add and subtract fractions with like denominators'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Fraction models'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.4.NF.B.3', description: 'Understand a fraction a/b with a > 1 as a sum of fractions 1/b', category: 'Number & Operations—Fractions' }] },
          { title: 'Multiplying Fractions', objectives: ['Multiply a fraction by a whole number and by a fraction'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Area models'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.5.NF.B.4', description: 'Apply and extend previous understandings of multiplication to multiply a fraction or whole number by a fraction', category: 'Number & Operations—Fractions' }] },
        ],
      },
    ],
  },
  {
    name: 'Geometry & Measurement 3-5',
    description: 'Area, perimeter, volume, and geometric reasoning',
    subject: 'MATH',
    standard: 'COMMON_CORE',
    gradeBand: 'G3_5',
    units: [
      {
        title: 'Area & Perimeter',
        description: 'Understanding and calculating area and perimeter',
        essentialQuestions: ['What is the difference between area and perimeter?'],
        bigIdeas: ['Area measures space inside a shape', 'Perimeter measures the distance around a shape'],
        durationDays: 12,
        lessons: [
          { title: 'Understanding Perimeter', objectives: ['Find the perimeter of polygons'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Grid paper', 'Rulers'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.MD.D.8', description: 'Solve real world and mathematical problems involving perimeters of polygons', category: 'Measurement & Data' }] },
          { title: 'Understanding Area', objectives: ['Measure areas by counting unit squares'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Unit tiles', 'Grid paper'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.MD.C.6', description: 'Measure areas by counting unit squares', category: 'Measurement & Data' }] },
          { title: 'Area Formula for Rectangles', objectives: ['Use length × width to find area'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Grid paper'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.MD.C.7', description: 'Relate area to the operations of multiplication and addition', category: 'Measurement & Data' }] },
          { title: 'Area of Composite Shapes', objectives: ['Find area of composite shapes by decomposing'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Tangrams'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.3.MD.C.7.D', description: 'Recognize area as additive', category: 'Measurement & Data' }] },
          { title: 'Volume of Rectangular Prisms', objectives: ['Find volume by counting unit cubes and using formulas'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Unit cubes'], standardCodes: [{ code: 'CCSS.MATH.CONTENT.5.MD.C.4', description: 'Measure volumes by counting unit cubes', category: 'Measurement & Data' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCIENCE K-2
// ═══════════════════════════════════════════════════════════════════════════════

const SCIENCE_K2: StrandDef[] = [
  {
    name: 'Life Science K-2',
    description: 'Living things, habitats, and life cycles',
    subject: 'SCIENCE',
    standard: 'NGSS',
    gradeBand: 'K_2',
    units: [
      {
        title: 'Living vs. Non-Living Things',
        description: 'Distinguishing between living and non-living things',
        essentialQuestions: ['What makes something alive?'],
        bigIdeas: ['Living things grow, reproduce, and respond to their environment'],
        durationDays: 10,
        lessons: [
          { title: 'Characteristics of Living Things', objectives: ['Identify characteristics shared by all living things'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Sorting cards', 'Nature specimens'], standardCodes: [{ code: 'K-LS1-1', description: 'Use observations to describe patterns of what plants and animals need to survive', category: 'Life Science' }] },
          { title: 'Plants as Living Things', objectives: ['Observe and describe plant growth'], durationMin: 30, lessonType: 'LAB', materials: ['Seeds', 'Soil', 'Pots'], standardCodes: [{ code: 'K-LS1-1', description: 'Use observations to describe patterns of what plants and animals need to survive', category: 'Life Science' }] },
          { title: 'Animals as Living Things', objectives: ['Observe and describe animal behaviors'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Animal picture cards'], standardCodes: [{ code: 'K-LS1-1', description: 'Use observations to describe patterns of what plants and animals need to survive', category: 'Life Science' }] },
          { title: 'What Plants & Animals Need', objectives: ['Describe what plants and animals need to survive'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Needs diagrams'], standardCodes: [{ code: 'K-LS1-1', description: 'Use observations to describe patterns of what plants and animals need to survive', category: 'Life Science' }] },
          { title: 'Sorting Living & Non-Living', objectives: ['Classify items as living or non-living'], durationMin: 25, lessonType: 'ASSESSMENT', materials: ['Sorting mats'], standardCodes: [{ code: 'K-LS1-1', description: 'Use observations to describe patterns of what plants and animals need to survive', category: 'Life Science' }] },
        ],
      },
      {
        title: 'Animal Habitats',
        description: 'Where animals live and how habitats meet their needs',
        essentialQuestions: ['Why do animals live where they do?'],
        bigIdeas: ['Habitats provide food, water, shelter', 'Animals are adapted to their habitats'],
        durationDays: 12,
        lessons: [
          { title: 'What is a Habitat?', objectives: ['Define habitat and identify examples'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Habitat posters'], standardCodes: [{ code: '2-LS4-1', description: 'Make observations of plants and animals to compare the diversity of life in different habitats', category: 'Life Science' }] },
          { title: 'Forest & Woodland Habitats', objectives: ['Describe forest habitat and its animals'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Forest diorama materials'], standardCodes: [{ code: '2-LS4-1', description: 'Make observations of plants and animals to compare the diversity of life in different habitats', category: 'Life Science' }] },
          { title: 'Ocean & Freshwater Habitats', objectives: ['Compare ocean and freshwater habitats'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Habitat comparison chart'], standardCodes: [{ code: '2-LS4-1', description: 'Make observations of plants and animals to compare the diversity of life in different habitats', category: 'Life Science' }] },
          { title: 'Desert & Arctic Habitats', objectives: ['Describe adaptations for extreme habitats'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Adaptation cards'], standardCodes: [{ code: '2-LS4-1', description: 'Make observations of plants and animals to compare the diversity of life in different habitats', category: 'Life Science' }] },
          { title: 'Design a Habitat', objectives: ['Design a habitat that meets an animal\'s needs'], durationMin: 35, lessonType: 'LAB', materials: ['Art supplies', 'Research cards'], standardCodes: [{ code: 'K-2-ETS1-2', description: 'Develop a simple sketch, drawing, or model to illustrate how the shape of an object helps it function', category: 'Engineering Design' }] },
        ],
      },
      {
        title: 'Life Cycles',
        description: 'How living things grow and change',
        essentialQuestions: ['How do living things change as they grow?'],
        bigIdeas: ['All living things go through a life cycle', 'Parents and offspring share traits'],
        durationDays: 10,
        lessons: [
          { title: 'Plant Life Cycle', objectives: ['Describe the stages of a plant life cycle'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Life cycle diagrams', 'Seeds'], standardCodes: [{ code: '2-LS2-1', description: 'Plan and conduct an investigation to determine if plants need sunlight and water to grow', category: 'Life Science' }] },
          { title: 'Butterfly Life Cycle', objectives: ['Sequence the stages of a butterfly life cycle'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Butterfly life cycle kit'], standardCodes: [{ code: '1-LS3-1', description: 'Make observations to construct an evidence-based account that young plants and animals are like, but not exactly like, their parents', category: 'Life Science' }] },
          { title: 'Frog Life Cycle', objectives: ['Compare frog metamorphosis to butterfly metamorphosis'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Comparison charts'], standardCodes: [{ code: '1-LS3-1', description: 'Make observations to construct an evidence-based account that young plants and animals are like, but not exactly like, their parents', category: 'Life Science' }] },
          { title: 'Parents & Offspring', objectives: ['Observe that offspring resemble their parents'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Animal family photos'], standardCodes: [{ code: '1-LS3-1', description: 'Make observations to construct an evidence-based account that young plants and animals are like, but not exactly like, their parents', category: 'Life Science' }] },
          { title: 'Life Cycle Comparison', objectives: ['Compare life cycles across species'], durationMin: 25, lessonType: 'ASSESSMENT', materials: ['Life cycle cards'], standardCodes: [{ code: '1-LS3-1', description: 'Make observations to construct evidence-based account', category: 'Life Science' }] },
        ],
      },
    ],
  },
  {
    name: 'Earth & Space Science K-2',
    description: 'Weather, seasons, and natural resources',
    subject: 'SCIENCE',
    standard: 'NGSS',
    gradeBand: 'K_2',
    units: [
      {
        title: 'Weather & Seasons',
        description: 'Observing, describing, and recording weather patterns',
        essentialQuestions: ['How does weather affect our daily lives?'],
        bigIdeas: ['Weather changes day to day and seasonally', 'We can observe and measure weather'],
        durationDays: 15,
        lessons: [
          { title: 'Describing Weather', objectives: ['Use weather vocabulary: sunny, rainy, windy, cloudy'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Weather cards'], standardCodes: [{ code: 'K-ESS2-1', description: 'Use and share observations of local weather conditions to describe patterns over time', category: 'Earth & Space Science' }] },
          { title: 'Recording Weather Data', objectives: ['Record daily weather on a calendar'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Weather journal'], standardCodes: [{ code: 'K-ESS2-1', description: 'Use and share observations of local weather conditions to describe patterns over time', category: 'Earth & Space Science' }] },
          { title: 'The Four Seasons', objectives: ['Describe the characteristics of four seasons'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Season posters'], standardCodes: [{ code: 'K-ESS2-1', description: 'Use and share observations of local weather conditions to describe patterns over time', category: 'Earth & Space Science' }] },
          { title: 'Weather Safety', objectives: ['Identify severe weather and safety precautions'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Safety brochures'], standardCodes: [{ code: 'K-ESS3-2', description: 'Ask questions to obtain information about the purpose of weather forecasting', category: 'Earth & Space Science' }] },
          { title: 'Weather Data Analysis', objectives: ['Analyze weekly weather data to find patterns'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Weather charts'], standardCodes: [{ code: 'K-ESS2-1', description: 'Use and share observations of local weather conditions to describe patterns over time', category: 'Earth & Space Science' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCIENCE 3-5
// ═══════════════════════════════════════════════════════════════════════════════

const SCIENCE_35: StrandDef[] = [
  {
    name: 'Life Science 3-5',
    description: 'Ecosystems, heredity, and biological evolution',
    subject: 'SCIENCE',
    standard: 'NGSS',
    gradeBand: 'G3_5',
    units: [
      {
        title: 'Ecosystems & Food Webs',
        description: 'Interactions among organisms in an ecosystem',
        essentialQuestions: ['How do organisms depend on each other?'],
        bigIdeas: ['Energy flows through food chains and webs', 'Organisms depend on their environment'],
        durationDays: 15,
        lessons: [
          { title: 'Producers, Consumers, Decomposers', objectives: ['Classify organisms by their role in energy transfer'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Organism cards'], standardCodes: [{ code: '5-LS2-1', description: 'Develop a model to describe the movement of matter among living and nonliving parts of an ecosystem', category: 'Life Science' }] },
          { title: 'Food Chains', objectives: ['Construct a food chain showing energy flow'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Food chain cards'], standardCodes: [{ code: '5-LS2-1', description: 'Develop a model to describe the movement of matter among living and nonliving parts of an ecosystem', category: 'Life Science' }] },
          { title: 'Food Webs', objectives: ['Create a food web from multiple food chains'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['String', 'Organism cards'], standardCodes: [{ code: '5-LS2-1', description: 'Develop a model to describe the movement of matter among living and nonliving parts of an ecosystem', category: 'Life Science' }] },
          { title: 'Ecosystem Disruption', objectives: ['Predict effects of removing an organism from an ecosystem'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Simulation software'], standardCodes: [{ code: '3-LS4-4', description: 'Make a claim about the merit of a solution to a problem caused when the environment changes', category: 'Life Science' }] },
          { title: 'Ecosystem Project', objectives: ['Research and present on a specific ecosystem'], durationMin: 50, lessonType: 'LAB', materials: ['Research materials'], standardCodes: [{ code: '5-LS2-1', description: 'Develop a model to describe the movement of matter', category: 'Life Science' }] },
        ],
      },
    ],
  },
  {
    name: 'Physical Science 3-5',
    description: 'Matter, energy, and forces',
    subject: 'SCIENCE',
    standard: 'NGSS',
    gradeBand: 'G3_5',
    units: [
      {
        title: 'Properties of Matter',
        description: 'Observing, measuring, and classifying matter',
        essentialQuestions: ['What is matter?', 'How can we describe matter?'],
        bigIdeas: ['Matter has observable and measurable properties', 'Matter can change forms'],
        durationDays: 12,
        lessons: [
          { title: 'States of Matter', objectives: ['Describe properties of solids, liquids, and gases'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Matter samples'], standardCodes: [{ code: '5-PS1-1', description: 'Develop a model to describe that matter is made of particles too small to be seen', category: 'Physical Science' }] },
          { title: 'Measuring Matter', objectives: ['Measure mass and volume of objects'], durationMin: 45, lessonType: 'LAB', materials: ['Balance scale', 'Graduated cylinder'], standardCodes: [{ code: '5-PS1-2', description: 'Measure and graph quantities to provide evidence that whether or not a substance can be observed depends on the sum of the parts', category: 'Physical Science' }] },
          { title: 'Physical Changes', objectives: ['Distinguish between physical and chemical changes'], durationMin: 45, lessonType: 'LAB', materials: ['Lab supplies'], standardCodes: [{ code: '5-PS1-4', description: 'Conduct an investigation to determine whether the mixing of two or more substances results in new substances', category: 'Physical Science' }] },
          { title: 'Chemical Changes', objectives: ['Observe and record evidence of chemical changes'], durationMin: 45, lessonType: 'LAB', materials: ['Baking soda', 'Vinegar'], standardCodes: [{ code: '5-PS1-4', description: 'Conduct an investigation to determine whether mixing of two or more substances results in new substances', category: 'Physical Science' }] },
          { title: 'Mixtures & Solutions', objectives: ['Separate mixtures using physical properties'], durationMin: 45, lessonType: 'LAB', materials: ['Mixture samples', 'Filters'], standardCodes: [{ code: '5-PS1-3', description: 'Make observations and measurements to identify materials based on their properties', category: 'Physical Science' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL STUDIES K-2 & 3-5
// ═══════════════════════════════════════════════════════════════════════════════

const SOCIAL_K2: StrandDef[] = [
  {
    name: 'Community & Civics K-2',
    description: 'Understanding community roles, rules, and citizenship',
    subject: 'SOCIAL_STUDIES',
    standard: 'C3',
    gradeBand: 'K_2',
    units: [
      {
        title: 'My Community',
        description: 'Exploring the people, places, and services in a community',
        essentialQuestions: ['What makes a community?', 'How do we help each other?'],
        bigIdeas: ['Communities are made up of people with different roles', 'Rules help communities function'],
        durationDays: 10,
        lessons: [
          { title: 'What is a Community?', objectives: ['Define community and identify its members'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Community photos'], standardCodes: [{ code: 'D2.Civ.1.K-2', description: 'Distinguish the responsibilities and powers of government officials at various levels', category: 'Civics' }] },
          { title: 'Community Helpers', objectives: ['Identify community helpers and their roles'], durationMin: 25, lessonType: 'DIRECT_INSTRUCTION', materials: ['Role cards'], standardCodes: [{ code: 'D2.Civ.6.K-2', description: 'Describe how communities work to accomplish common tasks', category: 'Civics' }] },
          { title: 'Rules & Laws', objectives: ['Explain why communities need rules'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Rule sorting cards'], standardCodes: [{ code: 'D2.Civ.3.K-2', description: 'Explain the need for and purposes of rules in various settings', category: 'Civics' }] },
          { title: 'Being a Good Citizen', objectives: ['Identify ways to be a responsible citizen'], durationMin: 25, lessonType: 'WORKSHOP', materials: ['Citizenship scenarios'], standardCodes: [{ code: 'D2.Civ.2.K-2', description: 'Explain how all people can play a role in determining the rules', category: 'Civics' }] },
          { title: 'My Community Map', objectives: ['Create a simple map of the school or neighborhood'], durationMin: 30, lessonType: 'LAB', materials: ['Map templates', 'Crayons'], standardCodes: [{ code: 'D2.Geo.1.K-2', description: 'Construct maps, graphs, and other representations of familiar places', category: 'Geography' }] },
        ],
      },
    ],
  },
];

const SOCIAL_35: StrandDef[] = [
  {
    name: 'US History & Geography 3-5',
    description: 'Early American history, geography skills, and government',
    subject: 'SOCIAL_STUDIES',
    standard: 'C3',
    gradeBand: 'G3_5',
    units: [
      {
        title: 'Early American History',
        description: 'Exploration, colonization, and founding of the United States',
        essentialQuestions: ['How was America founded?', 'What conflicts shaped the nation?'],
        bigIdeas: ['The United States was founded on democratic principles', 'Historical events have causes and effects'],
        durationDays: 20,
        lessons: [
          { title: 'Indigenous Peoples of North America', objectives: ['Describe the cultures and lives of Native American groups'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Cultural maps', 'Primary sources'], standardCodes: [{ code: 'D2.His.3.3-5', description: 'Generate questions about individuals and groups who have shaped significant historical changes', category: 'History' }] },
          { title: 'European Exploration', objectives: ['Explain why Europeans explored the Americas'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Explorer maps'], standardCodes: [{ code: 'D2.His.1.3-5', description: 'Create and use a chronological sequence of related events to compare developments', category: 'History' }] },
          { title: 'Colonial Life', objectives: ['Compare daily life in the thirteen colonies'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Primary source documents'], standardCodes: [{ code: 'D2.His.5.3-5', description: 'Explain connections among economic decisions, historical developments', category: 'History' }] },
          { title: 'American Revolution', objectives: ['Identify causes and key events of the Revolution'], durationMin: 45, lessonType: 'DIRECT_INSTRUCTION', materials: ['Timeline cards'], standardCodes: [{ code: 'D2.His.14.3-5', description: 'Explain probable causes and effects of events and developments', category: 'History' }] },
          { title: 'The Constitution', objectives: ['Explain the purpose and structure of the Constitution'], durationMin: 45, lessonType: 'WORKSHOP', materials: ['Constitution excerpts'], standardCodes: [{ code: 'D2.Civ.1.3-5', description: 'Distinguish the responsibilities of government officials', category: 'Civics' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEL K-2 & 3-5
// ═══════════════════════════════════════════════════════════════════════════════

const SEL_K2: StrandDef[] = [
  {
    name: 'Social-Emotional Learning K-2',
    description: 'Self-awareness, self-management, and relationship skills for young learners',
    subject: 'SEL',
    standard: 'CUSTOM',
    gradeBand: 'K_2',
    units: [
      {
        title: 'Understanding Emotions',
        description: 'Identifying and expressing emotions',
        essentialQuestions: ['What are emotions?', 'How do I express my feelings?'],
        bigIdeas: ['Everyone has emotions', 'We can learn to manage our emotions'],
        durationDays: 10,
        lessons: [
          { title: 'Naming Our Feelings', objectives: ['Identify and name basic emotions: happy, sad, angry, scared'], durationMin: 20, lessonType: 'DIRECT_INSTRUCTION', materials: ['Emotion cards', 'Feelings chart'], standardCodes: [{ code: 'CASEL.SA.1', description: 'Identify and recognize emotions in self and others', category: 'Self-Awareness' }] },
          { title: 'How Do I Feel Today?', objectives: ['Use a feelings check-in to express current emotions'], durationMin: 15, lessonType: 'WORKSHOP', materials: ['Mood meter'], standardCodes: [{ code: 'CASEL.SA.1', description: 'Identify and recognize emotions in self and others', category: 'Self-Awareness' }] },
          { title: 'Body Clues for Emotions', objectives: ['Recognize physical signs of emotions'], durationMin: 20, lessonType: 'WORKSHOP', materials: ['Body outline'], standardCodes: [{ code: 'CASEL.SA.2', description: 'Recognize personal strengths and areas for growth', category: 'Self-Awareness' }] },
          { title: 'Calm-Down Strategies', objectives: ['Practice breathing and calming techniques'], durationMin: 20, lessonType: 'WORKSHOP', materials: ['Breathing cards'], standardCodes: [{ code: 'CASEL.SM.1', description: 'Manage and express emotions constructively', category: 'Self-Management' }] },
          { title: 'Being a Good Friend', objectives: ['Identify qualities of a good friend'], durationMin: 20, lessonType: 'WORKSHOP', materials: ['Friendship scenario cards'], standardCodes: [{ code: 'CASEL.RS.1', description: 'Establish and maintain healthy relationships', category: 'Relationship Skills' }] },
        ],
      },
    ],
  },
];

const SEL_35: StrandDef[] = [
  {
    name: 'Social-Emotional Learning 3-5',
    description: 'Growth mindset, empathy, conflict resolution, and responsible decision-making',
    subject: 'SEL',
    standard: 'CUSTOM',
    gradeBand: 'G3_5',
    units: [
      {
        title: 'Growth Mindset & Goal Setting',
        description: 'Developing resilience and setting achievable goals',
        essentialQuestions: ['How does my thinking affect my learning?'],
        bigIdeas: ['Effort and persistence lead to growth', 'Mistakes are part of learning'],
        durationDays: 12,
        lessons: [
          { title: 'Fixed vs. Growth Mindset', objectives: ['Distinguish between fixed and growth mindset thinking'], durationMin: 30, lessonType: 'DIRECT_INSTRUCTION', materials: ['Mindset scenarios'], standardCodes: [{ code: 'CASEL.SA.3', description: 'Demonstrate self-efficacy and a growth mindset', category: 'Self-Awareness' }] },
          { title: 'Learning from Mistakes', objectives: ['Reframe mistakes as learning opportunities'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Journal'], standardCodes: [{ code: 'CASEL.SA.3', description: 'Demonstrate self-efficacy and a growth mindset', category: 'Self-Awareness' }] },
          { title: 'Setting SMART Goals', objectives: ['Set specific, measurable, achievable goals'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Goal worksheet'], standardCodes: [{ code: 'CASEL.SM.2', description: 'Set and work toward personal and academic goals', category: 'Self-Management' }] },
          { title: 'Empathy & Perspective-Taking', objectives: ['Consider others\' perspectives and feelings'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Perspective cards'], standardCodes: [{ code: 'CASEL.SO.1', description: 'Take the perspective of and empathize with others', category: 'Social Awareness' }] },
          { title: 'Conflict Resolution', objectives: ['Use steps to resolve conflicts peacefully'], durationMin: 30, lessonType: 'WORKSHOP', materials: ['Conflict resolution steps poster'], standardCodes: [{ code: 'CASEL.RS.2', description: 'Manage conflict constructively', category: 'Relationship Skills' }] },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ALL K-5 STRANDS
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_K5_STRANDS: StrandDef[] = [
  ...ELA_K2,
  ...ELA_35,
  ...MATH_K2,
  ...MATH_35,
  ...SCIENCE_K2,
  ...SCIENCE_35,
  ...SOCIAL_K2,
  ...SOCIAL_35,
  ...SEL_K2,
  ...SEL_35,
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEEDER
// ═══════════════════════════════════════════════════════════════════════════════

async function seedStrand(strand: StrandDef): Promise<void> {
  const curriculumId = cid();

  // Create curriculum
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
      standard: strand.standard as CurriculumStandard,
      subject: strand.subject as SubjectArea,
      gradeBand: strand.gradeBand as GradeBand,
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
        status: 'PUBLISHED' as UnitStatus,
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

      // Standard alignments
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
  console.log('🌱 Seeding K-5 Curriculum (all subjects)...\n');

  let total = 0;
  let lessons = 0;
  let standards = 0;

  for (const strand of ALL_K5_STRANDS) {
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

  console.log(`\n✅ K-5 curriculum seeded: ${ALL_K5_STRANDS.length} curricula, ${total} units, ${lessons} lessons, ${standards} standard alignments`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
