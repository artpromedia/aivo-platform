'use client';

/**
 * Lesson Editor Component
 *
 * Main editor interface for lesson metadata and activity management
 * Features:
 * - Lesson title, subject, grade level, duration
 * - Learning objectives management
 * - Activity list with drag-and-drop reordering
 * - Activity editing and removal
 */

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Trash2,
  Plus,
  Clock,
  BookOpen,
  Target,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type ActivityTemplate, ACTIVITY_TYPES } from './ActivityLibrary';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface LessonActivity extends ActivityTemplate {
  order: number;
}

export interface LessonData {
  title: string;
  subject: string;
  gradeLevel: string;
  duration: number;
  objectives: string[];
  standards: string[];
  activities: LessonActivity[];
  assessments: string[];
  resources: Resource[];
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  url: string;
}

interface LessonEditorProps {
  lesson: LessonData;
  onChange: (lesson: LessonData) => void;
  onAddActivity: (activity: ActivityTemplate) => void;
  onRemoveActivity: (activityId: string) => void;
  onReorderActivities: (startIndex: number, endIndex: number) => void;
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const SUBJECTS = [
  'Math',
  'Reading',
  'Writing',
  'Science',
  'Social Studies',
  'Art',
  'Music',
  'Physical Education',
  'General',
];

const GRADE_LEVELS = [
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function LessonEditor({
  lesson,
  onChange,
  onRemoveActivity,
  onReorderActivities,
}: LessonEditorProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [newObjective, setNewObjective] = React.useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lesson.activities.findIndex((a) => a.id === active.id);
      const newIndex = lesson.activities.findIndex((a) => a.id === over.id);
      onReorderActivities(oldIndex, newIndex);
    }

    setActiveId(null);
  };

  const updateField = <K extends keyof LessonData>(field: K, value: LessonData[K]) => {
    onChange({ ...lesson, [field]: value });
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      updateField('objectives', [...lesson.objectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) => {
    updateField(
      'objectives',
      lesson.objectives.filter((_, i) => i !== index)
    );
  };

  const totalDuration = lesson.activities.reduce((sum, a) => sum + a.duration, 0);
  const activeActivity = lesson.activities.find((a) => a.id === activeId);

  return (
    <div className="space-y-8">
      {/* Lesson Header */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-semibold">Lesson Details</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Lesson Title</Label>
            <Input
              id="title"
              value={lesson.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Enter lesson title..."
              className="mt-1"
            />
          </div>

          {/* Subject and Grade */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={lesson.subject}
                onValueChange={(value) => updateField('subject', value)}
              >
                <SelectTrigger id="subject" className="mt-1">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Select
                value={lesson.gradeLevel}
                onValueChange={(value) => updateField('gradeLevel', value)}
              >
                <SelectTrigger id="gradeLevel" className="mt-1">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="duration">Target Duration (minutes)</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="duration"
                type="number"
                value={lesson.duration}
                onChange={(e) => updateField('duration', parseInt(e.target.value) || 0)}
                className="w-24"
                min={1}
              />
              <span className="text-sm text-muted-foreground">
                Current total: {totalDuration} min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Learning Objectives</h2>
        </div>

        <div className="space-y-3">
          {lesson.objectives.map((objective, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg bg-gray-50 p-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {index + 1}
              </span>
              <span className="flex-1 text-sm">{objective}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeObjective(index)}
                className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              placeholder="Add a learning objective..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addObjective();
                }
              }}
            />
            <Button onClick={addObjective} disabled={!newObjective.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Activities */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Activities</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {lesson.activities.length} activities
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {totalDuration} min total
          </div>
        </div>

        {lesson.activities.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">No activities yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add activities from the Activity Library on the right
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={lesson.activities.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {lesson.activities.map((activity, index) => (
                  <SortableActivityCard
                    key={activity.id}
                    activity={activity}
                    index={index}
                    onRemove={() => onRemoveActivity(activity.id)}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeActivity ? (
                <ActivityCard activity={activeActivity} index={0} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SORTABLE ACTIVITY CARD
// ════════════════════════════════════════════════════════════════════════════

interface SortableActivityCardProps {
  activity: LessonActivity;
  index: number;
  onRemove: () => void;
}

function SortableActivityCard({ activity, index, onRemove }: SortableActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ActivityCard
        activity={activity}
        index={index}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ACTIVITY CARD
// ════════════════════════════════════════════════════════════════════════════

interface ActivityCardProps {
  activity: LessonActivity;
  index: number;
  isDragging?: boolean;
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

function ActivityCard({
  activity,
  index,
  isDragging = false,
  onRemove,
  dragHandleProps,
}: ActivityCardProps) {
  const typeConfig = ACTIVITY_TYPES.find((t) => t.id === activity.type);
  const Icon = typeConfig?.icon ?? BookOpen;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-white p-3 transition-shadow',
        isDragging && 'shadow-lg'
      )}
    >
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5" />
        </div>
      )}

      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
        {index + 1}
      </span>

      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          typeConfig?.color ?? 'bg-gray-100 text-gray-700'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{activity.title}</h4>
        <p className="text-xs text-gray-500">{typeConfig?.name}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
          <Clock className="h-3 w-3" />
          {activity.duration}min
        </span>

        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
