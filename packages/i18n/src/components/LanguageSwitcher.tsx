'use client';

import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import {
  UI_LOCALES,
  LOCALE_DISPLAY,
  LOCALE_COOKIE,
  isUILocale,
  type UILocale,
} from '../config';

/* ─── Types ─── */

export interface LanguageSwitcherProps {
  /** Currently active locale */
  locale?: string;
  /** Callback fired when the user selects a new locale */
  onLocaleChange?: (locale: UILocale) => void;
  /** Visual variant */
  variant?: 'dropdown' | 'compact' | 'menu';
  /** Additional CSS class */
  className?: string;
  /** Show native language names (default: true) */
  showNativeNames?: boolean;
  /** Show flag emoji (default: true) */
  showFlags?: boolean;
  /** Accessible label */
  'aria-label'?: string;
}

/* ─── Helpers ─── */

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1];
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
}

/* ─── Component ─── */

/**
 * LanguageSwitcher — accessible locale picker used in all AIVO web apps.
 *
 * **Variants:**
 * - `dropdown` (default) — full-width select with flags and native names
 * - `compact` — icon button that opens a popup
 * - `menu` — inline list of flags for header bars
 */
export function LanguageSwitcher({
  locale: localeProp,
  onLocaleChange,
  variant = 'dropdown',
  className = '',
  showNativeNames = true,
  showFlags = true,
  'aria-label': ariaLabel,
}: LanguageSwitcherProps) {
  // SSR-safe: always start with the prop or 'en'. Reading document.cookie
  // in the initializer would differ between server (undefined) and client
  // (actual value) causing React hydration error #418.
  const [currentLocale, setCurrentLocale] = useState<UILocale>(
    localeProp && isUILocale(localeProp) ? localeProp : 'en',
  );

  const [isOpen, setIsOpen] = useState(false);
  const [, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync from prop
  useEffect(() => {
    if (localeProp && isUILocale(localeProp) && localeProp !== currentLocale) {
      setCurrentLocale(localeProp);
    }
  }, [localeProp, currentLocale]);

  // Sync from cookie after hydration (client-only)
  useEffect(() => {
    if (localeProp && isUILocale(localeProp)) return; // prop takes precedence
    const cookie = getCookie(LOCALE_COOKIE);
    if (cookie && isUILocale(cookie) && cookie !== currentLocale) {
      setCurrentLocale(cookie);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleChange = useCallback(
    (newLocale: UILocale) => {
      startTransition(() => {
        setCurrentLocale(newLocale);
        setCookie(LOCALE_COOKIE, newLocale);
        setIsOpen(false);

        // Update <html lang> and dir
        if (typeof document !== 'undefined') {
          document.documentElement.lang = newLocale;
          document.documentElement.dir = LOCALE_DISPLAY[newLocale].dir;
        }

        onLocaleChange?.(newLocale);

        // Reload page to apply server-side translations
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      });
    },
    [onLocaleChange],
  );

  const label = ariaLabel || 'Change language';
  const current = LOCALE_DISPLAY[currentLocale];

  /* ── Dropdown variant ── */
  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block ${className}`} ref={menuRef}>
        <select
          value={currentLocale}
          onChange={(e) => {
            const v = e.target.value;
            if (isUILocale(v)) handleChange(v);
          }}
          aria-label={label}
          className="appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rtl:pl-8 rtl:pr-3"
        >
          {UI_LOCALES.map((code) => {
            const meta = LOCALE_DISPLAY[code];
            const text = [
              showFlags ? meta.flag : '',
              showNativeNames ? meta.nativeName : meta.name,
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <option key={code} value={code}>
                {text}
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 rtl:left-0 rtl:right-auto rtl:pl-2">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }

  /* ── Compact variant ── */
  if (variant === 'compact') {
    return (
      <div className={`relative inline-block ${className}`} ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={label}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="flex items-center gap-1 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3c2.5 2.8 3.9 6.3 3.9 9s-1.4 6.2-3.9 9c-2.5-2.8-3.9-6.3-3.9-9s1.4-6.2 3.9-9z"
            />
          </svg>
          <span className="hidden sm:inline">{current.nativeName}</span>
        </button>

        {isOpen && (
          <div
            role="listbox"
            aria-label={label}
            className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800 rtl:left-0 rtl:right-auto rtl:origin-top-left"
          >
            {UI_LOCALES.map((code) => {
              const meta = LOCALE_DISPLAY[code];
              const isActive = code === currentLocale;
              return (
                <button
                  key={code}
                  role="option"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => handleChange(code)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {showFlags && <span className="text-lg">{meta.flag}</span>}
                  <span className="flex-1 text-left rtl:text-right">
                    {showNativeNames ? meta.nativeName : meta.name}
                  </span>
                  {showNativeNames && (
                    <span className="text-xs text-gray-400">{meta.name}</span>
                  )}
                  {isActive && (
                    <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── Menu variant ── */
  return (
    <div className={`flex flex-wrap gap-1 ${className}`} role="radiogroup" aria-label={label}>
      {UI_LOCALES.map((code) => {
        const meta = LOCALE_DISPLAY[code];
        const isActive = code === currentLocale;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleChange(code)}
            title={`${meta.nativeName} (${meta.name})`}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {showFlags ? `${meta.flag} ${code.toUpperCase()}` : code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSwitcher;
