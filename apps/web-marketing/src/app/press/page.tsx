import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'Press | AIVO Learning',
  description: 'AIVO Learning press releases, media resources, and news coverage.',
};

export default function PressPage() {
  return (
    <ComingSoonPage
      title="Press & Media"
      description="Press releases, media kit, and news coverage about AIVO Learning."
      expectedDate="Q1 2025"
    />
  );
}
