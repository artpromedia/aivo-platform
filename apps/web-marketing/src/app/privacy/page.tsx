import type { Metadata } from 'next';

import { PrivacyPage } from '@/components/pages/privacy-page';

export const metadata: Metadata = {
  title: 'Privacy Policy | AIVO Learning',
  description:
    'AIVO Learning Privacy Policy - Learn how we collect, use, and protect your personal information. FERPA and COPPA compliant.',
};

export default function PrivacyPolicy() {
  return <PrivacyPage />;
}
