'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { LanguageSwitcher } from '@aivo/i18n';
import { useAuth } from '../app/providers';

import { AccessibilityControls } from './accessibility-controls';
import { EducatorModeToggle } from './educator-mode-toggle';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/schools', label: 'Schools' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/research', label: 'Research Portal' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/privacy', label: 'Privacy & Consent' },
  { href: '/integrations/sis', label: 'SIS Integration' },
  { href: '/settings/sso', label: 'SSO Settings' },
];

export function Nav() {
  const pathname = usePathname();
  const { isAuthenticated, userName, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold">Aivo District Admin</div>
          {isAuthenticated && <span className="hidden lg:inline"><EducatorModeToggle /></span>}
        </div>

        {/* Mobile hamburger */}
        <button
          className="rounded-md p-2 text-muted hover:bg-surface-muted md:hidden"
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

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 text-sm font-medium md:flex" aria-label="Main navigation">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 transition hover:bg-surface-muted ${
                  active ? 'bg-surface-muted text-text' : 'text-muted'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {!isAuthenticated && (
            <Link
              href="/login"
              className={`rounded-lg px-3 py-2 transition hover:bg-surface-muted ${
                pathname === '/login' ? 'bg-surface-muted text-text' : 'text-muted'
              }`}
            >
              Login
            </Link>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-text transition hover:bg-surface-muted"
            >
              Logout
            </button>
          )}
        </nav>
        <div className="hidden flex-col items-end gap-2 md:flex">
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="compact" />
            <AccessibilityControls />
          </div>
          <div className="text-xs text-muted">
            {isAuthenticated ? `Signed in as ${userName ?? 'user'}` : 'Guest'}
          </div>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <nav className="border-t border-border bg-surface px-4 pb-4 md:hidden" aria-label="Mobile navigation">
          <ul className="space-y-1 pt-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-surface-muted ${
                    pathname === link.href ? 'bg-surface-muted text-text' : 'text-muted'
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
              <AccessibilityControls />
            </li>
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
  );
}
