/**
 * GET /api/dashboard/audit
 *
 * Returns list of audit logs for the admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { listAuditLogs, type AuditFilters } from '@/lib/api/audit.api';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    
    // Build filters object conditionally to avoid undefined values
    const filters: AuditFilters = {};
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const actorId = searchParams.get('actorId');
    const tenantId = searchParams.get('tenantId');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');
    
    if (action) filters.action = action;
    if (resourceType) filters.resourceType = resourceType;
    if (actorId) filters.actorId = actorId;
    if (tenantId) filters.tenantId = tenantId;
    if (category && ['auth', 'data', 'config', 'admin', 'api', 'security', 'billing', 'ai'].includes(category)) {
      filters.category = category as 'auth' | 'data' | 'config' | 'admin' | 'api' | 'security' | 'billing' | 'ai';
    }
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (search) filters.search = search;

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const response = await listAuditLogs(accessToken, filters, page ? parseInt(page) : 1, pageSize ? parseInt(pageSize) : 50);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
