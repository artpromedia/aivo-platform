/**
 * Predictability Service - ND-2.2
 *
 * Core service for predictability enforcement in learning sessions.
 * Manages session planning, routine execution, and change handling
 * for learners who require predictable flow.
 */

import type { PrismaClient } from '@prisma/client';

import type {
  PredictabilityPreferences,
  PredictabilityPreferencesInput,
  PredictableSessionPlan,
  SessionActivityInput,
  SessionOutlineItem,
  SessionRoutineData,
  UnexpectedChangeRequest,
  ChangeRequestResult,
  ChangeExplanation,
  AnxietyReportResult,
  PredictabilityEventType,
  PredictabilityEventDetails,
  RoutineType,
  CharacterInfo,
  PredictabilityLevel,
  UnexpectedChangeType,
} from './predictability.types.js';
import { getSystemDefaultRoutine } from './routine-manager.js';

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class PredictabilityService {
  constructor(private readonly prisma: PrismaClient) {}

  // ════════════════════════════════════════════════════════════════════════════
  // PREFERENCES MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Check if learner requires predictable sessions
   */
  async requiresPredictability(learnerId: string, _tenantId: string): Promise<boolean> {
    const prefs = await this.getPreferences(learnerId, _tenantId);
    return prefs?.requiresPredictableFlow ?? false;
  }

  /**
   * Get predictability preferences for a learner
   */
  async getPreferences(
    learnerId: string,
    _tenantId: string
  ): Promise<PredictabilityPreferences | null> {
    const prefs = await this.prisma.predictabilityPreferences.findUnique({
      where: { learnerId },
    });

    if (prefs) {
      return this.mapPreferencesFromPrisma(prefs);
    }

    // Check if learner has requiresPredictableFlow flag in their profile
    // For now, return null if no preferences exist
    return null;
  }

  /**
   * Create or update predictability preferences
   */
  async upsertPreferences(
    input: PredictabilityPreferencesInput
  ): Promise<PredictabilityPreferences> {
    const data = {
      tenantId: input.tenantId,
      requiresPredictableFlow: input.requiresPredictableFlow ?? false,
      predictabilityLevel: input.predictabilityLevel ?? 'moderate',
      alwaysShowSessionOutline: input.alwaysShowSessionOutline ?? true,
      showEstimatedDurations: input.showEstimatedDurations ?? true,
      showProgressIndicator: input.showProgressIndicator ?? true,
      announceActivityChanges: input.announceActivityChanges ?? true,
      preferConsistentOrder: input.preferConsistentOrder ?? true,
      preferFamiliarContent: input.preferFamiliarContent ?? false,
      preferSameTimeOfDay: input.preferSameTimeOfDay ?? false,
      typicalSessionTime: input.typicalSessionTime,
      transitionWarningMinutes: input.transitionWarningMinutes ?? 2,
      requireTransitionAcknowledgment: input.requireTransitionAcknowledgment ?? true,
      showFirstThenBoard: input.showFirstThenBoard ?? true,
      allowSurpriseRewards: input.allowSurpriseRewards ?? false,
      allowDynamicContent: input.allowDynamicContent ?? false,
      warnBeforeNewContent: input.warnBeforeNewContent ?? true,
      maxUnexpectedChanges: input.maxUnexpectedChanges ?? 1,
      requireChangeExplanation: input.requireChangeExplanation ?? true,
      includeWelcomeRoutine: input.includeWelcomeRoutine ?? true,
      includeCheckInRoutine: input.includeCheckInRoutine ?? true,
      includeGoodbyeRoutine: input.includeGoodbyeRoutine ?? true,
      includeBreakRoutines: input.includeBreakRoutines ?? true,
      showFamiliarCharacter: input.showFamiliarCharacter ?? true,
      characterName: input.characterName,
      characterAvatarUrl: input.characterAvatarUrl,
    };

    const prefs = await this.prisma.predictabilityPreferences.upsert({
      where: { learnerId: input.learnerId },
      create: {
        learnerId: input.learnerId,
        ...data,
      },
      update: data,
    });

    return this.mapPreferencesFromPrisma(prefs);
  }

  /**
   * Create default preferences based on profile
   */
  async createDefaultPreferences(
    learnerId: string,
    tenantId: string,
    options?: {
      primaryDiagnosis?: string;
      anxietyLevel?: string;
    }
  ): Promise<PredictabilityPreferences> {
    let predictabilityLevel: PredictabilityLevel = 'moderate';
    let maxUnexpectedChanges = 1;
    let allowSurpriseRewards = false;
    let transitionWarningMinutes = 2;

    // Adjust based on profile
    if (options?.primaryDiagnosis === 'autism') {
      predictabilityLevel = 'high';
      maxUnexpectedChanges = 0;
    }

    if (options?.anxietyLevel === 'high') {
      allowSurpriseRewards = false;
      transitionWarningMinutes = 3;
    }

    return this.upsertPreferences({
      learnerId,
      tenantId,
      requiresPredictableFlow: true,
      predictabilityLevel,
      maxUnexpectedChanges,
      allowSurpriseRewards,
      transitionWarningMinutes,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SESSION PLAN MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a predictable session plan
   */
  async createPredictableSessionPlan(
    sessionId: string,
    learnerId: string,
    tenantId: string,
    activities: SessionActivityInput[]
  ): Promise<PredictableSessionPlan> {
    const preferences = await this.getPreferences(learnerId, tenantId);

    if (!preferences) {
      throw new Error('Predictability preferences not found. Create preferences first.');
    }

    // Get routines
    const welcomeRoutine = preferences.includeWelcomeRoutine
      ? await this.getRoutine('WELCOME', tenantId)
      : undefined;

    const checkInRoutine = preferences.includeCheckInRoutine
      ? await this.getRoutine('CHECKIN', tenantId)
      : undefined;

    const transitionRoutine = (await this.getRoutine('TRANSITION', tenantId)) ?? undefined;

    const breakRoutine = preferences.includeBreakRoutines
      ? ((await this.getRoutine('BREAK', tenantId)) ?? undefined)
      : undefined;

    const goodbyeRoutine = preferences.includeGoodbyeRoutine
      ? ((await this.getRoutine('GOODBYE', tenantId)) ?? undefined)
      : undefined;

    // Build outline
    const outline = this.buildSessionOutline(
      activities,
      {
        welcomeRoutine: welcomeRoutine ?? undefined,
        checkInRoutine: checkInRoutine ?? undefined,
        breakRoutine,
        goodbyeRoutine,
      }
    );

    // Calculate total time
    const estimatedTotalMinutes = outline.reduce(
      (sum, item) => sum + item.estimatedMinutes,
      0
    );

    // Get character if enabled
    let character: CharacterInfo | undefined;
    if (preferences.showFamiliarCharacter) {
      character = {
        name: preferences.characterName || 'Buddy',
        avatarUrl: preferences.characterAvatarUrl || '/assets/characters/buddy-default.png',
      };
    }

    const plan: PredictableSessionPlan = {
      sessionId,
      learnerId,
      tenantId,
      outline,
      welcomeRoutine: welcomeRoutine ?? undefined,
      checkInRoutine: checkInRoutine ?? undefined,
      transitionRoutine,
      breakRoutine,
      goodbyeRoutine,
      preferences,
      estimatedTotalMinutes,
      character,
      currentPhase: 'welcome',
      currentActivityIndex: -1,
      unexpectedChangesCount: 0,
    };

    // Persist the plan
    await this.prisma.sessionPlan.create({
      data: {
        sessionId,
        learnerId,
        tenantId,
        planData: plan as unknown as Record<string, unknown>,
        currentPhase: 'welcome',
        currentActivityIndex: -1,
        unexpectedChangesCount: 0,
        estimatedTotalMinutes,
      },
    });

    // Log session start
    await this.logEvent(sessionId, learnerId, tenantId, 'SESSION_START', {
      outlineItemCount: outline.length,
      estimatedMinutes: estimatedTotalMinutes,
      predictabilityLevel: preferences.predictabilityLevel,
    });

    return plan;
  }

  /**
   * Get current session plan
   */
  async getSessionPlan(sessionId: string): Promise<PredictableSessionPlan | null> {
    const record = await this.prisma.sessionPlan.findUnique({
      where: { sessionId },
    });

    if (!record) {
      return null;
    }

    const plan = record.planData as unknown as PredictableSessionPlan;
    plan.currentPhase = record.currentPhase as PredictableSessionPlan['currentPhase'];
    plan.currentActivityIndex = record.currentActivityIndex;
    plan.unexpectedChangesCount = record.unexpectedChangesCount;
    plan.startedAt = record.startedAt ?? undefined;
    plan.completedAt = record.completedAt ?? undefined;

    return plan;
  }

  /**
   * Update session progress
   */
  async updateProgress(
    sessionId: string,
    currentItemId: string
  ): Promise<PredictableSessionPlan> {
    const plan = await this.getSessionPlan(sessionId);
    if (!plan) {
      throw new Error('Session plan not found');
    }

    // Update outline statuses
    let foundCurrent = false;
    for (const item of plan.outline) {
      if (item.id === currentItemId) {
        item.status = 'current';
        foundCurrent = true;

        // Update phase
        if (item.id === 'welcome') plan.currentPhase = 'welcome';
        else if (item.id === 'checkin') plan.currentPhase = 'checkin';
        else if (item.id === 'goodbye') plan.currentPhase = 'goodbye';
        else if (item.type === 'break') plan.currentPhase = 'break';
        else plan.currentPhase = 'main';

        // Update activity index
        if (item.type === 'activity') {
          plan.currentActivityIndex = plan.outline
            .filter((i) => i.type === 'activity')
            .findIndex((i) => i.id === currentItemId);
        }
      } else if (!foundCurrent) {
        item.status = 'completed';
      } else {
        item.status = 'upcoming';
      }
    }

    // Persist updates
    await this.prisma.sessionPlan.update({
      where: { sessionId },
      data: {
        planData: plan as unknown as Record<string, unknown>,
        currentPhase: plan.currentPhase,
        currentActivityIndex: plan.currentActivityIndex,
      },
    });

    return plan;
  }

  /**
   * Mark session as started
   */
  async markSessionStarted(sessionId: string): Promise<void> {
    await this.prisma.sessionPlan.update({
      where: { sessionId },
      data: { startedAt: new Date() },
    });
  }

  /**
   * Mark session as completed
   */
  async markSessionCompleted(sessionId: string, learnerId: string, tenantId: string): Promise<void> {
    await this.prisma.sessionPlan.update({
      where: { sessionId },
      data: { completedAt: new Date() },
    });

    await this.logEvent(sessionId, learnerId, tenantId, 'SESSION_END', {});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHANGE MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Request an unexpected change to the session
   */
  async requestUnexpectedChange(
    request: UnexpectedChangeRequest,
    learnerId: string,
    tenantId: string
  ): Promise<ChangeRequestResult> {
    const plan = await this.getSessionPlan(request.sessionId);
    if (!plan) {
      throw new Error('Session plan not found');
    }

    const prefs = plan.preferences;

    // Check if changes are allowed at all
    if (prefs.predictabilityLevel === 'strict') {
      await this.logEvent(request.sessionId, learnerId, tenantId, 'UNEXPECTED_CHANGE', {
        changeType: request.changeType,
        allowed: false,
        reason: 'Strict predictability mode',
      });

      return {
        allowed: false,
        reason: 'This session follows a strict schedule. Changes are not allowed.',
      };
    }

    // Check unexpected change count
    if (plan.unexpectedChangesCount >= prefs.maxUnexpectedChanges) {
      await this.logEvent(request.sessionId, learnerId, tenantId, 'UNEXPECTED_CHANGE', {
        changeType: request.changeType,
        allowed: false,
        reason: 'Max unexpected changes reached',
      });

      return {
        allowed: false,
        reason: `We've already had ${plan.unexpectedChangesCount} changes. Let's finish what's planned.`,
      };
    }

    // Changes are allowed - generate explanation if required
    let explanation: ChangeExplanation | undefined;

    if (prefs.requireChangeExplanation) {
      explanation = this.generateChangeExplanation(request, plan);
    }

    // Increment change count
    plan.unexpectedChangesCount++;
    await this.prisma.sessionPlan.update({
      where: { sessionId: request.sessionId },
      data: {
        unexpectedChangesCount: plan.unexpectedChangesCount,
        planData: plan as unknown as Record<string, unknown>,
      },
    });

    await this.logEvent(request.sessionId, learnerId, tenantId, 'UNEXPECTED_CHANGE', {
      changeType: request.changeType,
      allowed: true,
      changeCount: plan.unexpectedChangesCount,
    });

    return {
      allowed: true,
      explanation,
    };
  }

  /**
   * Apply an unexpected change to the session
   */
  async applyChange(
    sessionId: string,
    changeType: UnexpectedChangeType,
    changes: Record<string, unknown>,
    learnerId: string,
    tenantId: string
  ): Promise<PredictableSessionPlan> {
    const plan = await this.getSessionPlan(sessionId);
    if (!plan) {
      throw new Error('Session plan not found');
    }

    switch (changeType) {
      case 'add_activity': {
        const newItem: SessionOutlineItem = {
          id: `activity_${changes.activityId as string}`,
          title: changes.title as string,
          type: 'activity',
          estimatedMinutes: changes.estimatedMinutes as number,
          status: 'upcoming',
          icon: this.getActivityIcon(changes.activityType as string),
          color: this.getActivityColor(changes.activityType as string),
          isNew: true,
        };

        // Insert at specified position or end
        const afterItemId = changes.afterItemId as string | undefined;
        const insertIndex = afterItemId
          ? plan.outline.findIndex((i) => i.id === afterItemId) + 1
          : plan.outline.length - 1; // Before goodbye

        plan.outline.splice(insertIndex, 0, newItem);
        break;
      }

      case 'remove_activity':
        plan.outline = plan.outline.filter((i) => i.id !== (changes.itemId as string));
        break;

      case 'extend_time': {
        const item = plan.outline.find((i) => i.id === (changes.itemId as string));
        if (item) {
          item.estimatedMinutes += changes.additionalMinutes as number;
        }
        break;
      }
    }

    // Recalculate total time
    plan.estimatedTotalMinutes = plan.outline.reduce(
      (sum, item) => sum + item.estimatedMinutes,
      0
    );

    // Persist changes
    await this.prisma.sessionPlan.update({
      where: { sessionId },
      data: {
        planData: plan as unknown as Record<string, unknown>,
        estimatedTotalMinutes: plan.estimatedTotalMinutes,
      },
    });

    await this.logEvent(sessionId, learnerId, tenantId, 'CHANGE_EXPLAINED', {
      changeType,
    });

    return plan;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTINES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get routine by type
   */
  async getRoutine(type: RoutineType, tenantId: string): Promise<SessionRoutineData | null> {
    const routine = await this.prisma.sessionRoutine.findFirst({
      where: {
        tenantId,
        type,
        isDefault: true,
      },
    });

    if (!routine) {
      return getSystemDefaultRoutine(type);
    }

    return {
      id: routine.id,
      name: routine.name,
      type: routine.type as RoutineType,
      steps: routine.steps as SessionRoutineData['steps'],
      totalDurationSeconds: routine.totalDurationSeconds,
    };
  }

  /**
   * Create a custom routine
   */
  async createRoutine(input: {
    tenantId: string;
    name: string;
    type: RoutineType;
    description?: string;
    steps: SessionRoutineData['steps'];
    isDefault?: boolean;
    targetAgeMin?: number;
    targetAgeMax?: number;
  }): Promise<SessionRoutineData> {
    const totalDurationSeconds = input.steps.reduce(
      (sum, step) => sum + step.durationSeconds,
      0
    );

    const routine = await this.prisma.sessionRoutine.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        type: input.type,
        description: input.description,
        steps: input.steps,
        totalDurationSeconds,
        isDefault: input.isDefault ?? false,
        targetAgeMin: input.targetAgeMin,
        targetAgeMax: input.targetAgeMax,
        isCustomizable: true,
      },
    });

    return {
      id: routine.id,
      name: routine.name,
      type: routine.type as RoutineType,
      steps: routine.steps as SessionRoutineData['steps'],
      totalDurationSeconds: routine.totalDurationSeconds,
    };
  }

  /**
   * List routines for a tenant
   */
  async listRoutines(
    tenantId: string,
    options?: { type?: RoutineType }
  ): Promise<SessionRoutineData[]> {
    const routines = await this.prisma.sessionRoutine.findMany({
      where: {
        tenantId,
        ...(options?.type && { type: options.type }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return routines.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type as RoutineType,
      steps: r.steps as SessionRoutineData['steps'],
      totalDurationSeconds: r.totalDurationSeconds,
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ANXIETY/CALMING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Report learner anxiety
   */
  async reportAnxiety(
    sessionId: string,
    learnerId: string,
    tenantId: string,
    trigger?: string
  ): Promise<AnxietyReportResult> {
    await this.logEvent(sessionId, learnerId, tenantId, 'LEARNER_ANXIOUS', {
      trigger,
    });

    const recommendations: string[] = [
      'Take a deep breath',
      "Remember, you're doing great",
      "It's okay to take a break",
    ];

    // Get calming routine
    const calmingRoutine = await this.getRoutine('CALMING', tenantId);

    // Determine if we should pause
    const plan = await this.getSessionPlan(sessionId);
    const shouldPause = (plan?.unexpectedChangesCount ?? 0) > 0;

    if (shouldPause) {
      recommendations.unshift("Let's pause and take a calming break");
    }

    return {
      recommendations,
      shouldPause,
      calmingRoutine: calmingRoutine ?? undefined,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LOGGING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Log a predictability event
   */
  async logEvent(
    sessionId: string,
    learnerId: string,
    tenantId: string,
    eventType: PredictabilityEventType,
    details: PredictabilityEventDetails
  ): Promise<void> {
    const plan = await this.getSessionPlan(sessionId);

    await this.prisma.sessionPredictabilityLog.create({
      data: {
        sessionId,
        learnerId,
        tenantId,
        eventType,
        details: details as unknown as Record<string, unknown>,
        predictabilityMaintained:
          eventType !== 'UNEXPECTED_CHANGE' || details.allowed === false,
        unexpectedChangeCount: plan?.unexpectedChangesCount ?? 0,
      },
    });
  }

  /**
   * Get predictability logs for a session
   */
  async getSessionLogs(sessionId: string): Promise<unknown[]> {
    return this.prisma.sessionPredictabilityLog.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  private buildSessionOutline(
    activities: SessionActivityInput[],
    routines: {
      welcomeRoutine?: SessionRoutineData;
      checkInRoutine?: SessionRoutineData;
      breakRoutine?: SessionRoutineData;
      goodbyeRoutine?: SessionRoutineData;
    }
  ): SessionOutlineItem[] {
    const outline: SessionOutlineItem[] = [];

    // Add welcome
    if (routines.welcomeRoutine) {
      outline.push({
        id: 'welcome',
        title: 'Welcome',
        type: 'routine',
        estimatedMinutes: Math.ceil(routines.welcomeRoutine.totalDurationSeconds / 60),
        status: 'upcoming',
        icon: 'waving_hand',
        color: '#4CAF50',
      });
    }

    // Add check-in
    if (routines.checkInRoutine) {
      outline.push({
        id: 'checkin',
        title: 'How are you feeling?',
        type: 'routine',
        estimatedMinutes: Math.ceil(routines.checkInRoutine.totalDurationSeconds / 60),
        status: 'upcoming',
        icon: 'mood',
        color: '#2196F3',
      });
    }

    // Add activities with breaks
    const breakAfterActivities = 2;
    let activityCount = 0;

    for (const activity of activities) {
      outline.push({
        id: `activity_${activity.id}`,
        title: activity.title,
        type: 'activity',
        estimatedMinutes: activity.estimatedMinutes,
        status: 'upcoming',
        icon: this.getActivityIcon(activity.type),
        color: this.getActivityColor(activity.type),
        isNew: activity.isNew,
        description: activity.isNew ? 'New content!' : undefined,
      });

      activityCount++;

      // Add break after every N activities (except last)
      if (
        routines.breakRoutine &&
        activityCount % breakAfterActivities === 0 &&
        activityCount < activities.length
      ) {
        outline.push({
          id: `break_${activityCount}`,
          title: 'Quick Break',
          type: 'break',
          estimatedMinutes: Math.ceil(routines.breakRoutine.totalDurationSeconds / 60),
          status: 'upcoming',
          icon: 'self_improvement',
          color: '#8BC34A',
        });
      }
    }

    // Add goodbye
    if (routines.goodbyeRoutine) {
      outline.push({
        id: 'goodbye',
        title: 'All Done!',
        type: 'routine',
        estimatedMinutes: Math.ceil(routines.goodbyeRoutine.totalDurationSeconds / 60),
        status: 'upcoming',
        icon: 'celebration',
        color: '#FFD700',
      });
    }

    return outline;
  }

  private generateChangeExplanation(
    request: UnexpectedChangeRequest,
    plan: PredictableSessionPlan
  ): ChangeExplanation {
    const remainingItems = plan.outline.filter((i) => i.status === 'upcoming');

    let whatWillHappen = '';
    let whatStaysSame = '';

    switch (request.changeType) {
      case 'add_activity':
        whatWillHappen =
          `We're adding one more activity: "${request.details.title}". ` +
          `It will take about ${request.details.estimatedMinutes} minutes.`;
        whatStaysSame =
          `Everything else stays the same! You still have: ` +
          remainingItems
            .slice(0, 3)
            .map((i) => i.title)
            .join(', ');
        break;

      case 'remove_activity':
        whatWillHappen = `We're skipping "${request.details.title}" today.`;
        whatStaysSame =
          `You'll still do: ` +
          remainingItems
            .filter((i) => i.id !== request.details.itemId)
            .slice(0, 3)
            .map((i) => i.title)
            .join(', ');
        break;

      case 'extend_time':
        whatWillHappen =
          `We're adding ${request.details.additionalMinutes} more minutes ` +
          `to finish the current activity.`;
        whatStaysSame = `After this, we'll continue with the plan.`;
        break;

      default:
        whatWillHappen = `There's a small change to our plan.`;
        whatStaysSame = `Most of our activities stay the same!`;
    }

    return {
      changeType: request.changeType,
      reason: request.reason,
      whatWillHappen,
      whatStaysSame,
      visualAid: this.getChangeVisualAid(request.changeType),
    };
  }

  private getChangeVisualAid(changeType: string): string {
    const visuals: Record<string, string> = {
      add_activity: '/assets/visuals/change-add.png',
      remove_activity: '/assets/visuals/change-remove.png',
      extend_time: '/assets/visuals/change-time.png',
    };
    return visuals[changeType] || '/assets/visuals/change-general.png';
  }

  private getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      lesson: 'menu_book',
      video: 'play_circle',
      quiz: 'quiz',
      practice: 'edit',
      game: 'games',
    };
    return icons[type.toLowerCase()] || 'school';
  }

  private getActivityColor(type: string): string {
    const colors: Record<string, string> = {
      lesson: '#4CAF50',
      video: '#2196F3',
      quiz: '#FF9800',
      practice: '#9C27B0',
      game: '#E91E63',
    };
    return colors[type.toLowerCase()] || '#757575';
  }

  private mapPreferencesFromPrisma(prefs: {
    id: string;
    learnerId: string;
    tenantId: string;
    requiresPredictableFlow: boolean;
    predictabilityLevel: string;
    alwaysShowSessionOutline: boolean;
    showEstimatedDurations: boolean;
    showProgressIndicator: boolean;
    announceActivityChanges: boolean;
    preferConsistentOrder: boolean;
    preferFamiliarContent: boolean;
    preferSameTimeOfDay: boolean;
    typicalSessionTime: string | null;
    transitionWarningMinutes: number;
    requireTransitionAcknowledgment: boolean;
    showFirstThenBoard: boolean;
    allowSurpriseRewards: boolean;
    allowDynamicContent: boolean;
    warnBeforeNewContent: boolean;
    maxUnexpectedChanges: number;
    requireChangeExplanation: boolean;
    includeWelcomeRoutine: boolean;
    includeCheckInRoutine: boolean;
    includeGoodbyeRoutine: boolean;
    includeBreakRoutines: boolean;
    showFamiliarCharacter: boolean;
    characterName: string | null;
    characterAvatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PredictabilityPreferences {
    return {
      id: prefs.id,
      learnerId: prefs.learnerId,
      tenantId: prefs.tenantId,
      requiresPredictableFlow: prefs.requiresPredictableFlow,
      predictabilityLevel: prefs.predictabilityLevel as PredictabilityLevel,
      alwaysShowSessionOutline: prefs.alwaysShowSessionOutline,
      showEstimatedDurations: prefs.showEstimatedDurations,
      showProgressIndicator: prefs.showProgressIndicator,
      announceActivityChanges: prefs.announceActivityChanges,
      preferConsistentOrder: prefs.preferConsistentOrder,
      preferFamiliarContent: prefs.preferFamiliarContent,
      preferSameTimeOfDay: prefs.preferSameTimeOfDay,
      typicalSessionTime: prefs.typicalSessionTime ?? undefined,
      transitionWarningMinutes: prefs.transitionWarningMinutes,
      requireTransitionAcknowledgment: prefs.requireTransitionAcknowledgment,
      showFirstThenBoard: prefs.showFirstThenBoard,
      allowSurpriseRewards: prefs.allowSurpriseRewards,
      allowDynamicContent: prefs.allowDynamicContent,
      warnBeforeNewContent: prefs.warnBeforeNewContent,
      maxUnexpectedChanges: prefs.maxUnexpectedChanges,
      requireChangeExplanation: prefs.requireChangeExplanation,
      includeWelcomeRoutine: prefs.includeWelcomeRoutine,
      includeCheckInRoutine: prefs.includeCheckInRoutine,
      includeGoodbyeRoutine: prefs.includeGoodbyeRoutine,
      includeBreakRoutines: prefs.includeBreakRoutines,
      showFamiliarCharacter: prefs.showFamiliarCharacter,
      characterName: prefs.characterName ?? undefined,
      characterAvatarUrl: prefs.characterAvatarUrl ?? undefined,
      createdAt: prefs.createdAt,
      updatedAt: prefs.updatedAt,
    };
  }
}
