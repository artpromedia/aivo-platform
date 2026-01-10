import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Nav } from '../components/nav';
import { Providers } from '../components/providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Aivo Teacher Portal',
  description: 'Teacher dashboard for Aivo learning platform',
};

/**
 * Root Layout with Web Push Support
 *
 * Addresses RE-AUDIT-005: Web Teacher/Parent Apps Lack Push Notifications
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-grade-theme="navigator">
      <body className="min-h-screen bg-background text-text antialiased">
        <Providers>
          <Nav />
          <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
