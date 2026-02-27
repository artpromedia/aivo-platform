import type { Metadata } from 'next';

import { TermsPage } from '@/components/pages/terms-page';

export const metadata: Metadata = {
  title: 'Terms of Service | AIVO Learning',
  description:
    'AIVO Learning Terms of Service - Terms and conditions for using our AI-powered educational platform.',
};

export default function TermsOfService() {
  return <TermsPage />;
}
