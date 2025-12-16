import type { QuestionType, Prisma } from '../../generated/prisma-client/index.js';
import { prisma } from '../prisma.js';
import type { PrismaTransactionClient } from '../prisma.js';

import { questionService } from './question.service.js';

export interface ScoringResult {
  score: number; // Percentage 0-100
  pointsEarned: number;
  pointsPossible: number;
  correctCount: number;
  incorrectCount: number;
  pendingManualGrading: number;
}

export interface ResponseScoringResult {
  isCorrect: boolean;
  pointsEarned: number;
  partialCredit: boolean;
  feedback?: string;
}

// Types for correct answer structures
interface MultipleChoiceAnswer {
  optionId: string;
}

interface MultipleSelectAnswer {
  optionIds: string[];
}

interface TrueFalseAnswer {
  value: boolean;
}

interface ShortAnswerCorrect {
  acceptedAnswers: string[];
  caseSensitive?: boolean;
}

interface NumericAnswer {
  value: number;
  tolerance?: number;
}

interface OrderingAnswer {
  correctOrder: string[];
}

interface MatchingAnswer {
  pairs: { left: string; right: string }[];
}

interface FillBlankAnswer {
  blanks: {
    position: number;
    acceptedAnswers: string[];
    caseSensitive?: boolean;
  }[];
}

// Internal types for scoring
interface ScoringAccumulator {
  pointsEarned: number;
  correctCount: number;
  incorrectCount: number;
  pendingManualGrading: number;
}

export class ScoringService {
  /**
   * Process a manually graded response and update accumulator
   */
  private processManualResponse(
    response: { isCorrect: boolean | null; pointsEarned: number | null },
    acc: ScoringAccumulator
  ): void {
    if (response.isCorrect === null) {
      acc.pendingManualGrading++;
      return;
    }
    acc.pointsEarned += response.pointsEarned ?? 0;
    if (response.isCorrect) {
      acc.correctCount++;
    } else {
      acc.incorrectCount++;
    }
  }

  /**
   * Process an auto-scored response and update accumulator
   */
  private processAutoScoredResponse(result: ResponseScoringResult, acc: ScoringAccumulator): void {
    acc.pointsEarned += result.pointsEarned;
    if (result.isCorrect) {
      acc.correctCount++;
    } else {
      acc.incorrectCount++;
    }
  }

  /**
   * Count unanswered questions
   */
  private countUnansweredQuestions(
    assessmentQuestions: { questionId: string; question: { type: QuestionType } }[],
    answeredQuestionIds: Set<string>,
    acc: ScoringAccumulator
  ): void {
    for (const aq of assessmentQuestions) {
      if (answeredQuestionIds.has(aq.questionId)) {
        continue;
      }
      if (this.requiresManualGrading(aq.question.type)) {
        acc.pendingManualGrading++;
      } else {
        acc.incorrectCount++;
      }
    }
  }

  /**
   * Score an entire attempt
   */
  async scoreAttempt(attemptId: string, tx?: PrismaTransactionClient): Promise<ScoringResult> {
    const client = tx ?? prisma;

    const attempt = await client.attempt.findUnique({
      where: { id: attemptId },
      include: {
        responses: {
          include: { question: true },
        },
        assessment: {
          include: {
            questions: {
              include: { question: true },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const acc: ScoringAccumulator = {
      pointsEarned: 0,
      correctCount: 0,
      incorrectCount: 0,
      pendingManualGrading: 0,
    };

    // Process each response
    for (const response of attempt.responses) {
      const assessmentQuestion = attempt.assessment.questions.find(
        (aq) => aq.questionId === response.questionId
      );
      const maxPoints = assessmentQuestion?.points ?? response.question.points;

      // Check if this question type requires manual grading
      if (this.requiresManualGrading(response.question.type)) {
        this.processManualResponse(response, acc);
        continue;
      }

      // Auto-score the response
      const result = await this.scoreResponse(
        response.question.type,
        response.response,
        response.question.correctAnswer,
        maxPoints
      );

      // Update response with scoring
      await client.questionResponse.update({
        where: { id: response.id },
        data: {
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
          partialCredit: result.partialCredit,
          feedback: result.feedback,
        },
      });

      this.processAutoScoredResponse(result, acc);
    }

    // Mark unanswered questions as incorrect (0 points)
    const answeredQuestionIds = new Set(attempt.responses.map((r) => r.questionId));
    this.countUnansweredQuestions(attempt.assessment.questions, answeredQuestionIds, acc);

    const pointsPossible = attempt.assessment.totalPoints;
    const score = pointsPossible > 0 ? (acc.pointsEarned / pointsPossible) * 100 : 0;

    // Update question statistics
    for (const response of attempt.responses) {
      await questionService.updateStats(response.questionId, client);
    }

    return {
      score: Math.round(score * 100) / 100,
      pointsEarned: acc.pointsEarned,
      pointsPossible,
      correctCount: acc.correctCount,
      incorrectCount: acc.incorrectCount,
      pendingManualGrading: acc.pendingManualGrading,
    };
  }

  /**
   * Score a single response
   */
  async scoreResponse(
    questionType: QuestionType,
    response: unknown,
    correctAnswer: Prisma.JsonValue,
    maxPoints: number
  ): Promise<ResponseScoringResult> {
    switch (questionType) {
      case 'MULTIPLE_CHOICE':
        return this.scoreMultipleChoice(
          response,
          correctAnswer as unknown as MultipleChoiceAnswer,
          maxPoints
        );
      case 'MULTIPLE_SELECT':
        return this.scoreMultipleSelect(
          response,
          correctAnswer as unknown as MultipleSelectAnswer,
          maxPoints
        );
      case 'TRUE_FALSE':
        return this.scoreTrueFalse(
          response,
          correctAnswer as unknown as TrueFalseAnswer,
          maxPoints
        );
      case 'SHORT_ANSWER':
        return this.scoreShortAnswer(
          response,
          correctAnswer as unknown as ShortAnswerCorrect,
          maxPoints
        );
      case 'NUMERIC':
        return this.scoreNumeric(response, correctAnswer as unknown as NumericAnswer, maxPoints);
      case 'ORDERING':
        return this.scoreOrdering(response, correctAnswer as unknown as OrderingAnswer, maxPoints);
      case 'MATCHING':
        return this.scoreMatching(response, correctAnswer as unknown as MatchingAnswer, maxPoints);
      case 'FILL_BLANK':
        return this.scoreFillBlank(
          response,
          correctAnswer as unknown as FillBlankAnswer,
          maxPoints
        );
      case 'ESSAY':
      case 'HOTSPOT':
      case 'DRAG_DROP':
        // These require manual grading
        return {
          isCorrect: false,
          pointsEarned: 0,
          partialCredit: false,
          feedback: 'Awaiting manual grading',
        };
      default:
        return {
          isCorrect: false,
          pointsEarned: 0,
          partialCredit: false,
          feedback: 'Unknown question type',
        };
    }
  }

  /**
   * Manual grade a response
   */
  async manualGrade(
    responseId: string,
    pointsEarned: number,
    isCorrect: boolean | null,
    feedback?: string,
    gradedBy?: string,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;

    const response = await client.questionResponse.findUnique({
      where: { id: responseId },
      include: { question: true },
    });

    if (!response) {
      throw new Error('Response not found');
    }

    await client.questionResponse.update({
      where: { id: responseId },
      data: {
        isCorrect: isCorrect ?? pointsEarned > 0,
        pointsEarned,
        partialCredit: pointsEarned > 0 && pointsEarned < response.question.points,
        feedback,
      },
    });

    // Check if all responses are graded for the attempt
    await this.checkAndFinalizeAttempt(response.attemptId, gradedBy, client);
  }

  /**
   * Bulk manual grade
   */
  async bulkManualGrade(
    attemptId: string,
    grades: { responseId: string; pointsEarned: number; isCorrect?: boolean; feedback?: string }[],
    overallFeedback?: string,
    gradedBy?: string,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;

    await Promise.all(
      grades.map((grade) =>
        this.manualGrade(
          grade.responseId,
          grade.pointsEarned,
          grade.isCorrect ?? null,
          grade.feedback,
          gradedBy,
          client
        )
      )
    );

    if (overallFeedback) {
      await client.attempt.update({
        where: { id: attemptId },
        data: { feedback: overallFeedback },
      });
    }
  }

  // Private scoring methods

  private requiresManualGrading(questionType: QuestionType): boolean {
    return ['ESSAY', 'HOTSPOT', 'DRAG_DROP'].includes(questionType);
  }

  private scoreMultipleChoice(
    response: unknown,
    correctAnswer: MultipleChoiceAnswer,
    maxPoints: number
  ): ResponseScoringResult {
    const userAnswer = response as { optionId?: string };
    const isCorrect = userAnswer.optionId === correctAnswer.optionId;
    return {
      isCorrect,
      pointsEarned: isCorrect ? maxPoints : 0,
      partialCredit: false,
    };
  }

  private scoreMultipleSelect(
    response: unknown,
    correctAnswer: MultipleSelectAnswer,
    maxPoints: number
  ): ResponseScoringResult {
    const userAnswer = response as { optionIds?: string[] };
    const selectedIds = new Set(userAnswer.optionIds ?? []);
    const correctIds = new Set(correctAnswer.optionIds);

    // Count correct and incorrect selections
    let correctSelections = 0;
    let incorrectSelections = 0;

    for (const id of selectedIds) {
      if (correctIds.has(id)) {
        correctSelections++;
      } else {
        incorrectSelections++;
      }
    }

    // Full credit only if exact match
    const isExactMatch =
      selectedIds.size === correctIds.size && correctSelections === correctIds.size;

    if (isExactMatch) {
      return {
        isCorrect: true,
        pointsEarned: maxPoints,
        partialCredit: false,
      };
    }

    // Partial credit: points for correct, minus points for incorrect
    const pointsPerOption = maxPoints / correctIds.size;
    const earnedPoints = Math.max(0, (correctSelections - incorrectSelections) * pointsPerOption);

    return {
      isCorrect: false,
      pointsEarned: Math.round(earnedPoints * 100) / 100,
      partialCredit: earnedPoints > 0,
    };
  }

  private scoreTrueFalse(
    response: unknown,
    correctAnswer: TrueFalseAnswer,
    maxPoints: number
  ): ResponseScoringResult {
    const userAnswer = response as { value?: boolean };
    const isCorrect = userAnswer.value === correctAnswer.value;
    return {
      isCorrect,
      pointsEarned: isCorrect ? maxPoints : 0,
      partialCredit: false,
    };
  }

  private scoreShortAnswer(
    response: unknown,
    correctAnswer: ShortAnswerCorrect,
    maxPoints: number
  ): ResponseScoringResult {
    const userAnswer = response as { text?: string };
    const userText = userAnswer.text?.trim() ?? '';

    const isCorrect = correctAnswer.acceptedAnswers.some((accepted) => {
      if (correctAnswer.caseSensitive) {
        return userText === accepted.trim();
      }
      return userText.toLowerCase() === accepted.trim().toLowerCase();
    });

    return {
      isCorrect,
      pointsEarned: isCorrect ? maxPoints : 0,
      partialCredit: false,
    };
  }

  private scoreNumeric(
    response: unknown,
    correctAnswer: NumericAnswer,
    maxPoints: number
  ): ResponseScoringResult {
    const userAnswer = response as { value?: number };
    if (userAnswer.value === undefined) {
      return { isCorrect: false, pointsEarned: 0, partialCredit: false };
    }

    const tolerance = correctAnswer.tolerance ?? 0;
    const difference = Math.abs(userAnswer.value - correctAnswer.value);
    const isCorrect = difference <= tolerance;

    return {
      isCorrect,
      pointsEarned: isCorrect ? maxPoints : 0,
      partialCredit: false,
    };
  }

  private scoreOrdering(
    response: unknown,
    correctAnswer: OrderingAnswer,
    maxPoints: number
  ): ResponseScoringResult {
    const userAnswer = response as { order?: string[] };
    const userOrder = userAnswer.order ?? [];
    const correctOrder = correctAnswer.correctOrder;

    if (userOrder.length !== correctOrder.length) {
      return { isCorrect: false, pointsEarned: 0, partialCredit: false };
    }

    // Count positions in correct place
    let correctPositions = 0;
    for (let i = 0; i < userOrder.length; i++) {
      if (userOrder[i] === correctOrder[i]) {
        correctPositions++;
      }
    }

    const isExactMatch = correctPositions === correctOrder.length;

    if (isExactMatch) {
      return {
        isCorrect: true,
        pointsEarned: maxPoints,
        partialCredit: false,
      };
    }

    // Partial credit based on correct positions
    const earnedPoints = (correctPositions / correctOrder.length) * maxPoints;

    return {
      isCorrect: false,
      pointsEarned: Math.round(earnedPoints * 100) / 100,
      partialCredit: earnedPoints > 0,
    };
  }

  private scoreMatching(
    response: unknown,
    correctAnswer: MatchingAnswer,
    maxPoints: number
  ): ResponseScoringResult {
    const userAnswer = response as { pairs?: { left: string; right: string }[] };
    const userPairs = userAnswer.pairs ?? [];

    // Create a map of correct pairs
    const correctPairMap = new Map<string, string>();
    for (const pair of correctAnswer.pairs) {
      correctPairMap.set(pair.left, pair.right);
    }

    // Count correct matches
    let correctMatches = 0;
    for (const userPair of userPairs) {
      if (correctPairMap.get(userPair.left) === userPair.right) {
        correctMatches++;
      }
    }

    const totalPairs = correctAnswer.pairs.length;
    const isExactMatch = correctMatches === totalPairs && userPairs.length === totalPairs;

    if (isExactMatch) {
      return {
        isCorrect: true,
        pointsEarned: maxPoints,
        partialCredit: false,
      };
    }

    // Partial credit
    const earnedPoints = (correctMatches / totalPairs) * maxPoints;

    return {
      isCorrect: false,
      pointsEarned: Math.round(earnedPoints * 100) / 100,
      partialCredit: earnedPoints > 0,
    };
  }

  private scoreFillBlank(
    response: unknown,
    correctAnswer: FillBlankAnswer,
    maxPoints: number
  ): ResponseScoringResult {
    const userAnswer = response as { blanks?: { position: number; text: string }[] };
    const userBlanks = userAnswer.blanks ?? [];

    // Create a map of user answers by position
    const userBlankMap = new Map<number, string>();
    for (const blank of userBlanks) {
      userBlankMap.set(blank.position, blank.text.trim());
    }

    // Count correct blanks
    let correctBlanks = 0;
    for (const correctBlank of correctAnswer.blanks) {
      const userText = userBlankMap.get(correctBlank.position) ?? '';
      const isMatch = correctBlank.acceptedAnswers.some((accepted) => {
        if (correctBlank.caseSensitive) {
          return userText === accepted.trim();
        }
        return userText.toLowerCase() === accepted.trim().toLowerCase();
      });
      if (isMatch) {
        correctBlanks++;
      }
    }

    const totalBlanks = correctAnswer.blanks.length;
    const isExactMatch = correctBlanks === totalBlanks;

    if (isExactMatch) {
      return {
        isCorrect: true,
        pointsEarned: maxPoints,
        partialCredit: false,
      };
    }

    // Partial credit
    const earnedPoints = (correctBlanks / totalBlanks) * maxPoints;

    return {
      isCorrect: false,
      pointsEarned: Math.round(earnedPoints * 100) / 100,
      partialCredit: earnedPoints > 0,
    };
  }

  private async checkAndFinalizeAttempt(
    attemptId: string,
    gradedBy: string | undefined,
    client: PrismaTransactionClient
  ): Promise<void> {
    const attempt = await client.attempt.findUnique({
      where: { id: attemptId },
      include: {
        responses: true,
        assessment: true,
      },
    });

    if (attempt?.status !== 'GRADING') {
      return;
    }

    // Check if all responses are graded
    const ungradedResponses = attempt.responses.filter((r) => r.isCorrect === null);

    if (ungradedResponses.length > 0) {
      return; // Still has ungraded responses
    }

    // Calculate final score
    const pointsEarned = attempt.responses.reduce((sum, r) => sum + (r.pointsEarned ?? 0), 0);
    const score =
      attempt.assessment.totalPoints > 0
        ? (pointsEarned / attempt.assessment.totalPoints) * 100
        : 0;

    const settings = attempt.assessment.settings as { passingScore?: number } | null;
    const passed = settings?.passingScore ? score >= settings.passingScore : null;

    await client.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'GRADED',
        score: Math.round(score * 100) / 100,
        pointsEarned,
        passed,
        gradedBy,
        gradedAt: new Date(),
      },
    });
  }
}

export const scoringService = new ScoringService();
