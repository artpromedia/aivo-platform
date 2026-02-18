import type { Role } from '@aivo/ts-rbac';
import type { Metadata } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import { Nav } from '../components/nav';
import { getAuthSession } from '../lib/auth';

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
  title: 'Aivo Platform Admin',
  description: 'Internal platform administration',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthSession();
  const initialAuth = {
    isAuthenticated: !!auth,
    userName: auth?.userId ?? null,
    roles: (auth?.roles ?? []) as Role[],
    tenantId: auth?.tenantId ?? null,
  };

  return (
    <html lang="en" className={`${dmSans.variable} ${plusJakartaSans.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <AuthProvider initialAuth={initialAuth}>
          <Nav />
          <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
