import type { Metadata } from 'next';

import { SitemapPageContent } from '@/components/pages/sitemap-page-content';

export const metadata: Metadata = {
  title: 'Sitemap | AIVO Learning',
  description:
    'Navigate all pages on the AIVO Learning website. Find features, resources, legal pages, and more.',
};

export default function SitemapPage() {
  return <SitemapPageContent />;
}
