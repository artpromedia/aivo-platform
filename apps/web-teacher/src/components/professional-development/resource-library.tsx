'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Library,
  FileText,
  Video,
  Download,
  ExternalLink,
  Search,
  BookOpen,
  Lightbulb,
  FileSpreadsheet,
  Presentation,
  File,
  Star,
  Clock,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ResourceType = 'article' | 'video' | 'template' | 'guide' | 'worksheet' | 'presentation';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  category: string;
  downloadUrl?: string;
  externalUrl?: string;
  fileSize?: string;
  duration?: number;
  author: string;
  publishedDate: string;
  downloads: number;
  rating: number;
  isBookmarked: boolean;
  tags: string[];
}

interface ResourceLibraryProps {
  className?: string;
  compact?: boolean;
}

const mockResources: Resource[] = [
  {
    id: '1',
    title: 'Differentiated Instruction Planning Template',
    description: 'A comprehensive template for planning differentiated lessons with tiered activities.',
    type: 'template',
    category: 'Lesson Planning',
    downloadUrl: '#',
    fileSize: '245 KB',
    author: 'Dr. Sarah Johnson',
    publishedDate: '2025-01-10',
    downloads: 1523,
    rating: 4.8,
    isBookmarked: true,
    tags: ['differentiation', 'planning', 'template'],
  },
  {
    id: '2',
    title: 'Classroom Management Quick Start Guide',
    description: 'Essential strategies for establishing routines and managing student behavior.',
    type: 'guide',
    category: 'Classroom Management',
    downloadUrl: '#',
    fileSize: '1.2 MB',
    author: 'Michael Chen',
    publishedDate: '2025-01-08',
    downloads: 2341,
    rating: 4.9,
    isBookmarked: false,
    tags: ['management', 'routines', 'behavior'],
  },
  {
    id: '3',
    title: 'Formative Assessment Techniques',
    description: 'Video walkthrough of 15 formative assessment techniques for instant feedback.',
    type: 'video',
    category: 'Assessment',
    externalUrl: '#',
    duration: 25,
    author: 'Dr. Patricia Williams',
    publishedDate: '2025-01-05',
    downloads: 892,
    rating: 4.7,
    isBookmarked: false,
    tags: ['assessment', 'formative', 'feedback'],
  },
  {
    id: '4',
    title: 'IEP Goal Writing Worksheet',
    description: 'Step-by-step worksheet for writing SMART IEP goals.',
    type: 'worksheet',
    category: 'Special Education',
    downloadUrl: '#',
    fileSize: '156 KB',
    author: 'Emily Rodriguez',
    publishedDate: '2025-01-03',
    downloads: 756,
    rating: 4.6,
    isBookmarked: true,
    tags: ['IEP', 'goals', 'special education'],
  },
  {
    id: '5',
    title: 'Parent Communication Templates',
    description: 'Collection of email templates for various parent communication scenarios.',
    type: 'template',
    category: 'Communication',
    downloadUrl: '#',
    fileSize: '89 KB',
    author: 'James Thompson',
    publishedDate: '2025-01-01',
    downloads: 1678,
    rating: 4.8,
    isBookmarked: false,
    tags: ['communication', 'parents', 'templates'],
  },
  {
    id: '6',
    title: 'Technology Tools Overview Presentation',
    description: 'Slides covering the top 20 ed-tech tools for classroom integration.',
    type: 'presentation',
    category: 'Technology',
    downloadUrl: '#',
    fileSize: '3.5 MB',
    author: 'Tech Integration Team',
    publishedDate: '2024-12-28',
    downloads: 1234,
    rating: 4.5,
    isBookmarked: false,
    tags: ['technology', 'ed-tech', 'tools'],
  },
];

const resourceTypeIcons: Record<ResourceType, typeof FileText> = {
  article: FileText,
  video: Video,
  template: FileSpreadsheet,
  guide: BookOpen,
  worksheet: File,
  presentation: Presentation,
};

const resourceTypeColors: Record<ResourceType, string> = {
  article: 'bg-blue-100 text-blue-700',
  video: 'bg-purple-100 text-purple-700',
  template: 'bg-green-100 text-green-700',
  guide: 'bg-orange-100 text-orange-700',
  worksheet: 'bg-yellow-100 text-yellow-700',
  presentation: 'bg-pink-100 text-pink-700',
};

export function ResourceLibrary({ className, compact = false }: ResourceLibraryProps) {
  const [resources, setResources] = useState<Resource[]>(mockResources);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ResourceType | ''>('');

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      !searchQuery ||
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = !selectedType || resource.type === selectedType;
    return matchesSearch && matchesType;
  });

  const displayedResources = compact ? filteredResources.slice(0, 4) : filteredResources;

  const toggleBookmark = (resourceId: string) => {
    setResources((prev) =>
      prev.map((r) => (r.id === resourceId ? { ...r, isBookmarked: !r.isBookmarked } : r))
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Library className="h-5 w-5" />
          Resource Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        {!compact && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedType === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('')}
              >
                All
              </Button>
              {(['template', 'guide', 'video', 'worksheet'] as ResourceType[]).map((type) => {
                const Icon = resourceTypeIcons[type];
                return (
                  <Button
                    key={type}
                    variant={selectedType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {type.charAt(0).toUpperCase() + type.slice(1)}s
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Compact Search */}
        {compact && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Quick search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Resources List */}
        <div className="space-y-3">
          {displayedResources.map((resource) => {
            const TypeIcon = resourceTypeIcons[resource.type];
            return (
              <div
                key={resource.id}
                className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      resourceTypeColors[resource.type]
                    )}
                  >
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                        {resource.title}
                      </h4>
                      <button
                        onClick={() => toggleBookmark(resource.id)}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
                      >
                        {resource.isBookmarked ? (
                          <BookmarkCheck className="h-4 w-4 text-primary-600" />
                        ) : (
                          <Bookmark className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {!compact && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {resource.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <Badge className={cn('text-xs', resourceTypeColors[resource.type])}>
                        {resource.type}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {resource.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {resource.downloads.toLocaleString()}
                      </span>
                      {resource.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {resource.duration} min
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {resource.downloadUrl ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={resource.downloadUrl} download>
                          <Download className="h-3 w-3" />
                        </a>
                      </Button>
                    ) : resource.externalUrl ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={resource.externalUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {displayedResources.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Library className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No resources found</p>
            </div>
          )}
        </div>

        {/* View All Link */}
        {compact && filteredResources.length > 4 && (
          <div className="pt-2 border-t">
            <Button variant="link" className="w-full" size="sm">
              View All {filteredResources.length} Resources
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Quick Categories */}
        {compact && (
          <div className="pt-3 border-t">
            <p className="text-xs text-gray-500 mb-2">Quick Categories</p>
            <div className="flex flex-wrap gap-2">
              {['Lesson Planning', 'Assessment', 'IEP Support', 'Communication'].map((cat) => (
                <Badge key={cat} variant="outline" className="cursor-pointer hover:bg-gray-100">
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ResourceLibrary;
