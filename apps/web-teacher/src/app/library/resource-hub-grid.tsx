'use client';

/**
 * Resource Hub Grid Component
 *
 * Displays teacher-uploaded resources in a card grid.
 * Uses React Query via useLibraryResources hook.
 */

import Link from 'next/link';
import {
  FileText,
  Play,
  ClipboardCheck,
  Layout,
  Image,
  Download,
  Star,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import {
  type LibraryResource,
  type ResourceCategory,
  type ResourceType,
  useLibraryResources,
  useDeleteResource,
} from '@/hooks/use-library';

const CATEGORY_TABS: { value: ResourceCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'lesson_plans', label: 'Lesson Plans' },
  { value: 'activities', label: 'Activities' },
  { value: 'assessments', label: 'Assessments' },
  { value: 'templates', label: 'Templates' },
  { value: 'media', label: 'Media' },
];

const TYPE_ICONS: Record<ResourceType, typeof FileText> = {
  lesson_plan: FileText,
  activity: Play,
  assessment: ClipboardCheck,
  template: Layout,
  media: Image,
  document: FileText,
  presentation: Layout,
  worksheet: ClipboardCheck,
};

const TYPE_LABELS: Record<ResourceType, string> = {
  lesson_plan: 'Lesson Plan',
  activity: 'Activity',
  assessment: 'Assessment',
  template: 'Template',
  media: 'Media',
  document: 'Document',
  presentation: 'Presentation',
  worksheet: 'Worksheet',
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface ResourceHubGridProps {
  search?: string;
  subject?: string;
  grade?: string;
}

export function ResourceHubGrid({ search, subject, grade }: ResourceHubGridProps) {
  const [activeCategory, setActiveCategory] = useState<ResourceCategory>('all');
  const { resources, total, isLoading, error } = useLibraryResources({
    category: activeCategory,
    search,
    subject,
    grade,
  });

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveCategory(tab.value)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === tab.value
                ? 'bg-primary text-white'
                : 'text-muted hover:bg-surface-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-lg border border-border bg-surface"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">
            {error instanceof Error ? error.message : 'Failed to load resources'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && resources.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
            <FileText className="h-8 w-8 text-muted" />
          </div>
          <h3 className="text-lg font-medium">No resources yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Upload lesson plans, activities, assessments, and more to build your
            personal resource library.
          </p>
          <Link
            href="/library/upload"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Upload Resource
          </Link>
        </div>
      )}

      {/* Resource count */}
      {!isLoading && resources.length > 0 && (
        <div className="text-sm text-muted">
          {total} resource{total === 1 ? '' : 's'} found
        </div>
      )}

      {/* Resource grid */}
      {!isLoading && resources.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ResourceCard({ resource }: Readonly<{ resource: LibraryResource }>) {
  const [showMenu, setShowMenu] = useState(false);
  const deleteMutation = useDeleteResource();
  const Icon = TYPE_ICONS[resource.type] || FileText;

  return (
    <div className="group relative flex flex-col rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
          <Icon className="h-5 w-5 text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{resource.title}</h3>
          <p className="text-xs text-muted">
            {TYPE_LABELS[resource.type]} &middot; {resource.author}
          </p>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1 text-muted opacity-0 transition-opacity hover:bg-surface-muted group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-border bg-surface py-1 shadow-lg">
                {resource.fileUrl && (
                  <a
                    href={resource.fileUrl}
                    download
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted"
                    onClick={() => setShowMenu(false)}
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                )}
                <button
                  onClick={() => {
                    deleteMutation.mutate(resource.id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-surface-muted"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 flex-1 text-sm text-muted line-clamp-2">
        {resource.description}
      </p>

      {/* Tags */}
      {resource.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {resource.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted"
            >
              {tag}
            </span>
          ))}
          {resource.tags.length > 3 && (
            <span className="text-xs text-muted">+{resource.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3" />
          {resource.rating.toFixed(1)}
        </span>
        <span className="flex items-center gap-1">
          <Download className="h-3 w-3" />
          {resource.downloads}
        </span>
        {resource.fileSize && (
          <span>{formatFileSize(resource.fileSize)}</span>
        )}
        <span className="ml-auto">{formatDate(resource.createdAt)}</span>
      </div>
    </div>
  );
}
