/**
 * MemoryMatchGame - Card matching memory game
 *
 * Features:
 * - Configurable card pairs (3-6 pairs)
 * - Multiple themes (shapes, colors, emojis, nature)
 * - Card flip animations
 * - Match detection
 * - Move counter
 * - Timer (optional)
 * - Celebration on completion
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { MemoryGameConfig } from '../../../lib/games/game-types';

export interface MemoryMatchGameProps {
  config: MemoryGameConfig;
  onComplete: (score: number, maxScore: number) => void;
  onProgress?: (progress: number) => void;
  isPaused?: boolean;
}

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// Theme content
const THEMES = {
  shapes: ['●', '■', '▲', '◆', '★', '♥', '♠', '♣'],
  colors: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪'],
  emojis: ['😀', '😎', '🥳', '😺', '🐶', '🦊', '🐸', '🦋'],
  nature: ['🌸', '🌻', '🌲', '🍀', '🌊', '☀️', '🌙', '⭐'],
};

// Card back colors for each theme
const THEME_COLORS = {
  shapes: 'bg-blue-500',
  colors: 'bg-purple-500',
  emojis: 'bg-pink-500',
  nature: 'bg-green-500',
};

export function MemoryMatchGame({
  config,
  onComplete,
  onProgress,
  isPaused = false,
}: MemoryMatchGameProps) {
  const { cardPairs, theme, revealTime } = config;

  // Generate cards
  const initialCards = useMemo(() => {
    const themeContent = THEMES[theme];
    const selectedSymbols = themeContent.slice(0, cardPairs);

    // Create pairs
    const cardValues = [...selectedSymbols, ...selectedSymbols];

    // Shuffle using Fisher-Yates
    for (let i = cardValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardValues[i], cardValues[j]] = [cardValues[j], cardValues[i]];
    }

    return cardValues.map((value, index) => ({
      id: index,
      value,
      isFlipped: false,
      isMatched: false,
    }));
  }, [cardPairs, theme]);

  // State
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Calculate grid columns based on total cards
  const totalCards = cardPairs * 2;
  const gridCols = useMemo(() => {
    if (totalCards <= 6) return 3;
    if (totalCards <= 8) return 4;
    return Math.min(4, Math.ceil(Math.sqrt(totalCards)));
  }, [totalCards]);

  // Handle card click
  const handleCardClick = useCallback((cardId: number) => {
    if (isPaused || isChecking || isComplete) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    // Don't allow more than 2 cards flipped
    if (flippedCards.length >= 2) return;

    // Flip the card
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, isFlipped: true } : c
      )
    );

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    // Check for match if two cards are flipped
    if (newFlippedCards.length === 2) {
      setMoves((m) => m + 1);
      setIsChecking(true);

      const [firstId, secondId] = newFlippedCards;
      const firstCard = cards.find((c) => c.id === firstId);
      const secondCard = cards.find((c) => c.id === secondId);

      if (firstCard && secondCard && firstCard.value === secondCard.value) {
        // Match found!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isMatched: true }
                : c
            )
          );
          setMatchedPairs((p) => p + 1);
          setFlippedCards([]);
          setIsChecking(false);
        }, 300);
      } else {
        // No match, flip back after reveal time
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
          setIsChecking(false);
        }, revealTime);
      }
    }
  }, [cards, flippedCards, isPaused, isChecking, isComplete, revealTime]);

  // Track progress
  useEffect(() => {
    const progress = matchedPairs / cardPairs;
    onProgress?.(progress);

    if (matchedPairs === cardPairs && !isComplete) {
      setIsComplete(true);
      setShowCelebration(true);

      // Calculate score based on moves (fewer moves = higher score)
      const perfectMoves = cardPairs;
      const maxScore = 100;
      const movePenalty = Math.max(0, (moves - perfectMoves) * 5);
      const score = Math.max(0, maxScore - movePenalty);

      // Delay completion callback to show celebration
      setTimeout(() => {
        onComplete(score, maxScore);
      }, 2000);
    }
  }, [matchedPairs, cardPairs, moves, isComplete, onComplete, onProgress]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isComplete) return;

      // Number keys 1-9 for selecting cards
      const num = parseInt(e.key);
      if (num >= 1 && num <= cards.length) {
        handleCardClick(num - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards, isPaused, isComplete, handleCardClick]);

  return (
    <div className="flex flex-col items-center p-4">
      {/* Stats */}
      <div className="flex gap-6 mb-4">
        <div className="text-center">
          <span className="text-sm text-gray-500">Moves</span>
          <p className="text-2xl font-bold text-gray-800">{moves}</p>
        </div>
        <div className="text-center">
          <span className="text-sm text-gray-500">Matched</span>
          <p className="text-2xl font-bold text-green-600">
            {matchedPairs}/{cardPairs}
          </p>
        </div>
      </div>

      {/* Card grid */}
      <div
        className="grid gap-3 p-4"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        }}
      >
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={isPaused || isChecking || card.isFlipped || card.isMatched}
            className={`
              relative w-16 h-20 md:w-20 md:h-24
              rounded-xl
              transform transition-all duration-300
              ${card.isFlipped || card.isMatched ? 'rotate-y-180' : ''}
              ${card.isMatched ? 'opacity-70 scale-95' : 'hover:scale-105'}
              ${isPaused ? 'cursor-not-allowed' : 'cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
            `}
            style={{
              perspective: '1000px',
              transformStyle: 'preserve-3d',
            }}
            aria-label={
              card.isFlipped || card.isMatched
                ? `Card ${card.id + 1}: ${card.value}`
                : `Card ${card.id + 1}: Face down`
            }
          >
            {/* Card back */}
            <div
              className={`
                absolute inset-0 rounded-xl
                ${THEME_COLORS[theme]}
                flex items-center justify-center
                shadow-md
                ${card.isFlipped || card.isMatched ? 'opacity-0' : 'opacity-100'}
                transition-opacity duration-150
              `}
            >
              <span className="text-2xl text-white/50">?</span>
            </div>

            {/* Card front */}
            <div
              className={`
                absolute inset-0 rounded-xl
                bg-white border-2 border-gray-200
                flex items-center justify-center
                shadow-md
                ${card.isFlipped || card.isMatched ? 'opacity-100' : 'opacity-0'}
                transition-opacity duration-150
                ${card.isMatched ? 'border-green-400 bg-green-50' : ''}
              `}
            >
              <span className="text-3xl md:text-4xl">{card.value}</span>
            </div>

            {/* Match indicator */}
            {card.isMatched && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl animate-bounce-in">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Amazing!
            </h2>
            <p className="text-gray-600">
              You matched all {cardPairs} pairs in {moves} moves!
            </p>
            {moves <= cardPairs + 2 && (
              <p className="text-green-600 font-medium mt-2">
                Excellent memory!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pause indicator */}
      {isPaused && !isComplete && (
        <div className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
          Game Paused
        </div>
      )}

      {/* Hint for keyboard users */}
      <p className="mt-4 text-xs text-gray-400">
        Tip: Use number keys 1-{cards.length} to select cards
      </p>
    </div>
  );
}

export default MemoryMatchGame;
