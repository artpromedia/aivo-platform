import { AccessibilityProvider, GradeThemeProvider } from '@aivo/ui-web';
import { getLocale, getDirection } from '@aivo/i18n/server';
import type { Metadata } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import { Sidebar } from '../components/sidebar';
import { TopBar } from '../components/topbar';
import { getAuthSession } from '../lib/auth';
import { ToastProvider } from '../lib/toast';

import { AuthProvider } from './providers';

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
  title: 'Aivo Author',
  description: 'Content authoring platform for learning objects',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [auth, locale] = await Promise.all([getAuthSession(), getLocale()]);
  const initialAuth = {
    isAuthenticated: !!auth,
    userId: auth?.userId ?? null,
    roles: auth?.roles ?? [],
    tenantId: auth?.tenantId ?? null,
  };

  return (
    <html lang={locale} dir={getDirection(locale)} className={`${dmSans.variable} ${plusJakartaSans.variable}`} data-grade-theme="navigator">
      <body className="min-h-screen bg-background font-sans text-text antialiased">
        <GradeThemeProvider gradeLevel="MS">
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
