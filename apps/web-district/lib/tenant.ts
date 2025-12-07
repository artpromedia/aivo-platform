import { headers } from 'next/headers';

interface TenantResolution {
  tenant_id: string;
  name: string;
  type: string;
  primary_domain: string;
}

const tenantSvcUrl = process.env.TENANT_SVC_URL ?? 'http://localhost:4002';
const cache = new Map<string, Promise<TenantResolution | null>>();

export async function resolveTenant(host?: string): Promise<TenantResolution | null> {
  const targetHost =
    host ?? headers().get('x-forwarded-host') ?? headers().get('host') ?? undefined;
  if (!targetHost) return null;
  const key = targetHost.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const promise = fetch(`${tenantSvcUrl}/tenant/resolve?host=${encodeURIComponent(key)}`).then(
    async (res) => {
      if (!res.ok) return null;
      return (await res.json()) as TenantResolution;
    }
  );
  cache.set(key, promise);
  return promise;
}
