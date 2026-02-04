import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { organizationSchema, platformSchema, SchemaScript } from '@/lib/schema-org';
import './globals.css';

// Fonts
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

// Metadata
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_MARKETING_URL || 'https://aivolearning.com'),
  title: {
    default: 'AIVO Learning — AI-Powered Personalized Education for Neurodiverse Learners',
    template: '%s | AIVO Learning',
  },
  description:
    'AIVO uses Virtual Brain AI tutors to personalize K-12 education for neurodiverse learners. Features include real-time IEP tracking, adaptive lessons for ADHD, autism, and dyslexia, FERPA-compliant progress monitoring, and 24/7 AI tutoring support.',
  keywords: [
    'AIVO Learning',
    'AI tutoring for ADHD students',
    'autism education software',
    'dyslexia learning platform',
    'virtual brain AI',
    'personalized learning neurodiverse',
    'IEP goal tracking software',
    'special education technology',
    'adaptive learning platform',
    'K-12 AI tutor',
    'learning differences support',
    'executive function training',
    'multi-sensory learning',
    'FERPA compliant education',
    'COPPA compliant learning app',
    'UDL learning platform',
    'differentiated instruction software',
    'neurodiversity education',
    'inclusive learning technology',
  ],
  authors: [{ name: 'AIVO Learning', url: 'https://aivolearning.com' }],
  creator: 'AIVO Learning',
  publisher: 'AIVO Learning',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://aivolearning.com',
    siteName: 'AIVO Learning',
    title: 'AIVO Learning — Where Every Mind Thrives',
    description:
      "AI-powered personalized learning for neurodiverse K-12 students. Virtual Brain technology adapts to your child's unique way of thinking.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AIVO Learning - Personalized AI Education',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AIVO Learning — Where Every Mind Thrives',
    description: 'AI-powered personalized learning for neurodiverse K-12 students.',
    site: '@aivolearning',
    creator: '@aivolearning',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicons/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/aivo-icon-purple.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/aivo-icon-purple.svg', type: 'image/svg+xml' }],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://aivolearning.com',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#18181B' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Enhanced Schema.org JSON-LD for GEO */}
        <SchemaScript schema={organizationSchema} />
        <SchemaScript schema={platformSchema} />
      </head>
      <body className="min-h-screen bg-white font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>

        {/* Analytics */}
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === 'true' && <Analytics />}
        <SpeedInsights />
      </body>
    </html>
  );
}
