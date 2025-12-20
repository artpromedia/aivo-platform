import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'How It Works | AIVO Learning',
  description:
    'Learn how AIVO uses AI to create personalized learning experiences for neurodiverse students.',
};

export default function HowItWorksPage() {
  return (
    <ComingSoonPage
      title="How It Works"
      description="Discover the science and technology behind AIVO's personalized learning approach. Coming soon!"
      expectedDate="Q1 2025"
    />
  );
}
