import { getLocale, getDirection } from '@aivo/i18n/server';
import { FloatingLanguageSwitcher } from './floating-language-switcher';
import type { Metadata } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'AIVO Parent Portal',
  description: 'Monitor your child\'s learning progress and communicate with teachers',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={getDirection(locale)} suppressHydrationWarning>
      <body className={`${dmSans.variable} ${plusJakartaSans.variable} font-sans`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>
          <FloatingLanguageSwitcher />
          {children}
        </Providers>
      </body>
    </html>
  );
}
