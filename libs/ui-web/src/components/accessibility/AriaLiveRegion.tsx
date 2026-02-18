'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/* ==========================================================================
   AriaLiveRegion — Accessible live announcement component
   
   WCAG 2.2 Success Criteria:
   - 4.1.3 Status Messages (Level AA)
   - 1.3.1 Info and Relationships (Level A)
   
   Usage:
     <AriaLiveProvider>
       <YourApp />
       <AriaLiveRegion />
     </AriaLiveProvider>
   
   Then in any child:
     const { announce } = useAriaLive();
     announce('3 new messages received');
   ========================================================================== */

type Politeness = 'polite' | 'assertive' | 'off';

interface AriaLiveContextValue {
  /** Announce a message to screen readers */
  announce: (message: string, politeness?: Politeness) => void;
  /** Clear current announcements */
  clear: () => void;
}

const AriaLiveContext = createContext<AriaLiveContextValue | null>(null);

/**
 * Hook to trigger screen-reader announcements from any component.
 */
export function useAriaLive(): AriaLiveContextValue {
  const ctx = useContext(AriaLiveContext);
  if (!ctx) {
    throw new Error('useAriaLive must be used within an <AriaLiveProvider>');
  }
  return ctx;
}

/**
 * Provider that manages aria-live announcement state.
 */
export function AriaLiveProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    // Clear previous timer
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }

    if (politeness === 'assertive') {
      // Clear then set to force re-announcement
      setAssertiveMessage('');
      requestAnimationFrame(() => setAssertiveMessage(message));
    } else {
      setPoliteMessage('');
      requestAnimationFrame(() => setPoliteMessage(message));
    }

    // Auto-clear after 10s so the region doesn't hold stale content
    clearTimerRef.current = setTimeout(() => {
      setPoliteMessage('');
      setAssertiveMessage('');
    }, 10_000);
  }, []);

  const clear = useCallback(() => {
    setPoliteMessage('');
    setAssertiveMessage('');
  }, []);

  const value = useMemo(() => ({ announce, clear }), [announce, clear]);

  return (
    <AriaLiveContext.Provider value={value}>
      {children}
      {/* Visually hidden but accessible to screen readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {assertiveMessage}
      </div>
    </AriaLiveContext.Provider>
  );
}

/**
 * Standalone aria-live region for wrapping dynamic content.
 * Use this when you want a section of the page to announce changes.
 */
export function AriaLiveRegion({
  children,
  politeness = 'polite',
  role,
  atomic = true,
  className,
}: {
  children: ReactNode;
  politeness?: Politeness;
  role?: 'status' | 'alert' | 'log' | 'timer' | 'marquee';
  atomic?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      role={role}
      className={className}
    >
      {children}
    </div>
  );
}
