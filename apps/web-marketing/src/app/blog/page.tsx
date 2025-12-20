import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'Blog | AIVO Learning',
  description:
    'Insights, tips, and stories about neurodiverse education and personalized learning.',
};

export default function BlogPage() {
  return (
    <ComingSoonPage
      title="AIVO Blog"
      description="Expert insights on neurodiverse education, learning science, and teaching strategies."
      expectedDate="Q1 2025"
    />
  );
}
