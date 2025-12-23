/* eslint-disable no-case-declarations, @typescript-eslint/no-unused-vars */
/**
 * QTI Response Processor
 *
 * Scores QTI responses according to the response processing rules defined
 * in the assessment item. Supports:
 * - Standard response processing templates
 * - Custom response conditions
 * - Outcome variable computation
 * - Partial credit scoring via mappings
 *
 * @see https://www.imsglobal.org/question/qtiv2p1/imsqti_implv2p1.html#element10436
 */

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unnecessary-condition */

import type {
  QtiAssessmentItem,
  QtiResponseDeclaration,
  QtiOutcomeDeclaration,
  QtiCardinality,
  QtiBaseType,
  QtiMapping,
} from './parser';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ResponseValue {
  identifier: string;
  value: ResponsePrimitive | ResponsePrimitive[];
}

export type ResponsePrimitive = string | number | boolean | null;

export interface ProcessedResponse {
  /** Response identifier */
  identifier: string;
  /** Submitted value */
  value: ResponsePrimitive | ResponsePrimitive[];
  /** Whether the response is correct */
  isCorrect: boolean;
  /** Partial score (0.0 - 1.0) if applicable */
  score?: number;
  /** Points earned */
  points?: number;
  /** Maximum points possible */
  maxPoints?: number;
  /** Feedback identifiers to show */
  feedback?: string[];
}

export interface ProcessingResult {
  /** Overall correctness */
  isCorrect: boolean;
  /** Total score (sum of all response scores) */
  totalScore: number;
  /** Maximum possible score */
  maxScore: number;
  /** Normalized score (0.0 - 1.0) */
  normalizedScore: number;
  /** Individual response results */
  responses: ProcessedResponse[];
  /** Computed outcome variables */
  outcomes: Record<string, ResponsePrimitive>;
  /** Errors during processing */
  errors: string[];
  /** Modal feedback to show */
  modalFeedback?: string[];
}

export interface ProcessingContext {
  /** Item being processed */
  item: QtiAssessmentItem;
  /** Submitted responses */
  responses: ResponseValue[];
  /** Current outcome values */
  outcomes: Map<string, ResponsePrimitive>;
  /** Processing errors */
  errors: string[];
}

// Standard response processing templates
export type ResponseProcessingTemplate = 'match_correct' | 'map_response' | 'map_response_point';

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE PROCESSOR
// ══════════════════════════════════════════════════════════════════════════════

export class QtiResponseProcessor {
  /**
   * Process responses for an assessment item
   */
  processResponses(item: QtiAssessmentItem, responses: ResponseValue[]): ProcessingResult {
    const errors: string[] = [];
    const processedResponses: ProcessedResponse[] = [];

    // Initialize outcomes with default values
    const outcomes = new Map<string, ResponsePrimitive>();
    for (const od of item.outcomeDeclarations) {
      outcomes.set(od.identifier, od.defaultValue ?? this.getDefaultForType(od.baseType));
    }

    // Create processing context
    const context: ProcessingContext = {
      item,
      responses,
      outcomes,
      errors,
    };

    // Determine processing template
    const template = this.detectTemplate(item);

    // Process each response
    for (const response of responses) {
      const declaration = item.responseDeclarations.find(
        (rd) => rd.identifier === response.identifier
      );

      if (!declaration) {
        errors.push(`Unknown response identifier: ${response.identifier}`);
        continue;
      }

      const processed = this.processResponse(response, declaration, template, context);

      processedResponses.push(processed);
    }

    // Apply response processing rules if present
    if (item.responseProcessing?.rules) {
      this.applyResponseProcessingRules(context);
    }

    // Calculate totals
    const totalScore =
      (outcomes.get('SCORE') as number) ??
      processedResponses.reduce((sum, r) => sum + (r.points ?? 0), 0);

    const maxScore = this.calculateMaxScore(item);
    const normalizedScore = maxScore > 0 ? totalScore / maxScore : 0;
    const isCorrect = normalizedScore >= 1.0;

    // Determine modal feedback
    const modalFeedback = this.determineModalFeedback(item, outcomes, isCorrect);

    return {
      isCorrect,
      totalScore,
      maxScore,
      normalizedScore: Math.min(1, Math.max(0, normalizedScore)),
      responses: processedResponses,
      outcomes: Object.fromEntries(outcomes),
      errors,
      modalFeedback,
    };
  }

  /**
   * Process a single response
   */
  private processResponse(
    response: ResponseValue,
    declaration: QtiResponseDeclaration,
    template: ResponseProcessingTemplate,
    context: ProcessingContext
  ): ProcessedResponse {
    const { value } = response;
    const { correctResponse, mapping, cardinality, baseType } = declaration;

    let isCorrect = false;
    let score: number | undefined;
    let points: number | undefined;
    let maxPoints: number | undefined;

    switch (template) {
      case 'match_correct':
        isCorrect = this.matchCorrect(value, correctResponse, cardinality);
        score = isCorrect ? 1 : 0;
        points = isCorrect ? 1 : 0;
        maxPoints = 1;
        break;

      case 'map_response':
      case 'map_response_point':
        if (mapping) {
          const result = this.mapResponse(value, mapping, cardinality, baseType);
          points = result.score;
          maxPoints = result.maxScore;
          score = maxPoints > 0 ? points / maxPoints : 0;
          isCorrect = score >= 1.0;
        } else {
          // Fall back to match_correct
          isCorrect = this.matchCorrect(value, correctResponse, cardinality);
          score = isCorrect ? 1 : 0;
          points = score;
          maxPoints = 1;
        }
        break;
    }

    // Update SCORE outcome
    const currentScore = (context.outcomes.get('SCORE') as number) ?? 0;
    context.outcomes.set('SCORE', currentScore + (points ?? 0));

    return {
      identifier: response.identifier,
      value,
      isCorrect,
      score,
      points,
      maxPoints,
    };
  }

  /**
   * Match response against correct response
   */
  private matchCorrect(
    value: ResponsePrimitive | ResponsePrimitive[],
    correctResponse: string | string[] | undefined,
    cardinality: QtiCardinality
  ): boolean {
    if (!correctResponse) return false;

    switch (cardinality) {
      case 'single':
        return this.compareValues(value, correctResponse);

      case 'multiple':
      case 'ordered':
        const valArray = Array.isArray(value) ? value : [value];
        const correctArray = Array.isArray(correctResponse) ? correctResponse : [correctResponse];

        if (cardinality === 'ordered') {
          // Order matters
          if (valArray.length !== correctArray.length) return false;
          return valArray.every((v, i) => this.compareValues(v, correctArray[i]));
        } else {
          // Order doesn't matter, but all must be present
          if (valArray.length !== correctArray.length) return false;
          return correctArray.every((c) => valArray.some((v) => this.compareValues(v, c)));
        }

      case 'record':
        // Record comparison not fully implemented
        return false;

      default:
        return false;
    }
  }

  /**
   * Map response using mapping table
   */
  private mapResponse(
    value: ResponsePrimitive | ResponsePrimitive[],
    mapping: QtiMapping,
    cardinality: QtiCardinality,
    baseType: QtiBaseType
  ): { score: number; maxScore: number } {
    const values = Array.isArray(value) ? value : [value];
    let score = 0;
    let maxScore = 0;

    // Calculate max possible score from mapping
    for (const entry of mapping.entries) {
      if (entry.mappedValue > 0) {
        maxScore += entry.mappedValue;
      }
    }

    // Calculate actual score
    for (const v of values) {
      const entry = mapping.entries.find((e) => {
        if (e.caseSensitive === false) {
          return String(e.mapKey).toLowerCase() === String(v).toLowerCase();
        }
        return e.mapKey === String(v);
      });

      if (entry) {
        score += entry.mappedValue;
      } else {
        score += mapping.defaultValue ?? 0;
      }
    }

    // Apply bounds
    if (mapping.lowerBound !== undefined) {
      score = Math.max(mapping.lowerBound, score);
    }
    if (mapping.upperBound !== undefined) {
      score = Math.min(mapping.upperBound, score);
      maxScore = Math.min(mapping.upperBound, maxScore);
    }

    return { score, maxScore };
  }

  /**
   * Compare two values for equality
   */
  private compareValues(
    a: ResponsePrimitive | ResponsePrimitive[],
    b: ResponsePrimitive | ResponsePrimitive[] | string | string[]
  ): boolean {
    if (a === null || b === null) return a === b;

    // Handle arrays
    if (Array.isArray(a) || Array.isArray(b)) {
      const arrA = Array.isArray(a) ? a : [a];
      const arrB = Array.isArray(b) ? b : [b];
      if (arrA.length !== arrB.length) return false;
      return arrA.every((v, i) => this.compareValues(v, arrB[i]));
    }

    // String comparison (case-insensitive for identifiers)
    if (typeof a === 'string' && typeof b === 'string') {
      return a.trim() === b.trim();
    }

    // Numeric comparison with tolerance
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b) < 1e-10;
    }

    // Boolean or mixed comparison
    return a === b;
  }

  /**
   * Detect response processing template
   */
  private detectTemplate(item: QtiAssessmentItem): ResponseProcessingTemplate {
    const templateUri = item.responseProcessing?.template;

    if (templateUri) {
      if (templateUri.includes('map_response_point')) {
        return 'map_response_point';
      }
      if (templateUri.includes('map_response')) {
        return 'map_response';
      }
      if (templateUri.includes('match_correct')) {
        return 'match_correct';
      }
    }

    // Infer from response declarations
    const hasMapping = item.responseDeclarations.some((rd) => rd.mapping);
    if (hasMapping) {
      return 'map_response';
    }

    return 'match_correct';
  }

  /**
   * Apply custom response processing rules
   */
  private applyResponseProcessingRules(context: ProcessingContext): void {
    const { item, responses, outcomes, errors } = context;
    const rules = item.responseProcessing?.rules ?? [];

    for (const rule of rules) {
      try {
        if (rule.type === 'setOutcomeValue') {
          this.processSetOutcomeValue(rule.raw, context);
        } else if (rule.type === 'responseCondition') {
          this.processResponseCondition(rule.raw, context);
        }
      } catch (error) {
        errors.push(
          `Error processing rule: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Process setOutcomeValue rule
   */
  private processSetOutcomeValue(rule: Record<string, unknown>, context: ProcessingContext): void {
    const identifier = rule['@_identifier'] as string;
    if (!identifier) return;

    // Simplified value extraction - in a full implementation,
    // this would evaluate expressions
    const baseValue = rule.baseValue as Record<string, unknown>;
    if (baseValue) {
      const value = baseValue['#text'] ?? baseValue.value;
      if (value !== undefined) {
        context.outcomes.set(identifier, value as ResponsePrimitive);
      }
    }
  }

  /**
   * Process responseCondition rule
   */
  private processResponseCondition(
    rule: Record<string, unknown>,
    context: ProcessingContext
  ): void {
    // Simplified condition processing
    // A full implementation would evaluate if/then/else branches

    const responseIf = rule.responseIf as Record<string, unknown>;
    if (responseIf) {
      // Check condition and apply outcomes if true
      const condition = this.evaluateCondition(responseIf, context);
      if (condition) {
        this.applyOutcomes(responseIf, context);
      }
    }
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(node: Record<string, unknown>, context: ProcessingContext): boolean {
    // Check for isNull
    if (node.isNull) {
      const varNode = node.isNull as Record<string, unknown>;
      const variable = varNode.variable as Record<string, unknown>;
      const identifier = variable?.['@_identifier'] as string;
      const response = context.responses.find((r) => r.identifier === identifier);
      return response?.value === null || response?.value === undefined;
    }

    // Check for match
    if (node.match) {
      const matchNode = node.match as Record<string, unknown>[];
      if (Array.isArray(matchNode) && matchNode.length === 2) {
        const left = this.resolveValue(matchNode[0], context);
        const right = this.resolveValue(matchNode[1], context);
        return this.compareValues(left, right);
      }
    }

    // Check for correct response comparison
    if (node.correct) {
      const correctNode = node.correct as Record<string, unknown>;
      const identifier = correctNode['@_identifier'] as string;
      const declaration = context.item.responseDeclarations.find(
        (rd) => rd.identifier === identifier
      );
      const response = context.responses.find((r) => r.identifier === identifier);
      if (declaration && response) {
        return this.matchCorrect(
          response.value,
          declaration.correctResponse,
          declaration.cardinality
        );
      }
    }

    // Default to true for unrecognized conditions
    return true;
  }

  /**
   * Resolve a value reference
   */
  private resolveValue(
    node: Record<string, unknown>,
    context: ProcessingContext
  ): ResponsePrimitive {
    if (node.variable) {
      const varNode = node.variable as Record<string, unknown>;
      const identifier = varNode['@_identifier'] as string;

      // Check responses
      const response = context.responses.find((r) => r.identifier === identifier);
      if (response) {
        return Array.isArray(response.value) ? response.value[0] : response.value;
      }

      // Check outcomes
      if (context.outcomes.has(identifier)) {
        return context.outcomes.get(identifier) ?? null;
      }
    }

    if (node.baseValue) {
      const bvNode = node.baseValue as Record<string, unknown>;
      return (bvNode['#text'] ?? bvNode.value ?? null) as ResponsePrimitive;
    }

    if (node.correct) {
      const correctNode = node.correct as Record<string, unknown>;
      const identifier = correctNode['@_identifier'] as string;
      const declaration = context.item.responseDeclarations.find(
        (rd) => rd.identifier === identifier
      );
      if (declaration?.correctResponse) {
        return Array.isArray(declaration.correctResponse)
          ? declaration.correctResponse[0]
          : declaration.correctResponse;
      }
    }

    return null;
  }

  /**
   * Apply outcomes from a condition branch
   */
  private applyOutcomes(node: Record<string, unknown>, context: ProcessingContext): void {
    const setOutcome = node.setOutcomeValue as Record<string, unknown>;
    if (setOutcome) {
      this.processSetOutcomeValue(setOutcome, context);
    }
  }

  /**
   * Calculate maximum possible score for an item
   */
  private calculateMaxScore(item: QtiAssessmentItem): number {
    // Check for SCORE outcome with normalMaximum
    const scoreOutcome = item.outcomeDeclarations.find((od) => od.identifier === 'SCORE');
    if (scoreOutcome?.normalMaximum !== undefined) {
      return scoreOutcome.normalMaximum;
    }

    // Calculate from mappings
    let maxScore = 0;
    for (const rd of item.responseDeclarations) {
      if (rd.mapping) {
        for (const entry of rd.mapping.entries) {
          if (entry.mappedValue > 0) {
            maxScore += entry.mappedValue;
          }
        }
        if (rd.mapping.upperBound !== undefined) {
          maxScore = Math.min(maxScore, rd.mapping.upperBound);
        }
      } else if (rd.correctResponse) {
        // Simple match_correct gets 1 point
        maxScore += 1;
      }
    }

    return maxScore || 1;
  }

  /**
   * Determine which modal feedback to show
   */
  private determineModalFeedback(
    item: QtiAssessmentItem,
    outcomes: Map<string, ResponsePrimitive>,
    isCorrect: boolean
  ): string[] {
    const feedbackIds: string[] = [];

    if (!item.modalFeedback) return feedbackIds;

    for (const mf of item.modalFeedback) {
      const outcomeValue = outcomes.get(mf.outcomeIdentifier);

      if (mf.showHide === 'show') {
        // Show if outcome matches identifier
        if (outcomeValue === mf.identifier) {
          feedbackIds.push(mf.identifier);
        }
        // Common patterns
        if (mf.identifier === 'correct' && isCorrect) {
          feedbackIds.push(mf.identifier);
        }
        if (mf.identifier === 'incorrect' && !isCorrect) {
          feedbackIds.push(mf.identifier);
        }
      } else {
        // Hide if outcome matches identifier
        if (outcomeValue !== mf.identifier) {
          feedbackIds.push(mf.identifier);
        }
      }
    }

    return feedbackIds;
  }

  /**
   * Get default value for a base type
   */
  private getDefaultForType(baseType: QtiBaseType): ResponsePrimitive {
    switch (baseType) {
      case 'boolean':
        return false;
      case 'integer':
      case 'float':
        return 0;
      case 'string':
      case 'identifier':
      case 'uri':
        return '';
      default:
        return null;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const qtiResponseProcessor = new QtiResponseProcessor();

export function processQtiResponses(
  item: QtiAssessmentItem,
  responses: ResponseValue[]
): ProcessingResult {
  return qtiResponseProcessor.processResponses(item, responses);
}
