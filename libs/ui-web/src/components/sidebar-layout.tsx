'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

export interface SidebarLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** Sidebar element */
  sidebar: ReactNode;
  /** Optional top bar element */
  topBar?: ReactNode;
}

/**
 * Layout wrapper combining a sidebar with a content area.
 *
 * ```
 * ┌─────────┬──────────────────────────┐
 * │         │  Top Bar                 │
 * │ Sidebar ├──────────────────────────┤
 * │         │  Content (children)      │
 * │         │                          │
 * └─────────┴──────────────────────────┘
 * ```
 */
export function SidebarLayout({
  sidebar,
  topBar,
  className,
  children,
  ...props
}: Readonly<SidebarLayoutProps>) {
  return (
    <div className={cn('flex h-screen overflow-hidden bg-slate-50', className)} {...props}>
      {sidebar}
      <div className="flex flex-1 flex-col overflow-hidden">
        {topBar}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
