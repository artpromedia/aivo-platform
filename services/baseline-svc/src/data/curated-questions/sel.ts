/**
 * Curated Social-Emotional Learning (SEL) Questions
 *
 * Validated, educationally-reviewed SEL questions organized by grade band and skill.
 * Aligned with CASEL (Collaborative for Academic, Social, and Emotional Learning) framework.
 *
 * Skills covered:
 * - SEL_SELF_AWARENESS: Recognizing emotions, strengths, and limitations
 * - SEL_SELF_MANAGEMENT: Regulating emotions, setting goals, self-motivation
 * - SEL_SOCIAL_AWARENESS: Empathy, understanding social norms, respecting diversity
 * - SEL_RELATIONSHIP_SKILLS: Communication, cooperation, conflict resolution
 * - SEL_RESPONSIBLE_DECISIONS: Problem-solving, ethical reasoning, evaluating consequences
 *
 * @module curated-questions/sel
 */

import type { GeneratedQuestion } from '../../types/questions.types.js';

/**
 * Grade K-5 SEL Questions
 */
export const SEL_K5: GeneratedQuestion[] = [
  // ── Self-Awareness ──
  {
    id: 'sel-k5-sa-001',
    skillCode: 'SEL_SELF_AWARENESS',
    type: 'multiple-choice',
    stem: 'How do you know when you are feeling happy?',
    options: [
      { id: 'A', text: 'You might smile and want to play', isCorrect: true },
      { id: 'B', text: 'You feel like crying', isCorrect: false },
      { id: 'C', text: 'You want to be alone and quiet', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'D', text: 'Your stomach hurts', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'When we are happy, we often smile, feel energetic, and want to do fun activities. Our body shows how we feel inside.',
    standardsAlignment: ['CASEL.SELF-AWARENESS.K-5'],
    difficulty: 0.2,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 11,
      estimatedTimeSeconds: 15,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-k5-sa-002',
    skillCode: 'SEL_SELF_AWARENESS',
    type: 'multiple-choice',
    stem: 'Everyone is good at different things. What is something that makes you special?',
    options: [
      { id: 'A', text: 'Being exactly like everyone else', isCorrect: false },
      { id: 'B', text: 'Having no talents or strengths', isCorrect: false },
      { id: 'C', text: 'Your unique skills and interests', isCorrect: true },
      { id: 'D', text: 'Being better than all your friends', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'C',
    explanation: 'Everyone has unique skills and interests that make them special. You might be good at drawing, being kind, solving problems, or many other things!',
    standardsAlignment: ['CASEL.SELF-AWARENESS.K-5'],
    difficulty: 0.25,
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
  // ── Self-Management ──
  {
    id: 'sel-k5-sm-001',
    skillCode: 'SEL_SELF_MANAGEMENT',
    type: 'multiple-choice',
    stem: 'What is a good way to calm down when you feel angry?',
    options: [
      { id: 'A', text: 'Yell at someone', isCorrect: false },
      { id: 'B', text: 'Take deep breaths', isCorrect: true },
      { id: 'C', text: 'Throw something', isCorrect: false },
      { id: 'D', text: 'Hit a pillow as hard as you can', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'B',
    explanation: 'Taking deep breaths helps calm our body and mind. Breathe in slowly, hold, then breathe out. This helps us think clearly.',
    standardsAlignment: ['CASEL.SELF-MANAGEMENT.K-5'],
    difficulty: 0.25,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 12,
      estimatedTimeSeconds: 15,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-k5-sm-002',
    skillCode: 'SEL_SELF_MANAGEMENT',
    type: 'multiple-choice',
    stem: 'You have a big project to finish. What should you do?',
    options: [
      { id: 'A', text: 'Wait until the last minute', isCorrect: false },
      { id: 'B', text: 'Give up because it is too hard', isCorrect: false },
      { id: 'C', text: 'Break it into smaller steps', isCorrect: true },
      { id: 'D', text: 'Do it all at once without stopping', isCorrect: false, distractorType: 'partial-understanding' },
    ],
    correctAnswer: 'C',
    explanation: 'Breaking big tasks into smaller steps makes them easier to manage. You can finish one step at a time and feel good about your progress.',
    standardsAlignment: ['CASEL.SELF-MANAGEMENT.K-5'],
    difficulty: 0.35,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 3,
      wordCount: 14,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  // ── Social Awareness ──
  {
    id: 'sel-k5-soa-001',
    skillCode: 'SEL_SOCIAL_AWARENESS',
    type: 'multiple-choice',
    stem: 'Your friend looks sad. What could you do?',
    options: [
      { id: 'A', text: 'Ignore them and keep playing', isCorrect: false },
      { id: 'B', text: 'Ask if they are okay', isCorrect: true },
      { id: 'C', text: 'Tell them to stop being sad', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'D', text: 'Walk away quickly', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Asking "Are you okay?" shows you care about your friend. Good friends notice how others feel and try to help.',
    standardsAlignment: ['CASEL.SOCIAL-AWARENESS.K-5'],
    difficulty: 0.25,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 10,
      estimatedTimeSeconds: 15,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-k5-soa-002',
    skillCode: 'SEL_SOCIAL_AWARENESS',
    type: 'multiple-choice',
    stem: 'Why is it important to listen when others are speaking?',
    options: [
      { id: 'A', text: 'It is not important', isCorrect: false },
      { id: 'B', text: 'To show respect and understand their ideas', isCorrect: true },
      { id: 'C', text: 'So you can talk next', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'D', text: 'Because adults make you', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Listening shows respect for others and helps us understand their thoughts and feelings. Good listening builds strong friendships.',
    standardsAlignment: ['CASEL.SOCIAL-AWARENESS.K-5'],
    difficulty: 0.3,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 13,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  // ── Relationship Skills ──
  {
    id: 'sel-k5-rs-001',
    skillCode: 'SEL_RELATIONSHIP_SKILLS',
    type: 'multiple-choice',
    stem: 'Two friends both want to play with the same toy. What is a good solution?',
    options: [
      { id: 'A', text: 'Fight over it', isCorrect: false },
      { id: 'B', text: 'Neither gets to play with it', isCorrect: false },
      { id: 'C', text: 'Take turns', isCorrect: true },
      { id: 'D', text: 'Tell a grown-up to decide', isCorrect: false, distractorType: 'partial-understanding' },
    ],
    correctAnswer: 'C',
    explanation: 'Taking turns is a fair way to share. Both friends get to play, and no one feels left out.',
    standardsAlignment: ['CASEL.RELATIONSHIP-SKILLS.K-5'],
    difficulty: 0.25,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 16,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-k5-rs-002',
    skillCode: 'SEL_RELATIONSHIP_SKILLS',
    type: 'multiple-choice',
    stem: 'What makes someone a good friend?',
    options: [
      { id: 'A', text: 'They always agree with you', isCorrect: false },
      { id: 'B', text: 'They are kind and listen to you', isCorrect: true },
      { id: 'C', text: 'They let you win every game', isCorrect: false },
      { id: 'D', text: 'They give you presents', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'B',
    explanation: 'Good friends are kind, listen to each other, and care about how you feel. Friendship is not about gifts or always agreeing.',
    standardsAlignment: ['CASEL.RELATIONSHIP-SKILLS.K-5'],
    difficulty: 0.3,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 9,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  // ── Responsible Decision-Making ──
  {
    id: 'sel-k5-rd-001',
    skillCode: 'SEL_RESPONSIBLE_DECISIONS',
    type: 'multiple-choice',
    stem: 'You find a wallet on the ground with money inside. What should you do?',
    options: [
      { id: 'A', text: 'Keep the money for yourself', isCorrect: false },
      { id: 'B', text: 'Give it to a trusted adult or turn it in', isCorrect: true },
      { id: 'C', text: 'Leave it there', isCorrect: false },
      { id: 'D', text: 'Take it home and hide it', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'The right thing to do is return the wallet. Someone might be worried about losing it. Being honest helps everyone.',
    standardsAlignment: ['CASEL.RESPONSIBLE-DECISION-MAKING.K-5'],
    difficulty: 0.3,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 3,
      wordCount: 16,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-k5-rd-002',
    skillCode: 'SEL_RESPONSIBLE_DECISIONS',
    type: 'multiple-choice',
    stem: 'Before making a choice, what is a good question to ask yourself?',
    options: [
      { id: 'A', text: 'What will get me in less trouble?', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'What would my friends think?', isCorrect: false },
      { id: 'C', text: 'Is this safe and kind?', isCorrect: true },
      { id: 'D', text: 'How fast can I decide?', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation: 'Good decisions are safe for you and kind to others. Asking "Is this safe and kind?" helps us make better choices.',
    standardsAlignment: ['CASEL.RESPONSIBLE-DECISION-MAKING.K-5'],
    difficulty: 0.35,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 3,
      wordCount: 16,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Grade 6-8 SEL Questions
 */
export const SEL_G6_8: GeneratedQuestion[] = [
  // ── Self-Awareness ──
  {
    id: 'sel-g68-sa-001',
    skillCode: 'SEL_SELF_AWARENESS',
    type: 'multiple-choice',
    stem: 'What is the difference between a "growth mindset" and a "fixed mindset"?',
    options: [
      { id: 'A', text: 'Growth mindset believes abilities cannot change; fixed mindset believes they can', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Growth mindset believes abilities can develop with effort; fixed mindset believes they cannot change', isCorrect: true },
      { id: 'C', text: 'They mean the same thing', isCorrect: false },
      { id: 'D', text: 'Fixed mindset is always better for learning', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'A growth mindset believes that skills and intelligence can develop through effort and learning. A fixed mindset believes abilities are set and cannot change.',
    standardsAlignment: ['CASEL.SELF-AWARENESS.6-8'],
    difficulty: 0.45,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 20,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-g68-sa-002',
    skillCode: 'SEL_SELF_AWARENESS',
    type: 'multiple-choice',
    stem: 'Why is it helpful to recognize your emotions before reacting?',
    options: [
      { id: 'A', text: 'So you can ignore the emotions', isCorrect: false },
      { id: 'B', text: 'It helps you respond thoughtfully instead of impulsively', isCorrect: true },
      { id: 'C', text: 'Emotions are not important', isCorrect: false },
      { id: 'D', text: 'So others do not notice how you feel', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Recognizing emotions gives us a moment to choose our response. This helps us act thoughtfully rather than reacting impulsively, leading to better outcomes.',
    standardsAlignment: ['CASEL.SELF-AWARENESS.6-8'],
    difficulty: 0.4,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 14,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Self-Management ──
  {
    id: 'sel-g68-sm-001',
    skillCode: 'SEL_SELF_MANAGEMENT',
    type: 'multiple-choice',
    stem: 'What does "delayed gratification" mean?',
    options: [
      { id: 'A', text: 'Getting what you want immediately', isCorrect: false },
      { id: 'B', text: 'Waiting for a reward to get a better outcome', isCorrect: true },
      { id: 'C', text: 'Never getting what you want', isCorrect: false },
      { id: 'D', text: 'Asking others for what you want', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Delayed gratification means choosing to wait for something better rather than getting an immediate but smaller reward. It is linked to greater success.',
    standardsAlignment: ['CASEL.SELF-MANAGEMENT.6-8'],
    difficulty: 0.5,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 9,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-g68-sm-002',
    skillCode: 'SEL_SELF_MANAGEMENT',
    type: 'multiple-choice',
    stem: 'Which is an example of a SMART goal?',
    options: [
      { id: 'A', text: 'I want to do better in school', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'B', text: 'I will raise my math grade from B to A by studying 30 minutes daily this semester', isCorrect: true },
      { id: 'C', text: 'I want to be happy', isCorrect: false },
      { id: 'D', text: 'I should work harder', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'SMART goals are Specific, Measurable, Achievable, Relevant, and Time-bound. Option B specifies exactly what, how much, and when.',
    standardsAlignment: ['CASEL.SELF-MANAGEMENT.6-8'],
    difficulty: 0.5,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 12,
      estimatedTimeSeconds: 35,
      contentRiskLevel: 'safe',
    },
  },
  // ── Social Awareness ──
  {
    id: 'sel-g68-soa-001',
    skillCode: 'SEL_SOCIAL_AWARENESS',
    type: 'multiple-choice',
    stem: 'What is empathy?',
    options: [
      { id: 'A', text: 'Feeling sorry for someone', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Understanding and sharing another person\'s feelings', isCorrect: true },
      { id: 'C', text: 'Agreeing with everything someone says', isCorrect: false },
      { id: 'D', text: 'Helping others only when it benefits you', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Empathy is the ability to understand and share another person\'s feelings - to "walk in their shoes." It is different from sympathy (feeling sorry for someone).',
    standardsAlignment: ['CASEL.SOCIAL-AWARENESS.6-8'],
    difficulty: 0.4,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 6,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-g68-soa-002',
    skillCode: 'SEL_SOCIAL_AWARENESS',
    type: 'multiple-choice',
    stem: 'Why is it important to understand different perspectives on an issue?',
    options: [
      { id: 'A', text: 'It is not important - only your view matters', isCorrect: false },
      { id: 'B', text: 'It helps you develop a more complete understanding', isCorrect: true },
      { id: 'C', text: 'So you can prove others wrong', isCorrect: false },
      { id: 'D', text: 'To avoid having your own opinion', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Understanding different perspectives gives us a fuller picture of complex issues. It builds empathy and helps us find better solutions.',
    standardsAlignment: ['CASEL.SOCIAL-AWARENESS.6-8'],
    difficulty: 0.45,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 14,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Relationship Skills ──
  {
    id: 'sel-g68-rs-001',
    skillCode: 'SEL_RELATIONSHIP_SKILLS',
    type: 'multiple-choice',
    stem: 'What is active listening?',
    options: [
      { id: 'A', text: 'Waiting for your turn to talk', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Fully focusing on the speaker and responding thoughtfully', isCorrect: true },
      { id: 'C', text: 'Listening while doing other activities', isCorrect: false },
      { id: 'D', text: 'Agreeing with everything said', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Active listening means giving full attention to the speaker, understanding their message, and responding thoughtfully. It involves eye contact and not interrupting.',
    standardsAlignment: ['CASEL.RELATIONSHIP-SKILLS.6-8'],
    difficulty: 0.4,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 7,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-g68-rs-002',
    skillCode: 'SEL_RELATIONSHIP_SKILLS',
    type: 'multiple-choice',
    stem: 'In a conflict with a friend, what is the best first step?',
    options: [
      { id: 'A', text: 'Tell everyone what they did wrong', isCorrect: false },
      { id: 'B', text: 'Calm down and think before speaking', isCorrect: true },
      { id: 'C', text: 'Stop being their friend immediately', isCorrect: false },
      { id: 'D', text: 'Pretend nothing happened', isCorrect: false, distractorType: 'partial-understanding' },
    ],
    correctAnswer: 'B',
    explanation: 'Taking time to calm down helps you think clearly. Speaking when angry often makes conflicts worse. A cool head leads to better communication.',
    standardsAlignment: ['CASEL.RELATIONSHIP-SKILLS.6-8'],
    difficulty: 0.4,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 17,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Responsible Decision-Making ──
  {
    id: 'sel-g68-rd-001',
    skillCode: 'SEL_RESPONSIBLE_DECISIONS',
    type: 'multiple-choice',
    stem: 'When making a difficult decision, what should you consider?',
    options: [
      { id: 'A', text: 'Only what you want right now', isCorrect: false },
      { id: 'B', text: 'Short-term and long-term consequences for yourself and others', isCorrect: true },
      { id: 'C', text: 'What the most popular choice is', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'D', text: 'Only the easiest option', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Good decisions consider both immediate effects and long-term outcomes, for yourself and others affected. This leads to more responsible choices.',
    standardsAlignment: ['CASEL.RESPONSIBLE-DECISION-MAKING.6-8'],
    difficulty: 0.45,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 13,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-g68-rd-002',
    skillCode: 'SEL_RESPONSIBLE_DECISIONS',
    type: 'multiple-choice',
    stem: 'You see a classmate being bullied online. What is the responsible action?',
    options: [
      { id: 'A', text: 'Join in so you are not the target', isCorrect: false },
      { id: 'B', text: 'Ignore it because it is not your problem', isCorrect: false },
      { id: 'C', text: 'Report it to a trusted adult and support the victim', isCorrect: true },
      { id: 'D', text: 'Share it with more people', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation: 'Bystanders can make a difference. Reporting to a trusted adult and supporting the victim are responsible ways to help stop cyberbullying.',
    standardsAlignment: ['CASEL.RESPONSIBLE-DECISION-MAKING.6-8'],
    difficulty: 0.4,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 15,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Grade 9-12 SEL Questions
 */
export const SEL_G9_12: GeneratedQuestion[] = [
  // ── Self-Awareness ──
  {
    id: 'sel-g912-sa-001',
    skillCode: 'SEL_SELF_AWARENESS',
    type: 'multiple-choice',
    stem: 'What is "metacognition"?',
    options: [
      { id: 'A', text: 'Thinking negatively about yourself', isCorrect: false },
      { id: 'B', text: 'Thinking about your own thinking processes', isCorrect: true },
      { id: 'C', text: 'Forgetting what you learned', isCorrect: false },
      { id: 'D', text: 'Learning quickly without effort', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Metacognition is awareness and understanding of your own thought processes - "thinking about thinking." It helps improve learning and self-regulation.',
    standardsAlignment: ['CASEL.SELF-AWARENESS.9-12'],
    difficulty: 0.55,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 6,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-g912-sa-002',
    skillCode: 'SEL_SELF_AWARENESS',
    type: 'multiple-choice',
    stem: 'How can understanding your personal values help in decision-making?',
    options: [
      { id: 'A', text: 'Values are not related to decisions', isCorrect: false },
      { id: 'B', text: 'Values provide a framework for evaluating choices', isCorrect: true },
      { id: 'C', text: 'Values should be ignored when making decisions', isCorrect: false },
      { id: 'D', text: 'Values only matter in religious decisions', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Personal values act as a compass for decisions. When choices align with your values, you experience less conflict and greater satisfaction.',
    standardsAlignment: ['CASEL.SELF-AWARENESS.9-12'],
    difficulty: 0.5,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 13,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Self-Management ──
  {
    id: 'sel-g912-sm-001',
    skillCode: 'SEL_SELF_MANAGEMENT',
    type: 'multiple-choice',
    stem: 'What is the difference between stress and anxiety?',
    options: [
      { id: 'A', text: 'They are exactly the same thing', isCorrect: false },
      { id: 'B', text: 'Stress is a response to external pressures; anxiety often persists without a clear cause', isCorrect: true },
      { id: 'C', text: 'Anxiety is always more severe than stress', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'D', text: 'Stress is imaginary; anxiety is real', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Stress typically has an identifiable external cause and fades when the stressor is removed. Anxiety may persist without a specific trigger and involves worry about potential future events.',
    standardsAlignment: ['CASEL.SELF-MANAGEMENT.9-12'],
    difficulty: 0.55,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 12,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-g912-sm-002',
    skillCode: 'SEL_SELF_MANAGEMENT',
    type: 'multiple-choice',
    stem: 'Which strategy is most effective for building resilience?',
    options: [
      { id: 'A', text: 'Avoiding all challenging situations', isCorrect: false },
      { id: 'B', text: 'Viewing setbacks as learning opportunities', isCorrect: true },
      { id: 'C', text: 'Never asking for help', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'D', text: 'Ignoring negative emotions', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Resilience is built by facing challenges, learning from failures, and adapting. Viewing setbacks as learning opportunities develops a growth mindset and emotional strength.',
    standardsAlignment: ['CASEL.SELF-MANAGEMENT.9-12'],
    difficulty: 0.5,
    cognitiveLevel: 'evaluate',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 10,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Social Awareness ──
  {
    id: 'sel-g912-soa-001',
    skillCode: 'SEL_SOCIAL_AWARENESS',
    type: 'multiple-choice',
    stem: 'What is "cultural competence"?',
    options: [
      { id: 'A', text: 'Believing your culture is superior to others', isCorrect: false },
      { id: 'B', text: 'The ability to effectively interact with people from different cultures', isCorrect: true },
      { id: 'C', text: 'Knowing facts about every culture', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'D', text: 'Avoiding people from other cultures', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Cultural competence involves awareness of your own cultural worldview, knowledge of other cultures, and skills to interact respectfully and effectively across cultural differences.',
    standardsAlignment: ['CASEL.SOCIAL-AWARENESS.9-12'],
    difficulty: 0.5,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 8,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-g912-soa-002',
    skillCode: 'SEL_SOCIAL_AWARENESS',
    type: 'multiple-choice',
    stem: 'How can implicit bias affect decision-making?',
    options: [
      { id: 'A', text: 'It has no effect on decisions', isCorrect: false },
      { id: 'B', text: 'It can cause people to make unfair judgments without realizing it', isCorrect: true },
      { id: 'C', text: 'It only affects people who are intentionally prejudiced', isCorrect: false },
      { id: 'D', text: 'It improves decision accuracy', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Implicit biases are unconscious attitudes that can influence perceptions and decisions without awareness. Recognizing them is the first step to making fairer decisions.',
    standardsAlignment: ['CASEL.SOCIAL-AWARENESS.9-12'],
    difficulty: 0.55,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 11,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Relationship Skills ──
  {
    id: 'sel-g912-rs-001',
    skillCode: 'SEL_RELATIONSHIP_SKILLS',
    type: 'multiple-choice',
    stem: 'What characterizes a healthy boundary in relationships?',
    options: [
      { id: 'A', text: 'Never saying no to others', isCorrect: false },
      { id: 'B', text: 'Clear limits that respect both your needs and others\' needs', isCorrect: true },
      { id: 'C', text: 'Shutting out everyone completely', isCorrect: false },
      { id: 'D', text: 'Letting others decide everything for you', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Healthy boundaries involve clear communication about your limits while respecting others. They protect well-being without isolating yourself from meaningful relationships.',
    standardsAlignment: ['CASEL.RELATIONSHIP-SKILLS.9-12'],
    difficulty: 0.5,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 12,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-g912-rs-002',
    skillCode: 'SEL_RELATIONSHIP_SKILLS',
    type: 'multiple-choice',
    stem: 'In team collaboration, what is the most important factor for success?',
    options: [
      { id: 'A', text: 'Having one person make all decisions', isCorrect: false },
      { id: 'B', text: 'Psychological safety - feeling safe to take risks and express ideas', isCorrect: true },
      { id: 'C', text: 'Avoiding all disagreements', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'D', text: 'Working independently without communication', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Research shows psychological safety - where team members feel safe to take risks and voice opinions - is the most important factor for team effectiveness.',
    standardsAlignment: ['CASEL.RELATIONSHIP-SKILLS.9-12'],
    difficulty: 0.55,
    cognitiveLevel: 'evaluate',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 16,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Responsible Decision-Making ──
  {
    id: 'sel-g912-rd-001',
    skillCode: 'SEL_RESPONSIBLE_DECISIONS',
    type: 'multiple-choice',
    stem: 'What is ethical reasoning?',
    options: [
      { id: 'A', text: 'Doing whatever benefits you most', isCorrect: false },
      { id: 'B', text: 'Following rules without thinking', isCorrect: false },
      { id: 'C', text: 'Systematically evaluating actions based on moral principles', isCorrect: true },
      { id: 'D', text: 'Making decisions based only on emotions', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation: 'Ethical reasoning involves analyzing situations using moral principles to determine right action. It considers fairness, harm, rights, and the common good.',
    standardsAlignment: ['CASEL.RESPONSIBLE-DECISION-MAKING.9-12'],
    difficulty: 0.55,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 8,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'sel-g912-rd-002',
    skillCode: 'SEL_RESPONSIBLE_DECISIONS',
    type: 'multiple-choice',
    stem: 'When facing a complex ethical dilemma, what approach is most helpful?',
    options: [
      { id: 'A', text: 'Make a quick decision to avoid overthinking', isCorrect: false },
      { id: 'B', text: 'Consider multiple ethical frameworks and stakeholder impacts', isCorrect: true },
      { id: 'C', text: 'Do whatever authority figures say', isCorrect: false },
      { id: 'D', text: 'Avoid making any decision', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Complex ethical dilemmas benefit from examining the situation through different ethical lenses (rights, consequences, virtue, care) and considering all stakeholders affected.',
    standardsAlignment: ['CASEL.RESPONSIBLE-DECISION-MAKING.9-12'],
    difficulty: 0.6,
    cognitiveLevel: 'evaluate',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 14,
      estimatedTimeSeconds: 35,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Get all SEL questions by grade band
 */
export function getSELQuestions(gradeBand: 'K5' | 'G6_8' | 'G9_12'): GeneratedQuestion[] {
  switch (gradeBand) {
    case 'K5':
      return SEL_K5;
    case 'G6_8':
      return SEL_G6_8;
    case 'G9_12':
      return SEL_G9_12;
    default:
      return SEL_G6_8;
  }
}

/**
 * Get SEL questions by skill code
 */
export function getSELQuestionsBySkill(
  gradeBand: 'K5' | 'G6_8' | 'G9_12',
  skillCode: string
): GeneratedQuestion[] {
  return getSELQuestions(gradeBand).filter((q) => q.skillCode === skillCode);
}
