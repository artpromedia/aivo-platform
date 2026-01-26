/**
 * Homework Prompt Builder
 * Builds prompts for AI-powered homework assistance with scaffolding support
 */

import type { Subject, GradeBand } from '../types/aiContract.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ExtractedProblem {
  rawText: string;
  subject: Subject;
  gradeBand: GradeBand;
  problemType?: string;
  containsMath?: boolean;
  mathExpressions?: Array<{ raw: string; latex?: string }>;
  isHandwritten?: boolean;
}

export interface LearnerContext {
  learnerId: string;
  gradeLevel?: number;
  previousInteractions?: Interaction[];
  strengths?: string[];
  areasForImprovement?: string[];
  preferredLearningStyle?: 'visual' | 'verbal' | 'kinesthetic';
}

export interface Interaction {
  step: number;
  userResponse: string;
  aiResponse: string;
  timestamp: Date;
}

export interface CurriculumStandard {
  id: string;
  name: string;
  description: string;
  gradeLevel: string;
  subject: Subject;
}

export type DifficultyLevel = 'easier' | 'same' | 'harder';

export interface ScaffoldingStep {
  step: 1 | 2 | 3 | 4;
  name: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROMPT TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

const GRADE_BAND_DESCRIPTIONS: Record<GradeBand, string> = {
  K5: 'elementary school student (Kindergarten through 5th grade)',
  G6_8: 'middle school student (6th through 8th grade)',
  G9_12: 'high school student (9th through 12th grade)',
};

const SUBJECT_CONTEXT: Record<Subject, string> = {
  MATH: 'mathematics, focusing on problem-solving strategies and conceptual understanding',
  SCIENCE: 'science, emphasizing the scientific method and evidence-based reasoning',
  ELA: 'English Language Arts, focusing on reading comprehension, writing, and communication skills',
  OTHER: 'general academic subjects',
};

const SCAFFOLDING_STEPS: Record<1 | 2 | 3 | 4, { name: string; focus: string; instructions: string }> = {
  1: {
    name: 'Clarifying Questions',
    focus: 'understanding what the student knows and doesn\'t know',
    instructions: `
- Ask 2-3 probing questions to understand the student's current knowledge
- Identify specific gaps in understanding
- DO NOT give any hints toward the answer
- Focus on what the problem is asking and what concepts are involved
- Help the student articulate what they're confused about`,
  },
  2: {
    name: 'Concept Hints',
    focus: 'providing relevant concept reminders without solving the problem',
    instructions: `
- Review the key concepts needed to solve this problem
- Provide relevant formulas, definitions, or procedures as reminders
- Link to grade-appropriate curriculum standards
- Offer visual aids or memory tricks if applicable
- DO NOT solve the problem or give away the answer
- Encourage the student to apply these concepts`,
  },
  3: {
    name: 'Worked Example',
    focus: 'demonstrating problem-solving through a similar problem',
    instructions: `
- Create a SIMILAR but DIFFERENT problem to the original
- Walk through solving this new problem step-by-step
- Explain your reasoning at each step
- Highlight key techniques and common mistakes to avoid
- Make the example problem slightly easier than the original
- Ask the student to apply the same technique to their problem
- DO NOT solve the original problem`,
  },
  4: {
    name: 'Solution Verification',
    focus: 'guiding the student to check their own work',
    instructions: `
- Ask the student to share their work or answer
- Provide strategies to verify the solution
- Guide them through checking each step
- If incorrect, help identify where the error occurred without giving the answer
- If correct, confirm their success and celebrate
- Suggest ways to check similar problems in the future`,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class HomeworkPromptBuilder {
  /**
   * Build a scaffolding prompt for homework help
   */
  buildScaffoldingPrompt(
    problem: ExtractedProblem,
    step: 1 | 2 | 3 | 4,
    learnerContext: LearnerContext,
    curriculumStandards?: CurriculumStandard[]
  ): string {
    const stepInfo = SCAFFOLDING_STEPS[step];
    const gradeDescription = GRADE_BAND_DESCRIPTIONS[problem.gradeBand];
    const subjectContext = SUBJECT_CONTEXT[problem.subject];

    let prompt = `You are an expert educational tutor helping a ${gradeDescription} with ${subjectContext}.

## Current Step: Step ${step} - ${stepInfo.name}
Focus: ${stepInfo.focus}

## Core Principles
- NEVER give the answer directly
- Use the Socratic method - guide through questions
- Adapt language to the student's grade level
- Be encouraging but honest
- Focus on building understanding, not just solving

## The Student's Problem
${problem.rawText}

${problem.problemType ? `Problem Type: ${problem.problemType}` : ''}
${problem.containsMath ? 'This problem involves mathematical content.' : ''}
${problem.mathExpressions?.length ? `Detected expressions: ${problem.mathExpressions.map((e) => e.latex ?? e.raw).join(', ')}` : ''}

## Step ${step} Instructions
${stepInfo.instructions}
`;

    // Add learner context if available
    if (learnerContext.previousInteractions?.length) {
      prompt += `
## Previous Interactions in This Session
${this.formatInteractions(learnerContext.previousInteractions)}
`;
    }

    if (learnerContext.strengths?.length || learnerContext.areasForImprovement?.length) {
      prompt += `
## Learner Profile
${learnerContext.strengths?.length ? `Strengths: ${learnerContext.strengths.join(', ')}` : ''}
${learnerContext.areasForImprovement?.length ? `Areas for improvement: ${learnerContext.areasForImprovement.join(', ')}` : ''}
${learnerContext.preferredLearningStyle ? `Preferred learning style: ${learnerContext.preferredLearningStyle}` : ''}
`;
    }

    // Add curriculum standards if provided
    if (curriculumStandards?.length) {
      prompt += `
## Relevant Curriculum Standards
${curriculumStandards.map((s) => `- ${s.id}: ${s.name} - ${s.description}`).join('\n')}
`;
    }

    // Add output format instructions
    prompt += `
## Response Format
Structure your response as follows:
1. A warm, encouraging opening (1 sentence)
2. ${this.getStepSpecificFormat(step)}
3. A closing that invites the student to continue

Keep your response:
- Age-appropriate for ${gradeDescription}
- Clear and easy to follow
- Encouraging but academically rigorous
- Free of direct answers

Respond now:`;

    return prompt;
  }

  /**
   * Build a prompt to generate a similar practice problem
   */
  buildSimilarProblemPrompt(
    originalProblem: ExtractedProblem,
    difficulty: DifficultyLevel
  ): string {
    const gradeDescription = GRADE_BAND_DESCRIPTIONS[originalProblem.gradeBand];
    const subjectContext = SUBJECT_CONTEXT[originalProblem.subject];

    const difficultyInstructions: Record<DifficultyLevel, string> = {
      easier: `Make this problem EASIER than the original:
- Use smaller numbers
- Involve fewer steps
- Remove one layer of complexity
- Keep the same concept but simplify the application`,
      same: `Make this problem of SIMILAR difficulty:
- Use different numbers but similar magnitude
- Keep the same number of steps
- Test the same concept in a different context`,
      harder: `Make this problem slightly HARDER:
- Use larger or more complex numbers
- Add one additional step
- Combine concepts if appropriate
- Introduce a minor twist or variation`,
    };

    return `You are creating a practice problem for a ${gradeDescription} studying ${subjectContext}.

## Original Problem
${originalProblem.rawText}

${originalProblem.problemType ? `Problem Type: ${originalProblem.problemType}` : ''}

## Your Task
Create a SIMILAR practice problem that tests the same concepts.

## Difficulty Adjustment
${difficultyInstructions[difficulty]}

## Requirements
1. The problem must test the SAME underlying concept
2. Use different numbers, context, or scenario
3. Ensure the problem is solvable
4. Make it realistic and relatable for the grade level
5. Include any necessary given information

## Output Format
PROBLEM:
[Write the new problem here]

CONCEPT:
[Briefly state the concept being tested]

SOLUTION_APPROACH:
[Briefly describe how to solve this - for teacher reference, not to be shown to student]

Generate the practice problem now:`;
  }

  /**
   * Build a prompt for generating feedback on a student's response
   */
  buildFeedbackPrompt(
    problem: ExtractedProblem,
    studentResponse: string,
    step: 1 | 2 | 3 | 4
  ): string {
    const gradeDescription = GRADE_BAND_DESCRIPTIONS[problem.gradeBand];
    const stepInfo = SCAFFOLDING_STEPS[step];

    return `You are an educational tutor providing feedback to a ${gradeDescription}.

## Original Problem
${problem.rawText}

## Current Step: ${step} - ${stepInfo.name}

## Student's Response
"${studentResponse}"

## Your Task
Provide constructive feedback that:
1. Acknowledges what the student did well
2. Gently identifies any misunderstandings
3. Guides toward better understanding without giving answers
4. Encourages continued effort

## Guidelines
- Be warm and supportive
- Point out specific strengths in their thinking
- If they're on the wrong track, ask guiding questions
- If they're correct, confirm and reinforce
- Never be discouraging or dismissive
- Use age-appropriate language

## Determine Next Step
Based on their response, recommend:
- CONTINUE: Stay at current step if more work needed
- ADVANCE: Move to next step if ready
- REPEAT: Revisit previous step if struggling

## Response Format
FEEDBACK:
[Your encouraging feedback here]

UNDERSTANDING_LEVEL: [1-5, where 1=struggling, 5=mastered]

RECOMMENDATION: [CONTINUE/ADVANCE/REPEAT]

NEXT_PROMPT:
[If continuing, what question or prompt should come next]

Provide feedback now:`;
  }

  /**
   * Build a prompt for summarizing a completed homework session
   */
  buildSessionSummaryPrompt(
    problem: ExtractedProblem,
    interactions: Interaction[],
    learnerContext: LearnerContext
  ): string {
    const gradeDescription = GRADE_BAND_DESCRIPTIONS[problem.gradeBand];

    return `You are creating a learning summary for a ${gradeDescription} who just completed a homework help session.

## Problem Worked On
${problem.rawText}

## Session Interactions
${this.formatInteractions(interactions)}

## Your Task
Create a helpful summary that:
1. Celebrates the student's effort and progress
2. Highlights key concepts they learned or practiced
3. Notes areas that might need more practice
4. Provides 1-2 tips for similar problems in the future

## Guidelines
- Be encouraging and positive
- Focus on growth and learning
- Make it actionable for future study
- Keep it brief and age-appropriate

## Response Format
SUMMARY:
[2-3 sentence celebration of their effort]

CONCEPTS_PRACTICED:
[Bullet list of key concepts]

AREAS_TO_REVIEW:
[Any topics that might benefit from more practice]

TIPS_FOR_NEXT_TIME:
[1-2 practical tips for similar problems]

Create the summary now:`;
  }

  /**
   * Build a hint prompt for when a student is stuck
   */
  buildHintPrompt(
    problem: ExtractedProblem,
    hintLevel: 1 | 2 | 3,
    previousHints: string[]
  ): string {
    const gradeDescription = GRADE_BAND_DESCRIPTIONS[problem.gradeBand];

    const hintLevelDescriptions = {
      1: 'a gentle nudge in the right direction without revealing strategy',
      2: 'a more specific hint about the approach to take',
      3: 'a detailed hint that guides toward the first step, but still doesn\'t give the answer',
    };

    return `You are helping a stuck ${gradeDescription} with their homework.

## Problem
${problem.rawText}

${previousHints.length > 0 ? `## Hints Already Given\n${previousHints.map((h, i) => `Hint ${i + 1}: ${h}`).join('\n')}` : ''}

## Your Task
Provide a Level ${hintLevel} hint: ${hintLevelDescriptions[hintLevel]}

## Guidelines
- NEVER give the answer
- Build on any previous hints
- Be encouraging
- Make the hint actionable
- Keep it brief and clear

## Response Format
HINT:
[Your hint here - 1-2 sentences]

THINKING_PROMPT:
[A question to help them think about the hint]

Provide the hint now:`;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private formatInteractions(interactions: Interaction[]): string {
    if (interactions.length === 0) return 'No previous interactions.';

    return interactions
      .map(
        (i) => `Step ${i.step}:
Student: "${i.userResponse}"
Tutor: "${i.aiResponse.substring(0, 200)}${i.aiResponse.length > 200 ? '...' : ''}"`
      )
      .join('\n\n');
  }

  private getStepSpecificFormat(step: 1 | 2 | 3 | 4): string {
    switch (step) {
      case 1:
        return '2-3 thoughtful questions to understand what the student knows';
      case 2:
        return 'Relevant concept reminders and how they apply to this problem';
      case 3:
        return 'A worked example of a similar (but different) problem';
      case 4:
        return 'Verification strategies and checking guidance';
      default:
        return 'Your educational guidance';
    }
  }
}

// Export singleton instance
export const homeworkPromptBuilder = new HomeworkPromptBuilder();
