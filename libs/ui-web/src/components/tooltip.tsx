'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TooltipProps {
  /** Tooltip content */
  content: React.ReactNode;
  /** Trigger element (must accept ref) */
  children: React.ReactNode;
  /** Tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay in ms before showing */
  delay?: number;
  /** Whether tooltip is disabled */
  disabled?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Arrow styles per position                                          */
/* ------------------------------------------------------------------ */

const positionStyles = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
} as const;

const arrowStyles = {
  top: 'left-1/2 -translate-x-1/2 -bottom-1 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800',
  bottom: 'left-1/2 -translate-x-1/2 -top-1 border-l-transparent border-r-transparent border-t-transparent border-b-slate-800',
  left: 'top-1/2 -translate-y-1/2 -right-1 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800',
  right: 'top-1/2 -translate-y-1/2 -left-1 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800',
} as const;

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

/**
 * Clean tooltip with arrow, supports all four positions.
 *
 * Shows on hover/focus after an optional delay.
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  disabled = false,
  className,
}: Readonly<TooltipProps>) {
  const [visible, setVisible] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = React.useCallback(() => {
    if (disabled) return;
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay, disabled]);

  const hide = React.useCallback(() => {
    if (timerRef.current != null) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  React.useEffect(() => {
    return () => { if (timerRef.current != null) clearTimeout(timerRef.current); };
  }, []);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'absolute z-50 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg',
            'pointer-events-none',
            positionStyles[position],
            className
          )}
        >
          {content}
          <span
            className={cn('absolute border-4', arrowStyles[position])}
            aria-hidden
          />
        </span>
      )}
    </span>
  );
}
