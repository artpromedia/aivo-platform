import type { Metadata } from 'next';

import { CaseStudiesPage as CaseStudiesPageContent } from '@/components/pages';

export const metadata: Metadata = {
  title: 'Case Studies | AIVO Learning',
  description: 'Success stories from schools, districts, and families using AIVO.',
};

export default function CaseStudiesPage() {
  return <CaseStudiesPageContent />;
}
