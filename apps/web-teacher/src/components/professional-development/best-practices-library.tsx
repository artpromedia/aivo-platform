'use client';

import { useState } from 'react';
import { useBestPractices, useToggleLike, useToggleBookmark } from '@/hooks/use-pd-resources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ThumbsUp, Eye, Bookmark, BookmarkCheck, Award } from 'lucide-react';
import type { ResourceCategory, BestPractice } from '@/lib/api/professional-development-api';

export function BestPracticesLibrary() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | undefined>();
  const [evidenceLevelFilter, setEvidenceLevelFilter] = useState<string | undefined>();
  const [selectedPractice, setSelectedPractice] = useState<BestPractice | null>(null);

  const { data: practices, isLoading } = useBestPractices({
    search,
    category: categoryFilter,
    evidenceLevel: evidenceLevelFilter,
  });

  const toggleLikeMutation = useToggleLike();
  const toggleBookmarkMutation = useToggleBookmark();

  const getEvidenceBadge = (level: string) => {
    const colors = {
      'research-based': 'bg-blue-100 text-blue-800',
      'evidence-informed': 'bg-purple-100 text-purple-800',
      'promising-practice': 'bg-green-100 text-green-800',
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              placeholder="Search best practices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as ResourceCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="accessibility">Accessibility</SelectItem>
                <SelectItem value="classroom-management">Classroom Management</SelectItem>
                <SelectItem value="differentiation">Differentiation</SelectItem>
                <SelectItem value="assessment">Assessment</SelectItem>
                <SelectItem value="sel">Social-Emotional Learning</SelectItem>
              </SelectContent>
            </Select>
            <Select value={evidenceLevelFilter} onValueChange={setEvidenceLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Evidence Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Levels</SelectItem>
                <SelectItem value="research-based">Research-Based</SelectItem>
                <SelectItem value="evidence-informed">Evidence-Informed</SelectItem>
                <SelectItem value="promising-practice">Promising Practice</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Practices Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {practices?.map((practice) => (
            <Card key={practice.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{practice.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmarkMutation.mutate({ resourceId: practice.id, type: 'practice' });
                    }}
                  >
                    {practice.isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {practice.summary}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={getEvidenceBadge(practice.evidenceLevel)}>
                    <Award className="h-3 w-3 mr-1" />
                    {practice.evidenceLevel.replace('-', ' ')}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {practice.category.replace('-', ' ')}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {practice.viewCount}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeMutation.mutate(practice.id);
                      }}
                    >
                      <ThumbsUp className={`h-4 w-4 ${practice.isLiked ? 'fill-primary text-primary' : ''}`} />
                      <span className="ml-1">{practice.likeCount}</span>
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedPractice(practice)}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedPractice} onOpenChange={() => setSelectedPractice(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPractice?.title}</DialogTitle>
          </DialogHeader>
          {selectedPractice && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-muted-foreground">{selectedPractice.summary}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Evidence Level</h3>
                <Badge className={getEvidenceBadge(selectedPractice.evidenceLevel)}>
                  {selectedPractice.evidenceLevel.replace('-', ' ')}
                </Badge>
              </div>

              {selectedPractice.examples.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Examples</h3>
                  <div className="space-y-4">
                    {selectedPractice.examples.map((example, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <h4 className="font-medium mb-2">Scenario</h4>
                          <p className="text-sm mb-3">{example.scenario}</p>
                          <h4 className="font-medium mb-2">Implementation</h4>
                          <p className="text-sm mb-3">{example.implementation}</p>
                          <h4 className="font-medium mb-2">Outcome</h4>
                          <p className="text-sm">{example.outcome}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {selectedPractice.sources.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Research Sources</h3>
                  <ul className="space-y-2">
                    {selectedPractice.sources.map((source, index) => (
                      <li key={index}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {source.title} ({source.year})
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
