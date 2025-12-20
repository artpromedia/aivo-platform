import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'Homeschool Solutions | AIVO Learning',
  description: 'AIVO homeschool solutions for personalized at-home education.',
};

export default function HomeschoolPage() {
  return (
    <ComingSoonPage
      title="Homeschool Solutions"
      description="Complete curriculum and tools for homeschooling families with neurodiverse learners."
      expectedDate="Q1 2025"
    />
  );
}
