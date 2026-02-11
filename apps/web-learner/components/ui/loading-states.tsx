/**
 * Reusable loading skeleton primitives for data-loading states.
 */

'use client';

export function SkeletonBox({ className = '' }: { readonly className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export function SkeletonText({
  lines = 1,
  className = '',
}: {
  readonly lines?: number;
  readonly className?: string;
}) {
  const ids = Array.from({ length: lines }, (_, i) => `line-${i}-${lines}`);
  return (
    <div className={`space-y-2 ${className}`}>
      {ids.map((id, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div
          key={id}
          className="h-4 animate-pulse rounded bg-slate-200"
          style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { readonly className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <SkeletonBox className="mb-4 h-14 w-14" />
      <SkeletonText lines={2} className="mb-4" />
      <SkeletonBox className="h-2 w-full" />
    </div>
  );
}

/** Full-page centered spinner for top-level loading states */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBox className="h-40 w-full rounded-2xl" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

/** Error state with retry button */
export function ErrorState({
  message = 'Something went wrong loading this page.',
  onRetry,
}: {
  readonly message?: string;
  readonly onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
      <div className="text-4xl">😕</div>
      <h2 className="mt-4 text-lg font-semibold text-red-800">Oops!</h2>
      <p className="mt-2 max-w-md text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

/** Empty state when API returns no items */
export function EmptyState({
  emoji = '📭',
  title = 'Nothing here yet',
  description = 'Check back later!',
}: {
  readonly emoji?: string;
  readonly title?: string;
  readonly description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
      <div className="text-4xl">{emoji}</div>
      <h3 className="mt-3 text-lg font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
