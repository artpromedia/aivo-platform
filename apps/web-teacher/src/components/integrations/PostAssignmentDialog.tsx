/**
 * Post Assignment Dialog Component
 *
 * Dialog for posting AIVO lessons as Google Classroom assignments.
 * Allows teachers to customize assignment details before posting.
 *
 * @component
 */

'use client';

import { format, addDays } from 'date-fns';
import { Loader2, Calendar as CalendarIcon, Send, Clock, BookOpen } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { ClassroomCourse, AssignmentPostRequest } from '@/lib/api/google-classroom';
import { googleClassroomApi } from '@/lib/api/google-classroom';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface Lesson {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  gradeLevel?: string;
  subject?: string;
  standards?: string[];
}

interface PostAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson;
  /** Pre-selected course ID */
  courseId?: string;
  /** Callback on successful post */
  onSuccess?: (assignmentId: string) => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function PostAssignmentDialog({
  open,
  onOpenChange,
  lesson,
  courseId: initialCourseId,
  onSuccess,
}: PostAssignmentDialogProps) {
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId || '');
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description || '');
  const [maxPoints, setMaxPoints] = useState<number | undefined>(100);
  const [hasDueDate, setHasDueDate] = useState(true);
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 7));
  const [dueTime, setDueTime] = useState('23:59');
  const [scheduledPublish, setScheduledPublish] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [autoGradePassback, setAutoGradePassback] = useState(true);

  const { toast } = useToast();

  // Reset form when lesson changes
  useEffect(() => {
    setTitle(lesson.title);
    setDescription(generateDescription(lesson));
    setError(null);
  }, [lesson]);

  // Fetch courses when dialog opens
  useEffect(() => {
    if (open) {
      fetchCourses();
    }
  }, [open]);

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const courseList = await googleClassroomApi.getCourses();
      setCourses(courseList.filter((c) => c.courseState === 'ACTIVE'));
    } catch (err: any) {
      setError('Failed to load courses. Please try again.');
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId),
    [courses, selectedCourseId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourseId) {
      setError('Please select a course');
      return;
    }

    try {
      setPosting(true);
      setError(null);

      const request: AssignmentPostRequest = {
        lessonId: lesson.id,
        courseId: selectedCourseId,
        title,
        description,
        maxPoints,
        dueDate: hasDueDate ? combineDateAndTime(dueDate, dueTime) : undefined,
        scheduledTime: scheduledPublish
          ? combineDateAndTime(scheduleDate, scheduleTime)
          : undefined,
        autoGradePassback,
      };

      const result = await googleClassroomApi.postAssignment(request);

      toast({
        title: 'Assignment Posted!',
        description: `"${title}" has been posted to ${selectedCourse?.name}`,
      });

      onSuccess?.(result.googleAssignmentId);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to post assignment');
      toast({
        variant: 'destructive',
        title: 'Failed to Post',
        description: err.message,
      });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Post to Google Classroom
          </DialogTitle>
          <DialogDescription>
            Post this lesson as an assignment in Google Classroom
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Lesson preview */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{lesson.title}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {lesson.subject && (
                    <Badge variant="secondary" className="text-xs">
                      {lesson.subject}
                    </Badge>
                  )}
                  {lesson.gradeLevel && (
                    <Badge variant="secondary" className="text-xs">
                      Grade {lesson.gradeLevel}
                    </Badge>
                  )}
                  {lesson.estimatedMinutes && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="h-3 w-3" />
                      {lesson.estimatedMinutes} min
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Course selection */}
          <div className="space-y-2">
            <Label htmlFor="course">Course *</Label>
            <Select
              value={selectedCourseId}
              onValueChange={setSelectedCourseId}
              disabled={loadingCourses}
            >
              <SelectTrigger id="course">
                <SelectValue
                  placeholder={loadingCourses ? 'Loading courses...' : 'Select a course'}
                />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    <div className="flex flex-col">
                      <span>{course.name}</span>
                      {course.section && (
                        <span className="text-xs text-muted-foreground">{course.section}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Assignment Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              required
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
              }}
              rows={3}
              maxLength={30000}
            />
          </div>

          {/* Points */}
          <div className="space-y-2">
            <Label htmlFor="points">Points</Label>
            <Input
              id="points"
              type="number"
              min={0}
              max={1000}
              value={maxPoints ?? ''}
              onChange={(e) => {
                setMaxPoints(e.target.value ? Number(e.target.value) : undefined);
              }}
              placeholder="Ungraded"
            />
            <p className="text-xs text-muted-foreground">Leave empty for ungraded assignment</p>
          </div>

          {/* Due Date */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="has-due-date">Due Date</Label>
              <Switch id="has-due-date" checked={hasDueDate} onCheckedChange={setHasDueDate} />
            </div>

            {hasDueDate && (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dueDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => {
                        if (date) setDueDate(date);
                      }}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => {
                    setDueTime(e.target.value);
                  }}
                  className="w-32"
                />
              </div>
            )}
          </div>

          {/* Schedule for later */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="scheduled-publish">Schedule for Later</Label>
              <Switch
                id="scheduled-publish"
                checked={scheduledPublish}
                onCheckedChange={setScheduledPublish}
              />
            </div>

            {scheduledPublish && (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(scheduleDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={(date) => {
                        if (date) setScheduleDate(date);
                      }}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => {
                    setScheduleTime(e.target.value);
                  }}
                  className="w-32"
                />
              </div>
            )}
          </div>

          {/* Auto grade passback */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-grade">Auto-sync Grades</Label>
              <p className="text-xs text-muted-foreground">
                Automatically send grades to Classroom when students complete
              </p>
            </div>
            <Switch
              id="auto-grade"
              checked={autoGradePassback}
              onCheckedChange={setAutoGradePassback}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={posting || !selectedCourseId}>
              {posting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Post Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function generateDescription(lesson: Lesson): string {
  const parts: string[] = [];

  if (lesson.description) {
    parts.push(lesson.description);
  }

  parts.push('');
  parts.push('Complete this lesson in AIVO by clicking the link below.');

  if (lesson.estimatedMinutes) {
    parts.push(`Estimated time: ${lesson.estimatedMinutes} minutes`);
  }

  if (lesson.standards && lesson.standards.length > 0) {
    parts.push(`Standards: ${lesson.standards.join(', ')}`);
  }

  return parts.join('\n');
}

function combineDateAndTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined.toISOString();
}

export default PostAssignmentDialog;
