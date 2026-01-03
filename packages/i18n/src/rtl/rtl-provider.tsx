/**
 * RTL React Context and Provider
 *
 * Provides React context for RTL/LTR direction handling.
 */

import type { ReactNode } from 'react';
import React, { createContext, useContext, useMemo, useEffect } from 'react';

import { isRTLLocale, type SupportedLocale } from '../types';

import { rtlStyle, rtlClass, rtlValue, rtlIcon } from './rtl-utils';

/**
 * RTL context value
 */
export interface RTLContextValue {
  /** Current direction */
  direction: 'ltr' | 'rtl';
  /** Whether current direction is RTL */
  isRTL: boolean;
  /** Create RTL-aware styles */
  rtlStyle: (
    ltrStyles: React.CSSProperties,
    rtlStyles?: React.CSSProperties
  ) => React.CSSProperties;
  /** Transform class names for RTL */
  rtlClass: (className: string) => string;
  /** Get value based on direction */
  rtlValue: <T>(ltrValue: T, rtlValue: T) => T;
  /** Get RTL-aware icon name */
  rtlIcon: (iconName: string) => string;
}

/**
 * React Context for RTL
 */
const RTLContext = createContext<RTLContextValue | null>(null);

/**
 * RTL Provider props
 */
export interface RTLProviderProps {
  /** Child components */
  children: ReactNode;
  /** Current locale */
  locale: SupportedLocale;
  /** Override direction (ignores locale) */
  direction?: 'ltr' | 'rtl';
  /** Update document direction attribute */
  updateDocumentDirection?: boolean;
  /** Update document lang attribute */
  updateDocumentLang?: boolean;
}

/**
 * RTL Provider Component
 */
export function RTLProvider({
  children,
  locale,
  direction: directionOverride,
  updateDocumentDirection = true,
  updateDocumentLang = true,
}: RTLProviderProps): React.ReactElement {
  const direction = directionOverride ?? (isRTLLocale(locale) ? 'rtl' : 'ltr');
  const isRTL = direction === 'rtl';

  // Update document attributes
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (updateDocumentDirection) {
      document.documentElement.dir = direction;
      document.documentElement.setAttribute('data-direction', direction);
    }

    if (updateDocumentLang) {
      document.documentElement.lang = locale;
    }
  }, [direction, locale, updateDocumentDirection, updateDocumentLang]);

  // Context value with RTL-aware helper functions
  const contextValue = useMemo<RTLContextValue>(
    () => ({
      direction,
      isRTL,
      rtlStyle: (ltrStyles, rtlStyles) => rtlStyle(ltrStyles, rtlStyles, isRTL),
      rtlClass: (className) => rtlClass(className, isRTL),
      rtlValue: <T,>(ltr: T, rtl: T) => rtlValue(ltr, rtl, isRTL),
      rtlIcon: (iconName) => rtlIcon(iconName, isRTL),
    }),
    [direction, isRTL]
  );

  return (
    <RTLContext.Provider value={contextValue}>
      <div dir={direction} className={`rtl-root rtl-root--${direction}`}>
        {children}
      </div>
    </RTLContext.Provider>
  );
}

/**
 * Hook to access RTL context
 */
export function useRTLContext(): RTLContextValue {
  const context = useContext(RTLContext);
  if (!context) {
    throw new Error('useRTLContext must be used within an RTLProvider');
  }
  return context;
}

/**
 * Hook for RTL utilities
 */
export function useRTL(): {
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
  style: RTLContextValue['rtlStyle'];
  cls: RTLContextValue['rtlClass'];
  value: RTLContextValue['rtlValue'];
  icon: RTLContextValue['rtlIcon'];
} {
  const context = useRTLContext();

  return {
    isRTL: context.isRTL,
    direction: context.direction,
    style: context.rtlStyle,
    cls: context.rtlClass,
    value: context.rtlValue,
    icon: context.rtlIcon,
  };
}

/**
 * Higher-order component for RTL-aware components
 */
export function withRTL<P extends object>(
  WrappedComponent: React.ComponentType<P & { rtl: RTLContextValue }>
): React.FC<P> {
  const WithRTLComponent: React.FC<P> = (props) => {
    const rtl = useRTLContext();
    return <WrappedComponent {...props} rtl={rtl} />;
  };

  const name = WrappedComponent.displayName || WrappedComponent.name;
  WithRTLComponent.displayName = `withRTL(${name || 'Component'})`;

  return WithRTLComponent;
}

/**
 * Component that renders children only in RTL mode
 */
export function RTLOnly({ children }: { children: ReactNode }): React.ReactElement | null {
  const { isRTL } = useRTLContext();
  return isRTL ? <>{children}</> : null;
}

/**
 * Component that renders children only in LTR mode
 */
export function LTROnly({ children }: { children: ReactNode }): React.ReactElement | null {
  const { isRTL } = useRTLContext();
  return !isRTL ? <>{children}</> : null;
}

/**
 * Component that renders different content based on direction
 */
export function Bidirectional({
  ltr,
  rtl,
}: {
  ltr: ReactNode;
  rtl: ReactNode;
}): React.ReactElement {
  const { isRTL } = useRTLContext();
  return <>{isRTL ? rtl : ltr}</>;
}
