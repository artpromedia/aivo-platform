/**
 * Settings Service - Manage tenant and learner gamification preferences
 */

import {
  Prisma,
  prisma,
  RewardStyle,
  type GamificationSettings,
  type EngagementProfile,
} from '../prisma.js';

// Type alias for backward compatibility
export type TenantGamificationSettings = GamificationSettings;
export type LearnerGamificationPreferences = Pick<
  EngagementProfile,
  | 'muteCelebrations'
  | 'reducedVisuals'
  | 'showBadges'
  | 'showStreaks'
  | 'showXp'
  | 'preferredRewardStyle'
>;

export interface TenantSettingsInput {
  tenantId: string;
  xpEnabled?: boolean | undefined;
  streaksEnabled?: boolean | undefined;
  badgesEnabled?: boolean | undefined;
  kudosEnabled?: boolean | undefined;
  celebrationsEnabled?: boolean | undefined;
  maxDailyCelebrations?: number | undefined;
  showComparisons?: boolean | undefined;
  xpRulesOverride?: Record<string, number> | undefined;
}

export interface LearnerPreferencesInput {
  tenantId: string;
  learnerId: string;
  muteCelebrations?: boolean | undefined;
  reducedVisuals?: boolean | undefined;
  showBadges?: boolean | undefined;
  showStreaks?: boolean | undefined;
  showXp?: boolean | undefined;
  preferredRewardStyle?: RewardStyle | undefined;
}

/**
 * Get tenant gamification settings
 */
export async function getTenantSettings(tenantId: string): Promise<GamificationSettings | null> {
  return prisma.gamificationSettings.findUnique({
    where: { tenantId },
  });
}

/**
 * Create or update tenant gamification settings
 */
export async function upsertTenantSettings(
  input: TenantSettingsInput
): Promise<GamificationSettings> {
  // Build update object only with provided fields
  const updateData: Prisma.GamificationSettingsUpdateInput = {};
  if (input.xpEnabled !== undefined) updateData.xpEnabled = input.xpEnabled;
  if (input.streaksEnabled !== undefined) updateData.streaksEnabled = input.streaksEnabled;
  if (input.badgesEnabled !== undefined) updateData.badgesEnabled = input.badgesEnabled;
  if (input.kudosEnabled !== undefined) updateData.kudosEnabled = input.kudosEnabled;
  if (input.celebrationsEnabled !== undefined)
    updateData.celebrationsEnabled = input.celebrationsEnabled;
  if (input.maxDailyCelebrations !== undefined)
    updateData.maxDailyCelebrations = input.maxDailyCelebrations;
  if (input.showComparisons !== undefined) updateData.showComparisons = input.showComparisons;
  if (input.xpRulesOverride !== undefined)
    updateData.xpRulesOverride = input.xpRulesOverride as Prisma.InputJsonValue;

  return prisma.gamificationSettings.upsert({
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
      xpRulesOverride:
        input.xpRulesOverride === undefined
          ? Prisma.DbNull
          : (input.xpRulesOverride as Prisma.InputJsonValue),
    },
    update: updateData,
  });
}

/**
 * Get learner gamification preferences (from EngagementProfile)
 */
export async function getLearnerPreferences(
  tenantId: string,
  learnerId: string
): Promise<LearnerGamificationPreferences | null> {
  const profile = await prisma.engagementProfile.findUnique({
    where: { learnerId },
    select: {
      muteCelebrations: true,
      reducedVisuals: true,
      showBadges: true,
      showStreaks: true,
      showXp: true,
      preferredRewardStyle: true,
    },
  });
  return profile;
}

/**
 * Create or update learner gamification preferences (on EngagementProfile)
 */
export async function upsertLearnerPreferences(
  input: LearnerPreferencesInput
): Promise<LearnerGamificationPreferences> {
  const profile = await prisma.engagementProfile.upsert({
    where: { learnerId: input.learnerId },
    create: {
      tenantId: input.tenantId,
      learnerId: input.learnerId,
      muteCelebrations: input.muteCelebrations ?? false,
      reducedVisuals: input.reducedVisuals ?? false,
      showBadges: input.showBadges ?? true,
      showStreaks: input.showStreaks ?? true,
      showXp: input.showXp ?? true,
      preferredRewardStyle: input.preferredRewardStyle ?? RewardStyle.VISUAL_BADGES,
    },
    update: {
      ...(input.muteCelebrations !== undefined && { muteCelebrations: input.muteCelebrations }),
      ...(input.reducedVisuals !== undefined && { reducedVisuals: input.reducedVisuals }),
      ...(input.showBadges !== undefined && { showBadges: input.showBadges }),
      ...(input.showStreaks !== undefined && { showStreaks: input.showStreaks }),
      ...(input.showXp !== undefined && { showXp: input.showXp }),
      ...(input.preferredRewardStyle !== undefined && {
        preferredRewardStyle: input.preferredRewardStyle,
      }),
    },
    select: {
      muteCelebrations: true,
      reducedVisuals: true,
      showBadges: true,
      showStreaks: true,
      showXp: true,
      preferredRewardStyle: true,
    },
  });
  return profile;
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
