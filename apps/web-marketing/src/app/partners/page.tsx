import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'Partners | AIVO Learning',
  description: 'Partner with AIVO Learning to bring personalized education to more learners.',
};

export default function PartnersPage() {
  return (
    <ComingSoonPage
      title="Partner With Us"
      description="Join our network of educational partners, resellers, and integration partners."
      expectedDate="Q1 2025"
    />
  );
}
