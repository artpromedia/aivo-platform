import { NextResponse, type NextRequest } from 'next/server';

import { getAuthServiceUrl, setAuthCookies } from '../../../../lib/auth';
import { resolveTenant } from '../../../../lib/tenant';

// NOTE: In production this call will route through the gateway (e.g., Kong) rather than hitting auth-svc directly.

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const tenant = await resolveTenant();
  if (!tenant) {
    return NextResponse.json({ error: 'Unable to resolve tenant from host' }, { status: 400 });
  }

  const resp = await fetch(`${getAuthServiceUrl()}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In production this will be injected by the gateway (Kong) for tenant-aware routing.
      'x-tenant-id': tenant.tenant_id,
    },
    body: JSON.stringify({ email, password, tenantId: tenant.tenant_id }),
  });

  if (!resp.ok) {
    const message = await resp.text();
    return NextResponse.json({ error: message || 'Invalid credentials' }, { status: resp.status });
  }

  const data = await resp.json();
  const next = NextResponse.json({ user: data.user });
  setAuthCookies(next, data.accessToken, data.refreshToken);
  return next;
}
