'use client';

/**
 * Locale Switcher Component
 *
 * A dropdown component for switching between available locales.
 * Features:
 * - Grouped by region (Americas, Europe, Asia, etc.)
 * - Shows native language names and flags
 * - Accessible with keyboard navigation
 * - RTL-aware layout
 */

import React, { useState, useRef, useEffect } from 'react';

import type { Locale } from '../lib/i18n-types';
import { LOCALE_METADATA } from '../lib/i18n-types';
import { useLocale } from '../providers/LocaleProvider';

export type LocaleSwitcherVariant = 'dropdown' | 'inline' | 'compact';

export interface LocaleSwitcherProps {
  /** Visual variant */
  variant?: LocaleSwitcherVariant;
  /** Show flags */
  showFlags?: boolean;
  /** Show native language names */
  showNativeNames?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when locale changes */
  onLocaleChange?: (locale: Locale) => void;
}

export function LocaleSwitcher({
  variant = 'dropdown',
  showFlags = true,
  showNativeNames = true,
  className = '',
  onLocaleChange,
}: LocaleSwitcherProps) {
  const { locale, setLocale, metadata, localesByRegion, isRTL } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle locale selection
  const handleLocaleSelect = async (newLocale: Locale) => {
    await setLocale(newLocale);
    setIsOpen(false);
    onLocaleChange?.(newLocale);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      setIsOpen(!isOpen);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`locale-switcher-compact ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className="locale-switcher-button-compact"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Select language"
        >
          {showFlags && <span className="locale-flag">{metadata.flag}</span>}
          <span className="locale-code">{locale.toUpperCase()}</span>
          <ChevronIcon isOpen={isOpen} />
        </button>

        {isOpen && (
          <div className="locale-dropdown-compact" role="listbox">
            {Object.entries(localesByRegion).map(([region, locales]) => (
              <div key={region} className="locale-region-group">
                {locales.map((loc) => {
                  const locMetadata = LOCALE_METADATA[loc];
                  if (!locMetadata) return null;

                  return (
                    <button
                      key={loc}
                      type="button"
                      role="option"
                      aria-selected={loc === locale}
                      onClick={() => handleLocaleSelect(loc)}
                      className={`locale-option ${loc === locale ? 'locale-option-selected' : ''}`}
                    >
                      {showFlags && <span className="locale-flag">{locMetadata.flag}</span>}
                      <span className="locale-name">
                        {showNativeNames ? locMetadata.nativeName : locMetadata.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`locale-switcher-inline ${className}`}>
        {Object.entries(localesByRegion).map(([region, locales]) => (
          <div key={region} className="locale-inline-group">
            <span className="locale-region-label">{region}</span>
            <div className="locale-inline-options">
              {locales.map((loc) => {
                const locMetadata = LOCALE_METADATA[loc];
                if (!locMetadata) return null;

                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleLocaleSelect(loc)}
                    className={`locale-inline-option ${loc === locale ? 'locale-inline-selected' : ''}`}
                    aria-current={loc === locale ? 'true' : undefined}
                  >
                    {showFlags && <span className="locale-flag">{locMetadata.flag}</span>}
                    <span className="locale-name">{locMetadata.nativeName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div
      className={`locale-switcher ${isRTL ? 'locale-switcher-rtl' : ''} ${className}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="locale-switcher-button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        {showFlags && <span className="locale-flag">{metadata.flag}</span>}
        <span className="locale-current">
          {showNativeNames ? metadata.nativeName : metadata.name}
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div className="locale-dropdown" role="listbox">
          {Object.entries(localesByRegion).map(([region, locales]) => (
            <div key={region} className="locale-region-group">
              <div className="locale-region-header">{region}</div>
              {locales.map((loc) => {
                const locMetadata = LOCALE_METADATA[loc];
                if (!locMetadata) return null;

                return (
                  <button
                    key={loc}
                    type="button"
                    role="option"
                    aria-selected={loc === locale}
                    onClick={() => handleLocaleSelect(loc)}
                    className={`locale-option ${loc === locale ? 'locale-option-selected' : ''}`}
                  >
                    {showFlags && <span className="locale-flag">{locMetadata.flag}</span>}
                    <div className="locale-option-text">
                      <span className="locale-native-name">{locMetadata.nativeName}</span>
                      {showNativeNames && locMetadata.name !== locMetadata.nativeName && (
                        <span className="locale-english-name">{locMetadata.name}</span>
                      )}
                    </div>
                    {loc === locale && <CheckIcon />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Chevron icon component
function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`locale-chevron ${isOpen ? 'locale-chevron-open' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Check icon component
function CheckIcon() {
  return (
    <svg
      className="locale-check"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.5 4.5L6 12L2.5 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default LocaleSwitcher;
