/**
 * MediaUploader Component
 *
 * Upload component for images, videos, and documents with:
 * - Drag and drop support
 * - Multiple file upload
 * - Progress tracking
 * - File type validation
 * - Preview thumbnails
 */

'use client';

import { AlertCircle, CheckCircle, File, Film, Image, Loader2, Upload, X } from 'lucide-react';
import React, { useState, useCallback, useRef } from 'react';

import { formatFileSize, isAllowedFileType, getAssetCategory } from '../../api/assets';
import { useAssetUpload, type UploadProgress } from '../../hooks/useAssets';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface MediaUploaderProps {
  readonly onUploadComplete?: ((assetId: string, url: string) => void) | undefined;
  readonly accept?: string | undefined;
  readonly maxFileSize?: number | undefined; // in bytes
  readonly maxFiles?: number | undefined;
  readonly folderId?: string | null | undefined;
  readonly className?: string | undefined;
}

interface FileWithPreview extends File {
  preview?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_ACCEPT = 'image/*,video/*,audio/*,.pdf,.doc,.docx';
const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_MAX_FILES = 10;

// ══════════════════════════════════════════════════════════════════════════════
// FILE TYPE ICONS
// ══════════════════════════════════════════════════════════════════════════════

function getFileIcon(file: File): React.ElementType {
  const type = file.type;
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Film;
  return File;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function MediaUploader({
  onUploadComplete,
  accept = DEFAULT_ACCEPT,
  maxFileSize = DEFAULT_MAX_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  folderId = null,
  className = '',
}: MediaUploaderProps) {
  // State
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Upload hook
  const {
    uploads,
    isUploading,
    completedCount,
    errorCount,
    totalProgress,
    upload: _upload,
    uploadMultiple,
    clearCompleted,
    clearAll: _clearAll,
  } = useAssetUpload({ folderId });

  // Validate file
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > maxFileSize) {
        return `${file.name} exceeds maximum size of ${formatFileSize(maxFileSize)}`;
      }

      // Check file type
      if (!isAllowedFileType(file.name)) {
        return `${file.name} has an unsupported file type`;
      }

      return null;
    },
    [maxFileSize]
  );

  // Process selected files
  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const errors: string[] = [];
      const validFiles: FileWithPreview[] = [];

      // Limit number of files
      const filesToProcess = fileArray.slice(0, maxFiles);
      if (fileArray.length > maxFiles) {
        errors.push(`Only ${maxFiles} files can be uploaded at once`);
      }

      filesToProcess.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          // Create preview for images
          const fileWithPreview: FileWithPreview = file;
          if (file.type.startsWith('image/')) {
            fileWithPreview.preview = URL.createObjectURL(file);
          }
          validFiles.push(fileWithPreview);
        }
      });

      setValidationErrors(errors);
      setSelectedFiles(validFiles);
    },
    [maxFiles, validateFile]
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  // Remove a selected file
  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => {
      const file = prev[index];
      // Revoke object URL to prevent memory leak
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Start upload
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      const assets = await uploadMultiple(selectedFiles);

      // Clean up previews
      selectedFiles.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });

      // Notify parent of uploads
      assets.forEach((asset) => {
        onUploadComplete?.(asset.id, asset.url);
      });

      setSelectedFiles([]);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [selectedFiles, uploadMultiple, onUploadComplete]);

  // Trigger file picker
  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Clean up on unmount
  React.useEffect(() => {
    const currentFiles = selectedFiles;
    return () => {
      currentFiles.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Cleanup only needs to run on unmount
  }, []);

  return (
    <div className={`media-uploader ${className}`}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drop zone */}
      <button
        type="button"
        onClick={openFilePicker}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
        `}
      >
        <Upload
          className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
        />
        <p className="text-lg font-medium text-gray-700 mb-1">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-sm text-gray-500 mb-4">or click to browse</p>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <span>Images, videos, audio, documents</span>
          <span>•</span>
          <span>Max {formatFileSize(maxFileSize)}</span>
          <span>•</span>
          <span>Up to {maxFiles} files</span>
        </div>
      </button>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          {validationErrors.map((error) => (
            <div key={error} className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Selected files ({selectedFiles.length})
            </h4>
            <button
              onClick={() => {
                setSelectedFiles([]);
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const FileIcon = getFileIcon(file);
              return (
                <div
                  key={`${file.name}-${String(file.lastModified)}-${String(file.size)}`}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                >
                  {/* Preview or icon */}
                  {file.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Object URL preview, not a persistent image
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      <FileIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {getAssetCategory(file.name)}
                    </p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading... ({totalProgress}%)
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Uploads</h4>
            <button onClick={clearCompleted} className="text-xs text-gray-500 hover:underline">
              Clear completed
            </button>
          </div>

          <div className="space-y-2">
            {uploads.map((upload) => (
              <UploadProgressItem key={upload.fileId} upload={upload} />
            ))}
          </div>

          {/* Summary */}
          {(completedCount > 0 || errorCount > 0) && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              {completedCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  {completedCount} completed
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {errorCount} failed
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// UPLOAD PROGRESS ITEM
// ══════════════════════════════════════════════════════════════════════════════

interface UploadProgressItemProps {
  readonly upload: UploadProgress;
}

function UploadProgressItem({ upload }: UploadProgressItemProps) {
  const getStatusIcon = () => {
    switch (upload.status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 text-gray-400" />;
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (upload.status) {
      case 'pending':
        return 'bg-gray-200';
      case 'uploading':
        return 'bg-blue-500';
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
    }
  };

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{upload.fileName}</p>
          {upload.error && <p className="text-xs text-red-500 mt-0.5">{upload.error}</p>}
        </div>
        <span className="text-xs text-gray-500">{upload.progress}%</span>
      </div>

      {/* Progress bar */}
      {upload.status === 'uploading' && (
        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${upload.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default MediaUploader;
