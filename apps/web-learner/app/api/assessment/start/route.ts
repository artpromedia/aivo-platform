import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ASSESSMENT_SVC_URL = process.env.ASSESSMENT_SVC_URL || 'http://localhost:3009';

export interface StartAssessmentRequest {
  type: 'baseline' | 'practice' | 'diagnostic' | 'quiz';
  learnerId: string | null;
  subjects: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StartAssessmentRequest;
    const { type, learnerId, subjects } = body;

    // Get auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    // Try to create session via assessment service
    try {
      const response = await fetch(`${ASSESSMENT_SVC_URL}/api/assessment/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          type,
          learnerId: learnerId || 'anonymous',
          subjects,
          startedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const session = await response.json();
        return NextResponse.json(session);
      }
    } catch {
      console.log('Assessment service offline, creating local session');
    }

    // Create local session as fallback
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate stub questions for each subject
    const questions = subjects.flatMap((subject) =>
      generateStubQuestions(subject)
    );

    const session = {
      id: sessionId,
      type,
      learnerId: learnerId || 'anonymous',
      subjects,
      startedAt: new Date().toISOString(),
      estimated_questions: questions.length,
      currentQuestionIndex: 0,
      questions,
      answers: [],
      status: 'in_progress',
    };

    return NextResponse.json(session);
  } catch (error) {
    console.error('Start assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to start assessment' },
      { status: 500 }
    );
  }
}

function generateStubQuestions(subject: string) {
  const stubs: Record<string, Array<{
    id: string;
    type: 'multiple-choice';
    subject: string;
    skillCode: string;
    difficulty: number;
    content: {
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    };
  }>> = {
    math: [
      {
        id: 'math-1',
        type: 'multiple-choice',
        subject: 'math',
        skillCode: 'MATH_NUMBER_SENSE',
        difficulty: 2,
        content: {
          question: 'What is 7 + 5?',
          options: ['10', '11', '12', '13'],
          correctAnswer: 2,
          explanation: '7 + 5 = 12',
        },
      },
      {
        id: 'math-2',
        type: 'multiple-choice',
        subject: 'math',
        skillCode: 'MATH_OPERATIONS',
        difficulty: 2,
        content: {
          question: 'What is 15 - 8?',
          options: ['5', '6', '7', '8'],
          correctAnswer: 2,
          explanation: '15 - 8 = 7',
        },
      },
    ],
    reading: [
      {
        id: 'reading-1',
        type: 'multiple-choice',
        subject: 'reading',
        skillCode: 'ELA_VOCABULARY',
        difficulty: 2,
        content: {
          question: 'What does "happy" mean?',
          options: ['Sad', 'Joyful', 'Angry', 'Tired'],
          correctAnswer: 1,
          explanation: '"Happy" means feeling joy or pleasure',
        },
      },
    ],
    science: [
      {
        id: 'science-1',
        type: 'multiple-choice',
        subject: 'science',
        skillCode: 'SCI_LIFE',
        difficulty: 2,
        content: {
          question: 'What do plants need to grow?',
          options: ['Only water', 'Sunlight, water, and air', 'Only sunlight', 'Only soil'],
          correctAnswer: 1,
          explanation: 'Plants need sunlight, water, and air to grow',
        },
      },
    ],
    writing: [
      {
        id: 'writing-1',
        type: 'multiple-choice',
        subject: 'writing',
        skillCode: 'WRITING_GRAMMAR',
        difficulty: 2,
        content: {
          question: 'Which punctuation ends a question?',
          options: ['.', '!', '?', ','],
          correctAnswer: 2,
          explanation: 'Questions end with a question mark (?)',
        },
      },
    ],
  };

  return stubs[subject] || [];
}
