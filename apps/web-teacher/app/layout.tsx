import { GradeThemeProvider, AccessibilityProvider } from '@aivo/ui-web';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Nav } from '../components/nav';

import './globals.css';

export const metadata: Metadata = {
  title: 'Aivo Teacher Portal',
  description: 'Teacher dashboard for Aivo learning platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-grade-theme="G6_8">
      <body className="min-h-screen bg-background text-text antialiased">
        <GradeThemeProvider initialGrade="G6_8">
          <AccessibilityProvider>
            <Nav />
            <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">{children}</main>
          </AccessibilityProvider>
        </GradeThemeProvider>
      </body>
    </html>
  );
}
