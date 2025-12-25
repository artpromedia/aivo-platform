import React, { forwardRef, useRef, useEffect, useCallback } from 'react';

interface FocusGuardProps {
  onFocus: () => void;
}

/**
 * Focus guard component - invisible element that traps focus
 *
 * Used in focus traps to catch focus when it escapes the trapped region
 *
 * @example
 * <FocusGuard onFocus={() => lastFocusableElement.focus()} />
 * <div>...trap content...</div>
 * <FocusGuard onFocus={() => firstFocusableElement.focus()} />
 */
export const FocusGuard = forwardRef<HTMLDivElement, FocusGuardProps>(
  ({ onFocus }, ref) => {
    const handleFocus = useCallback(() => {
      onFocus();
    }, [onFocus]);

    return (
      <div
        ref={ref}
        tabIndex={0}
        onFocus={handleFocus}
        style={{
          position: 'fixed',
          width: '1px',
          height: '0px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
        aria-hidden="true"
        data-focus-guard="true"
      />
    );
  }
);

FocusGuard.displayName = 'FocusGuard';
