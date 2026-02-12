import type { Metadata } from 'next';

import { HowItWorksPage as HowItWorksPageContent } from '@/components/pages';

export const metadata: Metadata = {
  title: 'How It Works | AIVO Learning',
  description:
    'Learn how AIVO uses AI to create personalized learning experiences for neurodiverse students.',
};

export default function HowItWorksPage() {
  return <HowItWorksPageContent />;
}
