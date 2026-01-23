'use client';

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ErrorBoundary,
  PageErrorFallback,
  OfflineBanner,
  useNetworkStatus,
} from '@aivo/ui/components';

/**
 * Network Status Wrapper - Shows offline banner when connectivity is lost
 */
function NetworkStatusWrapper({ children }: { children: ReactNode }) {
  const { isOnline } = useNetworkStatus();

  return (
    <>
      {!isOnline && <OfflineBanner />}
      {children}
    </>
  );
}

/**
 * Client-side Providers for Web Learner
 *
 * Includes:
 * - Error boundary for graceful error handling
 * - Network status monitoring
 * - React Query for data fetching
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ErrorBoundary fallback={<PageErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <NetworkStatusWrapper>{children}</NetworkStatusWrapper>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
