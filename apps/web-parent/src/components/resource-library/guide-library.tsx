'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aivo/ui-web';
import { useState } from 'react';
import { 
  Search, 
  BookOpen,
  Clock,
  Bookmark,
  BookmarkCheck,
  Download,
  Star,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import { useGuides, useGuide, useToggleResourceBookmark } from '@/hooks/use-resource-library';
import type { ResourceCategory, AgeGroup, DifficultyLevel } from '@/lib/api/resource-library-api';
import ReactMarkdown from 'react-markdown';

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

export function GuideLibrary() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | undefined>();
  const [ageGroupFilter, setAgeGroupFilter] = useState<AgeGroup | undefined>();
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | undefined>();
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

  const { data: guides, isLoading } = useGuides({
    search,
    category: categoryFilter,
    ageGroup: ageGroupFilter,
    difficulty: difficultyFilter,
  });

  const { data: selectedGuide } = useGuide(selectedGuideId || '');
  const toggleBookmark = useToggleResourceBookmark();

  const handleBookmark = (guideId: string) => {
    toggleBookmark.mutate({ resourceId: guideId, type: 'guide' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step-by-Step Guides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guides..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
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
        <div className="text-center py-8">Loading guides...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guides?.map((guide) => (
            <Card key={guide.id} className="flex flex-col">
              {guide.coverImageUrl && (
                <div className="aspect-video bg-muted overflow-hidden">
                  <img
                    src={guide.coverImageUrl}
                    alt={guide.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{guide.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBookmark(guide.id)}
                  >
                    {guide.isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {guide.description}
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{guide.estimatedReadTime} min read</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{guide.rating.toFixed(1)} ({guide.totalRatings} ratings)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Download className="h-4 w-4" />
                    <span>{guide.downloadCount.toLocaleString()} downloads</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{guide.sections.length} sections</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={difficultyColors[guide.difficulty]}>
                    {guide.difficulty}
                  </Badge>
                  {guide.ageGroups.map((age) => (
                    <Badge key={age} variant="secondary">
                      {age}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-auto">
                  <Button
                    onClick={() => setSelectedGuideId(guide.id)}
                    className="flex-1"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Read Guide
                  </Button>
                  {guide.downloadUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(guide.downloadUrl, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedGuideId} onOpenChange={() => setSelectedGuideId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedGuide && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedGuide.title}</DialogTitle>
                <DialogDescription>
                  By {selectedGuide.author} • {new Date(selectedGuide.publishedDate).toLocaleDateString()}
                  {selectedGuide.updatedDate && ` • Updated ${new Date(selectedGuide.updatedDate).toLocaleDateString()}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{selectedGuide.rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">
                        ({selectedGuide.totalRatings} ratings)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{selectedGuide.estimatedReadTime} min read</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleBookmark(selectedGuide.id)}
                    >
                      {selectedGuide.isBookmarked ? (
                        <>
                          <BookmarkCheck className="h-4 w-4 mr-2" />
                          Bookmarked
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-4 w-4 mr-2" />
                          Bookmark
                        </>
                      )}
                    </Button>
                    {selectedGuide.downloadUrl && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedGuide.downloadUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={difficultyColors[selectedGuide.difficulty]}>
                    {selectedGuide.difficulty}
                  </Badge>
                  <Badge>{selectedGuide.category}</Badge>
                  {selectedGuide.ageGroups.map((age) => (
                    <Badge key={age} variant="outline">
                      {age}
                    </Badge>
                  ))}
                </div>

                <div className="prose prose-sm max-w-none">
                  <p className="text-base">{selectedGuide.description}</p>
                </div>

                {selectedGuide.sections.map((section) => (
                  <div key={section.id} className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                        {section.order}
                      </span>
                      {section.title}
                    </h3>
                    <div className="prose prose-sm max-w-none pl-8">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                    
                    {section.tips && section.tips.length > 0 && (
                      <div className="pl-8 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          <span>Tips</span>
                        </div>
                        <ul className="space-y-1 ml-6">
                          {section.tips.map((tip, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.resources && section.resources.length > 0 && (
                      <div className="pl-8 space-y-2">
                        <div className="text-sm font-medium">Additional Resources</div>
                        <div className="space-y-2">
                          {section.resources.map((resource, idx) => (
                            <a
                              key={idx}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {resource.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {selectedGuide.relatedGuides.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Related Guides</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedGuide.relatedGuides.map((relatedId) => (
                        <div
                          key={relatedId}
                          className="flex gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer"
                          onClick={() => setSelectedGuideId(relatedId)}
                        >
                          <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">Related Guide</p>
                            <p className="text-xs text-muted-foreground">Click to read</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
