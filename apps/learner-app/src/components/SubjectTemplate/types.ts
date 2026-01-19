import type { ReactNode } from 'react';

export interface SubjectTemplateProps {
  /** Subject name displayed in header */
  subject: string;
  /** Grade level (e.g., "K-5", "Middle School", "High School") */
  gradeLevel: string;
  /** Icon to display (emoji or React node) */
  icon: ReactNode;
  /** Page content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export interface FocusMonitorProps {
  /** Whether focus mode is active */
  isActive: boolean;
  /** Callback when focus mode is toggled */
  onToggle: () => void;
  /** Focus session duration in minutes */
  duration?: number;
  /** Callback when focus session completes */
  onComplete?: () => void;
}

export interface ProgressDashboardProps {
  /** Current subject name */
  subject: string;
  /** Daily goal configuration */
  dailyGoal?: {
    current: number;
    target: number;
    label: string;
  };
  /** Current streak in days */
  streak?: number;
  /** XP earned today */
  xpToday?: number;
  /** Total XP */
  totalXp?: number;
}

export interface DailyGoal {
  id: string;
  title: string;
  current: number;
  target: number;
  emoji: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earnedAt?: string;
  progress?: number;
}
