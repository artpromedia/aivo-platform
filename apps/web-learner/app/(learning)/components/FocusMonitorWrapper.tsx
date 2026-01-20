'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { FocusMonitor } from '../../../components/focus/FocusMonitor';
import type { GradeBand, RegulationActivity } from '../../../lib/focus/focus-api';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface FocusMonitorWrapperProps {
  /** Learner's unique ID */
  learnerId: string;
  /** Optional session ID (will be generated if not provided) */
  sessionId?: string;
  /** Current activity/page identifier */
  activityId: string;
  /** Learner's grade band for age-appropriate messaging */
  gradeBand?: GradeBand;
  /** Whether to enable focus monitoring (default: true) */
  enabled?: boolean;
  /** Whether to show the status indicator (default: true) */
  showStatusIndicator?: boolean;
  /** Callback when break is started */
  onBreakStarted?: (activity: RegulationActivity) => void;
  /** Callback when break is completed */
  onBreakCompleted?: (completedFully: boolean, helpfulnessRating?: number) => void;
  /** Children to render */
  children: ReactNode;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a session ID for this learning session.
 * Uses a combination of learner ID and timestamp for uniqueness.
 */
function generateSessionId(learnerId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `session_${learnerId.substring(0, 8)}_${timestamp}_${random}`;
}

/**
 * Determine grade band from learner profile or default to G6_8.
 * In a real implementation, this would come from the learner's profile.
 */
function getDefaultGradeBand(): GradeBand {
  // Default to middle school band if not specified
  return 'G6_8';
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Wrapper component that adds focus monitoring to learning pages.
 * Integrates with the session context and provides age-appropriate break recommendations.
 *
 * Use this wrapper in learning layouts to automatically monitor learner focus
 * and provide gentle break recommendations when needed.
 *
 * @example
 * ```tsx
 * // In a learning page layout
 * export default function LearningLayout({ children }) {
 *   const session = useSession();
 *   const { pathname } = usePathname();
 *
 *   return (
 *     <FocusMonitorWrapper
 *       learnerId={session.userId}
 *       activityId={pathname}
 *       gradeBand="G6_8"
 *     >
 *       {children}
 *     </FocusMonitorWrapper>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // In a specific learning activity
 * <FocusMonitorWrapper
 *   learnerId={learner.id}
 *   sessionId={existingSession.id}
 *   activityId="math-lesson-42"
 *   gradeBand={learner.gradeBand}
 *   onBreakStarted={(activity) => {
 *     pauseLessonProgress();
 *     trackEvent('break_started', { activity: activity.activityType });
 *   }}
 *   onBreakCompleted={(completedFully, rating) => {
 *     resumeLessonProgress();
 *     trackEvent('break_completed', { completedFully, rating });
 *   }}
 * >
 *   <MathLesson lessonId={42} />
 * </FocusMonitorWrapper>
 * ```
 */
export function FocusMonitorWrapper({
  learnerId,
  sessionId: providedSessionId,
  activityId,
  gradeBand,
  enabled = true,
  showStatusIndicator = true,
  onBreakStarted,
  onBreakCompleted,
  children,
}: FocusMonitorWrapperProps) {
  // Generate or use provided session ID
  const [sessionId] = useState(() => providedSessionId || generateSessionId(learnerId));

  // Use provided grade band or get default
  const resolvedGradeBand = gradeBand || getDefaultGradeBand();

  // Track if component is mounted to avoid SSR issues
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // If disabled or not mounted, just render children
  if (!enabled || !isMounted) {
    return <>{children}</>;
  }

  return (
    <FocusMonitor
      sessionId={sessionId}
      learnerId={learnerId}
      activityId={activityId}
      gradeBand={resolvedGradeBand}
      showStatusIndicator={showStatusIndicator}
      autoStart
      onBreakStarted={onBreakStarted}
      onBreakCompleted={onBreakCompleted}
    >
      {children}
    </FocusMonitor>
  );
}
