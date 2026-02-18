'use client';

import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** URL/route path (omit for current page) */
  href?: string;
  /** Optional icon */
  icon?: ReactNode;
}

export interface BreadcrumbNavProps extends HTMLAttributes<HTMLElement> {
  /** Array of breadcrumb items (last is treated as current page) */
  items: BreadcrumbItem[];
  /** Separator between items */
  separator?: ReactNode;
  /** Max items before collapsing to "..." */
  maxItems?: number;
}

/* ------------------------------------------------------------------ */
/*  Default separator                                                  */
/* ------------------------------------------------------------------ */

function DefaultSeparator() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="mx-1.5 flex-shrink-0 text-slate-300"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  BreadcrumbNav                                                      */
/* ------------------------------------------------------------------ */

/**
 * Breadcrumb trail navigation.
 *
 * Shows a path of links leading to the current page.
 * When `maxItems` is set and the total exceeds it, middle items collapse to "…".
 */
export function BreadcrumbNav({
  items,
  separator,
  maxItems,
  className,
  ...props
}: Readonly<BreadcrumbNavProps>) {
  const sep = separator ?? <DefaultSeparator />;

  // Collapse logic
  let displayItems = items;
  let collapsed = false;

  if (maxItems && maxItems > 2 && items.length > maxItems) {
    const head = items.slice(0, 1);
    const tail = items.slice(-(maxItems - 1));
    displayItems = [...head, { label: '…' }, ...tail];
    collapsed = true;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-sm', className)} {...props}>
      <ol className="flex items-center">
        {displayItems.map((item, idx) => {
          const isLast = idx === displayItems.length - 1;
          const isEllipsis = item.label === '…';

          return (
            <li key={`${item.label}-${idx}`} className="flex items-center">
              {idx > 0 && sep}
              {isEllipsis ? (
                <span className="px-1 text-slate-400">…</span>
              ) : isLast || !item.href ? (
                <span
                  className={cn(
                    'flex items-center gap-1 font-medium',
                    isLast ? 'text-slate-900' : 'text-slate-500'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon}
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="flex items-center gap-1 text-slate-500 transition-colors hover:text-indigo-600"
                >
                  {item.icon}
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
