import type { Metadata } from 'next';

import { FAQPage } from '@/components/pages/faq-page';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | AIVO Learning',
  description:
    'Find answers to common questions about AIVO Learning, our AI tutoring platform for neurodiverse students, pricing, features, and implementation.',
  openGraph: {
    title: 'FAQ - AIVO Learning',
    description: 'Common questions about AI personalized learning for neurodiverse students',
  },
};

export default function FAQ() {
  return <FAQPage />;
}
