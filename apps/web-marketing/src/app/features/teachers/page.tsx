import type { Metadata } from 'next';

import { ForTeachersPage } from '@/components/pages/for-teachers-page';

export const metadata: Metadata = {
  title: 'For Teachers | AIVO Learning',
  description:
    'AIVO helps teachers differentiate instruction, track IEP goals, and support neurodiverse students with AI-powered personalized learning.',
  openGraph: {
    title: 'AIVO for Teachers - Differentiate Instruction Effortlessly',
    description: 'AI-powered tools for special education and inclusive classrooms.',
  },
};

export default function ForTeachers() {
  return <ForTeachersPage />;
}
