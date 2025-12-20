import type { Metadata } from 'next';

import { HelpCenterPage } from '@/components/pages/help-center-page';

export const metadata: Metadata = {
  title: 'Help Center | AIVO Learning',
  description:
    'Find answers to common questions about AIVO Learning. Browse our help articles, tutorials, and guides.',
};

export default function HelpCenter() {
  return <HelpCenterPage />;
}
