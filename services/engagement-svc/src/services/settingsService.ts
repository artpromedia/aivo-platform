/**
 * Settings Service - Manage tenant and learner gamification preferences
 */

import { prisma, RewardStyle, type TenantGamificationSettings, type LearnerGamificationPreferences } from '../prisma.js';
import type { JsonValue } from '@prisma/client/runtime/library';

export interface TenantSettingsInput {
  tenantId: string;
  xpEnabled?: boolean;
  streaksEnabled?: boolean;
  badgesEnabled?: boolean;
  kudosEnabled?: boolean;
  celebrationsEnabled?: boolean;
  maxDailyCelebrations?: number;
  showComparisons?: boolean;
  customXpRules?: Record<string, number>;
}

export interface LearnerPreferencesInput {
  tenantId: string;
  learnerId: string;
  muteCelebrations?: boolean;
  reducedVisuals?: boolean;
  showBadges?: boolean;
  showStreaks?: boolean;
  preferredRewardStyle?: RewardStyle;
}

/**
 * Get tenant gamification settings
 */
export async function getTenantSettings(tenantId: string): Promise<TenantGamificationSettings | null> {
  return prisma.tenantGamificationSettings.findUnique({
    where: { tenantId },
  });
}

/**
 * Create or update tenant gamification settings
 */
export async function upsertTenantSettings(input: TenantSettingsInput): Promise<TenantGamificationSettings> {
  return prisma.tenantGamificationSettings.upsert({
    where: { tenantId: input.tenantId },
    create: {
      tenantId: input.tenantId,
      xpEnabled: input.xpEnabled ?? true,
      streaksEnabled: input.streaksEnabled ?? true,
      badgesEnabled: input.badgesEnabled ?? true,
      kudosEnabled: input.kudosEnabled ?? true,
      celebrationsEnabled: input.celebrationsEnabled ?? true,
      maxDailyCelebrations: input.maxDailyCelebrations ?? 3,
      showComparisons: input.showComparisons ?? false,
      customXpRules: input.customXpRules as JsonValue ?? null,
    },
    update: {
      ...(input.xpEnabled !== undefined && { xpEnabled: input.xpEnabled }),
      ...(input.streaksEnabled !== undefined && { streaksEnabled: input.streaksEnabled }),
      ...(input.badgesEnabled !== undefined && { badgesEnabled: input.badgesEnabled }),
      ...(input.kudosEnabled !== undefined && { kudosEnabled: input.kudosEnabled }),
      ...(input.celebrationsEnabled !== undefined && { celebrationsEnabled: input.celebrationsEnabled }),
      ...(input.maxDailyCelebrations !== undefined && { maxDailyCelebrations: input.maxDailyCelebrations }),
      ...(input.showComparisons !== undefined && { showComparisons: input.showComparisons }),
      ...(input.customXpRules !== undefined && { customXpRules: input.customXpRules as JsonValue }),
    },
  });
}

/**
 * Get learner gamification preferences
 */
export async function getLearnerPreferences(
  tenantId: string,
  learnerId: string
): Promise<LearnerGamificationPreferences | null> {
  return prisma.learnerGamificationPreferences.findUnique({
    where: {
      tenantId_learnerId: { tenantId, learnerId },
    },
  });
}

/**
 * Create or update learner gamification preferences
 */
export async function upsertLearnerPreferences(input: LearnerPreferencesInput): Promise<LearnerGamificationPreferences> {
  return prisma.learnerGamificationPreferences.upsert({
    where: {
      tenantId_learnerId: { tenantId: input.tenantId, learnerId: input.learnerId },
    },
    create: {
      tenantId: input.tenantId,
      learnerId: input.learnerId,
      muteCelebrations: input.muteCelebrations ?? false,
      reducedVisuals: input.reducedVisuals ?? false,
      showBadges: input.showBadges ?? true,
      showStreaks: input.showStreaks ?? true,
      preferredRewardStyle: input.preferredRewardStyle,
    },
    update: {
      ...(input.muteCelebrations !== undefined && { muteCelebrations: input.muteCelebrations }),
      ...(input.reducedVisuals !== undefined && { reducedVisuals: input.reducedVisuals }),
      ...(input.showBadges !== undefined && { showBadges: input.showBadges }),
      ...(input.showStreaks !== undefined && { showStreaks: input.showStreaks }),
      ...(input.preferredRewardStyle !== undefined && { preferredRewardStyle: input.preferredRewardStyle }),
    },
  });
}

/**
 * Get effective settings for a learner (merging tenant + learner preferences)
 */
export async function getEffectiveSettings(
  tenantId: string,
  learnerId: string
): Promise<{
  xpEnabled: boolean;
  streaksEnabled: boolean;
  badgesEnabled: boolean;
  kudosEnabled: boolean;
  celebrationsEnabled: boolean;
  showComparisons: boolean;
  muteCelebrations: boolean;
  reducedVisuals: boolean;
  showBadges: boolean;
  showStreaks: boolean;
  preferredRewardStyle: RewardStyle | null;
}> {
  const [tenantSettings, learnerPrefs] = await Promise.all([
    getTenantSettings(tenantId),
    getLearnerPreferences(tenantId, learnerId),
  ]);
  
  // Tenant settings (defaults if not set)
  const xpEnabled = tenantSettings?.xpEnabled ?? true;
  const streaksEnabled = tenantSettings?.streaksEnabled ?? true;
  const badgesEnabled = tenantSettings?.badgesEnabled ?? true;
  const kudosEnabled = tenantSettings?.kudosEnabled ?? true;
  const celebrationsEnabled = tenantSettings?.celebrationsEnabled ?? true;
  const showComparisons = tenantSettings?.showComparisons ?? false;
  
  // Learner preferences (can override some tenant settings)
  const muteCelebrations = learnerPrefs?.muteCelebrations ?? false;
  const reducedVisuals = learnerPrefs?.reducedVisuals ?? false;
  const showBadges = badgesEnabled && (learnerPrefs?.showBadges ?? true);
  const showStreaks = streaksEnabled && (learnerPrefs?.showStreaks ?? true);
  const preferredRewardStyle = learnerPrefs?.preferredRewardStyle ?? null;
  
  return {
    xpEnabled,
    streaksEnabled,
    badgesEnabled,
    kudosEnabled,
    celebrationsEnabled: celebrationsEnabled && !muteCelebrations,
    showComparisons,
    muteCelebrations,
    reducedVisuals,
    showBadges,
    showStreaks,
    preferredRewardStyle,
  };
}

/**
 * Check if feature is enabled for learner
 */
export async function isFeatureEnabled(
  tenantId: string,
  learnerId: string,
  feature: 'xp' | 'streaks' | 'badges' | 'kudos' | 'celebrations' | 'comparisons'
): Promise<boolean> {
  const settings = await getEffectiveSettings(tenantId, learnerId);
  
  switch (feature) {
    case 'xp':
      return settings.xpEnabled;
    case 'streaks':
      return settings.showStreaks;
    case 'badges':
      return settings.showBadges;
    case 'kudos':
      return settings.kudosEnabled;
    case 'celebrations':
      return settings.celebrationsEnabled;
    case 'comparisons':
      return settings.showComparisons;
    default:
      return false;
  }
}
