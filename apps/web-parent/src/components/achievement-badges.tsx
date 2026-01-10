/**
 * Achievement Badges Component
 *
 * Displays earned achievements and badges for gamification.
 * Inspired by achievement systems from aivo-agentic-ai-learning-app.
 */

'use client';

import { Award, Star, Trophy, Target, Zap, BookOpen, Brain, Heart } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'learning' | 'streak' | 'mastery' | 'engagement' | 'special';
  earnedAt?: string;
  progress?: number;
  total?: number;
}

interface AchievementBadgesProps {
  achievements: Achievement[];
  showLocked?: boolean;
  maxDisplay?: number;
}

const categoryColors = {
  learning: 'from-blue-400 to-indigo-500',
  streak: 'from-orange-400 to-amber-500',
  mastery: 'from-purple-400 to-pink-500',
  engagement: 'from-green-400 to-emerald-500',
  special: 'from-yellow-400 to-orange-500',
};

const categoryBgColors = {
  learning: 'bg-blue-100 border-blue-200',
  streak: 'bg-orange-100 border-orange-200',
  mastery: 'bg-purple-100 border-purple-200',
  engagement: 'bg-green-100 border-green-200',
  special: 'bg-yellow-100 border-yellow-200',
};

const iconMap: Record<string, React.ReactNode> = {
  star: <Star className="w-5 h-5" />,
  trophy: <Trophy className="w-5 h-5" />,
  target: <Target className="w-5 h-5" />,
  zap: <Zap className="w-5 h-5" />,
  book: <BookOpen className="w-5 h-5" />,
  brain: <Brain className="w-5 h-5" />,
  heart: <Heart className="w-5 h-5" />,
  award: <Award className="w-5 h-5" />,
};

export function AchievementBadges({
  achievements,
  showLocked = false,
  maxDisplay = 6,
}: AchievementBadgesProps) {
  const earnedAchievements = achievements.filter((a) => a.earnedAt);
  const lockedAchievements = achievements.filter((a) => !a.earnedAt);
  const displayAchievements = showLocked
    ? achievements.slice(0, maxDisplay)
    : earnedAchievements.slice(0, maxDisplay);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          Achievements
        </h2>
        <span className="text-sm text-gray-500">
          {earnedAchievements.length} / {achievements.length} earned
        </span>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-3 gap-3">
        {displayAchievements.map((achievement) => (
          <AchievementBadge key={achievement.id} achievement={achievement} />
        ))}
      </div>

      {/* Recent Achievement Highlight */}
      {earnedAchievements.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Most Recent</p>
          <div className="flex items-center gap-3 p-2 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${categoryColors[earnedAchievements[0].category]} flex items-center justify-center text-white`}>
              {iconMap[earnedAchievements[0].icon] || <Star className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{earnedAchievements[0].title}</p>
              <p className="text-xs text-gray-500">{earnedAchievements[0].description}</p>
            </div>
          </div>
        </div>
      )}

      {/* View All Link */}
      {achievements.length > maxDisplay && (
        <button className="mt-4 w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          View All Achievements
        </button>
      )}
    </div>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const isEarned = !!achievement.earnedAt;
  const hasProgress = achievement.progress !== undefined && achievement.total !== undefined;

  return (
    <div
      className={`relative p-3 rounded-lg border text-center transition-all ${
        isEarned
          ? categoryBgColors[achievement.category]
          : 'bg-gray-100 border-gray-200 opacity-60'
      }`}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
          isEarned
            ? `bg-gradient-to-br ${categoryColors[achievement.category]} text-white`
            : 'bg-gray-300 text-gray-500'
        }`}
      >
        {iconMap[achievement.icon] || <Star className="w-5 h-5" />}
      </div>

      {/* Title */}
      <p className={`mt-2 text-xs font-medium ${isEarned ? 'text-gray-900' : 'text-gray-500'}`}>
        {achievement.title}
      </p>

      {/* Progress bar for locked achievements */}
      {!isEarned && hasProgress && (
        <div className="mt-2">
          <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-400 rounded-full"
              style={{ width: `${(achievement.progress! / achievement.total!) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {achievement.progress} / {achievement.total}
          </p>
        </div>
      )}

      {/* Earned indicator */}
      {isEarned && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
    </div>
  );
}

export default AchievementBadges;
