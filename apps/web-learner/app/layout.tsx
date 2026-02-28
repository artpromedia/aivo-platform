import { getLocale, getDirection } from '@aivo/i18n/server';
import type { Metadata } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';
import { Providers } from './providers';

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
  title: 'AIVO Learning',
  description: 'Personalized learning experience for every student',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={getDirection(locale)} className={`${dmSans.variable} ${plusJakartaSans.variable}`} data-grade-theme="explorer">
      <body className="min-h-screen bg-background font-sans text-text antialiased">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
