import { NextRequest, NextResponse } from 'next/server';

import { getPolicyAuditLog } from '../../../../lib/audit-api';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '');

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const tenantId = searchParams.get('tenantId') || undefined;
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20;

  try {
    const result = await getPolicyAuditLog(accessToken, {
      startDate,
      endDate,
      tenantId,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching policy audit log:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}
