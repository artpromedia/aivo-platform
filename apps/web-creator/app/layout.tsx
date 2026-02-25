import { getLocale, getDirection } from '@aivo/i18n/server';
import { FloatingLanguageSwitcher } from './floating-language-switcher';
import type { Metadata } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

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
  title: 'Aivo Creator Portal',
  description: 'Create and manage marketplace content for Aivo',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={getDirection(locale)} className={`${dmSans.variable} ${plusJakartaSans.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <FloatingLanguageSwitcher />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
