/**
 * Marketplace API Client for Teacher Portal
 *
 * API client for accessing marketplace items that are installed
 * and approved for the teacher's school/district.
 */

const API_BASE = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || 'http://localhost:3007/api';

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
