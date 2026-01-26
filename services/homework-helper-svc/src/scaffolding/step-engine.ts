/**
 * Scaffolding Engine
 * Implements four-step scaffolded assistance for homework help
 *
 * Step 1: Clarifying Questions - Identify what the student doesn't understand
 * Step 2: Concept Hints - Provide relevant concept reminders
 * Step 3: Worked Example - Generate a similar but different problem
 * Step 4: Solution Verification - Guide student to check their own work
 */

import { aiOrchestratorClient } from '../services/aiOrchestratorClient.js';
import type { Subject, GradeBand } from '../types/aiContract.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ExtractedProblem {
  id: string;
  rawText: string;
  subject: Subject;
  gradeBand: GradeBand;
  problemType?: string;
  containsMath?: boolean;
  mathExpressions?: Array<{ raw: string; latex?: string }>;
}

export interface Interaction {
  step: number;
  userResponse: string;
  aiResponse: string;
  timestamp: Date;
  wasHelpful?: boolean;
}

export interface LearnerProfile {
  learnerId: string;
  gradeLevel?: number;
  preferredLearningStyle?: 'visual' | 'verbal' | 'kinesthetic';
  strengths?: string[];
  areasForImprovement?: string[];
  previousPerformance?: {
    subject: Subject;
    successRate: number;
    commonMistakes?: string[];
  }[];
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  subject: Subject;
  prerequisites?: string[];
  relatedStandards?: string[];
}

export interface ScaffoldedResponse {
  step: ScaffoldingStep;
  stepName: string;
  content: string;
  hints: string[];
  relatedConcepts: Concept[];
  canProceedToNext: boolean;
  estimatedDifficulty: number;
  suggestedFollowUp?: string;
  visualAid?: VisualAid;
}

export interface VisualAid {
  type: 'diagram' | 'graph' | 'table' | 'formula' | 'example';
  content: string;
  format: 'text' | 'latex' | 'svg' | 'ascii-art';
}

export type ScaffoldingStep = 1 | 2 | 3 | 4;

export interface ScaffoldingContext {
  problem: ExtractedProblem;
  currentStep: ScaffoldingStep;
  previousInteractions: Interaction[];
  learnerProfile?: LearnerProfile;
  tenantId: string;
  sessionId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP NAMES AND DESCRIPTIONS
// ══════════════════════════════════════════════════════════════════════════════

const STEP_NAMES: Record<ScaffoldingStep, string> = {
  1: 'Clarifying Questions',
  2: 'Concept Hints',
  3: 'Worked Example',
  4: 'Solution Verification',
};

const STEP_DESCRIPTIONS: Record<ScaffoldingStep, string> = {
  1: 'Identify what the student doesn\'t understand and ask probing questions about the problem',
  2: 'Provide relevant concept reminders and link to curriculum standards',
  3: 'Generate a similar but different problem and walk through the solution step-by-step',
  4: 'Guide the student to check their own work and provide verification strategies',
};

// ══════════════════════════════════════════════════════════════════════════════
// SCAFFOLDING ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class ScaffoldingEngine {
  /**
   * Generate a scaffolded response for the current step
   */
  async generateStep(context: ScaffoldingContext): Promise<ScaffoldedResponse> {
    const { problem, currentStep, previousInteractions, learnerProfile } = context;

    // Build the appropriate prompt based on step
    const prompt = this.buildPrompt(context);

    // Get AI response
    const aiResponse = await this.getAIResponse(context, prompt);

    // Parse the response
    const parsedResponse = this.parseResponse(aiResponse, currentStep, problem.subject);

    // Get related concepts
    const concepts = this.getRelatedConcepts(problem, currentStep);

    // Calculate difficulty
    const difficulty = this.calculateDifficulty(problem, previousInteractions);

    // Determine if can proceed
    const canProceed = this.canProceedToNextStep(currentStep, previousInteractions);

    return {
      step: currentStep,
      stepName: STEP_NAMES[currentStep],
      content: parsedResponse.content,
      hints: parsedResponse.hints,
      relatedConcepts: concepts,
      canProceedToNext: canProceed,
      estimatedDifficulty: difficulty,
      suggestedFollowUp: parsedResponse.followUp,
      visualAid: parsedResponse.visualAid,
    };
  }

  /**
   * Build prompt for the current scaffolding step
   */
  private buildPrompt(context: ScaffoldingContext): string {
    const { problem, currentStep, previousInteractions, learnerProfile } = context;

    const baseContext = `
Subject: ${problem.subject}
Grade Level: ${this.gradeBandToDescription(problem.gradeBand)}
Problem: ${problem.rawText}
Problem Type: ${problem.problemType ?? 'unknown'}
${problem.containsMath ? 'This problem contains mathematical expressions.' : ''}
`;

    const learnerContext = learnerProfile
      ? `
Learner Profile:
- Grade: ${learnerProfile.gradeLevel ?? 'Unknown'}
- Learning Style: ${learnerProfile.preferredLearningStyle ?? 'Unknown'}
- Strengths: ${learnerProfile.strengths?.join(', ') ?? 'Unknown'}
- Areas for Improvement: ${learnerProfile.areasForImprovement?.join(', ') ?? 'Unknown'}
`
      : '';

    const interactionHistory =
      previousInteractions.length > 0
        ? `
Previous Interactions:
${previousInteractions.map((i) => `Step ${i.step}: Student said "${i.userResponse}". AI responded: "${i.aiResponse}"`).join('\n')}
`
        : '';

    switch (currentStep) {
      case 1:
        return this.buildStep1Prompt(baseContext, learnerContext, interactionHistory);
      case 2:
        return this.buildStep2Prompt(baseContext, learnerContext, interactionHistory, problem);
      case 3:
        return this.buildStep3Prompt(baseContext, learnerContext, interactionHistory, problem);
      case 4:
        return this.buildStep4Prompt(baseContext, learnerContext, interactionHistory);
      default:
        throw new Error(`Invalid step: ${currentStep}`);
    }
  }

  private buildStep1Prompt(
    baseContext: string,
    learnerContext: string,
    interactionHistory: string
  ): string {
    return `${baseContext}${learnerContext}${interactionHistory}

You are helping a student with their homework using the Socratic method. This is Step 1: Clarifying Questions.

Your task is to:
1. Identify what the student might not understand about the problem
2. Ask 2-3 probing questions to understand their current knowledge
3. Assess their prior knowledge related to this topic
4. DO NOT give away the answer or solution method

Generate a response that:
- Starts by acknowledging the problem
- Asks clarifying questions to understand what the student knows
- Identifies potential gaps in understanding
- Encourages the student to think about what they already know

Format your response as:
CONTENT: [Your main response with questions]
HINTS: [Hint 1] | [Hint 2]
FOLLOW_UP: [Suggested next question based on likely student responses]
`;
  }

  private buildStep2Prompt(
    baseContext: string,
    learnerContext: string,
    interactionHistory: string,
    problem: ExtractedProblem
  ): string {
    return `${baseContext}${learnerContext}${interactionHistory}

You are helping a student with their homework using the Socratic method. This is Step 2: Concept Hints.

Your task is to:
1. Identify the key concepts needed to solve this problem
2. Provide concept reminders without giving away the solution
3. Connect to relevant curriculum standards for ${problem.gradeBand}
4. Offer visual aids if applicable (diagrams, formulas, etc.)
5. DO NOT solve the problem for them

Generate a response that:
- Reviews the relevant concepts needed
- Provides memory aids or mnemonics if applicable
- Shows relevant formulas or definitions
- Connects to what they've learned before

Format your response as:
CONTENT: [Your main response with concept explanations]
HINTS: [Hint 1] | [Hint 2] | [Hint 3]
VISUAL: [Description of visual aid - diagram, formula, or example in text form]
FOLLOW_UP: [Question to check if they now understand the concept]
`;
  }

  private buildStep3Prompt(
    baseContext: string,
    learnerContext: string,
    interactionHistory: string,
    problem: ExtractedProblem
  ): string {
    return `${baseContext}${learnerContext}${interactionHistory}

You are helping a student with their homework using the Socratic method. This is Step 3: Worked Example.

Your task is to:
1. Create a SIMILAR but DIFFERENT problem to the original
2. Walk through solving this new problem step-by-step
3. Highlight key techniques and reasoning at each step
4. Make the difficulty appropriate for ${problem.gradeBand}
5. DO NOT solve the original problem

Generate a response that:
- Introduces a similar problem with different numbers/context
- Solves it step-by-step with clear explanations
- Points out common mistakes to avoid
- Asks the student to apply the same technique to their problem

Format your response as:
CONTENT: [Your worked example with step-by-step solution]
SIMILAR_PROBLEM: [The similar problem you created]
HINTS: [Hint 1] | [Hint 2]
FOLLOW_UP: [Question asking them to try applying this to their original problem]
`;
  }

  private buildStep4Prompt(
    baseContext: string,
    learnerContext: string,
    interactionHistory: string
  ): string {
    return `${baseContext}${learnerContext}${interactionHistory}

You are helping a student with their homework using the Socratic method. This is Step 4: Solution Verification.

Your task is to:
1. Guide the student to check their own work
2. Provide verification strategies specific to this problem type
3. Help them identify and correct any errors
4. Confirm correctness without directly stating the answer
5. Celebrate their success if correct

Generate a response that:
- Asks them to share their work/answer
- Provides strategies to verify their solution
- Guides them to check their work step by step
- Encourages them if struggling

Format your response as:
CONTENT: [Your verification guidance]
VERIFICATION_STEPS: [Step 1] | [Step 2] | [Step 3]
HINTS: [Hint for common error 1] | [Hint for common error 2]
FOLLOW_UP: [Final question or celebration message]
`;
  }

  private async getAIResponse(context: ScaffoldingContext, prompt: string): Promise<string> {
    try {
      const response = await aiOrchestratorClient.generateScaffolding(
        context.tenantId,
        {
          subject: context.problem.subject,
          gradeBand: context.problem.gradeBand,
          rawText: prompt,
          maxSteps: 1,
          guardrails: {
            noDirectAnswers: true,
            maxHintsPerStep: 3,
            requireWorkShown: true,
            vocabularyLevel: context.problem.gradeBand,
          },
        },
        {
          correlationId: context.problem.id,
          learnerId: context.learnerProfile?.learnerId ?? 'unknown',
          sessionId: context.sessionId,
        }
      );

      // Extract content from response
      if (response.content.steps && response.content.steps.length > 0) {
        return response.content.steps[0].promptText;
      }

      return '';
    } catch (error) {
      console.error('Failed to get AI response:', error);
      // Return a fallback response
      return this.getFallbackResponse(context.currentStep, context.problem.subject);
    }
  }

  private parseResponse(
    aiResponse: string,
    step: ScaffoldingStep,
    subject: Subject
  ): {
    content: string;
    hints: string[];
    followUp?: string;
    visualAid?: VisualAid;
  } {
    // Parse structured response
    const contentMatch = aiResponse.match(/CONTENT:\s*([\s\S]*?)(?=HINTS:|VISUAL:|SIMILAR_PROBLEM:|VERIFICATION_STEPS:|FOLLOW_UP:|$)/i);
    const hintsMatch = aiResponse.match(/HINTS:\s*([\s\S]*?)(?=VISUAL:|SIMILAR_PROBLEM:|VERIFICATION_STEPS:|FOLLOW_UP:|$)/i);
    const visualMatch = aiResponse.match(/VISUAL:\s*([\s\S]*?)(?=HINTS:|SIMILAR_PROBLEM:|VERIFICATION_STEPS:|FOLLOW_UP:|$)/i);
    const followUpMatch = aiResponse.match(/FOLLOW_UP:\s*([\s\S]*?)$/i);

    const content = contentMatch?.[1]?.trim() ?? aiResponse;
    const hintsRaw = hintsMatch?.[1]?.trim() ?? '';
    const hints = hintsRaw.split('|').map((h) => h.trim()).filter((h) => h.length > 0);
    const followUp = followUpMatch?.[1]?.trim();

    let visualAid: VisualAid | undefined;
    if (visualMatch?.[1]?.trim()) {
      visualAid = {
        type: this.detectVisualType(visualMatch[1], subject),
        content: visualMatch[1].trim(),
        format: subject === 'MATH' ? 'latex' : 'text',
      };
    }

    return {
      content,
      hints: hints.length > 0 ? hints : this.getDefaultHints(step, subject),
      followUp,
      visualAid,
    };
  }

  private detectVisualType(content: string, subject: Subject): VisualAid['type'] {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('diagram') || lowerContent.includes('draw')) {
      return 'diagram';
    }
    if (lowerContent.includes('graph') || lowerContent.includes('plot')) {
      return 'graph';
    }
    if (lowerContent.includes('table') || lowerContent.includes('chart')) {
      return 'table';
    }
    if (subject === 'MATH' || lowerContent.includes('formula') || lowerContent.includes('equation')) {
      return 'formula';
    }

    return 'example';
  }

  private getDefaultHints(step: ScaffoldingStep, subject: Subject): string[] {
    const subjectHints: Record<Subject, Record<ScaffoldingStep, string[]>> = {
      MATH: {
        1: ['What operation do you think we need?', 'Can you identify the key numbers?'],
        2: ['Remember the order of operations', 'Check the units'],
        3: ['Follow the same steps', 'What comes first?'],
        4: ['Plug your answer back in', 'Does the answer make sense?'],
      },
      SCIENCE: {
        1: ['What do you already know about this topic?', 'What are the key terms?'],
        2: ['Think about cause and effect', 'What variables are involved?'],
        3: ['Apply the scientific method', 'What would you predict?'],
        4: ['Check your reasoning', 'Does this match real-world observations?'],
      },
      ELA: {
        1: ['What is the main idea?', 'Who are the key characters?'],
        2: ['Think about the author\'s purpose', 'Look for context clues'],
        3: ['Use evidence from the text', 'Make connections'],
        4: ['Re-read your answer', 'Did you support your claims?'],
      },
      OTHER: {
        1: ['What do you understand so far?', 'What confuses you?'],
        2: ['Think about what you\'ve learned', 'Break it into smaller parts'],
        3: ['Try a similar approach', 'Work through it step by step'],
        4: ['Review your work', 'Check for errors'],
      },
    };

    return subjectHints[subject]?.[step] ?? subjectHints.OTHER[step];
  }

  private getRelatedConcepts(problem: ExtractedProblem, step: ScaffoldingStep): Concept[] {
    // This would typically query a curriculum database
    // For now, return subject-specific concepts based on problem type

    const concepts: Concept[] = [];

    if (problem.subject === 'MATH') {
      if (problem.problemType?.includes('equation')) {
        concepts.push({
          id: 'algebra-equations',
          name: 'Solving Equations',
          description: 'Finding the value of a variable that makes an equation true',
          subject: 'MATH',
          prerequisites: ['basic-arithmetic', 'variable-understanding'],
          relatedStandards: ['CCSS.MATH.CONTENT.6.EE.B.5'],
        });
      }
      if (problem.problemType?.includes('fraction')) {
        concepts.push({
          id: 'fractions',
          name: 'Fractions',
          description: 'Numbers that represent parts of a whole',
          subject: 'MATH',
          prerequisites: ['division', 'multiplication'],
          relatedStandards: ['CCSS.MATH.CONTENT.3.NF.A.1'],
        });
      }
    }

    if (problem.subject === 'SCIENCE') {
      concepts.push({
        id: 'scientific-method',
        name: 'Scientific Method',
        description: 'A systematic approach to investigating phenomena',
        subject: 'SCIENCE',
        prerequisites: ['observation', 'hypothesis-formation'],
        relatedStandards: ['NGSS.MS-ETS1-1'],
      });
    }

    if (problem.subject === 'ELA') {
      concepts.push({
        id: 'reading-comprehension',
        name: 'Reading Comprehension',
        description: 'Understanding and interpreting written text',
        subject: 'ELA',
        prerequisites: ['vocabulary', 'main-idea'],
        relatedStandards: ['CCSS.ELA-LITERACY.RL.6.1'],
      });
    }

    return concepts;
  }

  private calculateDifficulty(
    problem: ExtractedProblem,
    interactions: Interaction[]
  ): number {
    // Base difficulty on grade band
    let baseDifficulty = 5;
    if (problem.gradeBand === 'K5') baseDifficulty = 3;
    if (problem.gradeBand === 'G9_12') baseDifficulty = 7;

    // Adjust based on problem characteristics
    if (problem.containsMath) baseDifficulty += 1;
    if (problem.problemType?.includes('word-problem')) baseDifficulty += 1;

    // Adjust based on interaction history (more interactions = more difficulty)
    if (interactions.length > 3) baseDifficulty += 1;

    return Math.min(10, Math.max(1, baseDifficulty));
  }

  private canProceedToNextStep(
    currentStep: ScaffoldingStep,
    interactions: Interaction[]
  ): boolean {
    // Can proceed if there's been at least one interaction at this step
    const stepInteractions = interactions.filter((i) => i.step === currentStep);
    return stepInteractions.length > 0;
  }

  private gradeBandToDescription(gradeBand: GradeBand): string {
    switch (gradeBand) {
      case 'K5':
        return 'Kindergarten through 5th Grade';
      case 'G6_8':
        return '6th through 8th Grade';
      case 'G9_12':
        return '9th through 12th Grade';
      default:
        return 'Unknown grade level';
    }
  }

  private getFallbackResponse(step: ScaffoldingStep, subject: Subject): string {
    const fallbacks: Record<ScaffoldingStep, string> = {
      1: `Let's start by understanding the problem. Can you tell me what you think this problem is asking? What parts do you understand, and what parts are confusing?`,
      2: `Let me help you remember some key concepts. For ${subject} problems like this, think about the main ideas and techniques you've learned in class.`,
      3: `Let me show you a similar example. Watch how I solve this related problem, then you can apply the same technique to your homework.`,
      4: `Great work making it this far! Now let's check your answer. Can you walk me through how you got your solution? We'll verify it step by step.`,
    };

    return `CONTENT: ${fallbacks[step]}\nHINTS: Take your time | Think step by step\nFOLLOW_UP: What do you think about that?`;
  }
}

// Export singleton instance
export const scaffoldingEngine = new ScaffoldingEngine();
