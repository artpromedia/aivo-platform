'use client';

/**
 * Visibility Badge
 *
 * Displays the visibility level of a goal or progress note.
 */

import { Badge } from '@aivo/ui-web';

import { cn } from '../lib/cn';
import { getVisibilityLabel } from '../lib/educator-mode';
import type { Visibility } from '../lib/teacher-planning-api';

interface VisibilityBadgeProps {
  visibility: Visibility;
  className?: string;
  /** Show icon only (compact mode) */
  compact?: boolean;
}

export function VisibilityBadge({ visibility, className, compact = false }: VisibilityBadgeProps) {
  const label = getVisibilityLabel(visibility);

  // Don't show badge for ALL_EDUCATORS (default)
  if (visibility === 'ALL_EDUCATORS') {
    return null;
  }

  const icon = visibility === 'THERAPISTS_ONLY' ? '🔒' : '⚙️';
  const tone = visibility === 'THERAPISTS_ONLY' ? 'info' : 'neutral';

  if (compact) {
    return (
      <span className={cn('text-sm', className)} title={label} aria-label={label}>
        {icon}
      </span>
    );
  }

  return (
    <Badge tone={tone} className={cn('gap-1', className)}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </Badge>
  );
}

/**
 * Visibility selector dropdown for forms
 */
interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
  options: { value: Visibility; label: string }[];
  disabled?: boolean;
  className?: string;
}

export function VisibilitySelector({
  value,
  onChange,
  options,
  disabled = false,
  className,
}: VisibilitySelectorProps) {
  // Don't show selector if there's only one option
  if (options.length <= 1) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor="visibility" className="text-sm font-medium text-muted-foreground">
        Visible to
      </label>
      <select
        id="visibility"
        value={value}
        onChange={(e) => {
          onChange(e.target.value as Visibility);
        }}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
