import type { Metadata } from 'next';

import { AivoPadPage } from '@/components/pages/aivo-pad-page';

export const metadata: Metadata = {
  title: 'AIVO Pad | The Smart Tablet for Neurodiverse Learners',
  description:
    'AIVO Pad is a purpose-built learning tablet designed specifically for neurodiverse K-12 learners. Features AI-powered personalization, focus mode, and distraction-free learning.',
  openGraph: {
    title: 'AIVO Pad - The Smart Tablet for Neurodiverse Learners',
    description:
      'A purpose-built learning device with AI personalization, focus mode, and tools designed for ADHD, Autism, Dyslexia, and more.',
  },
};

export default function AivoPad() {
  return <AivoPadPage />;
}
