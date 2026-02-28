'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { LanguageSwitcher } from '@aivo/i18n';
import { useAuth } from '../app/providers';

import { AccessibilityControls } from './accessibility-controls';
import { EducatorModeToggle } from './educator-mode-toggle';
import { Sidebar } from './sidebar';

// Links for mobile drawer — mirrors the sidebar groups flattened
const mobileLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/reports', label: 'Reports' },
  { href: '/schools', label: 'Schools' },
  { href: '/classrooms', label: 'Classrooms' },
  { href: '/users', label: 'Users' },
  { href: '/curriculum', label: 'Curriculum' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/ai-models', label: 'AI Models' },
  { href: '/compliance', label: 'Compliance' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/research', label: 'Research' },
  { href: '/devices', label: 'Devices' },
  { href: '/billing', label: 'Billing' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/settings', label: 'Settings' },
];

export function Nav() {
  const pathname = usePathname();
  const { isAuthenticated, userName, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — hidden below md */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile top bar — shown below md */}
      <header className="border-b border-border bg-surface/80 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              A
            </div>
            <span className="text-base font-bold text-text">Aivo District</span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="compact" />
            <AccessibilityControls />
            <button
              className="rounded-md p-2 text-muted hover:bg-surface-muted"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <nav className="border-t border-border bg-surface px-4 pb-4" aria-label="Mobile navigation">
            <ul className="space-y-1 pt-2">
              {mobileLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-surface-muted ${
                      pathname === link.href || pathname.startsWith(link.href + '/')
                        ? 'bg-surface-muted text-text'
                        : 'text-muted'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {isAuthenticated && (
                <li className="py-2">
                  <EducatorModeToggle />
                </li>
              )}
              <li className="border-t border-border pt-2">
                {!isAuthenticated ? (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-muted"
                  >
                    Login
                  </Link>
                ) : (
                  <>
                    <div className="px-3 py-1 text-xs text-muted">
                      Signed in as {userName ?? 'user'}
                    </div>
                    <button
                      type="button"
                      onClick={() => { void logout(); setMobileOpen(false); }}
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-text hover:bg-surface-muted"
                    >
                      Logout
                    </button>
                  </>
                )}
              </li>
            </ul>
          </nav>
        )}
      </header>
    </>
  );
}
