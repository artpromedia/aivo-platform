import type { Metadata } from 'next';

import { BlogPage as BlogPageContent } from '@/components/pages';

export const metadata: Metadata = {
  title: 'Blog | AIVO Learning',
  description:
    'Insights, tips, and stories about neurodiverse education and personalized learning.',
};

export default function BlogPage() {
  return <BlogPageContent />;
}
