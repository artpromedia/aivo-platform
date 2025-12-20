import type { Metadata } from 'next';

import { CareersPage } from '@/components/pages/careers-page';

export const metadata: Metadata = {
  title: 'Careers | AIVO Learning',
  description:
    'Join the AIVO team and help us transform education for neurodiverse learners. View open positions and learn about our culture.',
};

export default function Careers() {
  return <CareersPage />;
}
