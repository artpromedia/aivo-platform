'use client';

import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export function Card({ title, subtitle, action, className, children, ...props }: CardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface shadow-soft', className)} {...props}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="space-y-1">
            {title && <div className="text-base font-semibold text-text">{title}</div>}
            {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(title || subtitle ? 'p-4 pt-3' : 'p-4')}>{children}</div>
    </div>
  );
}
