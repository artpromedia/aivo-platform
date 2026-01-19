'use client';

/**
 * Resource Uploader Component
 *
 * Allows teachers to upload and manage resources for lessons
 * Features:
 * - File upload with drag-and-drop
 * - Support for various file types
 * - Resource list with remove option
 * - URL resource addition
 */

import * as React from 'react';
import {
  Upload,
  FileText,
  Image,
  Video,
  Music,
  Link2,
  X,
  Plus,
  File,
  Paperclip,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface Resource {
  id: string;
  name: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'link' | 'other';
  url: string;
  size?: number;
  mimeType?: string;
}

interface ResourceUploaderProps {
  resources: Resource[];
  onUpload: (resource: Resource) => void;
  onRemove?: (resourceId: string) => void;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const FILE_TYPE_ICONS: Record<Resource['type'], React.ElementType> = {
  document: FileText,
  image: Image,
  video: Video,
  audio: Music,
  link: Link2,
  other: File,
};

const FILE_TYPE_COLORS: Record<Resource['type'], string> = {
  document: 'bg-blue-100 text-blue-700',
  image: 'bg-green-100 text-green-700',
  video: 'bg-red-100 text-red-700',
  audio: 'bg-purple-100 text-purple-700',
  link: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
};

function getResourceType(mimeType?: string, url?: string): Resource['type'] {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return 'link';
  }
  if (!mimeType) return 'other';

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('text')
  ) {
    return 'document';
  }

  return 'other';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function ResourceUploader({
  resources,
  onUpload,
  onRemove,
}: ResourceUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [showLinkInput, setShowLinkInput] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const [linkName, setLinkName] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      // In production, upload to storage service
      // For now, create a mock URL
      const mockUrl = URL.createObjectURL(file);

      const resource: Resource = {
        id: crypto.randomUUID(),
        name: file.name,
        type: getResourceType(file.type),
        url: mockUrl,
        size: file.size,
        mimeType: file.type,
      };

      onUpload(resource);
    }
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;

    const resource: Resource = {
      id: crypto.randomUUID(),
      name: linkName.trim() || linkUrl,
      type: 'link',
      url: linkUrl.trim(),
    };

    onUpload(resource);
    setLinkUrl('');
    setLinkName('');
    setShowLinkInput(false);
  };

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Paperclip className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Resources</h3>
        {resources.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {resources.length}
          </span>
        )}
      </div>

      {/* Resource List */}
      {resources.length > 0 && (
        <ScrollArea className="mb-3 max-h-48">
          <div className="space-y-2 pr-2">
            {resources.map((resource) => {
              const Icon = FILE_TYPE_ICONS[resource.type];
              return (
                <div
                  key={resource.id}
                  className="flex items-center gap-2 rounded-lg border bg-white p-2"
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded',
                      FILE_TYPE_COLORS[resource.type]
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{resource.name}</p>
                    {resource.size && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(resource.size)}
                      </p>
                    )}
                  </div>
                  {onRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(resource.id)}
                      className="h-7 w-7 shrink-0 p-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Upload Area */}
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed p-4 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 hover:border-gray-300'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
        />

        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          Drag & drop files here, or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-medium text-primary hover:underline"
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, images, videos, and documents
        </p>
      </div>

      {/* Add Link */}
      <div className="mt-3">
        {showLinkInput ? (
          <div className="space-y-2 rounded-lg border bg-gray-50 p-3">
            <div>
              <Label htmlFor="link-url" className="text-xs">
                URL
              </Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="link-name" className="text-xs">
                Display Name (optional)
              </Label>
              <Input
                id="link-name"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Resource name"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddLink}
                disabled={!linkUrl.trim()}
              >
                Add Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl('');
                  setLinkName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLinkInput(true)}
            className="w-full"
          >
            <Link2 className="mr-2 h-4 w-4" />
            Add Link
          </Button>
        )}
      </div>
    </div>
  );
}
