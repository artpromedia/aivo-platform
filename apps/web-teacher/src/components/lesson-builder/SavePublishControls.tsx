'use client';

/**
 * Save Publish Controls Component
 *
 * Controls for saving, publishing, and previewing lessons
 * Features:
 * - Save draft functionality
 * - Publish with confirmation
 * - Preview button
 * - Auto-save indicator
 */

import {
  Save,
  Send,
  Eye,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface SavePublishControlsProps {
  onSaveDraft: () => Promise<void>;
  onPublish: () => Promise<void>;
  onPreview: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
  lastSaved?: Date | null;
  hasUnsavedChanges?: boolean;
  canPublish?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function SavePublishControls({
  onSaveDraft,
  onPublish,
  onPreview,
  isSaving = false,
  isPublishing = false,
  lastSaved,
  hasUnsavedChanges = false,
  canPublish = true,
}: SavePublishControlsProps) {
  const [showPublishConfirm, setShowPublishConfirm] = React.useState(false);
  const [publishError, setPublishError] = React.useState<string | null>(null);

  const handleSaveDraft = async () => {
    try {
      await onSaveDraft();
    } catch {
      // Save failed silently
    }
  };

  const handlePublish = async () => {
    try {
      setPublishError(null);
      await onPublish();
      setShowPublishConfirm(false);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'Failed to publish');
    }
  };

  const formatLastSaved = (date: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Actions</h3>

      {/* Save Status */}
      {lastSaved && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
            hasUnsavedChanges ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
          )}
        >
          {hasUnsavedChanges ? (
            <>
              <AlertCircle className="h-4 w-4" />
              Unsaved changes
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Saved {formatLastSaved(lastSaved)}
            </>
          )}
        </div>
      )}

      {/* Preview Button */}
      <Button
        variant="outline"
        onClick={onPreview}
        className="w-full justify-start"
      >
        <Eye className="mr-2 h-4 w-4" />
        Preview Lesson
      </Button>

      {/* Save Draft Button */}
      <Button
        variant="outline"
        onClick={handleSaveDraft}
        disabled={isSaving}
        className="w-full justify-start"
      >
        {isSaving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Draft
      </Button>

      {/* Publish Button */}
      {showPublishConfirm ? (
        <div className="rounded-lg border bg-gray-50 p-3">
          <p className="mb-3 text-sm text-gray-700">
            Are you sure you want to publish this lesson? It will become available to students.
          </p>
          {publishError && (
            <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">
              {publishError}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex-1"
            >
              {isPublishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Confirm
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPublishConfirm(false);
                setPublishError(null);
              }}
              disabled={isPublishing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => { setShowPublishConfirm(true); }}
          disabled={!canPublish || isPublishing}
          className="w-full justify-start bg-primary hover:bg-primary/90"
        >
          <Send className="mr-2 h-4 w-4" />
          Publish Lesson
        </Button>
      )}

      {!canPublish && (
        <p className="text-xs text-muted-foreground">
          Add at least one activity and learning objective to publish.
        </p>
      )}
    </div>
  );
}
