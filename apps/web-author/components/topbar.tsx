'use client';

import { Badge } from '@aivo/ui-web';
import Link from 'next/link';

import { useAuth } from '../app/providers';
import { ROLE_LABELS, type ContentRole } from '../lib/types';

export function TopBar() {
  const { isAuthenticated, userId, roles, logout } = useAuth();

  const primaryRole = getPrimaryRole(roles);

  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-4">
        <Link href="/learning-objects" className="flex items-center gap-2">
          <LogoIcon className="h-8 w-8 text-primary" />
          <span className="text-lg font-bold text-text">Aivo Author</span>
        </Link>
      </div>

      {isAuthenticated && (
        <div className="flex items-center gap-4">
          {primaryRole && <Badge tone={getRoleTone(primaryRole)}>{ROLE_LABELS[primaryRole]}</Badge>}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-text">{userId}</div>
              <div className="text-xs text-muted">Content Author</div>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-text"
              aria-label="Sign out"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function getPrimaryRole(roles: ContentRole[]): ContentRole | null {
  if (roles.includes('PLATFORM_ADMIN')) return 'PLATFORM_ADMIN';
  if (roles.includes('DISTRICT_CONTENT_ADMIN')) return 'DISTRICT_CONTENT_ADMIN';
  if (roles.includes('CURRICULUM_REVIEWER')) return 'CURRICULUM_REVIEWER';
  if (roles.includes('CURRICULUM_AUTHOR')) return 'CURRICULUM_AUTHOR';
  return null;
}

function getRoleTone(role: ContentRole): 'info' | 'success' | 'warning' {
  switch (role) {
    case 'PLATFORM_ADMIN':
    case 'DISTRICT_CONTENT_ADMIN':
      return 'warning';
    case 'CURRICULUM_REVIEWER':
      return 'info';
    case 'CURRICULUM_AUTHOR':
    default:
      return 'success';
  }
}

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor">
      <path d="M16 2L4 8v16l12 6 12-6V8L16 2zm0 2.5l9.5 4.75V22l-9.5 4.75L6.5 22V9.25L16 4.5z" />
      <path d="M16 10a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
      />
    </svg>
  );
}
