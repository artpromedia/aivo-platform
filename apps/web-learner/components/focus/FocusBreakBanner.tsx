'use client';

import { useState } from 'react';

import type { GradeBand, RegulationActivity } from '../../lib/focus/focus-api';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface FocusBreakBannerProps {
  /** The recommended break activity */
  activity: RegulationActivity;
  /** Learner's grade band for age-appropriate messaging */
  gradeBand: GradeBand;
  /** Callback when user starts the break */
  onStartBreak: () => void;
  /** Callback when user dismisses the banner */
  onDismiss: () => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGING
// ══════════════════════════════════════════════════════════════════════════════

interface GradeBandMessaging {
  title: string;
  subtitle: string;
  startButtonText: string;
  dismissButtonText: string;
  encouragement: string;
}

const GRADE_BAND_MESSAGING: Record<GradeBand, GradeBandMessaging> = {
  K5: {
    title: 'Time for a Brain Break!',
    subtitle: "Let's take a quick break to help you feel ready to learn more!",
    startButtonText: "Let's Do It!",
    dismissButtonText: 'Maybe Later',
    encouragement: "You're doing great! A little break helps your brain stay strong.",
  },
  G6_8: {
    title: 'Quick Break Suggestion',
    subtitle: 'Taking a short break can help you refocus and learn better.',
    startButtonText: 'Start Break',
    dismissButtonText: 'Not Now',
    encouragement: 'Even short breaks can boost your focus and memory.',
  },
  G9_12: {
    title: 'Focus Break Recommended',
    subtitle: 'Research shows that strategic breaks improve learning outcomes and retention.',
    startButtonText: 'Take Break',
    dismissButtonText: 'Skip',
    encouragement: 'A brief mental reset can help you work more efficiently.',
  },
};

// Activity type icons and colors
const ACTIVITY_CONFIG: Record<
  string,
  { icon: string; bgColor: string; borderColor: string; iconBg: string }
> = {
  breathing: {
    icon: '🌬️',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
  },
  stretching: {
    icon: '🧘',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconBg: 'bg-green-100',
  },
  movement: {
    icon: '🏃',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconBg: 'bg-orange-100',
  },
  grounding: {
    icon: '🌱',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
  },
  mindful_pause: {
    icon: '🧠',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconBg: 'bg-purple-100',
  },
  simple_game: {
    icon: '🎮',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    iconBg: 'bg-pink-100',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Focus break recommendation banner.
 * Displays a non-punitive, encouraging message with age-appropriate language.
 *
 * @example
 * ```tsx
 * <FocusBreakBanner
 *   activity={recommendedActivity}
 *   gradeBand="G6_8"
 *   onStartBreak={handleStartBreak}
 *   onDismiss={handleDismiss}
 * />
 * ```
 */
export function FocusBreakBanner({
  activity,
  gradeBand,
  onStartBreak,
  onDismiss,
}: FocusBreakBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const messaging = GRADE_BAND_MESSAGING[gradeBand];
  const activityConfig = ACTIVITY_CONFIG[activity.activityType] || ACTIVITY_CONFIG.breathing;

  const durationMinutes = Math.ceil(activity.estimatedDurationSeconds / 60);

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg animate-slide-up rounded-2xl border-2 ${activityConfig.borderColor} ${activityConfig.bgColor} p-4 shadow-lg transition-all duration-300 md:left-auto md:right-4`}
      role="alert"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Activity icon */}
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${activityConfig.iconBg} text-2xl`}
        >
          {activityConfig.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{messaging.title}</h3>
          <p className="mt-0.5 text-sm text-slate-600">{messaging.subtitle}</p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Activity details */}
      <div className="mt-3 rounded-xl bg-white/60 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">{activity.title}</p>
            <p className="text-sm text-slate-500">
              {durationMinutes} minute{durationMinutes !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? 'Less info' : 'More info'}
          </button>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <p className="text-sm text-slate-600">{activity.description}</p>
            {activity.instructions && activity.instructions.length > 0 && (
              <ul className="mt-2 space-y-1">
                {activity.instructions.slice(0, 3).map((instruction, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">
                      {index + 1}
                    </span>
                    {instruction}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Encouragement message */}
      <p className="mt-3 text-center text-sm text-slate-500">{messaging.encouragement}</p>

      {/* Action buttons */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={onDismiss}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {messaging.dismissButtonText}
        </button>
        <button
          onClick={onStartBreak}
          className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:from-blue-600 hover:to-blue-700"
        >
          {messaging.startButtonText}
        </button>
      </div>
    </div>
  );
}
