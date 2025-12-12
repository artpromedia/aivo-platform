'use client';

/**
 * Safety Badge Component
 *
 * Displays safety rating and data access profile badges for marketplace items.
 * Provides visual indicators to help districts understand item safety levels.
 */

import { useState } from 'react';

// Safety rating types matching backend
export type SafetyRating = 'PENDING' | 'APPROVED_K12' | 'RESTRICTED' | 'REJECTED';
export type DataAccessProfile = 'MINIMAL' | 'MODERATE' | 'HIGH';

interface SafetyBadgeProps {
  /** Safety rating of the item */
  safetyRating: SafetyRating;
  /** Optional data access profile */
  dataAccessProfile?: DataAccessProfile;
  /** Whether to show expanded view with both badges */
  expanded?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether clicking opens details */
  clickable?: boolean;
  /** Callback when badge is clicked */
  onViewDetails?: () => void;
}

const safetyRatingConfig: Record<
  SafetyRating,
  { label: string; color: string; bgColor: string; icon: React.ReactNode; description: string }
> = {
  APPROVED_K12: {
    label: 'K-12 Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Reviewed and approved for K-12 classroom use',
  },
  RESTRICTED: {
    label: 'Restricted',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Has restrictions; may require additional approval',
  },
  PENDING: {
    label: 'Pending Review',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Awaiting safety review by Trust & Safety team',
  },
  REJECTED: {
    label: 'Not Approved',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Not approved for installation',
  },
};

const dataAccessConfig: Record<
  DataAccessProfile,
  { label: string; color: string; bgColor: string; icon: React.ReactNode; description: string }
> = {
  MINIMAL: {
    label: 'Minimal Data',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Only pseudonymous IDs; no personal information shared',
  },
  MODERATE: {
    label: 'Moderate Data',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
      </svg>
    ),
    description: 'Accesses learner context like grade level and progress',
  },
  HIGH: {
    label: 'Extended Data',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Accesses extended learner data; review details carefully',
  },
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs gap-0.5',
  md: 'px-2 py-1 text-xs gap-1',
  lg: 'px-2.5 py-1 text-sm gap-1.5',
};

export function SafetyRatingBadge({
  safetyRating,
  dataAccessProfile,
  expanded = false,
  size = 'md',
  clickable = false,
  onViewDetails,
}: SafetyBadgeProps) {
  const config = safetyRatingConfig[safetyRating];
  const dataConfig = dataAccessProfile ? dataAccessConfig[dataAccessProfile] : null;

  const handleClick = () => {
    if (clickable && onViewDetails) {
      onViewDetails();
    }
  };

  const Badge = ({ className, children }: { className: string; children: React.ReactNode }) => {
    if (clickable) {
      return (
        <button
          onClick={handleClick}
          className={`${className} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-current/30 transition-all`}
          title="Click for safety details"
        >
          {children}
        </button>
      );
    }
    return <span className={className}>{children}</span>;
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge
        className={`inline-flex items-center rounded-full font-medium ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
      >
        {config.icon}
        {config.label}
      </Badge>

      {expanded && dataConfig && (
        <Badge
          className={`inline-flex items-center rounded-full font-medium ${dataConfig.bgColor} ${dataConfig.color} ${sizeClasses[size]}`}
        >
          {dataConfig.icon}
          {dataConfig.label}
        </Badge>
      )}

      {clickable && (
        <button
          onClick={handleClick}
          className="text-xs text-muted hover:text-primary underline ml-1"
        >
          View details
        </button>
      )}
    </div>
  );
}

/**
 * Compact safety indicator for list views
 */
export function SafetyIndicator({ safetyRating }: { safetyRating: SafetyRating }) {
  const config = safetyRatingConfig[safetyRating];

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${config.color}`}
      title={config.description}
    >
      {config.icon}
    </span>
  );
}

/**
 * Data access level indicator
 */
export function DataAccessIndicator({ profile }: { profile: DataAccessProfile }) {
  const config = dataAccessConfig[profile];

  // Visual bars indicator
  const bars = profile === 'MINIMAL' ? 1 : profile === 'MODERATE' ? 2 : 3;

  return (
    <span
      className={`inline-flex items-center gap-1 ${config.color}`}
      title={config.description}
    >
      <span className="flex items-end gap-0.5 h-3">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-1 rounded-sm transition-all ${
              i <= bars ? config.bgColor : 'bg-gray-200'
            }`}
            style={{ height: `${i * 4}px` }}
          />
        ))}
      </span>
      <span className="text-xs">{config.label}</span>
    </span>
  );
}

/**
 * Combined safety summary for item cards
 */
export function SafetySummary({
  safetyRating,
  dataAccessProfile,
  policyTags = [],
  onClick,
}: {
  safetyRating: SafetyRating;
  dataAccessProfile: DataAccessProfile;
  policyTags?: string[];
  onClick?: () => void;
}) {
  const safetyConfig = safetyRatingConfig[safetyRating];
  const dataConfig = dataAccessConfig[dataAccessProfile];

  // Policy tag badges to highlight
  const importantTags = policyTags.filter((tag) =>
    ['AI_POWERED', 'REQUIRES_TEACHER_PRESENCE', 'EXTERNAL_LINKS'].includes(tag)
  );

  return (
    <div className="space-y-2">
      {/* Main safety badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${safetyConfig.bgColor} ${safetyConfig.color}`}
        >
          {safetyConfig.icon}
          {safetyConfig.label}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${dataConfig.bgColor} ${dataConfig.color}`}
        >
          {dataConfig.label}
        </span>
      </div>

      {/* Important policy tags */}
      {importantTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {importantTags.map((tag) => (
            <PolicyTagBadge key={tag} tag={tag} size="sm" />
          ))}
        </div>
      )}

      {/* View details link */}
      {onClick && (
        <button
          onClick={onClick}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          View safety details
        </button>
      )}
    </div>
  );
}

/**
 * Policy tag badge
 */
const policyTagConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  NO_CHAT: { label: 'No Chat', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  NO_VIDEO: { label: 'No Video', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  NO_USER_GENERATED_CONTENT: { label: 'No UGC', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  REQUIRES_TEACHER_PRESENCE: { label: 'Teacher Required', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  EXTERNAL_LINKS: { label: 'External Links', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  AI_POWERED: { label: 'AI Powered', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  COLLECTS_ANALYTICS: { label: 'Analytics', color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
};

export function PolicyTagBadge({ tag, size = 'md' }: { tag: string; size?: 'sm' | 'md' }) {
  const config = policyTagConfig[tag] ?? {
    label: tag.replace(/_/g, ' ').toLowerCase(),
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  };

  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.bgColor} ${config.color} ${sizeClass}`}
    >
      {config.label}
    </span>
  );
}

// Export helpers
export { safetyRatingConfig, dataAccessConfig, policyTagConfig };
