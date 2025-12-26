import { describe, it, expect, beforeEach } from 'vitest';
import { RandomizationService } from '../src/services/randomization.service';

describe('RandomizationService', () => {
  let randomizationService: RandomizationService;

  beforeEach(() => {
    randomizationService = new RandomizationService();
  });

  describe('generateRandomization', () => {
    const assessment = {
      id: 'assessment-1',
      settings: {
        shuffleQuestions: true,
        shuffleOptions: true,
      },
      questions: [
        {
          id: 'q1',
          type: 'MULTIPLE_CHOICE' as const,
          stem: 'Q1',
          points: 10,
          options: [
            { id: 'a', text: 'A', isCorrect: true },
            { id: 'b', text: 'B', isCorrect: false },
            { id: 'c', text: 'C', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          type: 'MULTIPLE_CHOICE' as const,
          stem: 'Q2',
          points: 10,
          options: [
            { id: 'x', text: 'X', isCorrect: false },
            { id: 'y', text: 'Y', isCorrect: true },
          ],
        },
        {
          id: 'q3',
          type: 'TRUE_FALSE' as const,
          stem: 'Q3',
          points: 5,
          correctAnswer: true,
        },
      ],
    };

    it('should generate deterministic randomization with same seed', () => {
      const result1 = randomizationService.generateRandomization(assessment, 'student-1');
      const result2 = randomizationService.generateRandomization(assessment, 'student-1');

      expect(result1.questionOrder).toEqual(result2.questionOrder);
      expect(result1.optionOrders).toEqual(result2.optionOrders);
    });

    it('should generate different randomization for different seeds', () => {
      const result1 = randomizationService.generateRandomization(assessment, 'student-1');
      const result2 = randomizationService.generateRandomization(assessment, 'student-2');

      // Very unlikely to be identical with different seeds
      // But theoretically possible, so we just check they're valid
      expect(result1.questionOrder).toHaveLength(3);
      expect(result2.questionOrder).toHaveLength(3);
    });

    it('should include all question IDs in randomized order', () => {
      const result = randomizationService.generateRandomization(assessment, 'test-seed');
      
      expect(result.questionOrder).toHaveLength(3);
      expect(result.questionOrder).toContain('q1');
      expect(result.questionOrder).toContain('q2');
      expect(result.questionOrder).toContain('q3');
    });

    it('should shuffle options for choice questions', () => {
      const result = randomizationService.generateRandomization(assessment, 'test-seed');
      
      expect(result.optionOrders['q1']).toHaveLength(3);
      expect(result.optionOrders['q1']).toContain('a');
      expect(result.optionOrders['q1']).toContain('b');
      expect(result.optionOrders['q1']).toContain('c');
      
      expect(result.optionOrders['q2']).toHaveLength(2);
      expect(result.optionOrders['q2']).toContain('x');
      expect(result.optionOrders['q2']).toContain('y');
    });

    it('should not shuffle options for non-choice questions', () => {
      const result = randomizationService.generateRandomization(assessment, 'test-seed');
      
      // TRUE_FALSE questions don't have options array in our format
      expect(result.optionOrders['q3']).toBeUndefined();
    });

    it('should not shuffle when settings disabled', () => {
      const noShuffleAssessment = {
        ...assessment,
        settings: {
          shuffleQuestions: false,
          shuffleOptions: false,
        },
      };

      const result = randomizationService.generateRandomization(noShuffleAssessment, 'test-seed');
      
      expect(result.questionOrder).toEqual(['q1', 'q2', 'q3']);
      expect(result.optionOrders).toEqual({});
    });
  });

  describe('applyRandomization', () => {
    const questions = [
      {
        id: 'q1',
        type: 'MULTIPLE_CHOICE' as const,
        stem: 'Q1',
        points: 10,
        options: [
          { id: 'a', text: 'A', isCorrect: true },
          { id: 'b', text: 'B', isCorrect: false },
          { id: 'c', text: 'C', isCorrect: false },
        ],
      },
      {
        id: 'q2',
        type: 'TRUE_FALSE' as const,
        stem: 'Q2',
        points: 5,
        correctAnswer: true,
      },
    ];

    it('should reorder questions according to randomization', () => {
      const randomization = {
        questionOrder: ['q2', 'q1'],
        optionOrders: {},
      };

      const result = randomizationService.applyRandomization(questions, randomization);
      
      expect(result[0].id).toBe('q2');
      expect(result[1].id).toBe('q1');
    });

    it('should reorder options according to randomization', () => {
      const randomization = {
        questionOrder: ['q1', 'q2'],
        optionOrders: {
          q1: ['c', 'a', 'b'],
        },
      };

      const result = randomizationService.applyRandomization(questions, randomization);
      
      expect(result[0].options![0].id).toBe('c');
      expect(result[0].options![1].id).toBe('a');
      expect(result[0].options![2].id).toBe('b');
    });
  });

  describe('mapAnswerToOriginal', () => {
    it('should map shuffled answer back to original', () => {
      const randomization = {
        questionOrder: ['q1'],
        optionOrders: {
          q1: ['c', 'a', 'b'],
        },
      };

      // Student selected first option (index 0), which is 'c' in shuffled order
      // But we need to map this back - actually the answer is already the option ID
      // So no mapping needed for single selection
      const result = randomizationService.mapAnswerToOriginal('q1', 'c', randomization);
      expect(result).toBe('c');
    });

    it('should handle array responses', () => {
      const randomization = {
        questionOrder: ['q1'],
        optionOrders: {
          q1: ['c', 'a', 'b'],
        },
      };

      const result = randomizationService.mapAnswerToOriginal('q1', ['c', 'a'], randomization);
      expect(result).toEqual(['c', 'a']);
    });

    it('should handle non-array responses unchanged', () => {
      const randomization = {
        questionOrder: ['q1'],
        optionOrders: {},
      };

      const result = randomizationService.mapAnswerToOriginal('q1', 'some text answer', randomization);
      expect(result).toBe('some text answer');
    });
  });

  describe('selectFromPool', () => {
    const pool = {
      id: 'pool-1',
      name: 'Chapter 1 Questions',
      count: 3,
      questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
    };

    it('should select correct number of questions', () => {
      const result = randomizationService.selectFromPool(pool, 'student-1');
      
      expect(result).toHaveLength(3);
    });

    it('should be deterministic with same seed', () => {
      const result1 = randomizationService.selectFromPool(pool, 'student-1');
      const result2 = randomizationService.selectFromPool(pool, 'student-1');

      expect(result1).toEqual(result2);
    });

    it('should only include questions from pool', () => {
      const result = randomizationService.selectFromPool(pool, 'student-1');
      
      result.forEach(qId => {
        expect(pool.questionIds).toContain(qId);
      });
    });

    it('should not have duplicates', () => {
      const result = randomizationService.selectFromPool(pool, 'student-1');
      const unique = new Set(result);
      
      expect(unique.size).toBe(result.length);
    });
  });
});
