/**
 * Content Browser Component
 *
 * Browse and search shared content from the teacher marketplace.
 * Includes filtering, sorting, and preview capabilities.
 */

'use client';

import {
  Search,
  Filter,
  Download,
  Star,
  Eye,
  GitFork,
  ChevronDown,
  Heart,
  Share2,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface SharedContent {
  id: string;
  learningObject: {
    id: string;
    title: string;
    subject: string;
    gradeBand: string;
    tags: string[];
  };
  sharedBy: string;
  visibility: 'PRIVATE' | 'SCHOOL' | 'DISTRICT' | 'PUBLIC';
  description?: string;
  license?: string;
  requiresAttribution: boolean;
  downloadCount: number;
  viewCount: number;
  forkCount: number;
  averageRating?: number;
  reviewCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface FilterState {
  subject?: string;
  gradeBand?: string;
  minRating?: number;
  searchQuery?: string;
  tags: string[];
  sortBy: 'POPULARITY' | 'RECENT' | 'RATING' | 'DOWNLOADS';
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

interface ContentBrowserProps {
  onSelectContent?: (content: SharedContent) => void;
  onForkContent?: (content: SharedContent) => void;
  onDownloadContent?: (content: SharedContent) => void;
  className?: string;
}

export function ContentBrowser({
  onSelectContent,
  onForkContent,
  onDownloadContent,
  className,
}: ContentBrowserProps) {
  const [content, setContent] = React.useState<SharedContent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState<FilterState>({
    tags: [],
    sortBy: 'POPULARITY',
  });

  // Fetch content based on filters
  const fetchContent = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.gradeBand) params.append('gradeBand', filters.gradeBand);
      if (filters.minRating) params.append('minRating', filters.minRating.toString());
      if (filters.searchQuery) params.append('searchQuery', filters.searchQuery);
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      params.append('sortBy', filters.sortBy);

      const response = await fetch(`/api/content-authoring/content/shared?${params}`);
      if (!response.ok) throw new Error('Failed to fetch content');

      const data = await response.json();
      setContent(data.items || []);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filter Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search content..."
            value={filters.searchQuery || ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
            }
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors',
            showFilters
              ? 'bg-primary-50 border-primary-500 text-primary-700'
              : 'border-gray-300 hover:bg-gray-50'
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                value={filters.subject || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, subject: e.target.value || undefined }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Subjects</option>
                <option value="ELA">ELA</option>
                <option value="MATH">Math</option>
                <option value="SCIENCE">Science</option>
                <option value="SEL">SEL</option>
                <option value="SPEECH">Speech</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Grade Band Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Band
              </label>
              <select
                value={filters.gradeBand || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, gradeBand: e.target.value || undefined }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Grades</option>
                <option value="K_2">K-2</option>
                <option value="G3_5">3-5</option>
                <option value="G6_8">6-8</option>
                <option value="G9_12">9-12</option>
              </select>
            </div>

            {/* Min Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Rating
              </label>
              <select
                value={filters.minRating || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minRating: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
              </select>
            </div>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <div className="flex gap-2">
              {[
                { value: 'POPULARITY', label: 'Popular' },
                { value: 'RECENT', label: 'Recent' },
                { value: 'RATING', label: 'Rating' },
                { value: 'DOWNLOADS', label: 'Downloads' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      sortBy: option.value as FilterState['sortBy'],
                    }))
                  }
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-md transition-colors',
                    filters.sortBy === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          <p className="mt-2 text-sm text-gray-600">Loading content...</p>
        </div>
      ) : content.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No content found</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.map((item) => (
            <ContentCard
              key={item.id}
              content={item}
              onSelect={() => onSelectContent?.(item)}
              onFork={() => onForkContent?.(item)}
              onDownload={() => onDownloadContent?.(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT CARD
// ══════════════════════════════════════════════════════════════════════════════

interface ContentCardProps {
  content: SharedContent;
  onSelect?: () => void;
  onFork?: () => void;
  onDownload?: () => void;
}

function ContentCard({ content, onSelect, onFork, onDownload }: ContentCardProps) {
  const [isSaved, setIsSaved] = React.useState(false);

  const subjectColors: Record<string, string> = {
    ELA: 'bg-blue-100 text-blue-700',
    MATH: 'bg-purple-100 text-purple-700',
    SCIENCE: 'bg-green-100 text-green-700',
    SEL: 'bg-pink-100 text-pink-700',
    SPEECH: 'bg-orange-100 text-orange-700',
    OTHER: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
            {content.learningObject.title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                subjectColors[content.learningObject.subject] || subjectColors.OTHER
              )}
            >
              {content.learningObject.subject}
            </span>
            <span className="text-xs text-gray-500">
              {content.learningObject.gradeBand.replace('_', '-')}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsSaved(!isSaved)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={isSaved ? 'Unsave' : 'Save'}
        >
          <Heart
            className={cn('h-5 w-5', isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400')}
          />
        </button>
      </div>

      {/* Description */}
      {content.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{content.description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        {content.averageRating && (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{content.averageRating.toFixed(1)}</span>
            <span>({content.reviewCount})</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Download className="h-3.5 w-3.5" />
          <span>{content.downloadCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <GitFork className="h-3.5 w-3.5" />
          <span>{content.forkCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          <span>{content.viewCount}</span>
        </div>
      </div>

      {/* Tags */}
      {content.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {content.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
            >
              #{tag}
            </span>
          ))}
          {content.tags.length > 3 && (
            <span className="text-xs px-2 py-0.5 text-gray-500">
              +{content.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onSelect}
          className="flex-1 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          View Details
        </button>
        <button
          onClick={onFork}
          className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
          title="Fork & customize"
        >
          <GitFork className="h-4 w-4" />
        </button>
        <button
          onClick={onDownload}
          className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Attribution Notice */}
      {content.requiresAttribution && (
        <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          Attribution required when using this content
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPACT BROWSER (for modals/sidebars)
// ══════════════════════════════════════════════════════════════════════════════

interface CompactContentBrowserProps {
  onSelectContent: (content: SharedContent) => void;
  subject?: string;
  gradeBand?: string;
  maxItems?: number;
}

export function CompactContentBrowser({
  onSelectContent,
  subject,
  gradeBand,
  maxItems = 10,
}: CompactContentBrowserProps) {
  const [content, setContent] = React.useState<SharedContent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchContent = async () => {
      try {
        const params = new URLSearchParams();
        if (subject) params.append('subject', subject);
        if (gradeBand) params.append('gradeBand', gradeBand);
        params.append('pageSize', maxItems.toString());
        params.append('sortBy', 'POPULARITY');

        const response = await fetch(`/api/content-authoring/content/shared?${params}`);
        if (!response.ok) throw new Error('Failed to fetch content');

        const data = await response.json();
        setContent(data.items || []);
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [subject, gradeBand, maxItems]);

  if (loading) {
    return <div className="text-center py-4 text-sm text-gray-600">Loading...</div>;
  }

  if (content.length === 0) {
    return <div className="text-center py-4 text-sm text-gray-600">No content available</div>;
  }

  return (
    <div className="space-y-2">
      {content.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelectContent(item)}
          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {item.learningObject.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                {item.averageRating && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{item.averageRating.toFixed(1)}</span>
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  {item.downloadCount} downloads
                </span>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded flex-shrink-0">
              {item.learningObject.subject}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
