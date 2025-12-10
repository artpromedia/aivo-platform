import { AccessibilityProvider, GradeThemeProvider } from '@aivo/ui-web';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Sidebar } from '../components/sidebar';
import { TopBar } from '../components/topbar';
import { getAuthSession } from '../lib/auth';
import { ToastProvider } from '../lib/toast';

import { AuthProvider } from './providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Aivo Author',
  description: 'Content authoring platform for learning objects',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthSession();
  const initialAuth = {
    isAuthenticated: !!auth,
    userId: auth?.userId ?? null,
    roles: auth?.roles ?? [],
    tenantId: auth?.tenantId ?? null,
  };

  return (
    <html lang="en" data-grade-theme="G6_8">
      <body className="min-h-screen bg-background text-text antialiased">
        <GradeThemeProvider initialGrade="G6_8">
          <AccessibilityProvider>
            <AuthProvider initialAuth={initialAuth}>
              <ToastProvider>
                <TopBar />
                <Sidebar />
                <main className="ml-56 mt-14 min-h-[calc(100vh-3.5rem)] p-6">{children}</main>
              </ToastProvider>
            </AuthProvider>
          </AccessibilityProvider>
        </GradeThemeProvider>
      </body>
    </html>
  );
}
