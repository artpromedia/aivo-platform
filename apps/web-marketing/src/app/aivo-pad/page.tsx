import type { Metadata } from 'next';

import { AivoPadPage } from '@/components/pages/aivo-pad-page';
import { aivoPadSchema, SchemaScript } from '@/lib/schema-org';

export const metadata: Metadata = {
  title: 'AIVO Pad | The Smart Tablet for Neurodiverse Learners',
  description:
    'Purpose-built learning tablet with AI-powered personalization, focus mode, distraction-free learning, and features designed for ADHD, autism, dyslexia. Includes stylus, blue light filter, 10-hour battery. $299.',
  keywords: [
    'AIVO Pad',
    'learning tablet for ADHD',
    'autism friendly tablet',
    'dyslexia tablet',
    'educational tablet',
    'kids learning device',
    'special education technology',
    'distraction-free tablet',
    'focus mode tablet',
  ],
  openGraph: {
    title: 'AIVO Pad - Purpose-Built Learning Tablet for Neurodiverse Students',
    description:
      'Smart tablet with AI personalization, focus mode, and accessibility features designed for ADHD, autism, dyslexia. Pre-order for $299.',
  },
};

export default function AivoPad() {
  return (
    <>
      <SchemaScript schema={aivoPadSchema} />
      <AivoPadPage />
    </>
  );
}
