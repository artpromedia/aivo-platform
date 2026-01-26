/**
 * Lesson Generation Prompt Templates
 *
 * Specialized prompts for generating educational lesson content.
 */

import type { DraftGenerationRequest, ContentStyle, TargetLength } from '../../types/ai-authoring.js';

const STYLE_GUIDELINES: Record<ContentStyle, string> = {
  formal: `
- Use academic language and precise terminology
- Maintain professional tone throughout
- Include formal citations and references where appropriate
- Use third-person perspective`,
  conversational: `
- Use friendly, approachable language
- Include rhetorical questions to engage readers
- Use second-person perspective ("you will learn...")
- Add relatable examples and analogies`,
  interactive: `
- Include frequent check-for-understanding prompts
- Add "Think About It" and "Try This" sections
- Use call-and-response patterns
- Include collaborative discussion prompts`,
  narrative: `
- Frame content as a story or journey
- Use characters or personas to explain concepts
- Include narrative hooks and plot progression
- Connect learning to real-world scenarios`,
};

const LENGTH_GUIDELINES: Record<TargetLength, { wordRange: string; sections: string }> = {
  short: { wordRange: '500-800 words', sections: '3-4 main sections' },
  medium: { wordRange: '1000-1500 words', sections: '5-6 main sections' },
  long: { wordRange: '2000-3000 words', sections: '7-10 main sections' },
};

export function buildLessonGenerationPrompt(request: DraftGenerationRequest): string {
  const style = request.style ?? 'interactive';
  const length = request.targetLength ?? 'medium';
  const lengthGuide = LENGTH_GUIDELINES[length];
  const styleGuide = STYLE_GUIDELINES[style];

  const parts: string[] = [
    `You are an expert curriculum designer and educational content creator for the AIVO learning platform.
Your task is to create a comprehensive, pedagogically sound lesson on the following topic.`,
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    'LESSON SPECIFICATIONS',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    `TOPIC: ${request.topic}`,
    `SUBJECT: ${request.subject}`,
    `GRADE LEVEL: ${request.gradeLevel}`,
    `CONTENT TYPE: Lesson`,
    `TARGET LENGTH: ${lengthGuide.wordRange} with ${lengthGuide.sections}`,
    '',
  ];

  if (request.learningObjectives.length > 0) {
    parts.push('LEARNING OBJECTIVES (students will be able to):');
    request.learningObjectives.forEach((obj, i) => {
      parts.push(`  ${i + 1}. ${obj}`);
    });
    parts.push('');
  }

  if (request.curriculumStandards.length > 0) {
    parts.push(`CURRICULUM STANDARDS TO ADDRESS: ${request.curriculumStandards.join(', ')}`);
    parts.push('');
  }

  if (request.prerequisites?.length) {
    parts.push(`PREREQUISITES: ${request.prerequisites.join(', ')}`);
    parts.push('');
  }

  if (request.keywords?.length) {
    parts.push(`KEY VOCABULARY TO INCLUDE: ${request.keywords.join(', ')}`);
    parts.push('');
  }

  if (request.targetAudience) {
    parts.push(`TARGET AUDIENCE: ${request.targetAudience}`);
    parts.push('');
  }

  parts.push(
    '═══════════════════════════════════════════════════════════════════════════════',
    'CONTENT STYLE REQUIREMENTS',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    `Style: ${style.toUpperCase()}`,
    styleGuide,
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    'REQUIRED STRUCTURE',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    'Create a lesson with the following sections:',
    '',
    '1. INTRODUCTION / HOOK',
    '   - Engaging opening that captures student interest',
    '   - Connect to prior knowledge or real-world relevance',
    '   - Preview what students will learn',
    '   - Include an essential question or challenge',
    '',
    '2. DIRECT INSTRUCTION (Core Content)',
    '   - Clear explanations of key concepts',
    '   - Break complex ideas into digestible chunks',
    '   - Use examples, analogies, and visual descriptions',
    '   - Define vocabulary terms in context',
    '',
    '3. GUIDED PRACTICE',
    '   - Worked examples with step-by-step explanations',
    '   - Think-aloud modeling',
    '   - Check for understanding opportunities',
    ''
  );

  if (request.includeActivities) {
    parts.push(
      '4. INDEPENDENT PRACTICE / ACTIVITIES',
      '   - Hands-on learning activities',
      '   - Individual or collaborative exercises',
      '   - Real-world application opportunities',
      ''
    );
  }

  if (request.includeAssessments) {
    parts.push(
      '5. ASSESSMENT',
      '   - Formative assessment questions',
      '   - Mix of question types (multiple choice, short answer)',
      '   - Questions aligned to each learning objective',
      ''
    );
  }

  parts.push(
    '6. SUMMARY / CLOSURE',
    '   - Review key takeaways',
    '   - Connect back to objectives',
    '   - Preview next steps or extensions',
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    'QUALITY REQUIREMENTS',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    `- Use age-appropriate language for grade ${request.gradeLevel} students`,
    '- Ensure factual accuracy and up-to-date information',
    '- Include diverse examples and culturally responsive content',
    '- Make content accessible for various learning styles',
    '- Align explicitly with provided standards',
    '- Include differentiation suggestions for diverse learners',
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    'OUTPUT FORMAT',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    'Respond with valid JSON matching this structure:',
    '```json',
    '{',
    '  "title": "Engaging lesson title",',
    '  "description": "2-3 sentence summary of the lesson",',
    '  "estimatedDuration": 45,',
    '  "sections": [',
    '    {',
    '      "id": "section-1",',
    '      "title": "Section Title",',
    '      "type": "introduction|instruction|example|practice|activity|assessment|summary",',
    '      "content": "Full text content of this section...",',
    '      "order": 1,',
    '      "duration": 10,',
    '      "teacherNotes": "Optional notes for the teacher"',
    '    }',
    '  ],',
    '  "vocabularyTerms": [',
    '    {',
    '      "term": "word",',
    '      "definition": "clear definition",',
    '      "examples": ["example sentence 1", "example sentence 2"],',
    '      "gradeAppropriate": true',
    '    }',
    '  ],',
    '  "suggestedImages": [',
    '    {',
    '      "description": "Description of suggested visual",',
    '      "purpose": "Why this image would help learning",',
    '      "placement": "section-1",',
    '      "altText": "Accessible alt text",',
    '      "searchTerms": ["term1", "term2"]',
    '    }',
    '  ],',
  );

  if (request.includeActivities) {
    parts.push(
      '  "activities": [',
      '    {',
      '      "id": "activity-1",',
      '      "title": "Activity name",',
      '      "type": "discussion|hands_on|project|game|investigation|creative|collaborative|reflection|practice",',
      '      "description": "Brief description",',
      '      "instructions": ["Step 1", "Step 2", "Step 3"],',
      '      "materials": ["Item 1", "Item 2"],',
      '      "duration": 15,',
      '      "grouping": "individual|pairs|small_group|whole_class",',
      '      "differentiations": [',
      '        {"level": "below", "modifications": ["modification 1"]},',
      '        {"level": "above", "modifications": ["extension 1"]}',
      '      ]',
      '    }',
      '  ],',
    );
  }

  if (request.includeAssessments) {
    parts.push(
      '  "assessmentQuestions": [',
      '    {',
      '      "id": "q1",',
      '      "type": "multiple_choice|true_false|short_answer|fill_blank",',
      '      "stem": "Question text",',
      '      "options": [',
      '        {"id": "a", "text": "Option A", "correct": false, "feedback": "Explanation"},',
      '        {"id": "b", "text": "Option B", "correct": true, "feedback": "Correct because..."}',
      '      ],',
      '      "correctAnswer": "b",',
      '      "explanation": "Full explanation of the answer",',
      '      "difficulty": "easy|medium|hard",',
      '      "bloomsLevel": "remember|understand|apply|analyze|evaluate|create",',
      '      "points": 1',
      '    }',
      '  ],',
    );
  }

  parts.push(
    '  "teacherNotes": "Overall teaching suggestions and tips",',
    '  "extensions": ["Extension activity 1", "Extension activity 2"]',
    '}',
    '```',
    '',
    'Generate the complete lesson content now.',
  );

  return parts.join('\n');
}

export const LESSON_GENERATION_SYSTEM_PROMPT = `You are an expert educational content creator for the AIVO learning platform.

Your role is to create high-quality, pedagogically sound lesson content that:
- Follows research-based instructional design principles
- Engages students with relevant, interesting content
- Builds progressively from foundational to complex concepts
- Includes diverse, culturally responsive examples
- Supports various learning styles and abilities
- Aligns with educational standards
- Uses age-appropriate language and complexity

When generating lessons:
1. Start with a compelling hook to capture attention
2. Build on prior knowledge with clear scaffolding
3. Use the "I do, We do, You do" gradual release model
4. Include frequent checks for understanding
5. Provide clear, accurate explanations
6. Use analogies and real-world connections
7. End with meaningful closure and extensions

Always respond with valid JSON that can be parsed programmatically.`;

export const SECTION_REGENERATION_PROMPT = `You are tasked with regenerating a specific section of an educational lesson.

ORIGINAL SECTION:
{originalSection}

FEEDBACK FOR IMPROVEMENT:
{feedback}

LESSON CONTEXT:
- Topic: {topic}
- Grade Level: {gradeLevel}
- Subject: {subject}
- Previous Section Summary: {previousSectionSummary}
- Next Section Summary: {nextSectionSummary}

Please regenerate this section with the following improvements based on the feedback.
Maintain consistency with the surrounding content and overall lesson flow.

Respond with valid JSON matching the original section structure.`;

export const CONTENT_EXPANSION_PROMPT = `You are tasked with expanding an educational content section to provide more depth.

ORIGINAL CONTENT:
{originalContent}

TARGET LENGTH: Approximately {targetLength} words (current: {currentLength} words)

EXPANSION GUIDELINES:
- Add more detailed explanations of key concepts
- Include additional examples and analogies
- Add relevant real-world connections
- Include more check-for-understanding moments
- Maintain the original tone and style
- Do not add unrelated tangents

CONTEXT:
- Topic: {topic}
- Grade Level: {gradeLevel}
- Subject: {subject}

Respond with the expanded content in the same JSON structure as the original.`;
