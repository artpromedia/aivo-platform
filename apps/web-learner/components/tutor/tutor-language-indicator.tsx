'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import {
  UI_LOCALES,
  LOCALE_DISPLAY,
  isUILocale,
  type UILocale,
} from '@aivo/i18n/config';

/* ─── Types ─── */

export interface TutorLocaleInfo {
  voiceAvailable: boolean;
  voiceId: string | null;
  isRTL: boolean;
  voiceFallbackUsed?: boolean;
  resolvedVoiceLocale?: string | null;
  languageName?: string;
  nativeLanguageName?: string;
}

interface TutorLanguageIndicatorProps {
  /** Current session locale code (e.g. 'en', 'es', 'ar') */
  locale: string;
  /** Locale info from the session/stream response */
  localeInfo?: TutorLocaleInfo | null;
  /** Whether voice is currently enabled */
  voiceEnabled: boolean;
  /** Callback to change the tutor session locale */
  onLocaleChange?: (newLocale: UILocale) => void;
  /** Tutor persona name (for text-only banner) */
  personaName?: string;
}

/* ─── Component ─── */

/**
 * Compact language indicator for the tutor session header.
 * Shows current language + voice status and opens a locale picker on click.
 */
export function TutorLanguageIndicator({
  locale,
  localeInfo,
  voiceEnabled,
  onLocaleChange,
  personaName,
}: TutorLanguageIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLocale = isUILocale(locale) ? locale : 'en';
  const display = LOCALE_DISPLAY[currentLocale];
  const voiceAvailable = localeInfo?.voiceAvailable ?? true;

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

  const handleSelect = useCallback(
    (code: UILocale) => {
      setIsOpen(false);
      if (code !== currentLocale) {
        onLocaleChange?.(code);
      }
    },
    [currentLocale, onLocaleChange],
  );

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1.5 text-xs font-medium transition hover:bg-white/30"
        aria-label="Change tutor language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{display.flag} {display.nativeName}</span>
        {voiceEnabled && (
          voiceAvailable ? (
            <Volume2 className="h-3 w-3 opacity-70" />
          ) : (
            <VolumeX className="h-3 w-3 opacity-50" />
          )
        )}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {/* Voice unavailable banner (below trigger, outside dropdown) */}
      {voiceEnabled && !voiceAvailable && personaName && !isOpen && (
        <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 shadow-md border border-amber-200">
          {personaName} will respond in {display.nativeName} as text. Voice support coming soon!
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select tutor language"
          className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-600 dark:bg-gray-800 rtl:left-0 rtl:right-auto rtl:origin-top-left"
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Tutor Language
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {UI_LOCALES.map((code) => {
              const meta = LOCALE_DISPLAY[code];
              const isActive = code === currentLocale;
              return (
                <button
                  key={code}
                  role="option"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => handleSelect(code)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-base">{meta.flag}</span>
                  <span className="flex-1 text-left rtl:text-right">
                    {meta.nativeName}
                  </span>
                  <span className="text-xs text-gray-400">{meta.name}</span>
                  {isActive && (
                    <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TutorLanguageIndicator;
