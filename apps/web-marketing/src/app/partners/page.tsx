import type { Metadata } from 'next';

import { PartnersPage as PartnersPageContent } from '@/components/pages';

export const metadata: Metadata = {
  title: 'Partners | AIVO Learning',
  description: 'Partner with AIVO Learning to bring personalized education to more learners.',
};

export default function PartnersPage() {
  return <PartnersPageContent />;
}
