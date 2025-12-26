/**
 * Auto-Grading Service
 * 
 * Handles automatic grading for objective question types:
 * - Multiple choice
 * - Multi-select (with partial credit)
 * - True/False
 * - Fill-in-blank (with fuzzy matching)
 * - Matching (with partial credit)
 * - Ordering (with partial credit)
 * - Numeric (with tolerance)
 * - Hotspot
 * - Drag-drop
 * - Code (via test cases)
 */

import type {
  Question,
  QuestionAnswer,
  QuestionType,
  MultipleChoiceQuestion,
  MultipleSelectQuestion,
  TrueFalseQuestion,
  ShortAnswerQuestion,
  FillBlankQuestion,
  MatchingQuestion,
  OrderingQuestion,
  NumericQuestion,
  HotspotQuestion,
  DragDropQuestion,
  CodeQuestion,
} from '../types/assessment.types.js';

export interface GradingResult {
  score: number;
  maxPoints: number;
  isCorrect: boolean;
  partialCredit: boolean;
  feedback?: string;
  details?: Record<string, unknown>;
}

export class AutoGradingService {
  /**
   * Grade a response automatically
   */
  gradeResponse(question: Question, answer: QuestionAnswer): GradingResult {
    if (answer === null || answer === undefined) {
      return {
        score: 0,
        maxPoints: question.points,
        isCorrect: false,
        partialCredit: false,
        feedback: 'No answer provided',
      };
    }

    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        return this.gradeMultipleChoice(question as MultipleChoiceQuestion, answer as string);

      case 'MULTIPLE_SELECT':
        return this.gradeMultipleSelect(question as MultipleSelectQuestion, answer as string[]);

      case 'TRUE_FALSE':
        return this.gradeTrueFalse(question as TrueFalseQuestion, answer as boolean);

      case 'SHORT_ANSWER':
        return this.gradeShortAnswer(question as ShortAnswerQuestion, answer as string);

      case 'FILL_BLANK':
        return this.gradeFillBlank(question as FillBlankQuestion, answer as string[]);

      case 'MATCHING':
        return this.gradeMatching(question as MatchingQuestion, answer as Record<string, string>);

      case 'ORDERING':
        return this.gradeOrdering(question as OrderingQuestion, answer as string[]);

      case 'NUMERIC':
        return this.gradeNumeric(question as NumericQuestion, answer as number);

      case 'HOTSPOT':
        return this.gradeHotspot(question as HotspotQuestion, answer as Array<{ x: number; y: number }>);

      case 'DRAG_DROP':
        return this.gradeDragDrop(question as DragDropQuestion, answer as Record<string, string[]>);

      case 'CODE':
        return this.gradeCode(question as CodeQuestion, answer as { code: string; language: string });

      default:
        // Essay, Math Equation - cannot auto-grade
        return {
          score: 0,
          maxPoints: question.points,
          isCorrect: false,
          partialCredit: false,
          feedback: 'This question type requires manual grading',
        };
    }
  }

  /**
   * Check if a question type can be auto-graded
   */
  canAutoGrade(type: QuestionType): boolean {
    const autoGradableTypes: QuestionType[] = [
      'MULTIPLE_CHOICE',
      'MULTIPLE_SELECT',
      'TRUE_FALSE',
      'SHORT_ANSWER',
      'FILL_BLANK',
      'MATCHING',
      'ORDERING',
      'NUMERIC',
      'HOTSPOT',
      'DRAG_DROP',
      'CODE',
    ];
    return autoGradableTypes.includes(type);
  }

  // ============================================================================
  // GRADING METHODS
  // ============================================================================

  private gradeMultipleChoice(question: MultipleChoiceQuestion, answer: string): GradingResult {
    const isCorrect = answer === question.correctAnswer;
    const selectedOption = question.options.find(o => o.id === answer);

    let feedback = isCorrect
      ? question.feedback?.correct
      : question.feedback?.incorrect || selectedOption?.feedback;

    return {
      score: isCorrect ? question.points : 0,
      maxPoints: question.points,
      isCorrect,
      partialCredit: false,
      feedback,
    };
  }

  private gradeMultipleSelect(question: MultipleSelectQuestion, answer: string[]): GradingResult {
    const correctSet = new Set(question.correctAnswers);
    const answerSet = new Set(answer || []);

    if (!question.partialCredit) {
      // All or nothing
      const isCorrect =
        correctSet.size === answerSet.size &&
        [...correctSet].every(a => answerSet.has(a));

      return {
        score: isCorrect ? question.points : 0,
        maxPoints: question.points,
        isCorrect,
        partialCredit: false,
        feedback: isCorrect ? question.feedback?.correct : question.feedback?.incorrect,
      };
    }

    // Partial credit
    let correctCount = 0;
    let incorrectCount = 0;

    for (const ans of answerSet) {
      if (correctSet.has(ans)) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    }

    const missedCount = correctSet.size - correctCount;
    
    // Score calculation: correct selections minus penalties for incorrect
    const rawScore = Math.max(0, (correctCount - incorrectCount) / correctSet.size);
    const score = Math.round(question.points * rawScore * 100) / 100;
    const isCorrect = score === question.points;

    return {
      score,
      maxPoints: question.points,
      isCorrect,
      partialCredit: score > 0 && !isCorrect,
      feedback: isCorrect
        ? question.feedback?.correct
        : `${correctCount} correct, ${missedCount} missed, ${incorrectCount} incorrect`,
      details: { correctCount, missedCount, incorrectCount },
    };
  }

  private gradeTrueFalse(question: TrueFalseQuestion, answer: boolean): GradingResult {
    const isCorrect = answer === question.correctAnswer;

    return {
      score: isCorrect ? question.points : 0,
      maxPoints: question.points,
      isCorrect,
      partialCredit: false,
      feedback: isCorrect ? question.feedback?.correct : question.feedback?.incorrect,
    };
  }

  private gradeShortAnswer(question: ShortAnswerQuestion, answer: string): GradingResult {
    const normalizedAnswer = this.normalizeString(answer, question.caseSensitive ?? false);
    const acceptedAnswers = question.acceptedAnswers.map(a =>
      this.normalizeString(a, question.caseSensitive ?? false)
    );

    // Exact match check
    if (acceptedAnswers.includes(normalizedAnswer)) {
      return {
        score: question.points,
        maxPoints: question.points,
        isCorrect: true,
        partialCredit: false,
        feedback: question.feedback?.correct,
      };
    }

    // Fuzzy match check
    if (question.allowFuzzyMatch) {
      const threshold = question.fuzzyThreshold ?? 0.8;
      for (const accepted of acceptedAnswers) {
        if (this.fuzzyMatch(normalizedAnswer, accepted, threshold)) {
          return {
            score: question.points,
            maxPoints: question.points,
            isCorrect: true,
            partialCredit: false,
            feedback: question.feedback?.correct,
          };
        }
      }
    }

    return {
      score: 0,
      maxPoints: question.points,
      isCorrect: false,
      partialCredit: false,
      feedback: question.feedback?.incorrect,
    };
  }

  private gradeFillBlank(question: FillBlankQuestion, answers: string[]): GradingResult {
    const blanks = question.blanks;
    let correctCount = 0;
    const results: boolean[] = [];

    for (let i = 0; i < blanks.length; i++) {
      const blank = blanks[i];
      const studentAnswer = this.normalizeString(
        answers[i] || '',
        blank.caseSensitive ?? false
      );
      const acceptedAnswers = blank.acceptedAnswers.map(a =>
        this.normalizeString(a, blank.caseSensitive ?? false)
      );

      let isMatch = acceptedAnswers.includes(studentAnswer);

      if (!isMatch && blank.allowFuzzyMatch) {
        const threshold = blank.fuzzyThreshold ?? 0.8;
        for (const accepted of acceptedAnswers) {
          if (this.fuzzyMatch(studentAnswer, accepted, threshold)) {
            isMatch = true;
            break;
          }
        }
      }

      results.push(isMatch);
      if (isMatch) correctCount++;
    }

    const score = question.partialCredit
      ? Math.round((question.points * correctCount) / blanks.length * 100) / 100
      : correctCount === blanks.length ? question.points : 0;

    const isCorrect = correctCount === blanks.length;

    return {
      score,
      maxPoints: question.points,
      isCorrect,
      partialCredit: score > 0 && !isCorrect,
      feedback: isCorrect
        ? question.feedback?.correct
        : `${correctCount} of ${blanks.length} blanks correct`,
      details: { results, correctCount, totalBlanks: blanks.length },
    };
  }

  private gradeMatching(question: MatchingQuestion, answer: Record<string, string>): GradingResult {
    const pairs = question.pairs;
    let correctCount = 0;
    const results: Record<string, boolean> = {};

    for (const pair of pairs) {
      const isMatch = answer[pair.left] === pair.right;
      results[pair.left] = isMatch;
      if (isMatch) correctCount++;
    }

    const score = question.partialCredit
      ? Math.round((question.points * correctCount) / pairs.length * 100) / 100
      : correctCount === pairs.length ? question.points : 0;

    const isCorrect = correctCount === pairs.length;

    return {
      score,
      maxPoints: question.points,
      isCorrect,
      partialCredit: score > 0 && !isCorrect,
      feedback: isCorrect
        ? question.feedback?.correct
        : `${correctCount} of ${pairs.length} matches correct`,
      details: { results, correctCount, totalPairs: pairs.length },
    };
  }

  private gradeOrdering(question: OrderingQuestion, answer: string[]): GradingResult {
    const correctOrder = question.correctOrder;

    if (!question.partialCredit) {
      const isCorrect = JSON.stringify(answer) === JSON.stringify(correctOrder);
      return {
        score: isCorrect ? question.points : 0,
        maxPoints: question.points,
        isCorrect,
        partialCredit: false,
        feedback: isCorrect ? question.feedback?.correct : question.feedback?.incorrect,
      };
    }

    // Partial credit based on items in correct position
    let correctPositions = 0;
    for (let i = 0; i < correctOrder.length; i++) {
      if (answer[i] === correctOrder[i]) {
        correctPositions++;
      }
    }

    const score = Math.round((question.points * correctPositions) / correctOrder.length * 100) / 100;
    const isCorrect = correctPositions === correctOrder.length;

    return {
      score,
      maxPoints: question.points,
      isCorrect,
      partialCredit: score > 0 && !isCorrect,
      feedback: `${correctPositions} of ${correctOrder.length} items in correct position`,
      details: { correctPositions, totalItems: correctOrder.length },
    };
  }

  private gradeNumeric(question: NumericQuestion, answer: number): GradingResult {
    const correctAnswer = question.correctAnswer;
    const tolerance = question.tolerance ?? 0;

    let isCorrect: boolean;
    if (question.toleranceType === 'percentage') {
      const allowedDiff = Math.abs(correctAnswer * (tolerance / 100));
      isCorrect = Math.abs(answer - correctAnswer) <= allowedDiff;
    } else {
      isCorrect = Math.abs(answer - correctAnswer) <= tolerance;
    }

    return {
      score: isCorrect ? question.points : 0,
      maxPoints: question.points,
      isCorrect,
      partialCredit: false,
      feedback: isCorrect
        ? question.feedback?.correct
        : `Correct answer: ${correctAnswer}${tolerance > 0 ? ` (±${tolerance}${question.toleranceType === 'percentage' ? '%' : ''})` : ''}`,
      details: { answer, correctAnswer, tolerance, difference: Math.abs(answer - correctAnswer) },
    };
  }

  private gradeHotspot(
    question: HotspotQuestion,
    answer: Array<{ x: number; y: number }>
  ): GradingResult {
    const correctRegions = question.regions.filter(r => r.correct);
    
    if (question.multiSelect) {
      // Multiple hotspots - check if each click is in a correct region
      let correctClicks = 0;
      const clickResults: boolean[] = [];

      for (const click of answer) {
        const inCorrectRegion = correctRegions.some(region =>
          this.isPointInRegion(click, region)
        );
        clickResults.push(inCorrectRegion);
        if (inCorrectRegion) correctClicks++;
      }

      const score = question.partialCredit
        ? Math.round((question.points * correctClicks) / correctRegions.length * 100) / 100
        : correctClicks === correctRegions.length ? question.points : 0;

      return {
        score,
        maxPoints: question.points,
        isCorrect: correctClicks === correctRegions.length && answer.length === correctRegions.length,
        partialCredit: score > 0 && correctClicks < correctRegions.length,
        feedback: `${correctClicks} of ${correctRegions.length} correct regions selected`,
        details: { clickResults, correctClicks, totalRegions: correctRegions.length },
      };
    } else {
      // Single hotspot
      const click = answer[0];
      if (!click) {
        return {
          score: 0,
          maxPoints: question.points,
          isCorrect: false,
          partialCredit: false,
          feedback: 'No selection made',
        };
      }

      const isCorrect = correctRegions.some(region =>
        this.isPointInRegion(click, region)
      );

      return {
        score: isCorrect ? question.points : 0,
        maxPoints: question.points,
        isCorrect,
        partialCredit: false,
        feedback: isCorrect ? question.feedback?.correct : question.feedback?.incorrect,
      };
    }
  }

  private gradeDragDrop(
    question: DragDropQuestion,
    answer: Record<string, string[]>
  ): GradingResult {
    const zones = question.zones;
    let correctPlacements = 0;
    let totalPlacements = 0;
    const results: Record<string, { correct: number; incorrect: number }> = {};

    for (const zone of zones) {
      const placedItems = answer[zone.id] || [];
      const correctItems = new Set(zone.acceptedItems);
      let correct = 0;
      let incorrect = 0;

      for (const itemId of placedItems) {
        totalPlacements++;
        if (correctItems.has(itemId)) {
          correct++;
          correctPlacements++;
        } else {
          incorrect++;
        }
      }

      results[zone.id] = { correct, incorrect };
    }

    const totalExpected = zones.reduce((sum, z) => sum + z.acceptedItems.length, 0);
    const score = question.partialCredit
      ? Math.round((question.points * correctPlacements) / totalExpected * 100) / 100
      : correctPlacements === totalExpected ? question.points : 0;

    const isCorrect = correctPlacements === totalExpected;

    return {
      score,
      maxPoints: question.points,
      isCorrect,
      partialCredit: score > 0 && !isCorrect,
      feedback: `${correctPlacements} of ${totalExpected} items correctly placed`,
      details: { results, correctPlacements, totalExpected },
    };
  }

  private gradeCode(
    question: CodeQuestion,
    answer: { code: string; language: string }
  ): GradingResult {
    // Note: In production, code execution should be sandboxed
    // This is a simplified implementation
    const testCases = question.testCases;
    let passedTests = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    const testResults: Array<{
      id: string;
      passed: boolean;
      expected: string;
      actual?: string;
      error?: string;
    }> = [];

    for (const testCase of testCases) {
      const points = testCase.points ?? 1;
      totalPoints += points;

      try {
        // Simulate code execution (in production, use a sandboxed executor)
        const result = this.executeCode(answer.code, answer.language, testCase.input);
        const passed = result.output.trim() === testCase.expectedOutput.trim();

        testResults.push({
          id: testCase.id,
          passed,
          expected: testCase.hidden ? '[hidden]' : testCase.expectedOutput,
          actual: testCase.hidden ? '[hidden]' : result.output,
        });

        if (passed) {
          passedTests++;
          earnedPoints += points;
        }
      } catch (error: unknown) {
        testResults.push({
          id: testCase.id,
          passed: false,
          expected: testCase.hidden ? '[hidden]' : testCase.expectedOutput,
          error: error instanceof Error ? error.message : 'Execution error',
        });
      }
    }

    const score = question.partialCredit
      ? Math.round((question.points * earnedPoints) / totalPoints * 100) / 100
      : passedTests === testCases.length ? question.points : 0;

    return {
      score,
      maxPoints: question.points,
      isCorrect: passedTests === testCases.length,
      partialCredit: score > 0 && passedTests < testCases.length,
      feedback: `${passedTests} of ${testCases.length} test cases passed`,
      details: { testResults, passedTests, totalTests: testCases.length },
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private normalizeString(str: string, caseSensitive: boolean): string {
    let normalized = str.trim();
    if (!caseSensitive) {
      normalized = normalized.toLowerCase();
    }
    return normalized;
  }

  private fuzzyMatch(str1: string, str2: string, threshold: number): boolean {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return true;
    const similarity = 1 - distance / maxLength;
    return similarity >= threshold;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  private isPointInRegion(
    point: { x: number; y: number },
    region: {
      type: 'circle' | 'rectangle' | 'polygon';
      centerX?: number;
      centerY?: number;
      radius?: number;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      points?: Array<{ x: number; y: number }>;
    }
  ): boolean {
    switch (region.type) {
      case 'circle':
        if (region.centerX === undefined || region.centerY === undefined || region.radius === undefined) {
          return false;
        }
        const distance = Math.sqrt(
          Math.pow(point.x - region.centerX, 2) + Math.pow(point.y - region.centerY, 2)
        );
        return distance <= region.radius;

      case 'rectangle':
        if (region.x === undefined || region.y === undefined || 
            region.width === undefined || region.height === undefined) {
          return false;
        }
        return (
          point.x >= region.x &&
          point.x <= region.x + region.width &&
          point.y >= region.y &&
          point.y <= region.y + region.height
        );

      case 'polygon':
        if (!region.points || region.points.length < 3) {
          return false;
        }
        return this.isPointInPolygon(point, region.points);

      default:
        return false;
    }
  }

  private isPointInPolygon(
    point: { x: number; y: number },
    polygon: Array<{ x: number; y: number }>
  ): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      if (
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
    return inside;
  }

  private executeCode(
    code: string,
    language: string,
    input: string
  ): { output: string; executionTime: number } {
    // This is a placeholder - in production, code execution should be:
    // 1. Sandboxed (e.g., Docker container, AWS Lambda)
    // 2. Time-limited
    // 3. Memory-limited
    // 4. Network-isolated
    
    // For now, return a mock result
    // In production, integrate with a code execution service like:
    // - Judge0
    // - Sphere Engine
    // - HackerRank API
    // - Custom Docker-based executor
    
    throw new Error('Code execution not implemented - requires sandboxed environment');
  }
}

export const autoGradingService = new AutoGradingService();
