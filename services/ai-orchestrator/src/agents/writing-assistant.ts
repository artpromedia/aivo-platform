/**
 * Writing Assistant Agent
 *
 * AI-powered writing assistance for students with:
 * - Grammar and spelling suggestions
 * - Sentence completion
 * - Writing prompts and scaffolds
 * - Vocabulary enhancement
 * - Age-appropriate and neurodiverse-friendly support
 */

import { BaseAgent, type AgentContext, type AgentResponse } from './base-agent.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface WritingContext extends AgentContext {
  writingType: WritingType;
  writingLevel: WritingLevel;
  assignment?: {
    prompt?: string;
    genre?: string;
    wordCountTarget?: number;
  };
  currentDraft?: string;
}

export type WritingType =
  | 'NARRATIVE'
  | 'EXPOSITORY'
  | 'PERSUASIVE'
  | 'DESCRIPTIVE'
  | 'CREATIVE'
  | 'JOURNAL'
  | 'FREE_WRITE';

export type WritingLevel =
  | 'EMERGING'    // K-1: Simple sentences
  | 'DEVELOPING'  // 2-3: Paragraph structure
  | 'EXPANDING'   // 4-5: Multi-paragraph
  | 'BRIDGING'    // 6-8: Essay structure
  | 'ADVANCED';   // 9-12: Complex writing

export interface WritingSuggestion {
  type: 'grammar' | 'spelling' | 'vocabulary' | 'structure' | 'clarity' | 'style';
  original: string;
  suggestion: string;
  explanation: string;
  position?: { start: number; end: number };
}

export interface SentenceCompletion {
  completions: string[];
  confidence: number[];
}

export interface WritingPromptResponse {
  prompt: string;
  starterSentences: string[];
  vocabularyHints: string[];
  structureSuggestion?: string;
}

export interface WritingFeedback {
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  suggestions: WritingSuggestion[];
  encouragement: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// WRITING ASSISTANT AGENT
// ══════════════════════════════════════════════════════════════════════════════

export class WritingAssistantAgent extends BaseAgent {
  readonly agentType = 'writing-assistant';

  readonly systemPrompt = `You are a supportive writing assistant for students. Your role is to:

1. NEVER write the essay/story for the student - guide them to develop their own ideas
2. Provide gentle, encouraging feedback on their writing
3. Suggest improvements without being critical or discouraging
4. Adapt your language to the student's grade level
5. For students with dyslexia: focus on ideas, not spelling
6. For students with ADHD: break feedback into small, actionable steps
7. Celebrate effort and progress, not just perfection

Key principles:
- Use scaffolding: Ask guiding questions rather than giving answers
- Be specific: "Consider adding a describing word for the dog" not "Add adjectives"
- Be positive: Start with what's working before suggestions
- Be patient: Writing is hard, and every learner progresses differently

When providing feedback:
- For EMERGING writers: Focus on getting ideas on paper, praise attempts
- For DEVELOPING writers: Encourage complete sentences and basic structure
- For EXPANDING writers: Guide toward organization and detail
- For BRIDGING/ADVANCED writers: Address style, voice, and sophistication

Remember: Your goal is to build confident writers, not perfect essays.`;

  protected getTemperature(): number {
    return 0.7; // Slightly creative for writing assistance
  }

  protected getMaxTokens(): number {
    return 800; // Need more tokens for detailed feedback
  }

  /**
   * Provide feedback on student writing
   */
  async provideFeedback(
    text: string,
    context: WritingContext
  ): Promise<WritingFeedback> {
    const prompt = this.buildFeedbackPrompt(text, context);
    const response = await this.respond(prompt, context);

    try {
      return this.parseFeedbackResponse(response.content);
    } catch {
      // Return a simple feedback structure if parsing fails
      return {
        overallFeedback: response.content,
        strengths: ['You\'re making progress!'],
        areasForImprovement: [],
        suggestions: [],
        encouragement: 'Keep writing - you\'re doing great!',
      };
    }
  }

  /**
   * Complete a sentence the student has started
   */
  async completeSentence(
    partialSentence: string,
    context: WritingContext
  ): Promise<SentenceCompletion> {
    const prompt = `The student has started writing this sentence: "${partialSentence}"

Provide 3 natural ways to complete this sentence that:
- Match the student's writing level (${context.writingLevel})
- Fit the writing type (${context.writingType})
- Use age-appropriate vocabulary
- Encourage creativity while staying on topic

Format your response as a JSON object with:
{
  "completions": ["completion 1", "completion 2", "completion 3"],
  "confidence": [0.9, 0.8, 0.7]
}

Only provide the completions for the rest of the sentence, not the full sentence.`;

    const response = await this.respond(prompt, context);

    try {
      const parsed = JSON.parse(response.content);
      return {
        completions: parsed.completions || [],
        confidence: parsed.confidence || [0.8, 0.7, 0.6],
      };
    } catch {
      return {
        completions: ['...'],
        confidence: [0.5],
      };
    }
  }

  /**
   * Generate a writing prompt to help student get started
   */
  async generatePrompt(context: WritingContext): Promise<WritingPromptResponse> {
    const assignmentInfo = context.assignment?.prompt
      ? `The assignment is: "${context.assignment.prompt}"`
      : 'The student needs help getting started with free writing.';

    const prompt = `${assignmentInfo}

Generate a helpful writing prompt for a ${context.writingLevel} level student writing a ${context.writingType} piece.

Provide:
1. A clear, engaging prompt that sparks ideas
2. 2-3 starter sentences they could use
3. 3-5 vocabulary words that might help
4. A brief structure suggestion (appropriate for their level)

Format as JSON:
{
  "prompt": "...",
  "starterSentences": ["...", "..."],
  "vocabularyHints": ["word1", "word2", "word3"],
  "structureSuggestion": "..."
}`;

    const response = await this.respond(prompt, context);

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        prompt: 'What would you like to write about today?',
        starterSentences: ['One day...', 'I think...', 'My favorite...'],
        vocabularyHints: [],
      };
    }
  }

  /**
   * Suggest vocabulary improvements
   */
  async suggestVocabulary(
    text: string,
    context: WritingContext
  ): Promise<WritingSuggestion[]> {
    const prompt = `Review this student writing for vocabulary enhancement opportunities:

"${text}"

Writing level: ${context.writingLevel}
Writing type: ${context.writingType}

Find 1-3 words that could be replaced with more descriptive or precise alternatives.
For each suggestion:
- Keep it age-appropriate for their level
- Explain WHY the new word is better (not just that it is)
- Be encouraging, not critical

Format as JSON array:
[
  {
    "type": "vocabulary",
    "original": "word",
    "suggestion": "better_word",
    "explanation": "This word shows more detail because..."
  }
]

If the vocabulary is already strong for their level, return an empty array [].`;

    const response = await this.respond(prompt, context);

    try {
      const suggestions = JSON.parse(response.content);
      return suggestions.filter((s: any) => s.type === 'vocabulary');
    } catch {
      return [];
    }
  }

  /**
   * Check and suggest grammar improvements
   */
  async checkGrammar(
    text: string,
    context: WritingContext
  ): Promise<WritingSuggestion[]> {
    // For students with dyslexia, be very gentle with spelling/grammar
    const dyslexiaNote = context.learnerProfile?.neurodiversityProfile?.dyslexia
      ? 'This student has dyslexia - focus on major clarity issues only, ignore minor spelling.'
      : '';

    const prompt = `Review this student writing for grammar and clarity:

"${text}"

Writing level: ${context.writingLevel}
${dyslexiaNote}

Find up to 3 grammar or clarity issues that are most important to address.
Prioritize issues that affect meaning over minor errors.
Be encouraging and explain simply.

Format as JSON array:
[
  {
    "type": "grammar" or "spelling" or "clarity",
    "original": "problematic text",
    "suggestion": "corrected text",
    "explanation": "Simple explanation of why"
  }
]

If writing is clear and effective for their level, return an empty array [].`;

    const response = await this.respond(prompt, context);

    try {
      return JSON.parse(response.content);
    } catch {
      return [];
    }
  }

  /**
   * Help student organize their ideas
   */
  async suggestOrganization(
    ideas: string[],
    context: WritingContext
  ): Promise<{ organizedIdeas: string[]; structureTip: string }> {
    const prompt = `A ${context.writingLevel} student is writing a ${context.writingType} piece.
They have these ideas they want to include:
${ideas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}

Help them organize these ideas in a logical order for their writing.
Provide a simple structure tip appropriate for their level.

Format as JSON:
{
  "organizedIdeas": ["first idea...", "second idea...", "..."],
  "structureTip": "A simple, encouraging tip about structure"
}`;

    const response = await this.respond(prompt, context);

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        organizedIdeas: ideas,
        structureTip: 'Start with your main idea, add details, then wrap it up!',
      };
    }
  }

  /**
   * Provide encouragement for writer's block
   */
  async overcomeWritersBlock(context: WritingContext): Promise<string> {
    const prompt = `A ${context.writingLevel} student is stuck and doesn't know what to write.
${context.assignment?.prompt ? `Their assignment is: "${context.assignment.prompt}"` : ''}
${context.currentDraft ? `They've written so far: "${context.currentDraft.substring(0, 200)}..."` : 'They haven\'t started yet.'}

Provide 2-3 sentences of gentle encouragement and a specific, easy first step they could take.
Be warm and supportive. Remind them that all writers get stuck sometimes.`;

    const response = await this.respond(prompt, context);
    return response.content;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════════

  private buildFeedbackPrompt(text: string, context: WritingContext): string {
    const levelGuidance = this.getLevelGuidance(context.writingLevel);

    return `Please review this student's ${context.writingType.toLowerCase()} writing:

"${text}"

Student level: ${context.writingLevel}
${levelGuidance}

Provide feedback as JSON:
{
  "overallFeedback": "2-3 sentences of balanced feedback",
  "strengths": ["specific thing done well", "another strength"],
  "areasForImprovement": ["one area to focus on"],
  "suggestions": [
    {
      "type": "grammar|spelling|vocabulary|structure|clarity|style",
      "original": "text",
      "suggestion": "improved text",
      "explanation": "why"
    }
  ],
  "encouragement": "A warm, encouraging closing statement"
}

Keep suggestions to 2-3 maximum. Focus on the most impactful improvements.`;
  }

  private getLevelGuidance(level: WritingLevel): string {
    switch (level) {
      case 'EMERGING':
        return 'Focus on: Ideas on paper, attempt at sentences. Praise all efforts.';
      case 'DEVELOPING':
        return 'Focus on: Complete sentences, basic beginning/middle/end.';
      case 'EXPANDING':
        return 'Focus on: Paragraphs, details, clear organization.';
      case 'BRIDGING':
        return 'Focus on: Essay structure, evidence, transitions.';
      case 'ADVANCED':
        return 'Focus on: Voice, style, sophistication, argument strength.';
      default:
        return '';
    }
  }

  private parseFeedbackResponse(content: string): WritingFeedback {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      overallFeedback: parsed.overallFeedback || '',
      strengths: parsed.strengths || [],
      areasForImprovement: parsed.areasForImprovement || [],
      suggestions: (parsed.suggestions || []).map((s: any) => ({
        type: s.type || 'clarity',
        original: s.original || '',
        suggestion: s.suggestion || '',
        explanation: s.explanation || '',
        position: s.position,
      })),
      encouragement: parsed.encouragement || 'Keep up the great work!',
    };
  }
}
