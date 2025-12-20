import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'For Schools | AIVO Learning',
  description:
    'AIVO school solutions for implementing personalized learning across your institution.',
};

export default function ForSchoolsPage() {
  return (
    <ComingSoonPage
      title="For Schools"
      description="Implement personalized learning across your school with AIVO's comprehensive platform."
      expectedDate="Q1 2025"
    />
  );
}
