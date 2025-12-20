import type { Metadata } from 'next';

import { ForParentsPage } from '@/components/pages/for-parents-page';

export const metadata: Metadata = {
  title: 'For Parents | AIVO Learning',
  description:
    "Discover how AIVO helps parents support their neurodiverse child's learning journey with personalized AI tutoring, progress tracking, and IEP alignment.",
  openGraph: {
    title: "AIVO for Parents - Support Your Child's Unique Learning Journey",
    description: 'Personalized AI learning for ADHD, Autism, Dyslexia and more.',
  },
};

export default function ForParents() {
  return <ForParentsPage />;
}
