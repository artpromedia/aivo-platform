'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from '@aivo/auth-web/client';
import { I18nextProvider } from 'react-i18next';
import { useState } from 'react';
import i18n from '@/lib/i18n';
import { WebPushProvider } from '@aivo/ui-web/components/notifications';
import {
  ErrorBoundary,
  PageErrorFallback,
  OfflineBanner,
  useNetworkStatus,
} from '@aivo/ui/components';
import {
  useErrorReporting,
  getErrorReportingConfigFromEnv,
} from '@aivo/ui/hooks';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Error Reporting Initializer - Configures global error tracking
 */
function ErrorReportingInitializer({ children }: { children: React.ReactNode }) {
  const { session, status } = useSession();

  useErrorReporting({
    config: getErrorReportingConfigFromEnv(),
    user: status === 'authenticated' && session
      ? {
          id: session.userId,
          email: session.email ?? undefined,
          name: session.name ?? undefined,
          role: 'parent',
        }
      : null,
  });

  return <>{children}</>;
}

/**
 * Network Status Wrapper - Shows offline banner when connectivity is lost
 */
function NetworkStatusWrapper({ children }: { children: React.ReactNode }) {
  const { isOnline } = useNetworkStatus();

  return (
    <>
      {!isOnline && <OfflineBanner />}
      {children}
    </>
  );
}

/**
 * Client-side Providers for Parent Portal
 *
 * Includes:
 * - Error boundary for graceful error handling
 * - Error reporting integration (Sentry/Datadog)
 * - Web push notification support (RE-AUDIT-005)
 * - Network status monitoring
 */
export function Providers({ children }: { children: React.ReactNode }) {
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
    <ErrorBoundary fallback={({ error, resetError }) => <PageErrorFallback error={error} resetError={resetError} />}>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorReportingInitializer>
            <I18nextProvider i18n={i18n}>
              <WebPushProvider
                vapidPublicKey={VAPID_PUBLIC_KEY}
                serviceWorkerPath="/push-service-worker.js"
                userRole="parent"
                registerEndpoint="/api/notifications/push/subscribe"
                unregisterEndpoint="/api/notifications/push/unsubscribe"
              >
                <NetworkStatusWrapper>{children}</NetworkStatusWrapper>
              </WebPushProvider>
            </I18nextProvider>
          </ErrorReportingInitializer>
        </QueryClientProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
