'use client';

/**
 * Educator Mode Toggle
 *
 * A segmented control for switching between Teacher and Therapist modes.
 * Only visible to users who have both roles.
 */

import { cn } from '../lib/cn';
import { useEducatorMode } from '../lib/educator-mode';
import type { EducatorMode } from '../lib/teacher-planning-api';

interface EducatorModeToggleProps {
  className?: string;
}

export function EducatorModeToggle({ className }: EducatorModeToggleProps) {
  const { mode, setMode, canToggle } = useEducatorMode();

  // Don't render if user can't toggle
  if (!canToggle) {
    return null;
  }

  const options: { value: EducatorMode; label: string; icon: string }[] = [
    { value: 'teacher', label: 'Teacher', icon: '👩‍🏫' },
    { value: 'therapist', label: 'Therapist', icon: '🩺' },
  ];

  return (
    <div
      className={cn('inline-flex items-center rounded-lg bg-muted p-1', className)}
      role="radiogroup"
      aria-label="Educator mode"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={mode === option.value}
          onClick={() => {
            setMode(option.value);
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            mode === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="text-base" aria-hidden="true">
            {option.icon}
          </span>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Compact mode indicator for smaller spaces
 */
export function EducatorModeIndicator({ className }: { className?: string }) {
  const { isTherapist } = useEducatorMode();

  // Show indicator if in therapist mode
  if (!isTherapist) {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800',
        className
      )}
    >
      <span aria-hidden="true">🩺</span>
      Therapist Mode
    </span>
  );
}
