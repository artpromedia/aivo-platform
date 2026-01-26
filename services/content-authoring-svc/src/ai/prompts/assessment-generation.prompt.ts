/**
 * Assessment Generation Prompt Templates
 *
 * Prompts for generating educational assessments, quizzes, and rubrics.
 */

import type {
  QuestionType,
  BloomsLevel,
  GenerateAssessmentRequest,
} from '../../types/ai-authoring.js';

const QUESTION_TYPE_GUIDELINES: Record<QuestionType, string> = {
  multiple_choice: `
Create a clear question stem with 4 options (A-D).
- Only one option should be correct
- Distractors should be plausible but clearly incorrect
- Avoid "all of the above" or "none of the above"
- Keep options roughly similar in length`,
  multi_select: `
Create a question where multiple options are correct.
- Clearly state "Select ALL that apply"
- Include 4-6 options with 2-4 correct answers
- Each correct answer should be independently valid`,
  true_false: `
Create a clear statement that is definitively true or false.
- Avoid trick questions or ambiguous wording
- Include explanation for why it's true/false`,
  fill_blank: `
Create a sentence with a key term removed.
- The blank should test understanding, not just recall
- Provide context clues in the sentence
- Specify if case-sensitivity matters`,
  short_answer: `
Create a question requiring a brief written response.
- Provide clear expectations for answer length (1-3 sentences)
- Include sample answers or key points to look for
- Make criteria for correctness explicit`,
  essay: `
Create a prompt for an extended written response.
- Include clear directions and expectations
- Specify the scope and focus
- Provide a scoring rubric with criteria`,
  matching: `
Create two columns of related items to match.
- Include 4-8 items per column
- Items should be clearly related but distinct
- Can have unequal numbers in columns (extra distractors)`,
  ordering: `
Create a sequence that must be arranged correctly.
- Include 4-6 items
- The correct order should be logical and unambiguous
- Can be chronological, procedural, or hierarchical`,
  numeric: `
Create a mathematical or quantitative problem.
- State units and precision expected
- Include acceptable tolerance if needed
- Show work requirements if applicable`,
  drag_drop: `
Create an interactive categorization or arrangement task.
- Clear categories or drop zones
- 4-8 items to categorize
- Unambiguous correct placements`,
};

const BLOOMS_LEVEL_GUIDELINES: Record<BloomsLevel, string> = {
  remember: 'Recall facts and basic concepts. Verbs: define, list, name, recall, identify.',
  understand: 'Explain ideas or concepts. Verbs: describe, explain, summarize, interpret.',
  apply: 'Use information in new situations. Verbs: solve, demonstrate, apply, use.',
  analyze: 'Draw connections among ideas. Verbs: analyze, compare, contrast, examine.',
  evaluate: 'Justify a decision or action. Verbs: evaluate, judge, critique, assess.',
  create: 'Produce original work. Verbs: design, create, develop, formulate.',
};

export function buildAssessmentGenerationPrompt(
  content: string,
  request: GenerateAssessmentRequest,
  learningObjectives: string[]
): string {
  const questionTypeInstructions = request.questionTypes
    .map((type) => `${type.toUpperCase()}:\n${QUESTION_TYPE_GUIDELINES[type]}`)
    .join('\n\n');

  const bloomsInstructions = request.bloomsLevels
    ? request.bloomsLevels
        .map((level) => `${level.toUpperCase()}: ${BLOOMS_LEVEL_GUIDELINES[level]}`)
        .join('\n')
    : Object.entries(BLOOMS_LEVEL_GUIDELINES)
        .map(([level, desc]) => `${level.toUpperCase()}: ${desc}`)
        .join('\n');

  const parts: string[] = [
    `You are an expert assessment designer creating valid, reliable educational assessments.`,
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    'ASSESSMENT REQUIREMENTS',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    `NUMBER OF QUESTIONS: ${request.questionCount}`,
    `QUESTION TYPES TO USE: ${request.questionTypes.join(', ')}`,
    `DIFFICULTY: ${request.difficulty ?? 'mixed'}`,
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    'CONTENT TO ASSESS',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    content,
    '',
  ];

  if (learningObjectives.length > 0) {
    parts.push(
      '═══════════════════════════════════════════════════════════════════════════════',
      'LEARNING OBJECTIVES TO ASSESS',
      '═══════════════════════════════════════════════════════════════════════════════',
      ''
    );
    learningObjectives.forEach((obj, i) => {
      parts.push(`${i + 1}. ${obj}`);
    });
    parts.push('');
  }

  parts.push(
    '═══════════════════════════════════════════════════════════════════════════════',
    'QUESTION TYPE GUIDELINES',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    questionTypeInstructions,
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    "BLOOM'S TAXONOMY LEVELS",
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    bloomsInstructions,
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    'QUALITY REQUIREMENTS',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    '1. VALIDITY: Questions should measure what they claim to measure',
    '2. RELIABILITY: Clear, unambiguous wording that yields consistent results',
    '3. FAIRNESS: Avoid cultural bias, trick questions, or irrelevant difficulty',
    '4. ALIGNMENT: Each question should align with a specific learning objective',
    '5. PROGRESSION: Arrange from easier to harder questions',
    '6. COVERAGE: Cover all major concepts from the content',
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    'OUTPUT FORMAT',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    'Respond with valid JSON:',
    '```json',
    '{',
    '  "title": "Assessment title based on content",',
    '  "description": "Brief description of what this assessment covers",',
    '  "instructions": "Instructions for students taking the assessment",',
    '  "questions": [',
    '    {',
    '      "id": "q1",',
    '      "type": "multiple_choice",',
    '      "stem": "Clear question text",',
    '      "options": [',
    '        {"id": "a", "text": "Option A", "correct": false, "feedback": "Why wrong"},',
    '        {"id": "b", "text": "Option B", "correct": true, "feedback": "Why correct"},',
    '        {"id": "c", "text": "Option C", "correct": false, "feedback": "Why wrong"},',
    '        {"id": "d", "text": "Option D", "correct": false, "feedback": "Why wrong"}',
    '      ],',
    '      "correctAnswer": "b",',
    '      "explanation": "Complete explanation of the correct answer",',
    '      "hints": ["Hint 1 if needed", "Hint 2 if needed"],',
    '      "difficulty": "easy|medium|hard",',
    '      "bloomsLevel": "remember|understand|apply|analyze|evaluate|create",',
    '      "points": 1,',
    '      "standardId": "Optional standard code",',
    '      "tags": ["topic1", "concept1"]',
    '    }',
    '  ],',
    '  "totalPoints": 10,',
    '  "estimatedDuration": 15,',
    '  "passingScore": 70',
    '}',
    '```',
    '',
    'Generate the assessment now.',
  );

  return parts.join('\n');
}

export function buildRubricGenerationPrompt(
  assessmentType: string,
  criteria: string[],
  maxPoints: number
): string {
  return `You are an expert in educational assessment design.

Create a comprehensive scoring rubric for the following:

ASSESSMENT TYPE: ${assessmentType}
MAXIMUM POINTS: ${maxPoints}
CRITERIA TO EVALUATE: ${criteria.join(', ')}

RUBRIC REQUIREMENTS:
1. Clear, observable criteria for each performance level
2. Consistent point distribution across levels
3. Specific language that minimizes scorer subjectivity
4. Progressive descriptors from lowest to highest performance
5. Actionable feedback potential at each level

Create a rubric with 4 performance levels:
- Level 4 (Exceeds): ${Math.round(maxPoints * 0.25)} points
- Level 3 (Meets): ${Math.round(maxPoints * 0.20)} points
- Level 2 (Approaching): ${Math.round(maxPoints * 0.15)} points
- Level 1 (Beginning): ${Math.round(maxPoints * 0.10)} points

Respond with valid JSON:
\`\`\`json
{
  "title": "Rubric title",
  "criteria": [
    {
      "name": "Criterion name",
      "description": "What this criterion measures",
      "maxPoints": 4,
      "levels": [
        {"score": 4, "label": "Exceeds", "description": "Specific description"},
        {"score": 3, "label": "Meets", "description": "Specific description"},
        {"score": 2, "label": "Approaching", "description": "Specific description"},
        {"score": 1, "label": "Beginning", "description": "Specific description"}
      ]
    }
  ],
  "totalPoints": ${maxPoints}
}
\`\`\``;
}

export const ASSESSMENT_SYSTEM_PROMPT = `You are an expert educational assessment designer.

Your assessments should:
- Be valid (measure what they claim to measure)
- Be reliable (consistent results across similar students)
- Be fair (no cultural bias or trick questions)
- Align with learning objectives
- Progress appropriately in difficulty
- Provide meaningful feedback opportunities

Follow best practices in assessment design:
- Clear, unambiguous question stems
- Plausible distractors that reveal misconceptions
- Explanations that support learning
- Appropriate cognitive demand for the grade level
- Mix of question types when specified

Always respond with valid JSON that can be parsed programmatically.`;
