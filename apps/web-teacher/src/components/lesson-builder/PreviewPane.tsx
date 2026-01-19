'use client';

/**
 * Preview Pane Component
 *
 * Full-screen modal to preview the lesson as students would see it
 * Features:
 * - Activity timeline view
 * - Resource preview
 * - Objectives and standards display
 * - Responsive preview modes
 */

import * as React from 'react';
import {
  X,
  Clock,
  Target,
  Award,
  BookOpen,
  Paperclip,
  Monitor,
  Tablet,
  Smartphone,
  ChevronRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type LessonData, type LessonActivity } from './LessonEditor';
import { ACTIVITY_TYPES } from './ActivityLibrary';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface PreviewPaneProps {
  lesson: LessonData;
  onClose: () => void;
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function PreviewPane({ lesson, onClose }: PreviewPaneProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('desktop');
  const totalDuration = lesson.activities.reduce((sum, a) => sum + a.duration, 0);

  const getPreviewWidth = () => {
    switch (viewMode) {
      case 'mobile':
        return 'max-w-sm';
      case 'tablet':
        return 'max-w-2xl';
      default:
        return 'max-w-4xl';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Lesson Preview</h2>
            <p className="text-sm text-muted-foreground">
              Preview how students will see this lesson
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Selector */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
              <Button
                variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('desktop')}
                className="h-8 px-3"
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('tablet')}
                className="h-8 px-3"
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mobile')}
                className="h-8 px-3"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 p-6">
          <ScrollArea className="h-full">
            <div className={cn('mx-auto transition-all', getPreviewWidth())}>
              <div className="rounded-xl bg-white shadow-sm">
                {/* Lesson Header */}
                <div className="border-b bg-gradient-to-r from-primary/10 to-primary/5 p-6">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{lesson.subject}</span>
                    <ChevronRight className="h-4 w-4" />
                    <span>{lesson.gradeLevel}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {lesson.title || 'Untitled Lesson'}
                  </h1>
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {totalDuration} minutes
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {lesson.activities.length} activities
                    </span>
                  </div>
                </div>

                {/* Learning Objectives */}
                {lesson.objectives.length > 0 && (
                  <div className="border-b p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      <h2 className="font-semibold">Learning Objectives</h2>
                    </div>
                    <ul className="space-y-2">
                      {lesson.objectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {objective}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Standards */}
                {lesson.standards.length > 0 && (
                  <div className="border-b p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-500" />
                      <h2 className="font-semibold">Standards Covered</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lesson.standards.map((standard, index) => (
                        <span
                          key={index}
                          className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                        >
                          {standard}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activities Timeline */}
                <div className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">Lesson Activities</h2>
                  </div>

                  {lesson.activities.length === 0 ? (
                    <div className="rounded-lg bg-gray-50 p-8 text-center">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        No activities added yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lesson.activities.map((activity, index) => (
                        <ActivityPreviewCard
                          key={activity.id}
                          activity={activity}
                          index={index}
                          isLast={index === lesson.activities.length - 1}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Resources */}
                {lesson.resources.length > 0 && (
                  <div className="border-t p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Paperclip className="h-5 w-5 text-gray-500" />
                      <h2 className="font-semibold">Resources</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lesson.resources.map((resource) => (
                        <a
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          {resource.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ACTIVITY PREVIEW CARD
// ════════════════════════════════════════════════════════════════════════════

interface ActivityPreviewCardProps {
  activity: LessonActivity;
  index: number;
  isLast: boolean;
}

function ActivityPreviewCard({ activity, index, isLast }: ActivityPreviewCardProps) {
  const typeConfig = ACTIVITY_TYPES.find((t) => t.id === activity.type);
  const Icon = typeConfig?.icon ?? BookOpen;

  return (
    <div className="relative flex gap-4">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            typeConfig?.color ?? 'bg-gray-100 text-gray-700'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="rounded-lg border bg-gray-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Activity {index + 1}
              </span>
              <h3 className="mt-1 font-medium">{activity.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {activity.description}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
              <Clock className="h-3 w-3" />
              {activity.duration}min
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
