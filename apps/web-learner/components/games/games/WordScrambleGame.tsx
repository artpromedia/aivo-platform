'use client';

import * as React from 'react';
import { cn } from '@aivo/ui-web';

import type { BaseGameProps, GameMetrics, GameResult } from '../types';
import { WORD_BANKS } from '../types';

interface LetterTile {
  id: string;
  letter: string;
  originalIndex: number;
  currentIndex: number;
  isPlaced: boolean;
}

const TOTAL_WORDS = 5;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createLetterTiles(word: string): LetterTile[] {
  const tiles = word.split('').map((letter, index) => ({
    id: `${letter}-${index}-${Math.random()}`,
    letter,
    originalIndex: index,
    currentIndex: index,
    isPlaced: false,
  }));
  return shuffleArray(tiles);
}

function calculateStars(accuracy: number, avgTime: number): number {
  if (accuracy >= 90 && avgTime < 15000) return 3;
  if (accuracy >= 70) return 2;
  return 1;
}

export function WordScrambleGame({ config, onComplete, onExit, className }: BaseGameProps) {
  const wordBank = WORD_BANKS[config.gradeBand] || WORD_BANKS.G3_5;
  const [currentWordIndex, setCurrentWordIndex] = React.useState(0);
  const [words] = React.useState(() => shuffleArray(wordBank).slice(0, TOTAL_WORDS));
  const [tiles, setTiles] = React.useState<LetterTile[]>([]);
  const [placedTiles, setPlacedTiles] = React.useState<(LetterTile | null)[]>([]);
  const [selectedTile, setSelectedTile] = React.useState<LetterTile | null>(null);
  const [hintsUsed, setHintsUsed] = React.useState(0);
  const [showHint, setShowHint] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ message: string; correct: boolean } | null>(null);
  const [correctAnswers, setCorrectAnswers] = React.useState(0);
  const [totalAttempts, setTotalAttempts] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);
  const [showWordBank, setShowWordBank] = React.useState(config.gradeBand === 'K_2');
  const [timePerWord, setTimePerWord] = React.useState<number[]>([]);

  const startTimeRef = React.useRef<number>(Date.now());
  const wordStartTimeRef = React.useRef<number>(Date.now());

  const currentWord = words[currentWordIndex];

  // Initialize tiles when word changes
  React.useEffect(() => {
    if (currentWord) {
      setTiles(createLetterTiles(currentWord.word));
      setPlacedTiles(new Array(currentWord.word.length).fill(null));
      setSelectedTile(null);
      setShowHint(false);
      wordStartTimeRef.current = Date.now();
    }
  }, [currentWord]);

  const handleTileClick = (tile: LetterTile) => {
    if (tile.isPlaced) return;

    if (selectedTile?.id === tile.id) {
      setSelectedTile(null);
    } else {
      setSelectedTile(tile);
    }
  };

  const handleSlotClick = (slotIndex: number) => {
    if (!selectedTile) return;

    // If slot already has a tile, swap or return it
    if (placedTiles[slotIndex]) {
      const existingTile = placedTiles[slotIndex]!;
      setTiles((prev) =>
        prev.map((t) => (t.id === existingTile.id ? { ...t, isPlaced: false } : t))
      );
    }

    // Place the selected tile
    const newPlacedTiles = [...placedTiles];
    newPlacedTiles[slotIndex] = selectedTile;
    setPlacedTiles(newPlacedTiles);

    // Mark tile as placed
    setTiles((prev) =>
      prev.map((t) => (t.id === selectedTile.id ? { ...t, isPlaced: true } : t))
    );

    setSelectedTile(null);
  };

  const handlePlacedTileClick = (slotIndex: number) => {
    const tile = placedTiles[slotIndex];
    if (!tile) return;

    // Return tile to available tiles
    setTiles((prev) =>
      prev.map((t) => (t.id === tile.id ? { ...t, isPlaced: false } : t))
    );

    const newPlacedTiles = [...placedTiles];
    newPlacedTiles[slotIndex] = null;
    setPlacedTiles(newPlacedTiles);
  };

  const checkAnswer = () => {
    const answer = placedTiles.map((t) => t?.letter || '').join('');
    const isCorrect = answer === currentWord.word;

    const wordTime = Date.now() - wordStartTimeRef.current;
    setTimePerWord((prev) => [...prev, wordTime]);
    setTotalAttempts((prev) => prev + 1);

    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      const pointsEarned = Math.max(10, 50 - hintsUsed * 10);
      setScore((prev) => prev + pointsEarned);
      setFeedback({ message: 'Correct! Great job!', correct: true });

      setTimeout(() => {
        setFeedback(null);
        if (currentWordIndex + 1 >= TOTAL_WORDS) {
          setIsComplete(true);
        } else {
          setCurrentWordIndex((prev) => prev + 1);
        }
      }, 1500);
    } else {
      setFeedback({ message: 'Not quite, try again!', correct: false });
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const useHint = () => {
    if (hintsUsed >= 2) return;
    setHintsUsed((prev) => prev + 1);
    setShowHint(true);
  };

  const clearAll = () => {
    setTiles((prev) => prev.map((t) => ({ ...t, isPlaced: false })));
    setPlacedTiles(new Array(currentWord.word.length).fill(null));
    setSelectedTile(null);
  };

  // Complete game
  React.useEffect(() => {
    if (isComplete) {
      const accuracy = (correctAnswers / Math.max(1, totalAttempts)) * 100;
      const avgTime =
        timePerWord.length > 0
          ? timePerWord.reduce((a, b) => a + b, 0) / timePerWord.length
          : 0;

      const metrics: GameMetrics = {
        score,
        maxScore: TOTAL_WORDS * 50,
        correctAnswers,
        totalAttempts,
        averageResponseTime: Math.round(avgTime),
        duration: Math.round((Date.now() - startTimeRef.current) / 1000),
      };

      const stars = calculateStars(accuracy, avgTime);

      const result: GameResult = {
        completed: true,
        metrics,
        xpEarned: stars * 30 + score,
        coinsEarned: stars * 5 + Math.floor(score / 10),
        isPersonalBest: false,
        stars,
      };

      setTimeout(() => onComplete(result), 500);
    }
  }, [isComplete, correctAnswers, totalAttempts, score, timePerWord, onComplete]);

  const allPlaced = placedTiles.every((t) => t !== null);

  return (
    <div
      className={cn(
        'relative flex min-h-[600px] flex-col rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-6 text-white',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-white/20 px-4 py-2 font-mono">
            Word {currentWordIndex + 1}/{TOTAL_WORDS}
          </div>
          <div className="rounded-full bg-white/20 px-4 py-2 font-mono">
            Score: {score}
          </div>
        </div>

        <button
          onClick={onExit}
          className="rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30"
          aria-label="Exit game"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main game area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Hint display */}
        {showHint && (
          <div className="mb-4 rounded-xl bg-white/20 px-6 py-3">
            <p className="text-sm opacity-80">Hint: {currentWord.hint}</p>
            {hintsUsed >= 2 && (
              <p className="text-xs opacity-60 mt-1">
                First letter: {currentWord.word[0]}
              </p>
            )}
          </div>
        )}

        {/* Word bank for younger grades */}
        {showWordBank && (
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {words.map((w, i) => (
              <span
                key={i}
                className={cn(
                  'rounded-full px-3 py-1 text-sm',
                  i === currentWordIndex ? 'bg-white/30' : 'bg-white/10'
                )}
              >
                {w.word}
              </span>
            ))}
          </div>
        )}

        {/* Answer slots */}
        <div className="mb-8 flex gap-2">
          {placedTiles.map((tile, index) => (
            <div
              key={index}
              className={cn(
                'flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl text-2xl font-bold transition-all',
                tile
                  ? 'bg-white text-purple-600 hover:scale-105'
                  : selectedTile
                    ? 'border-2 border-dashed border-white bg-white/20 animate-pulse'
                    : 'border-2 border-dashed border-white/50 bg-white/10'
              )}
              onClick={() => { tile ? handlePlacedTileClick(index) : handleSlotClick(index); }}
            >
              {tile?.letter || ''}
            </div>
          ))}
        </div>

        {/* Available letter tiles */}
        <div className="flex flex-wrap justify-center gap-2 max-w-md">
          {tiles.map((tile) => (
            <button
              key={tile.id}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold transition-all',
                tile.isPlaced
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : selectedTile?.id === tile.id
                    ? 'bg-yellow-400 text-purple-600 scale-110 ring-4 ring-yellow-300'
                    : 'bg-white text-purple-600 hover:scale-105 hover:shadow-lg'
              )}
              onClick={() => handleTileClick(tile)}
              disabled={tile.isPlaced}
            >
              {tile.letter}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={cn(
              'mt-6 rounded-xl px-6 py-3 text-xl font-bold',
              feedback.correct ? 'bg-green-500' : 'bg-red-500'
            )}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={useHint}
          disabled={hintsUsed >= 2}
          className={cn(
            'rounded-xl px-6 py-3 font-medium transition-all',
            hintsUsed >= 2
              ? 'bg-white/10 text-white/50 cursor-not-allowed'
              : 'bg-white/20 hover:bg-white/30'
          )}
        >
          Hint ({2 - hintsUsed} left)
        </button>

        <button
          onClick={clearAll}
          className="rounded-xl bg-white/20 px-6 py-3 font-medium transition-all hover:bg-white/30"
        >
          Clear
        </button>

        <button
          onClick={checkAnswer}
          disabled={!allPlaced}
          className={cn(
            'rounded-xl px-6 py-3 font-medium transition-all',
            allPlaced
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-white/10 text-white/50 cursor-not-allowed'
          )}
        >
          Check Answer
        </button>
      </div>

      {/* Word bank toggle */}
      <button
        onClick={() => setShowWordBank(!showWordBank)}
        className="absolute bottom-4 right-4 text-xs opacity-60 hover:opacity-100"
      >
        {showWordBank ? 'Hide' : 'Show'} word bank
      </button>
    </div>
  );
}
