import type { Role } from '@aivo/ts-rbac';
import { AccessibilityProvider, GradeThemeProvider } from '@aivo/ui-web';
import type { Metadata } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import { Nav } from '../components/nav';
import { getAuthSession } from '../lib/auth';
import { EducatorModeProvider } from '../lib/educator-mode';

import { AuthProvider, RootProviders } from './providers';

import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
});

export const metadata: Metadata = {
  title: 'Aivo District Admin',
  description: 'District administration portal',
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const auth = await getAuthSession();
  const initialAuth = {
    isAuthenticated: !!auth,
    userName: auth?.userId ?? null,
    roles: (auth?.roles ?? []) as Role[],
    tenantId: auth?.tenantId ?? null,
    accessToken: auth?.accessToken ?? null,
  };

  return (
    <html lang="en" className={`${dmSans.variable} ${plusJakartaSans.variable}`} data-grade-theme="navigator">
      <body className="min-h-screen bg-background font-sans text-text antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <RootProviders>
          <GradeThemeProvider gradeLevel="MS">
            <AccessibilityProvider>
              <AuthProvider initialAuth={initialAuth}>
                <EducatorModeProvider>
                  <Nav />
                  <main
                    id="main-content"
                    className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6"
                  >
                    {children}
                  </main>
                </EducatorModeProvider>
              </AuthProvider>
            </AccessibilityProvider>
          </GradeThemeProvider>
        </RootProviders>
      </body>
    </html>
  );
}
