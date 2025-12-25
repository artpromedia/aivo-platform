/**
 * Grade Input Component
 *
 * Inline grade input with validation and keyboard support
 */

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface GradeInputProps {
  readonly initialValue: number | null;
  readonly maxPoints: number;
  readonly onSubmit: (value: number | null) => void;
  readonly onCancel: () => void;
  readonly autoFocus?: boolean;
  readonly className?: string;
}

export function GradeInput({
  initialValue,
  maxPoints,
  onSubmit,
  onCancel,
  autoFocus = false,
  className,
}: GradeInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState(initialValue?.toString() ?? '');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const validateAndSubmit = () => {
    const trimmed = value.trim();

    // Allow empty value (null score)
    if (trimmed === '' || trimmed === '-') {
      onSubmit(null);
      return;
    }

    // Check for special inputs
    const lowerTrimmed = trimmed.toLowerCase();
    if (lowerTrimmed === 'ex' || lowerTrimmed === 'exc' || lowerTrimmed === 'exempt') {
      // Mark as exempt - could be handled differently
      onSubmit(null);
      return;
    }

    if (lowerTrimmed === 'm' || lowerTrimmed === 'mi' || lowerTrimmed === 'missing') {
      onSubmit(0); // Or handle missing differently
      return;
    }

    // Parse numeric value
    const numValue = Number.parseFloat(trimmed);

    if (Number.isNaN(numValue)) {
      setError('Enter a valid number');
      return;
    }

    if (numValue < 0) {
      setError('Score cannot be negative');
      return;
    }

    // Allow extra credit (above max)
    if (numValue > maxPoints * 1.5) {
      setError(`Score seems too high (max: ${maxPoints})`);
      return;
    }

    onSubmit(numValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        validateAndSubmit();
        break;
      case 'Escape':
        e.preventDefault();
        onCancel();
        break;
      case 'ArrowUp':
        e.preventDefault();
        setValue((prev) => {
          const num = Number.parseFloat(prev) || 0;
          return Math.min(maxPoints, num + 1).toString();
        });
        break;
      case 'ArrowDown':
        e.preventDefault();
        setValue((prev) => {
          const num = Number.parseFloat(prev) || 0;
          return Math.max(0, num - 1).toString();
        });
        break;
    }
  };

  const handleBlur = () => {
    // Small delay to allow clicking elsewhere
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        validateAndSubmit();
      }
    }, 100);
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="—"
        className={cn(
          'w-full border-0 bg-primary-50 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary-500',
          error && 'bg-red-50 ring-2 ring-red-500'
        )}
        aria-label={`Grade out of ${maxPoints}`}
      />
      {error && (
        <div className="absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-red-600 px-2 py-1 text-xs text-white">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Grade display with optional inline edit
 */
interface GradeDisplayProps {
  readonly score: number | null;
  readonly maxPoints: number;
  readonly status?: 'graded' | 'missing' | 'late' | 'exempt' | 'pending';
  readonly editable?: boolean;
  readonly onEdit?: (score: number | null) => void;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly showPercentage?: boolean;
  readonly className?: string;
}

export function GradeDisplay({
  score,
  maxPoints,
  status = 'graded',
  editable = false,
  onEdit,
  size = 'md',
  showPercentage = false,
  className,
}: GradeDisplayProps) {
  const [isEditing, setIsEditing] = React.useState(false);

  const handleSubmit = (newScore: number | null) => {
    setIsEditing(false);
    if (onEdit) {
      onEdit(newScore);
    }
  };

  if (isEditing && editable) {
    return (
      <GradeInput
        initialValue={score}
        maxPoints={maxPoints}
        onSubmit={handleSubmit}
        onCancel={() => {
          setIsEditing(false);
        }}
        autoFocus
        className={className}
      />
    );
  }

  const percentage = score !== null && maxPoints > 0 ? (score / maxPoints) * 100 : null;
  const colorClass = getGradeColorClass(percentage);

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const statusIcons: Record<string, string> = {
    missing: '⚠️',
    late: '⏰',
    exempt: '✓',
    pending: '⏳',
  };

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 rounded font-medium border-0 bg-transparent',
        colorClass,
        sizeClasses[size],
        editable && 'cursor-pointer hover:ring-2 hover:ring-primary-300',
        !editable && 'cursor-default',
        className
      )}
      onClick={() => {
        if (editable) setIsEditing(true);
      }}
      disabled={!editable}
    >
      {score === null ? (
        <span className="text-gray-400">—</span>
      ) : (
        <>
          <span>{score}</span>
          {showPercentage && percentage !== null && (
            <span className="text-gray-500">({percentage.toFixed(0)}%)</span>
          )}
        </>
      )}
      {status !== 'graded' && statusIcons[status] && (
        <span title={status}>{statusIcons[status]}</span>
      )}
    </button>
  );
}

function getGradeColorClass(percentage: number | null): string {
  if (percentage === null) return 'bg-gray-100 text-gray-500';
  if (percentage >= 90) return 'bg-green-100 text-green-700';
  if (percentage >= 80) return 'bg-blue-100 text-blue-700';
  if (percentage >= 70) return 'bg-yellow-100 text-yellow-700';
  if (percentage >= 60) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}
