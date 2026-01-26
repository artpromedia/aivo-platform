import { describe, it, expect } from 'vitest';
import { homeworkPromptBuilder } from '../../src/ai/prompt-builder.js';

describe('HomeworkPromptBuilder', () => {
  describe('buildScaffoldingPrompt', () => {
    const baseProblem = {
      rawText: 'Solve for x: 2x + 5 = 11',
      subject: 'MATH' as const,
      gradeBand: 'G6_8' as const,
    };

    const baseLearnerContext = {
      learnerId: 'learner-1',
    };

    it('should build prompt for step 1 (Clarifying Questions)', () => {
      const prompt = homeworkPromptBuilder.buildScaffoldingPrompt(
        baseProblem,
        1,
        baseLearnerContext
      );

      expect(prompt).toContain('Step 1');
      expect(prompt).toContain('Clarifying Questions');
      expect(prompt).toContain('NEVER give the answer');
      expect(prompt).toContain('probing questions');
    });

    it('should build prompt for step 2 (Concept Hints)', () => {
      const prompt = homeworkPromptBuilder.buildScaffoldingPrompt(
        baseProblem,
        2,
        baseLearnerContext
      );

      expect(prompt).toContain('Step 2');
      expect(prompt).toContain('Concept Hints');
      expect(prompt).toContain('formulas');
    });

    it('should build prompt for step 3 (Worked Example)', () => {
      const prompt = homeworkPromptBuilder.buildScaffoldingPrompt(
        baseProblem,
        3,
        baseLearnerContext
      );

      expect(prompt).toContain('Step 3');
      expect(prompt).toContain('Worked Example');
      expect(prompt).toContain('SIMILAR but DIFFERENT');
    });

    it('should build prompt for step 4 (Solution Verification)', () => {
      const prompt = homeworkPromptBuilder.buildScaffoldingPrompt(
        baseProblem,
        4,
        baseLearnerContext
      );

      expect(prompt).toContain('Step 4');
      expect(prompt).toContain('Solution Verification');
      expect(prompt).toContain('verify');
    });

    it('should include grade level description', () => {
      const prompt = homeworkPromptBuilder.buildScaffoldingPrompt(
        baseProblem,
        1,
        baseLearnerContext
      );

      expect(prompt).toContain('middle school');
    });

    it('should include previous interactions when provided', () => {
      const learnerWithInteractions = {
        ...baseLearnerContext,
        previousInteractions: [
          {
            step: 1,
            userResponse: "I don't understand",
            aiResponse: 'Let me help you',
            timestamp: new Date(),
          },
        ],
      };

      const prompt = homeworkPromptBuilder.buildScaffoldingPrompt(
        baseProblem,
        2,
        learnerWithInteractions
      );

      expect(prompt).toContain('Previous Interactions');
      expect(prompt).toContain("I don't understand");
    });

    it('should include learner profile when provided', () => {
      const learnerWithProfile = {
        ...baseLearnerContext,
        strengths: ['algebra', 'problem-solving'],
        areasForImprovement: ['fractions'],
        preferredLearningStyle: 'visual' as const,
      };

      const prompt = homeworkPromptBuilder.buildScaffoldingPrompt(
        baseProblem,
        1,
        learnerWithProfile
      );

      expect(prompt).toContain('Learner Profile');
      expect(prompt).toContain('algebra');
      expect(prompt).toContain('visual');
    });

    it('should include curriculum standards when provided', () => {
      const standards = [
        {
          id: 'CCSS.MATH.6.EE.7',
          name: 'Solve equations',
          description: 'Solve real-world problems by writing equations',
          gradeLevel: '6',
          subject: 'MATH' as const,
        },
      ];

      const prompt = homeworkPromptBuilder.buildScaffoldingPrompt(
        baseProblem,
        2,
        baseLearnerContext,
        standards
      );

      expect(prompt).toContain('Curriculum Standards');
      expect(prompt).toContain('CCSS.MATH.6.EE.7');
    });

    it('should include math indicators for math problems', () => {
      const mathProblem = {
        ...baseProblem,
        containsMath: true,
        mathExpressions: [{ raw: '2x + 5 = 11', latex: '2x + 5 = 11' }],
      };

      const prompt = homeworkPromptBuilder.buildScaffoldingPrompt(
        mathProblem,
        1,
        baseLearnerContext
      );

      expect(prompt).toContain('mathematical');
    });
  });

  describe('buildSimilarProblemPrompt', () => {
    const problem = {
      rawText: 'Solve for x: 2x + 5 = 11',
      subject: 'MATH' as const,
      gradeBand: 'G6_8' as const,
      problemType: 'equation',
    };

    it('should build prompt for easier difficulty', () => {
      const prompt = homeworkPromptBuilder.buildSimilarProblemPrompt(problem, 'easier');

      expect(prompt).toContain('EASIER');
      expect(prompt).toContain('smaller numbers');
    });

    it('should build prompt for same difficulty', () => {
      const prompt = homeworkPromptBuilder.buildSimilarProblemPrompt(problem, 'same');

      expect(prompt).toContain('SIMILAR difficulty');
    });

    it('should build prompt for harder difficulty', () => {
      const prompt = homeworkPromptBuilder.buildSimilarProblemPrompt(problem, 'harder');

      expect(prompt).toContain('HARDER');
      expect(prompt).toContain('additional step');
    });

    it('should include output format instructions', () => {
      const prompt = homeworkPromptBuilder.buildSimilarProblemPrompt(problem, 'same');

      expect(prompt).toContain('PROBLEM:');
      expect(prompt).toContain('CONCEPT:');
      expect(prompt).toContain('SOLUTION_APPROACH:');
    });
  });

  describe('buildFeedbackPrompt', () => {
    const problem = {
      rawText: 'Solve for x: 2x + 5 = 11',
      subject: 'MATH' as const,
      gradeBand: 'G6_8' as const,
    };

    it('should include student response', () => {
      const prompt = homeworkPromptBuilder.buildFeedbackPrompt(
        problem,
        'I think x equals 3',
        1
      );

      expect(prompt).toContain('I think x equals 3');
    });

    it('should include feedback guidelines', () => {
      const prompt = homeworkPromptBuilder.buildFeedbackPrompt(
        problem,
        'I got x = 3',
        2
      );

      expect(prompt).toContain('constructive feedback');
      expect(prompt).toContain('warm and supportive');
    });

    it('should request recommendation', () => {
      const prompt = homeworkPromptBuilder.buildFeedbackPrompt(
        problem,
        'x = 3',
        3
      );

      expect(prompt).toContain('CONTINUE');
      expect(prompt).toContain('ADVANCE');
      expect(prompt).toContain('REPEAT');
    });
  });

  describe('buildHintPrompt', () => {
    const problem = {
      rawText: 'Solve for x: 2x + 5 = 11',
      subject: 'MATH' as const,
      gradeBand: 'G6_8' as const,
    };

    it('should build level 1 hint', () => {
      const prompt = homeworkPromptBuilder.buildHintPrompt(problem, 1, []);

      expect(prompt).toContain('Level 1');
      expect(prompt).toContain('gentle nudge');
    });

    it('should build level 2 hint with previous hints', () => {
      const previousHints = ['Think about what operation you need to do first'];
      const prompt = homeworkPromptBuilder.buildHintPrompt(problem, 2, previousHints);

      expect(prompt).toContain('Level 2');
      expect(prompt).toContain('Hints Already Given');
      expect(prompt).toContain(previousHints[0]);
    });

    it('should build level 3 hint', () => {
      const prompt = homeworkPromptBuilder.buildHintPrompt(problem, 3, []);

      expect(prompt).toContain('Level 3');
      expect(prompt).toContain('first step');
    });
  });
});
