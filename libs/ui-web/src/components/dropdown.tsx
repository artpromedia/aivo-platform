'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DropdownItem {
  /** Unique key */
  id: string;
  /** Display label */
  label: string;
  /** Optional description shown below label */
  description?: string;
  /** Leading icon */
  icon?: React.ReactNode;
  /** Whether this is a destructive action */
  destructive?: boolean;
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
}

export interface DropdownSection {
  /** Optional section label */
  label?: string;
  items: DropdownItem[];
}

export interface DropdownProps {
  /** Trigger element */
  trigger: React.ReactNode;
  /** Sections of dropdown items */
  sections: DropdownSection[];
  /** Alignment relative to trigger */
  align?: 'left' | 'right';
  /** Dropdown width */
  width?: 'auto' | 'trigger' | number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Dropdown                                                           */
/* ------------------------------------------------------------------ */

/**
 * Clean dropdown menu with icon and description support.
 *
 * Opens on click, closes on outside click or Escape key.
 */
export function Dropdown({
  trigger,
  sections,
  align = 'left',
  width = 'auto',
  className,
}: Readonly<DropdownProps>) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const widthStyle =
    typeof width === 'number'
      ? { width: `${width}px` }
      : width === 'auto'
        ? { minWidth: '180px' }
        : {};

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </div>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          style={widthStyle}
          className={cn(
            'absolute z-50 mt-1.5 rounded-xl border border-slate-200 bg-white py-1 shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {sections.map((section, sIdx) => (
            <div key={section.label ?? sIdx}>
              {sIdx > 0 && <div className="my-1 border-t border-slate-100" role="separator" />}
              {section.label && (
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                    item.destructive
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-50',
                    item.disabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {item.icon && <span className="mt-0.5 flex-shrink-0 text-slate-400">{item.icon}</span>}
                  <span className="min-w-0">
                    <span className="block font-medium">{item.label}</span>
                    {item.description && (
                      <span className="mt-0.5 block text-xs text-slate-400">{item.description}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
