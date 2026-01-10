/**
 * Teacher Dashboard Layout
 *
 * Main layout with sidebar navigation
 */

'use client';

import * as React from 'react';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => {
          setSidebarCollapsed(!sidebarCollapsed);
        }}
      />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '64px' : '256px' }}
      >
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
