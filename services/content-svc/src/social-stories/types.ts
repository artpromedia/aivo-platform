/**
 * Social Stories Types - STUB
 *
 * Original file backed up to ../social-stories.bak/
 */

export type SocialStoryCategory = string;
export type SocialStoryReadingLevel = string;
export type SocialStoryVisualStyle = string;
export type StoryTriggerType = string;

export interface ScheduledTime {
  dayOfWeek?: number;
  timeOfDay: string;
  timezone?: string;
}
