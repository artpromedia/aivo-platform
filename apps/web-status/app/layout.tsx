import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIVO Status',
  description: 'Real-time status and uptime information for the AIVO Learning Platform',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'AIVO Status',
    description: 'Real-time service status for the AIVO Learning Platform',
    siteName: 'AIVO Status',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-aivo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">AIVO Status</span>
            </a>
            <nav className="flex items-center gap-6 text-sm">
              <a href="/" className="text-gray-600 hover:text-gray-900 transition-colors">Status</a>
              <a href="/incidents" className="text-gray-600 hover:text-gray-900 transition-colors">Incidents</a>
              <a href="/maintenance" className="text-gray-600 hover:text-gray-900 transition-colors">Maintenance</a>
              <a href="/subscribe" className="text-aivo-600 hover:text-aivo-700 font-medium transition-colors">Subscribe</a>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white mt-16">
          <div className="mx-auto max-w-4xl px-4 py-6 flex items-center justify-between text-sm text-gray-500">
            <span>&copy; {new Date().getFullYear()} AIVO Learning Platform</span>
            <div className="flex items-center gap-4">
              <a href="/api/feed.atom" className="hover:text-gray-700 transition-colors">
                RSS Feed
              </a>
              <a
                href="https://aivolearning.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 transition-colors"
              >
                aivolearning.com
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
