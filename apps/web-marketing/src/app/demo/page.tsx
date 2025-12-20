import type { Metadata } from 'next';

import { DemoPage } from '@/components/pages/demo-page';

export const metadata: Metadata = {
  title: 'Schedule a Demo | AIVO Learning',
  description:
    'Request a personalized demo of AIVO Learning. See how our AI-powered platform can support neurodiverse learners in your school or home.',
  openGraph: {
    title: 'Schedule a Demo - AIVO Learning',
    description: "Get a personalized walkthrough of AIVO's AI tutoring platform.",
  },
};

export default function Demo() {
  return <DemoPage />;
}
