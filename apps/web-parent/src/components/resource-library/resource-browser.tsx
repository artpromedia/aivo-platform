'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Play, 
  BookOpen, 
  Video, 
  FileText, 
  Download,
  Bookmark,
  BookmarkCheck,
  Heart,
  Star,
  Clock,
  Eye,
} from 'lucide-react';
import { useResources, useToggleResourceBookmark, useToggleResourceFavorite } from '@/hooks/use-resource-library';
import type { ResourceType, ResourceCategory, AgeGroup, DifficultyLevel } from '@/lib/api/resource-library-api';

const resourceTypeIcons = {
  video: Video,
  article: FileText,
  guide: BookOpen,
  webinar: Play,
  pdf: FileText,
  interactive: Play,
};

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

export function ResourceBrowser() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceType | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | undefined>();
  const [ageGroupFilter, setAgeGroupFilter] = useState<AgeGroup | undefined>();
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | undefined>();

  const { data: resources, isLoading } = useResources({
    search,
    type: typeFilter,
    category: categoryFilter,
    ageGroup: ageGroupFilter,
    difficulty: difficultyFilter,
  });

  const toggleBookmark = useToggleResourceBookmark();
  const toggleFavorite = useToggleResourceFavorite();

  const handleBookmark = (resourceId: string) => {
    toggleBookmark.mutate({ resourceId, type: 'resource' });
  };

  const handleFavorite = (resourceId: string) => {
    toggleFavorite.mutate(resourceId);
  };

  const handleOpenResource = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as ResourceType || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Resource Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="article">Articles</SelectItem>
                  <SelectItem value="guide">Guides</SelectItem>
                  <SelectItem value="webinar">Webinars</SelectItem>
                  <SelectItem value="pdf">PDFs</SelectItem>
                  <SelectItem value="interactive">Interactive</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value as ResourceCategory || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="learning-support">Learning Support</SelectItem>
                  <SelectItem value="homework-help">Homework Help</SelectItem>
                  <SelectItem value="behavior-management">Behavior Management</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="special-education">Special Education</SelectItem>
                  <SelectItem value="wellbeing">Wellbeing</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={ageGroupFilter}
                onValueChange={(value) => setAgeGroupFilter(value as AgeGroup || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Age Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ages</SelectItem>
                  <SelectItem value="preschool">Preschool</SelectItem>
                  <SelectItem value="elementary">Elementary</SelectItem>
                  <SelectItem value="middle">Middle School</SelectItem>
                  <SelectItem value="high">High School</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={difficultyFilter}
                onValueChange={(value) => setDifficultyFilter(value as DifficultyLevel || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading resources...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources?.map((resource) => {
            const Icon = resourceTypeIcons[resource.type];
            return (
              <Card key={resource.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <Badge variant="outline">{resource.type}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBookmark(resource.id)}
                      >
                        {resource.isBookmarked ? (
                          <BookmarkCheck className="h-4 w-4" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFavorite(resource.id)}
                      >
                        <Heart
                          className={`h-4 w-4 ${resource.isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                        />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{resource.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {resource.description}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{resource.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{resource.rating.toFixed(1)} ({resource.totalRatings} ratings)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span>{resource.viewCount.toLocaleString()} views</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Download className="h-4 w-4" />
                      <span>{resource.downloadCount.toLocaleString()} downloads</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={difficultyColors[resource.difficulty]}>
                      {resource.difficulty}
                    </Badge>
                    {resource.ageGroups.map((age) => (
                      <Badge key={age} variant="secondary">
                        {age}
                      </Badge>
                    ))}
                  </div>
                  {resource.progress && resource.progress > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{resource.progress}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2"
                          style={{ width: `${resource.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-auto">
                    <Button
                      onClick={() => handleOpenResource(resource.contentUrl)}
                      className="flex-1"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      View Resource
                    </Button>
                    {resource.downloadUrl && (
                      <Button
                        variant="outline"
                        onClick={() => handleOpenResource(resource.downloadUrl!)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
