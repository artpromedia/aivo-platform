'use client';

/**
 * Grading Queue
 * 
 * Teacher interface for manually grading essays and short answer questions.
 * Features:
 * - Queue of ungraded responses
 * - Rubric-based scoring
 * - Inline feedback
 * - Batch actions
 * - Progress tracking
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  MoreVertical,
  Flag,
  Send,
  MessageSquare,
  FileText,
  Clock,
  User,
  Search,
  Filter,
  SortAsc,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { Question, Rubric, RubricCriterion, RubricLevel } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface StudentResponse {
  id: string;
  attemptId: string;
  questionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string;
  response: string;
  submittedAt: Date;
  gradedAt?: Date;
  graderId?: string;
  score?: number;
  feedback?: string;
  isFlagged?: boolean;
  flagReason?: string;
}

interface GradingQueueItem {
  response: StudentResponse;
  question: Question;
  rubric?: Rubric;
  attemptNumber: number;
  totalAttempts: number;
}

interface GradingQueueProps {
  assessmentId: string;
  assessmentName: string;
  items: GradingQueueItem[];
  totalUngradedCount: number;
  onGrade: (responseId: string, score: number, feedback: string) => Promise<void>;
  onFlag: (responseId: string, reason: string) => Promise<void>;
  onUnflag: (responseId: string) => Promise<void>;
  onSkip: (responseId: string) => void;
  onReleaseGrades?: () => Promise<void>;
  isLoading?: boolean;
}

interface RubricGraderProps {
  rubric: Rubric;
  maxPoints: number;
  onScoreChange: (score: number, criterionScores: Record<string, number>) => void;
  criterionScores?: Record<string, number>;
}

// ============================================================================
// RUBRIC GRADER
// ============================================================================

function RubricGrader({
  rubric,
  maxPoints,
  onScoreChange,
  criterionScores = {},
}: RubricGraderProps) {
  const [scores, setScores] = useState<Record<string, number>>(criterionScores);

  const handleCriterionChange = useCallback((criterionId: string, levelId: string) => {
    const criterion = rubric.criteria.find(c => c.id === criterionId);
    const level = criterion?.levels.find(l => l.id === levelId);
    
    if (!level) return;

    const newScores = { ...scores, [criterionId]: level.points };
    setScores(newScores);
    
    const totalScore = Object.values(newScores).reduce((sum, s) => sum + s, 0);
    onScoreChange(totalScore, newScores);
  }, [scores, rubric.criteria, onScoreChange]);

  const getSelectedLevel = (criterionId: string): string | undefined => {
    const score = scores[criterionId];
    if (score === undefined) return undefined;
    
    const criterion = rubric.criteria.find(c => c.id === criterionId);
    const level = criterion?.levels.find(l => l.points === score);
    return level?.id;
  };

  const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
  const maxRubricPoints = rubric.criteria.reduce((sum, c) => {
    const maxLevel = Math.max(...c.levels.map(l => l.points));
    return sum + maxLevel;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{rubric.name}</h4>
          <p className="text-sm text-muted-foreground">{rubric.description}</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {totalScore} / {maxRubricPoints} pts
        </Badge>
      </div>

      <div className="space-y-6">
        {rubric.criteria.map((criterion, idx) => (
          <div key={criterion.id} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="font-medium">
                  {idx + 1}. {criterion.name}
                </h5>
                {criterion.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {criterion.description}
                  </p>
                )}
              </div>
              <Badge variant="secondary">
                {scores[criterion.id] ?? 0} pts
              </Badge>
            </div>

            <div className="grid gap-2">
              {criterion.levels.map(level => (
                <label
                  key={level.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    'hover:bg-muted/50',
                    getSelectedLevel(criterion.id) === level.id && 'border-primary bg-primary/5'
                  )}
                >
                  <input
                    type="radio"
                    name={`criterion-${criterion.id}`}
                    checked={getSelectedLevel(criterion.id) === level.id}
                    onChange={() => handleCriterionChange(criterion.id, level.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{level.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {level.points} pts
                      </Badge>
                    </div>
                    {level.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {level.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// GRADING QUEUE
// ============================================================================

export function GradingQueue({
  assessmentId,
  assessmentName,
  items,
  totalUngradedCount,
  onGrade,
  onFlag,
  onUnflag,
  onSkip,
  onReleaseGrades,
  isLoading,
}: GradingQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'ungraded' | 'flagged'>('ungraded');
  const [searchQuery, setSearchQuery] = useState('');

  const currentItem = items[currentIndex];
  
  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;
    
    if (filter === 'ungraded') {
      result = result.filter(item => !item.response.gradedAt);
    } else if (filter === 'flagged') {
      result = result.filter(item => item.response.isFlagged);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.response.studentName.toLowerCase().includes(query) ||
        item.response.studentEmail.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [items, filter, searchQuery]);

  const gradedCount = items.filter(item => item.response.gradedAt).length;
  const progress = items.length > 0 ? (gradedCount / items.length) * 100 : 0;

  // Reset form when navigating to new item
  const resetForm = useCallback(() => {
    if (currentItem) {
      setScore(currentItem.response.score ?? 0);
      setFeedback(currentItem.response.feedback ?? '');
      setCriterionScores({});
    }
  }, [currentItem]);

  const handleNext = useCallback(() => {
    if (currentIndex < filteredItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetForm();
    }
  }, [currentIndex, filteredItems.length, resetForm]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      resetForm();
    }
  }, [currentIndex, resetForm]);

  const handleSubmitGrade = useCallback(async () => {
    if (!currentItem) return;
    
    setIsSaving(true);
    try {
      await onGrade(currentItem.response.id, score, feedback);
      handleNext();
    } catch (error) {
      console.error('Failed to save grade:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentItem, score, feedback, onGrade, handleNext]);

  const handleFlag = useCallback(async () => {
    if (!currentItem || !flagReason) return;
    
    setIsSaving(true);
    try {
      await onFlag(currentItem.response.id, flagReason);
      setShowFlagDialog(false);
      setFlagReason('');
      handleNext();
    } catch (error) {
      console.error('Failed to flag response:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentItem, flagReason, onFlag, handleNext]);

  const handleUnflag = useCallback(async () => {
    if (!currentItem) return;
    
    setIsSaving(true);
    try {
      await onUnflag(currentItem.response.id);
    } catch (error) {
      console.error('Failed to unflag response:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentItem, onUnflag]);

  const handleSkip = useCallback(() => {
    if (!currentItem) return;
    onSkip(currentItem.response.id);
    handleNext();
  }, [currentItem, onSkip, handleNext]);

  const handleRubricScoreChange = useCallback((newScore: number, newCriterionScores: Record<string, number>) => {
    setScore(newScore);
    setCriterionScores(newCriterionScores);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium">All caught up!</h3>
        <p className="text-muted-foreground mt-2">
          No responses need grading at this time.
        </p>
        {onReleaseGrades && (
          <Button onClick={onReleaseGrades} className="mt-4">
            Release Grades
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{assessmentName}</h1>
            <p className="text-sm text-muted-foreground">
              Grading Queue · {totalUngradedCount} remaining
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Progress value={progress} className="w-32 h-2" />
              <span className="text-muted-foreground">
                {gradedCount}/{items.length} graded
              </span>
            </div>
            {onReleaseGrades && gradedCount > 0 && (
              <Button variant="outline" onClick={onReleaseGrades}>
                <Send className="mr-2 h-4 w-4" />
                Release Grades
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Responses</SelectItem>
              <SelectItem value="ungraded">Ungraded Only</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Response List Sidebar */}
        <aside className="w-72 border-r bg-muted/30 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredItems.map((item, idx) => (
                <button
                  key={item.response.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                    'hover:bg-muted',
                    currentIndex === idx && 'bg-muted'
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={item.response.studentAvatar} />
                    <AvatarFallback>
                      {item.response.studentName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">
                      {item.response.studentName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Q{item.question.id.slice(0, 4)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.response.isFlagged && (
                      <Flag className="h-3 w-3 text-yellow-500" />
                    )}
                    {item.response.gradedAt ? (
                      <Badge variant="secondary" className="text-xs">
                        {item.response.score}/{item.question.points}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Pending
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Grading Area */}
        {currentItem && (
          <main className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Student Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={currentItem.response.studentAvatar} />
                      <AvatarFallback>
                        {currentItem.response.studentName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{currentItem.response.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {currentItem.response.studentEmail}
                      </p>
                    </div>
                    {currentItem.response.isFlagged && (
                      <Badge variant="destructive" className="gap-1">
                        <Flag className="h-3 w-3" />
                        Flagged: {currentItem.response.flagReason}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Submitted {new Date(currentItem.response.submittedAt).toLocaleString()}
                  </div>
                </div>

                {/* Question */}
                <Card>
                  <CardHeader>
                    <CardDescription>Question</CardDescription>
                    <CardTitle className="text-base">
                      <div
                        dangerouslySetInnerHTML={{ __html: currentItem.question.stem }}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Type: {currentItem.question.type}</span>
                      <span>•</span>
                      <span>Points: {currentItem.question.points}</span>
                      <span>•</span>
                      <span>Difficulty: {currentItem.question.difficulty}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Student Response */}
                <Card>
                  <CardHeader>
                    <CardDescription>Student Response</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/30 p-4 rounded-lg">
                      {currentItem.question.type === 'CODE' ? (
                        <pre className="font-mono text-sm whitespace-pre-wrap">
                          <code>{currentItem.response.response}</code>
                        </pre>
                      ) : (
                        <p className="whitespace-pre-wrap">{currentItem.response.response}</p>
                      )}
                    </div>
                    {currentItem.question.type === 'ESSAY' && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Word count: {currentItem.response.response.trim().split(/\s+/).filter(Boolean).length}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Grading Panel */}
                <Card>
                  <CardHeader>
                    <CardTitle>Grade Response</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Tabs defaultValue={currentItem.rubric ? 'rubric' : 'points'}>
                      {currentItem.rubric && (
                        <TabsList className="mb-4">
                          <TabsTrigger value="rubric">Use Rubric</TabsTrigger>
                          <TabsTrigger value="points">Direct Points</TabsTrigger>
                        </TabsList>
                      )}

                      <TabsContent value="rubric">
                        {currentItem.rubric && (
                          <RubricGrader
                            rubric={currentItem.rubric}
                            maxPoints={currentItem.question.points}
                            onScoreChange={handleRubricScoreChange}
                            criterionScores={criterionScores}
                          />
                        )}
                      </TabsContent>

                      <TabsContent value="points">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Score</Label>
                              <span className="text-lg font-medium">
                                {score} / {currentItem.question.points} pts
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[score]}
                                onValueChange={([v]) => setScore(v)}
                                max={currentItem.question.points}
                                step={0.5}
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                value={score}
                                onChange={e => setScore(Math.min(currentItem.question.points, Math.max(0, parseFloat(e.target.value) || 0)))}
                                className="w-20"
                                min={0}
                                max={currentItem.question.points}
                                step={0.5}
                              />
                            </div>
                          </div>

                          {/* Quick score buttons */}
                          <div className="flex gap-2">
                            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                              <Button
                                key={pct}
                                variant="outline"
                                size="sm"
                                onClick={() => setScore(Math.round(currentItem.question.points * pct * 2) / 2)}
                                className={cn(
                                  score === Math.round(currentItem.question.points * pct * 2) / 2 && 'bg-muted'
                                )}
                              >
                                {Math.round(pct * 100)}%
                              </Button>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <Separator />

                    {/* Feedback */}
                    <div className="space-y-2">
                      <Label htmlFor="feedback">Feedback</Label>
                      <Textarea
                        id="feedback"
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="Provide feedback to the student..."
                        rows={4}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {currentItem.response.isFlagged ? (
                        <Button variant="outline" onClick={handleUnflag} disabled={isSaving}>
                          <Flag className="mr-2 h-4 w-4" />
                          Unflag
                        </Button>
                      ) : (
                        <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              <Flag className="mr-2 h-4 w-4" />
                              Flag
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Flag Response</DialogTitle>
                              <DialogDescription>
                                Add a reason for flagging this response for review.
                              </DialogDescription>
                            </DialogHeader>
                            <Textarea
                              value={flagReason}
                              onChange={e => setFlagReason(e.target.value)}
                              placeholder="Reason for flagging..."
                              rows={3}
                            />
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowFlagDialog(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleFlag} disabled={!flagReason || isSaving}>
                                Flag Response
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      <Button variant="ghost" onClick={handleSkip}>
                        Skip
                      </Button>
                    </div>

                    <Button onClick={handleSubmitGrade} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Save & Next
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </ScrollArea>

            {/* Navigation Footer */}
            <footer className="border-t px-6 py-3 flex items-center justify-between bg-background">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {currentIndex + 1} of {filteredItems.length}
                </span>
              </div>

              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentIndex === filteredItems.length - 1}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </footer>
          </main>
        )}
      </div>
    </div>
  );
}

export default GradingQueue;
