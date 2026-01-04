/**
 * Share Content Modal Component
 *
 * Modal interface for sharing content with visibility settings,
 * tags, description, and license options.
 */

'use client';

import { X, Globe, School, Building2, Lock, Plus, Tag as TagIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

type VisibilityLevel = 'PRIVATE' | 'SCHOOL' | 'DISTRICT' | 'PUBLIC';

interface ShareContentData {
  visibility: VisibilityLevel;
  description?: string;
  tags: string[];
  license?: string;
  requiresAttribution: boolean;
}

interface ShareContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  onShare?: (data: ShareContentData) => Promise<void>;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function ShareContentModal({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  onShare,
}: ShareContentModalProps) {
  const [visibility, setVisibility] = React.useState<VisibilityLevel>('PRIVATE');
  const [description, setDescription] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [license, setLicense] = React.useState('');
  const [requiresAttribution, setRequiresAttribution] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setVisibility('PRIVATE');
      setDescription('');
      setTags([]);
      setTagInput('');
      setLicense('');
      setRequiresAttribution(false);
      setError(null);
    }
  }, [isOpen]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const shareData: ShareContentData = {
        visibility,
        description: description.trim() || undefined,
        tags,
        license: license.trim() || undefined,
        requiresAttribution,
      };

      if (onShare) {
        await onShare(shareData);
      } else {
        // Default API call
        const response = await fetch(`/api/content-authoring/content/${contentId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shareData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to share content');
        }
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share content');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Share Content</h2>
              <p className="text-sm text-gray-600 mt-1">{contentTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Visibility Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Who can access this content?
              </label>
              <div className="space-y-2">
                <VisibilityOption
                  value="PRIVATE"
                  icon={Lock}
                  title="Private"
                  description="Only you can see this content"
                  selected={visibility === 'PRIVATE'}
                  onClick={() => setVisibility('PRIVATE')}
                />
                <VisibilityOption
                  value="SCHOOL"
                  icon={School}
                  title="School"
                  description="Teachers in your school can access"
                  selected={visibility === 'SCHOOL'}
                  onClick={() => setVisibility('SCHOOL')}
                />
                <VisibilityOption
                  value="DISTRICT"
                  icon={Building2}
                  title="District"
                  description="Teachers in your district can access"
                  selected={visibility === 'DISTRICT'}
                  onClick={() => setVisibility('DISTRICT')}
                />
                <VisibilityOption
                  value="PUBLIC"
                  icon={Globe}
                  title="Public"
                  description="Anyone can discover and use this content"
                  selected={visibility === 'PUBLIC'}
                  onClick={() => setVisibility('PUBLIC')}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Help others understand what this content is about and how to use it..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {description.length}/1000 characters
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (optional)
              </label>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 relative">
                  <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add tags to help others find your content..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:bg-primary-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* License */}
            <div>
              <label htmlFor="license" className="block text-sm font-medium text-gray-700 mb-1">
                License (optional)
              </label>
              <select
                id="license"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a license</option>
                <option value="CC0">CC0 - Public Domain</option>
                <option value="CC-BY">CC BY - Attribution</option>
                <option value="CC-BY-SA">CC BY-SA - Attribution ShareAlike</option>
                <option value="CC-BY-NC">CC BY-NC - Attribution NonCommercial</option>
                <option value="CC-BY-NC-SA">CC BY-NC-SA - Attribution NonCommercial ShareAlike</option>
                <option value="All Rights Reserved">All Rights Reserved</option>
              </select>
            </div>

            {/* Attribution */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="attribution"
                checked={requiresAttribution}
                onChange={(e) => setRequiresAttribution(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <label htmlFor="attribution" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Require attribution
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Teachers must credit you when using this content
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Sharing...
                  </>
                ) : (
                  'Share Content'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISIBILITY OPTION
// ══════════════════════════════════════════════════════════════════════════════

interface VisibilityOptionProps {
  value: VisibilityLevel;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function VisibilityOption({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
}: VisibilityOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-4 border-2 rounded-lg transition-all text-left',
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <div className={cn('p-2 rounded-lg', selected ? 'bg-primary-100' : 'bg-gray-100')}>
        <Icon className={cn('h-5 w-5', selected ? 'text-primary-600' : 'text-gray-600')} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className={cn('font-medium', selected ? 'text-primary-900' : 'text-gray-900')}>
            {title}
          </h4>
          {selected && (
            <div className="h-2 w-2 rounded-full bg-primary-600" />
          )}
        </div>
        <p className="text-sm text-gray-600 mt-0.5">{description}</p>
      </div>
    </button>
  );
}
