/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-unused-vars */
/**
 * File Upload Component
 *
 * Drag and drop file upload with preview and validation
 */

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { formatFileSize, isAllowedFileType, getFileExtension } from '@/lib/utils/export-utils';

interface FileInfo {
  name: string;
  url: string;
  type: string;
  size?: number;
}

interface FileUploadProps {
  files: FileInfo[];
  onChange: (files: FileInfo[]) => void;
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function FileUpload({
  files,
  onChange,
  accept = '*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  multiple = true,
  disabled = false,
  className,
  error: externalError,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const displayError = externalError || error;

  const allowedTypes = accept.split(',').map((t) => t.trim());

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSize)}.`;
    }
    if (accept !== '*' && !isAllowedFileType(file.name, allowedTypes)) {
      return `File type "${getFileExtension(file.name)}" is not allowed.`;
    }
    return null;
  };

  const handleFiles = async (fileList: FileList) => {
    setError(null);

    if (!multiple && fileList.length > 1) {
      setError('Only one file can be uploaded.');
      return;
    }

    if (files.length + fileList.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    const newFiles: FileInfo[] = [];
    const errors: string[] = [];

    for (const file of Array.from(fileList)) {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(validationError);
        continue;
      }

      // In production, would upload to server here
      // For now, create object URL for preview
      newFiles.push({
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size,
      });
    }

    if (errors.length > 0) {
      setError(errors[0]);
    }

    if (newFiles.length > 0) {
      onChange([...files, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    // Revoke object URL to free memory
    URL.revokeObjectURL(newFiles[index].url);
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const getFileIcon = (type: string, name: string): string => {
    const ext = getFileExtension(name);
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📽️';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    return '📎';
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          isDragging && 'border-primary-500 bg-primary-50',
          !isDragging && 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
          disabled && 'cursor-not-allowed opacity-50',
          displayError && 'border-red-500'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="mb-2 text-4xl">📁</div>
        <p className="text-sm font-medium text-gray-700">
          {isDragging ? 'Drop files here' : 'Drop files here or click to upload'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Max {formatFileSize(maxSize)} per file · {maxFiles} files max
        </p>
        {accept !== '*' && (
          <p className="mt-1 text-xs text-gray-400">Allowed: {allowedTypes.join(', ')}</p>
        )}
      </div>

      {/* Error */}
      {displayError && <p className="mt-2 text-sm text-red-600">{displayError}</p>}

      {/* File List */}
      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((file, index) => (
            <li
              key={index}
              className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getFileIcon(file.type, file.name)}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</p>
                  {file.size && (
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    removeFile(index);
                  }}
                  disabled={disabled}
                  className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
