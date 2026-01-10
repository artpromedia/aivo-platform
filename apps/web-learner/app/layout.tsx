import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'AIVO Learning',
  description: 'Personalized learning experience for every student',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-grade-theme="explorer">
      <body className="min-h-screen bg-background text-text antialiased">
        {children}
      </body>
    </html>
  );
}
