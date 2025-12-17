/**
 * Transition Service
 *
 * Core business logic for the transition support system.
 * Handles planning, tracking, and analytics for activity transitions.
 */

import type {
  PrismaClient,
  TransitionPreferences,
  TransitionRoutine,
  Prisma,
} from '@prisma/client';

import { prisma } from '../prisma.js';

/** TransitionPreferences with the routine relation included */
type TransitionPreferencesWithRoutine = Prisma.TransitionPreferencesGetPayload<{
  include: { routine: true };
}>;

import type {
  AudioSettings,
  CreateRoutineInput,
  FirstThenBoard,
  LearnerTransitionProfile,
  TransitionAnalytics,
  TransitionCompletionInput,
  TransitionCompletionResult,
  TransitionContext,
  TransitionEventData,
  TransitionOutcome,
  TransitionPlan,
  TransitionPreferencesInput,
  TransitionRoutineStep,
  TransitionWarning,
  VisualSettings,
  VisualWarningStyle,
  TransitionColorScheme,
  AudioWarningType,
} from './transition.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPE ALIASES
// ══════════════════════════════════════════════════════════════════════════════

/** Warning intensity level based on time remaining */
type WarningIntensity = 'low' | 'medium' | 'high';

// ══════════════════════════════════════════════════════════════════════════════
// COLOR SCHEMES
// ══════════════════════════════════════════════════════════════════════════════

const COLOR_SCHEMES: Record<string, VisualSettings['colors']> = {
  TRAFFIC_LIGHT: {
    warning: '#22c55e', // Green - plenty of time
    caution: '#eab308', // Yellow - getting close
    ready: '#ef4444', // Red - almost time
    background: '#f8fafc',
  },
  BLUE_GRADIENT: {
    warning: '#93c5fd', // Light blue
    caution: '#3b82f6', // Medium blue
    ready: '#1d4ed8', // Dark blue
    background: '#eff6ff',
  },
  NATURE: {
    warning: '#86efac', // Light green
    caution: '#a3e635', // Lime
    ready: '#84cc16', // Green
    background: '#f7fee7',
  },
  MONOCHROME: {
    warning: '#d1d5db', // Light gray
    caution: '#9ca3af', // Medium gray
    ready: '#6b7280', // Dark gray
    background: '#f9fafb',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class TransitionService {
  private readonly db: PrismaClient;

  constructor(database?: PrismaClient) {
    this.db = database ?? prisma;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PREFERENCES MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get or create transition preferences for a learner.
   * Uses smart defaults based on learner profile if available.
   */
  async getOrCreatePreferences(
    learnerId: string,
    tenantId: string,
    learnerProfile?: LearnerTransitionProfile
  ): Promise<TransitionPreferencesWithRoutine> {
    const preferences = await this.db.transitionPreferences.findUnique({
      where: { learnerId },
      include: { routine: true },
    });

    return (
      preferences ?? (await this.createDefaultPreferences(learnerId, tenantId, learnerProfile))
    );
  }

  /**
   * Update learner's transition preferences.
   */
  async updatePreferences(
    learnerId: string,
    tenantId: string,
    updates: TransitionPreferencesInput
  ): Promise<TransitionPreferencesWithRoutine> {
    const defaultPrefs = this.getPreferencesDefaults(updates);
    const updateData = this.buildPreferencesUpdateData(updates);

    return this.db.transitionPreferences.upsert({
      where: { learnerId },
      create: {
        learnerId,
        tenantId,
        ...defaultPrefs,
      },
      update: updateData,
      include: { routine: true },
    });
  }

  /**
   * Get default values for preferences, using provided values or fallbacks.
   */
  private getPreferencesDefaults(updates: TransitionPreferencesInput) {
    return {
      warningIntervals: updates.warningIntervals ?? [60, 30, 10],
      minimumTransitionTime: updates.minimumTransitionTime ?? 30,
      enableVisualWarnings: updates.enableVisualWarnings ?? true,
      enableAudioWarnings: updates.enableAudioWarnings ?? true,
      enableHapticWarnings: updates.enableHapticWarnings ?? true,
      visualWarningStyle: updates.visualWarningStyle ?? 'COUNTDOWN_CIRCLE',
      colorScheme: updates.colorScheme ?? 'TRAFFIC_LIGHT',
      showProgressBar: updates.showProgressBar ?? true,
      audioWarningType: updates.audioWarningType ?? 'GENTLE_CHIME',
      audioVolume: updates.audioVolume ?? 0.7,
      useSpokenWarnings: updates.useSpokenWarnings ?? false,
      transitionRoutineId: updates.transitionRoutineId,
      showFirstThenBoard: updates.showFirstThenBoard ?? true,
      requireAcknowledgment: updates.requireAcknowledgment ?? false,
      activityTransitions: updates.activityTransitions
        ? (updates.activityTransitions as unknown as object)
        : undefined,
      customColors: updates.customColors ? (updates.customColors as unknown as object) : undefined,
    };
  }

  /**
   * Build the update data object with only fields that were explicitly provided.
   * Uses helper functions to reduce cognitive complexity.
   */
  private buildPreferencesUpdateData(updates: TransitionPreferencesInput) {
    const result: Record<string, unknown> = {};

    // Warning settings
    this.addIfDefined(result, 'warningIntervals', updates.warningIntervals);
    this.addIfNotUndefined(result, 'minimumTransitionTime', updates.minimumTransitionTime);

    // Visual settings
    this.addIfNotUndefined(result, 'enableVisualWarnings', updates.enableVisualWarnings);
    this.addIfDefined(result, 'visualWarningStyle', updates.visualWarningStyle);
    this.addIfDefined(result, 'colorScheme', updates.colorScheme);
    this.addIfNotUndefined(result, 'showProgressBar', updates.showProgressBar);

    // Audio settings
    this.addIfNotUndefined(result, 'enableAudioWarnings', updates.enableAudioWarnings);
    this.addIfDefined(result, 'audioWarningType', updates.audioWarningType);
    this.addIfNotUndefined(result, 'audioVolume', updates.audioVolume);
    this.addIfNotUndefined(result, 'useSpokenWarnings', updates.useSpokenWarnings);

    // Haptic settings
    this.addIfNotUndefined(result, 'enableHapticWarnings', updates.enableHapticWarnings);

    // Routine and board settings
    this.addIfNotUndefined(result, 'transitionRoutineId', updates.transitionRoutineId);
    this.addIfNotUndefined(result, 'showFirstThenBoard', updates.showFirstThenBoard);
    this.addIfNotUndefined(result, 'requireAcknowledgment', updates.requireAcknowledgment);

    // JSON fields
    this.addIfNotUndefined(result, 'activityTransitions', updates.activityTransitions);
    this.addIfNotUndefined(result, 'customColors', updates.customColors);

    return result;
  }

  /**
   * Add field to result if value is truthy (for arrays and strings).
   */
  private addIfDefined(result: Record<string, unknown>, key: string, value: unknown): void {
    if (value) {
      result[key] = value;
    }
  }

  /**
   * Add field to result if value is not undefined (allows null, false, 0).
   */
  private addIfNotUndefined(result: Record<string, unknown>, key: string, value: unknown): void {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TRANSITION PLANNING
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Plan a transition between activities.
   * Returns a complete plan with warnings, routines, and visual settings.
   */
  async planTransition(
    tenantId: string,
    learnerId: string,
    context: TransitionContext,
    _urgency?: 'low' | 'normal' | 'high'
  ): Promise<TransitionPlan> {
    // Get or create learner preferences
    const preferences = await this.getOrCreatePreferences(learnerId, tenantId);

    const { sessionId, fromActivity, toActivity } = context;

    // Generate unique transition ID
    const transitionId = `trans_${sessionId}_${Date.now()}`;

    // Calculate transition duration
    let totalDuration = preferences.minimumTransitionTime;

    // Check for activity-specific configuration
    const activityTransitions =
      (preferences.activityTransitions as Record<string, { extraTime?: number }> | null) ?? {};
    const transitionKey = fromActivity
      ? `${fromActivity.type}_to_${toActivity.type}`
      : `start_to_${toActivity.type}`;

    const transitionConfig = activityTransitions[transitionKey];
    if (transitionConfig?.extraTime !== undefined) {
      totalDuration = Math.max(totalDuration, transitionConfig.extraTime);
    }

    // Adjust based on current state (if learner is struggling, give more time)
    if (
      context.currentFocusState === 'struggling' ||
      context.currentFocusState === 'frustrated' ||
      context.currentMood === 'frustrated' ||
      context.currentMood === 'tired'
    ) {
      totalDuration = Math.round(totalDuration * 1.5);
    }

    // Build warnings
    const warnings = this.buildWarnings(preferences, totalDuration);

    // Get transition routine if configured
    let routine: TransitionRoutineStep[] | undefined;
    if (preferences.transitionRoutineId) {
      const routineData = await this.db.transitionRoutine.findUnique({
        where: { id: preferences.transitionRoutineId },
      });
      if (routineData) {
        routine = routineData.steps as unknown as TransitionRoutineStep[];
        totalDuration = Math.max(totalDuration, routineData.totalDuration);
      }
    }

    // Build First/Then board
    let firstThenBoard: FirstThenBoard | undefined;
    if (preferences.showFirstThenBoard && fromActivity) {
      firstThenBoard = {
        currentActivity: {
          title: fromActivity.title,
          image: fromActivity.thumbnail,
          description: `Finishing ${this.formatActivityType(fromActivity.type)}`,
          status: 'current',
        },
        nextActivity: {
          title: toActivity.title,
          image: toActivity.thumbnail,
          description: `Starting ${this.formatActivityType(toActivity.type)}`,
          status: 'upcoming',
        },
      };
    }

    // Build visual and audio settings
    const visualSettings = this.buildVisualSettings(preferences);
    const audioSettings = this.buildAudioSettings(preferences);

    // Log the transition event
    await this.logTransitionStart({
      transitionId,
      sessionId: context.sessionId,
      learnerId: context.learnerId,
      tenantId: context.tenantId,
      fromActivity,
      toActivity,
      focusState: context.currentFocusState,
      mood: context.currentMood,
      plannedDuration: totalDuration,
    });

    return {
      transitionId,
      totalDuration,
      warnings,
      routine,
      firstThenBoard,
      requiresAcknowledgment: preferences.requireAcknowledgment,
      visualSettings,
      audioSettings,
      fromActivity: fromActivity ?? undefined,
      toActivity,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TRANSITION LIFECYCLE
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Acknowledge a transition (learner confirms they're ready).
   */
  async acknowledgeTransition(
    tenantId: string,
    transitionId: string,
    _readyState: 'ready' | 'needs_more_time' | 'skipped' = 'ready'
  ): Promise<{ success: boolean; secondsRemaining?: number }> {
    const sessionId = this.extractSessionId(transitionId);

    // Find the transition event
    const event = await this.db.transitionEvent.findFirst({
      where: {
        sessionId,
        tenantId,
        acknowledgedAt: null,
      },
    });

    if (!event) {
      return { success: false };
    }

    await this.db.transitionEvent.updateMany({
      where: {
        sessionId,
        tenantId,
        acknowledgedAt: null,
      },
      data: {
        acknowledgedAt: new Date(),
      },
    });

    // Calculate remaining time if we have planned duration and start time
    let secondsRemaining: number | undefined;
    if (event.plannedDurationSeconds && event.transitionStartedAt) {
      const endTime = event.transitionStartedAt.getTime() + event.plannedDurationSeconds * 1000;
      secondsRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    }

    return { success: true, secondsRemaining };
  }

  /**
   * Complete a transition and record metrics.
   */
  async completeTransition(
    tenantId: string,
    transitionId: string,
    input: TransitionCompletionInput
  ): Promise<TransitionCompletionResult> {
    const sessionId = this.extractSessionId(transitionId);

    // Find the transition event to get details
    const event = await this.db.transitionEvent.findFirst({
      where: {
        sessionId,
        tenantId,
        transitionCompletedAt: null,
      },
    });

    if (!event) {
      return { success: false };
    }

    // Update the event
    await this.db.transitionEvent.updateMany({
      where: {
        sessionId,
        tenantId,
        transitionCompletedAt: null,
      },
      data: {
        transitionCompletedAt: new Date(),
        outcome: input.outcome.toUpperCase() as TransitionOutcome,
        totalTransitionSeconds: input.actualDuration,
      },
    });

    return {
      success: true,
      fromActivityId: event.fromActivityId ?? undefined,
      toActivityId: event.toActivityId,
      outcome: input.outcome,
      plannedDuration: event.plannedDurationSeconds ?? 0,
      actualDuration: input.actualDuration,
      warningsDelivered: 0, // Not tracked in current schema
      warningsAcknowledged: input.warningsAcknowledged,
      routineStepsCompleted: input.routineStepsCompleted,
      routineStepsTotal: 0, // Not tracked in current schema
      learnerInteractions: input.learnerInteractions,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ROUTINES MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get default and system routines available for a tenant.
   */
  async getAvailableRoutines(tenantId: string): Promise<TransitionRoutine[]> {
    return this.db.transitionRoutine.findMany({
      where: {
        OR: [{ tenantId, isDefault: true }, { isSystemRoutine: true }],
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get all routines for a tenant (including custom).
   */
  async getAllRoutines(tenantId: string): Promise<TransitionRoutine[]> {
    return this.db.transitionRoutine.findMany({
      where: {
        OR: [{ tenantId }, { isSystemRoutine: true }],
      },
      orderBy: [{ isSystemRoutine: 'desc' }, { isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Get a routine by ID.
   */
  async getRoutineById(routineId: string): Promise<TransitionRoutine | null> {
    return this.db.transitionRoutine.findUnique({
      where: { id: routineId },
    });
  }

  /**
   * Create a custom transition routine.
   */
  async createRoutine(input: CreateRoutineInput): Promise<TransitionRoutine> {
    // Add IDs to steps
    const stepsWithIds: TransitionRoutineStep[] = input.steps.map((step, index) => ({
      ...step,
      id: `step_${Date.now()}_${index}`,
    }));

    const totalDuration = stepsWithIds.reduce((sum, step) => sum + step.duration, 0);

    return this.db.transitionRoutine.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        description: input.description ?? null,
        steps: stepsWithIds as unknown as object[],
        totalDuration,
        isDefault: input.isDefault ?? false,
        isSystemRoutine: input.isSystemRoutine ?? false,
        targetActivityTypes: input.targetActivityTypes ?? [],
        targetAgeRange: input.targetAgeRange
          ? (input.targetAgeRange as unknown as object)
          : undefined,
        targetGradeBands: input.targetGradeBands ?? [],
      },
    });
  }

  /**
   * Update an existing routine.
   */
  async updateRoutine(
    routineId: string,
    updates: Partial<CreateRoutineInput>
  ): Promise<TransitionRoutine | null> {
    const existing = await this.db.transitionRoutine.findFirst({
      where: { id: routineId, isSystemRoutine: false },
    });

    if (!existing) {
      return null;
    }

    let stepsWithIds = existing.steps as unknown as TransitionRoutineStep[];
    let totalDuration = existing.totalDuration;

    if (updates.steps) {
      stepsWithIds = updates.steps.map((step, index) => ({
        ...step,
        id: `step_${Date.now()}_${index}`,
      }));
      totalDuration = stepsWithIds.reduce((sum, step) => sum + step.duration, 0);
    }

    return this.db.transitionRoutine.update({
      where: { id: routineId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.steps && { steps: stepsWithIds as unknown as object[], totalDuration }),
        ...(updates.isDefault !== undefined && { isDefault: updates.isDefault }),
        ...(updates.targetActivityTypes && { targetActivityTypes: updates.targetActivityTypes }),
        ...(updates.targetAgeRange !== undefined && {
          targetAgeRange: updates.targetAgeRange as unknown as object,
        }),
        ...(updates.targetGradeBands && { targetGradeBands: updates.targetGradeBands }),
      },
    });
  }

  /**
   * Delete a custom routine.
   */
  async deleteRoutine(routineId: string): Promise<boolean> {
    const result = await this.db.transitionRoutine.deleteMany({
      where: { id: routineId, isSystemRoutine: false },
    });
    return result.count > 0;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ANALYTICS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get transition analytics for a learner.
   */
  async getTransitionAnalytics(
    tenantId: string,
    learnerId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<TransitionAnalytics> {
    const { startDate, endDate, limit } = options;

    // Default to last 30 days if no dates provided
    const effectiveStartDate = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const effectiveEndDate = endDate ?? new Date();

    const events = await this.db.transitionEvent.findMany({
      where: {
        learnerId,
        tenantId,
        createdAt: {
          gte: effectiveStartDate,
          lte: effectiveEndDate,
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = events.length;
    const days = Math.ceil(
      (effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (total === 0) {
      return {
        totalTransitions: 0,
        smoothTransitions: 0,
        smoothRate: 0,
        usedRoutineRate: 0,
        struggledRate: 0,
        averageDurationSeconds: 0,
        byActivityType: {},
        recommendations: [],
        periodDays: days,
      };
    }

    const smooth = events.filter((e) => e.outcome === 'SMOOTH').length;
    const usedRoutine = events.filter((e) => e.usedRoutine).length;
    const struggled = events.filter((e) => e.outcome === 'STRUGGLED').length;

    const totalDuration = events.reduce((sum, e) => sum + (e.totalTransitionSeconds ?? 0), 0);
    const avgDuration = totalDuration / total;

    // Group by activity type
    const byActivityType: Record<string, { total: number; smooth: number }> = {};
    for (const event of events) {
      const key = `${event.fromActivityType ?? 'start'}_to_${event.toActivityType}`;
      byActivityType[key] ??= { total: 0, smooth: 0 };
      byActivityType[key].total++;
      if (event.outcome === 'SMOOTH') {
        byActivityType[key].smooth++;
      }
    }

    const recommendations = this.generateRecommendations(events, byActivityType);

    return {
      totalTransitions: total,
      smoothTransitions: smooth,
      smoothRate: (smooth / total) * 100,
      usedRoutineRate: (usedRoutine / total) * 100,
      struggledRate: (struggled / total) * 100,
      averageDurationSeconds: avgDuration,
      byActivityType,
      recommendations,
      periodDays: days,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ────────────────────────────────────────────────────────────────────────────

  private async createDefaultPreferences(
    learnerId: string,
    tenantId: string,
    profile?: LearnerTransitionProfile
  ): Promise<TransitionPreferencesWithRoutine> {
    // Start with standard defaults
    const defaults: {
      warningIntervals: number[];
      minimumTransitionTime: number;
      enableVisualWarnings: boolean;
      enableAudioWarnings: boolean;
      enableHapticWarnings: boolean;
      visualWarningStyle: VisualWarningStyle;
      colorScheme: TransitionColorScheme;
      showProgressBar: boolean;
      audioWarningType: AudioWarningType;
      audioVolume: number;
      useSpokenWarnings: boolean;
      showFirstThenBoard: boolean;
      requireAcknowledgment: boolean;
    } = {
      warningIntervals: [60, 30, 10],
      minimumTransitionTime: 30,
      enableVisualWarnings: true,
      enableAudioWarnings: true,
      enableHapticWarnings: true,
      visualWarningStyle: 'COUNTDOWN_CIRCLE',
      colorScheme: 'TRAFFIC_LIGHT',
      showProgressBar: true,
      audioWarningType: 'GENTLE_CHIME',
      audioVolume: 0.7,
      useSpokenWarnings: false,
      showFirstThenBoard: true,
      requireAcknowledgment: false,
    };

    // Adjust based on learner profile
    if (profile) {
      // Sensory sensitivity adjustments
      if (profile.sensoryProfile?.noiseSensitivity === 'HIGH' || profile.avoidLoudSounds) {
        defaults.audioWarningType = 'VIBRATION_ONLY';
        defaults.audioVolume = 0.3;
      }

      // Predictability needs
      if (profile.requiresPredictableFlow) {
        defaults.requireAcknowledgment = true;
        defaults.minimumTransitionTime = 45;
        defaults.warningIntervals = [90, 60, 30, 10];
        defaults.showFirstThenBoard = true;
      }

      // Timer sensitivity
      if (profile.avoidTimers) {
        defaults.visualWarningStyle = 'CHARACTER_ANIMATION';
        defaults.showProgressBar = false;
      }

      // Flash sensitivity
      if (profile.avoidFlashingContent) {
        defaults.colorScheme = 'MONOCHROME';
      }

      // Light sensitivity
      if (profile.sensoryProfile?.lightSensitivity === 'HIGH') {
        defaults.colorScheme = 'MONOCHROME';
      }
    }

    return this.db.transitionPreferences.create({
      data: {
        learnerId,
        tenantId,
        ...defaults,
      },
      include: { routine: true },
    });
  }

  private buildWarnings(
    preferences: TransitionPreferences,
    totalDuration: number
  ): TransitionWarning[] {
    const warnings: TransitionWarning[] = [];
    const intervals = preferences.warningIntervals.filter(
      (interval: number) => interval < totalDuration
    );

    for (const seconds of intervals) {
      const intensity = this.getWarningIntensity(seconds);
      this.addWarningsForInterval(warnings, preferences, seconds, intensity);
    }

    return warnings.sort((a, b) => b.secondsBefore - a.secondsBefore);
  }

  /**
   * Add all configured warnings for a specific time interval.
   */
  private addWarningsForInterval(
    warnings: TransitionWarning[],
    preferences: TransitionPreferences,
    seconds: number,
    intensity: WarningIntensity
  ): void {
    if (preferences.enableVisualWarnings) {
      warnings.push({ secondsBefore: seconds, type: 'visual', intensity });
    }

    if (preferences.enableAudioWarnings) {
      this.addAudioWarning(warnings, preferences, seconds, intensity);
    }

    if (preferences.enableHapticWarnings) {
      warnings.push({ secondsBefore: seconds, type: 'haptic', intensity });
    }
  }

  /**
   * Add audio warning with appropriate type and message.
   */
  private addAudioWarning(
    warnings: TransitionWarning[],
    preferences: TransitionPreferences,
    seconds: number,
    intensity: WarningIntensity
  ): void {
    warnings.push({
      secondsBefore: seconds,
      type: preferences.useSpokenWarnings ? 'spoken' : 'audio',
      message: preferences.useSpokenWarnings ? this.getSpokenWarningMessage(seconds) : undefined,
      intensity,
    });
  }

  /**
   * Determine warning intensity based on seconds remaining.
   */
  private getWarningIntensity(seconds: number): WarningIntensity {
    if (seconds > 30) {
      return 'low';
    }
    if (seconds > 10) {
      return 'medium';
    }
    return 'high';
  }

  private getSpokenWarningMessage(seconds: number): string {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} until we move on`;
    }
    if (seconds === 30) {
      return 'Thirty seconds left, start wrapping up';
    }
    if (seconds === 10) {
      return 'Almost time to switch, ten seconds';
    }
    if (seconds <= 5) {
      return `${seconds}`;
    }
    return `${seconds} seconds`;
  }

  private buildVisualSettings(preferences: TransitionPreferences): VisualSettings {
    const customColors = preferences.customColors as VisualSettings['colors'] | null;
    const colors =
      preferences.colorScheme === 'CUSTOM' && customColors
        ? {
            warning: customColors.warning,
            caution: customColors.caution,
            ready: customColors.ready,
            background: customColors.background || '#f8fafc',
          }
        : (COLOR_SCHEMES[preferences.colorScheme] ?? COLOR_SCHEMES.TRAFFIC_LIGHT);

    return {
      style: preferences.visualWarningStyle as VisualWarningStyle,
      colorScheme: preferences.colorScheme as TransitionColorScheme,
      colors,
      showProgressBar: preferences.showProgressBar,
      animationSpeed: 'normal',
    };
  }

  private buildAudioSettings(preferences: TransitionPreferences): AudioSettings {
    return {
      enabled: preferences.enableAudioWarnings,
      type: preferences.audioWarningType as AudioWarningType,
      volume: preferences.audioVolume,
      useSpokenWarnings: preferences.useSpokenWarnings,
      spokenVoice: 'en-US-friendly',
    };
  }

  private async logTransitionStart(data: TransitionEventData): Promise<void> {
    await this.db.transitionEvent.create({
      data: {
        sessionId: data.sessionId,
        learnerId: data.learnerId,
        tenantId: data.tenantId,
        fromActivityId: data.fromActivity?.id,
        fromActivityType: data.fromActivity?.type,
        toActivityId: data.toActivity.id,
        toActivityType: data.toActivity.type,
        warningStartedAt: new Date(),
        outcome: 'SMOOTH', // Default, will be updated on completion
        focusStateBeforeTransition: data.focusState,
        moodBeforeTransition: data.mood,
        plannedDurationSeconds: data.plannedDuration,
      },
    });
  }

  private extractSessionId(transitionId: string): string {
    const parts = transitionId.split('_');
    return parts[1] ?? transitionId;
  }

  private formatActivityType(type: string): string {
    return type.replaceAll('_', ' ').toLowerCase();
  }

  private generateRecommendations(
    events: { outcome: string; usedRoutine: boolean }[],
    byActivityType: Record<string, { total: number; smooth: number }>
  ): string[] {
    const recommendations: string[] = [];

    // Find problematic transitions
    for (const [type, stats] of Object.entries(byActivityType)) {
      const successRate = (stats.smooth / stats.total) * 100;
      if (successRate < 70 && stats.total >= 3) {
        const [from, to] = type.split('_to_');
        recommendations.push(
          `Consider adding extra transition time when moving from ${from} to ${to} activities`
        );
      }
    }

    // Check if routines help
    const withRoutine = events.filter((e) => e.usedRoutine);
    const withoutRoutine = events.filter((e) => !e.usedRoutine);

    if (withRoutine.length >= 5 && withoutRoutine.length >= 5) {
      const routineSuccessRate =
        withRoutine.filter((e) => e.outcome === 'SMOOTH').length / withRoutine.length;
      const noRoutineSuccessRate =
        withoutRoutine.filter((e) => e.outcome === 'SMOOTH').length / withoutRoutine.length;

      if (routineSuccessRate > noRoutineSuccessRate + 0.2) {
        recommendations.push(
          'Transition routines are helping - consider using them more consistently'
        );
      }
    }

    // Check overall struggle rate
    const overallStruggleRate =
      events.filter((e) => e.outcome === 'STRUGGLED').length / events.length;
    if (overallStruggleRate > 0.3) {
      recommendations.push(
        'High struggle rate detected - consider longer warning intervals or enabling acknowledgment requirement'
      );
    }

    return recommendations;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const transitionService = new TransitionService();
