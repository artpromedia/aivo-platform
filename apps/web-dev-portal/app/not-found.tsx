import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-emerald-50 px-4 text-center">
      <div className="mb-4 text-6xl font-bold text-slate-300">404</div>
      <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Please check the URL
        or navigate back to the documentation.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Back to Docs
      </Link>
    </div>
  );
}
