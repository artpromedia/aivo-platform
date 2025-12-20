import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'Research | AIVO Learning',
  description: 'Scientific research and evidence behind AIVO Learning methodology.',
};

export default function ResearchPage() {
  return (
    <ComingSoonPage
      title="Research & Evidence"
      description="Explore the peer-reviewed research and learning science that powers AIVO."
      expectedDate="Q1 2025"
    />
  );
}
