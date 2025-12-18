/**
 * Social Story Service - ND-1.2
 *
 * Business logic for the Social Stories Library.
 * Provides CRUD operations, personalization, recommendations, and analytics.
 */

import type {
  Prisma,
  SocialStoryCategory,
  SocialStoryReadingLevel,
  LearningObjectGradeBand,
} from '@prisma/client';

import { prisma } from '../prisma.js';

import type {
  CreateSocialStoryInput,
  UpdateSocialStoryInput,
  UpdateLearnerPreferencesInput,
  RecordStoryViewInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  RecommendationContext,
  StoryRecommendation,
  PersonalizationContext,
  StoryPage,
  StorySentence,
  SocialStoryWithMetadata,
  LearnerStoryStats,
  StoryEffectivenessMetrics,
  PaginatedResponse,
} from './social-story.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// STORY CRUD OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface ListStoriesOptions {
  tenantId?: string;
  category?: SocialStoryCategory;
  readingLevel?: SocialStoryReadingLevel;
  gradeBand?: LearningObjectGradeBand;
  minAge?: number;
  maxAge?: number;
  isBuiltIn?: boolean;
  isApproved?: boolean;
  includeGlobal?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Build where clause for story queries.
 */
function buildStoriesWhereClause(options: ListStoriesOptions): Prisma.SocialStoryWhereInput {
  const {
    tenantId,
    category,
    readingLevel,
    gradeBand,
    minAge,
    maxAge,
    isBuiltIn,
    isApproved,
    includeGlobal = true,
    search,
  } = options;

  const conditions: Prisma.SocialStoryWhereInput[] = [{ isActive: true }];

  // Tenant scoping
  if (tenantId) {
    if (includeGlobal) {
      conditions.push({ OR: [{ tenantId }, { tenantId: null }] });
    } else {
      conditions.push({ tenantId });
    }
  }

  if (category) conditions.push({ category });
  if (readingLevel) conditions.push({ readingLevel });
  if (gradeBand) conditions.push({ gradeBands: { has: gradeBand } });
  if (typeof isBuiltIn === 'boolean') conditions.push({ isBuiltIn });
  if (typeof isApproved === 'boolean') conditions.push({ isApproved });

  // Age filtering
  if (minAge !== undefined) {
    conditions.push({
      OR: [{ minAge: null }, { minAge: { lte: minAge } }],
    });
  }
  if (maxAge !== undefined) {
    conditions.push({
      OR: [{ maxAge: null }, { maxAge: { gte: maxAge } }],
    });
  }

  // Text search
  if (search) {
    conditions.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  return { AND: conditions };
}

/**
 * List social stories with filtering and pagination.
 */
export async function listStories(
  options: ListStoriesOptions
): Promise<PaginatedResponse<SocialStoryWithMetadata>> {
  const { page = 1, pageSize = 20 } = options;
  const where = buildStoriesWhereClause(options);

  const [items, total] = await Promise.all([
    prisma.socialStory.findMany({
      where,
      orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.socialStory.count({ where }),
  ]);

  return {
    items: items.map(transformStoryToMetadata),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get a single social story by ID.
 */
export async function getStoryById(id: string): Promise<SocialStoryWithMetadata | null> {
  const story = await prisma.socialStory.findUnique({
    where: { id },
  });

  return story ? transformStoryToMetadata(story) : null;
}

/**
 * Get a social story by slug.
 */
export async function getStoryBySlug(
  slug: string,
  tenantId?: string
): Promise<SocialStoryWithMetadata | null> {
  const whereClause: Prisma.SocialStoryWhereInput = { slug };
  if (tenantId) {
    whereClause.OR = [{ tenantId }, { tenantId: null }];
  }

  const story = await prisma.socialStory.findFirst({ where: whereClause });
  return story ? transformStoryToMetadata(story) : null;
}

/**
 * Create a new social story.
 */
export async function createStory(
  input: CreateSocialStoryInput,
  createdByUserId?: string
): Promise<SocialStoryWithMetadata> {
  const story = await prisma.socialStory.create({
    data: {
      tenantId: input.tenantId ?? null,
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      pages: input.pages as unknown as Prisma.InputJsonValue,
      readingLevel: input.readingLevel ?? 'DEVELOPING',
      estimatedDuration: input.estimatedDuration ?? calculateDuration(input.pages),
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      gradeBands: input.gradeBands ?? [],
      supportsPersonalization: input.supportsPersonalization ?? true,
      personalizationTokens: input.personalizationTokens ?? extractTokens(input.pages),
      defaultVisualStyle: input.defaultVisualStyle ?? 'CARTOON',
      hasAudio: input.hasAudio ?? false,
      hasVideo: input.hasVideo ?? false,
      accessibilityFeatures: (input.accessibilityFeatures ??
        {}) as unknown as Prisma.InputJsonValue,
      translations: (input.translations ?? {}) as unknown as Prisma.InputJsonValue,
      isBuiltIn: input.isBuiltIn ?? false,
      sourceTemplate: input.sourceTemplate ?? null,
      createdByUserId: createdByUserId ?? null,
    },
  });

  return transformStoryToMetadata(story);
}

/**
 * Build update data for story updates.
 */
function buildStoryUpdateData(input: UpdateSocialStoryInput): Prisma.SocialStoryUpdateInput {
  const data: Prisma.SocialStoryUpdateInput = {
    version: { increment: 1 },
  };

  if (input.title) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.pages) {
    data.pages = input.pages as unknown as Prisma.InputJsonValue;
    data.estimatedDuration = input.estimatedDuration ?? calculateDuration(input.pages);
    data.personalizationTokens = extractTokens(input.pages);
  }
  if (input.readingLevel) data.readingLevel = input.readingLevel;
  if (input.estimatedDuration) data.estimatedDuration = input.estimatedDuration;
  if (input.minAge !== undefined) data.minAge = input.minAge;
  if (input.maxAge !== undefined) data.maxAge = input.maxAge;
  if (input.gradeBands) data.gradeBands = input.gradeBands;
  if (input.supportsPersonalization !== undefined)
    data.supportsPersonalization = input.supportsPersonalization;
  if (input.defaultVisualStyle) data.defaultVisualStyle = input.defaultVisualStyle;
  if (input.hasAudio !== undefined) data.hasAudio = input.hasAudio;
  if (input.hasVideo !== undefined) data.hasVideo = input.hasVideo;
  if (input.accessibilityFeatures) {
    data.accessibilityFeatures = input.accessibilityFeatures as unknown as Prisma.InputJsonValue;
  }
  if (input.translations) {
    data.translations = input.translations as unknown as Prisma.InputJsonValue;
  }
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return data;
}

/**
 * Update an existing social story.
 */
export async function updateStory(
  id: string,
  input: UpdateSocialStoryInput
): Promise<SocialStoryWithMetadata | null> {
  const existing = await prisma.socialStory.findUnique({ where: { id } });
  if (!existing) return null;

  const data = buildStoryUpdateData(input);
  const story = await prisma.socialStory.update({ where: { id }, data });

  return transformStoryToMetadata(story);
}

/**
 * Soft delete a social story.
 */
export async function deleteStory(id: string): Promise<boolean> {
  const result = await prisma.socialStory.updateMany({
    where: { id, isBuiltIn: false },
    data: { isActive: false },
  });

  return result.count > 0;
}

/**
 * Approve a social story for use.
 */
export async function approveStory(
  id: string,
  approvedByUserId: string
): Promise<SocialStoryWithMetadata | null> {
  const story = await prisma.socialStory.update({
    where: { id },
    data: {
      isApproved: true,
      approvedByUserId,
      approvedAt: new Date(),
    },
  });

  return transformStoryToMetadata(story);
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER PREFERENCES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get learner story preferences.
 */
export async function getLearnerPreferences(learnerId: string) {
  return prisma.learnerStoryPreferences.findUnique({
    where: { learnerId },
  });
}

/**
 * Update learner story preferences.
 */
export async function updateLearnerPreferences(
  learnerId: string,
  input: UpdateLearnerPreferencesInput
) {
  // Build update data, converting undefined to appropriate types
  const updateData: Prisma.LearnerStoryPreferencesUpdateInput = {};
  if (input.preferredVisualStyle) updateData.preferredVisualStyle = input.preferredVisualStyle;
  if (input.preferredReadingLevel) updateData.preferredReadingLevel = input.preferredReadingLevel;
  if (input.enableAudio !== undefined) updateData.enableAudio = input.enableAudio;
  if (input.enableTts !== undefined) updateData.enableTts = input.enableTts;
  if (input.ttsVoice !== undefined) updateData.ttsVoice = input.ttsVoice;
  if (input.ttsSpeed !== undefined) updateData.ttsSpeed = input.ttsSpeed;
  if (input.autoAdvance !== undefined) updateData.autoAdvance = input.autoAdvance;
  if (input.pageDisplayTime !== undefined) updateData.pageDisplayTime = input.pageDisplayTime;
  if (input.characterName !== undefined) updateData.characterName = input.characterName;
  if (input.favoriteColor !== undefined) updateData.favoriteColor = input.favoriteColor;
  if (input.interests !== undefined) updateData.interests = input.interests;
  if (input.highContrast !== undefined) updateData.highContrast = input.highContrast;
  if (input.largeText !== undefined) updateData.largeText = input.largeText;
  if (input.reducedMotion !== undefined) updateData.reducedMotion = input.reducedMotion;

  return prisma.learnerStoryPreferences.upsert({
    where: { learnerId },
    create: {
      learnerId,
      ...updateData,
    },
    update: updateData,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// STORY VIEWS & ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Record a story view.
 */
export async function recordStoryView(input: RecordStoryViewInput) {
  return prisma.socialStoryView.create({
    data: {
      storyId: input.storyId,
      learnerId: input.learnerId,
      sessionId: input.sessionId ?? null,
      triggerType: input.triggerType,
      triggerContext: (input.triggerContext ?? {}) as unknown as Prisma.InputJsonValue,
      pagesViewed: input.pagesViewed,
      totalPages: input.totalPages,
      completedAt: input.completedAt ?? null,
      durationSeconds: input.durationSeconds ?? null,
      replayCount: input.replayCount ?? 0,
      audioPlayed: input.audioPlayed ?? false,
      interactions: (input.interactions ?? []) as unknown as Prisma.InputJsonValue,
      preEmotionalState: input.preEmotionalState ?? null,
      postEmotionalState: input.postEmotionalState ?? null,
      helpfulnessRating: input.helpfulnessRating ?? null,
    },
  });
}

/**
 * Get learner story statistics.
 */
export async function getLearnerStoryStats(learnerId: string): Promise<LearnerStoryStats> {
  const [views, uniqueStories, recentViews] = await Promise.all([
    prisma.socialStoryView.count({ where: { learnerId } }),
    prisma.socialStoryView.findMany({
      where: { learnerId },
      distinct: ['storyId'],
      select: { storyId: true },
    }),
    prisma.socialStoryView.findMany({
      where: { learnerId },
      orderBy: { viewedAt: 'desc' },
      take: 10,
      include: { story: { select: { id: true, title: true } } },
    }),
  ]);

  // Calculate completion rate
  const completedViews = await prisma.socialStoryView.count({
    where: { learnerId, completedAt: { not: null } },
  });

  // Get average rating
  const avgRating = await prisma.socialStoryView.aggregate({
    where: { learnerId, helpfulnessRating: { not: null } },
    _avg: { helpfulnessRating: true },
  });

  // Get most viewed category
  const categoryViews = await prisma.$queryRaw<{ category: SocialStoryCategory; count: bigint }[]>`
    SELECT s.category, COUNT(*) as count
    FROM social_story_views v
    JOIN social_stories s ON v.story_id = s.id
    WHERE v.learner_id = ${learnerId}::uuid
    GROUP BY s.category
    ORDER BY count DESC
    LIMIT 1
  `;

  return {
    learnerId,
    totalViews: views,
    uniqueStoriesViewed: uniqueStories.length,
    completionRate: views > 0 ? completedViews / views : 0,
    averageRating: avgRating._avg.helpfulnessRating,
    mostViewedCategory: categoryViews[0]?.category ?? null,
    recentViews: recentViews.map((v) => ({
      storyId: v.storyId,
      title: v.story.title,
      viewedAt: v.viewedAt,
      completed: v.completedAt !== null,
    })),
    preferredCategories: categoryViews.map((c) => c.category),
  };
}

/**
 * Get story effectiveness metrics.
 */
export async function getStoryEffectiveness(storyId: string): Promise<StoryEffectivenessMetrics> {
  const [totalViews, completedViews, ratings, durations] = await Promise.all([
    prisma.socialStoryView.count({ where: { storyId } }),
    prisma.socialStoryView.count({
      where: { storyId, completedAt: { not: null } },
    }),
    prisma.socialStoryView.aggregate({
      where: { storyId, helpfulnessRating: { not: null } },
      _avg: { helpfulnessRating: true },
    }),
    prisma.socialStoryView.aggregate({
      where: { storyId, durationSeconds: { not: null } },
      _avg: { durationSeconds: true },
    }),
  ]);

  // Calculate emotional impact
  const emotionalStates = await prisma.socialStoryView.findMany({
    where: {
      storyId,
      preEmotionalState: { not: null },
      postEmotionalState: { not: null },
    },
    select: { preEmotionalState: true, postEmotionalState: true },
  });

  const emotionalImpact = { improved: 0, unchanged: 0, declined: 0 };
  for (const state of emotionalStates) {
    const pre = getEmotionalScore(state.preEmotionalState ?? '');
    const post = getEmotionalScore(state.postEmotionalState ?? '');
    if (post > pre) emotionalImpact.improved++;
    else if (post < pre) emotionalImpact.declined++;
    else emotionalImpact.unchanged++;
  }

  // Calculate replay rate
  const replays = await prisma.socialStoryView.aggregate({
    where: { storyId },
    _sum: { replayCount: true },
  });

  return {
    storyId,
    totalViews,
    completionRate: totalViews > 0 ? completedViews / totalViews : 0,
    averageRating: ratings._avg.helpfulnessRating,
    emotionalImpact,
    replayRate: totalViews > 0 ? (replays._sum.replayCount ?? 0) / totalViews : 0,
    averageDuration: durations._avg.durationSeconds ?? 0,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// STORY ASSIGNMENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a story assignment for a learner.
 */
export async function createAssignment(input: CreateAssignmentInput, assignedByUserId: string) {
  return prisma.socialStoryAssignment.create({
    data: {
      storyId: input.storyId,
      learnerId: input.learnerId,
      assignedByUserId,
      priority: input.priority ?? 0,
      isRequired: input.isRequired ?? false,
      showBefore: input.showBefore ?? [],
      showAfter: input.showAfter ?? [],
      scheduledTimes: (input.scheduledTimes ?? []) as unknown as Prisma.InputJsonValue,
      maxDailyViews: input.maxDailyViews ?? null,
      minHoursBetween: input.minHoursBetween ?? null,
      expiresAt: input.expiresAt ?? null,
      notes: input.notes ?? null,
    },
  });
}

/**
 * Update a story assignment.
 */
export async function updateAssignment(id: string, input: UpdateAssignmentInput) {
  const data: Prisma.SocialStoryAssignmentUpdateInput = {};
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.isRequired !== undefined) data.isRequired = input.isRequired;
  if (input.showBefore !== undefined) data.showBefore = input.showBefore;
  if (input.showAfter !== undefined) data.showAfter = input.showAfter;
  if (input.scheduledTimes !== undefined) {
    data.scheduledTimes = input.scheduledTimes as unknown as Prisma.InputJsonValue;
  }
  if (input.maxDailyViews !== undefined) data.maxDailyViews = input.maxDailyViews;
  if (input.minHoursBetween !== undefined) data.minHoursBetween = input.minHoursBetween;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
  if (input.notes !== undefined) data.notes = input.notes;

  return prisma.socialStoryAssignment.update({
    where: { id },
    data,
  });
}

/**
 * Delete a story assignment.
 */
export async function deleteAssignment(id: string) {
  return prisma.socialStoryAssignment.delete({
    where: { id },
  });
}

/**
 * Get active assignments for a learner.
 */
export async function getLearnerAssignments(learnerId: string) {
  return prisma.socialStoryAssignment.findMany({
    where: {
      learnerId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { story: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════════════════════

const ACTIVITY_CATEGORY_MAP: Record<string, SocialStoryCategory> = {
  LESSON: 'STARTING_LESSON',
  QUIZ: 'TAKING_QUIZ',
  TEST: 'TEST_TAKING',
  BREAK: 'SENSORY_BREAK',
};

const EMOTIONAL_CATEGORY_MAP: Record<string, SocialStoryCategory> = {
  FRUSTRATED: 'FEELING_FRUSTRATED',
  OVERWHELMED: 'FEELING_OVERWHELMED',
  ANXIOUS: 'FEELING_ANXIOUS',
  ANGRY: 'CALMING_DOWN',
  EXCITED: 'CELEBRATING_SUCCESS',
};

/**
 * Add assignment-based recommendations.
 */
async function addAssignmentRecommendations(
  recommendations: StoryRecommendation[],
  learnerId: string,
  excludeStoryIds: string[],
  currentActivityType?: string,
  nextActivityType?: string
): Promise<void> {
  const assignments = await prisma.socialStoryAssignment.findMany({
    where: {
      learnerId,
      isActive: true,
      storyId: { notIn: excludeStoryIds },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { story: true },
    orderBy: { priority: 'desc' },
  });

  for (const assignment of assignments) {
    const shouldShowBefore = nextActivityType && assignment.showBefore.includes(nextActivityType);
    const shouldShowAfter =
      currentActivityType && assignment.showAfter.includes(currentActivityType);

    if (shouldShowBefore || shouldShowAfter || assignment.isRequired) {
      recommendations.push({
        storyId: assignment.storyId,
        story: transformStoryToMetadata(assignment.story),
        score: assignment.isRequired ? 1 : 0.9,
        reason: 'TEACHER_ASSIGNED',
        context: { assignmentId: assignment.id },
      });
    }
  }
}

/**
 * Add transition-based recommendations.
 */
async function addTransitionRecommendations(
  recommendations: StoryRecommendation[],
  nextActivityType: string,
  readingLevel: SocialStoryReadingLevel,
  excludeStoryIds: string[]
): Promise<void> {
  const category = ACTIVITY_CATEGORY_MAP[nextActivityType];
  if (!category) return;

  const stories = await prisma.socialStory.findMany({
    where: {
      category,
      isActive: true,
      isApproved: true,
      readingLevel,
      id: { notIn: excludeStoryIds },
    },
    take: 3,
  });

  for (const story of stories) {
    const alreadyAdded = recommendations.some((r) => r.storyId === story.id);
    if (!alreadyAdded) {
      recommendations.push({
        storyId: story.id,
        story: transformStoryToMetadata(story),
        score: 0.8,
        reason: 'TRANSITION_SUPPORT',
        context: { nextActivityType },
      });
    }
  }
}

/**
 * Add emotional support recommendations.
 */
async function addEmotionalRecommendations(
  recommendations: StoryRecommendation[],
  emotionalState: string,
  readingLevel: SocialStoryReadingLevel,
  excludeStoryIds: string[]
): Promise<void> {
  const category = EMOTIONAL_CATEGORY_MAP[emotionalState.toUpperCase()];
  if (!category) return;

  const stories = await prisma.socialStory.findMany({
    where: {
      category,
      isActive: true,
      isApproved: true,
      readingLevel,
      id: { notIn: excludeStoryIds },
    },
    take: 2,
  });

  for (const story of stories) {
    const alreadyAdded = recommendations.some((r) => r.storyId === story.id);
    if (!alreadyAdded) {
      recommendations.push({
        storyId: story.id,
        story: transformStoryToMetadata(story),
        score: 0.85,
        reason: 'EMOTIONAL_SUPPORT',
        context: { detectedEmotionalState: emotionalState },
      });
    }
  }
}

/**
 * Add previously helpful story recommendations.
 */
async function addHelpfulStoryRecommendations(
  recommendations: StoryRecommendation[],
  learnerId: string,
  excludeStoryIds: string[]
): Promise<void> {
  const helpfulViews = await prisma.socialStoryView.findMany({
    where: {
      learnerId,
      helpfulnessRating: { gte: 4 },
      storyId: { notIn: excludeStoryIds },
    },
    include: { story: true },
    orderBy: { helpfulnessRating: 'desc' },
    take: 3,
  });

  for (const view of helpfulViews) {
    const alreadyAdded = recommendations.some((r) => r.storyId === view.storyId);
    if (!alreadyAdded) {
      recommendations.push({
        storyId: view.storyId,
        story: transformStoryToMetadata(view.story),
        score: 0.7,
        reason: 'FREQUENTLY_HELPFUL',
        context: { rating: view.helpfulnessRating },
      });
    }
  }
}

/**
 * Get story recommendations for a learner based on context.
 */
export async function getRecommendations(
  context: RecommendationContext
): Promise<StoryRecommendation[]> {
  const {
    learnerId,
    currentActivityType,
    nextActivityType,
    detectedEmotionalState,
    excludeStoryIds = [],
    maxResults = 5,
  } = context;

  const recommendations: StoryRecommendation[] = [];

  // Get learner preferences
  const preferences = await getLearnerPreferences(learnerId);
  const readingLevel = preferences?.preferredReadingLevel ?? 'DEVELOPING';

  // 1. Assignment-based recommendations
  await addAssignmentRecommendations(
    recommendations,
    learnerId,
    excludeStoryIds,
    currentActivityType,
    nextActivityType
  );

  // 2. Transition-based recommendations
  if (nextActivityType) {
    await addTransitionRecommendations(
      recommendations,
      nextActivityType,
      readingLevel,
      excludeStoryIds
    );
  }

  // 3. Emotional state recommendations
  if (detectedEmotionalState) {
    await addEmotionalRecommendations(
      recommendations,
      detectedEmotionalState,
      readingLevel,
      excludeStoryIds
    );
  }

  // 4. Previously helpful stories
  await addHelpfulStoryRecommendations(recommendations, learnerId, excludeStoryIds);

  // Sort by score and limit results
  const sorted = [...recommendations].sort((a, b) => b.score - a.score);
  return sorted.slice(0, maxResults);
}

// ══════════════════════════════════════════════════════════════════════════════
// PERSONALIZATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Personalize a story with learner-specific context.
 */
export function personalizeStory(
  story: SocialStoryWithMetadata,
  context: PersonalizationContext
): SocialStoryWithMetadata {
  if (!story.supportsPersonalization) {
    return story;
  }

  const personalizedPages = story.pages.map((page) => ({
    ...page,
    sentences: page.sentences.map((sentence) => personalizeSentence(sentence, context)),
  }));

  return {
    ...story,
    pages: personalizedPages,
  };
}

function personalizeSentence(
  sentence: StorySentence,
  context: PersonalizationContext
): StorySentence {
  let text = sentence.text;

  // Replace tokens
  const tokenMap: Record<string, string | undefined> = {
    '{{NAME}}': context.learnerName,
    '{{TEACHER}}': context.teacherName,
    '{{HELPER}}': context.helperName,
    '{{SCHOOL}}': context.schoolName,
    '{{CLASSROOM}}': context.classroomName,
    '{{FAVORITE_ACTIVITY}}': context.favoriteActivity,
    '{{CALM_PLACE}}': context.calmPlace,
    '{{COMFORT_ITEM}}': context.comfortItem,
    '{{CHARACTER_NAME}}': context.characterName,
    '{{BREAK_SIGNAL}}': context.breakSignal,
    '{{HELP_SIGNAL}}': context.helpSignal,
  };

  for (const [token, value] of Object.entries(tokenMap)) {
    if (value) {
      text = text.replaceAll(token, value);
    }
  }

  // Handle custom tokens
  if (context.customTokens) {
    for (const [token, value] of Object.entries(context.customTokens)) {
      text = text.replaceAll(`{{${token}}}`, value);
    }
  }

  return { ...sentence, text };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Transform a Prisma story to the API response format.
 */
function transformStoryToMetadata(
  story: Prisma.SocialStoryGetPayload<Record<string, never>>
): SocialStoryWithMetadata {
  const pages = story.pages as unknown as StoryPage[];

  return {
    id: story.id,
    tenantId: story.tenantId,
    slug: story.slug,
    title: story.title,
    description: story.description,
    category: story.category as unknown as SocialStoryWithMetadata['category'],
    pages,
    readingLevel: story.readingLevel as unknown as SocialStoryWithMetadata['readingLevel'],
    estimatedDuration: story.estimatedDuration,
    minAge: story.minAge,
    maxAge: story.maxAge,
    gradeBands: story.gradeBands as unknown as SocialStoryWithMetadata['gradeBands'],
    supportsPersonalization: story.supportsPersonalization,
    personalizationTokens: story.personalizationTokens,
    defaultVisualStyle:
      story.defaultVisualStyle as unknown as SocialStoryWithMetadata['defaultVisualStyle'],
    hasAudio: story.hasAudio,
    hasVideo: story.hasVideo,
    accessibilityFeatures:
      story.accessibilityFeatures as unknown as SocialStoryWithMetadata['accessibilityFeatures'],
    translations: story.translations as unknown as SocialStoryWithMetadata['translations'],
    isBuiltIn: story.isBuiltIn,
    sourceTemplate: story.sourceTemplate,
    version: story.version,
    isActive: story.isActive,
    isApproved: story.isApproved,
    approvedByUserId: story.approvedByUserId,
    approvedAt: story.approvedAt,
    createdByUserId: story.createdByUserId,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
    pageCount: pages.length,
  };
}

/**
 * Calculate estimated duration based on pages.
 */
function calculateDuration(pages: StoryPage[]): number {
  // Average 8-10 seconds per page for reading
  return pages.length * 10;
}

/**
 * Extract personalization tokens from pages.
 */
function extractTokens(pages: StoryPage[]): string[] {
  const tokenPattern = /\{\{([A-Z_]+)\}\}/g;
  const tokens = new Set<string>();

  for (const page of pages) {
    for (const sentence of page.sentences) {
      let match;
      while ((match = tokenPattern.exec(sentence.text)) !== null) {
        const tokenName = match[1];
        if (tokenName) {
          tokens.add(tokenName);
        }
      }
    }
  }

  return [...tokens];
}

/**
 * Map emotional state to numeric score for comparison.
 */
function getEmotionalScore(state: string): number {
  const scores: Record<string, number> = {
    CALM: 5,
    HAPPY: 5,
    CONTENT: 4,
    NEUTRAL: 3,
    UNCERTAIN: 2,
    ANXIOUS: 2,
    FRUSTRATED: 1,
    OVERWHELMED: 1,
    ANGRY: 0,
  };

  return scores[state.toUpperCase()] ?? 3;
}
