/**
 * Teacher Dashboard Layout
 *
 * Main layout with sidebar navigation (responsive)
 */

'use client';

import * as React from 'react';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — hidden on mobile unless mobileOpen */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transition-transform duration-300
        md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => {
            setSidebarCollapsed(!sidebarCollapsed);
          }}
        />
      </div>

      <div
        className="transition-all duration-300 md:ml-16 lg:ml-64"
        style={{
          marginLeft: undefined, // responsive classes handle this
        }}
      >
        {/* Inject mobile hamburger into header area */}
        <div className="sticky top-0 z-20">
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="m-2 rounded-md p-2 text-muted-foreground hover:bg-surface-muted"
              aria-label="Open navigation menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          <Header />
        </div>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
