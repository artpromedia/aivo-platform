import React, { forwardRef, useRef, useEffect, useId } from 'react';
import { Politeness } from '../types';

export interface LiveRegionProps {
  children?: React.ReactNode;
  'aria-live'?: Politeness;
  'aria-atomic'?: boolean;
  'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';
  role?: 'status' | 'alert' | 'log' | 'timer' | 'marquee';
  visuallyHidden?: boolean;
  className?: string;
  id?: string;
}

/**
 * Live region component for dynamic content announcements
 *
 * @example
 * // Status message
 * <LiveRegion aria-live="polite" role="status">
 *   {statusMessage}
 * </LiveRegion>
 *
 * // Alert message
 * <LiveRegion aria-live="assertive" role="alert">
 *   {errorMessage}
 * </LiveRegion>
 */
export const LiveRegion = forwardRef<HTMLDivElement, LiveRegionProps>(
  (
    {
      children,
      'aria-live': ariaLive = 'polite',
      'aria-atomic': ariaAtomic = true,
      'aria-relevant': ariaRelevant = 'additions text',
      role = 'status',
      visuallyHidden = true,
      className,
      id,
    },
    ref
  ) => {
    const baseId = useId();
    const regionId = id || `${baseId}-live-region`;

    const visuallyHiddenStyles: React.CSSProperties = visuallyHidden
      ? {
          position: 'absolute',
          width: '1px',
          height: '1px',
          margin: '-1px',
          padding: 0,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }
      : {};

    return (
      <div
        ref={ref}
        id={regionId}
        role={role}
        aria-live={ariaLive}
        aria-atomic={ariaAtomic}
        aria-relevant={ariaRelevant}
        className={className}
        style={visuallyHiddenStyles}
      >
        {children}
      </div>
    );
  }
);

LiveRegion.displayName = 'LiveRegion';
