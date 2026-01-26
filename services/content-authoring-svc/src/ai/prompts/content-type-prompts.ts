/**
 * Content Type Specific Prompt Templates
 *
 * Specialized prompts for generating different types of educational content.
 */

import type { DraftGenerationRequest, ContentType } from '../../types/ai-authoring.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT TYPE CONFIGURATIONS
// ══════════════════════════════════════════════════════════════════════════════

interface ContentTypeConfig {
  description: string;
  structure: string;
  requirements: string[];
  outputFormat: string;
}

const CONTENT_TYPE_CONFIGS: Record<ContentType, ContentTypeConfig> = {
  lesson: {
    description: 'A comprehensive instructional lesson with learning objectives, content, and practice',
    structure: `
- Introduction/Hook
- Direct Instruction (core content)
- Guided Practice
- Independent Practice
- Summary/Closure`,
    requirements: [
      'Clear learning objectives',
      'Engaging introduction',
      'Well-scaffolded instruction',
      'Practice opportunities',
      'Assessment alignment',
    ],
    outputFormat: 'sections with content, activities, and assessments',
  },

  assessment: {
    description: 'A formative or summative assessment with varied question types',
    structure: `
- Instructions
- Multiple question types
- Clear scoring criteria
- Answer key with explanations`,
    requirements: [
      'Aligned to learning objectives',
      'Varied question types',
      'Clear rubrics for open-ended questions',
      'Appropriate difficulty progression',
      'Feedback for each answer',
    ],
    outputFormat: 'questions with answers, explanations, and rubrics',
  },

  activity: {
    description: 'A hands-on learning activity or project',
    structure: `
- Purpose and objectives
- Materials needed
- Step-by-step instructions
- Extension options
- Reflection prompts`,
    requirements: [
      'Clear learning purpose',
      'Detailed materials list',
      'Step-by-step instructions',
      'Differentiation options',
      'Assessment criteria',
    ],
    outputFormat: 'structured activity with materials, steps, and variations',
  },

  'reading-passage': {
    description: 'An informational or literary text for reading comprehension',
    structure: `
- Title and introduction
- Main content with paragraphs
- Vocabulary highlights
- Comprehension questions`,
    requirements: [
      'Grade-appropriate vocabulary',
      'Engaging topic',
      'Clear paragraph structure',
      'Vocabulary in context',
      'Comprehension questions',
    ],
    outputFormat: 'passage text with vocabulary and questions',
  },

  'video-script': {
    description: 'A script for an educational video',
    structure: `
- Hook/Opening
- Main content segments
- Visual/animation cues
- Engagement prompts
- Closing/Call to action`,
    requirements: [
      'Conversational tone',
      'Visual cues and descriptions',
      'Timing annotations',
      'Engagement pauses',
      'Key takeaways',
    ],
    outputFormat: 'script with visual cues and timing',
  },

  'interactive-exercise': {
    description: 'An interactive digital learning exercise',
    structure: `
- Introduction and instructions
- Interactive elements
- Immediate feedback
- Progression levels
- Summary`,
    requirements: [
      'Clear interaction instructions',
      'Multiple interaction types',
      'Immediate feedback',
      'Hint system',
      'Progress indicators',
    ],
    outputFormat: 'exercise specification with interactions and feedback',
  },

  'study-guide': {
    description: 'A comprehensive study guide for review',
    structure: `
- Topic overview
- Key concepts
- Important vocabulary
- Practice questions
- Study tips`,
    requirements: [
      'Organized by topic',
      'Key concept summaries',
      'Vocabulary review',
      'Practice questions',
      'Study strategies',
    ],
    outputFormat: 'organized guide with summaries and practice',
  },

  'flashcard-set': {
    description: 'A set of flashcards for memorization and review',
    structure: `
- Term/concept on front
- Definition/explanation on back
- Example usage
- Related terms`,
    requirements: [
      'Clear, concise terms',
      'Accurate definitions',
      'Helpful examples',
      'Logical grouping',
      'Appropriate difficulty',
    ],
    outputFormat: 'flashcard array with terms, definitions, and examples',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT TYPE SPECIFIC PROMPTS
// ══════════════════════════════════════════════════════════════════════════════

export function getContentTypePrompt(request: DraftGenerationRequest): string {
  const config = CONTENT_TYPE_CONFIGS[request.contentType];

  return `You are an expert educational content creator specializing in ${request.contentType} development.

═══════════════════════════════════════════════════════════════════════════════
CONTENT TYPE: ${request.contentType.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════

${config.description}

REQUIRED STRUCTURE:
${config.structure}

KEY REQUIREMENTS:
${config.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

OUTPUT FORMAT: ${config.outputFormat}

═══════════════════════════════════════════════════════════════════════════════
SPECIFICATIONS
═══════════════════════════════════════════════════════════════════════════════

Topic: ${request.topic}
Subject: ${request.subject}
Grade Level: ${request.gradeLevel}
${request.curriculumStandards.length > 0 ? `Standards: ${request.curriculumStandards.join(', ')}` : ''}
${request.learningObjectives.length > 0 ? `Learning Objectives:\n${request.learningObjectives.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}` : ''}
${request.targetLength ? `Target Length: ${request.targetLength}` : ''}
${request.style ? `Style: ${request.style}` : ''}

Generate the ${request.contentType} content now.`;
}

export function buildActivityGenerationPrompt(request: DraftGenerationRequest): string {
  return `You are an expert activity designer creating engaging hands-on learning experiences.

═══════════════════════════════════════════════════════════════════════════════
ACTIVITY SPECIFICATIONS
═══════════════════════════════════════════════════════════════════════════════

Topic: ${request.topic}
Subject: ${request.subject}
Grade Level: ${request.gradeLevel}
${request.learningObjectives.length > 0 ? `Learning Objectives:\n${request.learningObjectives.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}` : ''}

═══════════════════════════════════════════════════════════════════════════════
ACTIVITY REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

Create an engaging learning activity that:

1. ENGAGES STUDENTS
   - Uses active learning strategies
   - Connects to student interests
   - Promotes collaboration when appropriate

2. SUPPORTS LEARNING OBJECTIVES
   - Directly addresses the stated objectives
   - Builds conceptual understanding
   - Provides practice opportunities

3. IS PRACTICAL
   - Uses readily available materials
   - Fits within typical class time
   - Works for varied class sizes

4. DIFFERENTIATES
   - Includes modifications for struggling learners
   - Offers extensions for advanced learners
   - Supports diverse learning styles

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "id": "activity-uuid",
  "title": "Engaging Activity Title",
  "type": "discussion|hands_on|project|game|investigation|creative|collaborative|reflection|practice",
  "description": "Brief description of the activity",
  "learningObjectives": ["What students will learn/practice"],
  "materials": [
    {"item": "Material 1", "quantity": "Per student/group", "alternative": "Optional alternative"}
  ],
  "preparation": [
    "What teacher needs to prepare in advance"
  ],
  "duration": 30,
  "grouping": "individual|pairs|small_group|whole_class",
  "instructions": [
    {"step": 1, "action": "Clear instruction", "timing": "5 minutes", "teacherTip": "Helpful tip"},
    {"step": 2, "action": "Next instruction", "timing": "10 minutes", "teacherTip": "Another tip"}
  ],
  "checkpoints": [
    {"after": "step 2", "question": "Check for understanding question"}
  ],
  "differentiations": [
    {"level": "below", "modifications": ["Modification 1", "Modification 2"]},
    {"level": "on", "modifications": ["Standard approach"]},
    {"level": "above", "modifications": ["Extension 1", "Extension 2"]}
  ],
  "assessmentCriteria": [
    {"criterion": "What to look for", "indicators": ["Specific indicator"]}
  ],
  "reflection": [
    "Discussion question for closure",
    "Another reflection prompt"
  ],
  "extensions": [
    "How to extend the learning"
  ],
  "standards": ["${request.curriculumStandards.join('", "')}"],
  "teacherNotes": "Additional notes for the teacher"
}
\`\`\`

Design the activity now.`;
}

export function buildReadingPassagePrompt(request: DraftGenerationRequest): string {
  return `You are an expert reading content developer creating engaging informational text.

═══════════════════════════════════════════════════════════════════════════════
READING PASSAGE SPECIFICATIONS
═══════════════════════════════════════════════════════════════════════════════

Topic: ${request.topic}
Subject: ${request.subject}
Grade Level: ${request.gradeLevel}
Target Length: ${request.targetLength || 'medium'} (${
    request.targetLength === 'short' ? '300-500' :
    request.targetLength === 'long' ? '800-1200' : '500-800'
  } words)

═══════════════════════════════════════════════════════════════════════════════
PASSAGE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

Create an informational reading passage that:

1. ENGAGES READERS
   - Compelling opening hook
   - Interesting facts and details
   - Clear narrative thread

2. BUILDS COMPREHENSION
   - Clear topic sentences
   - Supporting details
   - Logical transitions
   - Strong conclusion

3. DEVELOPS VOCABULARY
   - Grade-appropriate vocabulary
   - Context clues for new words
   - Academic vocabulary inclusion

4. SUPPORTS STANDARDS
   - Meets reading level expectations
   - Supports comprehension skills
   - Aligns with content standards

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "id": "passage-uuid",
  "title": "Engaging Title",
  "passage": "Full passage text with multiple paragraphs...",
  "lexileLevel": "850L",
  "wordCount": 650,
  "paragraphCount": 5,
  "vocabulary": [
    {
      "term": "word",
      "definition": "Definition",
      "context": "Sentence from passage using the word",
      "partOfSpeech": "noun|verb|adjective|etc"
    }
  ],
  "textFeatures": [
    {"type": "heading|subheading|bold|caption", "purpose": "Why it's included"}
  ],
  "comprehensionQuestions": [
    {
      "type": "literal|inferential|evaluative",
      "question": "Comprehension question",
      "answer": "Expected answer",
      "textEvidence": "Where to find support in passage"
    }
  ],
  "discussionQuestions": [
    "Open-ended discussion prompt"
  ],
  "writingPrompt": "Related writing activity",
  "standards": ["Aligned reading standards"],
  "teacherNotes": "Teaching suggestions"
}
\`\`\`

Create the reading passage now.`;
}

export function buildVideoScriptPrompt(request: DraftGenerationRequest): string {
  return `You are an expert educational video scriptwriter creating engaging video content.

═══════════════════════════════════════════════════════════════════════════════
VIDEO SCRIPT SPECIFICATIONS
═══════════════════════════════════════════════════════════════════════════════

Topic: ${request.topic}
Subject: ${request.subject}
Grade Level: ${request.gradeLevel}
Target Duration: ${
    request.targetLength === 'short' ? '3-5 minutes' :
    request.targetLength === 'long' ? '10-15 minutes' : '5-8 minutes'
  }

═══════════════════════════════════════════════════════════════════════════════
SCRIPT REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

Create a video script that:

1. HOOKS VIEWERS
   - Attention-grabbing opening
   - Clear value proposition
   - Engaging preview

2. TEACHES EFFECTIVELY
   - Clear explanations
   - Visual support cues
   - Pacing for comprehension

3. MAINTAINS ENGAGEMENT
   - Conversational tone
   - Questions and pauses
   - Varied presentation

4. PROVIDES STRUCTURE
   - Clear segments
   - Transitions
   - Summary and recap

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "id": "script-uuid",
  "title": "Video Title",
  "description": "Video description for platform",
  "totalDuration": "5:30",
  "segments": [
    {
      "id": "seg-1",
      "title": "Hook",
      "duration": "0:30",
      "script": "Narrator/presenter dialogue...",
      "visualCues": [
        {"timestamp": "0:00", "description": "Opening animation"},
        {"timestamp": "0:10", "description": "Text overlay: question"}
      ],
      "b-roll": ["Description of supplementary footage"],
      "graphicsNeeded": ["Infographic description"],
      "onScreenText": ["Key point to display"]
    }
  ],
  "vocabulary": [
    {"term": "word", "timestamp": "2:15", "definition": "Definition shown"}
  ],
  "interactionPoints": [
    {"timestamp": "3:00", "type": "pause|question|activity", "prompt": "Think about..."}
  ],
  "accessibilityNotes": {
    "audioDescriptions": ["Description of visual-only content"],
    "captionNotes": ["Notes for caption timing/styling"]
  },
  "standards": ["Aligned standards"],
  "productionNotes": "Notes for video production team"
}
\`\`\`

Write the video script now.`;
}

export function buildFlashcardSetPrompt(request: DraftGenerationRequest): string {
  return `You are an expert in creating effective flashcard sets for learning and retention.

═══════════════════════════════════════════════════════════════════════════════
FLASHCARD SET SPECIFICATIONS
═══════════════════════════════════════════════════════════════════════════════

Topic: ${request.topic}
Subject: ${request.subject}
Grade Level: ${request.gradeLevel}
Target Size: ${
    request.targetLength === 'short' ? '10-15 cards' :
    request.targetLength === 'long' ? '30-40 cards' : '20-25 cards'
  }

═══════════════════════════════════════════════════════════════════════════════
FLASHCARD REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

Create flashcards that:

1. FOCUS ON KEY CONCEPTS
   - Essential vocabulary
   - Core concepts
   - Important facts

2. PROMOTE ACTIVE RECALL
   - Clear, concise prompts
   - Single concept per card
   - Testable knowledge

3. SUPPORT MEMORY
   - Include examples
   - Use mnemonics where helpful
   - Group related concepts

4. BUILD PROGRESSIVELY
   - Start with foundational terms
   - Progress to more complex concepts
   - Include application cards

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "id": "set-uuid",
  "title": "Flashcard Set Title",
  "description": "What this set covers",
  "totalCards": 20,
  "categories": ["Category 1", "Category 2"],
  "cards": [
    {
      "id": "card-1",
      "category": "Category 1",
      "front": {
        "text": "Term or question",
        "hint": "Optional hint"
      },
      "back": {
        "text": "Definition or answer",
        "examples": ["Example 1", "Example 2"],
        "mnemonic": "Optional memory aid",
        "relatedTerms": ["Related term 1"]
      },
      "difficulty": "easy|medium|hard",
      "tags": ["tag1", "tag2"]
    }
  ],
  "studyTips": [
    "How to use these flashcards effectively"
  ],
  "standards": ["Aligned standards"]
}
\`\`\`

Create the flashcard set now.`;
}

export function buildStudyGuidePrompt(request: DraftGenerationRequest): string {
  return `You are an expert in creating comprehensive study guides for student review.

═══════════════════════════════════════════════════════════════════════════════
STUDY GUIDE SPECIFICATIONS
═══════════════════════════════════════════════════════════════════════════════

Topic: ${request.topic}
Subject: ${request.subject}
Grade Level: ${request.gradeLevel}
${request.learningObjectives.length > 0 ? `Learning Objectives:\n${request.learningObjectives.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}` : ''}

═══════════════════════════════════════════════════════════════════════════════
STUDY GUIDE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

Create a study guide that:

1. ORGANIZES CONTENT
   - Clear section headings
   - Logical progression
   - Easy to navigate

2. SUMMARIZES KEY POINTS
   - Concise explanations
   - Essential concepts highlighted
   - Key formulas/facts boxed

3. SUPPORTS REVIEW
   - Practice problems
   - Self-check questions
   - Review checklists

4. PROVIDES STRATEGIES
   - Study tips
   - Common mistakes to avoid
   - Test-taking strategies

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "id": "guide-uuid",
  "title": "Study Guide Title",
  "description": "Overview of what this guide covers",
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title",
      "order": 1,
      "keyConcepts": [
        {
          "concept": "Concept name",
          "explanation": "Clear explanation",
          "example": "Illustrative example",
          "importance": "Why this matters"
        }
      ],
      "vocabulary": [
        {"term": "word", "definition": "Definition"}
      ],
      "keyFacts": [
        "Important fact to remember"
      ],
      "formulas": [
        {"name": "Formula name", "formula": "Mathematical formula", "when": "When to use it"}
      ],
      "practiceProblems": [
        {
          "question": "Practice question",
          "answer": "Answer",
          "solution": "Step-by-step solution"
        }
      ],
      "commonMistakes": [
        {"mistake": "Common error", "correction": "How to avoid it"}
      ]
    }
  ],
  "reviewChecklist": [
    "I can explain...",
    "I can solve...",
    "I understand..."
  ],
  "studyTips": [
    "Effective study strategy"
  ],
  "selfAssessment": [
    {
      "question": "Self-check question",
      "answer": "Expected understanding"
    }
  ],
  "standards": ["Aligned standards"]
}
\`\`\`

Create the study guide now.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS FOR CONTENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export const CONTENT_TYPE_SYSTEM_PROMPTS: Record<ContentType, string> = {
  lesson: `You are an expert lesson designer creating engaging, pedagogically sound lessons.
Focus on clear objectives, scaffolded instruction, and meaningful practice opportunities.`,

  assessment: `You are an expert assessment designer creating valid, reliable assessments.
Focus on alignment with objectives, varied question types, and meaningful feedback.`,

  activity: `You are an expert activity designer creating engaging hands-on learning experiences.
Focus on active learning, clear instructions, and differentiation options.`,

  'reading-passage': `You are an expert reading content developer creating engaging informational text.
Focus on grade-appropriate vocabulary, clear structure, and comprehension support.`,

  'video-script': `You are an expert educational video scriptwriter.
Focus on engagement, visual support, and conversational explanations.`,

  'interactive-exercise': `You are an expert interactive content designer.
Focus on clear interactions, immediate feedback, and progressive difficulty.`,

  'study-guide': `You are an expert study guide creator.
Focus on organization, key concepts, and effective review strategies.`,

  'flashcard-set': `You are an expert flashcard designer.
Focus on concise prompts, clear answers, and effective memory support.`,
};

export function getContentTypeSystemPrompt(contentType: ContentType): string {
  return CONTENT_TYPE_SYSTEM_PROMPTS[contentType] +
    '\n\nAlways respond with valid JSON that can be parsed programmatically.';
}
