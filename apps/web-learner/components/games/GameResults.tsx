'use client';

import * as React from 'react';
import { cn } from '@aivo/ui-web';

import type { GameResultsProps } from './types';

const STAR_MESSAGES = [
  'Good try! Keep practicing!',
  'Well done! You\'re improving!',
  'Excellent! You\'re a star!',
];

const ACHIEVEMENT_ICONS: Record<string, string> = {
  'first-game': '🎮',
  'speed-demon': '⚡',
  'perfect-score': '💯',
  'streak-starter': '🔥',
  'brain-trainer': '🧠',
  'word-wizard': '📚',
  'pattern-master': '🎯',
  'memory-champion': '🏆',
};

export function GameResults({
  result,
  gameId,
  gameTitle,
  onPlayAgain,
  onReturn,
  onRate,
  className,
}: GameResultsProps) {
  const [hasRated, setHasRated] = React.useState(false);
  const [showConfetti, setShowConfetti] = React.useState(result.stars === 3);

  // Confetti effect for 3 stars
  React.useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const handleRate = (helpful: boolean) => {
    if (hasRated) return;
    setHasRated(true);
    onRate?.(helpful);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const accuracy =
    result.metrics.totalAttempts > 0
      ? Math.round((result.metrics.correctAnswers / result.metrics.totalAttempts) * 100)
      : 0;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white',
        className
      )}
    >
      {/* Confetti animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              {['🎉', '⭐', '🌟', '✨', '🎊'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">{gameTitle}</h2>
        <p className="text-lg opacity-90">
          {result.completed ? STAR_MESSAGES[result.stars - 1] : 'Game Over!'}
        </p>
      </div>

      {/* Stars */}
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3].map((star) => (
          <div
            key={star}
            className={cn(
              'text-5xl transition-all duration-500',
              star <= result.stars
                ? 'scale-100 opacity-100'
                : 'scale-75 opacity-30 grayscale'
            )}
            style={{
              animationDelay: `${star * 200}ms`,
            }}
          >
            {star <= result.stars ? '⭐' : '☆'}
          </div>
        ))}
      </div>

      {/* Personal Best Badge */}
      {result.isPersonalBest && (
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-yellow-900">
            <span className="text-xl">🏆</span>
            <span className="font-bold">New Personal Best!</span>
          </div>
        </div>
      )}

      {/* XP and Coins earned */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-white/10 p-4 text-center">
          <div className="text-3xl font-bold text-yellow-300">+{result.xpEarned}</div>
          <div className="text-sm opacity-80">XP Earned</div>
        </div>
        <div className="rounded-xl bg-white/10 p-4 text-center">
          <div className="text-3xl font-bold text-yellow-300">+{result.coinsEarned}</div>
          <div className="text-sm opacity-80">Coins Earned</div>
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-xl bg-white/10 p-4 mb-6">
        <h3 className="font-bold mb-3">Your Stats</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="opacity-80">Score</span>
            <span className="font-medium">
              {result.metrics.score}/{result.metrics.maxScore}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-80">Accuracy</span>
            <span className="font-medium">{accuracy}%</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-80">Time</span>
            <span className="font-medium">{formatDuration(result.metrics.duration)}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-80">Avg Response</span>
            <span className="font-medium">{result.metrics.averageResponseTime}ms</span>
          </div>
          {result.metrics.levelReached && (
            <div className="flex justify-between col-span-2">
              <span className="opacity-80">Level Reached</span>
              <span className="font-medium">{result.metrics.levelReached}</span>
            </div>
          )}
          {result.metrics.bestResponseTime && (
            <div className="flex justify-between col-span-2">
              <span className="opacity-80">Best Response</span>
              <span className="font-medium">{result.metrics.bestResponseTime}ms</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="opacity-80">Score Progress</span>
            <span>{Math.round((result.metrics.score / result.metrics.maxScore) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-1000"
              style={{ width: `${(result.metrics.score / result.metrics.maxScore) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Achievements Unlocked */}
      {result.achievementsUnlocked && result.achievementsUnlocked.length > 0 && (
        <div className="rounded-xl bg-white/10 p-4 mb-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <span>🏅</span> Achievements Unlocked!
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.achievementsUnlocked.map((achievement) => (
              <div
                key={achievement}
                className="flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-1 text-sm"
              >
                <span>{ACHIEVEMENT_ICONS[achievement] || '🎖️'}</span>
                <span className="capitalize">{achievement.replace(/-/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating */}
      {onRate && (
        <div className="rounded-xl bg-white/10 p-4 mb-6">
          <h3 className="font-bold mb-2">Was this game helpful?</h3>
          {hasRated ? (
            <p className="text-sm opacity-80">Thanks for your feedback!</p>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleRate(true)}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-500/30 py-2 transition hover:bg-green-500/50"
              >
                <span>👍</span> Yes
              </button>
              <button
                onClick={() => handleRate(false)}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-500/30 py-2 transition hover:bg-red-500/50"
              >
                <span>👎</span> Not really
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded-xl bg-white py-3 font-bold text-indigo-600 shadow-lg transition hover:bg-white/90"
        >
          Play Again
        </button>
        <button
          onClick={onReturn}
          className="flex-1 rounded-xl bg-white/20 py-3 font-bold transition hover:bg-white/30"
        >
          Return to Learning
        </button>
      </div>

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
