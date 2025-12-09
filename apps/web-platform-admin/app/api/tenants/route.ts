import { NextResponse, type NextRequest } from 'next/server';

import { createTenant, listTenants } from '../../../lib/api';
import { getAuthSession } from '../../../lib/auth';
import type { CreateTenantInput } from '../../../lib/types';

export async function GET(request: NextRequest) {
  const auth = await getAuthSession();
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

  try {
    const result = await listTenants(auth.accessToken, page, pageSize);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthSession();
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const input = (await request.json()) as CreateTenantInput;
    const tenant = await createTenant(auth.accessToken, input);
    return NextResponse.json(tenant, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
