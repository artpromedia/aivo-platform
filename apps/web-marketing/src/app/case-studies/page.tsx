import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'Case Studies | AIVO Learning',
  description: 'Success stories from schools, districts, and families using AIVO.',
};

export default function CaseStudiesPage() {
  return (
    <ComingSoonPage
      title="Case Studies"
      description="Real success stories from schools, districts, and families transforming education with AIVO."
      expectedDate="Q1 2025"
    />
  );
}
