/**
 * Root Layout - Web Teacher Application
 */

import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import React from 'react';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Aivo Teacher',
    template: '%s | Aivo Teacher',
  },
  description: 'Teacher portal for Aivo - AI-powered learning platform',
  applicationName: 'Aivo Teacher',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0891B2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable} data-grade-theme="navigator">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
