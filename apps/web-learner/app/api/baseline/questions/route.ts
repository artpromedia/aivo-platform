import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const BASELINE_SVC_URL = process.env.BASELINE_SVC_URL || 'http://localhost:3011';
const AI_ORCHESTRATOR_URL = process.env.AI_ORCHESTRATOR_URL || 'http://localhost:3020';

interface QuestionRequest {
  domain: string;
  count: number;
}

// Stub questions for fallback/demo
const STUB_QUESTIONS: Record<string, Array<{
  id: string;
  domain: string;
  skillCode: string;
  questionType: 'MULTIPLE_CHOICE';
  questionText: string;
  options: string[];
  difficulty: number;
  questionNumber: number;
}>> = {
  MATH: [
    { id: 'math-1', domain: 'MATH', skillCode: 'MATH_NUMBER_SENSE', questionType: 'MULTIPLE_CHOICE', questionText: 'What is 7 + 5?', options: ['10', '11', '12', '13'], difficulty: 2, questionNumber: 1 },
    { id: 'math-2', domain: 'MATH', skillCode: 'MATH_OPERATIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'What is 15 - 8?', options: ['5', '6', '7', '8'], difficulty: 2, questionNumber: 2 },
    { id: 'math-3', domain: 'MATH', skillCode: 'MATH_FRACTIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'What is half of 10?', options: ['3', '4', '5', '6'], difficulty: 2, questionNumber: 3 },
    { id: 'math-4', domain: 'MATH', skillCode: 'MATH_GEOMETRY', questionType: 'MULTIPLE_CHOICE', questionText: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], difficulty: 1, questionNumber: 4 },
    { id: 'math-5', domain: 'MATH', skillCode: 'MATH_PROBLEM_SOLVING', questionType: 'MULTIPLE_CHOICE', questionText: 'If you have 3 apples and get 4 more, how many do you have?', options: ['5', '6', '7', '8'], difficulty: 2, questionNumber: 5 },
  ],
  ELA: [
    { id: 'ela-1', domain: 'ELA', skillCode: 'ELA_PHONEMIC_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word rhymes with "cat"?', options: ['Dog', 'Hat', 'Bird', 'Fish'], difficulty: 1, questionNumber: 1 },
    { id: 'ela-2', domain: 'ELA', skillCode: 'ELA_VOCABULARY', questionType: 'MULTIPLE_CHOICE', questionText: 'What does "happy" mean?', options: ['Sad', 'Joyful', 'Angry', 'Tired'], difficulty: 1, questionNumber: 2 },
    { id: 'ela-3', domain: 'ELA', skillCode: 'ELA_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'Which sentence is correct?', options: ['The dog run fast.', 'The dog runs fast.', 'The dog running fast.', 'The dog runned fast.'], difficulty: 2, questionNumber: 3 },
    { id: 'ela-4', domain: 'ELA', skillCode: 'ELA_COMPREHENSION', questionType: 'MULTIPLE_CHOICE', questionText: 'In "The Three Little Pigs", what did the wolf try to do?', options: ['Help build houses', 'Blow the houses down', 'Give the pigs food', 'Teach the pigs to dance'], difficulty: 2, questionNumber: 4 },
    { id: 'ela-5', domain: 'ELA', skillCode: 'ELA_WRITING', questionType: 'MULTIPLE_CHOICE', questionText: 'Which punctuation ends a question?', options: ['.', '!', '?', ','], difficulty: 1, questionNumber: 5 },
  ],
  SPEECH: [
    { id: 'speech-1', domain: 'SPEECH', skillCode: 'SPEECH_ARTICULATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word starts with the same sound as "sun"?', options: ['Ball', 'Cat', 'Soap', 'Tree'], difficulty: 1, questionNumber: 1 },
    { id: 'speech-2', domain: 'SPEECH', skillCode: 'SPEECH_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'When speaking to a group, you should...', options: ['Whisper quietly', 'Speak clearly', 'Talk very fast', 'Look at the floor'], difficulty: 2, questionNumber: 2 },
    { id: 'speech-3', domain: 'SPEECH', skillCode: 'SPEECH_VOICE', questionType: 'MULTIPLE_CHOICE', questionText: 'How should you speak when someone is sleeping nearby?', options: ['Very loudly', 'In a normal voice', 'Quietly', 'Not at all'], difficulty: 1, questionNumber: 3 },
    { id: 'speech-4', domain: 'SPEECH', skillCode: 'SPEECH_LANGUAGE', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word means the same as "big"?', options: ['Small', 'Tiny', 'Large', 'Short'], difficulty: 1, questionNumber: 4 },
    { id: 'speech-5', domain: 'SPEECH', skillCode: 'SPEECH_PRAGMATICS', questionType: 'MULTIPLE_CHOICE', questionText: 'When meeting someone new, you should...', options: ['Look away', 'Say hello', 'Stay silent', 'Run away'], difficulty: 1, questionNumber: 5 },
  ],
  SEL: [
    { id: 'sel-1', domain: 'SEL', skillCode: 'SEL_SELF_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'When I feel angry, I...', options: ['Yell at others', 'Take deep breaths', 'Break things', 'Ignore it'], difficulty: 2, questionNumber: 1 },
    { id: 'sel-2', domain: 'SEL', skillCode: 'SEL_SELF_MANAGEMENT', questionType: 'MULTIPLE_CHOICE', questionText: 'If homework is hard, I should...', options: ['Give up', 'Ask for help', 'Throw it away', 'Cry'], difficulty: 2, questionNumber: 2 },
    { id: 'sel-3', domain: 'SEL', skillCode: 'SEL_SOCIAL_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'If a friend looks sad, I could...', options: ['Laugh at them', 'Ask if they are okay', 'Walk away', 'Tell others'], difficulty: 1, questionNumber: 3 },
    { id: 'sel-4', domain: 'SEL', skillCode: 'SEL_RELATIONSHIPS', questionType: 'MULTIPLE_CHOICE', questionText: 'Good friends...', options: ['Share and take turns', 'Always fight', 'Ignore each other', 'Keep secrets'], difficulty: 1, questionNumber: 4 },
    { id: 'sel-5', domain: 'SEL', skillCode: 'SEL_DECISIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'Before making a choice, I should...', options: ['Do it right away', 'Think about what might happen', 'Ask a stranger', 'Flip a coin'], difficulty: 2, questionNumber: 5 },
  ],
  SPELLING: [
    { id: 'spell-1', domain: 'SPELLING', skillCode: 'SPELL_PATTERNS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which spelling is correct?', options: ['freind', 'friend', 'frend', 'frind'], difficulty: 2, questionNumber: 1 },
    { id: 'spell-2', domain: 'SPELLING', skillCode: 'SPELL_PHONICS', questionType: 'MULTIPLE_CHOICE', questionText: 'How do you spell the word for a large body of water?', options: ['oshun', 'ocen', 'ocean', 'oshen'], difficulty: 2, questionNumber: 2 },
    { id: 'spell-3', domain: 'SPELLING', skillCode: 'SPELL_RULES', questionType: 'MULTIPLE_CHOICE', questionText: 'Which is the correct plural of "cat"?', options: ['cates', 'cats', 'caties', "cat's"], difficulty: 1, questionNumber: 3 },
    { id: 'spell-4', domain: 'SPELLING', skillCode: 'SPELL_SIGHT_WORDS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word is spelled correctly?', options: ['becuz', 'becuase', 'because', 'becouse'], difficulty: 2, questionNumber: 4 },
    { id: 'spell-5', domain: 'SPELLING', skillCode: 'SPELL_COMPOUND', questionType: 'MULTIPLE_CHOICE', questionText: 'How do you spell "sun" + "flower"?', options: ['sunflower', 'sun flower', 'sunflawer', 'son flower'], difficulty: 2, questionNumber: 5 },
  ],
  CREATIVE_WRITING: [
    { id: 'cw-1', domain: 'CREATIVE_WRITING', skillCode: 'CW_STORY_ELEMENTS', questionType: 'MULTIPLE_CHOICE', questionText: 'Every story needs a...', options: ['Beginning, middle, and end', 'Picture', 'Long title', 'Rhyme'], difficulty: 1, questionNumber: 1 },
    { id: 'cw-2', domain: 'CREATIVE_WRITING', skillCode: 'CW_CHARACTER', questionType: 'MULTIPLE_CHOICE', questionText: 'A character in a story is...', options: ['The setting', 'A person or animal', 'The ending', 'The title'], difficulty: 1, questionNumber: 2 },
    { id: 'cw-3', domain: 'CREATIVE_WRITING', skillCode: 'CW_SETTING', questionType: 'MULTIPLE_CHOICE', questionText: 'The setting tells us...', options: ['Who is in the story', 'Where and when', 'What happens last', 'The moral'], difficulty: 1, questionNumber: 3 },
    { id: 'cw-4', domain: 'CREATIVE_WRITING', skillCode: 'CW_DESCRIPTIVE', questionType: 'MULTIPLE_CHOICE', questionText: 'Which sentence is more descriptive?', options: ['The dog ran.', 'The fluffy brown dog ran quickly.', 'Dog.', 'Running.'], difficulty: 2, questionNumber: 4 },
    { id: 'cw-5', domain: 'CREATIVE_WRITING', skillCode: 'CW_IMAGINATION', questionType: 'MULTIPLE_CHOICE', questionText: 'In creative writing, you can...', options: ['Only write facts', 'Make up stories', 'Copy from books', 'Only use real people'], difficulty: 1, questionNumber: 5 },
  ],
  LIFE_SKILLS: [
    { id: 'life-1', domain: 'LIFE_SKILLS', skillCode: 'LIFE_TIME', questionType: 'MULTIPLE_CHOICE', questionText: 'What time do we usually eat lunch?', options: ['Midnight', 'Around noon', '6am', '10pm'], difficulty: 1, questionNumber: 1 },
    { id: 'life-2', domain: 'LIFE_SKILLS', skillCode: 'LIFE_MONEY', questionType: 'MULTIPLE_CHOICE', questionText: 'If something costs $3 and you have $5, how much change do you get?', options: ['$1', '$2', '$3', '$8'], difficulty: 2, questionNumber: 2 },
    { id: 'life-3', domain: 'LIFE_SKILLS', skillCode: 'LIFE_SAFETY', questionType: 'MULTIPLE_CHOICE', questionText: 'Before crossing the street, you should...', options: ['Run quickly', 'Look both ways', 'Close your eyes', 'Skip'], difficulty: 1, questionNumber: 3 },
    { id: 'life-4', domain: 'LIFE_SKILLS', skillCode: 'LIFE_HYGIENE', questionType: 'MULTIPLE_CHOICE', questionText: 'When should you wash your hands?', options: ['Never', 'Before eating', 'Only on Mondays', 'Once a year'], difficulty: 1, questionNumber: 4 },
    { id: 'life-5', domain: 'LIFE_SKILLS', skillCode: 'LIFE_ORGANIZATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Keeping your things organized helps you...', options: ['Lose things', 'Find things easily', 'Make a mess', 'Forget things'], difficulty: 1, questionNumber: 5 },
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as QuestionRequest;
    const { domain, count = 5 } = body;

    // Get auth token from cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    // Try to get AI-generated questions from baseline-svc
    try {
      const response = await fetch(`${AI_ORCHESTRATOR_URL}/internal/ai/baseline/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          domain,
          count,
          gradeBand: 'K5', // Default for now, should come from learner profile
          difficulty: 3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ questions: data.questions });
      }
    } catch (error) {
      console.log('AI orchestrator not available, using stub questions');
    }

    // Fallback to stub questions
    const stubQuestions = STUB_QUESTIONS[domain] || [];
    return NextResponse.json({ 
      questions: stubQuestions.slice(0, count),
      source: 'stub'
    });

  } catch (error) {
    console.error('Question generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
