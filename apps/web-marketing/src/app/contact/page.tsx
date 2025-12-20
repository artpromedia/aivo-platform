import type { Metadata } from 'next';

import { ContactPage } from '@/components/pages/contact-page';

export const metadata: Metadata = {
  title: 'Contact Us | AIVO Learning',
  description:
    "Get in touch with AIVO. We're here to answer your questions about our AI-powered learning platform for neurodiverse students.",
  openGraph: {
    title: 'Contact AIVO Learning',
    description: 'Have questions? Reach out and we will respond within 24 hours.',
  },
};

export default function Contact() {
  return <ContactPage />;
}
