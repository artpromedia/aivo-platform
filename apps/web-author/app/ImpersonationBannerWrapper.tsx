'use client';

import { ImpersonationBanner } from '@aivo/auth-web/client';

import { useAuth } from './providers';

/**
 * Renders the impersonation banner when the current session is impersonated.
 * Must be placed inside the AuthProvider tree.
 */
export function ImpersonationBannerWrapper() {
  const { isImpersonated, impersonation } = useAuth();

  if (!isImpersonated || !impersonation) return null;

  return (
    <ImpersonationBanner
      sessionId={impersonation.sessionId}
      adminUserId={impersonation.adminUserId}
      readOnly={impersonation.readOnly}
      expiresAt={impersonation.expiresAt}
    />
  );
}
