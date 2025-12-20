import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'FERPA Compliance | AIVO Learning',
  description: "Learn about AIVO's compliance with the Family Educational Rights and Privacy Act.",
};

export default function FERPAPage() {
  return (
    <ComingSoonPage
      title="FERPA Compliance"
      description="How AIVO protects student education records in compliance with FERPA."
      expectedDate="Q1 2025"
      showNewsletter={false}
    />
  );
}
