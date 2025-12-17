/**
 * Content API Integration Tests
 *
 * Tests for content CRUD operations and version management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../lib/api/client';
import {
  listContent,
  getContent,
  createContent,
  updateContent,
  deleteContent,
  listVersions,
  getVersion,
  createNewVersion,
  submitForReview,
  approveVersion,
  rejectVersion,
  publishVersion,
} from '../lib/api/content';

// Mock the API client
vi.mock('../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Content API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listContent', () => {
    it('should fetch content list with default pagination', async () => {
      const mockResponse = {
        items: [{ id: '1', title: 'Test' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await listContent();

      expect(apiClient.get).toHaveBeenCalledWith('/content', {
        params: { page: 1, limit: 20 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should apply filters when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ items: [] });

      await listContent({
        state: 'DRAFT',
        subject: 'MATH',
        gradeBand: 'G6_8',
        search: 'algebra',
        page: 2,
        pageSize: 10,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/content', {
        params: {
          page: 2,
          pageSize: 10,
          state: 'DRAFT',
          subject: 'MATH',
          gradeBand: 'G6_8',
          search: 'algebra',
        },
      });
    });
  });

  describe('getContent', () => {
    it('should fetch single content by ID', async () => {
      const mockContent = {
        id: 'content-123',
        title: 'Test Content',
        status: 'DRAFT',
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockContent);

      const result = await getContent('content-123');

      expect(apiClient.get).toHaveBeenCalledWith('/content/content-123');
      expect(result).toEqual(mockContent);
    });
  });

  describe('createContent', () => {
    it('should create new content', async () => {
      const newContent = {
        title: 'New Lesson',
        subject: 'MATH' as const,
        gradeBand: 'G6_8' as const,
        contentType: 'LESSON' as const,
      };

      const mockCreated = { id: 'new-123', ...newContent };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockCreated);

      const result = await createContent(newContent);

      expect(apiClient.post).toHaveBeenCalledWith('/content', newContent);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateContent', () => {
    it('should update existing content', async () => {
      const updates = { title: 'Updated Title' };
      const mockUpdated = { id: 'content-123', title: 'Updated Title' };

      vi.mocked(apiClient.put).mockResolvedValueOnce(mockUpdated);

      const result = await updateContent('content-123', updates);

      expect(apiClient.put).toHaveBeenCalledWith('/content/content-123', updates);
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('deleteContent', () => {
    it('should delete content by ID', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

      await deleteContent('content-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/content/content-123');
    });
  });
});

describe('Version API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listVersions', () => {
    it('should list versions for content', async () => {
      const mockVersions = [
        { id: 'v1', version: 1, state: 'PUBLISHED' },
        { id: 'v2', version: 2, state: 'DRAFT' },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockVersions);

      const result = await listVersions('content-123');

      expect(apiClient.get).toHaveBeenCalledWith('/content/content-123/versions');
      expect(result).toEqual(mockVersions);
    });
  });

  describe('getVersion', () => {
    it('should get specific version', async () => {
      const mockVersion = { id: 'v1', version: 1, content: {} };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockVersion);

      const result = await getVersion('content-123', 1);

      expect(apiClient.get).toHaveBeenCalledWith('/content/content-123/versions/1');
      expect(result).toEqual(mockVersion);
    });
  });

  describe('createNewVersion', () => {
    it('should create new version from existing', async () => {
      const mockNewVersion = { id: 'v2', version: 2, state: 'DRAFT' };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockNewVersion);

      const result = await createNewVersion('content-123');

      expect(apiClient.post).toHaveBeenCalledWith('/content/content-123/versions', undefined);
      expect(result).toEqual(mockNewVersion);
    });
  });
});

describe('Workflow API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitForReview', () => {
    it('should submit version for review', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ state: 'IN_REVIEW' });

      await submitForReview('content-123', 1, 'Please review this lesson');

      expect(apiClient.post).toHaveBeenCalledWith('/content/content-123/versions/1/submit', {
        comment: 'Please review this lesson',
      });
    });
  });

  describe('approveVersion', () => {
    it('should approve version', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ state: 'APPROVED' });

      await approveVersion('content-123', 1);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/content/content-123/versions/1/approve',
        undefined
      );
    });
  });

  describe('rejectVersion', () => {
    it('should reject version with reason', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ state: 'DRAFT' });

      await rejectVersion('content-123', 1, 'Needs more examples');

      expect(apiClient.post).toHaveBeenCalledWith('/content/content-123/versions/1/reject', {
        reason: 'Needs more examples',
      });
    });
  });

  describe('publishVersion', () => {
    it('should publish approved version', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ state: 'PUBLISHED' });

      await publishVersion('content-123', 1);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/content/content-123/versions/1/publish',
        undefined
      );
    });
  });
});
