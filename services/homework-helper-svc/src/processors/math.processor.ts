/**
 * Math Processor
 * Specialized processing for math homework problems
 *
 * Features:
 * - LaTeX equation parsing
 * - Step-by-step solution breakdown
 * - Graph/diagram generation helpers
 * - Formula identification
 */

import type { Subject, GradeBand } from '../types/aiContract.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface MathProblem {
  rawText: string;
  problemType: MathProblemType;
  expressions: MathExpression[];
  variables: string[];
  operations: MathOperation[];
  difficulty: number;
  gradeBand: GradeBand;
}

export type MathProblemType =
  | 'arithmetic'
  | 'algebra'
  | 'geometry'
  | 'trigonometry'
  | 'calculus'
  | 'statistics'
  | 'word-problem'
  | 'graphing'
  | 'fractions'
  | 'percentages'
  | 'ratios'
  | 'equations'
  | 'inequalities'
  | 'functions'
  | 'unknown';

export interface MathExpression {
  raw: string;
  latex: string;
  type: 'equation' | 'expression' | 'inequality' | 'function';
  variables: string[];
  operators: string[];
  numbers: number[];
}

export type MathOperation =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'exponentiation'
  | 'root'
  | 'logarithm'
  | 'trigonometry'
  | 'differentiation'
  | 'integration';

export interface SolutionStep {
  stepNumber: number;
  description: string;
  expression: string;
  latex: string;
  explanation: string;
  technique?: string;
}

export interface GraphData {
  type: 'linear' | 'quadratic' | 'exponential' | 'trigonometric' | 'other';
  equation: string;
  points: Array<{ x: number; y: number }>;
  domain: { min: number; max: number };
  range: { min: number; max: number };
  intercepts?: { x?: number[]; y?: number };
  asymptotes?: { vertical?: number[]; horizontal?: number };
}

export interface FormulaInfo {
  name: string;
  formula: string;
  latex: string;
  description: string;
  variables: Array<{ symbol: string; meaning: string }>;
  examples: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// MATH PROCESSOR
// ══════════════════════════════════════════════════════════════════════════════

export class MathProcessor {
  /**
   * Parse raw text into a structured math problem
   */
  parseProblem(rawText: string, gradeBand: GradeBand): MathProblem {
    const expressions = this.extractExpressions(rawText);
    const problemType = this.detectProblemType(rawText, expressions);
    const variables = this.extractVariables(rawText);
    const operations = this.detectOperations(rawText, expressions);
    const difficulty = this.calculateDifficulty(problemType, expressions, gradeBand);

    return {
      rawText,
      problemType,
      expressions,
      variables,
      operations,
      difficulty,
      gradeBand,
    };
  }

  /**
   * Convert text to LaTeX format
   */
  toLatex(text: string): string {
    let latex = text;

    // Fractions: a/b -> \frac{a}{b}
    latex = latex.replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}');

    // Exponents: x^2 -> x^{2}
    latex = latex.replace(/\^(\d+)/g, '^{$1}');
    latex = latex.replace(/\^([a-zA-Z])/g, '^{$1}');

    // Square roots: sqrt(x) or √x -> \sqrt{x}
    latex = latex.replace(/sqrt\s*\(([^)]+)\)/gi, '\\sqrt{$1}');
    latex = latex.replace(/√\s*(\d+)/g, '\\sqrt{$1}');
    latex = latex.replace(/√\s*\(([^)]+)\)/g, '\\sqrt{$1}');

    // Multiplication
    latex = latex.replace(/\*/g, '\\times ');
    latex = latex.replace(/×/g, '\\times ');

    // Division
    latex = latex.replace(/÷/g, '\\div ');

    // Greek letters
    latex = latex.replace(/\b(pi)\b/gi, '\\pi');
    latex = latex.replace(/π/g, '\\pi');
    latex = latex.replace(/\b(theta)\b/gi, '\\theta');
    latex = latex.replace(/θ/g, '\\theta');
    latex = latex.replace(/\b(alpha)\b/gi, '\\alpha');
    latex = latex.replace(/α/g, '\\alpha');
    latex = latex.replace(/\b(beta)\b/gi, '\\beta');
    latex = latex.replace(/β/g, '\\beta');

    // Trigonometric functions
    latex = latex.replace(/\b(sin|cos|tan|csc|sec|cot)\b/gi, '\\$1');
    latex = latex.replace(/\b(log|ln)\b/gi, '\\$1');

    // Infinity
    latex = latex.replace(/infinity/gi, '\\infty');
    latex = latex.replace(/∞/g, '\\infty');

    // Inequalities
    latex = latex.replace(/≤/g, '\\leq');
    latex = latex.replace(/≥/g, '\\geq');
    latex = latex.replace(/≠/g, '\\neq');

    // Summation and integral
    latex = latex.replace(/∑/g, '\\sum');
    latex = latex.replace(/∫/g, '\\int');

    return latex;
  }

  /**
   * Break down a solution into step-by-step format
   */
  generateSolutionSteps(problem: MathProblem): SolutionStep[] {
    const steps: SolutionStep[] = [];

    // This would typically use AI to generate actual steps
    // Here we provide a template based on problem type

    switch (problem.problemType) {
      case 'equations':
      case 'algebra':
        steps.push(
          {
            stepNumber: 1,
            description: 'Identify the equation and the variable to solve for',
            expression: problem.rawText,
            latex: this.toLatex(problem.rawText),
            explanation: 'First, let\'s understand what we\'re solving for.',
            technique: 'problem-identification',
          },
          {
            stepNumber: 2,
            description: 'Isolate terms with the variable on one side',
            expression: 'Move all x terms to one side',
            latex: '',
            explanation: 'We want to get all the terms with our variable on one side of the equation.',
            technique: 'isolation',
          },
          {
            stepNumber: 3,
            description: 'Combine like terms',
            expression: 'Simplify both sides',
            latex: '',
            explanation: 'Combine any terms that can be simplified.',
            technique: 'simplification',
          },
          {
            stepNumber: 4,
            description: 'Solve for the variable',
            expression: 'x = ?',
            latex: 'x = ?',
            explanation: 'Finally, solve for the variable by performing the inverse operation.',
            technique: 'solving',
          }
        );
        break;

      case 'arithmetic':
        steps.push(
          {
            stepNumber: 1,
            description: 'Identify the operation(s) required',
            expression: problem.rawText,
            latex: this.toLatex(problem.rawText),
            explanation: 'Look at the problem to identify what operations we need to perform.',
            technique: 'operation-identification',
          },
          {
            stepNumber: 2,
            description: 'Follow order of operations (PEMDAS)',
            expression: 'Parentheses, Exponents, Multiplication/Division, Addition/Subtraction',
            latex: '',
            explanation: 'Remember: work from left to right within each level.',
            technique: 'order-of-operations',
          },
          {
            stepNumber: 3,
            description: 'Calculate the result',
            expression: 'Result = ?',
            latex: '',
            explanation: 'Perform the calculations step by step.',
            technique: 'calculation',
          }
        );
        break;

      case 'fractions':
        steps.push(
          {
            stepNumber: 1,
            description: 'Identify the fractions involved',
            expression: problem.rawText,
            latex: this.toLatex(problem.rawText),
            explanation: 'Let\'s look at the fractions in this problem.',
            technique: 'identification',
          },
          {
            stepNumber: 2,
            description: 'Find common denominators if needed',
            expression: 'LCD = ?',
            latex: '',
            explanation: 'For addition/subtraction, we need common denominators.',
            technique: 'common-denominator',
          },
          {
            stepNumber: 3,
            description: 'Perform the operation',
            expression: 'Calculate numerators',
            latex: '',
            explanation: 'Now perform the required operation on the numerators.',
            technique: 'fraction-operation',
          },
          {
            stepNumber: 4,
            description: 'Simplify the result',
            expression: 'Reduce to lowest terms',
            latex: '',
            explanation: 'Reduce the fraction to its simplest form.',
            technique: 'simplification',
          }
        );
        break;

      default:
        steps.push(
          {
            stepNumber: 1,
            description: 'Read and understand the problem',
            expression: problem.rawText,
            latex: this.toLatex(problem.rawText),
            explanation: 'Start by carefully reading the problem.',
            technique: 'comprehension',
          },
          {
            stepNumber: 2,
            description: 'Identify what we\'re looking for',
            expression: 'Unknown = ?',
            latex: '',
            explanation: 'What is the problem asking us to find?',
            technique: 'goal-identification',
          },
          {
            stepNumber: 3,
            description: 'Set up the problem',
            expression: 'Translate to mathematical form',
            latex: '',
            explanation: 'Convert the problem into mathematical expressions.',
            technique: 'setup',
          },
          {
            stepNumber: 4,
            description: 'Solve and verify',
            expression: 'Calculate and check',
            latex: '',
            explanation: 'Solve the problem and verify your answer makes sense.',
            technique: 'solution-verification',
          }
        );
    }

    return steps;
  }

  /**
   * Generate graph data for visualization
   */
  generateGraphData(expression: string): GraphData | null {
    // Parse the expression to determine graph type
    const lowerExpr = expression.toLowerCase();

    // Linear: y = mx + b
    const linearMatch = expression.match(/y\s*=\s*(-?\d*\.?\d*)?\s*x\s*([+-]\s*\d+\.?\d*)?/i);
    if (linearMatch) {
      const m = Number.parseFloat(linearMatch[1] || '1');
      const b = Number.parseFloat((linearMatch[2] || '0').replace(/\s/g, ''));

      const points: Array<{ x: number; y: number }> = [];
      for (let x = -10; x <= 10; x++) {
        points.push({ x, y: m * x + b });
      }

      return {
        type: 'linear',
        equation: expression,
        points,
        domain: { min: -10, max: 10 },
        range: { min: -10 * Math.abs(m) + b, max: 10 * Math.abs(m) + b },
        intercepts: {
          x: b !== 0 && m !== 0 ? [-b / m] : undefined,
          y: b,
        },
      };
    }

    // Quadratic: y = ax^2 + bx + c
    const quadMatch = expression.match(/y\s*=\s*(-?\d*\.?\d*)?\s*x\^2/i);
    if (quadMatch) {
      const a = Number.parseFloat(quadMatch[1] || '1');

      const points: Array<{ x: number; y: number }> = [];
      for (let x = -10; x <= 10; x++) {
        points.push({ x, y: a * x * x });
      }

      return {
        type: 'quadratic',
        equation: expression,
        points,
        domain: { min: -10, max: 10 },
        range: { min: a > 0 ? 0 : -100, max: a > 0 ? 100 : 0 },
        intercepts: {
          x: [0],
          y: 0,
        },
      };
    }

    return null;
  }

  /**
   * Identify formulas relevant to the problem
   */
  identifyFormulas(problem: MathProblem): FormulaInfo[] {
    const formulas: FormulaInfo[] = [];

    // Geometry formulas
    if (problem.rawText.match(/area|perimeter|volume|surface/i)) {
      if (problem.rawText.match(/circle/i)) {
        formulas.push({
          name: 'Area of Circle',
          formula: 'A = πr²',
          latex: 'A = \\pi r^2',
          description: 'The area of a circle is π times the radius squared',
          variables: [
            { symbol: 'A', meaning: 'Area' },
            { symbol: 'r', meaning: 'Radius' },
          ],
          examples: ['If r = 5, A = π(5)² = 25π ≈ 78.54'],
        });
        formulas.push({
          name: 'Circumference of Circle',
          formula: 'C = 2πr',
          latex: 'C = 2\\pi r',
          description: 'The circumference is 2π times the radius',
          variables: [
            { symbol: 'C', meaning: 'Circumference' },
            { symbol: 'r', meaning: 'Radius' },
          ],
          examples: ['If r = 5, C = 2π(5) = 10π ≈ 31.42'],
        });
      }

      if (problem.rawText.match(/rectangle|square/i)) {
        formulas.push({
          name: 'Area of Rectangle',
          formula: 'A = length × width',
          latex: 'A = l \\times w',
          description: 'The area is the product of length and width',
          variables: [
            { symbol: 'A', meaning: 'Area' },
            { symbol: 'l', meaning: 'Length' },
            { symbol: 'w', meaning: 'Width' },
          ],
          examples: ['If l = 5 and w = 3, A = 5 × 3 = 15'],
        });
      }

      if (problem.rawText.match(/triangle/i)) {
        formulas.push({
          name: 'Area of Triangle',
          formula: 'A = ½ × base × height',
          latex: 'A = \\frac{1}{2} b h',
          description: 'The area is half the product of base and height',
          variables: [
            { symbol: 'A', meaning: 'Area' },
            { symbol: 'b', meaning: 'Base' },
            { symbol: 'h', meaning: 'Height' },
          ],
          examples: ['If b = 6 and h = 4, A = ½ × 6 × 4 = 12'],
        });
      }
    }

    // Algebra formulas
    if (problem.problemType === 'algebra' || problem.problemType === 'equations') {
      formulas.push({
        name: 'Quadratic Formula',
        formula: 'x = (-b ± √(b²-4ac)) / 2a',
        latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        description: 'Solves ax² + bx + c = 0',
        variables: [
          { symbol: 'a', meaning: 'Coefficient of x²' },
          { symbol: 'b', meaning: 'Coefficient of x' },
          { symbol: 'c', meaning: 'Constant term' },
        ],
        examples: ['For x² + 5x + 6 = 0: a=1, b=5, c=6'],
      });
    }

    // Percentage formulas
    if (problem.problemType === 'percentages') {
      formulas.push({
        name: 'Percentage Formula',
        formula: 'Part = (Percent / 100) × Whole',
        latex: '\\text{Part} = \\frac{\\text{Percent}}{100} \\times \\text{Whole}',
        description: 'Find the part when given the percentage and whole',
        variables: [
          { symbol: 'Part', meaning: 'The portion being calculated' },
          { symbol: 'Percent', meaning: 'The percentage value' },
          { symbol: 'Whole', meaning: 'The total amount' },
        ],
        examples: ['What is 25% of 80? Part = (25/100) × 80 = 20'],
      });
    }

    return formulas;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private extractExpressions(text: string): MathExpression[] {
    const expressions: MathExpression[] = [];

    // Match equations (contains =)
    const equationRegex = /[^.!?]*[=][^.!?]*/g;
    let match;
    while ((match = equationRegex.exec(text)) !== null) {
      const raw = match[0].trim();
      expressions.push({
        raw,
        latex: this.toLatex(raw),
        type: 'equation',
        variables: this.extractVariables(raw),
        operators: this.extractOperators(raw),
        numbers: this.extractNumbers(raw),
      });
    }

    // Match standalone expressions (if no equations found)
    if (expressions.length === 0) {
      const exprRegex = /[\d\w\s+\-*/×÷^()]+/g;
      while ((match = exprRegex.exec(text)) !== null) {
        const raw = match[0].trim();
        if (this.containsMathContent(raw)) {
          expressions.push({
            raw,
            latex: this.toLatex(raw),
            type: 'expression',
            variables: this.extractVariables(raw),
            operators: this.extractOperators(raw),
            numbers: this.extractNumbers(raw),
          });
        }
      }
    }

    return expressions;
  }

  private detectProblemType(text: string, expressions: MathExpression[]): MathProblemType {
    const lowerText = text.toLowerCase();

    // Word problem detection
    if (
      lowerText.includes('how many') ||
      lowerText.includes('how much') ||
      lowerText.includes('what is the') ||
      lowerText.includes('find the') ||
      lowerText.length > 100
    ) {
      // Check if it's a word problem about specific topics
      if (lowerText.includes('percent')) return 'percentages';
      if (lowerText.includes('fraction')) return 'fractions';
      if (lowerText.includes('ratio')) return 'ratios';
      return 'word-problem';
    }

    // Graphing
    if (lowerText.includes('graph') || lowerText.includes('plot')) {
      return 'graphing';
    }

    // Geometry
    if (
      lowerText.includes('area') ||
      lowerText.includes('perimeter') ||
      lowerText.includes('volume') ||
      lowerText.includes('angle') ||
      lowerText.includes('triangle') ||
      lowerText.includes('circle') ||
      lowerText.includes('rectangle')
    ) {
      return 'geometry';
    }

    // Trigonometry
    if (
      lowerText.includes('sin') ||
      lowerText.includes('cos') ||
      lowerText.includes('tan') ||
      lowerText.includes('trigonometry')
    ) {
      return 'trigonometry';
    }

    // Calculus
    if (
      lowerText.includes('derivative') ||
      lowerText.includes('integral') ||
      lowerText.includes('limit') ||
      lowerText.includes('differentiate')
    ) {
      return 'calculus';
    }

    // Statistics
    if (
      lowerText.includes('mean') ||
      lowerText.includes('median') ||
      lowerText.includes('mode') ||
      lowerText.includes('probability') ||
      lowerText.includes('standard deviation')
    ) {
      return 'statistics';
    }

    // Check expressions for clues
    const hasVariables = expressions.some((e) => e.variables.length > 0);
    const hasEquals = expressions.some((e) => e.type === 'equation');
    const hasInequality = text.match(/[<>≤≥]/);

    if (hasInequality) return 'inequalities';
    if (hasEquals && hasVariables) return 'equations';
    if (hasVariables) return 'algebra';
    if (text.includes('%') || lowerText.includes('percent')) return 'percentages';
    if (text.includes('/')) return 'fractions';

    // Default to arithmetic
    if (this.containsMathContent(text)) return 'arithmetic';

    return 'unknown';
  }

  private extractVariables(text: string): string[] {
    const variables = new Set<string>();
    const varRegex = /\b([a-zA-Z])\b(?!\s*\()/g;
    let match;

    while ((match = varRegex.exec(text)) !== null) {
      const v = match[1].toLowerCase();
      // Exclude common words
      if (!['a', 'i', 'of', 'or', 'as', 'to', 'by'].includes(v)) {
        variables.add(v);
      }
    }

    return Array.from(variables);
  }

  private extractOperators(text: string): string[] {
    const operators: string[] = [];

    if (text.includes('+')) operators.push('+');
    if (text.includes('-')) operators.push('-');
    if (text.includes('*') || text.includes('×')) operators.push('×');
    if (text.includes('/') || text.includes('÷')) operators.push('÷');
    if (text.includes('^')) operators.push('^');
    if (text.includes('√') || text.toLowerCase().includes('sqrt')) operators.push('√');

    return operators;
  }

  private extractNumbers(text: string): number[] {
    const numbers: number[] = [];
    const numRegex = /-?\d+\.?\d*/g;
    let match;

    while ((match = numRegex.exec(text)) !== null) {
      numbers.push(Number.parseFloat(match[0]));
    }

    return numbers;
  }

  private detectOperations(text: string, expressions: MathExpression[]): MathOperation[] {
    const operations: MathOperation[] = [];

    if (text.includes('+')) operations.push('addition');
    if (text.includes('-')) operations.push('subtraction');
    if (text.includes('*') || text.includes('×')) operations.push('multiplication');
    if (text.includes('/') || text.includes('÷')) operations.push('division');
    if (text.includes('^')) operations.push('exponentiation');
    if (text.includes('√') || text.toLowerCase().includes('sqrt')) operations.push('root');
    if (text.toLowerCase().includes('log')) operations.push('logarithm');
    if (text.match(/sin|cos|tan/i)) operations.push('trigonometry');
    if (text.toLowerCase().includes('derivative')) operations.push('differentiation');
    if (text.toLowerCase().includes('integral')) operations.push('integration');

    return operations;
  }

  private calculateDifficulty(
    problemType: MathProblemType,
    expressions: MathExpression[],
    gradeBand: GradeBand
  ): number {
    let difficulty = 5; // Base difficulty

    // Adjust by grade band
    if (gradeBand === 'K5') difficulty -= 2;
    if (gradeBand === 'G9_12') difficulty += 2;

    // Adjust by problem type
    const typeAdjustments: Record<MathProblemType, number> = {
      arithmetic: -2,
      fractions: -1,
      percentages: 0,
      ratios: 0,
      algebra: 1,
      equations: 1,
      inequalities: 1,
      geometry: 0,
      trigonometry: 2,
      calculus: 3,
      statistics: 1,
      'word-problem': 1,
      graphing: 1,
      functions: 2,
      unknown: 0,
    };
    difficulty += typeAdjustments[problemType] ?? 0;

    // Adjust by complexity of expressions
    const avgOperators =
      expressions.reduce((sum, e) => sum + e.operators.length, 0) / (expressions.length || 1);
    if (avgOperators > 3) difficulty += 1;

    const hasMultipleVariables = expressions.some((e) => e.variables.length > 1);
    if (hasMultipleVariables) difficulty += 1;

    return Math.min(10, Math.max(1, difficulty));
  }

  private containsMathContent(text: string): boolean {
    return /[\d+\-*/×÷=^√∑∫]/.test(text);
  }
}

// Export singleton instance
export const mathProcessor = new MathProcessor();
