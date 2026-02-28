'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';

import { LanguageSwitcher } from '@aivo/i18n';
import { useAuth } from '../app/providers';

// ──────────────────────────────────────────────────────────────────────────────
// Navigation structure
// ──────────────────────────────────────────────────────────────────────────────

interface NavLink {
  href: string;
  label: string;
}

interface NavGroup {
  label: string;
  children: NavLink[];
}

type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return 'children' in item;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tenants', label: 'Tenants' },
  { href: '/billing', label: 'Billing' },
  {
    label: 'AI',
    children: [
      { href: '/ai/incidents', label: 'Incidents' },
      { href: '/ai/usage', label: 'Usage' },
    ],
  },
  { href: '/marketplace', label: 'Marketplace' },
  {
    label: 'Governance',
    children: [
      { href: '/compliance', label: 'Compliance' },
      { href: '/legal-holds', label: 'Legal Holds' },
      { href: '/soc2', label: 'SOC 2' },
      { href: '/audit', label: 'Audit Log' },
    ],
  },
  { href: '/flags', label: 'Feature Flags' },
];

// ──────────────────────────────────────────────────────────────────────────────
// Desktop dropdown component
// ──────────────────────────────────────────────────────────────────────────────

function NavDropdown({ group, isActive }: { group: NavGroup; isActive: (href: string) => boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const groupActive = group.children.some((c) => isActive(c.href));

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); }}
        className={`inline-flex items-center gap-1 rounded px-3 py-2 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground ${
          groupActive ? 'bg-primary/10 text-primary' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {group.label}
        <svg className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-surface shadow-lg">
          <ul className="py-1">
            {group.children.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={() => { setOpen(false); }}
                  className={`block px-4 py-2 text-sm transition hover:bg-surface-muted ${
                    isActive(child.href)
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {child.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main nav
// ──────────────────────────────────────────────────────────────────────────────

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
          onClick={() => { setMobileOpen(!mobileOpen); }}
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
        <nav className="hidden items-center gap-1 text-sm font-medium md:flex" aria-label="Main navigation">
          {navItems.map((item) =>
            isGroup(item) ? (
              <NavDropdown key={item.label} group={item} isActive={isActive} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-2 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground ${
                  isActive(item.href) ? 'bg-primary/10 text-primary' : ''
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
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
              onClick={() => { void logout(); }}
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
            {navItems.map((item) =>
              isGroup(item) ? (
                <li key={item.label}>
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {item.label}
                  </div>
                  <ul className="space-y-0.5">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={() => { setMobileOpen(false); }}
                          className={`block rounded-md px-3 py-2.5 pl-6 text-sm font-medium transition hover:bg-surface-muted ${
                            isActive(child.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => { setMobileOpen(false); }}
                    className={`block rounded-md px-3 py-2.5 text-sm font-medium transition hover:bg-surface-muted ${
                      isActive(item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
            <li className="border-t border-border pt-2">
              {!isAuthenticated ? (
                <Link
                  href="/login"
                  onClick={() => { setMobileOpen(false); }}
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
