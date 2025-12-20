import type { Metadata } from 'next';
import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'API Documentation | AIVO Learning',
  description: 'Developer documentation for integrating with AIVO Learning platform.',
};

export default function DocsPage() {
  return (
    <ComingSoonPage
      title="API Documentation"
      description="Developer resources for integrating AIVO into your educational tools and platforms."
      expectedDate="Q2 2025"
    />
  );
}
