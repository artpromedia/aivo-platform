import type { Metadata } from 'next';

import { PricingPage as PricingPageContent } from '@/components/pages';

export const metadata: Metadata = {
  title: 'Pricing | AIVO Learning',
  description: 'Explore AIVO Learning pricing plans for families, schools, and districts.',
};

export default function PricingPage() {
  return <PricingPageContent />;
}
