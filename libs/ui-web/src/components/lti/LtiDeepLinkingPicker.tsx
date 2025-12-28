// ══════════════════════════════════════════════════════════════════════════════
// LTI DEEP LINKING PICKER
// Select content for deep linking responses
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { Search, Check, FileText, Video, FileQuestion, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ContentItemType = 'lesson' | 'assessment' | 'video' | 'document' | 'link';

export interface DeepLinkContentItem {
  id: string;
  type: ContentItemType;
  title: string;
  description?: string;
  thumbnail?: string;
  url: string;
  custom?: Record<string, string>;
  metadata?: {
    duration?: number;
    questionCount?: number;
    grade?: string;
    subject?: string;
  };
}

interface LtiDeepLinkingPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: DeepLinkContentItem[];
  isLoading?: boolean;
  maxSelections?: number;
  onSearch?: (query: string) => void;
  onSubmit: (items: DeepLinkContentItem[]) => void;
  onCancel: () => void;
}

const typeIcons: Record<ContentItemType, React.ReactNode> = {
  lesson: <FileText className="h-4 w-4" />,
  assessment: <FileQuestion className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  link: <Link2 className="h-4 w-4" />,
};

const typeLabels: Record<ContentItemType, string> = {
  lesson: 'Lesson',
  assessment: 'Assessment',
  video: 'Video',
  document: 'Document',
  link: 'External Link',
};

export function LtiDeepLinkingPicker({
  open,
  onOpenChange,
  items,
  isLoading = false,
  maxSelections = 1,
  onSearch,
  onSubmit,
  onCancel,
}: LtiDeepLinkingPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      onSearch?.(query);
    },
    [onSearch]
  );

  const toggleSelection = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (maxSelections === 1) {
            next.clear();
          } else if (next.size >= maxSelections) {
            return prev;
          }
          next.add(id);
        }
        return next;
      });
    },
    [maxSelections]
  );

  const handleSubmit = useCallback(() => {
    const selected = items.filter((item) => selectedIds.has(item.id));
    onSubmit(selected);
    setSelectedIds(new Set());
    setSearchQuery('');
  }, [items, selectedIds, onSubmit]);

  const handleCancel = useCallback(() => {
    setSelectedIds(new Set());
    setSearchQuery('');
    onCancel();
  }, [onCancel]);

  const selectedItems = items.filter((item) => selectedIds.has(item.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Content</DialogTitle>
          <DialogDescription>
            {maxSelections === 1
              ? 'Choose content to add to the course'
              : `Select up to ${maxSelections} items to add to the course`}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>

        {/* Content list */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {searchQuery ? 'No content matches your search' : 'No content available'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary',
                    selectedIds.has(item.id) && 'border-primary bg-primary/5'
                  )}
                  onClick={() => toggleSelection(item.id)}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    {/* Thumbnail or icon */}
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="h-16 w-24 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-24 items-center justify-center rounded bg-muted">
                        {typeIcons[item.type]}
                      </div>
                    )}

                    {/* Content info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium leading-none">{item.title}</h4>
                          {item.description && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {selectedIds.has(item.id) && (
                          <div className="rounded-full bg-primary p-1">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Metadata badges */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {typeIcons[item.type]}
                          <span className="ml-1">{typeLabels[item.type]}</span>
                        </Badge>
                        {item.metadata?.grade && (
                          <Badge variant="outline">Grade {item.metadata.grade}</Badge>
                        )}
                        {item.metadata?.subject && (
                          <Badge variant="outline">{item.metadata.subject}</Badge>
                        )}
                        {item.metadata?.duration && (
                          <Badge variant="outline">
                            {Math.round(item.metadata.duration / 60)} min
                          </Badge>
                        )}
                        {item.metadata?.questionCount && (
                          <Badge variant="outline">
                            {item.metadata.questionCount} questions
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Selected summary */}
        {selectedItems.length > 0 && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm font-medium">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected:
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedItems.map((item) => item.title).join(', ')}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0}
          >
            Add to Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// USE LTI DEEP LINKING HOOK
// Handle LTI Deep Linking flow
// ══════════════════════════════════════════════════════════════════════════════

interface UseLtiDeepLinkingOptions {
  baseUrl?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseLtiDeepLinkingReturn {
  isSubmitting: boolean;
  submitDeepLinkResponse: (
    launchId: string,
    items: DeepLinkContentItem[]
  ) => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_IMPORT_EXPORT_API || '/api/import-export';

export function useLtiDeepLinking(
  options: UseLtiDeepLinkingOptions = {}
): UseLtiDeepLinkingReturn {
  const { baseUrl = API_BASE, onSuccess, onError } = options;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitDeepLinkResponse = useCallback(
    async (launchId: string, items: DeepLinkContentItem[]) => {
      setIsSubmitting(true);

      try {
        // Build content items in LTI format
        const contentItems = items.map((item) => ({
          type: 'ltiResourceLink',
          title: item.title,
          text: item.description,
          url: item.url,
          thumbnail: item.thumbnail
            ? { url: item.thumbnail, width: 160, height: 90 }
            : undefined,
          custom: item.custom,
          lineItem: item.type === 'assessment'
            ? {
                label: item.title,
                scoreMaximum: 100,
                resourceId: item.id,
              }
            : undefined,
        }));

        const response = await fetch(`${baseUrl}/lti/deep-linking/response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            launchId,
            contentItems,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to submit deep linking response');
        }

        const data = await response.json();

        // Submit the JWT response back to the platform
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.returnUrl;

        const jwtInput = document.createElement('input');
        jwtInput.type = 'hidden';
        jwtInput.name = 'JWT';
        jwtInput.value = data.jwt;
        form.appendChild(jwtInput);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        onSuccess?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Submission failed');
        onError?.(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [baseUrl, onSuccess, onError]
  );

  return {
    isSubmitting,
    submitDeepLinkResponse,
  };
}
