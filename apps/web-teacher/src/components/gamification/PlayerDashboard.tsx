/**
 * Player Dashboard Component
 *
 * Main gamification hub showing all player stats
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bell } from 'lucide-react';
import { LevelProgressRing } from './LevelProgressRing';
import { StreakCalendar } from './StreakCalendar';
import { DailyGoals } from './DailyGoals';
import { ChallengeCard } from './ChallengeCard';
import { AchievementCard } from './AchievementCard';
import { Leaderboard } from './Leaderboard';
import { useCelebration } from './CelebrationProvider';
import type {
  PlayerProfile,
  DailyProgress,
  Streak,
  StreakDay,
  Challenge,
  Achievement,
  LeaderboardEntry,
  GamificationNotification,
} from '@aivo/ts-types/gamification.types';

interface PlayerDashboardProps {
  profile: PlayerProfile;
  dailyProgress: DailyProgress;
  streak: Streak;
  streakCalendar: StreakDay[];
  challenges: Challenge[];
  recentAchievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  notifications?: GamificationNotification[];
  onNavigate?: (section: string) => void;
  onUseFreeze?: () => void;
  onEditGoals?: () => void;
}

export function PlayerDashboard({
  profile,
  dailyProgress,
  streak,
  streakCalendar,
  challenges,
  recentAchievements,
  leaderboard,
  notifications,
  onNavigate,
  onUseFreeze,
  onEditGoals,
}: PlayerDashboardProps) {
  const { celebrateLevelUp, celebrateAchievement, celebrateStreak } = useCelebration();

  // Handle real-time notifications
  useEffect(() => {
    if (!notifications?.length) return;

    for (const notification of notifications) {
      switch (notification.type) {
        case 'level_up':
          celebrateLevelUp(
            notification.data.newLevel as number,
            notification.data.levelName as string
          );
          break;
        case 'achievement_earned':
          celebrateAchievement(
            notification.data.title as string,
            notification.data.icon as string
          );
          break;
        case 'streak_milestone':
          celebrateStreak(notification.data.days as number);
          break;
      }
    }
  }, [notifications, celebrateLevelUp, celebrateAchievement, celebrateStreak]);

  const dailyChallenges = challenges.filter((c) => c.type === 'daily' && !c.completed);
  const weeklyChallenges = challenges.filter((c) => c.type === 'weekly' && !c.completed);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your Progress
          </h1>
          <p className="text-gray-500">
            Keep learning to level up and earn rewards!
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top row: Level + Daily Goals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Level card */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <LevelProgressRing
                level={profile.level}
                levelName={profile.levelName}
                progressPercent={profile.progressPercent}
                xpCurrent={profile.xpForCurrentLevel}
                xpNeeded={profile.xpToNextLevel}
                color={profile.levelColor}
                size="lg"
              />
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-bold text-amber-600">{profile.totalXP.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">Total XP</p>
                </div>
                {profile.rank && (
                  <div className="text-center">
                    <p className="font-bold text-blue-600">#{profile.rank}</p>
                    <p className="text-gray-500 text-xs">Class Rank</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Daily goals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <DailyGoals progress={dailyProgress} onEditGoals={onEditGoals} />
            </motion.div>
          </div>

          {/* Challenges */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Active Challenges
              </h3>
              <button
                onClick={() => onNavigate?.('challenges')}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                View All
              </button>
            </div>

            {dailyChallenges.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase text-gray-400 font-semibold mb-2">Daily</p>
                <div className="space-y-2">
                  {dailyChallenges.slice(0, 2).map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} compact />
                  ))}
                </div>
              </div>
            )}

            {weeklyChallenges.length > 0 && (
              <div>
                <p className="text-xs uppercase text-gray-400 font-semibold mb-2">Weekly</p>
                <div className="space-y-2">
                  {weeklyChallenges.slice(0, 2).map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} compact />
                  ))}
                </div>
              </div>
            )}

            {dailyChallenges.length === 0 && weeklyChallenges.length === 0 && (
              <p className="text-gray-400 text-center py-4">
                No active challenges. Check back tomorrow!
              </p>
            )}
          </motion.div>

          {/* Recent achievements */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Recent Achievements
              </h3>
              <button
                onClick={() => onNavigate?.('achievements')}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentAchievements.slice(0, 4).map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  onClick={() => onNavigate?.('achievements')}
                />
              ))}
            </div>

            {recentAchievements.length === 0 && (
              <p className="text-gray-400 text-center py-4">
                Keep learning to unlock achievements!
              </p>
            )}
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Streak */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <StreakCalendar
              days={streakCalendar}
              currentStreak={streak.current}
              longestStreak={streak.longest}
              freezesAvailable={streak.freezesAvailable}
              streakAtRisk={streak.streakAtRisk}
              onUseFreeze={onUseFreeze}
            />
          </motion.div>

          {/* Leaderboard preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Leaderboard
              entries={leaderboard.slice(0, 5)}
              currentPlayerId={profile.studentId}
              scope="class"
              period="weekly"
              showPodium={false}
              onScopeChange={() => onNavigate?.('leaderboard')}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default PlayerDashboard;
