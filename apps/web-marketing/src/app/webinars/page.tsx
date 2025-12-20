import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'Webinars | AIVO Learning',
  description: 'Live and on-demand webinars about neurodiverse education and AIVO platform.',
};

export default function WebinarsPage() {
  return (
    <ComingSoonPage
      title="Webinars"
      description="Join live sessions and watch recordings from education experts and AIVO specialists."
      expectedDate="Q1 2025"
    />
  );
}
