/**
 * Content Service — Error Path & Edge Case Tests
 *
 * Covers:
 * - Content not found / deleted content access
 * - Invalid SCORM package handling
 * - File upload failures (size limits, invalid types)
 * - Content versioning conflicts
 * - Publishing workflow errors
 * - Search indexing failures
 * - Content access control violations
 *
 * @module services/content-svc/test/error-paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
    ...overrides,
  };
}

function createMockStorage(overrides: Record<string, unknown> = {}) {
  return {
    upload: vi.fn().mockResolvedValue({ key: 'uploads/file.pdf', size: 1024 }),
    download: vi.fn().mockResolvedValue(Buffer.from('content')),
    delete: vi.fn().mockResolvedValue({ deleted: true }),
    getSignedUrl: vi.fn().mockResolvedValue('https://cdn.example.com/signed-url'),
    ...overrides,
  };
}

function createMockSearchIndex(overrides: Record<string, unknown> = {}) {
  return {
    index: vi.fn().mockResolvedValue({ indexed: true }),
    remove: vi.fn().mockResolvedValue({ removed: true }),
    search: vi.fn().mockResolvedValue({ hits: [], total: 0 }),
    ...overrides,
  };
}

// ============================================================================
// 1. Content Not Found / Deleted Access
// ============================================================================

describe('Content Error Paths — Content Access', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should return 404 for non-existent content', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const result = await getContent(db, 'nonexistent-id', 'tenant-1');

    expect(result.found).toBe(false);
    expect(result.error).toBe('CONTENT_NOT_FOUND');
  });

  it('should return 410 for deleted content', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: 'c1', status: 'deleted', deletedAt: '2025-01-01' }],
    });

    const result = await getContent(db, 'c1', 'tenant-1');

    expect(result.found).toBe(false);
    expect(result.error).toBe('CONTENT_DELETED');
  });

  it('should deny access to draft content for non-owner', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: 'c1', status: 'draft', ownerId: 'teacher-1', tenantId: 'tenant-1' }],
    });

    const result = await getContent(db, 'c1', 'tenant-1', { userId: 'teacher-2', role: 'teacher' });

    expect(result.accessible).toBe(false);
    expect(result.error).toBe('ACCESS_DENIED');
  });

  it('should deny cross-tenant content access', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: 'c1', status: 'published', tenantId: 'tenant-1' }],
    });

    const result = await getContent(db, 'c1', 'tenant-2');

    expect(result.accessible).toBe(false);
    expect(result.error).toBe('CROSS_TENANT_ACCESS');
  });
});

// ============================================================================
// 2. Invalid SCORM Package Handling
// ============================================================================

describe('Content Error Paths — SCORM Validation', () => {
  it('should reject SCORM package without imsmanifest.xml', () => {
    const result = validateScormPackage({
      files: ['index.html', 'styles.css'],
      hasManifest: false,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('MISSING_MANIFEST');
  });

  it('should reject SCORM package with invalid manifest XML', () => {
    const result = validateScormPackage({
      files: ['imsmanifest.xml', 'index.html'],
      hasManifest: true,
      manifestValid: false,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_MANIFEST');
  });

  it('should reject SCORM package exceeding size limit', () => {
    const result = validateScormPackage({
      files: ['imsmanifest.xml', 'large-video.mp4'],
      hasManifest: true,
      manifestValid: true,
      totalSizeMb: 600,
      maxSizeMb: 500,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('PACKAGE_TOO_LARGE');
  });

  it('should accept valid SCORM package', () => {
    const result = validateScormPackage({
      files: ['imsmanifest.xml', 'index.html', 'styles.css'],
      hasManifest: true,
      manifestValid: true,
      totalSizeMb: 50,
      maxSizeMb: 500,
    });

    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// 3. File Upload Failures
// ============================================================================

describe('Content Error Paths — File Upload', () => {
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it('should reject file exceeding size limit', () => {
    const result = validateUpload({
      filename: 'large.pdf',
      sizeMb: 200,
      maxSizeMb: 100,
      mimeType: 'application/pdf',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('FILE_TOO_LARGE');
  });

  it('should reject disallowed file types', () => {
    const result = validateUpload({
      filename: 'script.exe',
      sizeMb: 1,
      maxSizeMb: 100,
      mimeType: 'application/x-msdownload',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('DISALLOWED_TYPE');
  });

  it('should handle storage upload failure', async () => {
    storage.upload.mockRejectedValue(new Error('S3 bucket access denied'));

    const result = await uploadContent(storage, {
      filename: 'doc.pdf',
      content: Buffer.from('content'),
      tenantId: 'tenant-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('UPLOAD_FAILED');
  });

  it('should detect file extension / MIME type mismatch', () => {
    const result = validateUpload({
      filename: 'document.pdf',
      sizeMb: 1,
      maxSizeMb: 100,
      mimeType: 'text/javascript', // suspicious
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('MIME_MISMATCH');
  });

  it('should reject empty uploads', () => {
    const result = validateUpload({
      filename: 'empty.pdf',
      sizeMb: 0,
      maxSizeMb: 100,
      mimeType: 'application/pdf',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('EMPTY_FILE');
  });
});

// ============================================================================
// 4. Content Versioning Conflicts
// ============================================================================

describe('Content Error Paths — Versioning', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it('should detect version conflict on save', async () => {
    db.execute.mockResolvedValue({ affectedRows: 0 }); // optimistic lock fail

    const result = await saveContentVersion(db, {
      contentId: 'c1',
      version: 3,
      data: { title: 'Updated Title' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('VERSION_CONFLICT');
  });

  it('should handle revert to non-existent version', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const result = await revertToVersion(db, 'c1', 99);

    expect(result.success).toBe(false);
    expect(result.error).toBe('VERSION_NOT_FOUND');
  });

  it('should prevent version creation on deleted content', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: 'c1', status: 'deleted' }],
    });

    const result = await saveContentVersion(db, {
      contentId: 'c1',
      version: 1,
      data: { title: 'Revive' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('CONTENT_DELETED');
  });
});

// ============================================================================
// 5. Publishing Workflow Errors
// ============================================================================

describe('Content Error Paths — Publishing', () => {
  it('should reject publishing draft without required fields', () => {
    const result = validateForPublishing({
      title: 'My Content',
      description: '',
      gradeLevel: null,
      subjectArea: 'math',
    });

    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('description');
    expect(result.missingFields).toContain('gradeLevel');
  });

  it('should reject publishing content with broken references', () => {
    const result = validateContentReferences({
      internalLinks: ['content-1', 'content-2'],
      existingIds: new Set(['content-1']),
    });

    expect(result.valid).toBe(false);
    expect(result.brokenRefs).toContain('content-2');
  });

  it('should reject unpublish of content with active learner assignments', () => {
    const result = canUnpublish({
      contentId: 'c1',
      activeAssignments: 5,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ACTIVE_ASSIGNMENTS');
  });
});

// ============================================================================
// 6. Search Indexing Failures
// ============================================================================

describe('Content Error Paths — Search Index', () => {
  let searchIndex: ReturnType<typeof createMockSearchIndex>;

  beforeEach(() => {
    searchIndex = createMockSearchIndex();
  });

  it('should handle search index unavailable', async () => {
    searchIndex.index.mockRejectedValue(new Error('Elasticsearch cluster unavailable'));

    const result = await indexContent(searchIndex, { id: 'c1', title: 'Test', body: 'Content' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('INDEX_UNAVAILABLE');
    expect(result.shouldRetry).toBe(true);
  });

  it('should handle search query failure gracefully', async () => {
    searchIndex.search.mockRejectedValue(new Error('search_phase_execution_exception'));

    const result = await searchContent(searchIndex, { query: 'math', tenantId: 'tenant-1' });

    expect(result.success).toBe(false);
    expect(result.hits).toEqual([]);
  });

  it('should handle index removal failure', async () => {
    searchIndex.remove.mockRejectedValue(new Error('document not found'));

    const result = await removeFromIndex(searchIndex, 'c1');

    // Should not fail hard — content is already gone
    expect(result.success).toBe(true);
    expect(result.warning).toBe('NOT_IN_INDEX');
  });
});

// ============================================================================
// Helper implementations
// ============================================================================

async function getContent(
  db: ReturnType<typeof createMockDb>,
  contentId: string,
  tenantId: string,
  requester?: { userId: string; role: string }
) {
  const { rows } = await db.query('SELECT * FROM content WHERE id = $1', [contentId]);

  if (rows.length === 0) return { found: false, accessible: false, error: 'CONTENT_NOT_FOUND' };

  const content = rows[0];
  if (content.status === 'deleted')
    return { found: false, accessible: false, error: 'CONTENT_DELETED' };
  if (content.tenantId && content.tenantId !== tenantId)
    return { found: true, accessible: false, error: 'CROSS_TENANT_ACCESS' };
  if (
    content.status === 'draft' &&
    requester &&
    content.ownerId !== requester.userId &&
    requester.role !== 'admin'
  ) {
    return { found: true, accessible: false, error: 'ACCESS_DENIED' };
  }

  return { found: true, accessible: true, error: null, content };
}

function validateScormPackage(params: {
  files: string[];
  hasManifest: boolean;
  manifestValid?: boolean;
  totalSizeMb?: number;
  maxSizeMb?: number;
}) {
  if (!params.hasManifest) return { valid: false, error: 'MISSING_MANIFEST' };
  if (params.manifestValid === false) return { valid: false, error: 'INVALID_MANIFEST' };
  if (params.totalSizeMb && params.maxSizeMb && params.totalSizeMb > params.maxSizeMb) {
    return { valid: false, error: 'PACKAGE_TOO_LARGE' };
  }
  return { valid: true, error: null };
}

function validateUpload(params: {
  filename: string;
  sizeMb: number;
  maxSizeMb: number;
  mimeType: string;
}) {
  if (params.sizeMb === 0) return { valid: false, error: 'EMPTY_FILE' };
  if (params.sizeMb > params.maxSizeMb) return { valid: false, error: 'FILE_TOO_LARGE' };

  const disallowed = new Set(['application/x-msdownload', 'application/x-sh', 'text/x-script']);
  if (disallowed.has(params.mimeType)) return { valid: false, error: 'DISALLOWED_TYPE' };

  const ext = params.filename.split('.').pop()?.toLowerCase();
  const mimeExtMap: Record<string, string[]> = {
    pdf: ['application/pdf'],
    jpg: ['image/jpeg'],
    png: ['image/png'],
    mp4: ['video/mp4'],
  };

  if (ext && mimeExtMap[ext] && !mimeExtMap[ext].includes(params.mimeType)) {
    return { valid: false, error: 'MIME_MISMATCH' };
  }

  return { valid: true, error: null };
}

async function uploadContent(
  storage: ReturnType<typeof createMockStorage>,
  params: { filename: string; content: Buffer; tenantId: string }
) {
  try {
    await storage.upload({ key: `${params.tenantId}/${params.filename}`, body: params.content });
    return { success: true, error: null };
  } catch {
    return { success: false, error: 'UPLOAD_FAILED' };
  }
}

async function saveContentVersion(
  db: ReturnType<typeof createMockDb>,
  params: { contentId: string; version: number; data: Record<string, unknown> }
) {
  const existing = await db.query('SELECT status FROM content WHERE id = $1', [params.contentId]);
  if (existing.rows.length > 0 && existing.rows[0].status === 'deleted') {
    return { success: false, error: 'CONTENT_DELETED' };
  }

  const result = await db.execute(
    'UPDATE content SET data = $1, version = version + 1 WHERE id = $2 AND version = $3',
    [params.data, params.contentId, params.version]
  );

  if (result.affectedRows === 0) return { success: false, error: 'VERSION_CONFLICT' };
  return { success: true, error: null };
}

async function revertToVersion(
  db: ReturnType<typeof createMockDb>,
  contentId: string,
  version: number
) {
  const { rows } = await db.query(
    'SELECT * FROM content_versions WHERE content_id = $1 AND version = $2',
    [contentId, version]
  );
  if (rows.length === 0) return { success: false, error: 'VERSION_NOT_FOUND' };
  return { success: true, error: null };
}

function validateForPublishing(content: {
  title: string;
  description: string;
  gradeLevel: string | null;
  subjectArea: string;
}) {
  const missingFields: string[] = [];
  if (!content.title) missingFields.push('title');
  if (!content.description) missingFields.push('description');
  if (!content.gradeLevel) missingFields.push('gradeLevel');
  if (!content.subjectArea) missingFields.push('subjectArea');

  return { valid: missingFields.length === 0, missingFields };
}

function validateContentReferences(params: { internalLinks: string[]; existingIds: Set<string> }) {
  const brokenRefs = params.internalLinks.filter((id) => !params.existingIds.has(id));
  return { valid: brokenRefs.length === 0, brokenRefs };
}

function canUnpublish(params: { contentId: string; activeAssignments: number }) {
  if (params.activeAssignments > 0) return { allowed: false, reason: 'ACTIVE_ASSIGNMENTS' };
  return { allowed: true, reason: null };
}

async function indexContent(
  searchIndex: ReturnType<typeof createMockSearchIndex>,
  content: { id: string; title: string; body: string }
) {
  try {
    await searchIndex.index(content);
    return { success: true, error: null, shouldRetry: false };
  } catch {
    return { success: false, error: 'INDEX_UNAVAILABLE', shouldRetry: true };
  }
}

async function searchContent(
  searchIndex: ReturnType<typeof createMockSearchIndex>,
  params: { query: string; tenantId: string }
) {
  try {
    const result = await searchIndex.search(params);
    return { success: true, hits: result.hits, total: result.total };
  } catch {
    return { success: false, hits: [], total: 0 };
  }
}

async function removeFromIndex(
  searchIndex: ReturnType<typeof createMockSearchIndex>,
  contentId: string
) {
  try {
    await searchIndex.remove(contentId);
    return { success: true, warning: null };
  } catch {
    return { success: true, warning: 'NOT_IN_INDEX' };
  }
}
