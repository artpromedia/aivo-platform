import { cookies } from 'next/headers';

export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  roles: string[];
  learnerId?: string;
  tenantId: string;
  accessToken: string;
}

/**
 * Get the current authentication session from cookies.
 * In production, this would validate the JWT token and fetch user data.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  // Check for both cookie names (auth-token from PIN login, access_token from other flows)
  const token = cookieStore.get('auth-token')?.value || cookieStore.get('access_token')?.value;

  if (!token) {
    // For development, return a mock session if MOCK_AUTH is enabled
    if (process.env.MOCK_AUTH === 'true') {
      return {
        userId: 'user-123',
        name: 'Alex Student',
        email: 'alex@school.edu',
        roles: ['LEARNER'],
        learnerId: 'learner-123',
        tenantId: 'tenant-1',
        accessToken: 'mock-token',
      };
    }
    return null;
  }

  try {
    // In production, validate the JWT and fetch user info
    // For now, decode basic info from the token
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    return {
      userId: payload.sub,
      name: payload.name ?? 'Learner',
      email: payload.email ?? '',
      roles: payload.roles ?? ['LEARNER'],
      learnerId: payload.learnerId,
      tenantId: payload.tenantId,
      accessToken: token,
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication for a page or action.
 * Redirects to login if not authenticated.
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getAuthSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  return session;
}
