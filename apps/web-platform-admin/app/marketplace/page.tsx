import Link from 'next/link';

export default function MarketplacePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Marketplace Management</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/marketplace/review"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <div className="mb-2 text-3xl">📋</div>
          <h2 className="font-semibold">Review Queue</h2>
          <p className="mt-1 text-sm text-slate-600">
            Review pending marketplace item submissions from creators and partners
          </p>
        </Link>

        <Link
          href="/marketplace/items"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <div className="mb-2 text-3xl">📦</div>
          <h2 className="font-semibold">All Items</h2>
          <p className="mt-1 text-sm text-slate-600">
            Browse and manage all marketplace items across vendors
          </p>
        </Link>

        <Link
          href="/marketplace/vendors"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <div className="mb-2 text-3xl">🏢</div>
          <h2 className="font-semibold">Vendors</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage vendor accounts and permissions
          </p>
        </Link>
      </div>
    </div>
  );
}
