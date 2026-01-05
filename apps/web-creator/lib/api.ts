/**
 * Creator API Client
 *
 * API helpers for the creator portal.
 */

// ============================================================================
// Types
// ============================================================================

export interface Vendor {
  id: string;
  slug: string;
  name: string;
  type: 'AIVO' | 'THIRD_PARTY';
}

export interface MarketplaceItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  itemType: 'CONTENT_PACK' | 'EMBEDDED_TOOL';
  subjects: string[];
  gradeBands: string[];
  modalities: string[];
  iconUrl: string | null;
  screenshotsJson: Screenshot[] | null;
  isActive: boolean;
  pricingModel: string;
  priceCents: number | null;
  metadataJson: Record<string, unknown> | null;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
  vendor?: Vendor;
  versions?: ItemVersion[];
  latestVersion?: ItemVersion | null;
}

export interface Screenshot {
  url: string;
  caption?: string;
  order: number;
}

export interface ItemVersion {
  id: string;
  version: string;
  status: VersionStatus;
  changelog: string | null;
  reviewNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  contentPackItems?: ContentPackItem[];
  embeddedToolConfig?: EmbeddedToolConfig | null;
  statusTransitions?: StatusTransition[];
}

export type VersionStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'DEPRECATED';

export interface ContentPackItem {
  id: string;
  loVersionId: string;
  loId: string | null;
  position: number;
  isHighlight: boolean;
  metadataJson: Record<string, unknown> | null;
}

export interface EmbeddedToolConfig {
  id: string;
  launchUrl: string;
  launchType: 'IFRAME_WEB' | 'NATIVE_DEEPLINK' | 'LTI_LIKE';
  requiredScopes: string[];
  optionalScopes: string[];
  configSchemaJson: Record<string, unknown> | null;
  defaultConfigJson: Record<string, unknown> | null;
  webhookUrl: string | null;
  cspDirectives: string | null;
  sandboxAttributes: string[];
}

export interface StatusTransition {
  id: string;
  fromStatus: VersionStatus;
  toStatus: VersionStatus;
  reason: string | null;
  transitionedAt: string;
}

export interface CreateItemInput {
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  itemType: 'CONTENT_PACK' | 'EMBEDDED_TOOL';
  subjects: string[];
  gradeBands: string[];
  modalities?: string[];
  iconUrl?: string;
  screenshotsJson?: Screenshot[];
  pricingModel?: string;
  priceCents?: number;
  metadataJson?: Record<string, unknown>;
  searchKeywords?: string[];
}

export interface UpdateItemInput {
  title?: string;
  shortDescription?: string;
  longDescription?: string;
  subjects?: string[];
  gradeBands?: string[];
  modalities?: string[];
  iconUrl?: string;
  screenshotsJson?: Screenshot[];
  pricingModel?: string;
  priceCents?: number;
  metadataJson?: Record<string, unknown>;
  searchKeywords?: string[];
}

export interface ContentPackItemInput {
  loVersionId: string;
  loId?: string;
  position: number;
  isHighlight?: boolean;
  metadataJson?: Record<string, unknown>;
}

export interface ToolConfigInput {
  launchUrl: string;
  launchType: 'IFRAME_WEB' | 'NATIVE_DEEPLINK' | 'LTI_LIKE';
  requiredScopes: string[];
  optionalScopes?: string[];
  configSchemaJson?: Record<string, unknown>;
  defaultConfigJson?: Record<string, unknown>;
  webhookUrl?: string;
  cspDirectives?: string;
  sandboxAttributes?: string[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

// ============================================================================
// API Client
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || 'http://localhost:4070/api/v1';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = options.headers instanceof Headers
    ? Object.fromEntries(Array.from(options.headers as Iterable<[string, string]>))
    : options.headers ?? {};

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  if (!res.ok) {
    const error: { error?: string; errors?: ValidationError[] } = await res
      .json()
      .catch(() => ({ error: res.statusText }));
    const err = new Error(error.error ?? `API error: ${res.status}`) as Error & {
      errors?: ValidationError[];
    };
    err.errors = error.errors;
    throw err;
  }

  return res.json() as Promise<T>;
}

// ============================================================================
// Item APIs
// ============================================================================

/**
 * List all items for a vendor
 */
export async function listCreatorItems(vendorId: string): Promise<{
  data: MarketplaceItem[];
}> {
  return fetchApi(`/creators/${vendorId}/items`);
}

/**
 * Get item details
 */
export async function getCreatorItem(
  vendorId: string,
  itemId: string
): Promise<{ data: MarketplaceItem }> {
  return fetchApi(`/creators/${vendorId}/items/${itemId}`);
}

/**
 * Create a new item
 */
export async function createItem(
  vendorId: string,
  input: CreateItemInput
): Promise<{ data: MarketplaceItem }> {
  return fetchApi(`/creators/${vendorId}/items`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Update an item
 */
export async function updateItem(
  vendorId: string,
  itemId: string,
  input: UpdateItemInput
): Promise<{ data: MarketplaceItem }> {
  return fetchApi(`/creators/${vendorId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ============================================================================
// Version APIs
// ============================================================================

/**
 * Create a new version
 */
export async function createVersion(
  vendorId: string,
  itemId: string,
  version: string,
  changelog?: string
): Promise<{ data: ItemVersion }> {
  return fetchApi(`/creators/${vendorId}/items/${itemId}/versions`, {
    method: 'POST',
    body: JSON.stringify({ version, changelog }),
  });
}

/**
 * Submit version for review
 */
export async function submitForReview(
  vendorId: string,
  itemId: string,
  versionId: string,
  notes?: string
): Promise<{ data: ItemVersion; message: string }> {
  return fetchApi(`/creators/${vendorId}/items/${itemId}/versions/${versionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

/**
 * Discard a draft version
 */
export async function discardVersion(
  vendorId: string,
  itemId: string,
  versionId: string
): Promise<void> {
  await fetchApi(`/creators/${vendorId}/items/${itemId}/versions/${versionId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Content Pack APIs
// ============================================================================

/**
 * Set content pack items
 */
export async function setContentPackItems(
  vendorId: string,
  itemId: string,
  versionId: string,
  items: ContentPackItemInput[]
): Promise<{ data: ContentPackItem[] }> {
  return fetchApi(
    `/creators/${vendorId}/items/${itemId}/versions/${versionId}/content-pack-items`,
    {
      method: 'POST',
      body: JSON.stringify({ items }),
    }
  );
}

// ============================================================================
// Embedded Tool APIs
// ============================================================================

/**
 * Set embedded tool configuration
 */
export async function setToolConfig(
  vendorId: string,
  itemId: string,
  versionId: string,
  config: ToolConfigInput
): Promise<{ data: EmbeddedToolConfig }> {
  return fetchApi(`/creators/${vendorId}/items/${itemId}/versions/${versionId}/tool-config`, {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

/**
 * Update embedded tool configuration (alias for setToolConfig with simpler input)
 */
export interface UpdateToolConfigInput {
  launchUrl: string;
  requiredScopes: string[];
  optionalScopes?: string[];
  sandboxFlags?: string[];
  configJson?: Record<string, unknown> | null;
}

export async function updateEmbeddedToolConfig(
  vendorId: string,
  itemId: string,
  versionId: string,
  input: UpdateToolConfigInput
): Promise<{ data: EmbeddedToolConfig }> {
  // Map to the full ToolConfigInput format
  const config: ToolConfigInput = {
    launchUrl: input.launchUrl,
    launchType: 'IFRAME_WEB',
    requiredScopes: input.requiredScopes,
    optionalScopes: input.optionalScopes,
    defaultConfigJson: input.configJson ?? undefined,
    sandboxAttributes: input.sandboxFlags,
  };
  return setToolConfig(vendorId, itemId, versionId, config);
}

// ============================================================================
// Constants
// ============================================================================

export const SUBJECTS = [
  { value: 'MATH', label: 'Mathematics' },
  { value: 'ELA', label: 'English Language Arts' },
  { value: 'SCIENCE', label: 'Science' },
  { value: 'SEL', label: 'Social-Emotional Learning' },
  { value: 'SOCIAL_STUDIES', label: 'Social Studies' },
  { value: 'STEM', label: 'STEM' },
  { value: 'ARTS', label: 'Arts' },
  { value: 'FOREIGN_LANGUAGE', label: 'Foreign Language' },
  { value: 'SPEECH', label: 'Speech' },
  { value: 'OTHER', label: 'Other' },
];

export const GRADE_BANDS = [
  { value: 'PRE_K', label: 'Pre-K' },
  { value: 'K_2', label: 'K-2' },
  { value: 'G3_5', label: 'Grades 3-5' },
  { value: 'G6_8', label: 'Grades 6-8' },
  { value: 'G9_12', label: 'Grades 9-12' },
  { value: 'ALL_GRADES', label: 'All Grades' },
];

export const MODALITIES = [
  { value: 'GAME', label: 'Game' },
  { value: 'DRILL', label: 'Drill/Practice' },
  { value: 'PROJECT', label: 'Project-Based' },
  { value: 'SEL_ACTIVITY', label: 'SEL Activity' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'SIMULATION', label: 'Simulation' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'READING', label: 'Reading' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'MIXED', label: 'Mixed' },
];

export const ALLOWED_SCOPES = [
  { value: 'LEARNER_PROFILE_MIN', label: 'Basic Learner Profile', description: 'User ID and display name' },
  { value: 'LEARNER_PROGRESS_READ', label: 'Read Progress', description: 'View learner progress data' },
  { value: 'LEARNER_PROGRESS_WRITE', label: 'Write Progress', description: 'Update learner progress' },
  { value: 'SESSION_EVENTS_READ', label: 'Read Events', description: 'View session events' },
  { value: 'SESSION_EVENTS_WRITE', label: 'Write Events', description: 'Log session events' },
  { value: 'ASSIGNMENT_READ', label: 'Read Assignments', description: 'View assignment context' },
  { value: 'CLASSROOM_READ', label: 'Read Classroom', description: 'View classroom info' },
  { value: 'TENANT_CONFIG_READ', label: 'Read Config', description: 'View tenant configuration' },
];

// Alias for backwards compatibility
export const TOOL_SCOPES = ALLOWED_SCOPES;

export const VERSION_STATUS_LABELS: Record<VersionStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PUBLISHED: 'Published',
  DEPRECATED: 'Deprecated',
};

export const VERSION_STATUS_COLORS: Record<VersionStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  IN_REVIEW: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  DEPRECATED: 'bg-gray-100 text-gray-500',
};
