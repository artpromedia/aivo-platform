'use client';

import { useState } from 'react';
import { useTeachingStrategies, useToggleBookmark, useSaveStrategyNotes } from '@/hooks/use-pd-resources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bookmark, BookmarkCheck, Clock, Users, CheckCircle2, PlayCircle } from 'lucide-react';
import type { ResourceCategory, DifficultyLevel, TeachingStrategy } from '@/lib/api/professional-development-api';

export function TeachingStrategiesLibrary() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | undefined>();
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | undefined>();
  const [selectedStrategy, setSelectedStrategy] = useState<TeachingStrategy | null>(null);
  const [notes, setNotes] = useState('');

  const { data: strategies, isLoading } = useTeachingStrategies({
    search,
    category: categoryFilter,
    difficulty: difficultyFilter,
  });

  const toggleBookmarkMutation = useToggleBookmark();
  const saveNotesMutation = useSaveStrategyNotes();

  const handleSaveNotes = () => {
    if (selectedStrategy) {
      saveNotesMutation.mutate({ strategyId: selectedStrategy.id, notes });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Teaching Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              placeholder="Search strategies..."
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

      {/* Strategies Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {strategies?.map((strategy) => (
            <Card key={strategy.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleBookmarkMutation.mutate({ resourceId: strategy.id, type: 'strategy' })}
                  >
                    {strategy.isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {strategy.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{strategy.timeRequired}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>Grades: {strategy.applicableGrades.join(', ')}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="capitalize">
                    {strategy.difficulty}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {strategy.category.replace('-', ' ')}
                  </Badge>
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    setSelectedStrategy(strategy);
                    setNotes(strategy.userNotes || '');
                  }}
                >
                  View Strategy
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedStrategy} onOpenChange={() => setSelectedStrategy(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStrategy?.name}</DialogTitle>
          </DialogHeader>
          {selectedStrategy && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{selectedStrategy.description}</p>
              </div>

              {selectedStrategy.materials.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Materials Needed</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedStrategy.materials.map((material, index) => (
                      <li key={index} className="text-sm">{material}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3">Implementation Steps</h3>
                <div className="space-y-4">
                  {selectedStrategy.steps.map((step) => (
                    <Card key={step.order}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                            {step.order}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{step.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                            {step.tips.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm font-medium mb-1">Tips:</p>
                                <ul className="space-y-1">
                                  {step.tips.map((tip, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {selectedStrategy.adaptations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Adaptations</h3>
                  <div className="space-y-2">
                    {selectedStrategy.adaptations.map((adaptation, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <p className="text-sm font-medium mb-1">{adaptation.scenario}</p>
                          <p className="text-sm text-muted-foreground">{adaptation.modification}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {selectedStrategy.videoUrl && (
                <div>
                  <h3 className="font-semibold mb-2">Video Demonstration</h3>
                  <Button variant="outline" onClick={() => window.open(selectedStrategy.videoUrl, '_blank')}>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Watch Video
                  </Button>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Personal Notes</h3>
                <Textarea
                  placeholder="Add your notes about implementing this strategy..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
                <Button className="mt-2" onClick={handleSaveNotes} disabled={saveNotesMutation.isPending}>
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
