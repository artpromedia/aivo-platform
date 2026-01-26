import { describe, it, expect } from 'vitest';
import { mathProcessor } from '../../src/processors/math.processor.js';

describe('MathProcessor', () => {
  describe('parseProblem', () => {
    it('should detect arithmetic problem type', () => {
      const problem = mathProcessor.parseProblem('5 + 3 = ?', 'K5');
      expect(problem.problemType).toBe('arithmetic');
      expect(problem.operations).toContain('addition');
    });

    it('should detect equation problem type', () => {
      const problem = mathProcessor.parseProblem('Solve for x: 2x + 5 = 11', 'G6_8');
      expect(problem.problemType).toBe('equations');
      expect(problem.variables).toContain('x');
    });

    it('should detect fraction problem type', () => {
      const problem = mathProcessor.parseProblem('Add these fractions: 1/2 + 1/4', 'K5');
      expect(problem.problemType).toBe('fractions');
    });

    it('should detect geometry problem type', () => {
      const problem = mathProcessor.parseProblem('Find the area of a circle with radius 5', 'G6_8');
      expect(problem.problemType).toBe('geometry');
    });

    it('should detect word problem type', () => {
      const problem = mathProcessor.parseProblem(
        'John has 5 apples. He gives 2 to Mary. How many apples does John have now?',
        'K5'
      );
      expect(problem.problemType).toBe('word-problem');
    });

    it('should calculate difficulty based on grade band', () => {
      const k5Problem = mathProcessor.parseProblem('2 + 2 = ?', 'K5');
      const g912Problem = mathProcessor.parseProblem('2 + 2 = ?', 'G9_12');
      expect(g912Problem.difficulty).toBeGreaterThan(k5Problem.difficulty);
    });
  });

  describe('toLatex', () => {
    it('should convert fractions to latex', () => {
      const latex = mathProcessor.toLatex('1/2');
      expect(latex).toBe('\\frac{1}{2}');
    });

    it('should convert exponents to latex', () => {
      const latex = mathProcessor.toLatex('x^2');
      expect(latex).toBe('x^{2}');
    });

    it('should convert multiplication to latex', () => {
      const latex = mathProcessor.toLatex('5 * 3');
      expect(latex).toContain('\\times');
    });

    it('should convert square root to latex', () => {
      const latex = mathProcessor.toLatex('sqrt(16)');
      expect(latex).toContain('\\sqrt');
    });

    it('should convert pi to latex', () => {
      const latex = mathProcessor.toLatex('pi r^2');
      expect(latex).toContain('\\pi');
    });
  });

  describe('generateSolutionSteps', () => {
    it('should generate steps for equation problems', () => {
      const problem = mathProcessor.parseProblem('2x + 5 = 11', 'G6_8');
      const steps = mathProcessor.generateSolutionSteps(problem);

      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0].stepNumber).toBe(1);
      expect(steps[0]).toHaveProperty('expression');
      expect(steps[0]).toHaveProperty('explanation');
    });

    it('should generate steps for arithmetic problems', () => {
      const problem = mathProcessor.parseProblem('5 + 3 * 2', 'K5');
      const steps = mathProcessor.generateSolutionSteps(problem);

      expect(steps.length).toBeGreaterThan(0);
      expect(steps.some((s) => s.technique === 'order-of-operations')).toBe(true);
    });
  });

  describe('identifyFormulas', () => {
    it('should identify circle formulas for circle problems', () => {
      const problem = mathProcessor.parseProblem('Find the area of a circle', 'G6_8');
      const formulas = mathProcessor.identifyFormulas(problem);

      expect(formulas.length).toBeGreaterThan(0);
      expect(formulas.some((f) => f.name.includes('Circle'))).toBe(true);
    });

    it('should identify quadratic formula for algebra problems', () => {
      const problem = mathProcessor.parseProblem('Solve the equation x^2 + 5x + 6 = 0', 'G9_12');
      const formulas = mathProcessor.identifyFormulas(problem);

      expect(formulas.some((f) => f.name.includes('Quadratic'))).toBe(true);
    });

    it('should include formula variables', () => {
      const problem = mathProcessor.parseProblem('Find the area of a circle', 'G6_8');
      const formulas = mathProcessor.identifyFormulas(problem);
      const circleFormula = formulas.find((f) => f.name.includes('Circle'));

      expect(circleFormula?.variables).toBeDefined();
      expect(circleFormula?.variables.length).toBeGreaterThan(0);
    });
  });

  describe('generateGraphData', () => {
    it('should generate data for linear equation', () => {
      const data = mathProcessor.generateGraphData('y = 2x + 1');

      expect(data).not.toBeNull();
      expect(data?.type).toBe('linear');
      expect(data?.points.length).toBeGreaterThan(0);
      expect(data?.intercepts?.y).toBe(1);
    });

    it('should generate data for quadratic equation', () => {
      const data = mathProcessor.generateGraphData('y = x^2');

      expect(data).not.toBeNull();
      expect(data?.type).toBe('quadratic');
    });

    it('should return null for unsupported equations', () => {
      const data = mathProcessor.generateGraphData('not an equation');
      expect(data).toBeNull();
    });
  });
});
