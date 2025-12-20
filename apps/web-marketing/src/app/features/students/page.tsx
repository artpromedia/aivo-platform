import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'For Students | AIVO Learning',
  description: 'Discover how AIVO helps students learn in ways that work for their unique brains.',
};

export default function ForStudentsPage() {
  return (
    <ComingSoonPage
      title="For Students"
      description="Learn how AIVO makes learning fun, personalized, and accessible for every type of learner."
      expectedDate="Q1 2025"
    />
  );
}
