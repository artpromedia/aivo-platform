import { getLocale, getDirection } from '@aivo/i18n/server';
import type { Metadata } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Aivo Developer Portal',
  description: 'Documentation, APIs, and tools for integrating with the Aivo learning platform',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={getDirection(locale)}>
      <body className={`${dmSans.variable} ${plusJakartaSans.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
