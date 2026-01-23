import { AccessibilityProvider, GradeThemeProvider } from '@aivo/ui-web';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Nav } from '../components/nav';
import { getAuthSession } from '../lib/auth';
import { EducatorModeProvider } from '../lib/educator-mode';

import { AuthProvider, RootProviders } from './providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Aivo District Admin',
  description: 'District administration portal',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthSession();
  const initialAuth = {
    isAuthenticated: !!auth,
    userName: auth?.userId ?? null,
    roles: auth?.roles ?? [],
    tenantId: auth?.tenantId ?? null,
  };

  return (
    <html lang="en" data-grade-theme="navigator">
      <body className="min-h-screen bg-background text-text antialiased">
        <RootProviders>
          <GradeThemeProvider initialTheme="navigator">
            <AccessibilityProvider>
              <AuthProvider initialAuth={initialAuth}>
                <EducatorModeProvider>
                  <Nav />
                  <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">{children}</main>
                </EducatorModeProvider>
              </AuthProvider>
            </AccessibilityProvider>
          </GradeThemeProvider>
        </RootProviders>
      </body>
    </html>
  );
}
