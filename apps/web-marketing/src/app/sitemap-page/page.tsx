import { Map, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Sitemap | AIVO Learning',
  description:
    'Navigate all pages on the AIVO Learning website. Find features, resources, legal pages, and more.',
};

interface SitemapLink {
  title: string;
  href: string;
  badge?: string;
  external?: boolean;
}

const sitemapData: Record<string, SitemapLink[]> = {
  'Main Pages': [
    { title: 'Home', href: '/' },
    { title: 'About Us', href: '/about' },
    { title: 'Contact', href: '/contact' },
    { title: 'Pricing', href: '/pricing' },
    { title: 'How It Works', href: '/how-it-works' },
    { title: 'Schedule Demo', href: '/demo' },
  ],
  'Features & Solutions': [
    { title: 'All Features', href: '/#features' },
    { title: 'For Parents', href: '/features/parents' },
    { title: 'For Teachers', href: '/features/teachers' },
    { title: 'For Students', href: '/features/students' },
    { title: 'For Schools', href: '/features/schools' },
    { title: 'For Districts', href: '/features/districts' },
    { title: 'Homeschool', href: '/features/homeschool' },
    { title: 'AIVO Pad', href: '/aivo-pad', badge: 'New' },
  ],
  Resources: [
    { title: 'Help Center', href: '/help' },
    { title: 'Blog', href: '/blog' },
    { title: 'Research', href: '/research' },
    { title: 'Case Studies', href: '/case-studies' },
    { title: 'Webinars', href: '/webinars' },
    { title: 'API Documentation', href: '/docs', external: true },
  ],
  Company: [
    { title: 'About Us', href: '/about' },
    { title: 'Careers', href: '/careers', badge: 'Hiring' },
    { title: 'Press', href: '/press' },
    { title: 'Partners', href: '/partners' },
    { title: 'Contact', href: '/contact' },
  ],
  Legal: [
    { title: 'Privacy Policy', href: '/privacy' },
    { title: 'Terms of Service', href: '/terms' },
    { title: 'Cookie Policy', href: '/cookies' },
    { title: 'COPPA Compliance', href: '/compliance/coppa' },
    { title: 'FERPA Compliance', href: '/compliance/ferpa' },
    { title: 'Accessibility Statement', href: '/accessibility-statement' },
  ],
  Account: [
    { title: 'Login', href: '/login', external: true },
    { title: 'Register', href: '/register', external: true },
    { title: 'Dashboard', href: '/dashboard', external: true },
  ],
};

export default function SitemapPage() {
  return (
    <>
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <Badge variant="primary" className="mb-4">
              <Map className="w-3 h-3 mr-1" />
              Navigation
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Sitemap
            </h1>
            <p className="text-gray-600">Find your way around the AIVO Learning website.</p>
          </div>

          {/* Sitemap Grid */}
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Object.entries(sitemapData).map(([category, links]) => (
                <div key={category}>
                  <h2 className="font-display text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    {category}
                  </h2>
                  <ul className="space-y-2">
                    {links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="inline-flex items-center gap-2 text-gray-600 hover:text-theme-primary-600 transition-colors"
                          {...(link.external && {
                            target: '_blank',
                            rel: 'noopener noreferrer',
                          })}
                        >
                          {link.title}
                          {link.badge && (
                            <Badge variant={link.badge === 'New' ? 'success' : 'primary'} size="sm">
                              {link.badge}
                            </Badge>
                          )}
                          {link.external && <ExternalLink className="w-3 h-3 text-gray-400" />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* XML Sitemap Link */}
          <div className="max-w-4xl mx-auto mt-16 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Looking for our XML sitemap for search engines?{' '}
              <a
                href="/sitemap.xml"
                className="text-theme-primary-600 hover:underline"
                target="_blank"
              >
                View sitemap.xml
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
