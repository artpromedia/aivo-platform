/**
 * GET /api/dashboard/models
 *
 * Returns list of AI models for the admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { listModels, type ModelFilters } from '@/lib/api/models.api';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as ModelFilters['status'] | null;
    const provider = searchParams.get('provider') as ModelFilters['provider'] | null;
    const search = searchParams.get('search');
    
    const filters: ModelFilters = {};
    if (status) filters.status = status;
    if (provider) filters.provider = provider;
    if (search) filters.search = search;
    
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 50;

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const response = await listModels(accessToken, filters, page, pageSize);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch models:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
