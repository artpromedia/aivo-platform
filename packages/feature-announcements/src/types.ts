// ─── Feature Announcement Types ───────────────────────────────────────

export interface FeatureAnnouncement {
  /** Unique key for this feature (e.g. 'lesson-builder-v2', 'ai-grading') */
  key: string;
  /** Short title shown in the tooltip */
  title: string;
  /** Description of the feature */
  description: string;
  /** Optional badge text (e.g. 'NEW', 'BETA', 'IMPROVED') */
  badge?: string;
  /** Optional link to learn more */
  learnMoreUrl?: string;
  /** Optional link label */
  learnMoreLabel?: string;
  /** Position of the tooltip relative to the target element */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Whether to show a pulsing dot indicator on the target */
  showPulse?: boolean;
}

export type { FeatureAnnouncement as default };
