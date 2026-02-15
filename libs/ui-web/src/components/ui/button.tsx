import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient' | 'glass';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium transition-all duration-200 ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-background))] ' +
      'disabled:pointer-events-none disabled:opacity-40';

    const variantClasses: Record<string, string> = {
      default:
        'bg-[rgb(var(--color-primary))] text-white hover:brightness-110 active:scale-[0.98] ' +
        'rounded-[var(--radius-button)] shadow-[0_0_20px_rgba(var(--color-primary),0.3)] ' +
        'hover:shadow-[0_0_30px_rgba(var(--color-primary),0.5)] focus-visible:ring-[rgb(var(--color-primary))]',
      destructive:
        'bg-[rgb(var(--color-error))] text-white hover:brightness-110 active:scale-[0.98] ' +
        'rounded-[var(--radius-button)] shadow-[0_0_20px_rgba(var(--color-error),0.3)] ' +
        'focus-visible:ring-[rgb(var(--color-error))]',
      outline:
        'border border-[rgb(var(--color-border))] bg-transparent text-[rgb(var(--color-text))] ' +
        'hover:bg-[var(--glass-bg)] hover:border-[rgb(var(--color-primary))] active:scale-[0.98] ' +
        'rounded-[var(--radius-button)] backdrop-blur-sm focus-visible:ring-[rgb(var(--color-primary))]',
      secondary:
        'bg-[rgb(var(--color-surface-elevated))] text-[rgb(var(--color-text))] ' +
        'hover:bg-[rgb(var(--color-surface-elevated))]/80 active:scale-[0.98] ' +
        'rounded-[var(--radius-button)] focus-visible:ring-[rgb(var(--color-secondary))]',
      ghost:
        'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] ' +
        'hover:bg-[var(--glass-bg)] active:scale-[0.98] rounded-[var(--radius-button)] ' +
        'focus-visible:ring-[rgb(var(--color-primary))]',
      link:
        'text-[rgb(var(--color-primary))] underline-offset-4 hover:underline hover:brightness-125 ' +
        'focus-visible:ring-[rgb(var(--color-primary))]',
      gradient:
        'bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))] ' +
        'text-white hover:brightness-110 active:scale-[0.98] rounded-[var(--radius-button)] ' +
        'shadow-[0_0_24px_rgba(var(--color-primary),0.4)] hover:shadow-[0_0_36px_rgba(var(--color-primary),0.6)] ' +
        'focus-visible:ring-[rgb(var(--color-primary))]',
      glass:
        'bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)] ' +
        'text-[rgb(var(--color-text))] hover:bg-[var(--glass-bg-light)] active:scale-[0.98] ' +
        'rounded-[var(--radius-button)] focus-visible:ring-[rgb(var(--color-primary))]',
    };

    const sizeClasses: Record<string, string> = {
      default: 'h-10 px-5 py-2 text-sm',
      sm: 'h-9 px-3.5 text-xs',
      lg: 'h-12 px-8 text-base',
      icon: 'h-10 w-10',
    };

    return (
      <button
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className ?? ''}`}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
