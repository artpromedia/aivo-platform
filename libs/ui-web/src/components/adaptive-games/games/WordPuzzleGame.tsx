'use client';

import { useState, useCallback, useEffect } from 'react';

import { cn } from '../../../utils/cn';
import { Button } from '../../button';
import { Card } from '../../card';
import type { GeneratedGame } from '../GameGenerator';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface WordPuzzleGameProps {
  game: GeneratedGame;
  apiEndpoint: string;
  sessionId: string;
  onAttempt: (isCorrect: boolean, responseTime: number) => void;
  onHintRequest: () => void;
  onScoreUpdate: (points: number) => void;
  onComplete: () => void;
}

interface WordSearchData {
  words: string[];
  grid: string[][];
  solutions: Array<{
    word: string;
    start: [number, number];
    direction: string;
  }>;
  hints: string[];
}

interface AnagramData {
  anagrams: Array<{
    scrambled: string;
    answer: string;
    hint: string;
    category?: string;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function WordPuzzleGame({
  game,
  apiEndpoint,
  sessionId,
  onAttempt,
  onHintRequest,
  onScoreUpdate,
  onComplete,
}: WordPuzzleGameProps) {
  const gameType = game.gameType;

  if (gameType === 'word_search') {
    return (
      <WordSearchGame
        data={game.gameData as unknown as WordSearchData}
        apiEndpoint={apiEndpoint}
        sessionId={sessionId}
        onAttempt={onAttempt}
        onHintRequest={onHintRequest}
        onScoreUpdate={onScoreUpdate}
        onComplete={onComplete}
      />
    );
  }

  if (gameType === 'anagram') {
    return (
      <AnagramGame
        data={game.gameData as unknown as AnagramData}
        apiEndpoint={apiEndpoint}
        sessionId={sessionId}
        onAttempt={onAttempt}
        onHintRequest={onHintRequest}
        onScoreUpdate={onScoreUpdate}
        onComplete={onComplete}
      />
    );
  }

  return (
    <Card>
      <div className="py-8 text-center text-muted">
        <p>Word puzzle type not yet implemented: {gameType}</p>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// WORD SEARCH IMPLEMENTATION
// ────────────────────────────────────────────────────────────────────────────

interface WordSearchGameProps {
  data: WordSearchData;
  apiEndpoint: string;
  sessionId: string;
  onAttempt: (isCorrect: boolean, responseTime: number) => void;
  onHintRequest: () => void;
  onScoreUpdate: (points: number) => void;
  onComplete: () => void;
}

function WordSearchGame({
  data,
  apiEndpoint,
  sessionId,
  onAttempt,
  onHintRequest,
  onScoreUpdate,
  onComplete,
}: WordSearchGameProps) {
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Array<[number, number]>>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [highlightedCells, setHighlightedCells] = useState<Map<string, string>>(new Map());
  const [currentHint, setCurrentHint] = useState<string>('');
  const [attemptStartTime, setAttemptStartTime] = useState<number>(Date.now());

  const words = data.words || [];
  const grid = data.grid || [];

  useEffect(() => {
    if (foundWords.size === words.length && words.length > 0) {
      onComplete();
    }
  }, [foundWords, words, onComplete]);

  const handleCellMouseDown = useCallback(
    (row: number, col: number) => {
      setIsSelecting(true);
      setSelectedCells([[row, col]]);
      setAttemptStartTime(Date.now());
    },
    []
  );

  const handleCellMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isSelecting) {
        setSelectedCells((prev) => [...prev, [row, col]]);
      }
    },
    [isSelecting]
  );

  const handleCellMouseUp = useCallback(() => {
    if (!isSelecting) return;
    setIsSelecting(false);

    // Check if selected cells form a word
    const selectedWord = selectedCells
      .map(([r, c]) => grid[r]?.[c])
      .join('')
      .toUpperCase();

    const responseTime = Date.now() - attemptStartTime;

    if (words.includes(selectedWord) && !foundWords.has(selectedWord)) {
      // Found a new word!
      setFoundWords((prev) => new Set([...prev, selectedWord]));
      onScoreUpdate(10);
      onAttempt(true, responseTime);

      // Highlight the found word
      const color = getWordColor(foundWords.size);
      selectedCells.forEach(([r, c]) => {
        setHighlightedCells((prev) => new Map(prev).set(`${r},${c}`, color));
      });
    } else if (selectedCells.length > 1) {
      onAttempt(false, responseTime);
    }

    setSelectedCells([]);
  }, [
    isSelecting,
    selectedCells,
    grid,
    words,
    foundWords,
    onScoreUpdate,
    onAttempt,
    attemptStartTime,
  ]);

  const handleRequestHint = useCallback(async () => {
    onHintRequest();

    // Find a word that hasn't been found yet
    const remainingWords = words.filter((w) => !foundWords.has(w));
    if (remainingWords.length === 0) return;

    const randomWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
    const hintIndex = words.indexOf(randomWord);

    try {
      const response = await fetch(`${apiEndpoint}/hint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameType: 'word_search',
          currentProblem: `Find the word: ${randomWord}`,
          solution: randomWord,
          playerAttempts: Array.from(foundWords),
          hintLevel: 1,
        }),
      });

      if (response.ok) {
        const hintData = await response.json();
        setCurrentHint(hintData.hint.hint || data.hints?.[hintIndex] || `Look for: ${randomWord}`);
      }
    } catch (error) {
      setCurrentHint(data.hints?.[hintIndex] || `Try finding: ${randomWord}`);
    }
  }, [apiEndpoint, words, foundWords, data.hints, onHintRequest]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">
                Found {foundWords.size} / {words.length} words
              </p>
              <div className="mt-1 h-2 w-48 rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(foundWords.size / words.length) * 100}%` }}
                />
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleRequestHint}>
              <LightBulbIcon className="h-4 w-4" />
              Hint
            </Button>
          </div>

          {/* Hint Display */}
          {currentHint && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              <div className="flex items-start gap-2">
                <LightBulbIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{currentHint}</span>
              </div>
            </div>
          )}

          {/* Word Grid */}
          <div
            className="inline-block select-none"
            onMouseUp={handleCellMouseUp}
            onMouseLeave={handleCellMouseUp}
          >
            <div className="grid gap-1">
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {row.map((cell, colIndex) => {
                    const cellKey = `${rowIndex},${colIndex}`;
                    const isSelected = selectedCells.some(([r, c]) => r === rowIndex && c === colIndex);
                    const highlightColor = highlightedCells.get(cellKey);

                    return (
                      <div
                        key={cellKey}
                        className={cn(
                          'flex h-10 w-10 cursor-pointer items-center justify-center rounded border-2 text-sm font-bold uppercase transition-all',
                          isSelected && 'border-primary bg-primary/20',
                          highlightColor && `bg-${highlightColor}-100 border-${highlightColor}-300`,
                          !isSelected && !highlightColor && 'border-border bg-surface hover:bg-surface-muted'
                        )}
                        onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                        onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                      >
                        {cell}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Word List */}
          <div>
            <p className="mb-2 text-sm font-medium text-text">Words to Find:</p>
            <div className="flex flex-wrap gap-2">
              {words.map((word) => (
                <div
                  key={word}
                  className={cn(
                    'rounded-full px-3 py-1 text-sm',
                    foundWords.has(word)
                      ? 'bg-green-100 text-green-700 line-through dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-surface-muted text-muted'
                  )}
                >
                  {word}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ANAGRAM IMPLEMENTATION
// ────────────────────────────────────────────────────────────────────────────

interface AnagramGameProps {
  data: AnagramData;
  apiEndpoint: string;
  sessionId: string;
  onAttempt: (isCorrect: boolean, responseTime: number) => void;
  onHintRequest: () => void;
  onScoreUpdate: (points: number) => void;
  onComplete: () => void;
}

function AnagramGame({
  data,
  apiEndpoint,
  sessionId,
  onAttempt,
  onHintRequest,
  onScoreUpdate,
  onComplete,
}: AnagramGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentHint, setCurrentHint] = useState('');
  const [attemptStartTime, setAttemptStartTime] = useState<number>(Date.now());
  const [score, setScore] = useState(0);

  const anagrams = data.anagrams || [];
  const currentAnagram = anagrams[currentIndex];

  useEffect(() => {
    setAttemptStartTime(Date.now());
  }, [currentIndex]);

  const handleSubmit = useCallback(() => {
    if (!userAnswer.trim()) return;

    const responseTime = Date.now() - attemptStartTime;
    const isCorrect = userAnswer.trim().toUpperCase() === currentAnagram.answer.toUpperCase();

    onAttempt(isCorrect, responseTime);

    if (isCorrect) {
      setFeedback({ message: 'Correct! Great job!', type: 'success' });
      const points = 5;
      setScore((prev) => prev + points);
      onScoreUpdate(points);

      setTimeout(() => {
        setFeedback(null);
        setUserAnswer('');
        setCurrentHint('');

        if (currentIndex < anagrams.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          onComplete();
        }
      }, 1500);
    } else {
      setFeedback({ message: 'Not quite. Try again!', type: 'error' });
    }
  }, [userAnswer, currentAnagram, currentIndex, anagrams.length, onAttempt, onScoreUpdate, onComplete, attemptStartTime]);

  const handleSkip = useCallback(() => {
    setUserAnswer('');
    setCurrentHint('');
    setFeedback(null);

    if (currentIndex < anagrams.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  }, [currentIndex, anagrams.length, onComplete]);

  const handleRequestHint = useCallback(() => {
    onHintRequest();
    setCurrentHint(currentAnagram.hint || `This word is related to ${currentAnagram.category || 'general knowledge'}`);
  }, [currentAnagram, onHintRequest]);

  if (!currentAnagram) {
    return null;
  }

  return (
    <Card>
      <div className="space-y-6">
        {/* Progress */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text">
              Anagram {currentIndex + 1} / {anagrams.length}
            </p>
            <p className="text-sm text-muted">Score: {score}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip
          </Button>
        </div>

        {/* Scrambled Letters */}
        <div className="text-center">
          <p className="mb-4 text-sm text-muted">Unscramble these letters:</p>
          <div className="flex justify-center gap-2">
            {currentAnagram.scrambled.split('').map((letter, index) => (
              <div
                key={index}
                className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-primary bg-primary/10 text-2xl font-bold uppercase text-primary"
              >
                {letter}
              </div>
            ))}
          </div>
        </div>

        {/* Hint */}
        {currentHint && (
          <div className="rounded-lg bg-blue-50 p-3 text-center text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <LightBulbIcon className="inline h-4 w-4" /> {currentHint}
          </div>
        )}

        {/* Answer Input */}
        <div className="space-y-3">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Type your answer..."
            className="form-input w-full text-center text-lg uppercase"
            autoFocus
          />

          {/* Feedback */}
          {feedback && (
            <div
              className={cn(
                'rounded-lg p-3 text-center font-medium',
                feedback.type === 'success'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              )}
            >
              {feedback.message}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={handleRequestHint}>
              <LightBulbIcon className="h-4 w-4" />
              Hint
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleSubmit} disabled={!userAnswer.trim()}>
              Submit
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ────────────────────────────────────────────────────────────────────────────

function getWordColor(index: number): string {
  const colors = ['green', 'blue', 'purple', 'pink', 'yellow', 'orange'];
  return colors[index % colors.length];
}

// ────────────────────────────────────────────────────────────────────────────
// ICONS
// ────────────────────────────────────────────────────────────────────────────

function LightBulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}
