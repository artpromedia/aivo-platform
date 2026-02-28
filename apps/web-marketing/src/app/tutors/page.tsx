import type { Metadata } from 'next';

import { TutorsPage } from '@/components/pages/tutors-page';

export const metadata: Metadata = {
  title: 'AI Tutors — Meet Nova, Sage, Spark, Chrono & Pixel | AIVO Learning',
  description:
    "Five specialized AI tutors that adapt to your child's learning style. Nova (Math), Sage (ELA), Spark (Science), Chrono (History), and Pixel (Coding). Available 24/7.",
  openGraph: {
    title: 'AI Tutors | AIVO Learning',
    description:
      "Five specialized AI tutors that adapt to your child's learning style. Available 24/7 with instant feedback.",
  },
};

export default function TutorsRoute() {
  return <TutorsPage />;
}
