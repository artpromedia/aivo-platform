'use client';

import { useEffect, useState } from 'react';

import type { GradeBand, RegulationActivity, SelfReportedMood } from '../../lib/focus/focus-api';
import { FocusProvider, type FocusSessionConfig } from '../../lib/focus/focus-context';
import { useFocusMonitoring } from '../../lib/focus/use-focus-monitoring';

import { FocusBreakBanner } from './FocusBreakBanner';
import { FocusBreakModal } from './FocusBreakModal';
import { FocusStatusIndicator } from './FocusStatusIndicator';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface FocusMonitorProps {
  /** Current learning session ID */
  sessionId: string;
  /** Learner's unique ID */
  learnerId: string;
  /** Current activity being worked on */
  activityId: string;
  /** Learner's grade band for age-appropriate messaging */
  gradeBand: GradeBand;
  /** Whether to show the status indicator */
  showStatusIndicator?: boolean;
  /** Whether to auto-start monitoring */
  autoStart?: boolean;
  /** Callback when break is started */
  onBreakStarted?: (activity: RegulationActivity) => void;
  /** Callback when break is completed */
  onBreakCompleted?: (completedFully: boolean, helpfulnessRating?: number) => void;
  /** Children to render */
  children?: React.ReactNode;
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERNAL MONITOR COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

interface FocusMonitorInternalProps {
  config: FocusSessionConfig;
  showStatusIndicator: boolean;
  autoStart: boolean;
  onBreakStarted?: (activity: RegulationActivity) => void;
  onBreakCompleted?: (completedFully: boolean, helpfulnessRating?: number) => void;
  children?: React.ReactNode;
}

function FocusMonitorInternal({
  config,
  showStatusIndicator,
  autoStart,
  onBreakStarted,
  onBreakCompleted,
  children,
}: FocusMonitorInternalProps) {
  const {
    isMonitoring,
    requiresBreak,
    pendingActivity,
    isOnBreak,
    currentBreakActivity,
    breakStartTime,
    currentMood,
    suggestedIntervention,
    startMonitoring,
    stopMonitoring,
    startBreak,
    completeBreak,
    dismissBreak,
    reportMood,
  } = useFocusMonitoring();

  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Auto-start monitoring if enabled
  useEffect(() => {
    if (autoStart && !isMonitoring) {
      startMonitoring();
    }

    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [autoStart, isMonitoring, startMonitoring, stopMonitoring]);

  // Show banner when break is recommended
  useEffect(() => {
    if (requiresBreak && pendingActivity && !isOnBreak) {
      setShowBanner(true);
    }
  }, [requiresBreak, pendingActivity, isOnBreak]);

  // Handle starting a break
  const handleStartBreak = async (activity: RegulationActivity) => {
    await startBreak(activity);
    setShowBanner(false);
    setShowBreakModal(true);
    onBreakStarted?.(activity);
  };

  // Handle completing a break
  const handleCompleteBreak = async (completedFully: boolean, helpfulnessRating?: number) => {
    await completeBreak(completedFully, helpfulnessRating);
    setShowBreakModal(false);
    onBreakCompleted?.(completedFully, helpfulnessRating);
  };

  // Handle dismissing the banner
  const handleDismissBanner = () => {
    dismissBreak();
    setShowBanner(false);
  };

  // Handle mood selection
  const handleMoodChange = (mood: SelfReportedMood) => {
    reportMood(mood);
  };

  return (
    <>
      {/* Status indicator */}
      {showStatusIndicator && (
        <FocusStatusIndicator
          isMonitoring={isMonitoring}
          currentMood={currentMood}
          suggestedIntervention={suggestedIntervention}
          onMoodChange={handleMoodChange}
          onRequestBreak={() => {
            if (pendingActivity) {
              setShowBreakModal(true);
            }
          }}
        />
      )}

      {/* Break recommendation banner */}
      {showBanner && pendingActivity && !isOnBreak && (
        <FocusBreakBanner
          activity={pendingActivity}
          gradeBand={config.gradeBand}
          onStartBreak={() => handleStartBreak(pendingActivity)}
          onDismiss={handleDismissBanner}
        />
      )}

      {/* Break activity modal */}
      {showBreakModal && isOnBreak && currentBreakActivity && breakStartTime && (
        <FocusBreakModal
          activity={currentBreakActivity}
          gradeBand={config.gradeBand}
          startTime={breakStartTime}
          onComplete={handleCompleteBreak}
        />
      )}

      {/* Children (the wrapped content) */}
      {children}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Main focus monitoring component.
 * Wraps content and provides focus monitoring functionality.
 *
 * @example
 * ```tsx
 * <FocusMonitor
 *   sessionId={session.id}
 *   learnerId={learner.id}
 *   activityId={activity.id}
 *   gradeBand="G6_8"
 *   showStatusIndicator
 *   autoStart
 * >
 *   <LearningContent />
 * </FocusMonitor>
 * ```
 */
export function FocusMonitor({
  sessionId,
  learnerId,
  activityId,
  gradeBand,
  showStatusIndicator = true,
  autoStart = true,
  onBreakStarted,
  onBreakCompleted,
  children,
}: FocusMonitorProps) {
  const config: FocusSessionConfig = {
    sessionId,
    learnerId,
    activityId,
    gradeBand,
  };

  return (
    <FocusProvider initialConfig={config}>
      <FocusMonitorInternal
        config={config}
        showStatusIndicator={showStatusIndicator}
        autoStart={autoStart}
        onBreakStarted={onBreakStarted}
        onBreakCompleted={onBreakCompleted}
      >
        {children}
      </FocusMonitorInternal>
    </FocusProvider>
  );
}
