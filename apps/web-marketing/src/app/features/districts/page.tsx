import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'For Districts | AIVO Learning',
  description: 'AIVO district-wide solutions for transforming education at scale.',
};

export default function ForDistrictsPage() {
  return (
    <ComingSoonPage
      title="For Districts"
      description="Transform education district-wide with AIVO's scalable, data-driven platform."
      expectedDate="Q1 2025"
    />
  );
}
