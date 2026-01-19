'use client';

import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Target,
  Star,
  Trophy,
  Zap,
  BookOpen,
  GraduationCap,
  Medal,
  Flame,
  Gift,
  ChevronRight,
  Lock,
} from 'lucide-react';

export type MilestoneType =
  | 'lesson_count'
  | 'streak'
  | 'subject_mastery'
  | 'achievement'
  | 'level_up'
  | 'time_goal'
  | 'perfect_score'
  | 'completion';

export interface Milestone {
  id: string;
  type: MilestoneType;
  title: string;
  description: string;
  progress: number; // 0-100
  target: number;
  current: number;
  subject?: string;
  reward?: {
    type: 'badge' | 'points' | 'avatar' | 'theme';
    value: string;
    points?: number;
  };
  estimatedCompletion?: string;
  isPriority?: boolean;
}

interface UpcomingMilestonesProps {
  milestones: Milestone[];
  onMilestoneClick?: (milestone: Milestone) => void;
  onViewAll?: () => void;
}

const milestoneConfig: Record<
  MilestoneType,
  { icon: typeof Target; color: string; bgColor: string }
> = {
  lesson_count: {
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  streak: {
    icon: Flame,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  subject_mastery: {
    icon: GraduationCap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  achievement: {
    icon: Trophy,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  level_up: {
    icon: Zap,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  time_goal: {
    icon: Target,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  perfect_score: {
    icon: Star,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  completion: {
    icon: Medal,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
};

export function UpcomingMilestones({
  milestones,
  onMilestoneClick,
  onViewAll,
}: UpcomingMilestonesProps) {
  // Sort by progress (closest to completion first), then by priority
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (a.isPriority && !b.isPriority) return -1;
    if (!a.isPriority && b.isPriority) return 1;
    return b.progress - a.progress;
  });

  if (milestones.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Milestones</h2>
        </div>
        <div className="text-center py-6">
          <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No milestones available yet.</p>
          <p className="text-sm text-gray-400 mt-1">Start learning to unlock milestones!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Milestones</h2>
            <p className="text-sm text-gray-500">{milestones.length} in progress</p>
          </div>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        {sortedMilestones.slice(0, 4).map((milestone, index) => {
          const config = milestoneConfig[milestone.type];
          const Icon = config.icon;
          const isClose = milestone.progress >= 80;
          const isAlmostDone = milestone.progress >= 95;

          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onMilestoneClick?.(milestone)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onMilestoneClick?.(milestone);
                }
              }}
              tabIndex={0}
              role="button"
              className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                isAlmostDone
                  ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50'
                  : isClose
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              {/* Priority Badge */}
              {milestone.isPriority && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                  Priority
                </span>
              )}

              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                      {milestone.subject && (
                        <span className="text-xs text-gray-500">{milestone.subject}</span>
                      )}
                    </div>
                    {milestone.reward && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        <Gift className="w-3 h-3" />
                        {milestone.reward.points ? `${milestone.reward.points} pts` : milestone.reward.value}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{milestone.description}</p>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {milestone.current} / {milestone.target}
                      </span>
                      <span
                        className={`font-medium ${
                          isAlmostDone
                            ? 'text-amber-600'
                            : isClose
                            ? 'text-emerald-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {Math.round(milestone.progress)}%
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${milestone.progress}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={`h-full rounded-full ${
                          isAlmostDone
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                            : isClose
                            ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                            : 'bg-gradient-to-r from-indigo-400 to-purple-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Estimated Completion */}
                  {milestone.estimatedCompletion && (
                    <p className="text-xs text-gray-400 mt-2">
                      Estimated completion:{' '}
                      {formatDistanceToNow(new Date(milestone.estimatedCompletion), {
                        addSuffix: true,
                      })}
                    </p>
                  )}

                  {/* Almost There Message */}
                  {isAlmostDone && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Almost there! Just a little more!
                    </motion.p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Locked Milestones Teaser */}
      {milestones.length > 4 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <div className="flex items-center gap-2 text-gray-500">
            <Lock className="w-4 h-4" />
            <span className="text-sm">
              {milestones.length - 4} more milestones to discover
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
