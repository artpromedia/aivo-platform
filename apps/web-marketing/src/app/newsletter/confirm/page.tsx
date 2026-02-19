import type { Metadata } from 'next';

import { NewsletterConfirmClient } from './confirm-client';

export const metadata: Metadata = {
  title: 'Confirm Your Newsletter Subscription',
  description: 'Confirm your AIVO Learning newsletter subscription.',
  robots: { index: false, follow: false },
};

export default function NewsletterConfirmPage() {
  return <NewsletterConfirmClient />;
}
