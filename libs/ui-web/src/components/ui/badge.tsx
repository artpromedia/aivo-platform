import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'glass';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantClasses: Record<string, string> = {
    default:
      'border-transparent bg-[rgb(var(--color-primary))] text-white',
    secondary:
      'border-transparent bg-[rgb(var(--color-surface-elevated))] text-[rgb(var(--color-text))]',
    destructive:
      'border-transparent bg-[rgb(var(--color-error))] text-white',
    outline:
      'border-[rgb(var(--color-border))] text-[rgb(var(--color-text))] bg-transparent',
    success:
      'border-transparent bg-[rgb(var(--color-success))]/15 text-[rgb(var(--color-success))]',
    warning:
      'border-transparent bg-[rgb(var(--color-warning))]/15 text-[rgb(var(--color-warning))]',
    info:
      'border-transparent bg-[rgb(var(--color-info))]/15 text-[rgb(var(--color-info))]',
    glass:
      'border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-sm text-[rgb(var(--color-text))]',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus))] focus:ring-offset-2 focus:ring-offset-[rgb(var(--color-background))] ${variantClasses[variant]} ${className ?? ''}`}
      {...props}
    />
  );
}
