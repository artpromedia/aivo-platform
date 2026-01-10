/**
 * Marketplace API Client for Teacher Portal
 *
 * API client for accessing marketplace items that are installed
 * and approved for the teacher's school/district.
 */

import { getServiceUrl } from './env-utils';

const API_BASE = getServiceUrl(
  'NEXT_PUBLIC_MARKETPLACE_API_URL',
  'http://localhost:3007/api',
  'Marketplace API'
);

// ============================================================================
// Types
// ============================================================================

export type MarketplaceItemType = 'CONTENT_PACK' | 'EMBEDDED_TOOL';

export interface MarketplaceLibraryItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  iconUrl?: string;
  itemType: MarketplaceItemType;
  vendor: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  version: {
    id: string;
    version: string;
  };
  installation: {
    id: string;
    status: string;
    gradeBandConfig?: string[];
    config?: Record<string, unknown>;
  };
  subjects: string[];
  gradeBands: string[];
  rating: number;
  reviewCount: number;
  safetyCertified: boolean;
}

export interface ClassroomContent {
  id: string;
  classroomId: string;
  marketplaceItemId: string;
  addedAt: string;
  addedBy: string;
  item: {
    id: string;
    title: string;
    slug: string;
    iconUrl?: string;
    itemType: MarketplaceItemType;
    vendor: {
      name: string;
    };
  };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all marketplace items available to the teacher (installed and approved by admin)
 */
export async function getTeacherLibrary(
  teacherId: string,
  filters?: {
    type?: MarketplaceItemType;
    subject?: string;
    gradeBand?: string;
    search?: string;
  }
): Promise<{ data: MarketplaceLibraryItem[] }> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.subject) params.set('subject', filters.subject);
  if (filters?.gradeBand) params.set('gradeBand', filters.gradeBand);
  if (filters?.search) params.set('q', filters.search);

  const res = await fetch(`${API_BASE}/teacher/${teacherId}/library?${params.toString()}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch teacher library: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Get marketplace item details
 */
export async function getLibraryItemBySlug(slug: string): Promise<MarketplaceLibraryItem | null> {
  const res = await fetch(`${API_BASE}/catalog/${slug}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch item: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Get content items added to a specific classroom
 */
export async function getClassroomContent(
  classroomId: string
): Promise<{ data: ClassroomContent[] }> {
  const res = await fetch(`${API_BASE}/classrooms/${classroomId}/content`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch classroom content: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Add a marketplace item to a classroom
 */
export async function addContentToClassroom(
  classroomId: string,
  marketplaceItemId: string,
  teacherId: string
): Promise<ClassroomContent> {
  const res = await fetch(`${API_BASE}/classrooms/${classroomId}/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marketplaceItemId, addedBy: teacherId }),
  });

  if (!res.ok) {
    throw new Error(`Failed to add content to classroom: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Remove a marketplace item from a classroom
 */
export async function removeContentFromClassroom(
  classroomId: string,
  contentId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/classrooms/${classroomId}/content/${contentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to remove content from classroom: ${res.statusText}`);
  }
}

/**
 * Get teacher's classrooms for adding content
 * Enterprise UI Audit: RE-AUDIT-AUTH-001 - Added to replace mock classroom data
 */
export interface TeacherClassroom {
  id: string;
  name: string;
  gradeBand: string;
  studentCount: number;
}

export async function getTeacherClassrooms(
  teacherId: string
): Promise<{ data: TeacherClassroom[] }> {
  const res = await fetch(`${API_BASE}/teacher/${teacherId}/classrooms`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch teacher classrooms: ${res.statusText}`);
  }

  return res.json();
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getItemTypeLabel(type: MarketplaceItemType): string {
  const labels: Record<MarketplaceItemType, string> = {
    CONTENT_PACK: 'Content Pack',
    EMBEDDED_TOOL: 'Embedded Tool',
  };
  return labels[type] || type;
}

export function getItemTypeIcon(type: MarketplaceItemType): string {
  return type === 'CONTENT_PACK' ? '📚' : '🔧';
}

export function getSubjectLabel(subject: string): string {
  const labels: Record<string, string> = {
    MATHEMATICS: 'Mathematics',
    ENGLISH_LANGUAGE_ARTS: 'English Language Arts',
    SCIENCE: 'Science',
    SOCIAL_STUDIES: 'Social Studies',
    FOREIGN_LANGUAGE: 'Foreign Language',
    ART: 'Art',
    MUSIC: 'Music',
    PHYSICAL_EDUCATION: 'Physical Education',
    COMPUTER_SCIENCE: 'Computer Science',
    HEALTH: 'Health',
  };
  return labels[subject] || subject;
}

export function getGradeBandLabel(gradeBand: string): string {
  const labels: Record<string, string> = {
    PRE_K: 'Pre-K',
    K_2: 'K–2',
    GRADES_3_5: '3–5',
    GRADES_6_8: '6–8',
    GRADES_9_12: '9–12',
  };
  return labels[gradeBand] || gradeBand;
}

// ============================================================================
// Partner Content API Functions
// ============================================================================

export interface PartnerContentItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  itemType: MarketplaceItemType;
  subjects: string[];
  gradeBands: string[];
  iconUrl?: string;
  vendor: {
    id: string;
    slug: string;
    name: string;
    logoUrl?: string;
  };
  license: {
    id: string;
    status: string;
    seatLimit: number | null;
    seatsUsed: number;
    validUntil: string | null;
  };
  loCount: number;
  accessibilityTags: string[];
  safetyTags: string[];
}

export interface EntitledContentResponse {
  data: PartnerContentItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Get partner content that the tenant is entitled to
 * Used by the partner content tab in the content picker
 */
export async function getEntitledPartnerContent(
  tenantId: string,
  options?: {
    schoolId?: string;
    classroomId?: string;
    gradeBand?: string;
    subject?: string;
    itemType?: MarketplaceItemType;
    limit?: number;
    offset?: number;
  }
): Promise<EntitledContentResponse> {
  const res = await fetch(`${API_BASE}/internal/entitlements/entitled-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId,
      schoolId: options?.schoolId,
      classroomId: options?.classroomId,
      gradeBand: options?.gradeBand,
      subject: options?.subject,
      itemType: options?.itemType,
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch entitled partner content: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Check if tenant has entitlement to specific LOs
 * Used for filtering content before display
 */
export async function checkEntitlements(
  tenantId: string,
  loIds: string[],
  options?: {
    learnerId?: string;
    schoolId?: string;
    classroomId?: string;
    gradeBand?: string;
  }
): Promise<{
  entitled: string[];
  denied: Array<{ loId: string; reason: string }>;
  summary: {
    totalRequested: number;
    totalEntitled: number;
    totalDenied: number;
  };
}> {
  const res = await fetch(`${API_BASE}/internal/entitlements/batch-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId,
      loIds,
      learnerId: options?.learnerId,
      schoolId: options?.schoolId,
      classroomId: options?.classroomId,
      gradeBand: options?.gradeBand,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to check entitlements: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Get entitled LO IDs for partner content
 */
export async function getEntitledLoIds(
  tenantId: string,
  options?: {
    schoolId?: string;
    gradeBand?: string;
  }
): Promise<{ loIds: string[]; count: number }> {
  const res = await fetch(`${API_BASE}/internal/entitlements/entitled-los`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId,
      schoolId: options?.schoolId,
      gradeBand: options?.gradeBand,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch entitled LO IDs: ${res.statusText}`);
  }

  return res.json();
}
