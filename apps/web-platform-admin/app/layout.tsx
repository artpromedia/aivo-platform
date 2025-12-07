import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Nav } from '../components/nav';
import { getAuthSession } from '../lib/auth';

import { AuthProvider } from './providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Aivo Platform Admin',
  description: 'Internal platform administration',
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
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <AuthProvider initialAuth={initialAuth}>
          <Nav />
          <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
