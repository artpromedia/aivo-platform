import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Nav } from '../components/nav';
import { Providers, type AuthState } from '../components/providers';
import { getAuthSession } from '../lib/auth';

import './globals.css';

export const metadata: Metadata = {
  title: 'Aivo Teacher Portal',
  description: 'Teacher dashboard for Aivo learning platform',
};

/**
 * Root Layout with Web Push Support
 *
 * Addresses RE-AUDIT-005: Web Teacher/Parent Apps Lack Push Notifications
 * Enterprise UI Audit: RE-AUDIT-AUTH-001 - Added auth session to providers
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getAuthSession();

  // Derive display fields from AuthSession
  const userName = session?.name ?? null;
  const userEmail = session?.email ?? null;
  const userInitials = userName
    ? userName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : null;
  const userRole = session?.roles[0] ?? null;

  const initialAuth: AuthState = session
    ? {
        isAuthenticated: true,
        userId: session.userId,
        tenantId: session.tenantId,
        userName,
        userEmail,
        userInitials,
        userRole,
        roles: session.roles,
      }
    : {
        isAuthenticated: false,
        userId: null,
        tenantId: null,
        userName: null,
        userEmail: null,
        userInitials: null,
        userRole: null,
        roles: [],
      };

  return (
    <html lang="en" data-grade-theme="navigator">
      <body className="min-h-screen bg-background text-text antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers initialAuth={initialAuth}>
          <Nav />
          <main
            id="main-content"
            className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6"
            tabIndex={-1}
          >
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
