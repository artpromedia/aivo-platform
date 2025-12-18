/**
 * Schedule Service - ND-1.3
 *
 * Provides comprehensive schedule management for neurodiverse learners.
 * Handles schedule creation, updates, progress tracking, and preference management.
 */

import type { PrismaClient, ScheduleType, ScheduleDisplayStyle } from '@prisma/client';
import type {
  ScheduleItem,
  ScheduleSubItem,
  CreateScheduleInput,
  UpdateScheduleInput,
  ScheduleWithProgress,
  ScheduleProgress,
  CreateTemplateInput,
  UpdateTemplateInput,
  UpdatePreferencesInput,
  SessionActivity,
  ScheduleTemplateItem,
} from './schedule.types';
import {
  ACTIVITY_BREAKDOWNS,
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_COLORS,
} from './schedule.types';

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE INTERFACE
// ══════════════════════════════════════════════════════════════════════════════

export interface ScheduleServiceDeps {
  prisma: PrismaClient;
  publishEvent?: (topic: string, data: unknown) => Promise<void>;
  callService?: (
    service: string,
    path: string,
    options: { method: string }
  ) => Promise<unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class ScheduleService {
  private prisma: PrismaClient;
  private publishEvent?: (topic: string, data: unknown) => Promise<void>;
  private callService?: (
    service: string,
    path: string,
    options: { method: string }
  ) => Promise<unknown>;

  constructor(deps: ScheduleServiceDeps) {
    this.prisma = deps.prisma;
    this.publishEvent = deps.publishEvent;
    this.callService = deps.callService;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCHEDULE CRUD OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new visual schedule
   */
  async createSchedule(input: CreateScheduleInput) {
    const items: ScheduleItem[] = input.items.map((item, index) => ({
      ...item,
      id: `item_${Date.now()}_${index}`,
      status: index === 0 ? 'current' : 'upcoming',
    }));

    const schedule = await this.prisma.visualSchedule.create({
      data: {
        learnerId: input.learnerId,
        tenantId: input.tenantId,
        date: input.date,
        type: input.type ?? 'DAILY',
        items: items as unknown as object,
        displayStyle: input.displayStyle ?? 'VERTICAL_LIST',
        showTimes: input.showTimes ?? true,
        showDuration: input.showDuration ?? true,
        showImages: input.showImages ?? true,
        useSymbols: input.useSymbols ?? false,
        generatedBy: input.generatedBy ?? 'system',
        currentItemIndex: 0,
        completedCount: 0,
      },
    });

    if (this.publishEvent) {
      await this.publishEvent('schedule.created', {
        scheduleId: schedule.id,
        learnerId: input.learnerId,
        tenantId: input.tenantId,
        date: input.date.toISOString(),
      });
    }

    return schedule;
  }

  /**
   * Get schedule for today (or generate from template if none exists)
   */
  async getScheduleForToday(
    learnerId: string,
    tenantId: string,
    type: ScheduleType = 'DAILY'
  ): Promise<ScheduleWithProgress | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let schedule = await this.prisma.visualSchedule.findUnique({
      where: {
        learnerId_date_type: {
          learnerId,
          date: today,
          type,
        },
      },
    });

    // If no schedule exists, try to generate one from template
    if (!schedule) {
      schedule = await this.generateScheduleFromTemplate(learnerId, tenantId, today, type);
    }

    if (!schedule) {
      return null;
    }

    return this.buildScheduleWithProgress(schedule);
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(
    scheduleId: string,
    learnerId: string
  ): Promise<ScheduleWithProgress | null> {
    const schedule = await this.prisma.visualSchedule.findFirst({
      where: { id: scheduleId, learnerId },
    });

    if (!schedule) {
      return null;
    }

    return this.buildScheduleWithProgress(schedule);
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    scheduleId: string,
    input: UpdateScheduleInput
  ): Promise<ScheduleWithProgress> {
    const schedule = await this.prisma.visualSchedule.update({
      where: { id: scheduleId },
      data: {
        items: input.items ? (input.items as unknown as object) : undefined,
        displayStyle: input.displayStyle,
        showTimes: input.showTimes,
        showDuration: input.showDuration,
        showImages: input.showImages,
        useSymbols: input.useSymbols,
        currentItemIndex: input.currentItemIndex,
        completedCount: input.completedCount,
      },
    });

    return this.buildScheduleWithProgress(schedule);
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string, learnerId: string): Promise<void> {
    await this.prisma.visualSchedule.deleteMany({
      where: { id: scheduleId, learnerId },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ITEM STATUS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Update the status of a specific schedule item
   */
  async updateItemStatus(
    scheduleId: string,
    itemId: string,
    status: ScheduleItem['status'],
    actualDuration?: number
  ): Promise<ScheduleWithProgress> {
    const schedule = await this.prisma.visualSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const items = schedule.items as unknown as ScheduleItem[];
    const itemIndex = items.findIndex((item) => item.id === itemId);

    if (itemIndex === -1) {
      throw new Error('Item not found');
    }

    // Update the item
    items[itemIndex] = {
      ...items[itemIndex],
      status,
      ...(actualDuration !== undefined && { actualDuration }),
      ...(status === 'completed' && { completedAt: new Date().toISOString() }),
    };

    // If completed or skipped, move to next item
    let newCurrentIndex = schedule.currentItemIndex;
    let completedCount = schedule.completedCount;

    if (status === 'completed' || status === 'skipped') {
      completedCount++;

      // Find next upcoming item
      const nextIndex = items.findIndex(
        (item, idx) => idx > itemIndex && item.status === 'upcoming'
      );

      if (nextIndex !== -1) {
        items[nextIndex].status = 'current';
        newCurrentIndex = nextIndex;
      }
    }

    const updatedSchedule = await this.prisma.visualSchedule.update({
      where: { id: scheduleId },
      data: {
        items: items as unknown as object,
        currentItemIndex: newCurrentIndex,
        completedCount,
      },
    });

    if (this.publishEvent) {
      await this.publishEvent('schedule.item.updated', {
        scheduleId,
        itemId,
        status,
        learnerId: schedule.learnerId,
        tenantId: schedule.tenantId,
      });
    }

    return this.buildScheduleWithProgress(updatedSchedule);
  }

  /**
   * Mark the current item as complete and move to next
   */
  async markCurrentAsComplete(scheduleId: string): Promise<ScheduleWithProgress> {
    const schedule = await this.prisma.visualSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const items = schedule.items as unknown as ScheduleItem[];
    const currentItem = items[schedule.currentItemIndex];

    if (!currentItem) {
      throw new Error('No current item');
    }

    return this.updateItemStatus(scheduleId, currentItem.id, 'completed');
  }

  /**
   * Skip the current item and move to next
   */
  async skipCurrentItem(scheduleId: string): Promise<ScheduleWithProgress> {
    const schedule = await this.prisma.visualSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const items = schedule.items as unknown as ScheduleItem[];
    const currentItem = items[schedule.currentItemIndex];

    if (!currentItem) {
      throw new Error('No current item');
    }

    return this.updateItemStatus(scheduleId, currentItem.id, 'skipped');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ITEM MANIPULATION
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Add a new item to a schedule
   */
  async addItem(
    scheduleId: string,
    item: Omit<ScheduleItem, 'id' | 'status'>,
    afterItemId?: string
  ): Promise<ScheduleWithProgress> {
    const schedule = await this.prisma.visualSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const items = schedule.items as unknown as ScheduleItem[];
    const newItem: ScheduleItem = {
      ...item,
      id: `item_${Date.now()}`,
      status: 'upcoming',
    };

    if (afterItemId) {
      const insertIndex = items.findIndex((i) => i.id === afterItemId) + 1;
      items.splice(insertIndex, 0, newItem);
    } else {
      items.push(newItem);
    }

    const updatedSchedule = await this.prisma.visualSchedule.update({
      where: { id: scheduleId },
      data: { items: items as unknown as object },
    });

    return this.buildScheduleWithProgress(updatedSchedule);
  }

  /**
   * Remove an item from a schedule
   */
  async removeItem(scheduleId: string, itemId: string): Promise<ScheduleWithProgress> {
    const schedule = await this.prisma.visualSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const items = (schedule.items as unknown as ScheduleItem[]).filter(
      (item) => item.id !== itemId
    );

    const updatedSchedule = await this.prisma.visualSchedule.update({
      where: { id: scheduleId },
      data: { items: items as unknown as object },
    });

    return this.buildScheduleWithProgress(updatedSchedule);
  }

  /**
   * Reorder items in a schedule
   */
  async reorderItems(
    scheduleId: string,
    itemOrders: { itemId: string; newIndex: number }[]
  ): Promise<ScheduleWithProgress> {
    const schedule = await this.prisma.visualSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const items = schedule.items as unknown as ScheduleItem[];
    const reorderedItems: ScheduleItem[] = new Array(items.length);

    // Place items at new positions
    for (const { itemId, newIndex } of itemOrders) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        reorderedItems[newIndex] = item;
      }
    }

    // Fill in any gaps with remaining items
    let fillIndex = 0;
    for (const item of items) {
      if (!itemOrders.find((o) => o.itemId === item.id)) {
        while (reorderedItems[fillIndex]) fillIndex++;
        reorderedItems[fillIndex] = item;
      }
    }

    const updatedSchedule = await this.prisma.visualSchedule.update({
      where: { id: scheduleId },
      data: { items: reorderedItems.filter(Boolean) as unknown as object },
    });

    return this.buildScheduleWithProgress(updatedSchedule);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SESSION SCHEDULE GENERATION
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a schedule for a learning session based on activities
   */
  async createSessionSchedule(
    sessionId: string,
    learnerId: string,
    tenantId: string,
    activities: SessionActivity[]
  ) {
    const items: Omit<ScheduleItem, 'id' | 'status'>[] = [];
    let currentTime = new Date();

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      // Add the activity
      items.push({
        title: activity.title,
        type: 'activity',
        scheduledTime: this.formatTime(currentTime),
        estimatedDuration: activity.estimatedMinutes,
        activityId: activity.id,
        activityType: activity.type,
        icon: this.getIconForActivityType(activity.type),
        color: this.getColorForActivityType(activity.type),
        image: activity.thumbnail,
        isFlexible: false,
      });

      currentTime = new Date(currentTime.getTime() + activity.estimatedMinutes * 60 * 1000);

      // Add transition between activities (except after last)
      if (i < activities.length - 1) {
        items.push({
          title: 'Get Ready',
          type: 'transition',
          estimatedDuration: 1,
          icon: 'transition',
          color: '#9E9E9E',
          isFlexible: true,
        });
        currentTime = new Date(currentTime.getTime() + 1 * 60 * 1000);
      }
    }

    // Add completion reward at the end
    items.push({
      title: 'All Done! 🎉',
      type: 'reward',
      estimatedDuration: 2,
      icon: 'celebration',
      color: '#FFD700',
      isFlexible: false,
    });

    return this.createSchedule({
      learnerId,
      tenantId,
      date: new Date(),
      type: 'SESSION',
      items,
      displayStyle: 'HORIZONTAL_STRIP',
      generatedBy: 'system',
    });
  }

  /**
   * Get activity breakdown as mini-schedule
   */
  getActivityBreakdown(activityType: string): ScheduleSubItem[] {
    return (
      ACTIVITY_BREAKDOWNS[activityType.toLowerCase()] ??
      ACTIVITY_BREAKDOWNS['lesson'] ??
      []
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PREFERENCES MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get or create preferences for a learner
   */
  async getOrCreatePreferences(learnerId: string, tenantId: string) {
    let preferences = await this.prisma.schedulePreferences.findUnique({
      where: { learnerId },
    });

    if (!preferences) {
      // Get learner profile for smart defaults
      const profile = await this.getLearnerProfile(learnerId, tenantId);
      preferences = await this.createDefaultPreferences(learnerId, tenantId, profile);
    }

    return preferences;
  }

  /**
   * Update learner preferences
   */
  async updatePreferences(learnerId: string, updates: UpdatePreferencesInput) {
    return this.prisma.schedulePreferences.update({
      where: { learnerId },
      data: updates,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TEMPLATE MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a schedule template
   */
  async createTemplate(input: CreateTemplateInput) {
    return this.prisma.scheduleTemplate.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        description: input.description ?? null,
        items: input.items as unknown as object,
        targetAgeMin: input.targetAgeMin ?? null,
        targetAgeMax: input.targetAgeMax ?? null,
        dayOfWeek: input.dayOfWeek ?? [],
        displayStyle: input.displayStyle ?? 'VERTICAL_LIST',
        showTimes: input.showTimes ?? true,
        isDefault: input.isDefault ?? false,
        createdBy: input.createdBy,
      },
    });
  }

  /**
   * Update a template
   */
  async updateTemplate(templateId: string, input: UpdateTemplateInput) {
    return this.prisma.scheduleTemplate.update({
      where: { id: templateId },
      data: {
        name: input.name,
        description: input.description,
        items: input.items ? (input.items as unknown as object) : undefined,
        targetAgeMin: input.targetAgeMin,
        targetAgeMax: input.targetAgeMax,
        dayOfWeek: input.dayOfWeek,
        displayStyle: input.displayStyle,
        showTimes: input.showTimes,
        isDefault: input.isDefault,
      },
    });
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, tenantId: string): Promise<void> {
    await this.prisma.scheduleTemplate.deleteMany({
      where: { id: templateId, tenantId },
    });
  }

  /**
   * List templates for a tenant
   */
  async listTemplates(tenantId: string) {
    return this.prisma.scheduleTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  private async generateScheduleFromTemplate(
    learnerId: string,
    tenantId: string,
    date: Date,
    type: ScheduleType
  ) {
    const dayOfWeek = date.getDay();

    // Find applicable template
    const template = await this.prisma.scheduleTemplate.findFirst({
      where: {
        tenantId,
        OR: [{ dayOfWeek: { has: dayOfWeek } }, { dayOfWeek: { isEmpty: true } }],
        isDefault: true,
      },
    });

    if (!template) {
      return null;
    }

    const templateItems = template.items as unknown as ScheduleTemplateItem[];
    const items: Omit<ScheduleItem, 'id' | 'status'>[] = templateItems.map((item) => ({
      title: item.title,
      type: item.type,
      scheduledTime: item.relativeTime
        ? this.calculateAbsoluteTime(date, item.relativeTime)
        : undefined,
      estimatedDuration: item.estimatedDuration,
      activityType: item.activityType,
      icon: item.icon,
      color: item.color,
      image: item.image,
      symbolUrl: item.symbolUrl,
      isFlexible: item.isFlexible,
      notes: item.notes,
    }));

    return this.createSchedule({
      learnerId,
      tenantId,
      date,
      type,
      items,
      displayStyle: template.displayStyle,
      showTimes: template.showTimes,
      generatedBy: 'template',
    });
  }

  private buildScheduleWithProgress(schedule: {
    id: string;
    currentItemIndex: number;
    completedCount: number;
    items: unknown;
    [key: string]: unknown;
  }): ScheduleWithProgress {
    const items = schedule.items as unknown as ScheduleItem[];
    const currentItem = items[schedule.currentItemIndex] ?? null;
    const nextItem =
      items.find(
        (item, idx) => idx > schedule.currentItemIndex && item.status === 'upcoming'
      ) ?? null;

    const completedItems = items.filter(
      (item) => item.status === 'completed' || item.status === 'skipped'
    );

    // Calculate time until next item
    let timeUntilNext: number | undefined;
    if (currentItem?.estimatedDuration) {
      // This is a simplification - would need actual start time tracking
      timeUntilNext = currentItem.estimatedDuration;
    }

    const progress: ScheduleProgress = {
      completed: completedItems.length,
      total: items.filter((i) => i.type !== 'transition').length,
      percentComplete:
        items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0,
    };

    return {
      schedule: schedule as unknown as import('./schedule.types').VisualSchedule,
      items,
      currentItem,
      nextItem,
      progress,
      timeUntilNext,
    };
  }

  private async createDefaultPreferences(
    learnerId: string,
    tenantId: string,
    profile: LearnerProfile | null
  ) {
    const defaults: {
      learnerId: string;
      tenantId: string;
      preferredStyle: ScheduleDisplayStyle;
      showTimes: boolean;
      showDuration: boolean;
      showImages: boolean;
      useSymbols: boolean;
      showCountdownToNext: boolean;
      warnBeforeTransition: boolean;
      transitionWarningMinutes: number;
      iconSize: string;
      colorCoding: boolean;
      highContrast: boolean;
      announceItems: boolean;
      playChimeOnChange: boolean;
      celebrateCompletion: boolean;
      showProgressBar: boolean;
    } = {
      learnerId,
      tenantId,
      preferredStyle: 'VERTICAL_LIST',
      showTimes: true,
      showDuration: true,
      showImages: true,
      useSymbols: false,
      showCountdownToNext: true,
      warnBeforeTransition: true,
      transitionWarningMinutes: 2,
      iconSize: 'medium',
      colorCoding: true,
      highContrast: false,
      announceItems: false,
      playChimeOnChange: true,
      celebrateCompletion: true,
      showProgressBar: true,
    };

    // Adjust based on learner profile
    if (profile) {
      // AAC users might prefer symbols
      if (profile.communicationPreferences?.usesAAC) {
        defaults.useSymbols = true;
        defaults.iconSize = 'large';
      }

      // Visual sensitivity adjustments
      if (profile.sensoryProfile?.lightSensitivity === 'high') {
        defaults.highContrast = false; // Softer colors
        defaults.colorCoding = false;
      }

      // Autism profile - more structure
      if (profile.neurodiversityProfile?.primaryDiagnosis === 'autism') {
        defaults.showTimes = true;
        defaults.warnBeforeTransition = true;
        defaults.transitionWarningMinutes = 5;
      }

      // Younger children - simpler view
      if (profile.age !== undefined && profile.age < 6) {
        defaults.preferredStyle = 'NOW_NEXT_LATER';
        defaults.showTimes = false;
        defaults.iconSize = 'large';
      }
    }

    return this.prisma.schedulePreferences.create({
      data: defaults,
    });
  }

  private async getLearnerProfile(
    learnerId: string,
    _tenantId: string
  ): Promise<LearnerProfile | null> {
    if (!this.callService) {
      return null;
    }

    try {
      return (await this.callService('learner-profile-svc', `/profiles/${learnerId}`, {
        method: 'GET',
      })) as LearnerProfile;
    } catch {
      return null;
    }
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  private calculateAbsoluteTime(baseDate: Date, relativeMinutes: number): string {
    const time = new Date(baseDate);
    time.setHours(9, 0, 0, 0); // Assume 9 AM start
    time.setMinutes(time.getMinutes() + relativeMinutes);
    return this.formatTime(time);
  }

  private getIconForActivityType(type: string): string {
    return ACTIVITY_TYPE_ICONS[type.toLowerCase()] ?? 'school';
  }

  private getColorForActivityType(type: string): string {
    return ACTIVITY_TYPE_COLORS[type.toLowerCase()] ?? '#757575';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LearnerProfile {
  age?: number;
  communicationPreferences?: {
    usesAAC?: boolean;
  };
  sensoryProfile?: {
    lightSensitivity?: 'low' | 'medium' | 'high';
  };
  neurodiversityProfile?: {
    primaryDiagnosis?: string;
  };
}
