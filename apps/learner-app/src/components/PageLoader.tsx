'use client';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 animate-spin items-center justify-center rounded-full border-4 border-purple-200 border-t-purple-500" />
        <p className="text-lg text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export default PageLoader;
