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
  Play, 
  Clock,
  Bookmark,
  BookmarkCheck,
  Eye,
  Star,
  ChevronRight,
} from 'lucide-react';
import { useVideos, useVideo, useToggleResourceBookmark } from '@/hooks/use-resource-library';
import type { ResourceCategory, AgeGroup } from '@/lib/api/resource-library-api';

export function VideoLibrary() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | undefined>();
  const [ageGroupFilter, setAgeGroupFilter] = useState<AgeGroup | undefined>();
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const { data: videos, isLoading } = useVideos({
    search,
    category: categoryFilter,
    ageGroup: ageGroupFilter,
  });

  const { data: selectedVideo } = useVideo(selectedVideoId || '');
  const toggleBookmark = useToggleResourceBookmark();

  const handleBookmark = (videoId: string) => {
    toggleBookmark.mutate({ resourceId: videoId, type: 'video' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Video Tutorials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading videos...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos?.map((video) => (
            <Card key={video.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
              <div className="relative aspect-video bg-muted">
                {video.thumbnailUrl && (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs">
                  {formatDuration(video.duration)}
                </div>
                {video.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${video.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">{video.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookmark(video.id);
                    }}
                  >
                    {video.isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent onClick={() => setSelectedVideoId(video.id)}>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {video.description}
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{video.rating.toFixed(1)} ({video.totalRatings})</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{video.viewCount.toLocaleString()} views</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>By {video.instructor}</span>
                </div>
                <Button className="w-full mt-4">
                  <Play className="h-4 w-4 mr-2" />
                  Watch Video
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedVideoId} onOpenChange={() => setSelectedVideoId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedVideo && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedVideo.title}</DialogTitle>
                <DialogDescription>{selectedVideo.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    src={selectedVideo.videoUrl}
                    controls
                    className="w-full h-full"
                    poster={selectedVideo.thumbnailUrl}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{selectedVideo.rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">
                        ({selectedVideo.totalRatings} ratings)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span>{selectedVideo.viewCount.toLocaleString()} views</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleBookmark(selectedVideo.id)}
                  >
                    {selectedVideo.isBookmarked ? (
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
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    By {selectedVideo.instructor} • {new Date(selectedVideo.publishedDate).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{selectedVideo.category}</Badge>
                    {selectedVideo.ageGroups.map((age) => (
                      <Badge key={age} variant="outline">
                        {age}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedVideo.chapters.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Chapters</h3>
                    <div className="space-y-2">
                      {selectedVideo.chapters.map((chapter) => (
                        <div
                          key={chapter.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Play className="h-4 w-4" />
                            <div>
                              <p className="font-medium text-sm">{chapter.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDuration(chapter.startTime)}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedVideo.transcript && (
                  <div>
                    <h3 className="font-semibold mb-3">Transcript</h3>
                    <div className="p-4 rounded-lg border bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap">{selectedVideo.transcript}</p>
                    </div>
                  </div>
                )}

                {selectedVideo.relatedVideos.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Related Videos</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedVideo.relatedVideos.slice(0, 4).map((relatedId) => (
                        <div
                          key={relatedId}
                          className="flex gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer"
                          onClick={() => setSelectedVideoId(relatedId)}
                        >
                          <div className="w-20 h-12 bg-muted rounded flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-2">Related Video</p>
                            <p className="text-xs text-muted-foreground">Click to watch</p>
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
