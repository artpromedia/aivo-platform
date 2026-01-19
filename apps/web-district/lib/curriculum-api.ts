/**
 * Curriculum API Client for District Admin
 *
 * Fetches curriculum data for the district curriculum library.
 */

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const CURRICULUM_SVC_URL = process.env.CURRICULUM_SVC_URL ?? 'http://localhost:4012';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type CurriculumStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type AlignmentLevel = 'primary' | 'secondary' | 'supporting';

export interface StandardAlignment {
  id: string;
  standardCode: string;
  standardDescription: string;
  framework: string;
  alignmentLevel: AlignmentLevel;
  notes?: string;
  createdAt: string;
}

export interface CurriculumLesson {
  id: string;
  title: string;
  description?: string;
  sequenceOrder: number;
  duration?: number;
  objectives?: string[];
  standards?: StandardAlignment[];
}

export interface CurriculumUnit {
  id: string;
  title: string;
  description?: string;
  sequenceOrder: number;
  lessons: CurriculumLesson[];
  standards?: StandardAlignment[];
}

export interface CurriculumVersion {
  id: string;
  versionNumber: string;
  changeLog: string;
  createdBy: string;
  createdAt: string;
  isPublished: boolean;
}

export interface Curriculum {
  id: string;
  name: string;
  description?: string;
  subjectArea: string;
  gradeLevel: string;
  status: CurriculumStatus;
  standards: StandardAlignment[];
  units: CurriculumUnit[];
  versions?: CurriculumVersion[];
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface StandardsCoverageReport {
  curriculumId: string;
  framework: string;
  totalStandards: number;
  coveredStandards: number;
  coveragePercentage: number;
  standardsByLevel: {
    primary: number;
    secondary: number;
    supporting: number;
  };
  uncoveredStandards: string[];
}

export interface SearchableStandard {
  code: string;
  description: string;
  framework: string;
  gradeLevel?: string;
  domain?: string;
}

export interface CurriculumFilters {
  subjectArea?: string;
  gradeLevel?: string;
  status?: CurriculumStatus;
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

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all curricula for a tenant
 */
export async function getCurricula(
  tenantId: string,
  accessToken: string,
  filters?: CurriculumFilters
): Promise<{ curricula: Curriculum[] }> {
  const params = new URLSearchParams({ tenantId });
  if (filters?.subjectArea) params.append('subjectArea', filters.subjectArea);
  if (filters?.gradeLevel) params.append('gradeLevel', filters.gradeLevel);
  if (filters?.status) params.append('status', filters.status);

  const res = await fetch(`${CURRICULUM_SVC_URL}/curricula?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch curricula: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a single curriculum by ID
 */
export async function getCurriculumById(
  curriculumId: string,
  tenantId: string,
  accessToken: string
): Promise<{ curriculum: Curriculum }> {
  const res = await fetch(
    `${CURRICULUM_SVC_URL}/curricula/${curriculumId}?tenantId=${tenantId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch curriculum: ${res.status}`);
  }

  return res.json();
}

/**
 * Create a new curriculum
 */
export async function createCurriculum(
  tenantId: string,
  createdBy: string,
  accessToken: string,
  data: {
    name: string;
    description?: string;
    subjectArea: string;
    gradeLevel: string;
    standards?: string[];
    metadata?: Record<string, unknown>;
  }
): Promise<{ curriculum: Curriculum }> {
  const res = await fetch(
    `${CURRICULUM_SVC_URL}/curricula?tenantId=${tenantId}&createdBy=${createdBy}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to create curriculum: ${res.status}`);
  }

  return res.json();
}

/**
 * Update a curriculum
 */
export async function updateCurriculum(
  curriculumId: string,
  tenantId: string,
  accessToken: string,
  data: Partial<{
    name: string;
    description: string;
    subjectArea: string;
    gradeLevel: string;
    metadata: Record<string, unknown>;
  }>
): Promise<{ curriculum: Curriculum }> {
  const res = await fetch(
    `${CURRICULUM_SVC_URL}/curricula/${curriculumId}?tenantId=${tenantId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to update curriculum: ${res.status}`);
  }

  return res.json();
}

/**
 * Delete a curriculum
 */
export async function deleteCurriculum(
  curriculumId: string,
  tenantId: string,
  accessToken: string
): Promise<void> {
  const res = await fetch(
    `${CURRICULUM_SVC_URL}/curricula/${curriculumId}?tenantId=${tenantId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to delete curriculum: ${res.status}`);
  }
}

/**
 * Publish a curriculum
 */
export async function publishCurriculum(
  curriculumId: string,
  tenantId: string,
  accessToken: string
): Promise<{ curriculum: Curriculum }> {
  const res = await fetch(
    `${CURRICULUM_SVC_URL}/curricula/${curriculumId}/publish?tenantId=${tenantId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to publish curriculum: ${res.status}`);
  }

  return res.json();
}

/**
 * Archive a curriculum
 */
export async function archiveCurriculum(
  curriculumId: string,
  tenantId: string,
  accessToken: string
): Promise<{ curriculum: Curriculum }> {
  const res = await fetch(
    `${CURRICULUM_SVC_URL}/curricula/${curriculumId}/archive?tenantId=${tenantId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to archive curriculum: ${res.status}`);
  }

  return res.json();
}

/**
 * Clone a curriculum
 */
export async function cloneCurriculum(
  curriculumId: string,
  tenantId: string,
  createdBy: string,
  newName: string,
  accessToken: string
): Promise<{ curriculum: Curriculum }> {
  const res = await fetch(
    `${CURRICULUM_SVC_URL}/curricula/${curriculumId}/clone?tenantId=${tenantId}&createdBy=${createdBy}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newName }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to clone curriculum: ${res.status}`);
  }

  return res.json();
}

// ══════════════════════════════════════════════════════════════════════════════
// STANDARDS API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get standards alignment for a curriculum
 */
export async function getStandardsAlignment(
  curriculumId: string,
  tenantId: string,
  accessToken: string,
  framework?: string
): Promise<{ standards: StandardAlignment[] }> {
  const params = new URLSearchParams({ tenantId });
  if (framework) params.append('framework', framework);

  const res = await fetch(
    `${CURRICULUM_SVC_URL}/standards/curriculum/${curriculumId}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch standards alignment: ${res.status}`);
  }

  return res.json();
}

/**
 * Align a standard to a curriculum
 */
export async function alignStandardToCurriculum(
  curriculumId: string,
  tenantId: string,
  accessToken: string,
  data: {
    standardCode: string;
    standardDescription: string;
    framework: string;
    alignmentLevel?: AlignmentLevel;
    notes?: string;
  }
): Promise<{ alignment: StandardAlignment }> {
  const res = await fetch(
    `${CURRICULUM_SVC_URL}/standards/curriculum/${curriculumId}?tenantId=${tenantId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to align standard: ${res.status}`);
  }

  return res.json();
}

/**
 * Bulk align standards to a curriculum
 */
export async function bulkAlignStandards(
  curriculumId: string,
  tenantId: string,
  accessToken: string,
  standards: Array<{
    standardCode: string;
    standardDescription: string;
    framework: string;
    alignmentLevel?: AlignmentLevel;
    notes?: string;
  }>
): Promise<{ alignments: StandardAlignment[] }> {
  const res = await fetch(
    `${CURRICULUM_SVC_URL}/standards/curriculum/${curriculumId}/bulk?tenantId=${tenantId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ standards }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to bulk align standards: ${res.status}`);
  }

  return res.json();
}

/**
 * Remove a standard alignment
 */
export async function removeStandardAlignment(
  alignmentId: string,
  tenantId: string,
  accessToken: string
): Promise<void> {
  const res = await fetch(
    `${CURRICULUM_SVC_URL}/standards/${alignmentId}?tenantId=${tenantId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to remove standard alignment: ${res.status}`);
  }
}

/**
 * Get standards coverage report
 */
export async function getStandardsCoverageReport(
  curriculumId: string,
  tenantId: string,
  accessToken: string,
  framework?: string
): Promise<{ report: StandardsCoverageReport }> {
  const params = new URLSearchParams({ tenantId });
  if (framework) params.append('framework', framework);

  const res = await fetch(
    `${CURRICULUM_SVC_URL}/standards/coverage/${curriculumId}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch coverage report: ${res.status}`);
  }

  return res.json();
}

/**
 * Search available standards
 */
export async function searchStandards(
  query: string,
  accessToken: string,
  options?: {
    framework?: string;
    gradeLevel?: string;
  }
): Promise<{ standards: SearchableStandard[] }> {
  const params = new URLSearchParams({ query });
  if (options?.framework) params.append('framework', options.framework);
  if (options?.gradeLevel) params.append('gradeLevel', options.gradeLevel);

  const res = await fetch(`${CURRICULUM_SVC_URL}/standards/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to search standards: ${res.status}`);
  }

  return res.json();
}

// ══════════════════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export const SUBJECT_AREAS: Record<string, { label: string; colorClass: string }> = {
  MATH: { label: 'Mathematics', colorClass: 'bg-blue-100 text-blue-700' },
  ELA: { label: 'English Language Arts', colorClass: 'bg-purple-100 text-purple-700' },
  SCIENCE: { label: 'Science', colorClass: 'bg-green-100 text-green-700' },
  SOCIAL_STUDIES: { label: 'Social Studies', colorClass: 'bg-amber-100 text-amber-700' },
  ART: { label: 'Art', colorClass: 'bg-pink-100 text-pink-700' },
  MUSIC: { label: 'Music', colorClass: 'bg-indigo-100 text-indigo-700' },
  PE: { label: 'Physical Education', colorClass: 'bg-orange-100 text-orange-700' },
  TECH: { label: 'Technology', colorClass: 'bg-cyan-100 text-cyan-700' },
  WORLD_LANG: { label: 'World Languages', colorClass: 'bg-rose-100 text-rose-700' },
  OTHER: { label: 'Other', colorClass: 'bg-gray-100 text-gray-700' },
};

export const GRADE_LEVELS: Record<string, { label: string; shortLabel: string }> = {
  PRE_K: { label: 'Pre-Kindergarten', shortLabel: 'Pre-K' },
  K: { label: 'Kindergarten', shortLabel: 'K' },
  '1': { label: '1st Grade', shortLabel: '1' },
  '2': { label: '2nd Grade', shortLabel: '2' },
  '3': { label: '3rd Grade', shortLabel: '3' },
  '4': { label: '4th Grade', shortLabel: '4' },
  '5': { label: '5th Grade', shortLabel: '5' },
  '6': { label: '6th Grade', shortLabel: '6' },
  '7': { label: '7th Grade', shortLabel: '7' },
  '8': { label: '8th Grade', shortLabel: '8' },
  '9': { label: '9th Grade', shortLabel: '9' },
  '10': { label: '10th Grade', shortLabel: '10' },
  '11': { label: '11th Grade', shortLabel: '11' },
  '12': { label: '12th Grade', shortLabel: '12' },
  K_2: { label: 'Grades K-2', shortLabel: 'K-2' },
  '3_5': { label: 'Grades 3-5', shortLabel: '3-5' },
  '6_8': { label: 'Grades 6-8', shortLabel: '6-8' },
  '9_12': { label: 'Grades 9-12', shortLabel: '9-12' },
};

export const STATUS_DISPLAY: Record<CurriculumStatus, { label: string; colorClass: string }> = {
  DRAFT: { label: 'Draft', colorClass: 'bg-gray-100 text-gray-700' },
  PUBLISHED: { label: 'Published', colorClass: 'bg-green-100 text-green-700' },
  ARCHIVED: { label: 'Archived', colorClass: 'bg-yellow-100 text-yellow-700' },
};

export const FRAMEWORKS: Record<string, { label: string; description: string }> = {
  CCSS: { label: 'Common Core State Standards', description: 'Math and ELA standards' },
  NGSS: { label: 'Next Generation Science Standards', description: 'Science standards' },
  C3: { label: 'C3 Framework', description: 'Social studies standards' },
  CSTA: { label: 'CSTA Standards', description: 'Computer science standards' },
  ISTE: { label: 'ISTE Standards', description: 'Technology standards' },
  STATE: { label: 'State Standards', description: 'State-specific standards' },
};

export function getSubjectLabel(subjectArea: string): string {
  return SUBJECT_AREAS[subjectArea]?.label ?? subjectArea;
}

export function getGradeLevelLabel(gradeLevel: string): string {
  return GRADE_LEVELS[gradeLevel]?.label ?? gradeLevel;
}

export function getStatusLabel(status: CurriculumStatus): string {
  return STATUS_DISPLAY[status]?.label ?? status;
}

export function getFrameworkLabel(framework: string): string {
  return FRAMEWORKS[framework]?.label ?? framework;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
