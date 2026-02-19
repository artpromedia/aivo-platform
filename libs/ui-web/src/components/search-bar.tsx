'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'value'> {
  /** Current search value */
  value?: string;
  /** Called on every keystroke */
  onChange?: (value: string) => void;
  /** Called when the user submits (Enter key) */
  onSubmit?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show keyboard shortcut hint (e.g., ⌘K) */
  shortcutHint?: string;
  /** Optional trailing action / filter button */
  trailing?: React.ReactNode;
  /** Show loading spinner */
  loading?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Size styles                                                        */
/* ------------------------------------------------------------------ */

const sizeStyles = {
  sm: 'h-9 text-sm pl-9 pr-3',
  md: 'h-11 text-sm pl-10 pr-3',
  lg: 'h-12 text-base pl-11 pr-4',
} as const;

const iconSizes = {
  sm: 'w-4 h-4 left-2.5',
  md: 'w-4 h-4 left-3',
  lg: 'w-5 h-5 left-3.5',
} as const;

/* ------------------------------------------------------------------ */
/*  Search Icon                                                        */
/* ------------------------------------------------------------------ */

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  SearchBar                                                          */
/* ------------------------------------------------------------------ */

/**
 * Expanded search input with icon, optional keyboard shortcut hint, and trailing slot.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search…',
  size = 'md',
  shortcutHint,
  trailing,
  loading,
  className,
  ...inputProps
}: Readonly<SearchBarProps>) {
  const [internal, setInternal] = React.useState('');
  const current = value ?? internal;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (value === undefined) setInternal(v);
    onChange?.(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.(current);
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      {/* Search icon */}
      <SearchIcon
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400',
          iconSizes[size]
        )}
      />

      {/* Input */}
      <input
        ref={inputRef}
        type="search"
        value={current}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-xl border border-slate-200 bg-white font-medium text-slate-900 placeholder:text-slate-400',
          'outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100',
          sizeStyles[size],
          !!(shortcutHint || trailing || loading) && 'pr-20'
        )}
        {...inputProps}
      />

      {/* Trailing area */}
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {loading && <SpinnerIcon />}
        {shortcutHint && !loading && (
          <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-400 sm:inline-block">
            {shortcutHint}
          </kbd>
        )}
        {trailing}
      </div>
    </div>
  );
}
