import { describe, it, expect } from 'vitest';
import {
  CreateAssessmentSchema,
  CreateQuestionSchema,
  SubmitResponseSchema,
  AssessmentQuerySchema,
} from '../../src/validators/assessment.validator.js';

describe('Assessment Validators', () => {
  describe('CreateAssessmentSchema', () => {
    it('should accept valid assessment data', () => {
      const validData = {
        title: 'Math Quiz',
        description: 'A quiz about math',
        type: 'QUIZ',
      };

      const result = CreateAssessmentSchema.parse(validData);

      expect(result.title).toBe('Math Quiz');
      expect(result.type).toBe('QUIZ');
      expect(result.difficulty).toBe('MEDIUM'); // default
      expect(result.estimatedMinutes).toBe(15); // default
    });

    it('should reject empty title', () => {
      const invalidData = {
        title: '',
        type: 'QUIZ',
      };

      expect(() => CreateAssessmentSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid type', () => {
      const invalidData = {
        title: 'Math Quiz',
        type: 'INVALID_TYPE',
      };

      expect(() => CreateAssessmentSchema.parse(invalidData)).toThrow();
    });

    it('should accept all valid assessment types', () => {
      const types = ['QUIZ', 'TEST', 'PRACTICE', 'DIAGNOSTIC', 'ASSIGNMENT', 'SURVEY'];

      for (const type of types) {
        const result = CreateAssessmentSchema.parse({ title: 'Test', type });
        expect(result.type).toBe(type);
      }
    });

    it('should validate settings', () => {
      const validData = {
        title: 'Timed Quiz',
        type: 'QUIZ',
        settings: {
          timeLimit: 30,
          passingScore: 70,
          maxAttempts: 3,
          shuffleQuestions: true,
        },
      };

      const result = CreateAssessmentSchema.parse(validData);

      expect(result.settings?.timeLimit).toBe(30);
      expect(result.settings?.passingScore).toBe(70);
    });

    it('should reject negative time limit', () => {
      const invalidData = {
        title: 'Quiz',
        type: 'QUIZ',
        settings: {
          timeLimit: -5,
        },
      };

      expect(() => CreateAssessmentSchema.parse(invalidData)).toThrow();
    });

    it('should reject passing score over 100', () => {
      const invalidData = {
        title: 'Quiz',
        type: 'QUIZ',
        settings: {
          passingScore: 150,
        },
      };

      expect(() => CreateAssessmentSchema.parse(invalidData)).toThrow();
    });
  });

  describe('CreateQuestionSchema', () => {
    it('should accept valid multiple choice question', () => {
      const validData = {
        type: 'MULTIPLE_CHOICE',
        stem: 'What is 2 + 2?',
        options: [
          { id: 'a', text: '3' },
          { id: 'b', text: '4' },
          { id: 'c', text: '5' },
        ],
        correctAnswer: { optionId: 'b' },
      };

      const result = CreateQuestionSchema.parse(validData);

      expect(result.type).toBe('MULTIPLE_CHOICE');
      expect(result.stem).toBe('What is 2 + 2?');
      expect(result.difficulty).toBe('MEDIUM'); // default
      expect(result.points).toBe(1); // default
    });

    it('should accept valid true/false question', () => {
      const validData = {
        type: 'TRUE_FALSE',
        stem: 'The sky is blue.',
        correctAnswer: { value: true },
      };

      const result = CreateQuestionSchema.parse(validData);

      expect(result.type).toBe('TRUE_FALSE');
    });

    it('should accept valid short answer question', () => {
      const validData = {
        type: 'SHORT_ANSWER',
        stem: 'What is the capital of France?',
        correctAnswer: { acceptedAnswers: ['Paris', 'paris'] },
      };

      const result = CreateQuestionSchema.parse(validData);

      expect(result.type).toBe('SHORT_ANSWER');
    });

    it('should accept valid numeric question', () => {
      const validData = {
        type: 'NUMERIC',
        stem: 'What is the value of pi to 2 decimal places?',
        correctAnswer: { value: 3.14, tolerance: 0.01 },
      };

      const result = CreateQuestionSchema.parse(validData);

      expect(result.type).toBe('NUMERIC');
    });

    it('should reject empty stem', () => {
      const invalidData = {
        type: 'MULTIPLE_CHOICE',
        stem: '',
        correctAnswer: { optionId: 'a' },
      };

      expect(() => CreateQuestionSchema.parse(invalidData)).toThrow();
    });

    it('should accept all difficulty levels', () => {
      const difficulties = ['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'];

      for (const difficulty of difficulties) {
        const result = CreateQuestionSchema.parse({
          type: 'TRUE_FALSE',
          stem: 'Test question',
          correctAnswer: { value: true },
          difficulty,
        });
        expect(result.difficulty).toBe(difficulty);
      }
    });

    it('should validate hints array', () => {
      const validData = {
        type: 'MULTIPLE_CHOICE',
        stem: 'What is 2 + 2?',
        correctAnswer: { optionId: 'b' },
        hints: ['Think about adding', 'Count on your fingers'],
      };

      const result = CreateQuestionSchema.parse(validData);

      expect(result.hints).toHaveLength(2);
    });

    it('should limit hints to 5', () => {
      const invalidData = {
        type: 'MULTIPLE_CHOICE',
        stem: 'Question',
        correctAnswer: { optionId: 'a' },
        hints: ['1', '2', '3', '4', '5', '6'],
      };

      expect(() => CreateQuestionSchema.parse(invalidData)).toThrow();
    });
  });

  describe('SubmitResponseSchema', () => {
    it('should accept valid response', () => {
      const validData = {
        attemptId: '550e8400-e29b-41d4-a716-446655440000',
        questionId: '550e8400-e29b-41d4-a716-446655440001',
        response: { optionId: 'b' },
        timeSpentSeconds: 30,
      };

      const result = SubmitResponseSchema.parse(validData);

      expect(result.attemptId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.questionId).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        attemptId: 'not-a-uuid',
        questionId: '550e8400-e29b-41d4-a716-446655440001',
        response: { value: true },
      };

      expect(() => SubmitResponseSchema.parse(invalidData)).toThrow();
    });

    it('should accept optional timeSpentSeconds', () => {
      const validData = {
        attemptId: '550e8400-e29b-41d4-a716-446655440000',
        questionId: '550e8400-e29b-41d4-a716-446655440001',
        response: { value: true },
      };

      const result = SubmitResponseSchema.parse(validData);

      expect(result.timeSpentSeconds).toBeUndefined();
    });
  });

  describe('AssessmentQuerySchema', () => {
    it('should accept valid query params', () => {
      const validData = {
        page: '1',
        pageSize: '20',
        type: 'QUIZ',
        status: 'PUBLISHED',
      };

      const result = AssessmentQuerySchema.parse(validData);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.type).toBe('QUIZ');
      expect(result.status).toBe('PUBLISHED');
    });

    it('should use defaults for missing params', () => {
      const result = AssessmentQuerySchema.parse({});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should coerce string numbers', () => {
      const result = AssessmentQuerySchema.parse({
        page: '5',
        pageSize: '50',
      });

      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(50);
    });

    it('should limit pageSize to 100', () => {
      expect(() =>
        AssessmentQuerySchema.parse({
          pageSize: '200',
        })
      ).toThrow();
    });

    it('should accept valid sort options', () => {
      const result = AssessmentQuerySchema.parse({
        sortBy: 'title',
        sortOrder: 'asc',
      });

      expect(result.sortBy).toBe('title');
      expect(result.sortOrder).toBe('asc');
    });
  });
});
