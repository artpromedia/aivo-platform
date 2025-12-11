/**
 * Trust Score Calculator Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TrustScoreCalculatorService } from '../services/trust-score-calculator.service.js';
import type {
  ReviewData,
  ComplianceData,
  VerificationData,
  TenureData,
  ActivityData,
  ComplianceViolation,
} from '../types/trust-score.types.js';

describe('TrustScoreCalculatorService', () => {
  let calculator: TrustScoreCalculatorService;

  // Default test data
  const defaultReviewData: ReviewData = {
    averageRating: 4.5,
    totalReviews: 20,
    ratingStdDev: 0.3,
    recentTotalReviews: 5,
    recentPositiveReviews: 4,
    recentNegativeReviews: 0,
    completedJobs: 25,
  };

  const defaultComplianceData: ComplianceData = {
    totalSessions: 50,
    violationSessions: 0,
    violations: [],
    lastViolationAt: null,
  };

  const defaultVerificationData: VerificationData = {
    emailVerified: true,
    verificationLevel: 'ENHANCED',
    mfaEnabled: true,
    oauthLinked: true,
    profileCompleteness: 100,
  };

  const defaultTenureData: TenureData = {
    accountAgeMonths: 24,
    accountCreatedAt: new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000),
    longestInactivePeriodDays: 7,
    isActiveLastMonth: true,
  };

  const defaultActivityData: ActivityData = {
    loginsLast30Days: 20,
    lastLoginAt: new Date(),
    messageResponseRate: 95,
    avgResponseTimeHours: 2,
    daysSinceProfileUpdate: 15,
    jobsCompletedLast90Days: 10,
  };

  beforeEach(() => {
    calculator = new TrustScoreCalculatorService();
  });

  describe('calculate', () => {
    it('should calculate a high trust score for excellent user data', () => {
      const result = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(70);
      expect(result.tier).toBe('TRUSTED');
      expect(result.calculationVersion).toBe(1);
    });

    it('should calculate an elite trust score for exceptional users', () => {
      const excellentReviews: ReviewData = {
        averageRating: 5.0,
        totalReviews: 100,
        ratingStdDev: 0.1,
        recentTotalReviews: 20,
        recentPositiveReviews: 20,
        recentNegativeReviews: 0,
        completedJobs: 150,
      };

      const premiumVerification: VerificationData = {
        emailVerified: true,
        verificationLevel: 'PREMIUM',
        mfaEnabled: true,
        oauthLinked: true,
        profileCompleteness: 100,
      };

      const result = calculator.calculate({
        reviews: excellentReviews,
        compliance: defaultComplianceData,
        verification: premiumVerification,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(95);
      expect(result.tier).toBe('ELITE');
    });

    it('should calculate a low trust score for new users', () => {
      const newUserReviews: ReviewData = {
        averageRating: 0,
        totalReviews: 0,
        ratingStdDev: null,
        recentTotalReviews: 0,
        recentPositiveReviews: 0,
        recentNegativeReviews: 0,
        completedJobs: 0,
      };

      const newUserVerification: VerificationData = {
        emailVerified: true,
        verificationLevel: 'EMAIL',
        mfaEnabled: false,
        oauthLinked: false,
        profileCompleteness: 30,
      };

      const newUserTenure: TenureData = {
        accountAgeMonths: 1,
        accountCreatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        longestInactivePeriodDays: 0,
        isActiveLastMonth: true,
      };

      const newUserActivity: ActivityData = {
        loginsLast30Days: 5,
        lastLoginAt: new Date(),
        messageResponseRate: 50,
        avgResponseTimeHours: 12,
        daysSinceProfileUpdate: 7,
        jobsCompletedLast90Days: 0,
      };

      const result = calculator.calculate({
        reviews: newUserReviews,
        compliance: { ...defaultComplianceData, totalSessions: 0 },
        verification: newUserVerification,
        tenure: newUserTenure,
        activity: newUserActivity,
      });

      expect(result.overallScore).toBeLessThan(60);
      expect(result.tier).toBe('EMERGING');
    });

    it('should include positive and negative factors', () => {
      const result = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(result.factors).toBeDefined();
      expect(result.factors.positive.length).toBeGreaterThan(0);
      expect(result.factors.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should include suggestions for improvement', () => {
      const partialVerification: VerificationData = {
        emailVerified: true,
        verificationLevel: 'BASIC',
        mfaEnabled: false,
        oauthLinked: false,
        profileCompleteness: 60,
      };

      const result = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: partialVerification,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(result.factors.suggestions.length).toBeGreaterThan(0);

      const mfaSuggestion = result.factors.suggestions.find((s) => s.suggestion.toLowerCase().includes('two-factor'));
      expect(mfaSuggestion).toBeDefined();
    });
  });

  describe('review score calculation', () => {
    it('should give baseline score for users with no reviews', () => {
      const noReviews: ReviewData = {
        averageRating: 0,
        totalReviews: 0,
        ratingStdDev: null,
        recentTotalReviews: 0,
        recentPositiveReviews: 0,
        recentNegativeReviews: 0,
        completedJobs: 0,
      };

      const result = calculator.calculate({
        reviews: noReviews,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(result.reviewScore).toBe(50); // Neutral starting point
    });

    it('should give higher scores for better ratings', () => {
      const lowRating: ReviewData = { ...defaultReviewData, averageRating: 3.0 };
      const highRating: ReviewData = { ...defaultReviewData, averageRating: 5.0 };

      const lowResult = calculator.calculate({
        reviews: lowRating,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      const highResult = calculator.calculate({
        reviews: highRating,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(highResult.reviewScore).toBeGreaterThan(lowResult.reviewScore);
    });

    it('should penalize recent negative reviews', () => {
      const goodRecent: ReviewData = {
        ...defaultReviewData,
        recentNegativeReviews: 0,
        recentPositiveReviews: 5,
      };

      const badRecent: ReviewData = {
        ...defaultReviewData,
        recentNegativeReviews: 3,
        recentPositiveReviews: 1,
      };

      const goodResult = calculator.calculate({
        reviews: goodRecent,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      const badResult = calculator.calculate({
        reviews: badRecent,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(goodResult.reviewScore).toBeGreaterThan(badResult.reviewScore);
    });
  });

  describe('compliance score calculation', () => {
    it('should give perfect score with no violations', () => {
      const result = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(result.complianceScore).toBe(100);
    });

    it('should reduce score for violations', () => {
      const violations: ComplianceViolation[] = [
        {
          id: '1',
          eventType: 'POLICY_VIOLATION',
          severity: 'MEDIUM',
          isResolved: false,
          createdAt: new Date(),
          scoreImpact: -5,
        },
      ];

      const complianceWithViolation: ComplianceData = {
        totalSessions: 50,
        violationSessions: 1,
        violations,
        lastViolationAt: new Date(),
      };

      const result = calculator.calculate({
        reviews: defaultReviewData,
        compliance: complianceWithViolation,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(result.complianceScore).toBeLessThan(100);
    });

    it('should penalize critical violations more heavily', () => {
      const mediumViolation: ComplianceViolation = {
        id: '1',
        eventType: 'POLICY_VIOLATION',
        severity: 'MEDIUM',
        isResolved: false,
        createdAt: new Date(),
        scoreImpact: -5,
      };

      const criticalViolation: ComplianceViolation = {
        id: '2',
        eventType: 'DATA_TRANSFER_ATTEMPT',
        severity: 'CRITICAL',
        isResolved: false,
        createdAt: new Date(),
        scoreImpact: -30,
      };

      const mediumResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: {
          totalSessions: 50,
          violationSessions: 1,
          violations: [mediumViolation],
          lastViolationAt: new Date(),
        },
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      const criticalResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: {
          totalSessions: 50,
          violationSessions: 1,
          violations: [criticalViolation],
          lastViolationAt: new Date(),
        },
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(mediumResult.complianceScore).toBeGreaterThan(criticalResult.complianceScore);
    });

    it('should reduce impact of resolved violations', () => {
      const unresolvedViolation: ComplianceViolation = {
        id: '1',
        eventType: 'POLICY_VIOLATION',
        severity: 'HIGH',
        isResolved: false,
        createdAt: new Date(),
        scoreImpact: -15,
      };

      const resolvedViolation: ComplianceViolation = {
        id: '1',
        eventType: 'POLICY_VIOLATION',
        severity: 'HIGH',
        isResolved: true,
        createdAt: new Date(),
        scoreImpact: -15,
      };

      const unresolvedResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: {
          totalSessions: 50,
          violationSessions: 1,
          violations: [unresolvedViolation],
          lastViolationAt: new Date(),
        },
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      const resolvedResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: {
          totalSessions: 50,
          violationSessions: 1,
          violations: [resolvedViolation],
          lastViolationAt: new Date(),
        },
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(resolvedResult.complianceScore).toBeGreaterThan(unresolvedResult.complianceScore);
    });
  });

  describe('verification score calculation', () => {
    it('should give higher scores for premium verification', () => {
      const basicVerification: VerificationData = {
        emailVerified: true,
        verificationLevel: 'BASIC',
        mfaEnabled: false,
        oauthLinked: false,
        profileCompleteness: 50,
      };

      const premiumVerification: VerificationData = {
        emailVerified: true,
        verificationLevel: 'PREMIUM',
        mfaEnabled: true,
        oauthLinked: true,
        profileCompleteness: 100,
      };

      const basicResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: basicVerification,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      const premiumResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: premiumVerification,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(premiumResult.verificationScore).toBeGreaterThan(basicResult.verificationScore);
    });

    it('should add bonus for MFA enabled', () => {
      const withoutMfa: VerificationData = { ...defaultVerificationData, mfaEnabled: false };
      const withMfa: VerificationData = { ...defaultVerificationData, mfaEnabled: true };

      const withoutMfaResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: withoutMfa,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      const withMfaResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: withMfa,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      expect(withMfaResult.verificationScore).toBeGreaterThan(withoutMfaResult.verificationScore);
    });
  });

  describe('tenure score calculation', () => {
    it('should give higher scores for longer tenure', () => {
      const newUser: TenureData = {
        accountAgeMonths: 1,
        accountCreatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        longestInactivePeriodDays: 0,
        isActiveLastMonth: true,
      };

      const veteranUser: TenureData = {
        accountAgeMonths: 36,
        accountCreatedAt: new Date(Date.now() - 36 * 30 * 24 * 60 * 60 * 1000),
        longestInactivePeriodDays: 7,
        isActiveLastMonth: true,
      };

      const newResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: newUser,
        activity: defaultActivityData,
      });

      const veteranResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: veteranUser,
        activity: defaultActivityData,
      });

      expect(veteranResult.tenureScore).toBeGreaterThan(newResult.tenureScore);
    });
  });

  describe('activity score calculation', () => {
    it('should reward high message response rate', () => {
      const lowResponseRate: ActivityData = { ...defaultActivityData, messageResponseRate: 30 };
      const highResponseRate: ActivityData = { ...defaultActivityData, messageResponseRate: 95 };

      const lowResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: lowResponseRate,
      });

      const highResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: highResponseRate,
      });

      expect(highResult.activityScore).toBeGreaterThan(lowResult.activityScore);
    });

    it('should reward fast response times', () => {
      const slowResponse: ActivityData = { ...defaultActivityData, avgResponseTimeHours: 48 };
      const fastResponse: ActivityData = { ...defaultActivityData, avgResponseTimeHours: 1 };

      const slowResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: slowResponse,
      });

      const fastResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: fastResponse,
      });

      expect(fastResult.activityScore).toBeGreaterThan(slowResult.activityScore);
    });
  });

  describe('tier determination', () => {
    it('should correctly assign EMERGING tier for low scores', () => {
      const result = calculator.calculate({
        reviews: {
          averageRating: 2.5,
          totalReviews: 2,
          ratingStdDev: 1.5,
          recentTotalReviews: 1,
          recentPositiveReviews: 0,
          recentNegativeReviews: 1,
          completedJobs: 2,
        },
        compliance: {
          totalSessions: 5,
          violationSessions: 2,
          violations: [
            { id: '1', eventType: 'POLICY_VIOLATION', severity: 'HIGH', isResolved: false, createdAt: new Date(), scoreImpact: -15 },
            { id: '2', eventType: 'SESSION_ANOMALY', severity: 'MEDIUM', isResolved: false, createdAt: new Date(), scoreImpact: -5 },
          ],
          lastViolationAt: new Date(),
        },
        verification: {
          emailVerified: true,
          verificationLevel: 'EMAIL',
          mfaEnabled: false,
          oauthLinked: false,
          profileCompleteness: 25,
        },
        tenure: {
          accountAgeMonths: 1,
          accountCreatedAt: new Date(),
          longestInactivePeriodDays: 0,
          isActiveLastMonth: false,
        },
        activity: {
          loginsLast30Days: 1,
          lastLoginAt: new Date(),
          messageResponseRate: 20,
          avgResponseTimeHours: 72,
          daysSinceProfileUpdate: 30,
          jobsCompletedLast90Days: 0,
        },
      });

      expect(result.tier).toBe('EMERGING');
      expect(result.overallScore).toBeLessThan(40);
    });

    it('should correctly assign ESTABLISHED tier', () => {
      const result = calculator.calculate({
        reviews: {
          averageRating: 4.0,
          totalReviews: 5,
          ratingStdDev: 0.5,
          recentTotalReviews: 2,
          recentPositiveReviews: 1,
          recentNegativeReviews: 0,
          completedJobs: 6,
        },
        compliance: defaultComplianceData,
        verification: {
          emailVerified: true,
          verificationLevel: 'BASIC',
          mfaEnabled: false,
          oauthLinked: false,
          profileCompleteness: 60,
        },
        tenure: {
          accountAgeMonths: 4,
          accountCreatedAt: new Date(),
          longestInactivePeriodDays: 14,
          isActiveLastMonth: true,
        },
        activity: {
          loginsLast30Days: 8,
          lastLoginAt: new Date(),
          messageResponseRate: 70,
          avgResponseTimeHours: 8,
          daysSinceProfileUpdate: 60,
          jobsCompletedLast90Days: 2,
        },
      });

      expect(result.tier).toBe('ESTABLISHED');
      expect(result.overallScore).toBeGreaterThanOrEqual(40);
      expect(result.overallScore).toBeLessThan(60);
    });
  });

  describe('getTierDescription', () => {
    it('should return correct descriptions for each tier', () => {
      expect(TrustScoreCalculatorService.getTierDescription('EMERGING')).toContain('New member');
      expect(TrustScoreCalculatorService.getTierDescription('ESTABLISHED')).toContain('track record');
      expect(TrustScoreCalculatorService.getTierDescription('TRUSTED')).toContain('Proven');
      expect(TrustScoreCalculatorService.getTierDescription('HIGHLY_TRUSTED')).toContain('Exceptional');
      expect(TrustScoreCalculatorService.getTierDescription('ELITE')).toContain('Top performer');
    });
  });

  describe('getPointsToNextTier', () => {
    it('should return correct points needed for next tier', () => {
      expect(TrustScoreCalculatorService.getPointsToNextTier(35, 'EMERGING')).toBe(5);
      expect(TrustScoreCalculatorService.getPointsToNextTier(55, 'ESTABLISHED')).toBe(5);
      expect(TrustScoreCalculatorService.getPointsToNextTier(75, 'TRUSTED')).toBe(5);
      expect(TrustScoreCalculatorService.getPointsToNextTier(90, 'HIGHLY_TRUSTED')).toBe(5);
    });

    it('should return null for ELITE tier', () => {
      expect(TrustScoreCalculatorService.getPointsToNextTier(99, 'ELITE')).toBeNull();
    });
  });

  describe('custom weights', () => {
    it('should use custom weights when provided', () => {
      const customCalculator = new TrustScoreCalculatorService({
        weights: { review: 60, compliance: 15, verification: 10, tenure: 10, activity: 5 },
      });

      const standardResult = calculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      const customResult = customCalculator.calculate({
        reviews: defaultReviewData,
        compliance: defaultComplianceData,
        verification: defaultVerificationData,
        tenure: defaultTenureData,
        activity: defaultActivityData,
      });

      // Results should differ due to different weights
      expect(standardResult.overallScore).not.toBe(customResult.overallScore);
    });
  });
});
