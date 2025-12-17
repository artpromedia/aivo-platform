/**
 * Assets API Integration Tests
 *
 * Tests for asset upload, management, and folder operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../lib/api/client';
import {
  listAssets,
  getAsset,
  uploadAsset,
  deleteAsset,
  bulkDeleteAssets,
  createFolder,
  deleteFolder,
  moveAssets,
  formatFileSize,
  isAllowedFileType,
  getAssetCategory,
} from '../lib/api/assets';

// Mock the API client
vi.mock('../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

describe('Assets API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAssets', () => {
    it('should fetch assets with default parameters', async () => {
      const mockResponse = {
        items: [{ id: 'asset-1', name: 'image.jpg' }],
        total: 1,
        page: 1,
        limit: 20,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await listAssets();

      expect(apiClient.get).toHaveBeenCalledWith('/assets', {
        params: { page: 1, limit: 20 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should filter by folder', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ items: [] });

      await listAssets({ folderId: 'folder-123' });

      expect(apiClient.get).toHaveBeenCalledWith('/assets', {
        params: expect.objectContaining({ folderId: 'folder-123' }),
      });
    });

    it('should filter by asset type', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ items: [] });

      await listAssets({ mimeType: 'image/*' });

      expect(apiClient.get).toHaveBeenCalledWith('/assets', {
        params: expect.objectContaining({ mimeType: 'image/*' }),
      });
    });

    it('should support search', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ items: [] });

      await listAssets({ search: 'photo' });

      expect(apiClient.get).toHaveBeenCalledWith('/assets', {
        params: expect.objectContaining({ search: 'photo' }),
      });
    });
  });

  describe('getAsset', () => {
    it('should fetch single asset by ID', async () => {
      const mockAsset = {
        id: 'asset-123',
        name: 'document.pdf',
        type: 'document',
        size: 1024,
        url: 'https://storage.example.com/doc.pdf',
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockAsset);

      const result = await getAsset('asset-123');

      expect(apiClient.get).toHaveBeenCalledWith('/assets/asset-123');
      expect(result).toEqual(mockAsset);
    });
  });

  describe('uploadAsset', () => {
    it('should upload file with progress callback', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const onProgress = vi.fn();
      const mockAsset = { id: 'new-asset', name: 'test.jpg', url: 'https://...' };

      vi.mocked(apiClient.upload).mockResolvedValueOnce(mockAsset);

      const result = await uploadAsset(
        mockFile,
        {
          folderId: 'folder-123',
        },
        onProgress
      );

      expect(apiClient.upload).toHaveBeenCalledWith(
        '/assets/upload',
        expect.any(FormData),
        onProgress
      );
      expect(result).toEqual(mockAsset);
    });

    it('should set folder in FormData', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(apiClient.upload).mockImplementation(async (url, formData) => {
        expect(formData.get('folderId')).toBe('folder-123');
        return { id: 'asset-1' };
      });

      await uploadAsset(mockFile, { folderId: 'folder-123' });
    });
  });

  describe('deleteAsset', () => {
    it('should delete asset by ID', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

      await deleteAsset('asset-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/assets/asset-123');
    });
  });

  describe('bulkDeleteAssets', () => {
    it('should delete multiple assets', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ deleted: 3 });

      await bulkDeleteAssets(['asset-1', 'asset-2', 'asset-3']);

      expect(apiClient.post).toHaveBeenCalledWith('/assets/bulk-delete', {
        ids: ['asset-1', 'asset-2', 'asset-3'],
      });
    });
  });
});

describe('Folder API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createFolder', () => {
    it('should create folder with name', async () => {
      const mockFolder = { id: 'folder-123', name: 'Images' };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockFolder);

      const result = await createFolder('Images');

      expect(apiClient.post).toHaveBeenCalledWith('/assets/folders', {
        name: 'Images',
        parentId: undefined,
      });
      expect(result).toEqual(mockFolder);
    });

    it('should create nested folder', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ id: 'folder-456' });

      await createFolder('Thumbnails', 'folder-123');

      expect(apiClient.post).toHaveBeenCalledWith('/assets/folders', {
        name: 'Thumbnails',
        parentId: 'folder-123',
      });
    });
  });

  describe('deleteFolder', () => {
    it('should delete folder by ID', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

      await deleteFolder('folder-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/assets/folders/folder-123');
    });
  });

  describe('moveAssets', () => {
    it('should move assets to folder', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ moved: 2 });

      await moveAssets(['asset-1', 'asset-2'], 'folder-123');

      expect(apiClient.post).toHaveBeenCalledWith('/assets/move', {
        assetIds: ['asset-1', 'asset-2'],
        targetFolderId: 'folder-123',
      });
    });

    it('should move assets to root', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ moved: 1 });

      await moveAssets(['asset-1'], null);

      expect(apiClient.post).toHaveBeenCalledWith('/assets/move', {
        assetIds: ['asset-1'],
        targetFolderId: null,
      });
    });
  });
});

describe('Utility Functions', () => {
  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });

    it('should handle zero', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
  });

  describe('isAllowedFileType', () => {
    it('should allow image files', () => {
      expect(isAllowedFileType('photo.jpg')).toBe(true);
      expect(isAllowedFileType('image.png')).toBe(true);
      expect(isAllowedFileType('graphic.gif')).toBe(true);
      expect(isAllowedFileType('logo.svg')).toBe(true);
      expect(isAllowedFileType('photo.webp')).toBe(true);
    });

    it('should allow video files', () => {
      expect(isAllowedFileType('video.mp4')).toBe(true);
      expect(isAllowedFileType('clip.webm')).toBe(true);
      expect(isAllowedFileType('movie.mov')).toBe(true);
    });

    it('should allow audio files', () => {
      expect(isAllowedFileType('sound.mp3')).toBe(true);
      expect(isAllowedFileType('audio.wav')).toBe(true);
      expect(isAllowedFileType('voice.ogg')).toBe(true);
    });

    it('should allow document files', () => {
      expect(isAllowedFileType('document.pdf')).toBe(true);
      expect(isAllowedFileType('word.doc')).toBe(true);
      expect(isAllowedFileType('word.docx')).toBe(true);
    });

    it('should reject disallowed files', () => {
      expect(isAllowedFileType('script.exe')).toBe(false);
      expect(isAllowedFileType('file.bat')).toBe(false);
      expect(isAllowedFileType('shell.sh')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isAllowedFileType('IMAGE.JPG')).toBe(true);
      expect(isAllowedFileType('Video.MP4')).toBe(true);
    });
  });

  describe('getAssetCategory', () => {
    it('should categorize images', () => {
      expect(getAssetCategory('photo.jpg')).toBe('image');
      expect(getAssetCategory('logo.png')).toBe('image');
    });

    it('should categorize videos', () => {
      expect(getAssetCategory('video.mp4')).toBe('video');
      expect(getAssetCategory('clip.webm')).toBe('video');
    });

    it('should categorize audio', () => {
      expect(getAssetCategory('song.mp3')).toBe('audio');
      expect(getAssetCategory('sound.wav')).toBe('audio');
    });

    it('should categorize documents', () => {
      expect(getAssetCategory('file.pdf')).toBe('document');
      expect(getAssetCategory('report.docx')).toBe('document');
    });

    it('should return other for unknown types', () => {
      expect(getAssetCategory('file.xyz')).toBe('other');
      expect(getAssetCategory('unknown')).toBe('other');
    });
  });
});
