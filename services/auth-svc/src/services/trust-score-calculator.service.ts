/**
 * Trust Score Calculator Service
 *
 * Calculates the composite trust score from multiple data sources
 */

import type {
  ReviewData,
  ComplianceData,
  VerificationData,
  TenureData,
  ActivityData,
  TrustScoreResult,
  TrustScoreFactors,
  PositiveFactor,
  NegativeFactor,
  SuggestionFactor,
  TrustTier,
  TrustScoreWeights,
  VerificationLevel,
  ComplianceSeverity,
} from '../types/trust-score.types.js';
import { DEFAULT_WEIGHTS } from '../types/trust-score.types.js';

const CALCULATION_VERSION = 1;

// Tier thresholds
const TIER_THRESHOLDS: Record<TrustTier, { min: number; max: number }> = {
  EMERGING: { min: 0, max: 39 },
  ESTABLISHED: { min: 40, max: 59 },
  TRUSTED: { min: 60, max: 79 },
  HIGHLY_TRUSTED: { min: 80, max: 94 },
  ELITE: { min: 95, max: 100 },
};

// Verification level scores
const VERIFICATION_SCORES: Record<VerificationLevel, number> = {
  NONE: 0,
  EMAIL: 20,
  BASIC: 50,
  ENHANCED: 80,
  PREMIUM: 100,
};

// Compliance severity impacts
const SEVERITY_IMPACTS: Record<ComplianceSeverity, number> = {
  LOW: 2,
  MEDIUM: 5,
  HIGH: 15,
  CRITICAL: 30,
};

export interface TrustScoreCalculatorConfig {
  weights?: Partial<TrustScoreWeights>;
}

export interface ScoreInput {
  reviews: ReviewData;
  compliance: ComplianceData;
  verification: VerificationData;
  tenure: TenureData;
  activity: ActivityData;
}

export class TrustScoreCalculatorService {
  private readonly weights: TrustScoreWeights;

  constructor(config: TrustScoreCalculatorConfig = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...config.weights };
  }

  /**
   * Calculate the full trust score from all input data
   */
  calculate(input: ScoreInput): TrustScoreResult {
    const factors: TrustScoreFactors = {
      positive: [],
      negative: [],
      suggestions: [],
    };

    // Calculate component scores
    const reviewScore = this.calculateReviewScore(input.reviews, factors);
    const complianceScore = this.calculateComplianceScore(input.compliance, factors);
    const verificationScore = this.calculateVerificationScore(input.verification, factors);
    const tenureScore = this.calculateTenureScore(input.tenure, factors);
    const activityScore = this.calculateActivityScore(input.activity, factors);

    // Calculate weighted overall score
    const overallScore = this.calculateOverallScore({
      reviewScore,
      complianceScore,
      verificationScore,
      tenureScore,
      activityScore,
    });

    // Determine tier
    const tier = this.determineTier(overallScore);

    // Add tier-based suggestions
    this.addTierSuggestions(tier, overallScore, factors);

    return {
      overallScore: Math.round(overallScore),
      reviewScore: Math.round(reviewScore),
      complianceScore: Math.round(complianceScore),
      verificationScore: Math.round(verificationScore),
      tenureScore: Math.round(tenureScore),
      activityScore: Math.round(activityScore),
      tier,
      factors,
      calculationVersion: CALCULATION_VERSION,
    };
  }

  /**
   * Calculate review component score (0-100)
   */
  private calculateReviewScore(data: ReviewData, factors: TrustScoreFactors): number {
    // No reviews yet - start at baseline
    if (data.totalReviews === 0) {
      factors.suggestions.push({
        category: 'reviews',
        suggestion: 'Complete your first job',
        description: 'Earn your first review to start building your reputation',
        potentialImpact: 'Up to 40 points',
      });
      return 50; // Neutral starting point
    }

    let score = 0;

    // Base score from average rating (0-60 points)
    // Rating is 1-5, so (rating - 1) / 4 gives 0-1, then * 60
    score += ((data.averageRating - 1) / 4) * 60;

    // Volume bonus (0-20 points) - logarithmic scaling
    // 1 review = ~0, 10 reviews = ~10, 100 reviews = ~20
    const volumeBonus = Math.min(20, Math.log10(data.totalReviews) * 10);
    score += volumeBonus;

    // Consistency bonus (0-10 points) - lower std dev = more consistent
    if (data.ratingStdDev !== null && data.totalReviews >= 5) {
      // stdDev of 0 = 10 points, stdDev of 2 = 0 points
      const consistencyScore = Math.max(0, 10 - data.ratingStdDev * 5);
      score += consistencyScore;
    }

    // Recent performance modifier (±10 points)
    if (data.recentTotalReviews > 0) {
      const recentPositiveRatio = data.recentPositiveReviews / data.recentTotalReviews;
      const recentNegativeRatio = data.recentNegativeReviews / data.recentTotalReviews;

      if (recentPositiveRatio >= 0.9) {
        score += 10;
        factors.positive.push({
          category: 'reviews',
          factor: 'Excellent recent ratings',
          description: '90%+ positive reviews in the last 90 days',
          impact: 'high',
        });
      } else if (recentNegativeRatio >= 0.3) {
        score -= 10;
        factors.negative.push({
          category: 'reviews',
          factor: 'Recent negative feedback',
          description: 'High rate of negative reviews in the last 90 days',
          impact: 'high',
        });
      }
    }

    // Add factors based on score
    if (data.averageRating >= 4.8 && data.totalReviews >= 10) {
      factors.positive.push({
        category: 'reviews',
        factor: 'Outstanding reputation',
        description: `${data.averageRating.toFixed(1)} average rating across ${data.totalReviews} reviews`,
        impact: 'high',
      });
    } else if (data.averageRating >= 4.5 && data.totalReviews >= 5) {
      factors.positive.push({
        category: 'reviews',
        factor: 'Strong reputation',
        description: `${data.averageRating.toFixed(1)} average rating`,
        impact: 'medium',
      });
    }

    if (data.totalReviews < 5) {
      factors.suggestions.push({
        category: 'reviews',
        suggestion: 'Build your review history',
        description: 'Complete more jobs to establish a stronger reputation',
        potentialImpact: 'Up to 20 points',
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate compliance component score (0-100)
   */
  private calculateComplianceScore(data: ComplianceData, factors: TrustScoreFactors): number {
    // Perfect compliance with no sessions yet
    if (data.totalSessions === 0) {
      return 100;
    }

    let score = 100;

    // Session compliance ratio
    const complianceRatio = (data.totalSessions - data.violationSessions) / data.totalSessions;
    const sessionPenalty = (1 - complianceRatio) * 30;
    score -= sessionPenalty;

    // Individual violation penalties
    for (const violation of data.violations) {
      const severityImpact = SEVERITY_IMPACTS[violation.severity];

      // Unresolved violations have full impact
      // Resolved violations have reduced impact (decay over time)
      if (!violation.isResolved) {
        score -= severityImpact;
      } else {
        // Resolved violations still count but at 50% impact
        score -= severityImpact * 0.5;
      }
    }

    // Time-based recovery for clean record
    if (data.lastViolationAt) {
      const daysSinceViolation = Math.floor(
        (Date.now() - data.lastViolationAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceViolation > 180) {
        score += 10;
        factors.positive.push({
          category: 'compliance',
          factor: 'Clean record',
          description: 'No violations in over 6 months',
          impact: 'medium',
        });
      }
    } else {
      factors.positive.push({
        category: 'compliance',
        factor: 'Perfect compliance',
        description: 'No recorded violations',
        impact: 'high',
      });
    }

    // Add negative factors for violations
    const unresolvedCount = data.violations.filter((v) => !v.isResolved).length;
    const criticalCount = data.violations.filter((v) => v.severity === 'CRITICAL').length;

    if (unresolvedCount > 0) {
      factors.negative.push({
        category: 'compliance',
        factor: 'Unresolved violations',
        description: `${unresolvedCount} compliance issue(s) pending resolution`,
        impact: unresolvedCount >= 3 ? 'high' : 'medium',
      });

      factors.suggestions.push({
        category: 'compliance',
        suggestion: 'Resolve compliance issues',
        description: 'Work with support to address outstanding violations',
        potentialImpact: `Up to ${unresolvedCount * 10} points`,
      });
    }

    if (criticalCount > 0) {
      factors.negative.push({
        category: 'compliance',
        factor: 'Critical violations',
        description: 'Serious compliance issues that significantly impact trust',
        impact: 'high',
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate verification component score (0-100)
   */
  private calculateVerificationScore(data: VerificationData, factors: TrustScoreFactors): number {
    let score = 0;

    // Verification level (0-60 points)
    score += VERIFICATION_SCORES[data.verificationLevel] * 0.6;

    // MFA bonus (0-20 points)
    if (data.mfaEnabled) {
      score += 20;
      factors.positive.push({
        category: 'security',
        factor: 'Two-factor authentication enabled',
        description: 'Account secured with MFA',
        impact: 'medium',
      });
    } else {
      factors.suggestions.push({
        category: 'security',
        suggestion: 'Enable two-factor authentication',
        description: 'Secure your account with MFA for additional protection',
        potentialImpact: '20 points',
      });
    }

    // OAuth linking bonus (0-10 points)
    if (data.oauthLinked) {
      score += 10;
      factors.positive.push({
        category: 'verification',
        factor: 'Linked social accounts',
        description: 'Additional identity verification through OAuth',
        impact: 'low',
      });
    }

    // Profile completeness (0-10 points)
    score += (data.profileCompleteness / 100) * 10;

    if (data.profileCompleteness < 80) {
      factors.suggestions.push({
        category: 'verification',
        suggestion: 'Complete your profile',
        description: `Your profile is ${data.profileCompleteness}% complete`,
        potentialImpact: `${Math.round((100 - data.profileCompleteness) * 0.1)} points`,
      });
    }

    // Add positive factors for verification level
    if (data.verificationLevel === 'PREMIUM') {
      factors.positive.push({
        category: 'verification',
        factor: 'Premium verification',
        description: 'Highest level of identity verification',
        impact: 'high',
      });
    } else if (data.verificationLevel === 'ENHANCED') {
      factors.positive.push({
        category: 'verification',
        factor: 'Enhanced verification',
        description: 'Advanced identity verification completed',
        impact: 'medium',
      });
    } else if (data.verificationLevel === 'BASIC' || data.verificationLevel === 'EMAIL') {
      factors.suggestions.push({
        category: 'verification',
        suggestion: 'Upgrade verification level',
        description: 'Complete additional verification for more trust',
        potentialImpact: 'Up to 30 points',
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate tenure component score (0-100)
   */
  private calculateTenureScore(data: TenureData, factors: TrustScoreFactors): number {
    let score = 0;

    // Account age (0-70 points) - logarithmic scaling
    // 1 month = ~0, 6 months = ~30, 1 year = ~50, 2 years = ~70
    if (data.accountAgeMonths > 0) {
      score += Math.min(70, Math.log2(data.accountAgeMonths + 1) * 17);
    }

    // Activity consistency bonus (0-20 points)
    if (data.isActiveLastMonth) {
      score += 10;
    }

    // Penalty for long inactive periods (0-10 points reduction)
    if (data.longestInactivePeriodDays > 90) {
      score -= Math.min(10, (data.longestInactivePeriodDays - 90) / 30);
    } else {
      score += 10;
    }

    // Add factors
    if (data.accountAgeMonths >= 24) {
      factors.positive.push({
        category: 'tenure',
        factor: 'Long-standing member',
        description: `Member for over ${Math.floor(data.accountAgeMonths / 12)} years`,
        impact: 'high',
      });
    } else if (data.accountAgeMonths >= 12) {
      factors.positive.push({
        category: 'tenure',
        factor: 'Established member',
        description: 'Member for over a year',
        impact: 'medium',
      });
    } else if (data.accountAgeMonths < 3) {
      factors.suggestions.push({
        category: 'tenure',
        suggestion: 'Build your history',
        description: 'Account tenure improves naturally over time',
        potentialImpact: 'Gradual increase',
      });
    }

    if (data.longestInactivePeriodDays > 90) {
      factors.negative.push({
        category: 'tenure',
        factor: 'Extended inactivity',
        description: 'Periods of prolonged account inactivity detected',
        impact: 'low',
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate activity component score (0-100)
   */
  private calculateActivityScore(data: ActivityData, factors: TrustScoreFactors): number {
    let score = 0;

    // Login frequency (0-30 points)
    // More frequent logins = more engaged
    if (data.loginsLast30Days >= 20) {
      score += 30;
    } else if (data.loginsLast30Days >= 10) {
      score += 20;
    } else if (data.loginsLast30Days >= 5) {
      score += 10;
    } else if (data.loginsLast30Days > 0) {
      score += 5;
    }

    // Response rate (0-30 points)
    score += (data.messageResponseRate / 100) * 30;

    // Response time (0-20 points) - faster is better
    if (data.avgResponseTimeHours <= 1) {
      score += 20;
    } else if (data.avgResponseTimeHours <= 4) {
      score += 15;
    } else if (data.avgResponseTimeHours <= 12) {
      score += 10;
    } else if (data.avgResponseTimeHours <= 24) {
      score += 5;
    }

    // Profile freshness (0-10 points)
    if (data.daysSinceProfileUpdate <= 30) {
      score += 10;
    } else if (data.daysSinceProfileUpdate <= 90) {
      score += 5;
    }

    // Job completion bonus (0-10 points)
    if (data.jobsCompletedLast90Days >= 5) {
      score += 10;
    } else if (data.jobsCompletedLast90Days >= 2) {
      score += 5;
    }

    // Add factors
    if (data.messageResponseRate >= 90 && data.avgResponseTimeHours <= 4) {
      factors.positive.push({
        category: 'activity',
        factor: 'Highly responsive',
        description: `${data.messageResponseRate}% response rate with ${data.avgResponseTimeHours}h average response time`,
        impact: 'high',
      });
    } else if (data.messageResponseRate >= 80) {
      factors.positive.push({
        category: 'activity',
        factor: 'Good communication',
        description: 'Consistent message responses',
        impact: 'medium',
      });
    }

    if (data.messageResponseRate < 50) {
      factors.negative.push({
        category: 'activity',
        factor: 'Low response rate',
        description: 'Many messages go unanswered',
        impact: 'medium',
      });
      factors.suggestions.push({
        category: 'activity',
        suggestion: 'Improve responsiveness',
        description: 'Respond to messages more consistently',
        potentialImpact: 'Up to 15 points',
      });
    }

    if (data.avgResponseTimeHours > 24) {
      factors.suggestions.push({
        category: 'activity',
        suggestion: 'Respond faster',
        description: 'Try to respond to messages within 24 hours',
        potentialImpact: 'Up to 10 points',
      });
    }

    if (data.daysSinceProfileUpdate > 180) {
      factors.suggestions.push({
        category: 'activity',
        suggestion: 'Update your profile',
        description: 'Keep your profile fresh with recent information',
        potentialImpact: '5 points',
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate weighted overall score
   */
  private calculateOverallScore(scores: {
    reviewScore: number;
    complianceScore: number;
    verificationScore: number;
    tenureScore: number;
    activityScore: number;
  }): number {
    const totalWeight =
      this.weights.review +
      this.weights.compliance +
      this.weights.verification +
      this.weights.tenure +
      this.weights.activity;

    const weightedSum =
      scores.reviewScore * this.weights.review +
      scores.complianceScore * this.weights.compliance +
      scores.verificationScore * this.weights.verification +
      scores.tenureScore * this.weights.tenure +
      scores.activityScore * this.weights.activity;

    return weightedSum / totalWeight;
  }

  /**
   * Determine trust tier from overall score
   */
  private determineTier(score: number): TrustTier {
    for (const [tier, { min, max }] of Object.entries(TIER_THRESHOLDS) as [
      TrustTier,
      { min: number; max: number }
    ][]) {
      if (score >= min && score <= max) {
        return tier;
      }
    }
    return 'EMERGING'; // Default fallback
  }

  /**
   * Add suggestions based on current tier
   */
  private addTierSuggestions(tier: TrustTier, score: number, factors: TrustScoreFactors): void {
    const tierOrder: TrustTier[] = ['EMERGING', 'ESTABLISHED', 'TRUSTED', 'HIGHLY_TRUSTED', 'ELITE'];
    const currentIndex = tierOrder.indexOf(tier);

    if (currentIndex < tierOrder.length - 1) {
      const nextTier = tierOrder[currentIndex + 1];
      const nextThreshold = TIER_THRESHOLDS[nextTier].min;
      const pointsNeeded = nextThreshold - score;

      if (pointsNeeded <= 10) {
        factors.suggestions.push({
          category: 'reviews',
          suggestion: `Almost at ${nextTier.replace('_', ' ')} tier!`,
          description: `Just ${Math.ceil(pointsNeeded)} more points needed`,
          potentialImpact: `Unlock ${nextTier.replace('_', ' ')} benefits`,
        });
      }
    }
  }

  /**
   * Get tier description
   */
  static getTierDescription(tier: TrustTier): string {
    const descriptions: Record<TrustTier, string> = {
      EMERGING: 'New member building their reputation',
      ESTABLISHED: 'Developing a track record of reliability',
      TRUSTED: 'Proven track record with consistent performance',
      HIGHLY_TRUSTED: 'Exceptional performance and reliability',
      ELITE: 'Top performer with outstanding reputation',
    };
    return descriptions[tier];
  }

  /**
   * Get points needed for next tier
   */
  static getPointsToNextTier(currentScore: number, currentTier: TrustTier): number | null {
    const tierOrder: TrustTier[] = ['EMERGING', 'ESTABLISHED', 'TRUSTED', 'HIGHLY_TRUSTED', 'ELITE'];
    const currentIndex = tierOrder.indexOf(currentTier);

    if (currentIndex >= tierOrder.length - 1) {
      return null; // Already at max tier
    }

    const nextTier = tierOrder[currentIndex + 1];
    return TIER_THRESHOLDS[nextTier].min - currentScore;
  }
}
