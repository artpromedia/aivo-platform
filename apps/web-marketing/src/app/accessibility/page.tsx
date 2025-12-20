import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'Accessibility | AIVO Learning',
  description:
    'Learn about AIVO Learning accessibility features and our commitment to inclusive education.',
};

export default function AccessibilityPage() {
  return (
    <ComingSoonPage
      title="Accessibility Features"
      description="AIVO is built from the ground up with accessibility in mind. Learn about our inclusive features soon!"
      expectedDate="Q1 2025"
    />
  );
}
