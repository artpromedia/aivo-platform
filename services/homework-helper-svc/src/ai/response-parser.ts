/**
 * AI Response Parser
 * Parses and validates AI responses for homework assistance
 */

import type { Subject, GradeBand } from '../types/aiContract.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ScaffoldedResponse {
  step: number;
  stepName: string;
  content: string;
  hints: string[];
  questions?: string[];
  conceptsReferenced?: string[];
  workedExample?: WorkedExample;
  verificationSteps?: string[];
  followUp?: string;
  isValid: boolean;
  validationWarnings: string[];
}

export interface WorkedExample {
  problem: string;
  steps: MathStep[];
  concept: string;
}

export interface MathStep {
  stepNumber: number;
  expression: string;
  latex?: string;
  explanation: string;
  operation?: string;
}

export interface FeedbackResponse {
  feedback: string;
  understandingLevel: number;
  recommendation: 'CONTINUE' | 'ADVANCE' | 'REPEAT';
  nextPrompt?: string;
  isValid: boolean;
}

export interface SimilarProblemResponse {
  problem: string;
  concept: string;
  solutionApproach: string;
  isValid: boolean;
}

export interface HintResponse {
  hint: string;
  thinkingPrompt?: string;
  isValid: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  containsDirectAnswer: boolean;
  isAgeAppropriate: boolean;
  isEncouraging: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// PARSER PATTERNS
// ══════════════════════════════════════════════════════════════════════════════

const SECTION_PATTERNS = {
  content: /CONTENT:\s*([\s\S]*?)(?=HINTS?:|QUESTIONS?:|CONCEPTS?:|WORKED_EXAMPLE:|VERIFICATION|FOLLOW_UP:|$)/i,
  hints: /HINTS?:\s*([\s\S]*?)(?=CONTENT:|QUESTIONS?:|CONCEPTS?:|WORKED_EXAMPLE:|VERIFICATION|FOLLOW_UP:|$)/i,
  questions: /QUESTIONS?:\s*([\s\S]*?)(?=CONTENT:|HINTS?:|CONCEPTS?:|WORKED_EXAMPLE:|VERIFICATION|FOLLOW_UP:|$)/i,
  concepts: /CONCEPTS?(?:_REFERENCED)?:\s*([\s\S]*?)(?=CONTENT:|HINTS?:|QUESTIONS?:|WORKED_EXAMPLE:|VERIFICATION|FOLLOW_UP:|$)/i,
  workedExample: /WORKED_EXAMPLE:\s*([\s\S]*?)(?=CONTENT:|HINTS?:|QUESTIONS?:|CONCEPTS?:|VERIFICATION|FOLLOW_UP:|$)/i,
  verification: /VERIFICATION(?:_STEPS)?:\s*([\s\S]*?)(?=CONTENT:|HINTS?:|QUESTIONS?:|CONCEPTS?:|WORKED_EXAMPLE:|FOLLOW_UP:|$)/i,
  followUp: /FOLLOW_UP:\s*([\s\S]*?)$/i,
  feedback: /FEEDBACK:\s*([\s\S]*?)(?=UNDERSTANDING_LEVEL:|RECOMMENDATION:|NEXT_PROMPT:|$)/i,
  understandingLevel: /UNDERSTANDING_LEVEL:\s*(\d)/i,
  recommendation: /RECOMMENDATION:\s*(CONTINUE|ADVANCE|REPEAT)/i,
  nextPrompt: /NEXT_PROMPT:\s*([\s\S]*?)$/i,
  problem: /PROBLEM:\s*([\s\S]*?)(?=CONCEPT:|SOLUTION_APPROACH:|$)/i,
  concept: /CONCEPT:\s*([\s\S]*?)(?=PROBLEM:|SOLUTION_APPROACH:|$)/i,
  solutionApproach: /SOLUTION_APPROACH:\s*([\s\S]*?)$/i,
  hint: /HINT:\s*([\s\S]*?)(?=THINKING_PROMPT:|$)/i,
  thinkingPrompt: /THINKING_PROMPT:\s*([\s\S]*?)$/i,
};

// Patterns that might indicate a direct answer
const DIRECT_ANSWER_PATTERNS = [
  /the answer is/i,
  /the solution is/i,
  /equals?\s*\d+/i,
  /x\s*=\s*\d+/i,
  /therefore,?\s*(?:the|it)\s+(?:is|equals)/i,
  /so the (?:answer|result|solution) is/i,
  /this gives us the answer/i,
  /the correct answer is/i,
];

// Patterns for encouraging language
const ENCOURAGING_PATTERNS = [
  /great|excellent|good|nice|well done|fantastic/i,
  /you(?:'re|\s+are)\s+(?:on\s+the\s+)?right\s+track/i,
  /keep\s+(?:going|trying|it\s+up)/i,
  /you\s+can\s+do\s+(?:this|it)/i,
  /let(?:'s|\s+us)\s+(?:think|work)\s+(?:about|through)/i,
  /that's a good (?:start|question|observation)/i,
];

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE PARSER CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class ResponseParser {
  /**
   * Parse a scaffolded response from AI
   */
  parseScaffoldedResponse(aiResponse: string, step: number): ScaffoldedResponse {
    const warnings: string[] = [];

    // Try structured parsing first
    const contentMatch = aiResponse.match(SECTION_PATTERNS.content);
    const hintsMatch = aiResponse.match(SECTION_PATTERNS.hints);
    const questionsMatch = aiResponse.match(SECTION_PATTERNS.questions);
    const conceptsMatch = aiResponse.match(SECTION_PATTERNS.concepts);
    const workedExampleMatch = aiResponse.match(SECTION_PATTERNS.workedExample);
    const verificationMatch = aiResponse.match(SECTION_PATTERNS.verification);
    const followUpMatch = aiResponse.match(SECTION_PATTERNS.followUp);

    // Get content (use full response if not structured)
    let content = contentMatch?.[1]?.trim() ?? aiResponse.trim();

    // If structured markers weren't found, the response is just plain text
    if (!contentMatch && !hintsMatch && !questionsMatch) {
      warnings.push('Response not in structured format, parsing as plain text');
    }

    // Parse hints
    const hints = this.parseListItems(hintsMatch?.[1] ?? '');

    // Parse questions
    const questions = this.parseListItems(questionsMatch?.[1] ?? '');

    // Parse concepts
    const conceptsReferenced = this.parseListItems(conceptsMatch?.[1] ?? '');

    // Parse worked example (for step 3)
    const workedExample = workedExampleMatch
      ? this.parseWorkedExample(workedExampleMatch[1])
      : undefined;

    // Parse verification steps (for step 4)
    const verificationSteps = this.parseListItems(verificationMatch?.[1] ?? '');

    // Parse follow-up
    const followUp = followUpMatch?.[1]?.trim();

    // Validate the response
    const validation = this.validateEducationalContent(aiResponse, step);

    if (!validation.isValid) {
      warnings.push(...validation.warnings);
    }

    if (validation.containsDirectAnswer) {
      content = this.sanitizeDirectAnswers(content);
      warnings.push('Removed potential direct answers from response');
    }

    const stepNames = {
      1: 'Clarifying Questions',
      2: 'Concept Hints',
      3: 'Worked Example',
      4: 'Solution Verification',
    };

    return {
      step,
      stepName: stepNames[step as 1 | 2 | 3 | 4] ?? 'Unknown Step',
      content,
      hints,
      questions: questions.length > 0 ? questions : undefined,
      conceptsReferenced: conceptsReferenced.length > 0 ? conceptsReferenced : undefined,
      workedExample,
      verificationSteps: verificationSteps.length > 0 ? verificationSteps : undefined,
      followUp,
      isValid: validation.isValid,
      validationWarnings: warnings,
    };
  }

  /**
   * Extract math steps from AI response
   */
  extractMathSteps(aiResponse: string): MathStep[] {
    const steps: MathStep[] = [];

    // Pattern for numbered steps: "Step 1:" or "1." or "1)"
    const stepPattern = /(?:step\s*)?(\d+)[.):]\s*([\s\S]*?)(?=(?:step\s*)?\d+[.)]:|$)/gi;

    let match;
    while ((match = stepPattern.exec(aiResponse)) !== null) {
      const stepNumber = Number.parseInt(match[1], 10);
      const stepContent = match[2].trim();

      // Extract expression (looks for math patterns)
      const expressionMatch = stepContent.match(/([^:]+?)(?:[:=]|$)/);
      const expression = expressionMatch?.[1]?.trim() ?? stepContent.split('\n')[0];

      // Extract explanation (rest of the content)
      const explanation = stepContent.replace(expression, '').trim() ||
        'Perform this calculation';

      // Try to convert to LaTeX
      const latex = this.convertToLatex(expression);

      steps.push({
        stepNumber,
        expression,
        latex,
        explanation: explanation.replace(/^[:\s-]+/, ''),
        operation: this.detectOperation(expression),
      });
    }

    // If no numbered steps found, try to extract from paragraphs
    if (steps.length === 0) {
      const paragraphs = aiResponse.split(/\n\n+/);
      paragraphs.forEach((para, index) => {
        if (this.containsMathExpression(para)) {
          steps.push({
            stepNumber: index + 1,
            expression: this.extractMathExpression(para),
            explanation: para,
          });
        }
      });
    }

    return steps;
  }

  /**
   * Validate educational content
   */
  validateEducationalContent(response: string, step: number): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for direct answers
    const containsDirectAnswer = DIRECT_ANSWER_PATTERNS.some((pattern) =>
      pattern.test(response)
    );

    if (containsDirectAnswer) {
      warnings.push('Response may contain direct answers');
    }

    // Check for encouraging language
    const isEncouraging = ENCOURAGING_PATTERNS.some((pattern) =>
      pattern.test(response)
    );

    if (!isEncouraging) {
      warnings.push('Response could be more encouraging');
    }

    // Check for age-appropriate content
    const isAgeAppropriate = this.checkAgeAppropriateness(response);

    if (!isAgeAppropriate) {
      warnings.push('Some language may not be age-appropriate');
    }

    // Step-specific validation
    switch (step) {
      case 1:
        if (!response.includes('?')) {
          warnings.push('Step 1 should include clarifying questions');
        }
        break;
      case 2:
        if (!this.containsConceptualContent(response)) {
          warnings.push('Step 2 should include concept explanations');
        }
        break;
      case 3:
        if (!this.containsWorkedExample(response)) {
          warnings.push('Step 3 should include a worked example');
        }
        break;
      case 4:
        if (!this.containsVerificationGuidance(response)) {
          warnings.push('Step 4 should include verification strategies');
        }
        break;
    }

    // Determine overall validity
    const isValid = errors.length === 0 && !containsDirectAnswer;

    return {
      isValid,
      warnings,
      errors,
      containsDirectAnswer,
      isAgeAppropriate,
      isEncouraging,
    };
  }

  /**
   * Parse feedback response
   */
  parseFeedbackResponse(aiResponse: string): FeedbackResponse {
    const feedbackMatch = aiResponse.match(SECTION_PATTERNS.feedback);
    const understandingMatch = aiResponse.match(SECTION_PATTERNS.understandingLevel);
    const recommendationMatch = aiResponse.match(SECTION_PATTERNS.recommendation);
    const nextPromptMatch = aiResponse.match(SECTION_PATTERNS.nextPrompt);

    const feedback = feedbackMatch?.[1]?.trim() ?? aiResponse.trim();
    const understandingLevel = understandingMatch
      ? Number.parseInt(understandingMatch[1], 10)
      : 3;
    const recommendation = (recommendationMatch?.[1] as 'CONTINUE' | 'ADVANCE' | 'REPEAT') ?? 'CONTINUE';
    const nextPrompt = nextPromptMatch?.[1]?.trim();

    return {
      feedback,
      understandingLevel,
      recommendation,
      nextPrompt,
      isValid: feedback.length > 0,
    };
  }

  /**
   * Parse similar problem response
   */
  parseSimilarProblemResponse(aiResponse: string): SimilarProblemResponse {
    const problemMatch = aiResponse.match(SECTION_PATTERNS.problem);
    const conceptMatch = aiResponse.match(SECTION_PATTERNS.concept);
    const solutionMatch = aiResponse.match(SECTION_PATTERNS.solutionApproach);

    return {
      problem: problemMatch?.[1]?.trim() ?? '',
      concept: conceptMatch?.[1]?.trim() ?? '',
      solutionApproach: solutionMatch?.[1]?.trim() ?? '',
      isValid: !!(problemMatch?.[1]),
    };
  }

  /**
   * Parse hint response
   */
  parseHintResponse(aiResponse: string): HintResponse {
    const hintMatch = aiResponse.match(SECTION_PATTERNS.hint);
    const thinkingMatch = aiResponse.match(SECTION_PATTERNS.thinkingPrompt);

    return {
      hint: hintMatch?.[1]?.trim() ?? aiResponse.trim(),
      thinkingPrompt: thinkingMatch?.[1]?.trim(),
      isValid: !!(hintMatch?.[1] || aiResponse.trim()),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private parseListItems(text: string): string[] {
    if (!text) return [];

    // Split by pipe, bullet points, numbers, or newlines
    const items = text
      .split(/\||\n[-*•]|\n\d+[.)]/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    // If only one item, try splitting by numbered patterns
    if (items.length === 1 && text.includes('\n')) {
      return text
        .split('\n')
        .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
        .filter((line) => line.length > 0);
    }

    return items;
  }

  private parseWorkedExample(text: string): WorkedExample | undefined {
    if (!text) return undefined;

    // Try to extract problem statement
    const problemMatch = text.match(/problem:?\s*([\s\S]*?)(?=solution:|steps?:|$)/i);
    const stepsMatch = text.match(/(?:solution|steps?):?\s*([\s\S]*?)$/i);

    const problem = problemMatch?.[1]?.trim() ?? text.split('\n')[0];
    const stepsText = stepsMatch?.[1] ?? text;
    const steps = this.extractMathSteps(stepsText);

    return {
      problem,
      steps: steps.length > 0 ? steps : [{
        stepNumber: 1,
        expression: '',
        explanation: stepsText,
      }],
      concept: 'Similar problem practice',
    };
  }

  private convertToLatex(expression: string): string {
    let latex = expression;

    // Fractions
    latex = latex.replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}');

    // Exponents
    latex = latex.replace(/\^(\d+)/g, '^{$1}');

    // Multiplication
    latex = latex.replace(/\*/g, '\\times ');
    latex = latex.replace(/×/g, '\\times ');

    // Square roots
    latex = latex.replace(/sqrt\(([^)]+)\)/gi, '\\sqrt{$1}');
    latex = latex.replace(/√(\d+)/g, '\\sqrt{$1}');

    // Greek letters
    latex = latex.replace(/\bpi\b/gi, '\\pi');
    latex = latex.replace(/\btheta\b/gi, '\\theta');

    return latex;
  }

  private detectOperation(expression: string): string | undefined {
    if (/[+]/.test(expression)) return 'addition';
    if (/[-−]/.test(expression)) return 'subtraction';
    if (/[*×]/.test(expression)) return 'multiplication';
    if (/[/÷]/.test(expression)) return 'division';
    if (/\^/.test(expression)) return 'exponentiation';
    if (/√|sqrt/i.test(expression)) return 'square root';
    if (/=/.test(expression)) return 'equation';
    return undefined;
  }

  private containsMathExpression(text: string): boolean {
    return /[\d+\-*/×÷=^√]/.test(text) ||
           /\b(?:sin|cos|tan|log|sqrt)\b/i.test(text);
  }

  private extractMathExpression(text: string): string {
    // Extract first math-like expression from text
    const match = text.match(/[\d+\-*/×÷=^√()[\]{}]+(?:\s*[\d+\-*/×÷=^√()[\]{}]+)*/);
    return match?.[0] ?? '';
  }

  private sanitizeDirectAnswers(content: string): string {
    // Replace sentences that appear to contain direct answers
    let sanitized = content;

    for (const pattern of DIRECT_ANSWER_PATTERNS) {
      const match = sanitized.match(pattern);
      if (match) {
        // Find the sentence containing the match
        const sentencePattern = new RegExp(`[^.!?]*${match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.!?]*[.!?]`, 'i');
        sanitized = sanitized.replace(sentencePattern, 'What do you think the next step should be?');
      }
    }

    return sanitized;
  }

  private checkAgeAppropriateness(text: string): boolean {
    // Check for complex vocabulary that might be inappropriate
    const complexPatterns = [
      /\b(?:ergo|heretofore|notwithstanding|ipso facto)\b/i,
      /\b(?:paradigm|epistemological|ontological)\b/i,
    ];

    return !complexPatterns.some((pattern) => pattern.test(text));
  }

  private containsConceptualContent(text: string): boolean {
    const conceptualIndicators = [
      /\b(?:concept|definition|formula|theorem|principle|rule|law)\b/i,
      /\b(?:remember|recall|means|defined as|refers to)\b/i,
      /\b(?:think of|consider|imagine|visualize)\b/i,
    ];

    return conceptualIndicators.some((pattern) => pattern.test(text));
  }

  private containsWorkedExample(text: string): boolean {
    const exampleIndicators = [
      /\b(?:example|let's try|similar problem|practice)\b/i,
      /\b(?:step 1|first|then|next|finally)\b/i,
      /\b(?:solve|calculate|find|determine)\b/i,
    ];

    return exampleIndicators.some((pattern) => pattern.test(text));
  }

  private containsVerificationGuidance(text: string): boolean {
    const verificationIndicators = [
      /\b(?:check|verify|confirm|test|validate)\b/i,
      /\b(?:plug in|substitute|makes sense)\b/i,
      /\b(?:correct|right|accurate|matches)\b/i,
    ];

    return verificationIndicators.some((pattern) => pattern.test(text));
  }
}

// Export singleton instance
export const responseParser = new ResponseParser();
