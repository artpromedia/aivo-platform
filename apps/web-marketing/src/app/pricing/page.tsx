import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'Pricing | AIVO Learning',
  description: 'Explore AIVO Learning pricing plans for families, schools, and districts.',
};

export default function PricingPage() {
  return (
    <ComingSoonPage
      title="Pricing Plans"
      description="Flexible pricing for families, educators, and institutions. Contact us at sales@aivo.app for pricing information."
      expectedDate="Contact Sales"
    />
  );
}
