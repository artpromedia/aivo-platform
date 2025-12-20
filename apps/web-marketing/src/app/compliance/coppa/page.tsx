import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/pages/coming-soon-page';

export const metadata: Metadata = {
  title: 'COPPA Compliance | AIVO Learning',
  description: "Learn about AIVO's compliance with the Children's Online Privacy Protection Act.",
};

export default function COPPAPage() {
  return (
    <ComingSoonPage
      title="COPPA Compliance"
      description="How AIVO protects children's privacy in compliance with COPPA regulations."
      expectedDate="Q1 2025"
      showNewsletter={false}
    />
  );
}
