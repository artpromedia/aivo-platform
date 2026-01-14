/**
 * AI Writing Assistance Service
 *
 * Provides AI-powered writing assistance including:
 * - Grammar and spelling feedback
 * - Writing suggestions and prompts
 * - Content continuation
 * - Encouragement and positive reinforcement
 *
 * @author AIVO Platform Team
 */

import { config } from '../config.js';
import type {
  AIAssistanceRequest,
  AIAssistanceResponse,
  WritingFeedbackItem,
  WritingSuggestionItem,
  WritingMetrics,
  FeedbackType,
  SuggestionType,
  GradeBand,
  WritingType,
} from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// AI ORCHESTRATOR CLIENT
// ══════════════════════════════════════════════════════════════════════════════

interface AIRequest {
  agentType: string;
  prompt: string;
  context: Record<string, unknown>;
  maxTokens?: number;
}

interface AIResponse {
  response: string;
  metadata?: Record<string, unknown>;
}

async function callAIOrchestrator(request: AIRequest): Promise<AIResponse> {
  const response = await fetch(`${config.aiOrchestratorUrl}/internal/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-API-Key': config.aiOrchestratorApiKey,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI Orchestrator error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<AIResponse>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TEXT ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate writing metrics from content
 */
export function calculateMetrics(content: string): WritingMetrics {
  const words = content
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);
  const paragraphCount = Math.max(paragraphs.length, 1);

  const totalWordLength = words.reduce((sum, w) => sum + w.length, 0);
  const averageWordLength = wordCount > 0 ? totalWordLength / wordCount : 0;
  const averageSentenceLength = wordCount / sentenceCount;

  // Simple readability score (Flesch-Kincaid approximation)
  const readabilityScore = Math.max(
    0,
    Math.min(100, 206.835 - 1.015 * averageSentenceLength - 84.6 * (averageWordLength / 5))
  );

  // Vocabulary level based on average word length
  let vocabularyLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' = 'BASIC';
  if (averageWordLength > 6) vocabularyLevel = 'ADVANCED';
  else if (averageWordLength > 4.5) vocabularyLevel = 'INTERMEDIATE';

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    averageWordLength: Math.round(averageWordLength * 10) / 10,
    averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
    readabilityScore: Math.round(readabilityScore),
    vocabularyLevel,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GRADE-APPROPRIATE ENCOURAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

const ENCOURAGEMENT_BY_GRADE: Record<GradeBand, string[]> = {
  K5: [
    "Great job writing! You're becoming a wonderful writer!",
    "I love how you're using your words! Keep going!",
    "You're doing amazing! Every word you write makes you better!",
    'What a creative writer you are! Your ideas are fantastic!',
    "You're working so hard on your writing. That's awesome!",
  ],
  G6_8: [
    'Your writing is developing nicely. Keep building on these ideas!',
    'Great progress! Your voice as a writer is getting stronger.',
    "Nice work! You're making thoughtful choices in your writing.",
    'Your ideas are interesting. Keep exploring them!',
    "You're growing as a writer. Each draft makes you better!",
  ],
  G9_12: [
    'Strong work. Your argument/narrative is developing well.',
    'Good analytical thinking in your writing.',
    'Your writing shows depth. Continue refining your ideas.',
    'Nice work on structure and flow. Keep polishing!',
    'Your voice and style are emerging. Keep writing!',
  ],
};

function getRandomEncouragement(gradeBand: GradeBand): string {
  const options = ENCOURAGEMENT_BY_GRADE[gradeBand] || ENCOURAGEMENT_BY_GRADE.G6_8;
  return options[Math.floor(Math.random() * options.length)];
}

// ══════════════════════════════════════════════════════════════════════════════
// WRITING ASSISTANCE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get AI-powered writing assistance
 */
export async function getWritingAssistance(
  request: AIAssistanceRequest
): Promise<AIAssistanceResponse> {
  const metrics = calculateMetrics(request.content);
  const feedback: WritingFeedbackItem[] = [];
  const suggestions: WritingSuggestionItem[] = [];
  let continuation: string | undefined;

  // Generate feedback if requested
  if (request.requestTypes.includes('FEEDBACK')) {
    const feedbackItems = await generateFeedback(request);
    feedback.push(...feedbackItems);
  }

  // Generate suggestions if requested
  if (request.requestTypes.includes('SUGGESTIONS')) {
    const suggestionItems = await generateSuggestions(request);
    suggestions.push(...suggestionItems);
  }

  // Generate continuation if requested
  if (request.requestTypes.includes('CONTINUATION')) {
    continuation = await generateContinuation(request);
  }

  return {
    documentId: request.documentId,
    feedback,
    suggestions,
    continuation,
    encouragement: getRandomEncouragement(request.gradeBand),
    metrics,
  };
}

/**
 * Generate grammar, spelling, and style feedback
 */
async function generateFeedback(request: AIAssistanceRequest): Promise<WritingFeedbackItem[]> {
  const feedback: WritingFeedbackItem[] = [];

  try {
    const aiResponse = await callAIOrchestrator({
      agentType: 'WRITING_FEEDBACK',
      prompt: buildFeedbackPrompt(request),
      context: {
        writingType: request.writingType,
        gradeBand: request.gradeBand,
        subject: request.subject,
        focusAreas: request.focusAreas,
      },
      maxTokens: 1000,
    });

    // Parse AI response into feedback items
    const parsed = parseFeedbackResponse(aiResponse.response, request.gradeBand);
    feedback.push(...parsed);
  } catch (err) {
    console.error('[AIWritingService] Failed to generate AI feedback:', err);

    // Fallback to basic local analysis
    feedback.push(...getBasicFeedback(request.content, request.gradeBand));
  }

  return feedback;
}

/**
 * Generate writing suggestions
 */
async function generateSuggestions(request: AIAssistanceRequest): Promise<WritingSuggestionItem[]> {
  const suggestions: WritingSuggestionItem[] = [];

  try {
    const aiResponse = await callAIOrchestrator({
      agentType: 'WRITING_SUGGESTIONS',
      prompt: buildSuggestionsPrompt(request),
      context: {
        writingType: request.writingType,
        gradeBand: request.gradeBand,
        subject: request.subject,
      },
      maxTokens: 500,
    });

    // Parse AI response into suggestion items
    const parsed = parseSuggestionsResponse(aiResponse.response, request.writingType);
    suggestions.push(...parsed);
  } catch (err) {
    console.error('[AIWritingService] Failed to generate AI suggestions:', err);

    // Fallback to template-based suggestions
    suggestions.push(...getTemplateSuggestions(request.writingType, request.content));
  }

  return suggestions;
}

/**
 * Generate content continuation
 */
async function generateContinuation(request: AIAssistanceRequest): Promise<string> {
  try {
    const aiResponse = await callAIOrchestrator({
      agentType: 'WRITING_CONTINUATION',
      prompt: buildContinuationPrompt(request),
      context: {
        writingType: request.writingType,
        gradeBand: request.gradeBand,
        subject: request.subject,
      },
      maxTokens: 200,
    });

    return aiResponse.response;
  } catch (err) {
    console.error('[AIWritingService] Failed to generate continuation:', err);
    return '';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

function buildFeedbackPrompt(request: AIAssistanceRequest): string {
  const gradeContext = getGradeContext(request.gradeBand);

  return `You are a supportive writing coach for ${gradeContext} students.

Review the following ${request.writingType.toLowerCase()} writing and provide constructive feedback.
Focus on: ${request.focusAreas?.join(', ') || 'grammar, spelling, clarity, and structure'}.

IMPORTANT GUIDELINES:
- Be encouraging and positive
- Give specific, actionable feedback
- Use language appropriate for the grade level
- Focus on 2-3 key areas to improve
- Do NOT provide answers or do the writing for them

Student's writing:
---
${request.content}
---

Provide feedback in JSON format:
[
  { "type": "FEEDBACK_TYPE", "text": "feedback message", "severity": "INFO|SUGGESTION|WARNING", "originalText": "if applicable", "suggestedText": "if applicable" }
]`;
}

function buildSuggestionsPrompt(request: AIAssistanceRequest): string {
  const gradeContext = getGradeContext(request.gradeBand);

  return `You are a creative writing assistant for ${gradeContext} students.

The student is writing a ${request.writingType.toLowerCase()} piece. Suggest ways they could continue or improve their writing.

Current writing:
---
${request.content}
---

Provide 2-3 helpful suggestions (NOT answers, just prompts to help them think):
[
  { "type": "SUGGESTION_TYPE", "text": "suggestion", "position": "INLINE|END_OF_PARAGRAPH|END_OF_DOCUMENT" }
]

Suggestion types: WORD_CHOICE, SENTENCE_STARTER, TRANSITION, CONCLUSION, ELABORATION, ORGANIZATION`;
}

function buildContinuationPrompt(request: AIAssistanceRequest): string {
  const gradeContext = getGradeContext(request.gradeBand);

  return `You are helping a ${gradeContext} student continue their ${request.writingType.toLowerCase()} writing.

Their current writing:
---
${request.content}
---

Provide a brief continuation prompt or sentence starter (NOT the actual continuation) that could help them continue writing. Keep it short (1-2 sentences) and appropriate for their grade level.`;
}

function getGradeContext(gradeBand: GradeBand): string {
  switch (gradeBand) {
    case 'K5':
      return 'elementary school (K-5)';
    case 'G6_8':
      return 'middle school (grades 6-8)';
    case 'G9_12':
      return 'high school (grades 9-12)';
    default:
      return 'school';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE PARSERS
// ══════════════════════════════════════════════════════════════════════════════

function parseFeedbackResponse(response: string, _gradeBand: GradeBand): WritingFeedbackItem[] {
  try {
    // Try to extract JSON from response
    const jsonMatch = /\[[\s\S]*\]/.exec(response);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]) as {
        type?: string;
        text?: string;
        severity?: string;
        originalText?: string;
        suggestedText?: string;
      }[];

      return items.map((item) => ({
        type: (item.type as FeedbackType) || 'CONTENT',
        text: item.text || '',
        severity: (item.severity as 'INFO' | 'SUGGESTION' | 'WARNING') || 'SUGGESTION',
        originalText: item.originalText,
        suggestedText: item.suggestedText,
      }));
    }
  } catch {
    // Fall through to empty array
  }

  return [];
}

function parseSuggestionsResponse(
  response: string,
  _writingType: WritingType
): WritingSuggestionItem[] {
  try {
    const jsonMatch = /\[[\s\S]*\]/.exec(response);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]) as {
        type?: string;
        text?: string;
        position?: string;
        context?: string;
      }[];

      return items.map((item) => ({
        type: (item.type as SuggestionType) || 'ELABORATION',
        text: item.text || '',
        position:
          (item.position as 'INLINE' | 'END_OF_PARAGRAPH' | 'END_OF_DOCUMENT') ||
          'END_OF_PARAGRAPH',
        context: item.context,
      }));
    }
  } catch {
    // Fall through to empty array
  }

  return [];
}

// ══════════════════════════════════════════════════════════════════════════════
// FALLBACK ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

function getBasicFeedback(content: string, gradeBand: GradeBand): WritingFeedbackItem[] {
  const feedback: WritingFeedbackItem[] = [];
  const metrics = calculateMetrics(content);

  // Check for very short sentences
  if (metrics.averageSentenceLength < 5 && metrics.wordCount > 10) {
    feedback.push({
      type: 'STRUCTURE',
      text:
        gradeBand === 'K5'
          ? 'Try connecting some of your short sentences together!'
          : 'Consider combining some of your shorter sentences for better flow.',
      severity: 'SUGGESTION',
    });
  }

  // Check for very long sentences
  if (metrics.averageSentenceLength > 25) {
    feedback.push({
      type: 'CLARITY',
      text:
        gradeBand === 'K5'
          ? 'Some of your sentences are pretty long. Can you break them into smaller parts?'
          : 'Some sentences are quite long. Consider breaking them up for clarity.',
      severity: 'SUGGESTION',
    });
  }

  // Check for single paragraph
  if (metrics.paragraphCount === 1 && metrics.wordCount > 50) {
    feedback.push({
      type: 'STRUCTURE',
      text:
        gradeBand === 'K5'
          ? 'Try starting a new paragraph when you have a new idea!'
          : 'Consider organizing your writing into multiple paragraphs.',
      severity: 'SUGGESTION',
    });
  }

  // Always include encouragement-style feedback
  feedback.push({
    type: 'ENCOURAGEMENT',
    text: getRandomEncouragement(gradeBand),
    severity: 'INFO',
  });

  return feedback;
}

function getTemplateSuggestions(
  writingType: WritingType,
  content: string
): WritingSuggestionItem[] {
  const suggestions: WritingSuggestionItem[] = [];
  const metrics = calculateMetrics(content);

  // Add transition suggestion if multiple paragraphs
  if (metrics.paragraphCount > 1) {
    suggestions.push({
      type: 'TRANSITION',
      text: getTransitionSuggestion(writingType),
      position: 'END_OF_PARAGRAPH',
    });
  }

  // Add elaboration suggestion
  suggestions.push({
    type: 'ELABORATION',
    text: getElaborationSuggestion(writingType),
    position: 'INLINE',
  });

  return suggestions;
}

function getTransitionSuggestion(writingType: WritingType): string {
  const transitions: Record<WritingType, string> = {
    NARRATIVE: "What happened next? Try using words like 'Then,' 'After that,' or 'Suddenly.'",
    PERSUASIVE: "Add another reason to support your argument. Try 'Furthermore,' or 'In addition.'",
    EXPOSITORY: "Connect your ideas with transitions like 'For example,' or 'Additionally.'",
    DESCRIPTIVE: 'Add more details! What did it look, sound, or feel like?',
    POETRY: 'Consider how you want to move between your images or ideas.',
    JOURNAL: 'What else do you want to reflect on?',
    NOTE: 'Add any additional points you want to remember.',
    DRAFT: 'Continue developing your ideas.',
  };
  return transitions[writingType] || transitions.DRAFT;
}

function getElaborationSuggestion(writingType: WritingType): string {
  const elaborations: Record<WritingType, string> = {
    NARRATIVE: 'Can you add more details about how the character felt?',
    PERSUASIVE: 'What evidence could you add to make your point stronger?',
    EXPOSITORY: 'Can you explain this idea in more detail?',
    DESCRIPTIVE: 'What sensory details (sight, sound, smell, taste, touch) could you add?',
    POETRY: 'What imagery or metaphor could express this feeling?',
    JOURNAL: 'Why do you think you feel this way?',
    NOTE: 'What key details should you include?',
    DRAFT: 'What else would you like to add?',
  };
  return elaborations[writingType] || elaborations.DRAFT;
}

// ══════════════════════════════════════════════════════════════════════════════
// WRITING PROMPTS LIBRARY
// ══════════════════════════════════════════════════════════════════════════════

export function getWritingPrompts(
  gradeBand: GradeBand,
  writingType?: WritingType
): { title: string; prompt: string; type: WritingType }[] {
  const prompts = WRITING_PROMPTS[gradeBand] || WRITING_PROMPTS.G6_8;

  if (writingType) {
    return prompts.filter((p) => p.type === writingType);
  }

  return prompts;
}

const WRITING_PROMPTS: Record<GradeBand, { title: string; prompt: string; type: WritingType }[]> = {
  K5: [
    {
      title: 'My Favorite Day',
      prompt: 'Write about your favorite day ever. What happened? Who was there?',
      type: 'NARRATIVE',
    },
    {
      title: 'If I Could Fly',
      prompt: 'Imagine you could fly! Where would you go? What would you see?',
      type: 'NARRATIVE',
    },
    {
      title: 'My Best Friend',
      prompt: 'Describe your best friend. What makes them special to you?',
      type: 'DESCRIPTIVE',
    },
    {
      title: 'Why We Should Have More Recess',
      prompt: 'Write about why you think school should have more recess time.',
      type: 'PERSUASIVE',
    },
  ],
  G6_8: [
    {
      title: 'A Day That Changed Me',
      prompt: 'Describe a day that changed how you see the world or yourself.',
      type: 'NARRATIVE',
    },
    {
      title: 'The Best Invention',
      prompt: 'What do you think is the most important invention? Explain why.',
      type: 'PERSUASIVE',
    },
    {
      title: 'My Special Place',
      prompt: 'Describe a place that is special to you using all your senses.',
      type: 'DESCRIPTIVE',
    },
    {
      title: 'How Something Works',
      prompt: 'Explain how something you know well works to someone who has never seen it.',
      type: 'EXPOSITORY',
    },
  ],
  G9_12: [
    {
      title: 'A Defining Moment',
      prompt: 'Reflect on a moment that helped define who you are today.',
      type: 'NARRATIVE',
    },
    {
      title: 'Taking a Stand',
      prompt: 'Choose an issue you care about and argue for your position.',
      type: 'PERSUASIVE',
    },
    {
      title: 'Analysis of Change',
      prompt: 'Analyze how a significant change in society has affected daily life.',
      type: 'EXPOSITORY',
    },
    {
      title: 'Atmosphere in Writing',
      prompt: 'Create a scene that conveys a specific mood or atmosphere.',
      type: 'DESCRIPTIVE',
    },
  ],
};
