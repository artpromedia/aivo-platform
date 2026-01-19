'use client';

import { useState, useRef, useEffect } from 'react';
import { GameConfig, GameItem, GameResult } from './types';

interface Props {
  config: GameConfig;
  onComplete: (result: GameResult) => void;
}

export function InteractiveGame({ config, onComplete }: Props) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'complete'>('intro');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const startTimeRef = useRef(Date.now());
  const [timeRemaining, setTimeRemaining] = useState(config.timeLimit || 60);

  // Game-specific state
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [sortedItems, setSortedItems] = useState<Record<string, string[]>>({});
  const [flippedCards, setFlippedCards] = useState<string[]>([]);

  useEffect(() => {
    if (gameState !== 'playing' || !config.timeLimit) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, config.timeLimit]);

  const handleStartGame = () => {
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const handleGameEnd = () => {
    setGameState('complete');
    const timeSpent = Date.now() - startTimeRef.current;
    const totalItems = config.items.length;
    const accuracy = config.type === 'matching' || config.type === 'memory'
      ? (matchedPairs.length / (totalItems / 2)) * 100
      : (score / (totalItems * 10)) * 100;

    onComplete({
      completed: true,
      score,
      timeSpent,
      accuracy: Math.min(100, Math.round(accuracy)),
      streakBonus: maxStreak * 5,
    });
  };

  const handleCorrectMatch = () => {
    const points = 10 + (streak * 2);
    setScore(prev => prev + points);
    setStreak(prev => {
      const newStreak = prev + 1;
      setMaxStreak(current => Math.max(current, newStreak));
      return newStreak;
    });
  };

  const handleIncorrectMatch = () => {
    setStreak(0);
  };

  // Matching game logic
  const handleMatchingSelect = (itemId: string) => {
    if (matchedPairs.includes(itemId)) return;

    if (selectedItems.length === 0) {
      setSelectedItems([itemId]);
    } else if (selectedItems.length === 1) {
      const firstItem = config.items.find(i => i.id === selectedItems[0]);
      const secondItem = config.items.find(i => i.id === itemId);

      if (firstItem && secondItem && firstItem.matchId === secondItem.id) {
        // Match found
        setMatchedPairs(prev => [...prev, selectedItems[0], itemId]);
        handleCorrectMatch();

        // Check if game complete
        if (matchedPairs.length + 2 >= config.items.length) {
          setTimeout(handleGameEnd, 500);
        }
      } else {
        handleIncorrectMatch();
      }
      setSelectedItems([]);
    }
  };

  // Memory game logic
  const handleMemoryFlip = (itemId: string) => {
    if (flippedCards.includes(itemId) || matchedPairs.includes(itemId)) return;
    if (flippedCards.length >= 2) return;

    const newFlipped = [...flippedCards, itemId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      const firstItem = config.items.find(i => i.id === newFlipped[0]);
      const secondItem = config.items.find(i => i.id === newFlipped[1]);

      if (firstItem && secondItem && firstItem.matchId === secondItem.id) {
        // Match found
        setMatchedPairs(prev => [...prev, newFlipped[0], newFlipped[1]]);
        handleCorrectMatch();
        setFlippedCards([]);

        // Check if game complete
        if (matchedPairs.length + 2 >= config.items.length) {
          setTimeout(handleGameEnd, 500);
        }
      } else {
        // No match - flip back after delay
        handleIncorrectMatch();
        setTimeout(() => setFlippedCards([]), 1000);
      }
    }
  };

  // Sorting game logic
  const handleSortDrop = (itemId: string, category: string) => {
    const item = config.items.find(i => i.id === itemId);
    if (!item) return;

    if (item.category === category) {
      setSortedItems(prev => ({
        ...prev,
        [category]: [...(prev[category] || []), itemId],
      }));
      handleCorrectMatch();

      // Check if all items sorted
      const totalSorted = Object.values({ ...sortedItems, [category]: [...(sortedItems[category] || []), itemId] })
        .reduce((sum, arr) => sum + arr.length, 0);
      if (totalSorted >= config.items.length) {
        setTimeout(handleGameEnd, 500);
      }
    } else {
      handleIncorrectMatch();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Intro screen
  if (gameState === 'intro') {
    return (
      <div className="bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{config.title}</h2>
        <p className="text-gray-600 mb-6">{config.instructions}</p>

        <div className="flex justify-center gap-4 mb-6">
          <div className="px-4 py-2 bg-blue-100 rounded-lg">
            <span className="text-blue-700 font-medium">
              {config.items.length} Items
            </span>
          </div>
          {config.timeLimit && (
            <div className="px-4 py-2 bg-orange-100 rounded-lg">
              <span className="text-orange-700 font-medium">
                {formatTime(config.timeLimit)} Time Limit
              </span>
            </div>
          )}
          <div className="px-4 py-2 bg-purple-100 rounded-lg">
            <span className="text-purple-700 font-medium">
              Level {config.difficulty}
            </span>
          </div>
        </div>

        <button
          onClick={handleStartGame}
          className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-lg"
        >
          Start Game
        </button>
      </div>
    );
  }

  // Complete screen
  if (gameState === 'complete') {
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const totalScore = score + (maxStreak * 5);

    return (
      <div className="bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Game Complete!</h2>

        <div className="grid grid-cols-3 gap-4 my-8">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-3xl font-bold text-blue-600">{score}</div>
            <div className="text-sm text-gray-600">Base Score</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4">
            <div className="text-3xl font-bold text-orange-600">{maxStreak}</div>
            <div className="text-sm text-gray-600">Best Streak</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-3xl font-bold text-green-600">{totalScore}</div>
            <div className="text-sm text-gray-600">Total Score</div>
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          Completed in {formatTime(timeSpent)}
        </p>

        <button
          onClick={handleGameEnd}
          className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  // Playing state - render based on game type
  return (
    <div className="bg-white rounded-xl p-8 shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">{config.title}</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
            <span className="text-blue-700 font-medium">Score: {score}</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
              <span className="text-orange-700 font-medium">🔥 {streak}</span>
            </div>
          )}
          {config.timeLimit && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              timeRemaining <= 10 ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <span className={`font-mono font-medium ${
                timeRemaining <= 10 ? 'text-red-700' : 'text-gray-700'
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Matching Game */}
      {config.type === 'matching' && (
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-600 mb-2">Items</h4>
            {config.items
              .filter(item => !item.matchId?.startsWith('match-'))
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => handleMatchingSelect(item.id)}
                  disabled={matchedPairs.includes(item.id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    matchedPairs.includes(item.id)
                      ? 'bg-green-100 border-green-300 opacity-50'
                      : selectedItems.includes(item.id)
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {item.content}
                </button>
              ))}
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-gray-600 mb-2">Matches</h4>
            {config.items
              .filter(item => item.matchId?.startsWith('match-'))
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => handleMatchingSelect(item.id)}
                  disabled={matchedPairs.includes(item.id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    matchedPairs.includes(item.id)
                      ? 'bg-green-100 border-green-300 opacity-50'
                      : selectedItems.includes(item.id)
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {item.content}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Memory Game */}
      {config.type === 'memory' && (
        <div className="grid grid-cols-4 gap-4">
          {config.items.map(item => {
            const isFlipped = flippedCards.includes(item.id);
            const isMatched = matchedPairs.includes(item.id);

            return (
              <button
                key={item.id}
                onClick={() => handleMemoryFlip(item.id)}
                disabled={isMatched || flippedCards.length >= 2}
                className={`aspect-square rounded-xl text-2xl font-bold transition-all transform ${
                  isFlipped || isMatched
                    ? 'bg-white border-2 border-blue-300 rotate-0'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:scale-105'
                } ${isMatched ? 'opacity-50' : ''}`}
              >
                {isFlipped || isMatched ? item.content : '?'}
              </button>
            );
          })}
        </div>
      )}

      {/* Sorting Game */}
      {config.type === 'sorting' && (
        <div>
          <div className="mb-6">
            <h4 className="font-medium text-gray-600 mb-3">Drag items to the correct category:</h4>
            <div className="flex flex-wrap gap-2">
              {config.items
                .filter(item => !Object.values(sortedItems).flat().includes(item.id))
                .map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('itemId', item.id)}
                    className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg cursor-move hover:border-blue-300 hover:shadow-sm"
                  >
                    {item.content}
                  </div>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Array.from(new Set(config.items.map(i => i.category))).map(category => (
              <div
                key={category}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const itemId = e.dataTransfer.getData('itemId');
                  handleSortDrop(itemId, category!);
                }}
                className="p-4 bg-gray-100 rounded-xl min-h-[150px] border-2 border-dashed border-gray-300"
              >
                <h5 className="font-medium text-gray-700 mb-3">{category}</h5>
                <div className="flex flex-wrap gap-2">
                  {(sortedItems[category!] || []).map(itemId => {
                    const item = config.items.find(i => i.id === itemId);
                    return (
                      <span
                        key={itemId}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                      >
                        {item?.content}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Puzzle Game placeholder */}
      {config.type === 'puzzle' && (
        <div className="text-center py-12 text-gray-500">
          Puzzle game implementation coming soon!
        </div>
      )}
    </div>
  );
}

export default InteractiveGame;
