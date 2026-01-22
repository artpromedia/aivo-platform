import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AI_ORCHESTRATOR_URL = process.env.AI_ORCHESTRATOR_URL || 'http://localhost:3020';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key';

/**
 * Assessment Type from parent assessment
 */
type AssessmentType = 'STANDARD' | 'STANDARD_WITH_ACCOMMODATIONS' | 'MODIFIED' | 'ALTERNATE';

/**
 * Grade band mapping
 */
type GradeBand = 'PRE_K' | 'K_2' | 'GRADE_3_5' | 'GRADE_6_8' | 'GRADE_9_12';

interface QuestionRequest {
  domain: string;
  count?: number;
  /** Learner profile from parent assessment */
  gradeBand?: GradeBand;
  assessmentType?: AssessmentType;
  accommodations?: string[];
  gradeLevel?: number;
}

/**
 * Skill codes for each domain
 */
const DOMAIN_SKILL_CODES: Record<string, string[]> = {
  MATH: ['MATH_NUMBER_SENSE', 'MATH_OPERATIONS', 'MATH_FRACTIONS', 'MATH_GEOMETRY', 'MATH_PROBLEM_SOLVING'],
  ELA: ['ELA_PHONEMIC_AWARENESS', 'ELA_VOCABULARY', 'ELA_FLUENCY', 'ELA_COMPREHENSION', 'ELA_WRITING'],
  SPEECH: ['SPEECH_ARTICULATION', 'SPEECH_FLUENCY', 'SPEECH_VOICE', 'SPEECH_LANGUAGE', 'SPEECH_PRAGMATICS'],
  SEL: ['SEL_SELF_AWARENESS', 'SEL_SELF_MANAGEMENT', 'SEL_SOCIAL_AWARENESS', 'SEL_RELATIONSHIPS', 'SEL_DECISIONS'],
  SPELLING: ['SPELL_PATTERNS', 'SPELL_PHONICS', 'SPELL_RULES', 'SPELL_SIGHT_WORDS', 'SPELL_COMPOUND'],
  CREATIVE_WRITING: ['CW_STORY_ELEMENTS', 'CW_CHARACTER', 'CW_SETTING', 'CW_DESCRIPTIVE', 'CW_IMAGINATION'],
  LIFE_SKILLS: ['LIFE_TIME', 'LIFE_MONEY', 'LIFE_SAFETY', 'LIFE_HYGIENE', 'LIFE_ORGANIZATION'],
  SCIENCE: ['SCI_OBSERVATION', 'SCI_HYPOTHESIS', 'SCI_EXPERIMENT', 'SCI_DATA', 'SCI_CONCLUSION'],
};

/**
 * Stub questions for fallback/demo - organized by assessment type
 */
const STUB_QUESTIONS: Record<string, Record<AssessmentType, Array<{
  id: string;
  domain: string;
  skillCode: string;
  questionType: 'MULTIPLE_CHOICE';
  questionText: string;
  options: string[];
  difficulty: number;
  questionNumber: number;
}>>> = {
  MATH: {
    STANDARD: [
      { id: 'math-1', domain: 'MATH', skillCode: 'MATH_NUMBER_SENSE', questionType: 'MULTIPLE_CHOICE', questionText: 'What is 7 + 5?', options: ['10', '11', '12', '13'], difficulty: 2, questionNumber: 1 },
      { id: 'math-2', domain: 'MATH', skillCode: 'MATH_OPERATIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'What is 15 - 8?', options: ['5', '6', '7', '8'], difficulty: 2, questionNumber: 2 },
      { id: 'math-3', domain: 'MATH', skillCode: 'MATH_FRACTIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'What is half of 10?', options: ['3', '4', '5', '6'], difficulty: 2, questionNumber: 3 },
      { id: 'math-4', domain: 'MATH', skillCode: 'MATH_GEOMETRY', questionType: 'MULTIPLE_CHOICE', questionText: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], difficulty: 1, questionNumber: 4 },
      { id: 'math-5', domain: 'MATH', skillCode: 'MATH_PROBLEM_SOLVING', questionType: 'MULTIPLE_CHOICE', questionText: 'If you have 3 apples and get 4 more, how many do you have?', options: ['5', '6', '7', '8'], difficulty: 2, questionNumber: 5 },
    ],
    STANDARD_WITH_ACCOMMODATIONS: [
      { id: 'math-1', domain: 'MATH', skillCode: 'MATH_NUMBER_SENSE', questionType: 'MULTIPLE_CHOICE', questionText: 'What is 7 + 5?', options: ['10', '11', '12', '13'], difficulty: 2, questionNumber: 1 },
      { id: 'math-2', domain: 'MATH', skillCode: 'MATH_OPERATIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'What is 15 - 8?', options: ['5', '6', '7', '8'], difficulty: 2, questionNumber: 2 },
      { id: 'math-3', domain: 'MATH', skillCode: 'MATH_FRACTIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'What is half of 10?', options: ['3', '4', '5', '6'], difficulty: 2, questionNumber: 3 },
      { id: 'math-4', domain: 'MATH', skillCode: 'MATH_GEOMETRY', questionType: 'MULTIPLE_CHOICE', questionText: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], difficulty: 1, questionNumber: 4 },
      { id: 'math-5', domain: 'MATH', skillCode: 'MATH_PROBLEM_SOLVING', questionType: 'MULTIPLE_CHOICE', questionText: 'If you have 3 apples and get 4 more, how many do you have?', options: ['5', '6', '7', '8'], difficulty: 2, questionNumber: 5 },
    ],
    MODIFIED: [
      { id: 'math-m1', domain: 'MATH', skillCode: 'MATH_NUMBER_SENSE', questionType: 'MULTIPLE_CHOICE', questionText: 'How many is 2 + 2? 🍎🍎 + 🍎🍎 = ?', options: ['3', '4', '5'], difficulty: 1, questionNumber: 1 },
      { id: 'math-m2', domain: 'MATH', skillCode: 'MATH_OPERATIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'You have 5 cookies. You eat 2. How many left?', options: ['2', '3', '4'], difficulty: 1, questionNumber: 2 },
      { id: 'math-m3', domain: 'MATH', skillCode: 'MATH_FRACTIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'Cut the pizza in half. How many pieces?', options: ['1', '2', '3'], difficulty: 1, questionNumber: 3 },
      { id: 'math-m4', domain: 'MATH', skillCode: 'MATH_GEOMETRY', questionType: 'MULTIPLE_CHOICE', questionText: 'Which shape is a circle? ⭕ ⬜ △', options: ['Circle ⭕', 'Square ⬜', 'Triangle △'], difficulty: 1, questionNumber: 4 },
      { id: 'math-m5', domain: 'MATH', skillCode: 'MATH_PROBLEM_SOLVING', questionType: 'MULTIPLE_CHOICE', questionText: 'You have 2 toys. Mom gives you 1 more. How many?', options: ['2', '3', '4'], difficulty: 1, questionNumber: 5 },
    ],
    ALTERNATE: [
      { id: 'math-a1', domain: 'MATH', skillCode: 'MATH_NUMBER_SENSE', questionType: 'MULTIPLE_CHOICE', questionText: 'Show me 2 fingers. 🖐️', options: ['I can do it', 'I need help'], difficulty: 1, questionNumber: 1 },
      { id: 'math-a2', domain: 'MATH', skillCode: 'MATH_OPERATIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which is more? 🍎🍎🍎 or 🍎?', options: ['3 apples 🍎🍎🍎', '1 apple 🍎'], difficulty: 1, questionNumber: 2 },
      { id: 'math-a3', domain: 'MATH', skillCode: 'MATH_FRACTIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'Share the cookie with a friend. Each person gets...', options: ['A piece', 'Nothing'], difficulty: 1, questionNumber: 3 },
      { id: 'math-a4', domain: 'MATH', skillCode: 'MATH_GEOMETRY', questionType: 'MULTIPLE_CHOICE', questionText: 'Point to something round in the room.', options: ['I found it!', 'Help me find it'], difficulty: 1, questionNumber: 4 },
      { id: 'math-a5', domain: 'MATH', skillCode: 'MATH_PROBLEM_SOLVING', questionType: 'MULTIPLE_CHOICE', questionText: 'Pick up 2 blocks.', options: ['Done!', 'I need help'], difficulty: 1, questionNumber: 5 },
    ],
  },
  ELA: {
    STANDARD: [
      { id: 'ela-1', domain: 'ELA', skillCode: 'ELA_PHONEMIC_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word rhymes with "cat"?', options: ['Dog', 'Hat', 'Bird', 'Fish'], difficulty: 1, questionNumber: 1 },
      { id: 'ela-2', domain: 'ELA', skillCode: 'ELA_VOCABULARY', questionType: 'MULTIPLE_CHOICE', questionText: 'What does "happy" mean?', options: ['Sad', 'Joyful', 'Angry', 'Tired'], difficulty: 1, questionNumber: 2 },
      { id: 'ela-3', domain: 'ELA', skillCode: 'ELA_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'Which sentence is correct?', options: ['The dog run fast.', 'The dog runs fast.', 'The dog running fast.', 'The dog runned fast.'], difficulty: 2, questionNumber: 3 },
      { id: 'ela-4', domain: 'ELA', skillCode: 'ELA_COMPREHENSION', questionType: 'MULTIPLE_CHOICE', questionText: 'In "The Three Little Pigs", what did the wolf try to do?', options: ['Help build houses', 'Blow the houses down', 'Give the pigs food', 'Teach the pigs to dance'], difficulty: 2, questionNumber: 4 },
      { id: 'ela-5', domain: 'ELA', skillCode: 'ELA_WRITING', questionType: 'MULTIPLE_CHOICE', questionText: 'Which punctuation ends a question?', options: ['.', '!', '?', ','], difficulty: 1, questionNumber: 5 },
    ],
    STANDARD_WITH_ACCOMMODATIONS: [
      { id: 'ela-1', domain: 'ELA', skillCode: 'ELA_PHONEMIC_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word rhymes with "cat"?', options: ['Dog', 'Hat', 'Bird', 'Fish'], difficulty: 1, questionNumber: 1 },
      { id: 'ela-2', domain: 'ELA', skillCode: 'ELA_VOCABULARY', questionType: 'MULTIPLE_CHOICE', questionText: 'What does "happy" mean?', options: ['Sad', 'Joyful', 'Angry', 'Tired'], difficulty: 1, questionNumber: 2 },
      { id: 'ela-3', domain: 'ELA', skillCode: 'ELA_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'Which sentence is correct?', options: ['The dog run fast.', 'The dog runs fast.', 'The dog running fast.', 'The dog runned fast.'], difficulty: 2, questionNumber: 3 },
      { id: 'ela-4', domain: 'ELA', skillCode: 'ELA_COMPREHENSION', questionType: 'MULTIPLE_CHOICE', questionText: 'In "The Three Little Pigs", what did the wolf try to do?', options: ['Help build houses', 'Blow the houses down', 'Give the pigs food', 'Teach the pigs to dance'], difficulty: 2, questionNumber: 4 },
      { id: 'ela-5', domain: 'ELA', skillCode: 'ELA_WRITING', questionType: 'MULTIPLE_CHOICE', questionText: 'Which punctuation ends a question?', options: ['.', '!', '?', ','], difficulty: 1, questionNumber: 5 },
    ],
    MODIFIED: [
      { id: 'ela-m1', domain: 'ELA', skillCode: 'ELA_PHONEMIC_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'Cat sounds like... 🐱', options: ['Hat 🎩', 'Dog 🐕', 'Bird 🐦'], difficulty: 1, questionNumber: 1 },
      { id: 'ela-m2', domain: 'ELA', skillCode: 'ELA_VOCABULARY', questionType: 'MULTIPLE_CHOICE', questionText: 'Happy means feeling... 😊', options: ['Good 😊', 'Sad 😢', 'Angry 😠'], difficulty: 1, questionNumber: 2 },
      { id: 'ela-m3', domain: 'ELA', skillCode: 'ELA_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'The dog ___. (runs or run)', options: ['runs', 'run', 'running'], difficulty: 1, questionNumber: 3 },
      { id: 'ela-m4', domain: 'ELA', skillCode: 'ELA_COMPREHENSION', questionType: 'MULTIPLE_CHOICE', questionText: 'The wolf tried to blow down the house. True? 🐺💨🏠', options: ['Yes, true', 'No, false', 'I don\'t know'], difficulty: 1, questionNumber: 4 },
      { id: 'ela-m5', domain: 'ELA', skillCode: 'ELA_WRITING', questionType: 'MULTIPLE_CHOICE', questionText: 'Questions end with...', options: ['? (question mark)', '. (period)', '! (exclamation)'], difficulty: 1, questionNumber: 5 },
    ],
    ALTERNATE: [
      { id: 'ela-a1', domain: 'ELA', skillCode: 'ELA_PHONEMIC_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'Point to the picture that starts with "B". 🏀🍎', options: ['Ball 🏀', 'Apple 🍎'], difficulty: 1, questionNumber: 1 },
      { id: 'ela-a2', domain: 'ELA', skillCode: 'ELA_VOCABULARY', questionType: 'MULTIPLE_CHOICE', questionText: 'Show me your happy face. 😊', options: ['I did it!', 'Help me'], difficulty: 1, questionNumber: 2 },
      { id: 'ela-a3', domain: 'ELA', skillCode: 'ELA_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'Say your name.', options: ['I said it!', 'I need help'], difficulty: 1, questionNumber: 3 },
      { id: 'ela-a4', domain: 'ELA', skillCode: 'ELA_COMPREHENSION', questionType: 'MULTIPLE_CHOICE', questionText: 'Point to the dog. 🐕 🐱', options: ['Dog 🐕', 'Cat 🐱'], difficulty: 1, questionNumber: 4 },
      { id: 'ela-a5', domain: 'ELA', skillCode: 'ELA_WRITING', questionType: 'MULTIPLE_CHOICE', questionText: 'Write your first letter of your name.', options: ['I wrote it!', 'Help me write'], difficulty: 1, questionNumber: 5 },
    ],
  },
  // Add simplified stubs for other domains (using STANDARD as base)
  SPEECH: {
    STANDARD: [
      { id: 'speech-1', domain: 'SPEECH', skillCode: 'SPEECH_ARTICULATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word starts with the same sound as "sun"?', options: ['Ball', 'Cat', 'Soap', 'Tree'], difficulty: 1, questionNumber: 1 },
      { id: 'speech-2', domain: 'SPEECH', skillCode: 'SPEECH_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'When speaking to a group, you should...', options: ['Whisper quietly', 'Speak clearly', 'Talk very fast', 'Look at the floor'], difficulty: 2, questionNumber: 2 },
      { id: 'speech-3', domain: 'SPEECH', skillCode: 'SPEECH_VOICE', questionType: 'MULTIPLE_CHOICE', questionText: 'How should you speak when someone is sleeping?', options: ['Very loudly', 'In a normal voice', 'Quietly', 'Not at all'], difficulty: 1, questionNumber: 3 },
      { id: 'speech-4', domain: 'SPEECH', skillCode: 'SPEECH_LANGUAGE', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word means the same as "big"?', options: ['Small', 'Tiny', 'Large', 'Short'], difficulty: 1, questionNumber: 4 },
      { id: 'speech-5', domain: 'SPEECH', skillCode: 'SPEECH_PRAGMATICS', questionType: 'MULTIPLE_CHOICE', questionText: 'When meeting someone new, you should...', options: ['Look away', 'Say hello', 'Stay silent', 'Run away'], difficulty: 1, questionNumber: 5 },
    ],
    STANDARD_WITH_ACCOMMODATIONS: [
      { id: 'speech-1', domain: 'SPEECH', skillCode: 'SPEECH_ARTICULATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word starts with the same sound as "sun"?', options: ['Ball', 'Cat', 'Soap', 'Tree'], difficulty: 1, questionNumber: 1 },
      { id: 'speech-2', domain: 'SPEECH', skillCode: 'SPEECH_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'When speaking to a group, you should...', options: ['Whisper quietly', 'Speak clearly', 'Talk very fast', 'Look at the floor'], difficulty: 2, questionNumber: 2 },
      { id: 'speech-3', domain: 'SPEECH', skillCode: 'SPEECH_VOICE', questionType: 'MULTIPLE_CHOICE', questionText: 'How should you speak when someone is sleeping?', options: ['Very loudly', 'In a normal voice', 'Quietly', 'Not at all'], difficulty: 1, questionNumber: 3 },
      { id: 'speech-4', domain: 'SPEECH', skillCode: 'SPEECH_LANGUAGE', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word means the same as "big"?', options: ['Small', 'Tiny', 'Large', 'Short'], difficulty: 1, questionNumber: 4 },
      { id: 'speech-5', domain: 'SPEECH', skillCode: 'SPEECH_PRAGMATICS', questionType: 'MULTIPLE_CHOICE', questionText: 'When meeting someone new, you should...', options: ['Look away', 'Say hello', 'Stay silent', 'Run away'], difficulty: 1, questionNumber: 5 },
    ],
    MODIFIED: [
      { id: 'speech-m1', domain: 'SPEECH', skillCode: 'SPEECH_ARTICULATION', questionType: 'MULTIPLE_CHOICE', questionText: '"Sun" starts with... ☀️', options: ['S sound 🐍', 'B sound', 'T sound'], difficulty: 1, questionNumber: 1 },
      { id: 'speech-m2', domain: 'SPEECH', skillCode: 'SPEECH_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'Talk clearly so others can hear. 🗣️', options: ['Yes, I can', 'Sometimes', 'I need help'], difficulty: 1, questionNumber: 2 },
      { id: 'speech-m3', domain: 'SPEECH', skillCode: 'SPEECH_VOICE', questionType: 'MULTIPLE_CHOICE', questionText: 'Baby sleeping. Use... 👶💤', options: ['Quiet voice 🤫', 'Loud voice 📢', 'No voice'], difficulty: 1, questionNumber: 3 },
      { id: 'speech-m4', domain: 'SPEECH', skillCode: 'SPEECH_LANGUAGE', questionType: 'MULTIPLE_CHOICE', questionText: 'Big means the same as...', options: ['Large 🐘', 'Small 🐜', 'Fast 🏃'], difficulty: 1, questionNumber: 4 },
      { id: 'speech-m5', domain: 'SPEECH', skillCode: 'SPEECH_PRAGMATICS', questionType: 'MULTIPLE_CHOICE', questionText: 'When you meet someone, say... 👋', options: ['Hello!', 'Goodbye!', 'Nothing'], difficulty: 1, questionNumber: 5 },
    ],
    ALTERNATE: [
      { id: 'speech-a1', domain: 'SPEECH', skillCode: 'SPEECH_ARTICULATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Say "hello" 👋', options: ['I said it!', 'Help me say it'], difficulty: 1, questionNumber: 1 },
      { id: 'speech-a2', domain: 'SPEECH', skillCode: 'SPEECH_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'Tell me your name.', options: ['I told you!', 'I need help'], difficulty: 1, questionNumber: 2 },
      { id: 'speech-a3', domain: 'SPEECH', skillCode: 'SPEECH_VOICE', questionType: 'MULTIPLE_CHOICE', questionText: 'Use your quiet voice. 🤫', options: ['I did it!', 'Show me how'], difficulty: 1, questionNumber: 3 },
      { id: 'speech-a4', domain: 'SPEECH', skillCode: 'SPEECH_LANGUAGE', questionType: 'MULTIPLE_CHOICE', questionText: 'Point to something big. 🐘', options: ['I found one!', 'Help me find it'], difficulty: 1, questionNumber: 4 },
      { id: 'speech-a5', domain: 'SPEECH', skillCode: 'SPEECH_PRAGMATICS', questionType: 'MULTIPLE_CHOICE', questionText: 'Wave to say goodbye. 👋', options: ['I waved!', 'Show me how'], difficulty: 1, questionNumber: 5 },
    ],
  },
  SEL: {
    STANDARD: [
      { id: 'sel-1', domain: 'SEL', skillCode: 'SEL_SELF_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'When I feel angry, I...', options: ['Yell at others', 'Take deep breaths', 'Break things', 'Ignore it'], difficulty: 2, questionNumber: 1 },
      { id: 'sel-2', domain: 'SEL', skillCode: 'SEL_SELF_MANAGEMENT', questionType: 'MULTIPLE_CHOICE', questionText: 'If homework is hard, I should...', options: ['Give up', 'Ask for help', 'Throw it away', 'Cry'], difficulty: 2, questionNumber: 2 },
      { id: 'sel-3', domain: 'SEL', skillCode: 'SEL_SOCIAL_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'If a friend looks sad, I could...', options: ['Laugh at them', 'Ask if they are okay', 'Walk away', 'Tell others'], difficulty: 1, questionNumber: 3 },
      { id: 'sel-4', domain: 'SEL', skillCode: 'SEL_RELATIONSHIPS', questionType: 'MULTIPLE_CHOICE', questionText: 'Good friends...', options: ['Share and take turns', 'Always fight', 'Ignore each other', 'Keep secrets'], difficulty: 1, questionNumber: 4 },
      { id: 'sel-5', domain: 'SEL', skillCode: 'SEL_DECISIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'Before making a choice, I should...', options: ['Do it right away', 'Think about what might happen', 'Ask a stranger', 'Flip a coin'], difficulty: 2, questionNumber: 5 },
    ],
    STANDARD_WITH_ACCOMMODATIONS: [
      { id: 'sel-1', domain: 'SEL', skillCode: 'SEL_SELF_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'When I feel angry, I...', options: ['Yell at others', 'Take deep breaths', 'Break things', 'Ignore it'], difficulty: 2, questionNumber: 1 },
      { id: 'sel-2', domain: 'SEL', skillCode: 'SEL_SELF_MANAGEMENT', questionType: 'MULTIPLE_CHOICE', questionText: 'If homework is hard, I should...', options: ['Give up', 'Ask for help', 'Throw it away', 'Cry'], difficulty: 2, questionNumber: 2 },
      { id: 'sel-3', domain: 'SEL', skillCode: 'SEL_SOCIAL_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'If a friend looks sad, I could...', options: ['Laugh at them', 'Ask if they are okay', 'Walk away', 'Tell others'], difficulty: 1, questionNumber: 3 },
      { id: 'sel-4', domain: 'SEL', skillCode: 'SEL_RELATIONSHIPS', questionType: 'MULTIPLE_CHOICE', questionText: 'Good friends...', options: ['Share and take turns', 'Always fight', 'Ignore each other', 'Keep secrets'], difficulty: 1, questionNumber: 4 },
      { id: 'sel-5', domain: 'SEL', skillCode: 'SEL_DECISIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'Before making a choice, I should...', options: ['Do it right away', 'Think about what might happen', 'Ask a stranger', 'Flip a coin'], difficulty: 2, questionNumber: 5 },
    ],
    MODIFIED: [
      { id: 'sel-m1', domain: 'SEL', skillCode: 'SEL_SELF_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'When angry, I can... 😤', options: ['Breathe deep 🌬️', 'Hit things 👊', 'Yell 😠'], difficulty: 1, questionNumber: 1 },
      { id: 'sel-m2', domain: 'SEL', skillCode: 'SEL_SELF_MANAGEMENT', questionType: 'MULTIPLE_CHOICE', questionText: 'Work is hard. I should...', options: ['Ask for help 🙋', 'Give up 😔', 'Get angry 😠'], difficulty: 1, questionNumber: 2 },
      { id: 'sel-m3', domain: 'SEL', skillCode: 'SEL_SOCIAL_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'Friend is sad. 😢 I can...', options: ['Ask "Are you OK?"', 'Laugh at them', 'Walk away'], difficulty: 1, questionNumber: 3 },
      { id: 'sel-m4', domain: 'SEL', skillCode: 'SEL_RELATIONSHIPS', questionType: 'MULTIPLE_CHOICE', questionText: 'Good friends... 👫', options: ['Share toys', 'Fight a lot', 'Ignore each other'], difficulty: 1, questionNumber: 4 },
      { id: 'sel-m5', domain: 'SEL', skillCode: 'SEL_DECISIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'Before choosing, I think... 🤔', options: ['What will happen?', 'Just do it fast', 'Ask a stranger'], difficulty: 1, questionNumber: 5 },
    ],
    ALTERNATE: [
      { id: 'sel-a1', domain: 'SEL', skillCode: 'SEL_SELF_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'Show me a happy face. 😊', options: ['I did it!', 'Help me'], difficulty: 1, questionNumber: 1 },
      { id: 'sel-a2', domain: 'SEL', skillCode: 'SEL_SELF_MANAGEMENT', questionType: 'MULTIPLE_CHOICE', questionText: 'Take 3 deep breaths. 🌬️', options: ['I did it!', 'Breathe with me'], difficulty: 1, questionNumber: 2 },
      { id: 'sel-a3', domain: 'SEL', skillCode: 'SEL_SOCIAL_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'Give a friend a high five. 🙌', options: ['I did it!', 'Help me'], difficulty: 1, questionNumber: 3 },
      { id: 'sel-a4', domain: 'SEL', skillCode: 'SEL_RELATIONSHIPS', questionType: 'MULTIPLE_CHOICE', questionText: 'Share a toy with a friend. 🧸', options: ['I shared!', 'I need help sharing'], difficulty: 1, questionNumber: 4 },
      { id: 'sel-a5', domain: 'SEL', skillCode: 'SEL_DECISIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'Pick: cookie 🍪 or apple 🍎?', options: ['I picked one!', 'Help me decide'], difficulty: 1, questionNumber: 5 },
    ],
  },
  SPELLING: {
    STANDARD: [
      { id: 'spell-1', domain: 'SPELLING', skillCode: 'SPELL_PATTERNS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which spelling is correct?', options: ['freind', 'friend', 'frend', 'frind'], difficulty: 2, questionNumber: 1 },
      { id: 'spell-2', domain: 'SPELLING', skillCode: 'SPELL_PHONICS', questionType: 'MULTIPLE_CHOICE', questionText: 'How do you spell the word for a large body of water?', options: ['oshun', 'ocen', 'ocean', 'oshen'], difficulty: 2, questionNumber: 2 },
      { id: 'spell-3', domain: 'SPELLING', skillCode: 'SPELL_RULES', questionType: 'MULTIPLE_CHOICE', questionText: 'Which is the correct plural of "cat"?', options: ['cates', 'cats', 'caties', "cat's"], difficulty: 1, questionNumber: 3 },
      { id: 'spell-4', domain: 'SPELLING', skillCode: 'SPELL_SIGHT_WORDS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word is spelled correctly?', options: ['becuz', 'becuase', 'because', 'becouse'], difficulty: 2, questionNumber: 4 },
      { id: 'spell-5', domain: 'SPELLING', skillCode: 'SPELL_COMPOUND', questionType: 'MULTIPLE_CHOICE', questionText: 'How do you spell "sun" + "flower"?', options: ['sunflower', 'sun flower', 'sunflawer', 'son flower'], difficulty: 2, questionNumber: 5 },
    ],
    STANDARD_WITH_ACCOMMODATIONS: [
      { id: 'spell-1', domain: 'SPELLING', skillCode: 'SPELL_PATTERNS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which spelling is correct?', options: ['freind', 'friend', 'frend', 'frind'], difficulty: 2, questionNumber: 1 },
      { id: 'spell-2', domain: 'SPELLING', skillCode: 'SPELL_PHONICS', questionType: 'MULTIPLE_CHOICE', questionText: 'How do you spell the word for a large body of water?', options: ['oshun', 'ocen', 'ocean', 'oshen'], difficulty: 2, questionNumber: 2 },
      { id: 'spell-3', domain: 'SPELLING', skillCode: 'SPELL_RULES', questionType: 'MULTIPLE_CHOICE', questionText: 'Which is the correct plural of "cat"?', options: ['cates', 'cats', 'caties', "cat's"], difficulty: 1, questionNumber: 3 },
      { id: 'spell-4', domain: 'SPELLING', skillCode: 'SPELL_SIGHT_WORDS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word is spelled correctly?', options: ['becuz', 'becuase', 'because', 'becouse'], difficulty: 2, questionNumber: 4 },
      { id: 'spell-5', domain: 'SPELLING', skillCode: 'SPELL_COMPOUND', questionType: 'MULTIPLE_CHOICE', questionText: 'How do you spell "sun" + "flower"?', options: ['sunflower', 'sun flower', 'sunflawer', 'son flower'], difficulty: 2, questionNumber: 5 },
    ],
    MODIFIED: [
      { id: 'spell-m1', domain: 'SPELLING', skillCode: 'SPELL_PATTERNS', questionType: 'MULTIPLE_CHOICE', questionText: 'Pick the right spelling: CAT 🐱', options: ['cat', 'kat', 'catt'], difficulty: 1, questionNumber: 1 },
      { id: 'spell-m2', domain: 'SPELLING', skillCode: 'SPELL_PHONICS', questionType: 'MULTIPLE_CHOICE', questionText: 'DOG starts with D. Pick D-O-G.', options: ['dog', 'bog', 'doog'], difficulty: 1, questionNumber: 2 },
      { id: 'spell-m3', domain: 'SPELLING', skillCode: 'SPELL_RULES', questionType: 'MULTIPLE_CHOICE', questionText: 'More than one cat = ...', options: ['cats', 'cates', 'cat'], difficulty: 1, questionNumber: 3 },
      { id: 'spell-m4', domain: 'SPELLING', skillCode: 'SPELL_SIGHT_WORDS', questionType: 'MULTIPLE_CHOICE', questionText: 'Pick: THE', options: ['the', 'teh', 'duh'], difficulty: 1, questionNumber: 4 },
      { id: 'spell-m5', domain: 'SPELLING', skillCode: 'SPELL_COMPOUND', questionType: 'MULTIPLE_CHOICE', questionText: 'CUP + CAKE = ?', options: ['cupcake', 'cup cake', 'cupcak'], difficulty: 1, questionNumber: 5 },
    ],
    ALTERNATE: [
      { id: 'spell-a1', domain: 'SPELLING', skillCode: 'SPELL_PATTERNS', questionType: 'MULTIPLE_CHOICE', questionText: 'Find the letter A', options: ['I found it!', 'Show me'], difficulty: 1, questionNumber: 1 },
      { id: 'spell-a2', domain: 'SPELLING', skillCode: 'SPELL_PHONICS', questionType: 'MULTIPLE_CHOICE', questionText: 'What letter does CAT start with?', options: ['C', 'A', 'T'], difficulty: 1, questionNumber: 2 },
      { id: 'spell-a3', domain: 'SPELLING', skillCode: 'SPELL_RULES', questionType: 'MULTIPLE_CHOICE', questionText: 'Point to your name.', options: ['I found it!', 'Help me'], difficulty: 1, questionNumber: 3 },
      { id: 'spell-a4', domain: 'SPELLING', skillCode: 'SPELL_SIGHT_WORDS', questionType: 'MULTIPLE_CHOICE', questionText: 'Find the word THE', options: ['I found it!', 'Show me'], difficulty: 1, questionNumber: 4 },
      { id: 'spell-a5', domain: 'SPELLING', skillCode: 'SPELL_COMPOUND', questionType: 'MULTIPLE_CHOICE', questionText: 'Write the first letter of your name.', options: ['I did it!', 'Help me write'], difficulty: 1, questionNumber: 5 },
    ],
  },
  CREATIVE_WRITING: {
    STANDARD: [
      { id: 'cw-1', domain: 'CREATIVE_WRITING', skillCode: 'CW_STORY_ELEMENTS', questionType: 'MULTIPLE_CHOICE', questionText: 'Every story needs a...', options: ['Beginning, middle, and end', 'Picture', 'Long title', 'Rhyme'], difficulty: 1, questionNumber: 1 },
      { id: 'cw-2', domain: 'CREATIVE_WRITING', skillCode: 'CW_CHARACTER', questionType: 'MULTIPLE_CHOICE', questionText: 'A character in a story is...', options: ['The setting', 'A person or animal', 'The ending', 'The title'], difficulty: 1, questionNumber: 2 },
      { id: 'cw-3', domain: 'CREATIVE_WRITING', skillCode: 'CW_SETTING', questionType: 'MULTIPLE_CHOICE', questionText: 'The setting tells us...', options: ['Who is in the story', 'Where and when', 'What happens last', 'The moral'], difficulty: 1, questionNumber: 3 },
      { id: 'cw-4', domain: 'CREATIVE_WRITING', skillCode: 'CW_DESCRIPTIVE', questionType: 'MULTIPLE_CHOICE', questionText: 'Which sentence is more descriptive?', options: ['The dog ran.', 'The fluffy brown dog ran quickly.', 'Dog.', 'Running.'], difficulty: 2, questionNumber: 4 },
      { id: 'cw-5', domain: 'CREATIVE_WRITING', skillCode: 'CW_IMAGINATION', questionType: 'MULTIPLE_CHOICE', questionText: 'In creative writing, you can...', options: ['Only write facts', 'Make up stories', 'Copy from books', 'Only use real people'], difficulty: 1, questionNumber: 5 },
    ],
    STANDARD_WITH_ACCOMMODATIONS: [
      { id: 'cw-1', domain: 'CREATIVE_WRITING', skillCode: 'CW_STORY_ELEMENTS', questionType: 'MULTIPLE_CHOICE', questionText: 'Every story needs a...', options: ['Beginning, middle, and end', 'Picture', 'Long title', 'Rhyme'], difficulty: 1, questionNumber: 1 },
      { id: 'cw-2', domain: 'CREATIVE_WRITING', skillCode: 'CW_CHARACTER', questionType: 'MULTIPLE_CHOICE', questionText: 'A character in a story is...', options: ['The setting', 'A person or animal', 'The ending', 'The title'], difficulty: 1, questionNumber: 2 },
      { id: 'cw-3', domain: 'CREATIVE_WRITING', skillCode: 'CW_SETTING', questionType: 'MULTIPLE_CHOICE', questionText: 'The setting tells us...', options: ['Who is in the story', 'Where and when', 'What happens last', 'The moral'], difficulty: 1, questionNumber: 3 },
      { id: 'cw-4', domain: 'CREATIVE_WRITING', skillCode: 'CW_DESCRIPTIVE', questionType: 'MULTIPLE_CHOICE', questionText: 'Which sentence is more descriptive?', options: ['The dog ran.', 'The fluffy brown dog ran quickly.', 'Dog.', 'Running.'], difficulty: 2, questionNumber: 4 },
      { id: 'cw-5', domain: 'CREATIVE_WRITING', skillCode: 'CW_IMAGINATION', questionType: 'MULTIPLE_CHOICE', questionText: 'In creative writing, you can...', options: ['Only write facts', 'Make up stories', 'Copy from books', 'Only use real people'], difficulty: 1, questionNumber: 5 },
    ],
    MODIFIED: [
      { id: 'cw-m1', domain: 'CREATIVE_WRITING', skillCode: 'CW_STORY_ELEMENTS', questionType: 'MULTIPLE_CHOICE', questionText: 'Stories have a start 📖 and...', options: ['An end 🔚', 'A picture only', 'Nothing else'], difficulty: 1, questionNumber: 1 },
      { id: 'cw-m2', domain: 'CREATIVE_WRITING', skillCode: 'CW_CHARACTER', questionType: 'MULTIPLE_CHOICE', questionText: 'A character is...', options: ['A person in the story 👧', 'The place', 'The title'], difficulty: 1, questionNumber: 2 },
      { id: 'cw-m3', domain: 'CREATIVE_WRITING', skillCode: 'CW_SETTING', questionType: 'MULTIPLE_CHOICE', questionText: 'Setting = where the story happens. 🏠🌳', options: ['True ✓', 'False ✗', 'I don\'t know'], difficulty: 1, questionNumber: 3 },
      { id: 'cw-m4', domain: 'CREATIVE_WRITING', skillCode: 'CW_DESCRIPTIVE', questionType: 'MULTIPLE_CHOICE', questionText: 'Which tells more? "Big red ball" or "Ball"?', options: ['Big red ball 🔴', 'Ball', 'Both the same'], difficulty: 1, questionNumber: 4 },
      { id: 'cw-m5', domain: 'CREATIVE_WRITING', skillCode: 'CW_IMAGINATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Can you make up a story? 📝✨', options: ['Yes!', 'Only true stories', 'No stories'], difficulty: 1, questionNumber: 5 },
    ],
    ALTERNATE: [
      { id: 'cw-a1', domain: 'CREATIVE_WRITING', skillCode: 'CW_STORY_ELEMENTS', questionType: 'MULTIPLE_CHOICE', questionText: 'Tell me what happens first in your day. 🌅', options: ['I told you!', 'Help me think'], difficulty: 1, questionNumber: 1 },
      { id: 'cw-a2', domain: 'CREATIVE_WRITING', skillCode: 'CW_CHARACTER', questionType: 'MULTIPLE_CHOICE', questionText: 'Who is your favorite person? 💕', options: ['I have one!', 'Help me think'], difficulty: 1, questionNumber: 2 },
      { id: 'cw-a3', domain: 'CREATIVE_WRITING', skillCode: 'CW_SETTING', questionType: 'MULTIPLE_CHOICE', questionText: 'Where is your favorite place? 🏠', options: ['I know one!', 'Help me think'], difficulty: 1, questionNumber: 3 },
      { id: 'cw-a4', domain: 'CREATIVE_WRITING', skillCode: 'CW_DESCRIPTIVE', questionType: 'MULTIPLE_CHOICE', questionText: 'What color is the sky? ☁️', options: ['I know!', 'Show me'], difficulty: 1, questionNumber: 4 },
      { id: 'cw-a5', domain: 'CREATIVE_WRITING', skillCode: 'CW_IMAGINATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Draw anything you want! 🎨', options: ['I drew it!', 'Help me draw'], difficulty: 1, questionNumber: 5 },
    ],
  },
  LIFE_SKILLS: {
    STANDARD: [
      { id: 'life-1', domain: 'LIFE_SKILLS', skillCode: 'LIFE_TIME', questionType: 'MULTIPLE_CHOICE', questionText: 'What time do we usually eat lunch?', options: ['Midnight', 'Around noon', '6am', '10pm'], difficulty: 1, questionNumber: 1 },
      { id: 'life-2', domain: 'LIFE_SKILLS', skillCode: 'LIFE_MONEY', questionType: 'MULTIPLE_CHOICE', questionText: 'If something costs $3 and you have $5, how much change?', options: ['$1', '$2', '$3', '$8'], difficulty: 2, questionNumber: 2 },
      { id: 'life-3', domain: 'LIFE_SKILLS', skillCode: 'LIFE_SAFETY', questionType: 'MULTIPLE_CHOICE', questionText: 'Before crossing the street, you should...', options: ['Run quickly', 'Look both ways', 'Close your eyes', 'Skip'], difficulty: 1, questionNumber: 3 },
      { id: 'life-4', domain: 'LIFE_SKILLS', skillCode: 'LIFE_HYGIENE', questionType: 'MULTIPLE_CHOICE', questionText: 'When should you wash your hands?', options: ['Never', 'Before eating', 'Only on Mondays', 'Once a year'], difficulty: 1, questionNumber: 4 },
      { id: 'life-5', domain: 'LIFE_SKILLS', skillCode: 'LIFE_ORGANIZATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Keeping things organized helps you...', options: ['Lose things', 'Find things easily', 'Make a mess', 'Forget things'], difficulty: 1, questionNumber: 5 },
    ],
    STANDARD_WITH_ACCOMMODATIONS: [
      { id: 'life-1', domain: 'LIFE_SKILLS', skillCode: 'LIFE_TIME', questionType: 'MULTIPLE_CHOICE', questionText: 'What time do we usually eat lunch?', options: ['Midnight', 'Around noon', '6am', '10pm'], difficulty: 1, questionNumber: 1 },
      { id: 'life-2', domain: 'LIFE_SKILLS', skillCode: 'LIFE_MONEY', questionType: 'MULTIPLE_CHOICE', questionText: 'If something costs $3 and you have $5, how much change?', options: ['$1', '$2', '$3', '$8'], difficulty: 2, questionNumber: 2 },
      { id: 'life-3', domain: 'LIFE_SKILLS', skillCode: 'LIFE_SAFETY', questionType: 'MULTIPLE_CHOICE', questionText: 'Before crossing the street, you should...', options: ['Run quickly', 'Look both ways', 'Close your eyes', 'Skip'], difficulty: 1, questionNumber: 3 },
      { id: 'life-4', domain: 'LIFE_SKILLS', skillCode: 'LIFE_HYGIENE', questionType: 'MULTIPLE_CHOICE', questionText: 'When should you wash your hands?', options: ['Never', 'Before eating', 'Only on Mondays', 'Once a year'], difficulty: 1, questionNumber: 4 },
      { id: 'life-5', domain: 'LIFE_SKILLS', skillCode: 'LIFE_ORGANIZATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Keeping things organized helps you...', options: ['Lose things', 'Find things easily', 'Make a mess', 'Forget things'], difficulty: 1, questionNumber: 5 },
    ],
    MODIFIED: [
      { id: 'life-m1', domain: 'LIFE_SKILLS', skillCode: 'LIFE_TIME', questionType: 'MULTIPLE_CHOICE', questionText: 'We eat lunch when? 🍽️🕛', options: ['In the middle of the day', 'At bedtime', 'When we wake up'], difficulty: 1, questionNumber: 1 },
      { id: 'life-m2', domain: 'LIFE_SKILLS', skillCode: 'LIFE_MONEY', questionType: 'MULTIPLE_CHOICE', questionText: 'You have $2. 💵💵 The toy costs $1. Can you buy it?', options: ['Yes! ✓', 'No, not enough', 'I don\'t know'], difficulty: 1, questionNumber: 2 },
      { id: 'life-m3', domain: 'LIFE_SKILLS', skillCode: 'LIFE_SAFETY', questionType: 'MULTIPLE_CHOICE', questionText: 'Before crossing the street... 🚶‍♂️🛣️', options: ['Look left and right 👀', 'Run fast 🏃', 'Close eyes 😵'], difficulty: 1, questionNumber: 3 },
      { id: 'life-m4', domain: 'LIFE_SKILLS', skillCode: 'LIFE_HYGIENE', questionType: 'MULTIPLE_CHOICE', questionText: 'Wash hands before eating? 🧼🍎', options: ['Yes! ✓', 'No', 'Sometimes'], difficulty: 1, questionNumber: 4 },
      { id: 'life-m5', domain: 'LIFE_SKILLS', skillCode: 'LIFE_ORGANIZATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Put toys away helps me... 🧸📦', options: ['Find them later', 'Lose them', 'Make a mess'], difficulty: 1, questionNumber: 5 },
    ],
    ALTERNATE: [
      { id: 'life-a1', domain: 'LIFE_SKILLS', skillCode: 'LIFE_TIME', questionType: 'MULTIPLE_CHOICE', questionText: 'Point to the clock. ⏰', options: ['I found it!', 'Show me'], difficulty: 1, questionNumber: 1 },
      { id: 'life-a2', domain: 'LIFE_SKILLS', skillCode: 'LIFE_MONEY', questionType: 'MULTIPLE_CHOICE', questionText: 'Find a coin. 🪙', options: ['I found one!', 'Help me find one'], difficulty: 1, questionNumber: 2 },
      { id: 'life-a3', domain: 'LIFE_SKILLS', skillCode: 'LIFE_SAFETY', questionType: 'MULTIPLE_CHOICE', questionText: 'Hold my hand to cross the street. 🤝', options: ['I can do it!', 'Remind me'], difficulty: 1, questionNumber: 3 },
      { id: 'life-a4', domain: 'LIFE_SKILLS', skillCode: 'LIFE_HYGIENE', questionType: 'MULTIPLE_CHOICE', questionText: 'Wash your hands with soap. 🧼', options: ['I did it!', 'Help me'], difficulty: 1, questionNumber: 4 },
      { id: 'life-a5', domain: 'LIFE_SKILLS', skillCode: 'LIFE_ORGANIZATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Put the toy in the box. 🧸📦', options: ['I did it!', 'Show me how'], difficulty: 1, questionNumber: 5 },
    ],
  },
};

/**
 * Get stub questions for a domain with fallback
 */
function getStubQuestions(domain: string, assessmentType: AssessmentType = 'STANDARD', count: number = 5) {
  const domainStubs = STUB_QUESTIONS[domain];
  if (!domainStubs) {
    // Return generic questions if domain not found
    return [];
  }
  const typeQuestions = domainStubs[assessmentType] || domainStubs['STANDARD'];
  return typeQuestions.slice(0, count);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as QuestionRequest;
    const { domain, count = 5, gradeBand = 'K_2', assessmentType = 'STANDARD', accommodations = [], gradeLevel } = body;

    // Get auth token from cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    // Get skill codes for domain
    const skillCodes = DOMAIN_SKILL_CODES[domain] || DOMAIN_SKILL_CODES['MATH'];
    const requestedSkillCodes = skillCodes.slice(0, Math.min(count, skillCodes.length));

    console.log(`[Baseline Questions] Generating ${domain} questions for ${assessmentType} assessment, grade band ${gradeBand}`);

    // Try to get AI-generated questions from AI orchestrator
    try {
      const response = await fetch(`${AI_ORCHESTRATOR_URL}/internal/ai/baseline/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': INTERNAL_API_KEY,
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          tenantId: 'default',
          learnerId: 'learner_assessment',
          agentType: 'BASELINE',
          payload: {
            gradeBand,
            domain,
            skillCodes: requestedSkillCodes,
            assessmentType,
            accommodations,
            gradeLevel,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Baseline Questions] AI generated ${data.questions?.length || 0} questions`);
        
        // Transform AI questions to expected format
        const questions = (data.questions || []).map((q: Record<string, unknown>, idx: number) => ({
          id: `${domain.toLowerCase()}-ai-${idx + 1}`,
          domain,
          skillCode: q.skillCode as string,
          questionType: q.questionType as string,
          questionText: q.questionText as string,
          options: q.options as string[],
          difficulty: 2,
          questionNumber: idx + 1,
          correctAnswer: q.correctAnswer as number,
        }));

        return NextResponse.json({ 
          questions,
          source: 'ai',
          assessmentType,
          gradeBand,
          generationId: data.generationId,
        });
      } else {
        console.log(`[Baseline Questions] AI orchestrator returned ${response.status}`);
      }
    } catch (error) {
      console.log('[Baseline Questions] AI orchestrator not available, using stub questions:', error);
    }

    // Fallback to stub questions based on assessment type
    const stubQuestions = getStubQuestions(domain, assessmentType, count);
    console.log(`[Baseline Questions] Using ${stubQuestions.length} stub questions for ${assessmentType}`);
    
    return NextResponse.json({ 
      questions: stubQuestions,
      source: 'stub',
      assessmentType,
      gradeBand,
    });

  } catch (error) {
    console.error('Question generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
