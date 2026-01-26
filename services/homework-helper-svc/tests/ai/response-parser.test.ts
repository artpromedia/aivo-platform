import { describe, it, expect } from 'vitest';
import { responseParser } from '../../src/ai/response-parser.js';

describe('ResponseParser', () => {
  describe('parseScaffoldedResponse', () => {
    it('should parse structured response', () => {
      const aiResponse = `CONTENT: Let's start by understanding the problem. What do you know about equations?
HINTS: Think about isolating x | Remember to do the same thing to both sides
FOLLOW_UP: What operation would help us get x by itself?`;

      const result = responseParser.parseScaffoldedResponse(aiResponse, 1);

      expect(result.step).toBe(1);
      expect(result.stepName).toBe('Clarifying Questions');
      expect(result.content).toContain("Let's start");
      expect(result.hints).toContain('Think about isolating x');
      expect(result.hints).toContain('Remember to do the same thing to both sides');
      expect(result.followUp).toContain('What operation');
    });

    it('should parse plain text response', () => {
      const aiResponse =
        "Let's work through this problem together. Can you tell me what you already know about solving equations?";

      const result = responseParser.parseScaffoldedResponse(aiResponse, 1);

      expect(result.content).toBe(aiResponse);
      expect(result.validationWarnings).toContain(
        'Response not in structured format, parsing as plain text'
      );
    });

    it('should detect and sanitize direct answers', () => {
      const aiResponse = `CONTENT: The answer is 3. Just substitute x = 3 into the equation.
HINTS: Check your work`;

      const result = responseParser.parseScaffoldedResponse(aiResponse, 1);

      expect(result.validationWarnings.some((w) => w.includes('direct answers'))).toBe(
        true
      );
      expect(result.content).not.toContain('The answer is 3');
    });

    it('should detect step-specific content issues', () => {
      // Step 1 should have questions
      const noQuestions = 'CONTENT: Let me explain the concept to you.';
      const result1 = responseParser.parseScaffoldedResponse(noQuestions, 1);
      expect(result1.validationWarnings.some((w) => w.includes('questions'))).toBe(true);

      // Step 3 should have worked example
      const noExample = 'CONTENT: You should try doing it yourself.';
      const result3 = responseParser.parseScaffoldedResponse(noExample, 3);
      expect(result3.validationWarnings.some((w) => w.includes('worked example'))).toBe(
        true
      );
    });

    it('should parse visual aid when present', () => {
      const aiResponse = `CONTENT: Here's how to think about fractions.
VISUAL: Draw a circle and divide it into 4 equal parts. Shade 1 part to show 1/4.
HINTS: Use visual models`;

      const result = responseParser.parseScaffoldedResponse(aiResponse, 2);

      expect(result.visualAid).toBeDefined();
      expect(result.visualAid?.content).toContain('circle');
    });
  });

  describe('extractMathSteps', () => {
    it('should extract numbered steps', () => {
      const response = `Step 1: Start with 2x + 5 = 11
Step 2: Subtract 5 from both sides: 2x = 6
Step 3: Divide both sides by 2: x = 3`;

      const steps = responseParser.extractMathSteps(response);

      expect(steps.length).toBe(3);
      expect(steps[0].stepNumber).toBe(1);
      expect(steps[1].expression).toContain('2x = 6');
      expect(steps[2].expression).toContain('x = 3');
    });

    it('should extract steps with different numbering styles', () => {
      const response = `1. First, identify the equation
2. Then, isolate the variable
3. Finally, solve for x`;

      const steps = responseParser.extractMathSteps(response);

      expect(steps.length).toBe(3);
    });

    it('should convert expressions to latex', () => {
      const response = `Step 1: Calculate 1/2 + 1/4`;

      const steps = responseParser.extractMathSteps(response);

      expect(steps[0].latex).toContain('\\frac');
    });

    it('should detect operation type', () => {
      const response = `Step 1: Add 5 + 3
Step 2: Multiply by 2
Step 3: Divide by 4`;

      const steps = responseParser.extractMathSteps(response);

      expect(steps[0].operation).toBe('addition');
      expect(steps[1].operation).toBe('multiplication');
      expect(steps[2].operation).toBe('division');
    });
  });

  describe('validateEducationalContent', () => {
    it('should flag direct answers', () => {
      const result = responseParser.validateEducationalContent(
        'The answer is 5. Just plug it in and you will see.',
        1
      );

      expect(result.containsDirectAnswer).toBe(true);
      expect(result.isValid).toBe(false);
    });

    it('should detect encouraging language', () => {
      const result = responseParser.validateEducationalContent(
        "Great job thinking about this! You're on the right track.",
        1
      );

      expect(result.isEncouraging).toBe(true);
    });

    it('should check age appropriateness', () => {
      const result = responseParser.validateEducationalContent(
        "Let's think about this problem together!",
        1
      );

      expect(result.isAgeAppropriate).toBe(true);
    });

    it('should validate step 1 has questions', () => {
      const withQuestions = 'What do you think this problem is asking?';
      const withoutQuestions = 'Let me explain the concept.';

      const result1 = responseParser.validateEducationalContent(withQuestions, 1);
      const result2 = responseParser.validateEducationalContent(withoutQuestions, 1);

      expect(result1.warnings.some((w) => w.includes('questions'))).toBe(false);
      expect(result2.warnings.some((w) => w.includes('questions'))).toBe(true);
    });
  });

  describe('parseFeedbackResponse', () => {
    it('should parse structured feedback', () => {
      const response = `FEEDBACK: Great effort! You're showing good understanding.
UNDERSTANDING_LEVEL: 4
RECOMMENDATION: ADVANCE
NEXT_PROMPT: Now try applying this to your original problem.`;

      const result = responseParser.parseFeedbackResponse(response);

      expect(result.feedback).toContain('Great effort');
      expect(result.understandingLevel).toBe(4);
      expect(result.recommendation).toBe('ADVANCE');
      expect(result.nextPrompt).toContain('original problem');
      expect(result.isValid).toBe(true);
    });

    it('should default understanding level when not provided', () => {
      const response = 'Good job thinking about this!';

      const result = responseParser.parseFeedbackResponse(response);

      expect(result.understandingLevel).toBe(3); // Default
    });

    it('should default recommendation when not provided', () => {
      const response = 'Keep working on it!';

      const result = responseParser.parseFeedbackResponse(response);

      expect(result.recommendation).toBe('CONTINUE'); // Default
    });
  });

  describe('parseSimilarProblemResponse', () => {
    it('should parse structured similar problem', () => {
      const response = `PROBLEM: Solve for y: 3y + 7 = 22
CONCEPT: Solving linear equations with one variable
SOLUTION_APPROACH: Subtract 7, then divide by 3`;

      const result = responseParser.parseSimilarProblemResponse(response);

      expect(result.problem).toContain('3y + 7 = 22');
      expect(result.concept).toContain('linear equations');
      expect(result.solutionApproach).toContain('Subtract');
      expect(result.isValid).toBe(true);
    });

    it('should be invalid without problem', () => {
      const response = `CONCEPT: Algebra
SOLUTION_APPROACH: Solve step by step`;

      const result = responseParser.parseSimilarProblemResponse(response);

      expect(result.isValid).toBe(false);
    });
  });

  describe('parseHintResponse', () => {
    it('should parse structured hint', () => {
      const response = `HINT: Try subtracting 5 from both sides first.
THINKING_PROMPT: What would that leave you with?`;

      const result = responseParser.parseHintResponse(response);

      expect(result.hint).toContain('subtracting 5');
      expect(result.thinkingPrompt).toContain('What would');
      expect(result.isValid).toBe(true);
    });

    it('should parse plain text as hint', () => {
      const response = 'Think about what operation comes first.';

      const result = responseParser.parseHintResponse(response);

      expect(result.hint).toBe(response);
      expect(result.isValid).toBe(true);
    });
  });
});
