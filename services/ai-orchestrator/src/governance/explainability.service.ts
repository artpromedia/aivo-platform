/**
 * Explainability Service (Governance)
 *
 * Provides human-readable explanations for AI-driven recommendations,
 * content scores, and student insight summaries.
 *
 * Delegates to:
 *   - brain-engine  GET /api/v1/explain/{id}
 *   - cognitive-load-svc  GET /api/v1/student/{id}/cognitive-load
 *   - ml-recommendation-svc  GET /api/v1/score/{contentId}/explain
 *
 * @module governance/explainability.service
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ExplanationFactor {
  factor: string;
  weight: number;
  description: string;
}

export interface RecommendationExplanation {
  recommendationId: string;
  factors: ExplanationFactor[];
  confidence: number;
  modelVersion: string;
  generatedAt: string;
}

export interface ContentScoreExplanation {
  contentId: string;
  score: number;
  factors: ExplanationFactor[];
  modelVersion: string;
  generatedAt: string;
}

export interface CognitiveLoadSnapshot {
  studentId: string;
  currentLoad: number;
  capacity: number;
  recentTrend: 'increasing' | 'stable' | 'decreasing';
  lastUpdated: string;
}

export interface StudentInsightSummary {
  studentId: string;
  tenantId: string;
  cognitiveLoad: CognitiveLoadSnapshot | null;
  recentRecommendations: RecommendationExplanation[];
  summary: string;
  generatedAt: string;
}

export interface ExplainabilityServiceOptions {
  brainEngineUrl: string;
  cognitiveLoadSvcUrl: string;
  mlRecommendationUrl: string;
  timeoutMs?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class ExplainabilityService {
  private readonly brainEngineUrl: string;
  private readonly cognitiveLoadSvcUrl: string;
  private readonly mlRecommendationUrl: string;
  private readonly timeoutMs: number;

  constructor(options: ExplainabilityServiceOptions) {
    this.brainEngineUrl = options.brainEngineUrl.replace(/\/+$/, '');
    this.cognitiveLoadSvcUrl = options.cognitiveLoadSvcUrl.replace(/\/+$/, '');
    this.mlRecommendationUrl = options.mlRecommendationUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  // ──────────────────────── Explain Recommendation ────────────────────────

  async explainRecommendation(recommendationId: string): Promise<RecommendationExplanation> {
    const url = `${this.brainEngineUrl}/api/v1/explain/${encodeURIComponent(recommendationId)}`;

    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!resp.ok) {
      throw new Error(
        `brain-engine /explain returned ${resp.status}: ${await resp.text().catch(() => '')}`,
      );
    }

    const body = (await resp.json()) as RecommendationExplanation;
    return {
      recommendationId: body.recommendationId,
      factors: body.factors,
      confidence: body.confidence,
      modelVersion: body.modelVersion,
      generatedAt: body.generatedAt,
    };
  }

  // ──────────────────────── Explain Content Score ────────────────────────

  async explainContentScore(contentId: string): Promise<ContentScoreExplanation> {
    const url = `${this.mlRecommendationUrl}/api/v1/score/${encodeURIComponent(contentId)}/explain`;

    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!resp.ok) {
      throw new Error(
        `ml-recommendation-svc /score/explain returned ${resp.status}: ${await resp.text().catch(() => '')}`,
      );
    }

    return (await resp.json()) as ContentScoreExplanation;
  }

  // ──────────────────────── Student Insight Summary ────────────────────────

  async getStudentInsightSummary(
    tenantId: string,
    studentId: string,
  ): Promise<StudentInsightSummary> {
    // Fire parallel requests to brain-engine and cognitive-load-svc
    const [cogLoad, recentRecs] = await Promise.allSettled([
      this.fetchCognitiveLoad(studentId),
      this.fetchRecentRecommendations(studentId),
    ]);

    const cognitiveLoad =
      cogLoad.status === 'fulfilled' ? cogLoad.value : null;
    const recentRecommendations =
      recentRecs.status === 'fulfilled' ? recentRecs.value : [];

    // Build human-readable summary
    const summary = this.buildSummary(cognitiveLoad, recentRecommendations);

    return {
      studentId,
      tenantId,
      cognitiveLoad,
      recentRecommendations,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  // ──────────────────────── Internal Fetchers ────────────────────────

  private async fetchCognitiveLoad(studentId: string): Promise<CognitiveLoadSnapshot> {
    const url = `${this.cognitiveLoadSvcUrl}/api/v1/student/${encodeURIComponent(studentId)}/cognitive-load`;

    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!resp.ok) {
      throw new Error(`cognitive-load-svc returned ${resp.status}`);
    }

    return (await resp.json()) as CognitiveLoadSnapshot;
  }

  private async fetchRecentRecommendations(
    studentId: string,
  ): Promise<RecommendationExplanation[]> {
    const url = `${this.brainEngineUrl}/api/v1/explain/student/${encodeURIComponent(studentId)}/recent`;

    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!resp.ok) {
      throw new Error(`brain-engine /explain/student/recent returned ${resp.status}`);
    }

    const body = (await resp.json()) as { recommendations: RecommendationExplanation[] };
    return body.recommendations ?? [];
  }

  // ──────────────────────── Summary Builder ────────────────────────

  private buildSummary(
    cogLoad: CognitiveLoadSnapshot | null,
    recommendations: RecommendationExplanation[],
  ): string {
    const parts: string[] = [];

    if (cogLoad) {
      const utilizationPct = Math.round((cogLoad.currentLoad / cogLoad.capacity) * 100);
      parts.push(
        `Cognitive load is at ${utilizationPct}% capacity (trend: ${cogLoad.recentTrend}).`,
      );
    } else {
      parts.push('Cognitive load data is currently unavailable.');
    }

    if (recommendations.length > 0) {
      const avgConf =
        recommendations.reduce((s, r) => s + r.confidence, 0) / recommendations.length;
      parts.push(
        `${recommendations.length} recent AI recommendations with average confidence ${(avgConf * 100).toFixed(1)}%.`,
      );
    } else {
      parts.push('No recent AI recommendations available.');
    }

    return parts.join(' ');
  }
}
