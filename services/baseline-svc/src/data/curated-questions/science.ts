/**
 * Curated Science Questions
 *
 * Validated, educationally-reviewed science questions organized by grade band and skill.
 * Aligned with Next Generation Science Standards (NGSS).
 *
 * @module curated-questions/science
 */

import type { GeneratedQuestion } from '../../types/questions.types.js';

/**
 * Grade K-5 Science Questions
 */
export const SCIENCE_K5: GeneratedQuestion[] = [
  // ── Observation & Inquiry ──
  {
    id: 'sci-k5-obs-001',
    skillCode: 'SCI_OBSERVATION',
    type: 'multiple-choice',
    stem: 'Which of the following is something you can observe using your eyes?',
    options: [
      { id: 'A', text: 'The color of a flower', isCorrect: true },
      { id: 'B', text: 'What a person is thinking', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'C', text: 'How heavy something feels', isCorrect: false },
      { id: 'D', text: 'What something tastes like', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'We use our eyes to see things like colors, shapes, and sizes. Color is something we observe by looking.',
    standardsAlignment: ['NGSS.K-2-ETS1-1'],
    difficulty: 0.2,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 14,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sci-k5-obs-002',
    skillCode: 'SCI_OBSERVATION',
    type: 'multiple-choice',
    stem: 'A scientist wants to learn about birds. What should they do first?',
    options: [
      { id: 'A', text: 'Make a guess without looking', isCorrect: false },
      { id: 'B', text: 'Watch the birds carefully', isCorrect: true },
      { id: 'C', text: 'Only read about birds in books', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'D', text: 'Ask someone else to watch for them', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Scientists start by observing carefully. Watching birds helps us learn about how they behave, eat, and move.',
    standardsAlignment: ['NGSS.K-2-ETS1-1'],
    difficulty: 0.25,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 15,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Life Science ──
  {
    id: 'sci-k5-life-001',
    skillCode: 'SCI_LIFE_SCIENCE',
    type: 'multiple-choice',
    stem: 'What do all living things need to survive?',
    options: [
      { id: 'A', text: 'Water', isCorrect: true },
      { id: 'B', text: 'A television', isCorrect: false },
      { id: 'C', text: 'Toys', isCorrect: false },
      { id: 'D', text: 'A car', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'All living things, including plants, animals, and people, need water to survive. Water helps our bodies work properly.',
    standardsAlignment: ['NGSS.K-LS1-1'],
    difficulty: 0.2,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 9,
      estimatedTimeSeconds: 15,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sci-k5-life-002',
    skillCode: 'SCI_LIFE_SCIENCE',
    type: 'multiple-choice',
    stem: 'A caterpillar turns into a butterfly. This change is called:',
    options: [
      { id: 'A', text: 'Hibernation', isCorrect: false },
      { id: 'B', text: 'Migration', isCorrect: false },
      { id: 'C', text: 'Metamorphosis', isCorrect: true },
      { id: 'D', text: 'Camouflage', isCorrect: false, distractorType: 'plausible-alternative' },
    ],
    correctAnswer: 'C',
    explanation: 'Metamorphosis is when an animal completely changes its body form as it grows. A caterpillar goes through metamorphosis to become a butterfly.',
    standardsAlignment: ['NGSS.3-LS1-1'],
    difficulty: 0.35,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 3,
      wordCount: 12,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Earth Science ──
  {
    id: 'sci-k5-earth-001',
    skillCode: 'SCI_EARTH_SCIENCE',
    type: 'multiple-choice',
    stem: 'What causes day and night on Earth?',
    options: [
      { id: 'A', text: 'The Moon moving around Earth', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Earth spinning on its axis', isCorrect: true },
      { id: 'C', text: 'The Sun turning on and off', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'D', text: 'Clouds covering the Sun', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Earth spins (rotates) once every 24 hours. When your part of Earth faces the Sun, it is daytime. When it faces away, it is nighttime.',
    standardsAlignment: ['NGSS.1-ESS1-1'],
    difficulty: 0.4,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 3,
      wordCount: 10,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sci-k5-earth-002',
    skillCode: 'SCI_EARTH_SCIENCE',
    type: 'multiple-choice',
    stem: 'Which type of rock is formed from a volcano?',
    options: [
      { id: 'A', text: 'Sedimentary', isCorrect: false },
      { id: 'B', text: 'Metamorphic', isCorrect: false },
      { id: 'C', text: 'Igneous', isCorrect: true },
      { id: 'D', text: 'Fossil', isCorrect: false, distractorType: 'plausible-alternative' },
    ],
    correctAnswer: 'C',
    explanation: 'Igneous rock forms when hot melted rock (magma or lava) from a volcano cools down and hardens.',
    standardsAlignment: ['NGSS.4-ESS2-1'],
    difficulty: 0.4,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 4,
      wordCount: 10,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Physical Science ──
  {
    id: 'sci-k5-phys-001',
    skillCode: 'SCI_PHYSICAL_SCIENCE',
    type: 'multiple-choice',
    stem: 'What happens when you push a toy car?',
    options: [
      { id: 'A', text: 'It stays still', isCorrect: false },
      { id: 'B', text: 'It moves in the direction you pushed', isCorrect: true },
      { id: 'C', text: 'It disappears', isCorrect: false },
      { id: 'D', text: 'It moves backward', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'B',
    explanation: 'A push is a force that makes objects move away from you. The car moves in the same direction as your push.',
    standardsAlignment: ['NGSS.K-PS2-1'],
    difficulty: 0.2,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 10,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sci-k5-phys-002',
    skillCode: 'SCI_PHYSICAL_SCIENCE',
    type: 'multiple-choice',
    stem: 'Ice melting into water is an example of:',
    options: [
      { id: 'A', text: 'A solid changing to a liquid', isCorrect: true },
      { id: 'B', text: 'A liquid changing to a gas', isCorrect: false },
      { id: 'C', text: 'A gas changing to a solid', isCorrect: false },
      { id: 'D', text: 'Making a new substance', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'A',
    explanation: 'Ice is solid water. When it melts, it changes from a solid to a liquid. The water is still the same substance, just in a different form.',
    standardsAlignment: ['NGSS.2-PS1-4'],
    difficulty: 0.3,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 3,
      wordCount: 9,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Scientific Method ──
  {
    id: 'sci-k5-method-001',
    skillCode: 'SCI_SCIENTIFIC_METHOD',
    type: 'multiple-choice',
    stem: 'What is a hypothesis?',
    options: [
      { id: 'A', text: 'A guess you make after an experiment', isCorrect: false },
      { id: 'B', text: 'A testable prediction about what will happen', isCorrect: true },
      { id: 'C', text: 'The final answer to a question', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'D', text: 'A list of materials', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'A hypothesis is an educated guess or prediction that you can test with an experiment. Scientists make hypotheses before testing.',
    standardsAlignment: ['NGSS.3-5-ETS1-1'],
    difficulty: 0.4,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 4,
      wordCount: 5,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sci-k5-method-002',
    skillCode: 'SCI_SCIENTIFIC_METHOD',
    type: 'multiple-choice',
    stem: 'In an experiment, what should you change to test your idea?',
    options: [
      { id: 'A', text: 'Everything at once', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Nothing at all', isCorrect: false },
      { id: 'C', text: 'Only one thing at a time', isCorrect: true },
      { id: 'D', text: 'Only the last step', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation: 'In a fair test, you only change one thing (the variable you are testing) so you know what caused the results.',
    standardsAlignment: ['NGSS.3-5-ETS1-3'],
    difficulty: 0.45,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 4,
      wordCount: 14,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Grade 6-8 Science Questions
 */
export const SCIENCE_G6_8: GeneratedQuestion[] = [
  // ── Observation & Inquiry ──
  {
    id: 'sci-g68-obs-001',
    skillCode: 'SCI_OBSERVATION',
    type: 'multiple-choice',
    stem: 'What is the difference between qualitative and quantitative observations?',
    options: [
      { id: 'A', text: 'Qualitative uses numbers; quantitative uses descriptions', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Qualitative describes qualities; quantitative uses measurements', isCorrect: true },
      { id: 'C', text: 'They are the same thing', isCorrect: false },
      { id: 'D', text: 'Only scientists can make quantitative observations', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Qualitative observations describe qualities like color, texture, or smell. Quantitative observations involve numbers and measurements.',
    standardsAlignment: ['NGSS.MS-ETS1-1'],
    difficulty: 0.45,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 14,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Life Science ──
  {
    id: 'sci-g68-life-001',
    skillCode: 'SCI_LIFE_SCIENCE',
    type: 'multiple-choice',
    stem: 'What is the function of mitochondria in a cell?',
    options: [
      { id: 'A', text: 'To store genetic information', isCorrect: false },
      { id: 'B', text: 'To produce energy for the cell', isCorrect: true },
      { id: 'C', text: 'To control what enters and leaves the cell', isCorrect: false },
      { id: 'D', text: 'To make proteins', isCorrect: false, distractorType: 'plausible-alternative' },
    ],
    correctAnswer: 'B',
    explanation: 'Mitochondria are often called the "powerhouses" of the cell because they convert food into energy (ATP) that the cell can use.',
    standardsAlignment: ['NGSS.MS-LS1-2'],
    difficulty: 0.5,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 12,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sci-g68-life-002',
    skillCode: 'SCI_LIFE_SCIENCE',
    type: 'multiple-choice',
    stem: 'In a food chain, which organism would be considered a producer?',
    options: [
      { id: 'A', text: 'Rabbit', isCorrect: false },
      { id: 'B', text: 'Wolf', isCorrect: false },
      { id: 'C', text: 'Grass', isCorrect: true },
      { id: 'D', text: 'Mushroom', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'C',
    explanation: 'Producers make their own food through photosynthesis. Grass is a plant that uses sunlight to make food, so it is a producer.',
    standardsAlignment: ['NGSS.MS-LS2-3'],
    difficulty: 0.4,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 14,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Earth Science ──
  {
    id: 'sci-g68-earth-001',
    skillCode: 'SCI_EARTH_SCIENCE',
    type: 'multiple-choice',
    stem: 'What causes tectonic plates to move?',
    options: [
      { id: 'A', text: 'Wind on the Earth\'s surface', isCorrect: false },
      { id: 'B', text: 'Convection currents in the mantle', isCorrect: true },
      { id: 'C', text: 'The rotation of the Earth', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'D', text: 'Magnetic forces from the Sun', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Heat from Earth\'s core creates convection currents in the mantle. Hot material rises, cools, and sinks, creating currents that push the plates.',
    standardsAlignment: ['NGSS.MS-ESS2-3'],
    difficulty: 0.55,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 9,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sci-g68-earth-002',
    skillCode: 'SCI_EARTH_SCIENCE',
    type: 'multiple-choice',
    stem: 'What layer of Earth\'s atmosphere contains the ozone layer?',
    options: [
      { id: 'A', text: 'Troposphere', isCorrect: false },
      { id: 'B', text: 'Stratosphere', isCorrect: true },
      { id: 'C', text: 'Mesosphere', isCorrect: false },
      { id: 'D', text: 'Thermosphere', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'The ozone layer is located in the stratosphere, about 15-35 km above Earth. It protects us from harmful ultraviolet radiation.',
    standardsAlignment: ['NGSS.MS-ESS2-6'],
    difficulty: 0.5,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 12,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Physical Science ──
  {
    id: 'sci-g68-phys-001',
    skillCode: 'SCI_PHYSICAL_SCIENCE',
    type: 'multiple-choice',
    stem: 'If an object has a mass of 10 kg and is accelerating at 2 m/s², what is the force acting on it?',
    options: [
      { id: 'A', text: '5 N', isCorrect: false },
      { id: 'B', text: '12 N', isCorrect: false },
      { id: 'C', text: '20 N', isCorrect: true },
      { id: 'D', text: '8 N', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation: 'Using Newton\'s Second Law: F = m × a. Force = 10 kg × 2 m/s² = 20 N (Newtons).',
    standardsAlignment: ['NGSS.MS-PS2-2'],
    difficulty: 0.55,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 22,
      estimatedTimeSeconds: 40,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sci-g68-phys-002',
    skillCode: 'SCI_PHYSICAL_SCIENCE',
    type: 'multiple-choice',
    stem: 'What type of chemical reaction absorbs heat from its surroundings?',
    options: [
      { id: 'A', text: 'Exothermic', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Endothermic', isCorrect: true },
      { id: 'C', text: 'Combustion', isCorrect: false },
      { id: 'D', text: 'Synthesis', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Endothermic reactions absorb heat energy from surroundings (endo = in). Exothermic reactions release heat (exo = out).',
    standardsAlignment: ['NGSS.MS-PS1-6'],
    difficulty: 0.5,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 12,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Scientific Method ──
  {
    id: 'sci-g68-method-001',
    skillCode: 'SCI_SCIENTIFIC_METHOD',
    type: 'multiple-choice',
    stem: 'In an experiment, what is the variable that is measured as the outcome?',
    options: [
      { id: 'A', text: 'Independent variable', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Dependent variable', isCorrect: true },
      { id: 'C', text: 'Controlled variable', isCorrect: false },
      { id: 'D', text: 'Constant variable', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'The dependent variable is what you measure; it "depends" on changes to the independent variable. The independent variable is what you change.',
    standardsAlignment: ['NGSS.MS-ETS1-3'],
    difficulty: 0.45,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 16,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Grade 9-12 Science Questions
 */
export const SCIENCE_G9_12: GeneratedQuestion[] = [
  // ── Observation & Inquiry ──
  {
    id: 'sci-g912-obs-001',
    skillCode: 'SCI_OBSERVATION',
    type: 'multiple-choice',
    stem: 'Which of the following best describes the role of a control group in an experiment?',
    options: [
      { id: 'A', text: 'It receives the experimental treatment', isCorrect: false },
      { id: 'B', text: 'It provides a baseline for comparison', isCorrect: true },
      { id: 'C', text: 'It eliminates all variables', isCorrect: false },
      { id: 'D', text: 'It confirms the hypothesis is correct', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'B',
    explanation: 'A control group does not receive the experimental treatment, providing a baseline to compare with the experimental group\'s results.',
    standardsAlignment: ['NGSS.HS-ETS1-2'],
    difficulty: 0.5,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 18,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Life Science ──
  {
    id: 'sci-g912-life-001',
    skillCode: 'SCI_LIFE_SCIENCE',
    type: 'multiple-choice',
    stem: 'During which phase of the cell cycle does DNA replication occur?',
    options: [
      { id: 'A', text: 'G1 phase', isCorrect: false },
      { id: 'B', text: 'S phase', isCorrect: true },
      { id: 'C', text: 'G2 phase', isCorrect: false },
      { id: 'D', text: 'M phase', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'B',
    explanation: 'The S (synthesis) phase is when DNA replication occurs. The cell copies all of its DNA to prepare for cell division.',
    standardsAlignment: ['NGSS.HS-LS1-4'],
    difficulty: 0.55,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 13,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sci-g912-life-002',
    skillCode: 'SCI_LIFE_SCIENCE',
    type: 'multiple-choice',
    stem: 'What is the primary function of mRNA in protein synthesis?',
    options: [
      { id: 'A', text: 'To carry genetic information from DNA to ribosomes', isCorrect: true },
      { id: 'B', text: 'To bring amino acids to the ribosome', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'C', text: 'To form the structure of ribosomes', isCorrect: false },
      { id: 'D', text: 'To store genetic information permanently', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Messenger RNA (mRNA) carries the genetic code from DNA in the nucleus to ribosomes in the cytoplasm, where proteins are made.',
    standardsAlignment: ['NGSS.HS-LS1-1'],
    difficulty: 0.6,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 13,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Earth Science ──
  {
    id: 'sci-g912-earth-001',
    skillCode: 'SCI_EARTH_SCIENCE',
    type: 'multiple-choice',
    stem: 'The half-life of Carbon-14 is approximately 5,730 years. If a fossil originally contained 100 grams of C-14, how much would remain after 11,460 years?',
    options: [
      { id: 'A', text: '50 grams', isCorrect: false },
      { id: 'B', text: '25 grams', isCorrect: true },
      { id: 'C', text: '12.5 grams', isCorrect: false },
      { id: 'D', text: '75 grams', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: '11,460 years is two half-lives (5,730 × 2). After one half-life: 100g → 50g. After two half-lives: 50g → 25g.',
    standardsAlignment: ['NGSS.HS-ESS1-6'],
    difficulty: 0.6,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 30,
      estimatedTimeSeconds: 50,
      contentRiskLevel: 'safe',
    },
  },
  // ── Physical Science ──
  {
    id: 'sci-g912-phys-001',
    skillCode: 'SCI_PHYSICAL_SCIENCE',
    type: 'multiple-choice',
    stem: 'According to the ideal gas law (PV = nRT), what happens to the pressure of a gas if the volume is halved while temperature and amount remain constant?',
    options: [
      { id: 'A', text: 'Pressure is halved', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Pressure doubles', isCorrect: true },
      { id: 'C', text: 'Pressure stays the same', isCorrect: false },
      { id: 'D', text: 'Pressure quadruples', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'At constant n and T, PV = constant (Boyle\'s Law). If V is halved, P must double to maintain the equation: P₁V₁ = P₂V₂.',
    standardsAlignment: ['NGSS.HS-PS2-6'],
    difficulty: 0.6,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 28,
      estimatedTimeSeconds: 45,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sci-g912-phys-002',
    skillCode: 'SCI_PHYSICAL_SCIENCE',
    type: 'multiple-choice',
    stem: 'What is the wavelength of electromagnetic radiation with a frequency of 5.0 × 10¹⁴ Hz? (Speed of light = 3.0 × 10⁸ m/s)',
    options: [
      { id: 'A', text: '6.0 × 10⁻⁷ m', isCorrect: true },
      { id: 'B', text: '1.5 × 10²³ m', isCorrect: false },
      { id: 'C', text: '6.0 × 10⁻⁵ m', isCorrect: false, distractorType: 'careless-error' },
      { id: 'D', text: '1.7 × 10⁶ m', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Using c = λf, wavelength λ = c/f = (3.0 × 10⁸ m/s) / (5.0 × 10¹⁴ Hz) = 6.0 × 10⁻⁷ m (visible light range).',
    standardsAlignment: ['NGSS.HS-PS4-1'],
    difficulty: 0.65,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 22,
      estimatedTimeSeconds: 60,
      contentRiskLevel: 'safe',
    },
  },
  // ── Scientific Method ──
  {
    id: 'sci-g912-method-001',
    skillCode: 'SCI_SCIENTIFIC_METHOD',
    type: 'multiple-choice',
    stem: 'A researcher\'s results cannot be replicated by other scientists. What does this most likely indicate?',
    options: [
      { id: 'A', text: 'The original research was definitely wrong', isCorrect: false },
      { id: 'B', text: 'The findings need further investigation and verification', isCorrect: true },
      { id: 'C', text: 'The replicating scientists made errors', isCorrect: false },
      { id: 'D', text: 'Science cannot be trusted', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Reproducibility is key to science. If results cannot be replicated, it may indicate issues with methodology, conditions, or the original findings that need investigation.',
    standardsAlignment: ['NGSS.HS-ETS1-4'],
    difficulty: 0.55,
    cognitiveLevel: 'evaluate',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 18,
      estimatedTimeSeconds: 35,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Get all science questions by grade band
 */
export function getScienceQuestions(gradeBand: 'K5' | 'G6_8' | 'G9_12'): GeneratedQuestion[] {
  switch (gradeBand) {
    case 'K5':
      return SCIENCE_K5;
    case 'G6_8':
      return SCIENCE_G6_8;
    case 'G9_12':
      return SCIENCE_G9_12;
    default:
      return SCIENCE_G6_8;
  }
}

/**
 * Get science questions by skill code
 */
export function getScienceQuestionsBySkill(
  gradeBand: 'K5' | 'G6_8' | 'G9_12',
  skillCode: string
): GeneratedQuestion[] {
  return getScienceQuestions(gradeBand).filter((q) => q.skillCode === skillCode);
}
