'use client';

import { useState } from 'react';
import { useTrainingResources, useCompleteResource, useToggleBookmark } from '@/hooks/use-pd-resources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, BookOpen, Video, FileText, Calendar, Bookmark, BookmarkCheck, Clock, Star } from 'lucide-react';
import type { ResourceType, ResourceCategory, DifficultyLevel } from '@/lib/api/professional-development-api';

export function TrainingResourcesLibrary() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceType | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | undefined>();
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | undefined>();

  const { data: resources, isLoading } = useTrainingResources({
    search,
    type: typeFilter,
    category: categoryFilter,
    difficulty: difficultyFilter,
  });

  const completeResourceMutation = useCompleteResource();
  const toggleBookmarkMutation = useToggleBookmark();

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'article':
        return <FileText className="h-5 w-5" />;
      case 'course':
        return <BookOpen className="h-5 w-5" />;
      case 'webinar':
        return <Calendar className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Training Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Input
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ResourceType)}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="article">Articles</SelectItem>
                <SelectItem value="course">Courses</SelectItem>
                <SelectItem value="webinar">Webinars</SelectItem>
                <SelectItem value="workshop">Workshops</SelectItem>
                <SelectItem value="guide">Guides</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as ResourceCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="accessibility">Accessibility</SelectItem>
                <SelectItem value="classroom-management">Classroom Management</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="differentiation">Differentiation</SelectItem>
                <SelectItem value="assessment">Assessment</SelectItem>
                <SelectItem value="sel">Social-Emotional Learning</SelectItem>
                <SelectItem value="curriculum">Curriculum</SelectItem>
                <SelectItem value="parent-engagement">Parent Engagement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={(value) => setDifficultyFilter(value as DifficultyLevel)}>
              <SelectTrigger>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources?.map((resource) => (
            <Card key={resource.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getResourceIcon(resource.type)}
                    <Badge variant="outline" className="capitalize">
                      {resource.type}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleBookmarkMutation.mutate({ resourceId: resource.id, type: 'resource' })}
                  >
                    {resource.isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CardTitle className="text-lg mt-2">{resource.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {resource.description}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{resource.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{resource.rating.toFixed(1)} ({resource.totalRatings} ratings)</span>
                  </div>
                  <Badge className={getDifficultyColor(resource.difficulty)}>
                    {resource.difficulty}
                  </Badge>
                </div>

                {resource.progress !== undefined && resource.progress > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{resource.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${resource.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-auto flex gap-2">
                  {resource.isCompleted ? (
                    <Button variant="outline" className="flex-1" disabled>
                      <BookmarkCheck className="h-4 w-4 mr-2" />
                      Completed
                    </Button>
                  ) : (
                    <>
                      <Button className="flex-1" onClick={() => window.open(resource.contentUrl, '_blank')}>
                        <Play className="h-4 w-4 mr-2" />
                        Start
                      </Button>
                      {resource.progress && resource.progress > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => completeResourceMutation.mutate(resource.id)}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
