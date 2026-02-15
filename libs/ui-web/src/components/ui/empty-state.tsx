'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EmptyStateProps {
  /** Hero icon or illustration (ReactNode) */
  icon?: React.ReactNode;
  /** Heading text */
  title: string;
  /** Descriptive paragraph */
  description?: string;
  /** Primary CTA button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary link / action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Default icon (a simple placeholder illustration)                   */
/* ------------------------------------------------------------------ */

function DefaultIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[rgb(var(--color-text-muted))]/40"
      aria-hidden
    >
      <rect x="8" y="12" width="48" height="40" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M8 24h48" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="18" r="2" fill="currentColor" />
      <circle cx="22" cy="18" r="2" fill="currentColor" />
      <circle cx="28" cy="18" r="2" fill="currentColor" />
      <rect x="16" y="30" width="32" height="4" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="16" y="38" width="24" height="4" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[rgb(var(--color-border))] bg-[var(--glass-bg)] backdrop-blur-sm px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-4">{icon ?? <DefaultIcon />}</div>

      <h3 className="text-base font-semibold text-[rgb(var(--color-text))]">{title}</h3>

      {description && (
        <p className="mt-1 max-w-sm text-sm text-[rgb(var(--color-text-muted))]">{description}</p>
      )}

      {children && <div className="mt-4">{children}</div>}

      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="rounded-[var(--radius-button)] bg-[rgb(var(--color-primary))] px-4 py-2 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))] focus:ring-offset-2 focus:ring-offset-[rgb(var(--color-background))] transition-all shadow-[0_0_20px_rgba(var(--color-primary),0.3)]"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="rounded-[var(--radius-button)] border border-[rgb(var(--color-border))] bg-[var(--glass-bg)] px-4 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] hover:bg-[var(--glass-bg-light)] hover:text-[rgb(var(--color-text))] transition-all"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
