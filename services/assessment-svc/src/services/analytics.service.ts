/**
 * Assessment Analytics Service
 * 
 * Provides comprehensive analytics for assessments:
 * - Item analysis (difficulty, discrimination)
 * - Score distributions
 * - Reliability metrics (Cronbach's alpha, KR-20)
 * - Question effectiveness analysis
 * - Student performance patterns
 * - Standards mastery tracking
 */

import { prisma } from '../prisma.js';
import type {
  QuestionAnalytics,
  AssessmentAnalytics,
  Question,
  QuestionType,
} from '../types/assessment.types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ItemAnalysis {
  questionId: string;
  questionStem: string;
  questionType: QuestionType;
  difficulty: number; // p-value: proportion correct (0-1)
  difficultyCategory: 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
  discrimination: number; // Point-biserial correlation (-1 to 1)
  discriminationCategory: 'poor' | 'fair' | 'good' | 'excellent';
  attemptsCount: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  averageScore: number;
  averageTimeSeconds: number;
  optionAnalysis?: OptionAnalysis[];
  flagged: boolean;
  flagReasons: string[];
}

export interface OptionAnalysis {
  optionIndex: number;
  optionText: string;
  isCorrect: boolean;
  selectedCount: number;
  selectedPercent: number;
  pointBiserial: number; // Correlation with total score
}

export interface ScoreDistribution {
  min: number;
  max: number;
  mean: number;
  median: number;
  mode: number;
  standardDeviation: number;
  skewness: number;
  kurtosis: number;
  range: number;
  percentiles: Record<number, number>; // 10th, 25th, 50th, 75th, 90th
  histogram: Array<{ min: number; max: number; count: number }>;
}

export interface ReliabilityMetrics {
  cronbachAlpha: number;
  kr20: number; // Kuder-Richardson 20
  sem: number; // Standard Error of Measurement
  splitHalfReliability: number;
  itemCount: number;
  sampleSize: number;
}

export interface StandardsMastery {
  standardId: string;
  standardCode: string;
  standardName: string;
  questionCount: number;
  averageMastery: number; // 0-100
  studentMasteryBreakdown: {
    mastered: number;    // >= 80%
    approaching: number; // 60-79%
    developing: number;  // 40-59%
    beginning: number;   // < 40%
  };
}

export interface AnalyticsTimeframe {
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// SERVICE
// ============================================================================

export class AnalyticsService {
  /**
   * Generate comprehensive analytics for an assessment
   */
  async generateAssessmentAnalytics(
    assessmentId: string,
    timeframe?: AnalyticsTimeframe
  ): Promise<AssessmentAnalytics> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: true,
        attempts: {
          where: {
            status: 'GRADED',
            ...(timeframe?.startDate && { submittedAt: { gte: timeframe.startDate } }),
            ...(timeframe?.endDate && { submittedAt: { lte: timeframe.endDate } }),
          },
          include: {
            responses: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const attempts = assessment.attempts;
    const responses = attempts.flatMap(a => a.responses);

    // Score distribution
    const scores = attempts.map(a => a.percentScore ?? 0);
    const scoreDistribution = this.calculateScoreDistribution(scores);

    // Reliability metrics
    const reliability = this.calculateReliability(
      attempts,
      assessment.questions
    );

    // Item analysis
    const itemAnalyses = await this.calculateItemAnalysis(
      assessment.questions,
      responses,
      attempts
    );

    // Question effectiveness
    const effectiveQuestions = itemAnalyses.filter(
      i => i.discrimination >= 0.3 && i.difficulty >= 0.2 && i.difficulty <= 0.8
    ).length;

    // Time analysis
    const completionTimes = attempts
      .filter(a => a.startedAt && a.submittedAt)
      .map(a => (a.submittedAt!.getTime() - a.startedAt!.getTime()) / 1000);
    
    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    // Completion rate
    const totalAttempts = await prisma.attempt.count({
      where: { assessmentId },
    });
    const completionRate = totalAttempts > 0
      ? (attempts.length / totalAttempts) * 100
      : 0;

    return {
      assessmentId,
      assessmentName: assessment.name,
      totalAttempts: attempts.length,
      completionRate,
      averageScore: scoreDistribution.mean,
      medianScore: scoreDistribution.median,
      scoreDistribution,
      reliability,
      itemAnalyses,
      questionCount: assessment.questions.length,
      effectiveQuestionCount: effectiveQuestions,
      averageCompletionTimeSeconds: avgCompletionTime,
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate item analysis for individual questions
   */
  async calculateItemAnalysis(
    questions: Question[],
    responses: any[],
    attempts: any[]
  ): Promise<ItemAnalysis[]> {
    const analyses: ItemAnalysis[] = [];

    // Calculate total scores for point-biserial
    const attemptScores = new Map(
      attempts.map(a => [a.id, a.percentScore ?? 0])
    );

    for (const question of questions) {
      const questionResponses = responses.filter(
        r => r.questionId === question.id
      );

      if (questionResponses.length === 0) {
        analyses.push(this.createEmptyItemAnalysis(question));
        continue;
      }

      // Calculate difficulty (p-value)
      const correctCount = questionResponses.filter(
        r => r.pointsAwarded === r.maxPoints
      ).length;
      const difficulty = correctCount / questionResponses.length;

      // Calculate discrimination (point-biserial)
      const discrimination = this.calculatePointBiserial(
        questionResponses,
        attemptScores
      );

      // Calculate time
      const times = questionResponses
        .filter(r => r.timeSpent)
        .map(r => r.timeSpent);
      const avgTime = times.length > 0
        ? times.reduce((a: number, b: number) => a + b, 0) / times.length
        : 0;

      // Option analysis for multiple choice
      let optionAnalysis: OptionAnalysis[] | undefined;
      if (['MULTIPLE_CHOICE', 'MULTIPLE_SELECT'].includes(question.type)) {
        optionAnalysis = this.calculateOptionAnalysis(
          question,
          questionResponses,
          attemptScores
        );
      }

      // Check for flagged conditions
      const { flagged, flagReasons } = this.checkFlagConditions(
        difficulty,
        discrimination,
        optionAnalysis
      );

      analyses.push({
        questionId: question.id,
        questionStem: question.stem,
        questionType: question.type as QuestionType,
        difficulty,
        difficultyCategory: this.categorizeDifficulty(difficulty),
        discrimination,
        discriminationCategory: this.categorizeDiscrimination(discrimination),
        attemptsCount: questionResponses.length,
        correctCount,
        incorrectCount: questionResponses.filter(
          r => r.pointsAwarded === 0
        ).length,
        skippedCount: questionResponses.filter(
          r => r.status === 'SKIPPED'
        ).length,
        averageScore: questionResponses.reduce(
          (sum, r) => sum + (r.pointsAwarded ?? 0),
          0
        ) / questionResponses.length,
        averageTimeSeconds: avgTime,
        optionAnalysis,
        flagged,
        flagReasons,
      });
    }

    return analyses;
  }

  /**
   * Calculate score distribution statistics
   */
  calculateScoreDistribution(scores: number[]): ScoreDistribution {
    if (scores.length === 0) {
      return this.createEmptyDistribution();
    }

    const sorted = [...scores].sort((a, b) => a - b);
    const n = sorted.length;

    // Basic stats
    const min = sorted[0];
    const max = sorted[n - 1];
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    // Median
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // Mode
    const counts = new Map<number, number>();
    for (const score of sorted) {
      counts.set(score, (counts.get(score) ?? 0) + 1);
    }
    let mode = sorted[0];
    let maxCount = 0;
    for (const [score, count] of counts) {
      if (count > maxCount) {
        mode = score;
        maxCount = count;
      }
    }

    // Standard deviation
    const squaredDiffs = sorted.map(s => Math.pow(s - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
    const standardDeviation = Math.sqrt(variance);

    // Skewness
    const cubedDiffs = sorted.map(s => Math.pow((s - mean) / standardDeviation, 3));
    const skewness = cubedDiffs.reduce((a, b) => a + b, 0) / n;

    // Kurtosis
    const fourthDiffs = sorted.map(s => Math.pow((s - mean) / standardDeviation, 4));
    const kurtosis = fourthDiffs.reduce((a, b) => a + b, 0) / n - 3;

    // Percentiles
    const percentiles: Record<number, number> = {};
    for (const p of [10, 25, 50, 75, 90]) {
      const idx = Math.floor((p / 100) * (n - 1));
      percentiles[p] = sorted[idx];
    }

    // Histogram
    const histogram = this.createHistogram(sorted, 10);

    return {
      min,
      max,
      mean,
      median,
      mode,
      standardDeviation,
      skewness,
      kurtosis,
      range: max - min,
      percentiles,
      histogram,
    };
  }

  /**
   * Calculate reliability metrics
   */
  calculateReliability(
    attempts: any[],
    questions: Question[]
  ): ReliabilityMetrics {
    if (attempts.length < 2 || questions.length < 2) {
      return this.createEmptyReliability(questions.length, attempts.length);
    }

    // Build score matrix: students x items
    const matrix: number[][] = [];
    for (const attempt of attempts) {
      const row: number[] = [];
      for (const question of questions) {
        const response = attempt.responses?.find(
          (r: any) => r.questionId === question.id
        );
        // Normalize to 0-1
        const score = response
          ? (response.pointsAwarded ?? 0) / response.maxPoints
          : 0;
        row.push(score);
      }
      matrix.push(row);
    }

    // Cronbach's Alpha
    const cronbachAlpha = this.calculateCronbachAlpha(matrix);

    // KR-20 (for dichotomous items)
    const kr20 = this.calculateKR20(matrix);

    // Split-half reliability
    const splitHalf = this.calculateSplitHalfReliability(matrix);

    // Standard Error of Measurement
    const totalScores = matrix.map(row => row.reduce((a, b) => a + b, 0));
    const scoreSD = this.standardDeviation(totalScores);
    const sem = scoreSD * Math.sqrt(1 - cronbachAlpha);

    return {
      cronbachAlpha,
      kr20,
      sem,
      splitHalfReliability: splitHalf,
      itemCount: questions.length,
      sampleSize: attempts.length,
    };
  }

  /**
   * Generate question-level analytics
   */
  async generateQuestionAnalytics(
    questionId: string
  ): Promise<QuestionAnalytics> {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    const responses = await prisma.questionResponse.findMany({
      where: { questionId },
      include: {
        attempt: {
          select: { percentScore: true },
        },
      },
    });

    if (responses.length === 0) {
      return this.createEmptyQuestionAnalytics(questionId);
    }

    // Calculate metrics
    const correctCount = responses.filter(
      r => r.pointsAwarded === r.maxPoints
    ).length;
    const difficulty = correctCount / responses.length;

    const attemptScores = new Map(
      responses.map(r => [r.attemptId, r.attempt.percentScore ?? 0])
    );
    const discrimination = this.calculatePointBiserial(responses, attemptScores);

    const times = responses.filter(r => r.timeSpent).map(r => r.timeSpent as number);
    const avgTime = times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;

    return {
      questionId,
      attemptsCount: responses.length,
      correctCount,
      incorrectCount: responses.filter(r => r.pointsAwarded === 0).length,
      skippedCount: responses.filter(r => r.status === 'SKIPPED').length,
      averageScore: responses.reduce(
        (sum, r) => sum + (r.pointsAwarded ?? 0),
        0
      ) / responses.length,
      averageTimeSeconds: avgTime,
      difficulty,
      discrimination,
      lastCalculated: new Date(),
    };
  }

  /**
   * Calculate standards mastery for an assessment
   */
  async calculateStandardsMastery(
    assessmentId: string
  ): Promise<StandardsMastery[]> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        standards: {
          include: {
            standard: true,
          },
        },
        questions: {
          include: {
            standards: {
              include: {
                standard: true,
              },
            },
          },
        },
        attempts: {
          where: { status: 'GRADED' },
          include: {
            responses: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Group questions by standard
    const standardQuestions = new Map<string, string[]>();
    for (const question of assessment.questions) {
      for (const qs of question.standards ?? []) {
        const standardId = qs.standardId;
        if (!standardQuestions.has(standardId)) {
          standardQuestions.set(standardId, []);
        }
        standardQuestions.get(standardId)!.push(question.id);
      }
    }

    const results: StandardsMastery[] = [];

    for (const [standardId, questionIds] of standardQuestions) {
      const standard = assessment.standards.find(
        s => s.standardId === standardId
      )?.standard;

      if (!standard) continue;

      // Calculate mastery per student
      const studentMasteries: number[] = [];

      for (const attempt of assessment.attempts) {
        const relevantResponses = attempt.responses.filter(
          r => questionIds.includes(r.questionId)
        );

        if (relevantResponses.length === 0) continue;

        const earned = relevantResponses.reduce(
          (sum, r) => sum + (r.pointsAwarded ?? 0),
          0
        );
        const max = relevantResponses.reduce(
          (sum, r) => sum + r.maxPoints,
          0
        );
        const mastery = max > 0 ? (earned / max) * 100 : 0;
        studentMasteries.push(mastery);
      }

      const avgMastery = studentMasteries.length > 0
        ? studentMasteries.reduce((a, b) => a + b, 0) / studentMasteries.length
        : 0;

      results.push({
        standardId,
        standardCode: standard.code,
        standardName: standard.name,
        questionCount: questionIds.length,
        averageMastery: avgMastery,
        studentMasteryBreakdown: {
          mastered: studentMasteries.filter(m => m >= 80).length,
          approaching: studentMasteries.filter(m => m >= 60 && m < 80).length,
          developing: studentMasteries.filter(m => m >= 40 && m < 60).length,
          beginning: studentMasteries.filter(m => m < 40).length,
        },
      });
    }

    return results;
  }

  /**
   * Store analytics in database
   */
  async persistAnalytics(
    assessmentId: string,
    analytics: AssessmentAnalytics
  ): Promise<void> {
    // Upsert assessment analytics
    await prisma.assessmentAnalytics.upsert({
      where: { assessmentId },
      update: {
        attemptsCount: analytics.totalAttempts,
        averageScore: analytics.averageScore,
        medianScore: analytics.medianScore,
        standardDeviation: analytics.scoreDistribution.standardDeviation,
        cronbachAlpha: analytics.reliability.cronbachAlpha,
        lastCalculated: analytics.generatedAt,
      },
      create: {
        assessmentId,
        attemptsCount: analytics.totalAttempts,
        averageScore: analytics.averageScore,
        medianScore: analytics.medianScore,
        standardDeviation: analytics.scoreDistribution.standardDeviation,
        cronbachAlpha: analytics.reliability.cronbachAlpha,
        lastCalculated: analytics.generatedAt,
      },
    });

    // Upsert question analytics
    for (const item of analytics.itemAnalyses) {
      await prisma.questionAnalytics.upsert({
        where: { questionId: item.questionId },
        update: {
          attemptsCount: item.attemptsCount,
          correctCount: item.correctCount,
          incorrectCount: item.incorrectCount,
          skippedCount: item.skippedCount,
          averageScore: item.averageScore,
          averageTimeSeconds: item.averageTimeSeconds,
          difficulty: item.difficulty,
          discrimination: item.discrimination,
          lastCalculated: analytics.generatedAt,
        },
        create: {
          questionId: item.questionId,
          attemptsCount: item.attemptsCount,
          correctCount: item.correctCount,
          incorrectCount: item.incorrectCount,
          skippedCount: item.skippedCount,
          averageScore: item.averageScore,
          averageTimeSeconds: item.averageTimeSeconds,
          difficulty: item.difficulty,
          discrimination: item.discrimination,
          lastCalculated: analytics.generatedAt,
        },
      });
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private calculatePointBiserial(
    responses: any[],
    attemptScores: Map<string, number>
  ): number {
    if (responses.length < 2) return 0;

    // Get pass/fail for this question
    const passScores: number[] = [];
    const failScores: number[] = [];

    for (const response of responses) {
      const totalScore = attemptScores.get(response.attemptId) ?? 0;
      const isCorrect = response.pointsAwarded === response.maxPoints;

      if (isCorrect) {
        passScores.push(totalScore);
      } else {
        failScores.push(totalScore);
      }
    }

    if (passScores.length === 0 || failScores.length === 0) return 0;

    const meanPass = passScores.reduce((a, b) => a + b, 0) / passScores.length;
    const meanFail = failScores.reduce((a, b) => a + b, 0) / failScores.length;

    const allScores = responses.map(r => attemptScores.get(r.attemptId) ?? 0);
    const sd = this.standardDeviation(allScores);

    if (sd === 0) return 0;

    const p = passScores.length / responses.length;
    const q = 1 - p;

    return ((meanPass - meanFail) / sd) * Math.sqrt(p * q);
  }

  private calculateOptionAnalysis(
    question: Question,
    responses: any[],
    attemptScores: Map<string, number>
  ): OptionAnalysis[] {
    const options = question.options ?? [];
    const correctIndex = question.correctOption;

    return options.map((opt, idx) => {
      const selected = responses.filter(r => {
        const answer = r.answer;
        if (typeof answer === 'number') return answer === idx;
        if (answer?.selectedOption !== undefined) return answer.selectedOption === idx;
        return false;
      });

      // Calculate point-biserial for this option
      const selectedScores = selected.map(
        r => attemptScores.get(r.attemptId) ?? 0
      );
      const notSelectedScores = responses
        .filter(r => !selected.includes(r))
        .map(r => attemptScores.get(r.attemptId) ?? 0);

      let pointBiserial = 0;
      if (selectedScores.length > 0 && notSelectedScores.length > 0) {
        const meanSelected = selectedScores.reduce((a, b) => a + b, 0) / selectedScores.length;
        const meanNotSelected = notSelectedScores.reduce((a, b) => a + b, 0) / notSelectedScores.length;
        const allScores = responses.map(r => attemptScores.get(r.attemptId) ?? 0);
        const sd = this.standardDeviation(allScores);
        if (sd > 0) {
          const p = selectedScores.length / responses.length;
          pointBiserial = ((meanSelected - meanNotSelected) / sd) * Math.sqrt(p * (1 - p));
        }
      }

      return {
        optionIndex: idx,
        optionText: opt.text,
        isCorrect: idx === correctIndex,
        selectedCount: selected.length,
        selectedPercent: (selected.length / responses.length) * 100,
        pointBiserial,
      };
    });
  }

  private calculateCronbachAlpha(matrix: number[][]): number {
    const n = matrix.length;
    const k = matrix[0]?.length ?? 0;

    if (n < 2 || k < 2) return 0;

    // Item variances
    const itemVariances: number[] = [];
    for (let j = 0; j < k; j++) {
      const itemScores = matrix.map(row => row[j]);
      itemVariances.push(this.variance(itemScores));
    }

    // Total score variance
    const totalScores = matrix.map(row => row.reduce((a, b) => a + b, 0));
    const totalVariance = this.variance(totalScores);

    if (totalVariance === 0) return 0;

    const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);
    return (k / (k - 1)) * (1 - sumItemVariances / totalVariance);
  }

  private calculateKR20(matrix: number[][]): number {
    const n = matrix.length;
    const k = matrix[0]?.length ?? 0;

    if (n < 2 || k < 2) return 0;

    // For KR-20, items should be dichotomous (0 or 1)
    // Sum of p*q for each item
    let sumPQ = 0;
    for (let j = 0; j < k; j++) {
      const itemScores = matrix.map(row => row[j]);
      const p = itemScores.filter(s => s === 1).length / n;
      const q = 1 - p;
      sumPQ += p * q;
    }

    // Total score variance
    const totalScores = matrix.map(row => row.reduce((a, b) => a + b, 0));
    const totalVariance = this.variance(totalScores);

    if (totalVariance === 0) return 0;

    return (k / (k - 1)) * (1 - sumPQ / totalVariance);
  }

  private calculateSplitHalfReliability(matrix: number[][]): number {
    const k = matrix[0]?.length ?? 0;
    if (k < 2) return 0;

    // Split items into odd and even
    const oddScores: number[] = [];
    const evenScores: number[] = [];

    for (const row of matrix) {
      let odd = 0, even = 0;
      for (let j = 0; j < k; j++) {
        if (j % 2 === 0) even += row[j];
        else odd += row[j];
      }
      oddScores.push(odd);
      evenScores.push(even);
    }

    // Pearson correlation
    const r = this.pearsonCorrelation(oddScores, evenScores);

    // Spearman-Brown correction
    return (2 * r) / (1 + r);
  }

  private standardDeviation(values: number[]): number {
    return Math.sqrt(this.variance(values));
  }

  private variance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0 || n !== y.length) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denom = Math.sqrt(denomX * denomY);
    return denom === 0 ? 0 : numerator / denom;
  }

  private categorizeDifficulty(p: number): 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard' {
    if (p >= 0.9) return 'very_easy';
    if (p >= 0.7) return 'easy';
    if (p >= 0.4) return 'medium';
    if (p >= 0.2) return 'hard';
    return 'very_hard';
  }

  private categorizeDiscrimination(d: number): 'poor' | 'fair' | 'good' | 'excellent' {
    if (d >= 0.4) return 'excellent';
    if (d >= 0.3) return 'good';
    if (d >= 0.2) return 'fair';
    return 'poor';
  }

  private checkFlagConditions(
    difficulty: number,
    discrimination: number,
    optionAnalysis?: OptionAnalysis[]
  ): { flagged: boolean; flagReasons: string[] } {
    const reasons: string[] = [];

    if (difficulty < 0.2) {
      reasons.push('Question is very difficult (< 20% correct)');
    }
    if (difficulty > 0.9) {
      reasons.push('Question is very easy (> 90% correct)');
    }
    if (discrimination < 0.2) {
      reasons.push('Low discrimination index (< 0.2)');
    }
    if (discrimination < 0) {
      reasons.push('Negative discrimination - wrong answer correlated with higher scores');
    }

    // Check for distractors that outperform correct answer
    if (optionAnalysis) {
      const correct = optionAnalysis.find(o => o.isCorrect);
      for (const opt of optionAnalysis) {
        if (!opt.isCorrect && correct && opt.pointBiserial > correct.pointBiserial) {
          reasons.push(`Distractor "${opt.optionText}" has higher point-biserial than correct answer`);
        }
      }
    }

    return {
      flagged: reasons.length > 0,
      flagReasons: reasons,
    };
  }

  private createHistogram(
    sorted: number[],
    buckets: number
  ): Array<{ min: number; max: number; count: number }> {
    if (sorted.length === 0) return [];

    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min || 1;
    const bucketSize = range / buckets;

    const histogram: Array<{ min: number; max: number; count: number }> = [];
    for (let i = 0; i < buckets; i++) {
      const bucketMin = min + i * bucketSize;
      const bucketMax = min + (i + 1) * bucketSize;
      const count = sorted.filter(
        v => v >= bucketMin && (i === buckets - 1 ? v <= bucketMax : v < bucketMax)
      ).length;
      histogram.push({ min: bucketMin, max: bucketMax, count });
    }

    return histogram;
  }

  private createEmptyDistribution(): ScoreDistribution {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      mode: 0,
      standardDeviation: 0,
      skewness: 0,
      kurtosis: 0,
      range: 0,
      percentiles: { 10: 0, 25: 0, 50: 0, 75: 0, 90: 0 },
      histogram: [],
    };
  }

  private createEmptyReliability(itemCount: number, sampleSize: number): ReliabilityMetrics {
    return {
      cronbachAlpha: 0,
      kr20: 0,
      sem: 0,
      splitHalfReliability: 0,
      itemCount,
      sampleSize,
    };
  }

  private createEmptyItemAnalysis(question: Question): ItemAnalysis {
    return {
      questionId: question.id,
      questionStem: question.stem,
      questionType: question.type as QuestionType,
      difficulty: 0,
      difficultyCategory: 'medium',
      discrimination: 0,
      discriminationCategory: 'poor',
      attemptsCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      skippedCount: 0,
      averageScore: 0,
      averageTimeSeconds: 0,
      flagged: false,
      flagReasons: [],
    };
  }

  private createEmptyQuestionAnalytics(questionId: string): QuestionAnalytics {
    return {
      questionId,
      attemptsCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      skippedCount: 0,
      averageScore: 0,
      averageTimeSeconds: 0,
      difficulty: 0,
      discrimination: 0,
      lastCalculated: new Date(),
    };
  }
}

export const analyticsService = new AnalyticsService();
