'use client';

import { Map, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';

interface SitemapLink {
  href: string;
  badge?: string;
  external?: boolean;
}

const categoryKeys = [
  'mainPages',
  'featuresSolutions',
  'resources',
  'company',
  'legal',
  'account',
] as const;

const sitemapLinks: Record<string, SitemapLink[]> = {
  mainPages: [
    { href: '/' },
    { href: '/about' },
    { href: '/contact' },
    { href: '/pricing' },
    { href: '/how-it-works' },
    { href: '/demo' },
  ],
  featuresSolutions: [
    { href: '/#features' },
    { href: '/features/parents' },
    { href: '/features/teachers' },
    { href: '/features/students' },
    { href: '/features/schools' },
    { href: '/features/districts' },
    { href: '/features/homeschool' },
    { href: '/aivo-pad', badge: 'New' },
  ],
  resources: [
    { href: '/help' },
    { href: '/blog' },
    { href: '/research' },
    { href: '/case-studies' },
    { href: '/webinars' },
    { href: '/docs', external: true },
  ],
  company: [
    { href: '/about' },
    { href: '/careers', badge: 'Hiring' },
    { href: '/press' },
    { href: '/partners' },
    { href: '/contact' },
  ],
  legal: [
    { href: '/privacy' },
    { href: '/terms' },
    { href: '/cookies' },
    { href: '/compliance/coppa' },
    { href: '/compliance/ferpa' },
    { href: '/accessibility-statement' },
  ],
  account: [
    { href: 'https://app.aivolearning.com/join', external: true },
    { href: 'https://parent.aivolearning.com/register', external: true },
    { href: 'https://app.aivolearning.com/dashboard', external: true },
  ],
};

export function SitemapPageContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <Badge variant="primary" className="mb-4">
              <Map className="w-3 h-3 mr-1" />
              {t('sitemapPage.badge')}
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('sitemapPage.heading')}
            </h1>
            <p className="text-gray-600">{t('sitemapPage.description')}</p>
          </div>

          {/* Sitemap Grid */}
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {categoryKeys.map((catKey) => {
                const links = sitemapLinks[catKey];
                const linkTitles = t(`sitemapPage.categories.${catKey}.links`, {
                  returnObjects: true,
                }) as string[];

                return (
                  <div key={catKey}>
                    <h2 className="font-display text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      {t(`sitemapPage.categories.${catKey}.title`)}
                    </h2>
                    <ul className="space-y-2">
                      {links.map((link, i) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-theme-primary-600 transition-colors"
                            {...(link.external && {
                              target: '_blank',
                              rel: 'noopener noreferrer',
                            })}
                          >
                            {linkTitles[i]}
                            {link.badge && (
                              <Badge
                                variant={link.badge === 'New' ? 'success' : 'primary'}
                                size="sm"
                              >
                                {link.badge}
                              </Badge>
                            )}
                            {link.external && (
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* XML Sitemap Link */}
          <div className="max-w-4xl mx-auto mt-16 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {t('sitemapPage.xmlSitemapPrefix')}{' '}
              <a
                href="/sitemap.xml"
                className="text-theme-primary-600 hover:underline"
                target="_blank"
              >
                {t('sitemapPage.xmlSitemapLink')}
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
