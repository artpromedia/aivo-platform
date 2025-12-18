/**
 * Schedule Builder - ND-1.3
 *
 * Fluent builder API for constructing visual schedules.
 * Makes it easy to programmatically create schedules with proper defaults.
 */

import type { ScheduleItem, ScheduleItemType, ScheduleTemplateItem } from './schedule.types';
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_COLORS } from './schedule.types';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE ITEM BUILDER
// ══════════════════════════════════════════════════════════════════════════════

export class ScheduleItemBuilder {
  private item: Partial<Omit<ScheduleItem, 'id' | 'status'>> = {};

  /**
   * Set the item title
   */
  title(title: string): this {
    this.item.title = title;
    return this;
  }

  /**
   * Set the item type
   */
  type(type: ScheduleItemType): this {
    this.item.type = type;
    // Apply default icon and color based on type
    if (!this.item.icon) {
      this.item.icon = ACTIVITY_TYPE_ICONS[type] ?? 'circle';
    }
    if (!this.item.color) {
      this.item.color = ACTIVITY_TYPE_COLORS[type] ?? '#757575';
    }
    return this;
  }

  /**
   * Set the scheduled time (HH:mm format)
   */
  at(time: string): this {
    this.item.scheduledTime = time;
    return this;
  }

  /**
   * Set the estimated duration in minutes
   */
  duration(minutes: number): this {
    this.item.estimatedDuration = minutes;
    return this;
  }

  /**
   * Link to an activity
   */
  activity(id: string, type?: string): this {
    this.item.activityId = id;
    if (type) {
      this.item.activityType = type;
      // Apply activity-type specific defaults
      if (!this.item.icon) {
        this.item.icon = ACTIVITY_TYPE_ICONS[type.toLowerCase()] ?? 'school';
      }
      if (!this.item.color) {
        this.item.color = ACTIVITY_TYPE_COLORS[type.toLowerCase()] ?? '#757575';
      }
    }
    return this;
  }

  /**
   * Set the icon
   */
  icon(icon: string): this {
    this.item.icon = icon;
    return this;
  }

  /**
   * Set the color
   */
  color(color: string): this {
    this.item.color = color;
    return this;
  }

  /**
   * Set the image URL
   */
  image(url: string): this {
    this.item.image = url;
    return this;
  }

  /**
   * Set the AAC symbol URL
   */
  symbol(url: string): this {
    this.item.symbolUrl = url;
    return this;
  }

  /**
   * Mark as flexible (can be skipped/rearranged)
   */
  flexible(isFlexible = true): this {
    this.item.isFlexible = isFlexible;
    return this;
  }

  /**
   * Add notes for the learner
   */
  notes(notes: string): this {
    this.item.notes = notes;
    return this;
  }

  /**
   * Build the item
   */
  build(): Omit<ScheduleItem, 'id' | 'status'> {
    if (!this.item.title) {
      throw new Error('Item title is required');
    }
    if (!this.item.type) {
      throw new Error('Item type is required');
    }
    if (this.item.estimatedDuration === undefined) {
      throw new Error('Item duration is required');
    }

    return {
      title: this.item.title,
      type: this.item.type,
      scheduledTime: this.item.scheduledTime,
      estimatedDuration: this.item.estimatedDuration,
      activityId: this.item.activityId,
      activityType: this.item.activityType,
      icon: this.item.icon ?? 'circle',
      color: this.item.color ?? '#757575',
      image: this.item.image,
      symbolUrl: this.item.symbolUrl,
      isFlexible: this.item.isFlexible ?? false,
      notes: this.item.notes,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE BUILDER
// ══════════════════════════════════════════════════════════════════════════════

export class ScheduleBuilder {
  private items: Omit<ScheduleItem, 'id' | 'status'>[] = [];
  private currentTime: Date;

  constructor(startTime?: Date) {
    this.currentTime = startTime ?? new Date();
  }

  /**
   * Add an activity item
   */
  addActivity(
    title: string,
    durationMinutes: number,
    options?: {
      activityId?: string;
      activityType?: string;
      icon?: string;
      color?: string;
      image?: string;
      notes?: string;
    }
  ): this {
    const type = options?.activityType?.toLowerCase() ?? 'lesson';

    this.items.push({
      title,
      type: 'activity',
      scheduledTime: this.formatTime(this.currentTime),
      estimatedDuration: durationMinutes,
      activityId: options?.activityId,
      activityType: options?.activityType,
      icon: options?.icon ?? ACTIVITY_TYPE_ICONS[type] ?? 'school',
      color: options?.color ?? ACTIVITY_TYPE_COLORS[type] ?? '#4CAF50',
      image: options?.image,
      isFlexible: false,
      notes: options?.notes,
    });

    this.advanceTime(durationMinutes);
    return this;
  }

  /**
   * Add a break
   */
  addBreak(title = 'Break', durationMinutes = 5): this {
    this.items.push({
      title,
      type: 'break',
      scheduledTime: this.formatTime(this.currentTime),
      estimatedDuration: durationMinutes,
      icon: 'coffee',
      color: '#8BC34A',
      isFlexible: true,
    });

    this.advanceTime(durationMinutes);
    return this;
  }

  /**
   * Add a transition
   */
  addTransition(title = 'Get Ready', durationMinutes = 1): this {
    this.items.push({
      title,
      type: 'transition',
      estimatedDuration: durationMinutes,
      icon: 'swap_horiz',
      color: '#9E9E9E',
      isFlexible: true,
    });

    this.advanceTime(durationMinutes);
    return this;
  }

  /**
   * Add a meal
   */
  addMeal(title: string, durationMinutes = 30): this {
    this.items.push({
      title,
      type: 'meal',
      scheduledTime: this.formatTime(this.currentTime),
      estimatedDuration: durationMinutes,
      icon: 'restaurant',
      color: '#795548',
      isFlexible: false,
    });

    this.advanceTime(durationMinutes);
    return this;
  }

  /**
   * Add a reward/celebration
   */
  addReward(title = 'All Done! 🎉', durationMinutes = 2): this {
    this.items.push({
      title,
      type: 'reward',
      estimatedDuration: durationMinutes,
      icon: 'celebration',
      color: '#FFD700',
      isFlexible: false,
    });

    this.advanceTime(durationMinutes);
    return this;
  }

  /**
   * Add a custom item
   */
  addCustom(item: Omit<ScheduleItem, 'id' | 'status'>): this {
    this.items.push(item);
    this.advanceTime(item.estimatedDuration);
    return this;
  }

  /**
   * Add item using builder
   */
  addItem(builderFn: (builder: ScheduleItemBuilder) => ScheduleItemBuilder): this {
    const builder = new ScheduleItemBuilder();
    const item = builderFn(builder).build();
    this.items.push({
      ...item,
      scheduledTime: item.scheduledTime ?? this.formatTime(this.currentTime),
    });
    this.advanceTime(item.estimatedDuration);
    return this;
  }

  /**
   * Build the schedule items
   */
  build(): Omit<ScheduleItem, 'id' | 'status'>[] {
    return [...this.items];
  }

  private advanceTime(minutes: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + minutes * 60 * 1000);
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE BUILDER
// ══════════════════════════════════════════════════════════════════════════════

export class ScheduleTemplateBuilder {
  private items: ScheduleTemplateItem[] = [];
  private currentRelativeMinutes = 0;

  /**
   * Add an activity item
   */
  addActivity(
    title: string,
    durationMinutes: number,
    options?: {
      activityType?: string;
      icon?: string;
      color?: string;
      image?: string;
      notes?: string;
    }
  ): this {
    const type = options?.activityType?.toLowerCase() ?? 'lesson';

    this.items.push({
      title,
      type: 'activity',
      relativeTime: this.currentRelativeMinutes,
      estimatedDuration: durationMinutes,
      activityType: options?.activityType,
      icon: options?.icon ?? ACTIVITY_TYPE_ICONS[type] ?? 'school',
      color: options?.color ?? ACTIVITY_TYPE_COLORS[type] ?? '#4CAF50',
      image: options?.image,
      isFlexible: false,
      notes: options?.notes,
    });

    this.currentRelativeMinutes += durationMinutes;
    return this;
  }

  /**
   * Add a break
   */
  addBreak(title = 'Break', durationMinutes = 5): this {
    this.items.push({
      title,
      type: 'break',
      relativeTime: this.currentRelativeMinutes,
      estimatedDuration: durationMinutes,
      icon: 'coffee',
      color: '#8BC34A',
      isFlexible: true,
    });

    this.currentRelativeMinutes += durationMinutes;
    return this;
  }

  /**
   * Add a transition
   */
  addTransition(title = 'Get Ready', durationMinutes = 1): this {
    this.items.push({
      title,
      type: 'transition',
      relativeTime: this.currentRelativeMinutes,
      estimatedDuration: durationMinutes,
      icon: 'swap_horiz',
      color: '#9E9E9E',
      isFlexible: true,
    });

    this.currentRelativeMinutes += durationMinutes;
    return this;
  }

  /**
   * Add a meal
   */
  addMeal(title: string, durationMinutes = 30): this {
    this.items.push({
      title,
      type: 'meal',
      relativeTime: this.currentRelativeMinutes,
      estimatedDuration: durationMinutes,
      icon: 'restaurant',
      color: '#795548',
      isFlexible: false,
    });

    this.currentRelativeMinutes += durationMinutes;
    return this;
  }

  /**
   * Add a reward/celebration
   */
  addReward(title = 'All Done! 🎉', durationMinutes = 2): this {
    this.items.push({
      title,
      type: 'reward',
      relativeTime: this.currentRelativeMinutes,
      estimatedDuration: durationMinutes,
      icon: 'celebration',
      color: '#FFD700',
      isFlexible: false,
    });

    this.currentRelativeMinutes += durationMinutes;
    return this;
  }

  /**
   * Build the template items
   */
  build(): ScheduleTemplateItem[] {
    return [...this.items];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new schedule builder
 */
export function schedule(startTime?: Date): ScheduleBuilder {
  return new ScheduleBuilder(startTime);
}

/**
 * Create a new template builder
 */
export function template(): ScheduleTemplateBuilder {
  return new ScheduleTemplateBuilder();
}

/**
 * Create a new item builder
 */
export function item(): ScheduleItemBuilder {
  return new ScheduleItemBuilder();
}
