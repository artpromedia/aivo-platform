'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { LanguageSwitcher } from '@aivo/i18n';
import { useAuth } from '../app/providers';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tenants', label: 'Tenants' },
  { href: '/billing', label: 'Billing' },
  { href: '/ai/incidents', label: 'AI Incidents' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/compliance', label: 'Compliance' },
  { href: '/flags', label: 'Feature Flags' },
];

export function Nav() {
  const pathname = usePathname();
  const { isAuthenticated, userName, logout } = useAuth();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="text-lg font-semibold text-foreground">Aivo Platform Admin</div>

        {/* Mobile hamburger */}
        <button
          className="rounded-md p-2 text-muted-foreground hover:bg-surface-muted md:hidden"
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
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded px-3 py-2 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground ${
                isActive(link.href) ? 'bg-primary/10 text-primary' : ''
              }`}
            >
              {link.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <Link
              href="/login"
              className={`rounded px-3 py-2 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground ${pathname === '/login' ? 'bg-primary/10 text-primary' : ''}`}
            >
              Login
            </Link>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
            >
              Logout
            </button>
          )}
        </nav>
        <div className="hidden items-center gap-3 text-xs text-muted-foreground md:flex">
          <LanguageSwitcher variant="compact" />
          <span>{isAuthenticated ? `Signed in as ${userName ?? 'user'}` : 'Internal admin access'}</span>
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
                  className={`block rounded-md px-3 py-2.5 text-sm font-medium transition hover:bg-surface-muted ${
                    isActive(link.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="border-t border-border pt-2">
              {!isAuthenticated ? (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-muted"
                >
                  Login
                </Link>
              ) : (
                <>
                  <div className="px-3 py-1 text-xs text-muted-foreground/70">
                    Signed in as {userName ?? 'user'}
                  </div>
                  <button
                    type="button"
                    onClick={() => { void logout(); setMobileOpen(false); }}
                    className="block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-surface-muted"
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
