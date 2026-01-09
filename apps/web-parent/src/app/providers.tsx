'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { I18nextProvider } from 'react-i18next';
import { useState } from 'react';
import i18n from '@/lib/i18n';
import { WebPushProvider } from '@aivo/ui-web/components/notifications';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Client-side Providers for Parent Portal
 *
 * Includes web push notification support (RE-AUDIT-005)
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
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <WebPushProvider
            vapidPublicKey={VAPID_PUBLIC_KEY}
            serviceWorkerPath="/push-service-worker.js"
            userRole="parent"
            registerEndpoint="/api/notifications/push/subscribe"
            unregisterEndpoint="/api/notifications/push/unsubscribe"
          >
            {children}
          </WebPushProvider>
        </I18nextProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
