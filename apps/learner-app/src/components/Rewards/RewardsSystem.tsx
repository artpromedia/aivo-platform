'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type { Achievement, LearnerRewards, RewardsSystemProps } from './types';
import { ACHIEVEMENT_DEFINITIONS, calculateLevel } from './types';
import { AchievementCard } from './AchievementCard';
import { LevelProgress } from './LevelProgress';
import { NewAchievementPopup } from './NewAchievementPopup';

export function RewardsSystem({
  learnerId,
  onAchievementUnlocked,
}: RewardsSystemProps) {
  const [rewards, setRewards] = useState<LearnerRewards | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [activeTab, setActiveTab] = useState<'achievements' | 'stats'>('achievements');
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Load rewards data
  useEffect(() => {
    loadRewards();
    subscribeToAchievements();
  }, [learnerId]);

  const loadRewards = async () => {
    setIsLoading(true);

    // Load learner rewards
    const { data: rewardsData } = await supabase
      .from('learner_rewards')
      .select('*')
      .eq('learner_id', learnerId)
      .single();

    // Load unlocked achievements
    const { data: unlockedData } = await supabase
      .from('learner_achievements')
      .select('achievement_id, unlocked_at')
      .eq('learner_id', learnerId);

    // Load achievement progress
    const { data: progressData } = await supabase
      .from('achievement_progress')
      .select('achievement_id, progress')
      .eq('learner_id', learnerId);

    // Combine with definitions
    const unlockedMap = new Map(
      unlockedData?.map(u => [u.achievement_id, u.unlocked_at]) || []
    );
    const progressMap = new Map(
      progressData?.map(p => [p.achievement_id, p.progress]) || []
    );

    const allAchievements: Achievement[] = ACHIEVEMENT_DEFINITIONS.map(def => ({
      ...def,
      unlockedAt: unlockedMap.get(def.id),
      progress: progressMap.get(def.id) || 0,
      progressTotal: def.threshold,
    }));

    setAchievements(allAchievements);

    // Set rewards with calculated level
    if (rewardsData) {
      const levelInfo = calculateLevel(rewardsData.xp || 0);
      setRewards({
        learnerId,
        xp: rewardsData.xp || 0,
        level: levelInfo.level,
        xpToNextLevel: levelInfo.xpToNext,
        coins: rewardsData.coins || 0,
        gems: rewardsData.gems || 0,
        currentStreak: rewardsData.current_streak || 0,
        longestStreak: rewardsData.longest_streak || 0,
        achievements: allAchievements.filter(a => a.unlockedAt),
        unlockedItems: rewardsData.unlocked_items || [],
      });
    } else {
      // Create default rewards record
      await supabase.from('learner_rewards').insert({
        learner_id: learnerId,
        xp: 0,
        coins: 0,
        gems: 0,
        current_streak: 0,
        longest_streak: 0,
        unlocked_items: [],
      });

      setRewards({
        learnerId,
        xp: 0,
        level: 1,
        xpToNextLevel: 100,
        coins: 0,
        gems: 0,
        currentStreak: 0,
        longestStreak: 0,
        achievements: [],
        unlockedItems: [],
      });
    }

    setIsLoading(false);
  };

  const subscribeToAchievements = () => {
    // Subscribe to new achievements
    const channel = supabase
      .channel(`achievements_${learnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'learner_achievements',
          filter: `learner_id=eq.${learnerId}`,
        },
        (payload) => {
          const achievementId = payload.new.achievement_id;
          const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
          if (achievement) {
            const unlockedAchievement = {
              ...achievement,
              unlockedAt: payload.new.unlocked_at,
            };
            setNewAchievements(prev => [...prev, unlockedAchievement]);
            onAchievementUnlocked?.(unlockedAchievement);
            celebrateAchievement();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const celebrateAchievement = async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#a855f7', '#3b82f6', '#10b981'],
      });
    } catch {
      // Confetti not available
    }
  };

  const handleCloseNewAchievements = () => {
    setNewAchievements([]);
    loadRewards(); // Refresh to show new achievements
  };

  // Filter achievements
  const filteredAchievements = achievements.filter(a => {
    if (filter === 'unlocked') return a.unlockedAt;
    if (filter === 'locked') return !a.unlockedAt && !a.isSecret;
    // 'all' - show unlocked and non-secret locked
    return a.unlockedAt || !a.isSecret;
  });

  // Group by category
  const groupedAchievements = filteredAchievements.reduce((groups, achievement) => {
    const category = achievement.category;
    if (!groups[category]) groups[category] = [];
    groups[category].push(achievement);
    return groups;
  }, {} as Record<string, Achievement[]>);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="text-center">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="text-6xl inline-block"
          >
            🏆
          </motion.span>
          <p className="mt-4 text-gray-600">Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with stats */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
                🏆 Your Achievements
              </h1>
              <p className="text-gray-600">Keep up the amazing work!</p>
            </div>

            {/* Stats summary */}
            <div className="flex gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-purple-600">
                  {rewards?.xp || 0}
                </div>
                <p className="text-sm text-gray-500">Total XP</p>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-yellow-600 flex items-center gap-1">
                  🪙 {rewards?.coins || 0}
                </div>
                <p className="text-sm text-gray-500">Coins</p>
              </div>
            </div>
          </div>

          {/* Level progress */}
          {rewards && (
            <div className="mt-6">
              <LevelProgress
                level={rewards.level}
                currentXp={rewards.xp % rewards.xpToNextLevel}
                xpToNextLevel={rewards.xpToNextLevel}
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'achievements'
                ? 'bg-purple-500 text-white'
                : 'bg-white text-gray-600 hover:bg-purple-50'
            }`}
          >
            🏅 Achievements
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-purple-500 text-white'
                : 'bg-white text-gray-600 hover:bg-purple-50'
            }`}
          >
            📊 Stats
          </button>
        </div>

        {activeTab === 'achievements' && (
          <>
            {/* Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {['all', 'unlocked', 'locked'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f as typeof filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === f
                      ? 'bg-purple-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-purple-50'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'unlocked' ? '✅ Unlocked' : '🔒 Locked'}
                </button>
              ))}
            </div>

            {/* Achievement categories */}
            {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
              <div key={category} className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4 capitalize flex items-center gap-2">
                  {category === 'learning' && '📚'}
                  {category === 'streak' && '🔥'}
                  {category === 'mastery' && '🎯'}
                  {category === 'exploration' && '🗺️'}
                  {category === 'social' && '👥'}
                  {category === 'special' && '✨'}
                  {category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AchievementCard
                        achievement={achievement}
                        showProgress={!achievement.unlockedAt}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'stats' && rewards && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Streak stats */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                🔥 Streak Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Streak</span>
                  <span className="font-bold text-orange-500">{rewards.currentStreak} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Longest Streak</span>
                  <span className="font-bold text-purple-500">{rewards.longestStreak} days</span>
                </div>
              </div>
            </div>

            {/* Achievement stats */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                🏅 Achievement Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Unlocked</span>
                  <span className="font-bold text-green-500">
                    {achievements.filter(a => a.unlockedAt).length}/{achievements.filter(a => !a.isSecret).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Secret Found</span>
                  <span className="font-bold text-purple-500">
                    {achievements.filter(a => a.isSecret && a.unlockedAt).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Currency stats */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                💰 Currency
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Coins</span>
                  <span className="font-bold text-yellow-500">🪙 {rewards.coins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gems</span>
                  <span className="font-bold text-blue-500">💎 {rewards.gems}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New achievement popup */}
      <AnimatePresence>
        {newAchievements.length > 0 && (
          <NewAchievementPopup
            achievements={newAchievements}
            onClose={handleCloseNewAchievements}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
