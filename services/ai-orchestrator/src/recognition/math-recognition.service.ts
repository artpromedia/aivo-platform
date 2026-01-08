/**
 * Math Handwriting Recognition Service
 *
 * Uses AI vision models to recognize handwritten math expressions
 * from stroke data or images.
 */

import Anthropic from '@anthropic-ai/sdk';
import { evaluate as mathEvaluate } from 'mathjs';

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface StrokePoint {
  x: number;
  y: number;
  t: number; // timestamp
  p?: number; // pressure
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
}

export interface RecognitionOptions {
  evaluateExpression?: boolean;
  includeAlternatives?: boolean;
  maxAlternatives?: number;
  context?: string; // e.g., "algebra", "arithmetic", "geometry"
}

export interface RecognitionCandidate {
  text: string;
  confidence: number;
}

export interface EvaluationResult {
  isValid: boolean;
  result?: number | string;
  formattedResult?: string;
  error?: string;
}

export type MathExpressionType =
  | 'number'
  | 'equation'
  | 'expression'
  | 'fraction'
  | 'exponent'
  | 'squareRoot'
  | 'inequality'
  | 'unknown';

export interface MathRecognitionResult {
  recognizedText: string;
  latexRepresentation?: string;
  confidence: number;
  alternatives: RecognitionCandidate[];
  expressionType: MathExpressionType;
  evaluation?: EvaluationResult;
}

export interface StrokeRecognitionRequest {
  strokes: Stroke[];
  canvasWidth: number;
  canvasHeight: number;
  options?: RecognitionOptions;
}

export interface ImageRecognitionRequest {
  image: string; // base64
  options?: RecognitionOptions;
}

// ══════════════════════════════════════════════════════════════════════════════
// Service
// ══════════════════════════════════════════════════════════════════════════════

export class MathRecognitionService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  /**
   * Recognize math expression from stroke data
   * Converts strokes to image and uses vision model
   */
  async recognizeFromStrokes(request: StrokeRecognitionRequest): Promise<MathRecognitionResult> {
    // Convert strokes to SVG for better recognition
    const svg = this.strokesToSvg(request.strokes, request.canvasWidth, request.canvasHeight);
    const svgBase64 = Buffer.from(svg).toString('base64');

    return this.recognizeFromImage({
      image: svgBase64,
      options: request.options,
    });
  }

  /**
   * Recognize math expression from image
   */
  async recognizeFromImage(request: ImageRecognitionRequest): Promise<MathRecognitionResult> {
    const { image, options = {} } = request;
    const { evaluateExpression = true, includeAlternatives = true, maxAlternatives = 3, context } = options;

    const systemPrompt = `You are a math handwriting recognition system. Your task is to:
1. Recognize handwritten mathematical expressions from images
2. Convert them to properly formatted text
3. Identify the type of expression
4. Provide LaTeX representation when applicable
5. Evaluate the expression if it's a computation

Be accurate and handle common handwriting variations. For ambiguous cases, provide alternatives.

Output your response as JSON with this structure:
{
  "recognizedText": "the recognized expression as text",
  "latexRepresentation": "LaTeX version if applicable",
  "confidence": 0.0-1.0,
  "expressionType": "number|equation|expression|fraction|exponent|squareRoot|inequality|unknown",
  "alternatives": [{"text": "alt1", "confidence": 0.8}, ...],
  "evaluation": {
    "isValid": true/false,
    "result": computed_result_or_null,
    "formattedResult": "formatted string",
    "error": "error message if invalid"
  }
}`;

    const userPrompt = `Recognize the handwritten math expression in this image.
${context ? `Context: This is a ${context} problem.` : ''}
${evaluateExpression ? 'Please evaluate the expression if possible.' : ''}
${includeAlternatives ? `Provide up to ${maxAlternatives} alternative interpretations.` : ''}

Respond ONLY with valid JSON, no markdown or explanation.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/svg+xml',
                  data: image,
                },
              },
              {
                type: 'text',
                text: userPrompt,
              },
            ],
          },
        ],
        system: systemPrompt,
      });

      // Extract text content from response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from model');
      }

      // Parse JSON response
      const result = JSON.parse(textContent.text) as MathRecognitionResult;

      // Validate and sanitize result
      return this.validateResult(result, evaluateExpression);
    } catch (error) {
      console.error('Math recognition error:', error);

      // Return fallback result
      return {
        recognizedText: '',
        confidence: 0,
        alternatives: [],
        expressionType: 'unknown',
        evaluation: {
          isValid: false,
          error: 'Recognition failed. Please try again.',
        },
      };
    }
  }

  /**
   * Validate a math answer against expected answer
   */
  async validateAnswer(
    submittedAnswer: string,
    expectedAnswer: string,
    options?: {
      allowEquivalent?: boolean;
      tolerance?: number;
    }
  ): Promise<{
    isCorrect: boolean;
    feedback?: string;
    partialCredit?: number;
  }> {
    const { allowEquivalent = true, tolerance = 0.0001 } = options ?? {};

    // Try exact match first
    if (submittedAnswer.trim() === expectedAnswer.trim()) {
      return { isCorrect: true };
    }

    // Try numeric comparison
    const submittedNum = parseFloat(submittedAnswer);
    const expectedNum = parseFloat(expectedAnswer);

    if (!isNaN(submittedNum) && !isNaN(expectedNum)) {
      if (Math.abs(submittedNum - expectedNum) < tolerance) {
        return { isCorrect: true };
      }

      // Check for partial credit (within 10%)
      const percentDiff = Math.abs((submittedNum - expectedNum) / expectedNum);
      if (percentDiff < 0.1) {
        return {
          isCorrect: false,
          partialCredit: 0.5,
          feedback: `Close! Your answer ${submittedAnswer} is within 10% of the correct answer.`,
        };
      }
    }

    // Use AI for equivalent expressions if enabled
    if (allowEquivalent) {
      return this.checkEquivalence(submittedAnswer, expectedAnswer);
    }

    return {
      isCorrect: false,
      feedback: `Incorrect. The correct answer is ${expectedAnswer}.`,
    };
  }

  /**
   * Check if two expressions are mathematically equivalent
   */
  private async checkEquivalence(
    expr1: string,
    expr2: string
  ): Promise<{
    isCorrect: boolean;
    feedback?: string;
    partialCredit?: number;
  }> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Are these two mathematical expressions equivalent?
Expression 1: ${expr1}
Expression 2: ${expr2}

Consider:
- Different forms of the same answer (e.g., 0.5 = 1/2 = 50%)
- Simplified vs unsimplified forms
- Different orderings (e.g., x+1 = 1+x)

Respond with JSON:
{
  "equivalent": true/false,
  "explanation": "brief explanation",
  "partialCredit": 0-1 if partially correct
}`,
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        return { isCorrect: false };
      }

      const result = JSON.parse(textContent.text) as {
        equivalent: boolean;
        explanation?: string;
        partialCredit?: number;
      };

      return {
        isCorrect: result.equivalent,
        feedback: result.explanation,
        partialCredit: result.partialCredit,
      };
    } catch (error) {
      console.error('Equivalence check error:', error);
      return { isCorrect: false };
    }
  }

  /**
   * Convert strokes to SVG for vision model
   */
  private strokesToSvg(strokes: Stroke[], width: number, height: number): string {
    const paths = strokes
      .map((stroke) => {
        if (stroke.points.length === 0) return '';

        const points = stroke.points;
        let d = `M ${points[0].x} ${points[0].y}`;

        if (points.length === 1) {
          // Single point - draw small circle
          d = `M ${points[0].x} ${points[0].y} m -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0`;
        } else {
          for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x} ${points[i].y}`;
          }
        }

        return `<path d="${d}" stroke="black" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="white"/>
  ${paths}
</svg>`;
  }

  /**
   * Validate and enhance recognition result
   */
  private validateResult(result: MathRecognitionResult, shouldEvaluate: boolean): MathRecognitionResult {
    // Ensure required fields
    const validated: MathRecognitionResult = {
      recognizedText: result.recognizedText || '',
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      alternatives: result.alternatives || [],
      expressionType: result.expressionType || 'unknown',
      latexRepresentation: result.latexRepresentation,
      evaluation: result.evaluation,
    };

    // Try to evaluate if not already done
    if (shouldEvaluate && validated.recognizedText && !validated.evaluation) {
      validated.evaluation = this.evaluateExpression(validated.recognizedText);
    }

    return validated;
  }

  /**
   * Evaluate a math expression using mathjs (safe alternative to eval)
   */
  private evaluateExpression(expression: string): EvaluationResult {
    try {
      // Sanitize and prepare expression for mathjs
      let expr = expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\^/g, '^') // mathjs uses ^ for exponents
        .replace(/√(\d+)/g, 'sqrt($1)')
        .replace(/π/g, 'pi')
        .replace(/\s+/g, '');

      // Handle simple equations (solve for result)
      if (expr.includes('=')) {
        const parts = expr.split('=');
        if (parts.length === 2) {
          // Check if one side is a simple variable or unknown
          if (parts[0].match(/^[a-z]$/i)) {
            expr = parts[1];
          } else if (parts[1].match(/^[a-z]$/i) || parts[1] === '?') {
            expr = parts[0];
          }
        }
      }

      // Only allow safe characters for mathjs
      // mathjs handles validation internally, but we still sanitize
      if (!/^[\d+\-*/^.()sqrt pi\s]+$/i.test(expr)) {
        return {
          isValid: true,
          formattedResult: expression,
        };
      }

      // Use mathjs for safe expression evaluation
      const result = mathEvaluate(expr);

      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return {
          isValid: true,
          result,
          formattedResult: Number.isInteger(result) ? result.toString() : result.toFixed(4).replace(/\.?0+$/, ''),
        };
      }

      return {
        isValid: true,
        formattedResult: expression,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Could not evaluate expression',
      };
    }
  }
}
