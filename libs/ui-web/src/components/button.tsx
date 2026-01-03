'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  className,
  children,
  variant = 'primary',
  size = 'md',
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

  const sizeClass: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2',
  };

  return (
    <button
      type={type}
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
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
