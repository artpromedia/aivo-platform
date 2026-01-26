/**
 * Calculator tool for mathematical operations
 */

import { defineTool, type ExtendedTool } from '../tool-types.js';

export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'log'
  | 'sin'
  | 'cos'
  | 'tan'
  | 'abs'
  | 'round'
  | 'floor'
  | 'ceil'
  | 'factorial'
  | 'percentage'
  | 'expression';

export interface CalculatorResult {
  operation: Operation;
  inputs: number[];
  result: number;
  expression?: string;
}

/**
 * Safe expression evaluator (limited to math operations)
 */
function evaluateExpression(expression: string): number {
  // Only allow numbers, operators, parentheses, and math functions
  const safePattern = /^[\d+\-*/().%\s]+$/;

  // Remove spaces and validate
  const cleaned = expression.replace(/\s+/g, '');

  if (!safePattern.test(cleaned)) {
    throw new Error('Invalid characters in expression');
  }

  // Basic safety checks
  if (cleaned.includes('..') || cleaned.includes('++') || cleaned.includes('--')) {
    throw new Error('Invalid expression syntax');
  }

  // Use Function constructor with strict mode (safer than eval)
  try {
    const fn = new Function(`"use strict"; return (${cleaned})`);
    const result = fn() as unknown;

    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error('Expression did not evaluate to a finite number');
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to evaluate expression: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Factorial calculation
 */
function factorial(n: number): number {
  if (n < 0) throw new Error('Factorial is not defined for negative numbers');
  if (!Number.isInteger(n)) throw new Error('Factorial requires an integer');
  if (n > 170) throw new Error('Factorial result too large');

  if (n === 0 || n === 1) return 1;

  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Calculator tool implementation
 */
export const calculatorTool: ExtendedTool = defineTool<{
  operation: Operation;
  a?: number;
  b?: number;
  expression?: string;
}>({
  name: 'calculator',
  description:
    'Perform mathematical calculations. Supports basic operations (add, subtract, multiply, divide), ' +
    'advanced operations (power, sqrt, log), trigonometry (sin, cos, tan), and expression evaluation.',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: [
          'add',
          'subtract',
          'multiply',
          'divide',
          'power',
          'sqrt',
          'log',
          'sin',
          'cos',
          'tan',
          'abs',
          'round',
          'floor',
          'ceil',
          'factorial',
          'percentage',
          'expression',
        ],
        description: 'The mathematical operation to perform',
      },
      a: {
        type: 'number',
        description: 'First operand (required for most operations)',
      },
      b: {
        type: 'number',
        description: 'Second operand (for binary operations like add, subtract, multiply, divide, power)',
      },
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate (for operation="expression")',
      },
    },
    required: ['operation'],
  },
  execute: async (params) => {
    const { operation, a, b, expression } = params;
    let result: number;
    const inputs: number[] = [];

    switch (operation) {
      case 'add':
        if (a === undefined || b === undefined) {
          throw new Error('Add operation requires two operands (a and b)');
        }
        inputs.push(a, b);
        result = a + b;
        break;

      case 'subtract':
        if (a === undefined || b === undefined) {
          throw new Error('Subtract operation requires two operands (a and b)');
        }
        inputs.push(a, b);
        result = a - b;
        break;

      case 'multiply':
        if (a === undefined || b === undefined) {
          throw new Error('Multiply operation requires two operands (a and b)');
        }
        inputs.push(a, b);
        result = a * b;
        break;

      case 'divide':
        if (a === undefined || b === undefined) {
          throw new Error('Divide operation requires two operands (a and b)');
        }
        if (b === 0) {
          throw new Error('Division by zero');
        }
        inputs.push(a, b);
        result = a / b;
        break;

      case 'power':
        if (a === undefined || b === undefined) {
          throw new Error('Power operation requires two operands (a and b)');
        }
        inputs.push(a, b);
        result = Math.pow(a, b);
        break;

      case 'sqrt':
        if (a === undefined) {
          throw new Error('Sqrt operation requires operand (a)');
        }
        if (a < 0) {
          throw new Error('Cannot compute square root of negative number');
        }
        inputs.push(a);
        result = Math.sqrt(a);
        break;

      case 'log':
        if (a === undefined) {
          throw new Error('Log operation requires operand (a)');
        }
        if (a <= 0) {
          throw new Error('Logarithm requires a positive number');
        }
        inputs.push(a);
        // Use natural log if b not provided, or log base b
        result = b !== undefined ? Math.log(a) / Math.log(b) : Math.log(a);
        if (b !== undefined) inputs.push(b);
        break;

      case 'sin':
        if (a === undefined) {
          throw new Error('Sin operation requires operand (a)');
        }
        inputs.push(a);
        result = Math.sin(a);
        break;

      case 'cos':
        if (a === undefined) {
          throw new Error('Cos operation requires operand (a)');
        }
        inputs.push(a);
        result = Math.cos(a);
        break;

      case 'tan':
        if (a === undefined) {
          throw new Error('Tan operation requires operand (a)');
        }
        inputs.push(a);
        result = Math.tan(a);
        break;

      case 'abs':
        if (a === undefined) {
          throw new Error('Abs operation requires operand (a)');
        }
        inputs.push(a);
        result = Math.abs(a);
        break;

      case 'round':
        if (a === undefined) {
          throw new Error('Round operation requires operand (a)');
        }
        inputs.push(a);
        result = Math.round(a);
        break;

      case 'floor':
        if (a === undefined) {
          throw new Error('Floor operation requires operand (a)');
        }
        inputs.push(a);
        result = Math.floor(a);
        break;

      case 'ceil':
        if (a === undefined) {
          throw new Error('Ceil operation requires operand (a)');
        }
        inputs.push(a);
        result = Math.ceil(a);
        break;

      case 'factorial':
        if (a === undefined) {
          throw new Error('Factorial operation requires operand (a)');
        }
        inputs.push(a);
        result = factorial(a);
        break;

      case 'percentage':
        if (a === undefined || b === undefined) {
          throw new Error('Percentage operation requires two operands (a as percentage, b as base)');
        }
        inputs.push(a, b);
        result = (a / 100) * b;
        break;

      case 'expression':
        if (!expression) {
          throw new Error('Expression operation requires an expression string');
        }
        result = evaluateExpression(expression);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    // Check for invalid results
    if (!Number.isFinite(result)) {
      throw new Error('Result is not a finite number');
    }

    return {
      operation,
      inputs,
      result,
      expression: operation === 'expression' ? expression : undefined,
    } as CalculatorResult;
  },
  metadata: {
    category: 'math',
    tags: ['calculator', 'math', 'arithmetic'],
  },
});

export { calculatorTool as default };
