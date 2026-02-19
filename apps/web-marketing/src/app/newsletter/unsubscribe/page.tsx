import type { Metadata } from 'next';

import { UnsubscribeClient } from './unsubscribe-client';

export const metadata: Metadata = {
  title: 'Unsubscribe from Newsletter',
  description: 'Unsubscribe from the AIVO Learning newsletter.',
  robots: { index: false, follow: false },
};

export default function NewsletterUnsubscribePage() {
  return <UnsubscribeClient />;
}
