import type { Metadata } from 'next';

import { AboutPage } from '@/components/pages/about-page';

export const metadata: Metadata = {
  title: 'About Us | AIVO Learning',
  description:
    "Learn about AIVO's mission to support neurodiverse learners with AI-powered personalized education. Meet our team of educators, parents, and technologists.",
  openGraph: {
    title: 'About AIVO Learning',
    description:
      'Our mission: Every mind matters. Discover how we are building the future of personalized education.',
  },
};

export default function About() {
  return <AboutPage />;
}
