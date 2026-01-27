/**
 * Calculator Tool - Mathematical calculations for educational purposes
 */

import type { Tool, ToolContext, ToolResult } from '../../core/types';
import { defineTool, toolSuccess, toolError } from '../tool-types';

export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'percentage'
  | 'factorial'
  | 'gcd'
  | 'lcm'
  | 'evaluate';

export interface CalculatorParams {
  operation: Operation;
  a?: number;
  b?: number;
  expression?: string;
}

/**
 * Create the calculator tool
 */
export function createCalculatorTool(): Tool {
  return defineTool({
    name: 'calculator',
    description:
      'Perform mathematical calculations. Supports basic arithmetic, powers, roots, percentages, and expression evaluation.',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'The mathematical operation to perform',
          enum: [
            'add',
            'subtract',
            'multiply',
            'divide',
            'power',
            'sqrt',
            'percentage',
            'factorial',
            'gcd',
            'lcm',
            'evaluate',
          ],
        },
        a: {
          type: 'number',
          description: 'First operand (required for most operations)',
        },
        b: {
          type: 'number',
          description: 'Second operand (required for binary operations)',
        },
        expression: {
          type: 'string',
          description:
            'Mathematical expression to evaluate (for "evaluate" operation)',
        },
      },
      required: ['operation'],
    },
    execute: calculatorExecute,
    validate: validateCalculatorParams,
    metadata: {
      category: 'calculation',
      version: '1.0.0',
      tags: ['math', 'calculator', 'arithmetic', 'education'],
      examples: [
        {
          description: 'Add two numbers',
          input: { operation: 'add', a: 5, b: 3 },
          expectedOutput: { result: 8 },
        },
        {
          description: 'Calculate square root',
          input: { operation: 'sqrt', a: 16 },
          expectedOutput: { result: 4 },
        },
        {
          description: 'Evaluate expression',
          input: { operation: 'evaluate', expression: '2 * (3 + 4)' },
          expectedOutput: { result: 14 },
        },
      ],
    },
  });
}

/**
 * Validate calculator parameters
 */
function validateCalculatorParams(params: unknown): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  const p = params as CalculatorParams;

  if (!p.operation) {
    errors.push('Operation is required');
    return { valid: false, errors };
  }

  const binaryOps = ['add', 'subtract', 'multiply', 'divide', 'power', 'percentage', 'gcd', 'lcm'];
  const unaryOps = ['sqrt', 'factorial'];

  if (binaryOps.includes(p.operation)) {
    if (p.a === undefined) errors.push(`Operand 'a' is required for ${p.operation}`);
    if (p.b === undefined) errors.push(`Operand 'b' is required for ${p.operation}`);
    if (p.operation === 'divide' && p.b === 0) {
      errors.push('Cannot divide by zero');
    }
  }

  if (unaryOps.includes(p.operation)) {
    if (p.a === undefined) errors.push(`Operand 'a' is required for ${p.operation}`);
    if (p.operation === 'sqrt' && p.a !== undefined && p.a < 0) {
      errors.push('Cannot calculate square root of negative number');
    }
    if (p.operation === 'factorial' && p.a !== undefined && (p.a < 0 || !Number.isInteger(p.a))) {
      errors.push('Factorial requires a non-negative integer');
    }
  }

  if (p.operation === 'evaluate' && !p.expression) {
    errors.push('Expression is required for evaluate operation');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Calculator execution function
 */
async function calculatorExecute(
  params: unknown,
  _context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { operation, a, b, expression } = params as CalculatorParams;
    let result: number;
    let steps: string[] = [];

    switch (operation) {
      case 'add':
        result = a! + b!;
        steps = [`${a} + ${b} = ${result}`];
        break;

      case 'subtract':
        result = a! - b!;
        steps = [`${a} - ${b} = ${result}`];
        break;

      case 'multiply':
        result = a! * b!;
        steps = [`${a} × ${b} = ${result}`];
        break;

      case 'divide':
        result = a! / b!;
        steps = [`${a} ÷ ${b} = ${result}`];
        break;

      case 'power':
        result = Math.pow(a!, b!);
        steps = [`${a}^${b} = ${result}`];
        break;

      case 'sqrt':
        result = Math.sqrt(a!);
        steps = [`√${a} = ${result}`];
        break;

      case 'percentage':
        result = (a! * b!) / 100;
        steps = [`${a}% of ${b} = ${a} × ${b} / 100 = ${result}`];
        break;

      case 'factorial':
        result = factorial(a!);
        steps = [`${a}! = ${result}`];
        break;

      case 'gcd':
        result = gcd(a!, b!);
        steps = [`GCD(${a}, ${b}) = ${result}`];
        break;

      case 'lcm':
        result = lcm(a!, b!);
        steps = [`LCM(${a}, ${b}) = ${result}`];
        break;

      case 'evaluate':
        const evalResult = evaluateExpression(expression!);
        result = evalResult.result;
        steps = evalResult.steps;
        break;

      default:
        return toolError(`Unknown operation: ${operation}`, Date.now() - startTime);
    }

    return toolSuccess(
      {
        operation,
        result,
        steps,
        input: { a, b, expression },
      },
      Date.now() - startTime
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return toolError(err.message, Date.now() - startTime);
  }
}

/**
 * Calculate factorial
 */
function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Calculate greatest common divisor
 */
function gcd(a: number, b: number): number {
  a = Math.abs(Math.floor(a));
  b = Math.abs(Math.floor(b));
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

/**
 * Calculate least common multiple
 */
function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Simple expression evaluator (safe, no eval)
 */
function evaluateExpression(expression: string): { result: number; steps: string[] } {
  const steps: string[] = [];
  let expr = expression.trim();
  steps.push(`Original: ${expr}`);

  // Tokenize
  const tokens = tokenize(expr);

  // Convert to RPN (Reverse Polish Notation) using Shunting Yard
  const rpn = shuntingYard(tokens);

  // Evaluate RPN
  const result = evaluateRPN(rpn);

  steps.push(`Result: ${result}`);

  return { result, steps };
}

/**
 * Tokenize expression
 */
function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let current = '';

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (!char) continue;

    if (/\d|\./.test(char)) {
      current += char;
    } else if (/[+\-*/^()]/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      // Handle negative numbers
      const lastToken = tokens[tokens.length - 1] ?? '';
      if (char === '-' && (tokens.length === 0 || /[+\-*/^(]/.test(lastToken))) {
        current = '-';
      } else {
        tokens.push(char);
      }
    } else if (char === ' ') {
      if (current) {
        tokens.push(current);
        current = '';
      }
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Shunting Yard algorithm
 */
function shuntingYard(tokens: string[]): string[] {
  const output: string[] = [];
  const operators: string[] = [];
  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '^': 3,
  };

  for (const token of tokens) {
    if (/^-?\d+\.?\d*$/.test(token)) {
      output.push(token);
    } else if (token in precedence) {
      let topOp = operators[operators.length - 1];
      while (
        operators.length > 0 &&
        topOp !== '(' &&
        topOp !== undefined &&
        (precedence[topOp] ?? 0) >= (precedence[token] ?? 0)
      ) {
        const popped = operators.pop();
        if (popped) output.push(popped);
        topOp = operators[operators.length - 1];
      }
      operators.push(token);
    } else if (token === '(') {
      operators.push(token);
    } else if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        const popped = operators.pop();
        if (popped) output.push(popped);
      }
      operators.pop(); // Remove '('
    }
  }

  while (operators.length > 0) {
    output.push(operators.pop()!);
  }

  return output;
}

/**
 * Evaluate RPN expression
 */
function evaluateRPN(tokens: string[]): number {
  const stack: number[] = [];

  for (const token of tokens) {
    if (/^-?\d+\.?\d*$/.test(token)) {
      stack.push(parseFloat(token));
    } else {
      const b = stack.pop()!;
      const a = stack.pop()!;
      switch (token) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '*':
          stack.push(a * b);
          break;
        case '/':
          stack.push(a / b);
          break;
        case '^':
          stack.push(Math.pow(a, b));
          break;
      }
    }
  }

  return stack[0] ?? 0;
}

/**
 * Default calculator tool instance
 */
export const calculatorTool = createCalculatorTool();
