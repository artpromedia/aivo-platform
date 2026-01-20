'use client';

/**
 * Activity Library Component
 *
 * Provides a searchable library of activity templates that can be added to lessons
 * Features:
 * - Activity type filtering
 * - Subject and grade level filtering
 * - Search functionality
 * - Click to add activity to lesson
 */

import {
  Video,
  Gamepad2,
  BookOpen,
  CheckSquare,
  MessageCircle,
  Palette,
  Dices,
  Search,
  Clock,
  GraduationCap,
} from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface ActivityTemplate {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  duration: number;
  subject?: string;
  gradeLevel?: string;
  thumbnail?: string;
  tags?: string[];
}

export type ActivityType =
  | 'video'
  | 'interactive'
  | 'reading'
  | 'quiz'
  | 'discussion'
  | 'project'
  | 'game';

interface ActivityTypeConfig {
  id: ActivityType;
  icon: React.ElementType;
  name: string;
  color: string;
}

interface ActivityLibraryProps {
  onSelect: (activity: ActivityTemplate) => void;
  subjectFilter?: string;
  gradeLevelFilter?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// ACTIVITY TYPES CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const ACTIVITY_TYPES: ActivityTypeConfig[] = [
  { id: 'video', icon: Video, name: 'Video Lesson', color: 'bg-red-100 text-red-700' },
  { id: 'interactive', icon: Gamepad2, name: 'Interactive Activity', color: 'bg-purple-100 text-purple-700' },
  { id: 'reading', icon: BookOpen, name: 'Reading Assignment', color: 'bg-blue-100 text-blue-700' },
  { id: 'quiz', icon: CheckSquare, name: 'Quiz/Assessment', color: 'bg-green-100 text-green-700' },
  { id: 'discussion', icon: MessageCircle, name: 'Discussion', color: 'bg-amber-100 text-amber-700' },
  { id: 'project', icon: Palette, name: 'Project-Based', color: 'bg-pink-100 text-pink-700' },
  { id: 'game', icon: Dices, name: 'Educational Game', color: 'bg-indigo-100 text-indigo-700' },
];

// ════════════════════════════════════════════════════════════════════════════
// MOCK ACTIVITY TEMPLATES
// ════════════════════════════════════════════════════════════════════════════

const MOCK_ACTIVITIES: ActivityTemplate[] = [
  {
    id: 'video-1',
    title: 'Introduction Video',
    description: 'A short introduction video to engage students',
    type: 'video',
    duration: 5,
    subject: 'General',
    tags: ['intro', 'engagement'],
  },
  {
    id: 'video-2',
    title: 'Instructional Video',
    description: 'Main concept explanation with visuals',
    type: 'video',
    duration: 10,
    subject: 'General',
    tags: ['instruction', 'concept'],
  },
  {
    id: 'interactive-1',
    title: 'Drag and Drop Sorting',
    description: 'Interactive sorting activity with drag and drop',
    type: 'interactive',
    duration: 10,
    subject: 'Math',
    tags: ['sorting', 'practice'],
  },
  {
    id: 'interactive-2',
    title: 'Virtual Manipulatives',
    description: 'Hands-on learning with virtual manipulatives',
    type: 'interactive',
    duration: 15,
    subject: 'Math',
    tags: ['manipulatives', 'hands-on'],
  },
  {
    id: 'reading-1',
    title: 'Text Passage',
    description: 'Reading comprehension passage with questions',
    type: 'reading',
    duration: 15,
    subject: 'Reading',
    tags: ['comprehension', 'text'],
  },
  {
    id: 'reading-2',
    title: 'Informational Article',
    description: 'Non-fiction article with vocabulary support',
    type: 'reading',
    duration: 12,
    subject: 'Science',
    tags: ['non-fiction', 'vocabulary'],
  },
  {
    id: 'quiz-1',
    title: 'Quick Check',
    description: 'Short formative assessment (5 questions)',
    type: 'quiz',
    duration: 5,
    subject: 'General',
    tags: ['formative', 'quick'],
  },
  {
    id: 'quiz-2',
    title: 'Exit Ticket',
    description: 'End-of-lesson assessment',
    type: 'quiz',
    duration: 8,
    subject: 'General',
    tags: ['exit-ticket', 'assessment'],
  },
  {
    id: 'discussion-1',
    title: 'Think-Pair-Share',
    description: 'Collaborative discussion activity',
    type: 'discussion',
    duration: 10,
    subject: 'General',
    tags: ['collaborative', 'sharing'],
  },
  {
    id: 'discussion-2',
    title: 'Class Debate',
    description: 'Structured debate activity with roles',
    type: 'discussion',
    duration: 20,
    subject: 'General',
    tags: ['debate', 'critical-thinking'],
  },
  {
    id: 'project-1',
    title: 'Creative Project',
    description: 'Open-ended creative project',
    type: 'project',
    duration: 30,
    subject: 'General',
    tags: ['creative', 'open-ended'],
  },
  {
    id: 'project-2',
    title: 'Research Project',
    description: 'Guided research with presentation',
    type: 'project',
    duration: 45,
    subject: 'General',
    tags: ['research', 'presentation'],
  },
  {
    id: 'game-1',
    title: 'Math Facts Race',
    description: 'Timed math facts practice game',
    type: 'game',
    duration: 10,
    subject: 'Math',
    tags: ['math-facts', 'timed'],
  },
  {
    id: 'game-2',
    title: 'Vocabulary Match',
    description: 'Match vocabulary words with definitions',
    type: 'game',
    duration: 8,
    subject: 'Reading',
    tags: ['vocabulary', 'matching'],
  },
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function ActivityLibrary({
  onSelect,
  subjectFilter,
  gradeLevelFilter,
}: ActivityLibraryProps) {
  const [activities, setActivities] = React.useState<ActivityTemplate[]>([]);
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<ActivityType | 'all'>('all');
  const [isLoading, setIsLoading] = React.useState(true);

  // Load activities from API (using mock data for now)
  React.useEffect(() => {
    loadActivities();
  }, [subjectFilter, gradeLevelFilter, typeFilter]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      // In production, this would call the API
      // const response = await api.get<ActivityTemplate[]>('/api/activity-templates', {
      //   subject: subjectFilter,
      //   gradeLevel: gradeLevelFilter,
      //   type: typeFilter !== 'all' ? typeFilter : undefined,
      // });
      // setActivities(response);

      // Using mock data for now
      await new Promise((resolve) => setTimeout(resolve, 300));
      let filtered = [...MOCK_ACTIVITIES];

      if (subjectFilter && subjectFilter !== 'General') {
        filtered = filtered.filter(
          (a) => a.subject === subjectFilter || a.subject === 'General'
        );
      }
      if (typeFilter !== 'all') {
        filtered = filtered.filter((a) => a.type === typeFilter);
      }

      setActivities(filtered);
    } catch {
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredActivities = React.useMemo(() => {
    if (!search) return activities;
    const query = search.toLowerCase();
    return activities.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [activities, search]);

  const getActivityTypeConfig = (type: ActivityType): ActivityTypeConfig | undefined => {
    return ACTIVITY_TYPES.find((t) => t.id === type);
  };

  return (
    <div className="flex flex-col">
      <h3 className="mb-4 text-lg font-semibold">Activity Library</h3>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search activities..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          className="pl-9"
        />
      </div>

      {/* Type Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant={typeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setTypeFilter('all'); }}
          className="h-7 text-xs"
        >
          All
        </Button>
        {ACTIVITY_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <Button
              key={type.id}
              variant={typeFilter === type.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setTypeFilter(type.id); }}
              className="h-7 gap-1 text-xs"
            >
              <Icon className="h-3 w-3" />
              {type.name}
            </Button>
          );
        })}
      </div>

      {/* Activity List */}
      <ScrollArea className="max-h-96">
        <div className="space-y-3 pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No activities found
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                typeConfig={getActivityTypeConfig(activity.type)}
                onClick={() => { onSelect(activity); }}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ACTIVITY CARD
// ════════════════════════════════════════════════════════════════════════════

interface ActivityCardProps {
  activity: ActivityTemplate;
  typeConfig?: ActivityTypeConfig;
  onClick: () => void;
}

function ActivityCard({ activity, typeConfig, onClick }: ActivityCardProps) {
  const Icon = typeConfig?.icon ?? BookOpen;

  return (
    <div
      className={cn(
        'cursor-pointer rounded-lg border-2 border-gray-200 p-4 transition-all',
        'hover:border-primary hover:shadow-sm'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            typeConfig?.color ?? 'bg-gray-100 text-gray-700'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{activity.title}</h4>
          <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">
            {activity.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
              <Clock className="h-3 w-3" />
              {activity.duration}min
            </span>
            {activity.subject && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                <GraduationCap className="h-3 w-3" />
                {activity.subject}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export { ACTIVITY_TYPES, MOCK_ACTIVITIES };
