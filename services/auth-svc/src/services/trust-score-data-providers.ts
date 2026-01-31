/**
 * Trust Score Data Providers - Production Implementation
 *
 * Integrates with actual services to fetch real data for trust score calculation.
 * Replaces the mock data providers with proper service-to-service communication.
 */

import type { FastifyBaseLogger } from 'fastify';

import type { PrismaClient } from '../../generated/prisma-client/index.js';
import type {
  ReviewData,
  VerificationData,
  TenureData,
  ActivityData,
  VerificationLevel,
} from '../types/trust-score.types.js';

import type { DataProviders } from './trust-score.service.js';

interface ServiceEndpoints {
  profileSvcUrl: string;
  sessionSvcUrl: string;
  analyticsSvcUrl: string;
}

/**
 * Create production data providers with real service integrations
 */
export function createProductionDataProviders(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  endpoints: ServiceEndpoints
): DataProviders {
  const { profileSvcUrl, sessionSvcUrl, analyticsSvcUrl } = endpoints;

  /**
   * Fetch with error handling and logging
   */
  async function fetchWithTimeout<T>(
    url: string,
    options: RequestInit = {},
    timeoutMs = 5000
  ): Promise<T | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      /* eslint-disable @typescript-eslint/no-misused-spread */
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      /* eslint-enable @typescript-eslint/no-misused-spread */

      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn(`Service request failed: ${url} - ${response.status}`);
        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn(`Service request timeout: ${url}`);
      } else {
        logger.error({ error, url }, 'Service request error');
      }

      return null;
    }
  }

  return {
    /**
     * Get review and rating data from database
     *
     * Note: AIVO is an educational platform, not a marketplace with reviews.
     * This returns safe defaults. For educational context, this could track:
     * - Teacher feedback scores
     * - Peer collaboration ratings
     * - Assignment completion rate
     *
     * Adapt this based on your needs or remove if not applicable.
     */
    async getReviewData(userId: string): Promise<ReviewData> {
      try {
        // For now, return safe defaults since AIVO doesn't have user reviews
        // If you add teacher feedback or peer ratings, query them here

        logger.debug({ userId }, 'Review data not implemented - returning defaults');

        return {
          averageRating: 0,
          totalReviews: 0,
          ratingStdDev: null,
          recentTotalReviews: 0,
          recentPositiveReviews: 0,
          recentNegativeReviews: 0,
          completedJobs: 0,
        };
      } catch (error) {
        logger.error({ error, userId }, 'Failed to fetch review data');

        return {
          averageRating: 0,
          totalReviews: 0,
          ratingStdDev: null,
          recentTotalReviews: 0,
          recentPositiveReviews: 0,
          recentNegativeReviews: 0,
          completedJobs: 0,
        };
      }
    },

    /**
     * Get verification and profile completeness data from auth-svc database
     */
    async getVerificationData(userId: string): Promise<VerificationData> {
      try {
        // Fetch from local auth database
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            emailVerified: true,
            phone: true,
          },
        });

        if (!user) {
          logger.warn({ userId }, 'User not found for verification data');
          return {
            emailVerified: false,
            verificationLevel: 'NONE' as VerificationLevel,
            mfaEnabled: false,
            oauthLinked: false,
            profileCompleteness: 0,
          };
        }

        // Check MFA status
        const mfaConfig = await prisma.mfaConfig.findFirst({
          where: { userId, enabled: true },
        });

        // Check if user has external IdP (OAuth/SAML)
        const hasExternalAuth = !!user.phone; // Using phone as proxy for now
        // NOTE: Add proper OAuth provider tracking if needed

        // Fetch profile data from profile-svc to calculate completeness
        const profileData = await fetchWithTimeout<{
          displayName?: string;
          avatar?: string;
          bio?: string;
        }>(`${profileSvcUrl}/api/internal/users/${userId}/profile`);

        // Calculate profile completeness (0-100)
        let completeness = 0;
        if (user.emailVerified) completeness += 20;
        if (profileData?.displayName) completeness += 20;
        if (profileData?.avatar) completeness += 20;
        if (profileData?.bio) completeness += 20;
        if (user.phone) completeness += 20;

        // Determine verification level
        let verificationLevel: VerificationLevel = 'NONE';
        if (user.emailVerified) {
          verificationLevel = 'EMAIL';
        }
        if (user.emailVerified && user.phone) {
          verificationLevel = 'BASIC';
        }
        if (mfaConfig) {
          verificationLevel = 'ENHANCED';
        }

        return {
          emailVerified: user.emailVerified,
          verificationLevel,
          mfaEnabled: !!mfaConfig,
          oauthLinked: hasExternalAuth,
          profileCompleteness: completeness,
        };
      } catch (error) {
        logger.error({ error, userId }, 'Failed to fetch verification data');

        return {
          emailVerified: false,
          verificationLevel: 'NONE' as VerificationLevel,
          mfaEnabled: false,
          oauthLinked: false,
          profileCompleteness: 0,
        };
      }
    },

    /**
     * Get account tenure data from auth-svc database
     */
    async getTenureData(userId: string): Promise<TenureData> {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            createdAt: true,
            lastLoginAt: true,
          },
        });

        if (!user) {
          logger.warn({ userId }, 'User not found for tenure data');
          return {
            accountAgeMonths: 0,
            accountCreatedAt: new Date(),
            longestInactivePeriodDays: 0,
            isActiveLastMonth: false,
          };
        }

        const now = new Date();
        const accountAgeMs = now.getTime() - user.createdAt.getTime();
        const accountAgeMonths = Math.floor(accountAgeMs / (30 * 24 * 60 * 60 * 1000));

        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const isActiveLastMonth = user.lastLoginAt ? user.lastLoginAt >= thirtyDaysAgo : false;

        // Calculate longest inactive period from session data
        const longestInactivePeriodDays = await calculateLongestInactivePeriod(
          userId,
          sessionSvcUrl,
          logger
        );

        return {
          accountAgeMonths,
          accountCreatedAt: user.createdAt,
          longestInactivePeriodDays,
          isActiveLastMonth,
        };
      } catch (error) {
        logger.error({ error, userId }, 'Failed to fetch tenure data');

        return {
          accountAgeMonths: 0,
          accountCreatedAt: new Date(),
          longestInactivePeriodDays: 0,
          isActiveLastMonth: false,
        };
      }
    },

    /**
     * Get activity data from session-svc and analytics-svc
     */
    async getActivityData(userId: string): Promise<ActivityData> {
      try {
        // Fetch session statistics from session-svc
        const sessionStats = await fetchWithTimeout<{
          loginsLast30Days: number;
          lastLoginAt: string;
          averageSessionDurationMinutes: number;
        }>(`${sessionSvcUrl}/api/sessions/users/${userId}/stats?period=30d`);

        // Fetch activity metrics from analytics-svc
        const activityMetrics = await fetchWithTimeout<{
          messageResponseRate: number;
          avgResponseTimeHours: number;
          daysSinceProfileUpdate: number;
          jobsCompletedLast90Days: number;
        }>(`${analyticsSvcUrl}/api/analytics/users/${userId}/activity`);

        // Update last login in database
        if (sessionStats?.lastLoginAt) {
          await prisma.user
            .update({
              where: { id: userId },
              data: { lastLoginAt: new Date(sessionStats.lastLoginAt) },
            })
            .catch((err) => logger.warn({ err }, 'Failed to update lastLoginAt'));
        }

        return {
          loginsLast30Days: sessionStats?.loginsLast30Days || 0,
          lastLoginAt: sessionStats?.lastLoginAt ? new Date(sessionStats.lastLoginAt) : new Date(),
          messageResponseRate: activityMetrics?.messageResponseRate || 0,
          avgResponseTimeHours: activityMetrics?.avgResponseTimeHours || 0,
          daysSinceProfileUpdate: activityMetrics?.daysSinceProfileUpdate || 999,
          jobsCompletedLast90Days: activityMetrics?.jobsCompletedLast90Days || 0,
        };
      } catch (error) {
        logger.error({ error, userId }, 'Failed to fetch activity data');

        return {
          loginsLast30Days: 0,
          lastLoginAt: new Date(),
          messageResponseRate: 0,
          avgResponseTimeHours: 0,
          daysSinceProfileUpdate: 999,
          jobsCompletedLast90Days: 0,
        };
      }
    },

    /**
     * Get total session count from session-svc
     */
    async getSessionCount(userId: string): Promise<number> {
      try {
        const result = await fetchWithTimeout<{ totalSessions: number }>(
          `${sessionSvcUrl}/api/sessions/users/${userId}/count`
        );

        return result?.totalSessions || 0;
      } catch (error) {
        logger.error({ error, userId }, 'Failed to fetch session count');
        return 0;
      }
    },
  };
}

/**
 * Helper: Calculate longest inactive period from session history
 */
async function calculateLongestInactivePeriod(
  userId: string,
  sessionSvcUrl: string,
  logger: FastifyBaseLogger
): Promise<number> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `${sessionSvcUrl}/api/sessions/users/${userId}/history?limit=100`,
      {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      return 0;
    }

    const data = (await response.json()) as { sessions: { startedAt: string }[] };
    const sessions = data.sessions || [];

    if (sessions.length < 2) {
      return 0;
    }

    // Sort by date
    const dates = sessions.map((s) => new Date(s.startedAt).getTime()).sort((a, b) => a - b);

    // Find longest gap between consecutive sessions
    let longestGapDays = 0;
    for (let i = 1; i < dates.length; i++) {
      const gapMs = dates[i] - dates[i - 1];
      const gapDays = gapMs / (24 * 60 * 60 * 1000);
      if (gapDays > longestGapDays) {
        longestGapDays = gapDays;
      }
    }

    return Math.floor(longestGapDays);
  } catch (error) {
    logger.warn({ error, userId }, 'Failed to calculate inactive period');
    return 0;
  }
}
