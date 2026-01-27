import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { Providers } from './providers';
import { PWAComponents } from '../components/PWAInstallBanner';

export const metadata: Metadata = {
  title: 'AIVO Learning',
  description: 'Personalized learning experience for every student',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AIVO Learning',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'AIVO Learning',
    title: 'AIVO Learning',
    description: 'Personalized learning experience for every student',
  },
  twitter: {
    card: 'summary',
    title: 'AIVO Learning',
    description: 'Personalized learning experience for every student',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3B82F6' },
    { media: '(prefers-color-scheme: dark)', color: '#1E40AF' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-grade-theme="explorer">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-screen bg-background text-text antialiased">
        <Providers>
          {children}
          <PWAComponents />
        </Providers>
      </body>
    </html>
  );
}
