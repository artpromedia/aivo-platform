'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { GameCard } from './GameCard';
import { MemoryGame } from './MemoryGame';
import { MathRaceGame } from './MathRaceGame';
import { GAME_CATALOG, getGamesByGrade, type GameCatalogEntry } from './types';
import type { GameResult, GameDifficulty } from '@/lib/GameEngine';

interface GameProgress {
  gameId: string;
  highScore: number;
  stars: number;
  timesPlayed: number;
}

interface GamePickerProps {
  learnerId: string;
  grade?: number;
  subject?: string;
  onGameComplete?: (result: GameResult) => void;
  onBack?: () => void;
}

export function GamePicker({
  learnerId,
  grade = 3,
  subject,
  onGameComplete,
  onBack,
}: GamePickerProps) {
  const [games, setGames] = useState<GameCatalogEntry[]>([]);
  const [progress, setProgress] = useState<Record<string, GameProgress>>({});
  const [selectedGame, setSelectedGame] = useState<GameCatalogEntry | null>(null);
  const [category, setCategory] = useState<'all' | 'math' | 'ela' | 'focus'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Load games and progress
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Get games for grade level
      let filteredGames = getGamesByGrade(grade);

      // Filter by subject if provided
      if (subject) {
        filteredGames = filteredGames.filter(g =>
          g.subjects.includes(subject.toLowerCase())
        );
      }

      setGames(filteredGames);

      // Load progress
      const { data: progressData } = await supabase
        .from('game_high_scores')
        .select('game_id, score')
        .eq('learner_id', learnerId);

      const { data: sessionsData } = await supabase
        .from('game_sessions')
        .select('game_id, stars')
        .eq('learner_id', learnerId)
        .eq('state', 'complete');

      const progressMap: Record<string, GameProgress> = {};

      progressData?.forEach(p => {
        progressMap[p.game_id] = {
          gameId: p.game_id,
          highScore: p.score,
          stars: 0,
          timesPlayed: 0,
        };
      });

      sessionsData?.forEach(s => {
        if (progressMap[s.game_id]) {
          progressMap[s.game_id].stars = Math.max(progressMap[s.game_id].stars, s.stars || 0);
          progressMap[s.game_id].timesPlayed++;
        } else {
          progressMap[s.game_id] = {
            gameId: s.game_id,
            highScore: 0,
            stars: s.stars || 0,
            timesPlayed: 1,
          };
        }
      });

      setProgress(progressMap);
      setIsLoading(false);
    };

    loadData();
  }, [learnerId, grade, subject]);

  // Filter games by category
  const filteredGames = games.filter(game => {
    if (category === 'all') return true;
    if (category === 'math') return game.subjects.includes('math');
    if (category === 'ela') return game.subjects.includes('ela') || game.subjects.includes('spelling') || game.subjects.includes('vocabulary');
    if (category === 'focus') return game.subjects.includes('sel') || game.subjects.includes('wellness') || game.type === 'focus_breathing';
    return true;
  });

  // Handle game completion
  const handleGameComplete = (result: GameResult) => {
    onGameComplete?.(result);

    // Update local progress
    setProgress(prev => ({
      ...prev,
      [result.gameId]: {
        gameId: result.gameId,
        highScore: Math.max(prev[result.gameId]?.highScore || 0, result.score),
        stars: Math.max(prev[result.gameId]?.stars || 0, result.stars),
        timesPlayed: (prev[result.gameId]?.timesPlayed || 0) + 1,
      },
    }));
  };

  // Render selected game
  if (selectedGame) {
    const commonProps = {
      gameId: selectedGame.id,
      learnerId,
      difficulty: selectedGame.defaultDifficulty as GameDifficulty,
      onComplete: handleGameComplete,
      onExit: () => setSelectedGame(null),
    };

    switch (selectedGame.type) {
      case 'memory':
        return <MemoryGame {...commonProps} gridSize={4} />;
      case 'math_race':
        return <MathRaceGame {...commonProps} level={Math.ceil(grade / 2)} questionCount={10} />;
      // Add more game types here
      default:
        // Default to memory game for unimplemented types
        return <MemoryGame {...commonProps} gridSize={4} />;
    }
  }

  // Render loading
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="text-center">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="text-6xl inline-block"
          >
            🎮
          </motion.span>
          <p className="mt-4 text-gray-600">Loading games...</p>
        </div>
      </div>
    );
  }

  // Render game picker
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Game Zone</h1>
              <p className="text-gray-600">Pick a game and have fun learning!</p>
            </div>
          </div>
          <span className="text-5xl">🎮</span>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'All Games', emoji: '🎯' },
            { id: 'math', label: 'Math', emoji: '🔢' },
            { id: 'ela', label: 'Reading & Writing', emoji: '📚' },
            { id: 'focus', label: 'Focus & Calm', emoji: '🧘' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id as typeof category)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
                category === cat.id
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-purple-50'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Games grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGames.map((game, index) => {
            const gameProgress = progress[game.id];

            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GameCard
                  id={game.id}
                  type={game.type}
                  title={game.title}
                  description={game.description}
                  emoji={game.emoji}
                  difficulty={game.defaultDifficulty}
                  unlocked={true} // You can add unlock logic here
                  highScore={gameProgress?.highScore}
                  stars={gameProgress?.stars}
                  onClick={() => setSelectedGame(game)}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredGames.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🎮</span>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No games found</h3>
            <p className="text-gray-500">Try selecting a different category!</p>
          </div>
        )}

        {/* Stats bar */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {Object.keys(progress).length}
              </p>
              <p className="text-sm text-gray-500">Games Played</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">
                {Object.values(progress).reduce((sum, p) => sum + p.stars, 0)}
              </p>
              <p className="text-sm text-gray-500">Total Stars</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {Object.values(progress).reduce((sum, p) => sum + p.highScore, 0)}
              </p>
              <p className="text-sm text-gray-500">Total Points</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
