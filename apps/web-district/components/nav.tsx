'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '../app/providers';

import { AccessibilityControls } from './accessibility-controls';
import { EducatorModeToggle } from './educator-mode-toggle';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/schools', label: 'Schools' },
  { href: '/privacy', label: 'Privacy & Consent' },
];

export function Nav() {
  const pathname = usePathname();
  const { isAuthenticated, userName, logout } = useAuth();

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold">Aivo District Admin</div>
          {isAuthenticated && <EducatorModeToggle />}
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium">
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
        <div className="flex flex-col items-end gap-2">
          <AccessibilityControls />
          <div className="text-xs text-muted">
            {isAuthenticated ? `Signed in as ${userName ?? 'user'}` : 'Guest'}
          </div>
        </div>
      </div>
    </header>
  );
}
