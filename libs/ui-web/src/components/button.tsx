'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  asChild?: boolean;
}

export function Button({
  className,
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  asChild: _asChild,
  type = 'button',
  disabled,
  ...props
}: Readonly<ButtonProps>) {
  const variantClass: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-on-accent shadow-soft hover:bg-primary/90 active:translate-y-[0.5px]',
    secondary:
      'bg-surface text-text border border-border shadow-soft hover:bg-surface-muted active:translate-y-[0.5px]',
    ghost: 'bg-transparent text-text hover:bg-surface-muted border border-transparent',
    outline:
      'bg-transparent text-text border border-border hover:bg-surface-muted active:translate-y-[0.5px]',
    destructive: 'bg-red-600 text-white shadow-soft hover:bg-red-700 active:translate-y-[0.5px]',
  };

  const sizeClass: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-focus))]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
