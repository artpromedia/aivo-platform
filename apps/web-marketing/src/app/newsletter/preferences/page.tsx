import type { Metadata } from 'next';

import { PreferencesClient } from './preferences-client';

export const metadata: Metadata = {
  title: 'Newsletter Preferences',
  description: 'Manage your AIVO Learning newsletter subscriptions.',
  robots: { index: false, follow: false },
};

export default function NewsletterPreferencesPage() {
  return <PreferencesClient />;
}
