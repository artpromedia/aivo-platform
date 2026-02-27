import type { Metadata } from 'next';

import { CookiesPage } from '@/components/pages/cookies-page';

export const metadata: Metadata = {
  title: 'Cookie Policy | AIVO Learning',
  description:
    'Learn how AIVO Learning uses cookies and similar technologies to improve your experience.',
};

export default function Cookies() {
  return <CookiesPage />;
}
