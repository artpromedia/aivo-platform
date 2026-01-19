'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NewAchievementPopupProps, Achievement } from './types';
import { RARITY_COLORS } from './types';

export function NewAchievementPopup({
  achievements,
  onClose,
}: NewAchievementPopupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentAchievement = achievements[currentIndex];

  // Auto-advance after delay (optional)
  useEffect(() => {
    if (achievements.length > 1) {
      const timer = setTimeout(() => {
        if (currentIndex < achievements.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, achievements.length]);

  const handleNext = () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  if (!currentAchievement) return null;

  const colors = RARITY_COLORS[currentAchievement.rarity];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleNext}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: 50 }}
        transition={{ type: 'spring', duration: 0.6 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden"
      >
        {/* Background glow */}
        <div className={`absolute inset-0 ${colors.bg} opacity-20`} />

        {/* Sparkles decoration */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: Math.random() * 200 - 100,
                y: Math.random() * 200 - 100,
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: Infinity,
              }}
              className="absolute top-1/2 left-1/2 text-yellow-400"
              style={{ fontSize: `${Math.random() * 10 + 10}px` }}
            >
              ✨
            </motion.span>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Achievement unlocked banner */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <span className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${colors.bg} ${colors.text}`}>
              🏆 Achievement Unlocked!
            </span>
          </motion.div>

          {/* Icon with animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.3, duration: 0.8 }}
            className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${colors.bg} mb-4 shadow-lg`}
          >
            <span className="text-5xl">{currentAchievement.icon}</span>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-bold text-gray-800 mb-2"
          >
            {currentAchievement.title}
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-600 mb-4"
          >
            {currentAchievement.description}
          </motion.p>

          {/* Rarity badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
            className="mb-4"
          >
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text} capitalize`}>
              {currentAchievement.rarity}
            </span>
          </motion.div>

          {/* Rewards */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center gap-6 mb-6"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-3xl font-bold text-purple-600"
              >
                +{currentAchievement.xpReward}
              </motion.div>
              <p className="text-sm text-gray-500">XP</p>
            </div>
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
                className="text-3xl font-bold text-yellow-500"
              >
                +{currentAchievement.coinReward}
              </motion.div>
              <p className="text-sm text-gray-500">Coins</p>
            </div>
          </motion.div>

          {/* Progress indicator for multiple achievements */}
          {achievements.length > 1 && (
            <div className="flex justify-center gap-2 mb-4">
              {achievements.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Action button */}
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            {currentIndex < achievements.length - 1 ? 'Next Achievement →' : 'Awesome! 🎉'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
