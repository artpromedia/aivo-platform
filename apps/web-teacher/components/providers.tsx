/**
 * Client-side Providers
 *
 * Wraps all client-side context providers for the teacher app.
 * Includes web push notification support (RE-AUDIT-005).
 */
'use client';

import { GradeThemeProvider, AccessibilityProvider } from '@aivo/ui-web';
import { WebPushProvider } from '@aivo/ui-web/components/notifications';
import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

// VAPID public key should come from environment variable
// This is safe to expose in client-side code as it's the public key
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export function Providers({ children }: ProvidersProps) {
  return (
    <GradeThemeProvider initialGrade="G6_8">
      <AccessibilityProvider>
        <WebPushProvider
          vapidPublicKey={VAPID_PUBLIC_KEY}
          serviceWorkerPath="/push-service-worker.js"
          userRole="teacher"
          registerEndpoint="/api/notifications/push/subscribe"
          unregisterEndpoint="/api/notifications/push/unsubscribe"
        >
          {children}
        </WebPushProvider>
      </AccessibilityProvider>
    </GradeThemeProvider>
  );
}
