/**
 * Auth API Client
 *
 * Client-side functions for authentication-related operations
 * that hit the Next.js API routes (which proxy to auth-svc).
 */

// ============================================================================
// Types
// ============================================================================

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Change the authenticated user's password.
 * Proxied through /api/auth/change-password → auth-svc.
 */
export async function changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = (await res.json()) as { message?: string; error?: string };

  if (!res.ok) {
    throw new Error(body.error ?? 'Password change failed');
  }

  return { message: body.message ?? 'Password changed successfully' };
}

/**
 * Sign out the current user by clearing auth cookies.
 */
export async function signOut(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}
