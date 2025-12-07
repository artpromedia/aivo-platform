'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '../app/providers';

const links = [
  { href: '/tenants', label: 'Tenants' },
  { href: '/flags', label: 'Feature Flags' },
];

export function Nav() {
  const pathname = usePathname();
  const { isAuthenticated, userName, logout } = useAuth();
  return (
    <header className="border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="text-lg font-semibold">Aivo Platform Admin</div>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded px-3 py-2 transition hover:bg-slate-100 ${
                pathname === link.href ? 'bg-slate-200' : ''
              }`}
            >
              {link.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <Link
              href="/login"
              className={`rounded px-3 py-2 transition hover:bg-slate-100 ${pathname === '/login' ? 'bg-slate-200' : ''}`}
            >
              Login
            </Link>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              Logout
            </button>
          )}
        </nav>
        <div className="text-xs text-slate-600">
          {isAuthenticated ? `Signed in as ${userName ?? 'user'}` : 'Internal admin access'}
        </div>
      </div>
    </header>
  );
}
