'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface Tab {
  label: string;
  href: string;
  segment: string | null;
}

interface ProfileTabsProps {
  baseUrl: string;
  children: ReactNode;
}

export function ProfileTabs({ baseUrl, children }: ProfileTabsProps) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { label: 'Overview', href: baseUrl, segment: null },
    { label: 'Goals', href: `${baseUrl}/goals`, segment: 'goals' },
    { label: 'Plans & Notes', href: `${baseUrl}/plans-notes`, segment: 'plans-notes' },
  ];

  const getCurrentSegment = () => {
    if (pathname.endsWith('/goals')) return 'goals';
    if (pathname.endsWith('/plans-notes')) return 'plans-notes';
    return null;
  };

  const currentSegment = getCurrentSegment();

  return (
    <div className="flex flex-col gap-6">
      {/* Tab navigation */}
      <nav
        role="tablist"
        aria-label="Learner profile sections"
        className="flex gap-1 border-b border-border"
      >
        {tabs.map((tab) => {
          const isActive = tab.segment === currentSegment;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'px-4 py-3 text-sm font-medium transition-colors',
                'border-b-2 -mb-px',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-text hover:border-border'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Tab content */}
      <div role="tabpanel" className="min-h-[400px]">
        {children}
      </div>
    </div>
  );
}
