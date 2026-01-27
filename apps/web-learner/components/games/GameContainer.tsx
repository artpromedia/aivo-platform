'use client';

import * as React from 'react';
import { cn } from '@aivo/ui-web';

import type { GameConfig, GameResult } from './types';
import type { GameDefinition } from '../../lib/games/game-types';
import { getMockGames } from '../../lib/games/game-api';
import { GameSelector } from './GameSelector';
import { GameResults } from './GameResults';
import { useGameSession, useGameFavorites, useRecentlyPlayed } from './useGameSession';
import type { GradeBand } from './games-api';

// Game imports
import { ReactionTimeGame } from './games/ReactionTimeGame';
import { ShapeSorterGame } from './games/ShapeSorterGame';
import { WordScrambleGame } from './games/WordScrambleGame';
import { LogicPuzzleGame } from './games/LogicPuzzleGame';
import { SimonSaysGame } from './games/SimonSaysGame';

interface GameContainerProps {
  learnerId: string;
  gradeBand: GradeBand;
  onXPEarned?: (xp: number) => void;
  onCoinsEarned?: (coins: number) => void;
  onClose?: () => void;
  className?: string;
}

// Game component mapping
const GAME_COMPONENTS: Record<string, React.ComponentType<{
  config: GameConfig;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
  className?: string;
}>> = {
  'reaction-time': ReactionTimeGame,
  'shape-sorter': ShapeSorterGame,
  'word-scramble': WordScrambleGame,
  'logic-puzzle': LogicPuzzleGame,
  'simon-says': SimonSaysGame,
};

// Game titles for results display
const GAME_TITLES: Record<string, string> = {
  'reaction-time': 'Reaction Time',
  'shape-sorter': 'Shape Sorter',
  'word-scramble': 'Word Scramble',
  'logic-puzzle': 'Logic Puzzle',
  'simon-says': 'Simon Says',
};

export function GameContainer({
  learnerId,
  gradeBand,
  onXPEarned,
  onCoinsEarned,
  onClose,
  className,
}: GameContainerProps) {
  const [state, actions] = useGameSession({
    learnerId,
    gradeBand,
    onXPEarned,
    onCoinsEarned,
  });

  const { favorites } = useGameFavorites(learnerId);
  const { recentGames } = useRecentlyPlayed(learnerId);

  const [selectedDifficulty, setSelectedDifficulty] = React.useState<'easy' | 'medium' | 'hard'>('medium');

  const handleSelectGame = (game: GameDefinition) => {
    actions.selectGame(game.id);
  };

  const handleStartGame = () => {
    if (!state.selectedGame) return;

    const config: GameConfig = {
      gameId: state.selectedGame,
      difficulty: selectedDifficulty,
      gradeBand,
      timeLimit: selectedDifficulty === 'easy' ? 90 : selectedDifficulty === 'medium' ? 60 : 45,
    };

    void actions.startGame(config);
  };

  const handleCompleteGame = (result: GameResult) => {
    void actions.completeGame(result);
  };

  const handlePlayAgain = () => {
    if (state.selectedGame) {
      handleStartGame();
    }
  };

  const handleReturn = () => {
    actions.reset();
  };

  // Render based on current phase
  const renderContent = () => {
    switch (state.phase) {
      case 'selecting':
        return (
          <GameSelector
            games={getMockGames()}
            recommendedGameIds={Array.from(favorites)}
            onSelectGame={handleSelectGame}
          />
        );

      case 'preparing':
        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {GAME_TITLES[state.selectedGame || ''] || 'Select a Game'}
            </h2>

            {/* Difficulty selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Select Difficulty
              </label>
              <div className="flex gap-3">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={cn(
                      'flex-1 rounded-xl py-3 font-medium transition',
                      selectedDifficulty === diff
                        ? diff === 'easy'
                          ? 'bg-green-500 text-white'
                          : diff === 'medium'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-red-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Game info */}
            <div className="mb-6 rounded-xl bg-slate-50 p-4">
              <h3 className="font-medium text-slate-700 mb-2">About this game</h3>
              <p className="text-sm text-slate-600">
                {state.selectedGame === 'reaction-time' &&
                  'Test your reflexes by clicking as fast as you can when you see the green signal. Don\'t click too early!'}
                {state.selectedGame === 'shape-sorter' &&
                  'Sort falling shapes into the correct containers. The speed increases as you level up!'}
                {state.selectedGame === 'word-scramble' &&
                  'Unscramble letters to form words. Use hints if you get stuck. Age-appropriate words for your grade.'}
                {state.selectedGame === 'logic-puzzle' &&
                  'Find the pattern and predict what comes next. Take your time - there\'s no time pressure!'}
                {state.selectedGame === 'simon-says' &&
                  'Watch the color sequence and repeat it back. How long of a sequence can you remember?'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => actions.reset()}
                className="flex-1 rounded-xl border border-slate-300 py-3 font-medium text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleStartGame}
                disabled={state.isLoading}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 font-medium text-white shadow-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50"
              >
                {state.isLoading ? 'Starting...' : 'Start Game'}
              </button>
            </div>
          </div>
        );

      case 'playing': {
        const GameComponent = state.selectedGame ? GAME_COMPONENTS[state.selectedGame] : null;
        if (!GameComponent || !state.config) {
          return (
            <div className="rounded-2xl bg-red-50 p-6 text-center text-red-600">
              Game not found. Please try again.
            </div>
          );
        }
        return (
          <GameComponent
            config={state.config}
            onComplete={handleCompleteGame}
            onExit={actions.exitGame}
          />
        );
      }

      case 'completed':
        if (!state.result || !state.selectedGame) {
          return null;
        }
        return (
          <GameResults
            result={state.result}
            gameId={state.selectedGame}
            gameTitle={GAME_TITLES[state.selectedGame] || 'Game'}
            onPlayAgain={handlePlayAgain}
            onReturn={handleReturn}
            onRate={(helpful) => {
              console.log('Game rated:', helpful);
              // Could call api.rateGame here
            }}
          />
        );

      case 'error':
        return (
          <div className="rounded-2xl bg-red-50 p-6 text-center">
            <div className="text-4xl mb-4">😔</div>
            <h2 className="text-xl font-bold text-red-800 mb-2">Something went wrong</h2>
            <p className="text-red-600 mb-4">{state.error || 'An unexpected error occurred.'}</p>
            <button
              onClick={actions.reset}
              className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Close button (if onClose provided) */}
      {onClose && state.phase === 'selecting' && (
        <button
          onClick={onClose}
          className="absolute right-0 top-0 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          aria-label="Close games"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {renderContent()}
    </div>
  );
}
