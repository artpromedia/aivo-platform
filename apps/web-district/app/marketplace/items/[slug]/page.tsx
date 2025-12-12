/**
 * Marketplace Item Detail Page
 *
 * Shows detailed information and install options.
 */

import { Suspense } from 'react';

import { ItemDetailContent } from './content';

export const metadata = {
  title: 'Item Details | Marketplace | Aivo District Admin',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<ItemDetailSkeleton />}>
      <ItemDetailContent slug={slug} />
    </Suspense>
  );
}

function ItemDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-surface-muted" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-64 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-surface-muted" />
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    </div>
  );
}
