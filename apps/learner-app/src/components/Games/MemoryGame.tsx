'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameEngine, generateMemoryItems, type GameResult } from '@/lib/GameEngine';
import type { MemoryGameProps } from './types';
import { GameScoreDisplay } from './GameScoreDisplay';
import { GameResults } from './GameResults';

interface Card {
  id: string;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export function MemoryGame({
  gameId,
  learnerId,
  difficulty,
  gridSize = 4,
  onComplete,
  onExit,
}: MemoryGameProps) {
  const [engine] = useState(() => new GameEngine());
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(5);
  const [moves, setMoves] = useState(0);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'complete'>('intro');
  const [result, setResult] = useState<GameResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Initialize game
  useEffect(() => {
    const pairCount = (gridSize * gridSize) / 2;
    const difficultyLevel = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
    const items = generateMemoryItems(pairCount * 2, difficultyLevel);

    const initialCards: Card[] = items.map(item => ({
      id: item.id,
      content: item.content as string,
      isFlipped: false,
      isMatched: false,
    }));

    setCards(initialCards);
  }, [gridSize, difficulty]);

  // Start game
  const startGame = async () => {
    await engine.startGame({
      id: gameId,
      type: 'memory',
      title: 'Memory Game',
      description: 'Match pairs of cards',
      difficulty,
      targetScore: 100,
    }, learnerId);

    engine.play();
    setGameState('playing');

    // Brief reveal at start
    setCards(prev => prev.map(card => ({ ...card, isFlipped: true })));
    setTimeout(() => {
      setCards(prev => prev.map(card => ({ ...card, isFlipped: false })));
    }, 2000);
  };

  // Handle card click
  const handleCardClick = useCallback((cardId: string) => {
    if (isChecking || flippedCards.length >= 2) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    // Flip the card
    setCards(prev =>
      prev.map(c => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );
    setFlippedCards(prev => [...prev, cardId]);
  }, [cards, flippedCards, isChecking]);

  // Check for match
  useEffect(() => {
    if (flippedCards.length !== 2) return;

    setIsChecking(true);
    setMoves(prev => prev + 1);

    const [first, second] = flippedCards;
    const firstCard = cards.find(c => c.id === first);
    const secondCard = cards.find(c => c.id === second);

    if (firstCard && secondCard && firstCard.content === secondCard.content) {
      // Match found!
      setTimeout(() => {
        setCards(prev =>
          prev.map(c =>
            c.id === first || c.id === second
              ? { ...c, isMatched: true }
              : c
          )
        );
        engine.submitAnswer(first, secondCard.content, true, 20);
        setScore(prev => prev + 20 + streak * 2);
        setStreak(prev => prev + 1);
        setFlippedCards([]);
        setIsChecking(false);
      }, 500);
    } else {
      // No match
      setTimeout(() => {
        setCards(prev =>
          prev.map(c =>
            c.id === first || c.id === second
              ? { ...c, isFlipped: false }
              : c
          )
        );
        engine.submitAnswer(first, secondCard?.content || '', false, 0);
        setStreak(0);
        setLives(prev => prev - 1);
        setFlippedCards([]);
        setIsChecking(false);
      }, 1000);
    }
  }, [flippedCards, cards, engine, streak]);

  // Check for game complete
  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      handleGameComplete('complete');
    } else if (lives <= 0) {
      handleGameComplete('failed');
    }
  }, [cards, lives]);

  const handleGameComplete = async (reason: 'complete' | 'failed') => {
    const gameResult = await engine.endGame(reason);
    setResult(gameResult);
    setGameState('complete');
    onComplete(gameResult);
  };

  // Render intro screen
  if (gameState === 'intro') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <span className="text-7xl mb-4 block">🧠</span>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Memory Game</h1>
          <p className="text-gray-600 mb-6">
            Match all the pairs to win! You have {lives} lives.
          </p>

          <div className="bg-purple-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-purple-800 mb-2">How to Play:</h3>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>Tap cards to flip them</li>
              <li>Find matching pairs</li>
              <li>Build streaks for bonus points!</li>
              <li>Watch out - wrong matches cost lives</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onExit}
              className="flex-1 py-3 px-6 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Start Game!
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Render results
  if (gameState === 'complete' && result) {
    return (
      <GameResults
        result={result}
        onPlayAgain={() => {
          setGameState('intro');
          setScore(0);
          setStreak(0);
          setLives(5);
          setMoves(0);
          setFlippedCards([]);
          setCards([]);
        }}
        onExit={onExit}
      />
    );
  }

  // Render game
  const gridCols = gridSize === 4 ? 'grid-cols-4' : gridSize === 6 ? 'grid-cols-6' : 'grid-cols-4';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-4">
        <GameScoreDisplay
          score={score}
          streak={streak}
          lives={lives}
        />
      </div>

      {/* Game grid */}
      <div className="max-w-lg mx-auto">
        <div className={`grid ${gridCols} gap-2 sm:gap-3`}>
          <AnimatePresence>
            {cards.map(card => (
              <motion.button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={card.isFlipped || card.isMatched || isChecking}
                initial={{ rotateY: 0 }}
                animate={{
                  rotateY: card.isFlipped || card.isMatched ? 180 : 0,
                  scale: card.isMatched ? 0.9 : 1,
                  opacity: card.isMatched ? 0.6 : 1,
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`aspect-square rounded-xl text-3xl sm:text-4xl flex items-center justify-center shadow-md transition-colors ${
                  card.isFlipped || card.isMatched
                    ? 'bg-white'
                    : 'bg-gradient-to-br from-purple-500 to-blue-500'
                } ${card.isMatched ? 'border-2 border-green-400' : ''}`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {card.isFlipped || card.isMatched ? (
                  <span style={{ transform: 'rotateY(180deg)' }}>{card.content}</span>
                ) : (
                  <span className="text-white text-2xl">?</span>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-lg mx-auto mt-6 flex justify-between items-center">
        <p className="text-gray-600">Moves: {moves}</p>
        <button
          onClick={onExit}
          className="px-4 py-2 text-gray-500 hover:text-gray-700"
        >
          Quit Game
        </button>
      </div>
    </div>
  );
}
