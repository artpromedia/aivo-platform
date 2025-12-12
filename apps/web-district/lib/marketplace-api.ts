/**
 * Marketplace API Client - District Admin
 *
 * API client for marketplace catalog browsing, installations, and management.
 */

// ============================================================================
// Types
// ============================================================================

export interface MarketplaceVendor {
  id: string;
  slug: string;
  name: string;
  type: 'AIVO' | 'THIRD_PARTY';
  logoUrl: string | null;
}

export interface MarketplaceCatalogItem {
  id: string;
  slug: string;
  itemType: 'CONTENT_PACK' | 'EMBEDDED_TOOL';
  title: string;
  shortDescription: string;
  subjects: string[];
  gradeBands: string[];
  iconUrl: string | null;
  pricingModel: string;
  priceCents: number | null;
  safetyCert: string;
  avgRating: number | null;
  totalInstalls: number;
  isFeatured: boolean;
  vendor: MarketplaceVendor;
}

export interface MarketplaceItemDetail extends MarketplaceCatalogItem {
  longDescription: string;
  modalities: string[];
  screenshots: { url: string; caption?: string; order: number }[];
  latestVersion: {
    id: string;
    version: string;
    changelog?: string;
    publishedAt: string;
  } | null;
  dataUsageSummary?: {
    collectsData: boolean;
    dataTypes: string[];
    retention: string;
    thirdPartySharing: boolean;
  };
  safetyInfo?: {
    coppaCompliant: boolean;
    ferpaCompliant: boolean;
    accessibilityLevel: string;
    contentRating: string;
  };
  ratingDistribution: Record<number, number>;
  reviewCount: number;
}

export interface MarketplaceInstallation {
  id: string;
  marketplaceItemId: string;
  marketplaceItemVersionId: string;
  tenantId: string;
  schoolId: string | null;
  classroomId: string | null;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'DISABLED' | 'REVOKED';
  configJson: Record<string, unknown> | null;
  installReason: string | null;
  approvalNotes: string | null;
  installedByUserId: string;
  approvedByUserId: string | null;
  installedAt: string;
  approvedAt: string | null;
  disabledAt: string | null;
  marketplaceItem: {
    slug: string;
    title: string;
    itemType: string;
    iconUrl: string | null;
    vendor: { name: string; slug: string };
  };
  version: {
    version: string;
  };
}

export interface CatalogSearchParams {
  query?: string;
  itemType?: 'CONTENT_PACK' | 'EMBEDDED_TOOL';
  subjects?: string[];
  gradeBands?: string[];
  modalities?: string[];
  pricingModel?: string;
  safetyCert?: string;
  vendorId?: string;
  isFeatured?: boolean;
  minRating?: number;
  sortBy?: 'relevance' | 'rating' | 'installs' | 'newest' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateInstallationRequest {
  marketplaceItemId: string;
  marketplaceItemVersionId?: string;
  schoolIds?: string[]; // Empty or undefined = tenant-wide
  configJson?: Record<string, unknown>;
  installReason?: string;
}

export interface UpdateInstallationRequest {
  status?: 'ACTIVE' | 'DISABLED';
  configJson?: Record<string, unknown>;
  approvalNotes?: string;
}

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || 'http://localhost:4070/api/v1';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const customHeaders = options.headers
    ? Object.fromEntries(new Headers(options.headers).entries())
    : {};

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
  });

  if (!res.ok) {
    const error: { error?: string } = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ============================================================================
// Catalog API
// ============================================================================

/**
 * Search/browse marketplace catalog
 */
export async function searchCatalog(
  params: CatalogSearchParams = {}
): Promise<PaginatedResponse<MarketplaceCatalogItem>> {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.set('query', params.query);
  if (params.itemType) searchParams.set('itemType', params.itemType);
  if (params.subjects?.length) {
    params.subjects.forEach((s) => {
      searchParams.append('subjects', s);
    });
  }
  if (params.gradeBands?.length) {
    params.gradeBands.forEach((g) => {
      searchParams.append('gradeBands', g);
    });
  }
  if (params.modalities?.length) {
    params.modalities.forEach((m) => {
      searchParams.append('modalities', m);
    });
  }
  if (params.pricingModel) searchParams.set('pricingModel', params.pricingModel);
  if (params.safetyCert) searchParams.set('safetyCert', params.safetyCert);
  if (params.vendorId) searchParams.set('vendorId', params.vendorId);
  if (params.isFeatured !== undefined) searchParams.set('isFeatured', String(params.isFeatured));
  if (params.minRating) searchParams.set('minRating', String(params.minRating));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

  return fetchApi<PaginatedResponse<MarketplaceCatalogItem>>(`/catalog?${searchParams.toString()}`);
}

/**
 * Get detailed item information by slug
 */
export async function getItemBySlug(slug: string): Promise<MarketplaceItemDetail> {
  return fetchApi<MarketplaceItemDetail>(`/catalog/${slug}`);
}

/**
 * Check if an item is installed for a given tenant/school/classroom
 */
export async function checkInstallationStatus(
  tenantId: string,
  itemId: string,
  options?: { schoolId?: string; classroomId?: string }
): Promise<{ installed: boolean; installation: MarketplaceInstallation | null }> {
  const params = new URLSearchParams({ itemId });
  if (options?.schoolId) params.set('schoolId', options.schoolId);
  if (options?.classroomId) params.set('classroomId', options.classroomId);

  return fetchApi<{ installed: boolean; installation: MarketplaceInstallation | null }>(
    `/tenants/${tenantId}/installations/check?${params.toString()}`
  );
}

// ============================================================================
// Installation API
// ============================================================================

/**
 * List all installations for a tenant
 */
export async function listInstallations(
  tenantId: string,
  options?: {
    status?: 'PENDING_APPROVAL' | 'ACTIVE' | 'DISABLED' | 'REVOKED';
    schoolId?: string;
    classroomId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{
  data: MarketplaceInstallation[];
  pagination: { total: number; limit: number; offset: number };
}> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.schoolId) params.set('schoolId', options.schoolId);
  if (options?.classroomId) params.set('classroomId', options.classroomId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  return fetchApi(`/tenants/${tenantId}/installations?${params.toString()}`);
}

/**
 * Get installation details
 */
export async function getInstallation(
  tenantId: string,
  installationId: string
): Promise<MarketplaceInstallation> {
  return fetchApi<MarketplaceInstallation>(`/tenants/${tenantId}/installations/${installationId}`);
}

/**
 * Create a new installation (for district admin)
 */
export async function createInstallation(
  tenantId: string,
  request: CreateInstallationRequest
): Promise<MarketplaceInstallation> {
  // If schoolIds is empty or undefined, install at tenant level
  // If schoolIds has values, create installations for each school
  const body = {
    marketplaceItemId: request.marketplaceItemId,
    versionId: request.marketplaceItemVersionId,
    schoolId: null, // tenant-wide by default
    installationConfig: request.configJson,
    installReason: request.installReason,
  };

  return fetchApi<MarketplaceInstallation>(`/tenants/${tenantId}/installations`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Create installations for specific schools
 */
export async function createSchoolInstallations(
  tenantId: string,
  request: CreateInstallationRequest & { schoolIds: string[] }
): Promise<MarketplaceInstallation[]> {
  const results: MarketplaceInstallation[] = [];

  for (const schoolId of request.schoolIds) {
    const installation = await fetchApi<MarketplaceInstallation>(
      `/tenants/${tenantId}/installations`,
      {
        method: 'POST',
        body: JSON.stringify({
          marketplaceItemId: request.marketplaceItemId,
          versionId: request.marketplaceItemVersionId,
          schoolId,
          installationConfig: request.configJson,
          installReason: request.installReason,
        }),
      }
    );
    results.push(installation);
  }

  return results;
}

/**
 * Update an installation (status, config)
 */
export async function updateInstallation(
  tenantId: string,
  installationId: string,
  request: UpdateInstallationRequest
): Promise<MarketplaceInstallation> {
  return fetchApi<MarketplaceInstallation>(`/tenants/${tenantId}/installations/${installationId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      installationConfig: request.configJson,
    }),
  });
}

/**
 * Approve a pending installation
 */
export async function approveInstallation(
  tenantId: string,
  installationId: string,
  notes?: string
): Promise<MarketplaceInstallation> {
  return fetchApi<MarketplaceInstallation>(
    `/tenants/${tenantId}/installations/${installationId}/approve`,
    {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }
  );
}

/**
 * Disable an installation
 */
export async function disableInstallation(
  tenantId: string,
  installationId: string,
  reason?: string
): Promise<MarketplaceInstallation> {
  return fetchApi<MarketplaceInstallation>(
    `/tenants/${tenantId}/installations/${installationId}/disable`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  );
}

/**
 * Re-enable a disabled installation
 */
export async function enableInstallation(
  tenantId: string,
  installationId: string
): Promise<MarketplaceInstallation> {
  return fetchApi<MarketplaceInstallation>(
    `/tenants/${tenantId}/installations/${installationId}/enable`,
    {
      method: 'POST',
    }
  );
}

/**
 * Revoke (permanently remove) an installation
 */
export async function revokeInstallation(
  tenantId: string,
  installationId: string,
  reason?: string
): Promise<void> {
  await fetchApi<undefined>(`/tenants/${tenantId}/installations/${installationId}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getSubjectLabel(subject: string): string {
  const labels: Record<string, string> = {
    ELA: 'English Language Arts',
    MATH: 'Mathematics',
    SCIENCE: 'Science',
    SEL: 'Social-Emotional Learning',
    SPEECH: 'Speech',
    STEM: 'STEM',
    SOCIAL_STUDIES: 'Social Studies',
    ARTS: 'Arts',
    FOREIGN_LANGUAGE: 'Foreign Language',
    OTHER: 'Other',
  };
  return labels[subject] || subject;
}

export function getGradeBandLabel(gradeBand: string): string {
  const labels: Record<string, string> = {
    PRE_K: 'Pre-K',
    K_2: 'K-2',
    G3_5: 'Grades 3-5',
    G6_8: 'Grades 6-8',
    G9_12: 'Grades 9-12',
    ALL_GRADES: 'All Grades',
  };
  return labels[gradeBand] || gradeBand;
}

export function getItemTypeLabel(itemType: string): string {
  return itemType === 'CONTENT_PACK' ? 'Content Pack' : 'Embedded Tool';
}

export function getSafetyCertLabel(cert: string): string {
  const labels: Record<string, string> = {
    AIVO_CERTIFIED: 'Aivo Certified',
    VENDOR_ATTESTED: 'Vendor Attested',
    PENDING_REVIEW: 'Pending Review',
    NOT_REVIEWED: 'Not Reviewed',
  };
  return labels[cert] || cert;
}

export function getInstallationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_APPROVAL: 'Pending Approval',
    ACTIVE: 'Active',
    DISABLED: 'Disabled',
    REVOKED: 'Revoked',
  };
  return labels[status] || status;
}

export function getInstallationStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING_APPROVAL: 'yellow',
    ACTIVE: 'green',
    DISABLED: 'gray',
    REVOKED: 'red',
  };
  return colors[status] || 'gray';
}
