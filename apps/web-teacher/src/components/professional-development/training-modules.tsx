'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Play,
  BookOpen,
  Video,
  FileText,
  Clock,
  CheckCircle,
  ChevronRight,
  Lock,
  Star,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Module {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lessons: number;
  completedLessons: number;
  thumbnailUrl?: string;
  instructor: string;
  rating: number;
  enrolled: number;
  isLocked: boolean;
  prerequisites?: string[];
  learningOutcomes: string[];
}

interface TrainingModulesProps {
  modules?: Module[];
  progress?: Record<string, number>;
  onStartModule?: (moduleId: string) => void;
  onContinueModule?: (moduleId: string) => void;
}

const mockModules: Module[] = [
  {
    id: '1',
    title: 'Introduction to Differentiated Instruction',
    description: 'Learn the fundamentals of adapting your teaching to meet diverse learner needs.',
    category: 'Instructional Strategies',
    duration: 120,
    difficulty: 'beginner',
    lessons: 8,
    completedLessons: 5,
    instructor: 'Dr. Sarah Johnson',
    rating: 4.8,
    enrolled: 1250,
    isLocked: false,
    learningOutcomes: [
      'Understand learning profiles',
      'Implement tiered activities',
      'Assess student readiness',
    ],
  },
  {
    id: '2',
    title: 'Classroom Management Essentials',
    description: 'Master evidence-based strategies for creating a positive learning environment.',
    category: 'Classroom Management',
    duration: 90,
    difficulty: 'beginner',
    lessons: 6,
    completedLessons: 6,
    instructor: 'Michael Chen',
    rating: 4.9,
    enrolled: 2100,
    isLocked: false,
    learningOutcomes: [
      'Establish classroom routines',
      'Implement positive reinforcement',
      'Handle disruptions effectively',
    ],
  },
  {
    id: '3',
    title: 'Technology Integration for Modern Classrooms',
    description: 'Explore effective ways to integrate technology into your teaching practice.',
    category: 'Technology Integration',
    duration: 150,
    difficulty: 'intermediate',
    lessons: 10,
    completedLessons: 0,
    instructor: 'Emily Rodriguez',
    rating: 4.7,
    enrolled: 890,
    isLocked: false,
    prerequisites: ['Introduction to Differentiated Instruction'],
    learningOutcomes: [
      'Use ed-tech tools effectively',
      'Create digital assessments',
      'Foster digital citizenship',
    ],
  },
  {
    id: '4',
    title: 'Supporting Students with IEPs',
    description: 'Comprehensive training on understanding and implementing IEP accommodations.',
    category: 'Special Education',
    duration: 180,
    difficulty: 'intermediate',
    lessons: 12,
    completedLessons: 0,
    instructor: 'Dr. Patricia Williams',
    rating: 4.9,
    enrolled: 560,
    isLocked: true,
    prerequisites: ['Classroom Management Essentials'],
    learningOutcomes: [
      'Read and interpret IEPs',
      'Implement accommodations',
      'Track IEP goal progress',
    ],
  },
  {
    id: '5',
    title: 'Advanced Assessment Strategies',
    description: 'Design and implement formative and summative assessments that drive learning.',
    category: 'Assessment',
    duration: 200,
    difficulty: 'advanced',
    lessons: 15,
    completedLessons: 0,
    instructor: 'Dr. James Thompson',
    rating: 4.6,
    enrolled: 420,
    isLocked: true,
    prerequisites: ['Technology Integration for Modern Classrooms'],
    learningOutcomes: [
      'Design authentic assessments',
      'Use data-driven instruction',
      'Implement peer assessment',
    ],
  },
];

const categoryColors: Record<string, string> = {
  'Instructional Strategies': 'bg-green-100 text-green-700',
  'Classroom Management': 'bg-blue-100 text-blue-700',
  'Technology Integration': 'bg-purple-100 text-purple-700',
  'Special Education': 'bg-orange-100 text-orange-700',
  Assessment: 'bg-yellow-100 text-yellow-700',
  default: 'bg-gray-100 text-gray-700',
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-red-100 text-red-700',
};

export function TrainingModules({
  modules = mockModules,
  progress = {},
  onStartModule,
  onContinueModule,
}: TrainingModulesProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');

  const filteredModules = modules.filter((module) => {
    const matchesSearch =
      !search ||
      module.title.toLowerCase().includes(search.toLowerCase()) ||
      module.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || module.category === categoryFilter;
    const matchesDifficulty = !difficultyFilter || module.difficulty === difficultyFilter;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const categories = Array.from(new Set(modules.map((m) => m.category)));

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getProgressPercentage = (module: Module) => {
    if (progress[module.id] !== undefined) return progress[module.id];
    if (module.lessons === 0) return 0;
    return Math.round((module.completedLessons / module.lessons) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Training Modules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            placeholder="Search modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
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

        {/* Modules List */}
        <div className="space-y-4">
          {filteredModules.map((module) => {
            const progressPercent = getProgressPercentage(module);
            const isCompleted = progressPercent === 100;
            const isInProgress = progressPercent > 0 && progressPercent < 100;

            return (
              <div
                key={module.id}
                className={cn(
                  'border rounded-lg p-4 transition-all hover:shadow-md',
                  module.isLocked && 'opacity-70 bg-gray-50',
                  isCompleted && 'border-green-200 bg-green-50/30'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Module Icon/Thumbnail */}
                  <div
                    className={cn(
                      'w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0',
                      isCompleted ? 'bg-green-100' : 'bg-primary-100'
                    )}
                  >
                    {module.isLocked ? (
                      <Lock className="h-6 w-6 text-gray-500" />
                    ) : isCompleted ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <Video className="h-6 w-6 text-primary-600" />
                    )}
                  </div>

                  {/* Module Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{module.title}</h3>
                          {isCompleted && (
                            <Badge className="bg-green-100 text-green-700">Completed</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {module.description}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge className={categoryColors[module.category] || categoryColors.default}>
                        {module.category}
                      </Badge>
                      <Badge className={difficultyColors[module.difficulty]}>
                        {module.difficulty}
                      </Badge>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(module.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {module.lessons} lessons
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        {module.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {module.enrolled.toLocaleString()} enrolled
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {!module.isLocked && (isInProgress || isCompleted) && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>
                            {module.completedLessons}/{module.lessons} lessons ({progressPercent}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all',
                              isCompleted ? 'bg-green-500' : 'bg-primary-500'
                            )}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Prerequisites */}
                    {module.isLocked && module.prerequisites && (
                      <p className="text-sm text-orange-600 mt-3">
                        Prerequisites: {module.prerequisites.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0">
                    {module.isLocked ? (
                      <Button variant="outline" disabled>
                        <Lock className="h-4 w-4 mr-2" />
                        Locked
                      </Button>
                    ) : isCompleted ? (
                      <Button
                        variant="outline"
                        onClick={() => onContinueModule?.(module.id)}
                      >
                        Review
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : isInProgress ? (
                      <Button onClick={() => onContinueModule?.(module.id)}>
                        Continue
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button onClick={() => onStartModule?.(module.id)}>
                        <Play className="h-4 w-4 mr-2" />
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredModules.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No modules found matching your filters.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TrainingModules;
