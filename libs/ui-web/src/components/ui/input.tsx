import * as React from 'react';

import { cn } from '../../utils/cn';

export type InputVariant = 'outlined' | 'filled' | 'underlined';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visual variant of the input */
  variant?: InputVariant;
  /** Size of the input */
  inputSize?: InputSize;
  /** Error state */
  error?: boolean;
  /** Left icon or element */
  leftElement?: React.ReactNode;
  /** Right icon or element */
  rightElement?: React.ReactNode;
}

/**
 * Theme-aware Input component
 *
 * Adapts styling based on the current grade theme:
 * - K5 (Explorer): Filled style, large rounded corners, larger text
 * - MS (Navigator): Outlined style, medium rounded corners
 * - HS (Scholar): Outlined style, small rounded corners, compact
 *
 * Uses CSS custom properties from the grade theme system.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      variant = 'outlined',
      inputSize = 'md',
      error = false,
      leftElement,
      rightElement,
      ...props
    },
    ref
  ) => {
    const variantClasses: Record<InputVariant, string> = {
      outlined: cn(
        'bg-surface border border-border',
        'focus:border-primary focus:ring-2 focus:ring-[var(--color-focus-ring)]',
        error && 'border-error focus:border-error focus:ring-error/30'
      ),
      filled: cn(
        'bg-surface-muted border border-transparent',
        'focus:bg-surface focus:border-primary focus:ring-2 focus:ring-[var(--color-focus-ring)]',
        error && 'bg-error/10 focus:border-error focus:ring-error/30'
      ),
      underlined: cn(
        'bg-transparent border-0 border-b-2 border-border rounded-none',
        'focus:border-primary focus:ring-0',
        error && 'border-error focus:border-error'
      ),
    };

    const sizeClasses: Record<InputSize, string> = {
      sm: 'min-h-[36px] px-3 py-1.5 text-label',
      md: 'min-h-[var(--touch-target-min,44px)] px-[var(--space-4,16px)] py-[var(--space-2,8px)] text-body',
      lg: 'min-h-[52px] px-[var(--space-5,20px)] py-[var(--space-3,12px)] text-title',
    };

    const inputElement = (
      <input
        type={type}
        ref={ref}
        className={cn(
          // Base styles
          'flex w-full font-[var(--font-family-default)]',
          // Theme-aware border radius
          variant !== 'underlined' && 'rounded-[var(--radius-input,8px)]',
          // Theme-aware transitions
          'transition-all duration-[var(--animation-duration-fast,100ms)] ease-[var(--animation-easing)]',
          // Text colors
          'text-text placeholder:text-text-muted',
          // Focus styles
          'focus:outline-none',
          // Disabled styles
          'disabled:cursor-not-allowed disabled:opacity-50',
          // File input styles
          'file:border-0 file:bg-transparent file:text-body file:font-medium file:text-primary',
          // Variant and size
          variantClasses[variant],
          sizeClasses[inputSize],
          // Padding adjustments for icons
          Boolean(leftElement) && 'pl-10',
          Boolean(rightElement) && 'pr-10',
          className
        )}
        {...props}
      />
    );

    // If no icons, return simple input
    if (!leftElement && !rightElement) {
      return inputElement;
    }

    // With icons, wrap in relative container
    return (
      <div className="relative w-full">
        {leftElement && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            style={{ width: 'var(--icon-size, 20px)', height: 'var(--icon-size, 20px)' }}
          >
            {leftElement}
          </div>
        )}
        {inputElement}
        {rightElement && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
            style={{ width: 'var(--icon-size, 20px)', height: 'var(--icon-size, 20px)' }}
          >
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
