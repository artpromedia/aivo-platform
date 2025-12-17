/**
 * Review API Integration Tests
 *
 * Tests for review queue, submissions, and comment management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../lib/api/client';
import {
  getReviewQueue,
  getReviewItem,
  submitReview,
  addComment,
  getVersionComments,
  updateComment,
  deleteComment,
  getReviewHistory,
  setReviewPriority,
  unassignReview,
  assignReviewToMe,
} from '../lib/api/review';
import type { ReviewPriority } from '../lib/api/review';

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

describe('Review Queue API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReviewQueue', () => {
    it('should fetch review queue with default parameters', async () => {
      const mockResponse = {
        items: [{ id: 'review-1', contentId: 'content-1', state: 'IN_REVIEW' }],
        pagination: { total: 1, limit: 20, offset: 0 },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await getReviewQueue();

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should filter by priority', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ items: [] });

      await getReviewQueue({ priority: 'HIGH' });

      expect(apiClient.get).toHaveBeenCalled();
    });

    it('should filter by assignedToMe', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ items: [] });

      await getReviewQueue({ assignedToMe: true });

      expect(apiClient.get).toHaveBeenCalled();
    });
  });

  describe('getReviewItem', () => {
    it('should fetch single review item', async () => {
      const mockReview = {
        id: 'review-123',
        versionNumber: 1,
        state: 'IN_REVIEW',
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockReview);

      const result = await getReviewItem('review-123');

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toEqual(mockReview);
    });
  });

  describe('submitReview', () => {
    it('should submit review decision', async () => {
      const review = {
        decision: 'APPROVED' as const,
        comments: 'Looks great!',
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ decision: 'APPROVED' });

      await submitReview('review-123', review);

      expect(apiClient.post).toHaveBeenCalled();
    });

    it('should submit rejection with required feedback', async () => {
      const review = {
        decision: 'REJECTED' as const,
        comments: 'Needs more examples',
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ decision: 'REJECTED' });

      await submitReview('review-123', review);

      expect(apiClient.post).toHaveBeenCalled();
    });

    it('should request changes', async () => {
      const review = {
        decision: 'CHANGES_REQUESTED' as const,
        comments: 'Please fix typos',
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ decision: 'CHANGES_REQUESTED' });

      await submitReview('review-123', review);

      expect(apiClient.post).toHaveBeenCalled();
    });
  });
});

describe('Comments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVersionComments', () => {
    it('should fetch comments for a version', async () => {
      const mockComments = [
        { id: 'comment-1', content: 'Great work!', userId: 'user-1' },
        { id: 'comment-2', content: 'Minor fix needed', userId: 'user-2' },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockComments);

      const result = await getVersionComments('version-123');

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toEqual(mockComments);
    });
  });

  describe('addComment', () => {
    it('should add comment to version', async () => {
      const newComment = { id: 'comment-3', content: 'New comment' };

      vi.mocked(apiClient.post).mockResolvedValueOnce(newComment);

      const result = await addComment('version-123', {
        content: 'New comment',
      });

      expect(apiClient.post).toHaveBeenCalled();
      expect(result).toEqual(newComment);
    });

    it('should add comment with block reference', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ id: 'comment-4' });

      await addComment('version-123', {
        content: 'Fix this block',
        blockId: 'block-1',
      });

      expect(apiClient.post).toHaveBeenCalled();
    });

    it('should add threaded reply', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ id: 'comment-5' });

      await addComment('version-123', {
        content: 'Reply to parent',
        parentId: 'comment-1',
      });

      expect(apiClient.post).toHaveBeenCalled();
    });
  });

  describe('updateComment', () => {
    it('should update comment text', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ id: 'comment-1', content: 'Updated' });

      await updateComment('version-123', 'comment-1', 'Updated');

      expect(apiClient.patch).toHaveBeenCalled();
    });
  });

  describe('deleteComment', () => {
    it('should delete comment', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

      await deleteComment('version-123', 'comment-1');

      expect(apiClient.delete).toHaveBeenCalled();
    });
  });
});

describe('Review History API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReviewHistory', () => {
    it('should fetch review history for version', async () => {
      const mockHistory = [
        { id: 'history-1', decision: 'APPROVED', createdAt: '2024-01-02T00:00:00Z' },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockHistory);

      const result = await getReviewHistory('version-123');

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toEqual(mockHistory);
    });
  });
});

describe('Review Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setReviewPriority', () => {
    it('should update review priority', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ priority: 'HIGH' });

      await setReviewPriority('review-123', 'HIGH');

      expect(apiClient.patch).toHaveBeenCalled();
    });

    it('should set priority levels', async () => {
      const priorities: ReviewPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

      for (const priority of priorities) {
        vi.mocked(apiClient.patch).mockResolvedValueOnce({ priority });
        await setReviewPriority('review-123', priority);
        expect(apiClient.patch).toHaveBeenCalled();
      }
    });
  });

  describe('assignReviewToMe', () => {
    it('should assign review to current user', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        assignedToUserId: 'user-456',
      });

      await assignReviewToMe('review-123');

      expect(apiClient.post).toHaveBeenCalled();
    });
  });

  describe('unassignReview', () => {
    it('should unassign review', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        assignedToUserId: null,
      });

      await unassignReview('review-123');

      expect(apiClient.post).toHaveBeenCalled();
    });
  });
});
