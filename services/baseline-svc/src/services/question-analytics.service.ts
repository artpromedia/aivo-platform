/**
 * Question Analytics Service
 *
 * Tracks question performance for continuous improvement.
 * Collects psychometric data for item analysis and quality monitoring.
 *
 * Metrics:
 * - Response time per question
 * - Correct/incorrect rates
 * - Discrimination index
 * - Student feedback scores
 * - AI generation success rate
 *
 * @module question-analytics.service
 */

import type {
  QuestionAnalytics,
  AIGenerationAnalytics,
  IQuestionAnalyticsService,
  QuestionSource,
} from '../types/questions.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ResponseRecord {
  questionId: string;
  learnerId: string;
  isCorrect: boolean;
  latencyMs: number;
  selectedOption?: string;
  source: QuestionSource;
  timestamp: string;
}

interface GenerationRecord {
  generationId: string;
  success: boolean;
  latencyMs: number;
  questionCount: number;
  qualityScore?: number;
  errorType?: string;
  source: 'ai' | 'curated' | 'static';
  timestamp: string;
}

interface QuestionStats {
  questionId: string;
  skillCode: string;
  totalAttempts: number;
  correctCount: number;
  totalLatencyMs: number;
  latencies: number[];
  optionCounts: Map<string, number>;
  learnerIds: Set<string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION ANALYTICS SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class QuestionAnalyticsService implements IQuestionAnalyticsService {
  private responseRecords: ResponseRecord[] = [];
  private generationRecords: GenerationRecord[] = [];
  private questionStats = new Map<string, QuestionStats>();

  // Retention limits
  private readonly maxResponseRecords = 100000;
  private readonly maxGenerationRecords = 10000;

  /**
   * Record a question response for analytics.
   */
  async recordResponse(params: {
    questionId: string;
    learnerId: string;
    isCorrect: boolean;
    latencyMs: number;
    selectedOption?: string;
    source: QuestionSource;
  }): Promise<void> {
    const record: ResponseRecord = {
      ...params,
      timestamp: new Date().toISOString(),
    };

    // Store record
    this.responseRecords.push(record);
    if (this.responseRecords.length > this.maxResponseRecords) {
      this.responseRecords = this.responseRecords.slice(-this.maxResponseRecords);
    }

    // Update aggregated stats
    this.updateQuestionStats(params);

    console.log(
      `[QuestionAnalytics] Recorded response: ${params.questionId} - ` +
        `${params.isCorrect ? 'correct' : 'incorrect'} (${params.latencyMs}ms)`
    );
  }

  /**
   * Record AI generation attempt.
   */
  async recordGeneration(params: {
    generationId: string;
    success: boolean;
    latencyMs: number;
    questionCount: number;
    qualityScore?: number;
    errorType?: string;
    source: 'ai' | 'curated' | 'static';
  }): Promise<void> {
    const record: GenerationRecord = {
      ...params,
      timestamp: new Date().toISOString(),
    };

    this.generationRecords.push(record);
    if (this.generationRecords.length > this.maxGenerationRecords) {
      this.generationRecords = this.generationRecords.slice(-this.maxGenerationRecords);
    }
  }

  /**
   * Get analytics for a specific question.
   */
  async getQuestionAnalytics(questionId: string): Promise<QuestionAnalytics | null> {
    const stats = this.questionStats.get(questionId);
    if (!stats) return null;

    // Calculate metrics
    const correctRate = stats.totalAttempts > 0 ? stats.correctCount / stats.totalAttempts : 0;

    const averageLatencyMs =
      stats.totalAttempts > 0 ? stats.totalLatencyMs / stats.totalAttempts : 0;

    const sortedLatencies = [...stats.latencies].sort((a, b) => a - b);
    const medianLatencyMs =
      sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length / 2)] : 0;

    // Calculate discrimination index (simplified point-biserial)
    const discriminationIndex = this.calculateDiscriminationIndex(questionId);

    // Calculate difficulty estimate (proportion incorrect)
    const difficultyEstimate = 1 - correctRate;

    // Option distribution
    const optionDistribution: Record<string, number> = {};
    for (const [option, count] of stats.optionCounts) {
      optionDistribution[option] = count;
    }

    // Calculate skip/timeout rates from response patterns
    const relevantRecords = this.responseRecords.filter((r) => r.questionId === questionId);
    const skipRate = 0; // Would need skip tracking
    const timeoutRate =
      relevantRecords.filter((r) => r.latencyMs > 120000).length / (relevantRecords.length || 1);

    return {
      questionId,
      skillCode: stats.skillCode,
      totalAttempts: stats.totalAttempts,
      uniqueLearners: stats.learnerIds.size,
      correctRate: Math.round(correctRate * 1000) / 1000,
      averageLatencyMs: Math.round(averageLatencyMs),
      medianLatencyMs: Math.round(medianLatencyMs),
      discriminationIndex: Math.round(discriminationIndex * 1000) / 1000,
      difficultyEstimate: Math.round(difficultyEstimate * 1000) / 1000,
      itemTotalCorrelation: discriminationIndex, // Simplified
      optionDistribution,
      distractorEffectiveness: this.calculateDistractorEffectiveness(
        optionDistribution,
        correctRate
      ),
      skipRate,
      timeoutRate: Math.round(timeoutRate * 1000) / 1000,
      periodStart: this.getOldestTimestamp(relevantRecords),
      periodEnd: new Date().toISOString(),
    };
  }

  /**
   * Get AI generation analytics for monitoring.
   */
  async getGenerationAnalytics(startDate: string, endDate: string): Promise<AIGenerationAnalytics> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const periodRecords = this.generationRecords.filter((r) => {
      const ts = new Date(r.timestamp);
      return ts >= start && ts <= end;
    });

    const aiRecords = periodRecords.filter((r) => r.source === 'ai');
    const successfulAI = aiRecords.filter((r) => r.success);
    const failedAI = aiRecords.filter((r) => !r.success);

    // Calculate latency stats
    const latencies = successfulAI.map((r) => r.latencyMs).sort((a, b) => a - b);
    const averageLatencyMs =
      latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95LatencyMs = latencies[p95Index] || 0;

    // Quality scores
    const qualityScores = successfulAI
      .filter((r) => r.qualityScore !== undefined)
      .map((r) => r.qualityScore!);
    const averageQualityScore =
      qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0;

    // Validation pass rate (assume quality >= 0.7 is pass)
    const validationPassRate =
      successfulAI.length > 0
        ? qualityScores.filter((s) => s >= 0.7).length / successfulAI.length
        : 0;

    // Error breakdown
    const errorsByType: Record<string, number> = {};
    for (const record of failedAI) {
      const errorType = record.errorType || 'unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    }

    // Fallback counts
    const curatedBankFallbacks = periodRecords.filter((r) => r.source === 'curated').length;
    const staticFallbacks = periodRecords.filter((r) => r.source === 'static').length;

    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalRequests: periodRecords.length,
      successfulGenerations: successfulAI.length,
      failedGenerations: failedAI.length,
      averageLatencyMs: Math.round(averageLatencyMs),
      p95LatencyMs: Math.round(p95LatencyMs),
      averageQualityScore: Math.round(averageQualityScore * 100) / 100,
      validationPassRate: Math.round(validationPassRate * 100) / 100,
      averageReadingLevel: 6, // Would need to track
      curatedBankFallbacks,
      staticFallbacks,
      errorsByType,
    };
  }

  /**
   * Get questions that need review based on performance.
   */
  async getQuestionsNeedingReview(): Promise<{ questionId: string; reason: string }[]> {
    const needsReview: { questionId: string; reason: string }[] = [];

    for (const [questionId, stats] of this.questionStats) {
      // Skip questions with too few attempts
      if (stats.totalAttempts < 10) continue;

      const correctRate = stats.correctCount / stats.totalAttempts;
      const discriminationIndex = this.calculateDiscriminationIndex(questionId);

      // Too easy (>95% correct)
      if (correctRate > 0.95) {
        needsReview.push({
          questionId,
          reason: `Too easy: ${Math.round(correctRate * 100)}% correct rate`,
        });
      }

      // Too hard (<20% correct)
      if (correctRate < 0.2) {
        needsReview.push({
          questionId,
          reason: `Too difficult: ${Math.round(correctRate * 100)}% correct rate`,
        });
      }

      // Poor discrimination (negative or near-zero)
      if (discriminationIndex < 0.15) {
        needsReview.push({
          questionId,
          reason: `Poor discrimination: ${discriminationIndex.toFixed(2)} index`,
        });
      }

      // High average latency (>2 minutes)
      const avgLatency = stats.totalLatencyMs / stats.totalAttempts;
      if (avgLatency > 120000) {
        needsReview.push({
          questionId,
          reason: `High response time: ${Math.round(avgLatency / 1000)}s average`,
        });
      }
    }

    return needsReview.slice(0, 50); // Return top 50
  }

  /**
   * Get summary statistics across all questions.
   */
  async getSummaryStats(): Promise<{
    totalQuestions: number;
    totalResponses: number;
    averageCorrectRate: number;
    averageDiscrimination: number;
    questionsNeedingReview: number;
  }> {
    let totalCorrectRate = 0;
    let totalDiscrimination = 0;
    let questionCount = 0;

    for (const [questionId, stats] of this.questionStats) {
      if (stats.totalAttempts >= 5) {
        totalCorrectRate += stats.correctCount / stats.totalAttempts;
        totalDiscrimination += this.calculateDiscriminationIndex(questionId);
        questionCount++;
      }
    }

    const needsReview = await this.getQuestionsNeedingReview();

    return {
      totalQuestions: this.questionStats.size,
      totalResponses: this.responseRecords.length,
      averageCorrectRate:
        questionCount > 0 ? Math.round((totalCorrectRate / questionCount) * 100) / 100 : 0,
      averageDiscrimination:
        questionCount > 0 ? Math.round((totalDiscrimination / questionCount) * 100) / 100 : 0,
      questionsNeedingReview: needsReview.length,
    };
  }

  /**
   * Clear all analytics data.
   */
  clearAll(): void {
    this.responseRecords = [];
    this.generationRecords = [];
    this.questionStats.clear();
    console.log('[QuestionAnalytics] All data cleared');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Update aggregated question statistics.
   */
  private updateQuestionStats(params: {
    questionId: string;
    learnerId: string;
    isCorrect: boolean;
    latencyMs: number;
    selectedOption?: string;
  }): void {
    let stats = this.questionStats.get(params.questionId);

    if (!stats) {
      stats = {
        questionId: params.questionId,
        skillCode: '', // Would need to be passed or looked up
        totalAttempts: 0,
        correctCount: 0,
        totalLatencyMs: 0,
        latencies: [],
        optionCounts: new Map(),
        learnerIds: new Set(),
      };
      this.questionStats.set(params.questionId, stats);
    }

    stats.totalAttempts++;
    if (params.isCorrect) stats.correctCount++;
    stats.totalLatencyMs += params.latencyMs;
    stats.latencies.push(params.latencyMs);
    stats.learnerIds.add(params.learnerId);

    if (params.selectedOption) {
      stats.optionCounts.set(
        params.selectedOption,
        (stats.optionCounts.get(params.selectedOption) || 0) + 1
      );
    }

    // Limit latency history
    if (stats.latencies.length > 1000) {
      stats.latencies = stats.latencies.slice(-1000);
    }
  }

  /**
   * Calculate discrimination index using point-biserial correlation approximation.
   */
  private calculateDiscriminationIndex(questionId: string): number {
    const records = this.responseRecords.filter((r) => r.questionId === questionId);
    if (records.length < 10) return 0.5; // Not enough data

    // Group by learner, calculate total score
    const learnerScores = new Map<string, { correct: number; total: number }>();

    for (const record of this.responseRecords) {
      if (!learnerScores.has(record.learnerId)) {
        learnerScores.set(record.learnerId, { correct: 0, total: 0 });
      }
      const score = learnerScores.get(record.learnerId)!;
      score.total++;
      if (record.isCorrect) score.correct++;
    }

    // Calculate mean score for those who got this question right vs wrong
    const questionRecords = records;
    let correctMeanScore = 0;
    let incorrectMeanScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;

    for (const record of questionRecords) {
      const learnerScore = learnerScores.get(record.learnerId);
      if (!learnerScore || learnerScore.total === 0) continue;

      const normalizedScore = learnerScore.correct / learnerScore.total;

      if (record.isCorrect) {
        correctMeanScore += normalizedScore;
        correctCount++;
      } else {
        incorrectMeanScore += normalizedScore;
        incorrectCount++;
      }
    }

    if (correctCount === 0 || incorrectCount === 0) return 0.5;

    correctMeanScore /= correctCount;
    incorrectMeanScore /= incorrectCount;

    // Discrimination = difference in mean scores
    // Normalized to -1 to 1 range, then shifted to 0 to 1
    const discrimination = (correctMeanScore - incorrectMeanScore + 1) / 2;
    return Math.max(0, Math.min(1, discrimination));
  }

  /**
   * Calculate distractor effectiveness for MC questions.
   */
  private calculateDistractorEffectiveness(
    optionDistribution: Record<string, number>,
    correctRate: number
  ): Record<string, number> {
    const effectiveness: Record<string, number> = {};
    const total = Object.values(optionDistribution).reduce((a, b) => a + b, 0);

    if (total === 0) return effectiveness;

    for (const [option, count] of Object.entries(optionDistribution)) {
      const proportion = count / total;
      // Good distractors attract 10-30% of responses
      // Effectiveness = how close to ideal range
      const idealProportion = (1 - correctRate) / 3; // Assuming 4 options
      const deviation = Math.abs(proportion - idealProportion);
      effectiveness[option] = Math.max(0, 1 - deviation * 2);
    }

    return effectiveness;
  }

  /**
   * Get oldest timestamp from records.
   */
  private getOldestTimestamp(records: ResponseRecord[]): string {
    if (records.length === 0) return new Date().toISOString();
    return records.reduce(
      (oldest, r) => (r.timestamp < oldest ? r.timestamp : oldest),
      records[0].timestamp
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const questionAnalyticsService = new QuestionAnalyticsService();

export default questionAnalyticsService;
