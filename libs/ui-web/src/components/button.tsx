'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  className,
  children,
  variant = 'primary',
  leftIcon,
  rightIcon,
  type = 'button',
  ...props
}: ButtonProps) {
  const variantClass: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-on-accent shadow-soft hover:bg-primary/90 active:translate-y-[0.5px]',
    secondary:
      'bg-surface text-text border border-border shadow-soft hover:bg-surface-muted active:translate-y-[0.5px]',
    ghost: 'bg-transparent text-text hover:bg-surface-muted border border-transparent',
  };

  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-focus))]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClass[variant],
        className
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
