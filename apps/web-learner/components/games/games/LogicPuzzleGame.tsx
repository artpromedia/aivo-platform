'use client';

import * as React from 'react';
import { cn } from '@aivo/ui-web';

import type { BaseGameProps, GameMetrics, GameResult } from '../types';

type PatternType = 'number' | 'shape' | 'color' | 'rotation' | 'size';
type ShapeIcon = '●' | '■' | '▲' | '★' | '◆' | '⬟';
type ColorClass = 'text-red-500' | 'text-blue-500' | 'text-green-500' | 'text-yellow-500' | 'text-purple-500';

interface PuzzleItem {
  shape: ShapeIcon;
  color: ColorClass;
  size: 'small' | 'medium' | 'large';
  rotation: number;
  number?: number;
}

interface Puzzle {
  type: PatternType;
  sequence: PuzzleItem[];
  answer: PuzzleItem;
  options: PuzzleItem[];
  hint: string;
}

const SHAPES: ShapeIcon[] = ['●', '■', '▲', '★', '◆', '⬟'];
const COLORS: ColorClass[] = ['text-red-500', 'text-blue-500', 'text-green-500', 'text-yellow-500', 'text-purple-500'];
const SIZES: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
const _ROTATIONS = [0, 90, 180, 270];

const TOTAL_PUZZLES = 5;

function _generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createItem(overrides: Partial<PuzzleItem> = {}): PuzzleItem {
  return {
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 'medium',
    rotation: 0,
    ...overrides,
  };
}

function generateNumberPattern(difficulty: string): Puzzle {
  const isHard = difficulty === 'hard';
  const isMedium = difficulty === 'medium';

  // Different sequence types
  const patterns = [
    // Add 2
    { start: 2, step: 2, hint: 'Add 2 each time' },
    // Add 3
    { start: 1, step: 3, hint: 'Add 3 each time' },
    // Add 5
    { start: 5, step: 5, hint: 'Add 5 each time' },
    // Multiply by 2
    ...(isMedium || isHard ? [{ start: 1, multiply: 2, hint: 'Double each time' }] : []),
    // Fibonacci-like
    ...(isHard ? [{ fib: true, hint: 'Add the previous two numbers' }] : []),
  ];

  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const sequenceLength = isHard ? 5 : 4;
  const numbers: number[] = [];

  if (pattern.fib) {
    numbers.push(1, 1);
    for (let i = 2; i <= sequenceLength; i++) {
      numbers.push(numbers[i - 1] + numbers[i - 2]);
    }
  } else if (pattern.multiply) {
    let val = pattern.start;
    for (let i = 0; i <= sequenceLength; i++) {
      numbers.push(val);
      val *= pattern.multiply;
    }
  } else {
    for (let i = 0; i <= sequenceLength; i++) {
      numbers.push(pattern.start + i * pattern.step);
    }
  }

  const answer = numbers[numbers.length - 1];
  const sequence = numbers.slice(0, -1);

  // Create visual items
  const baseItem = createItem();
  const sequenceItems = sequence.map(n => ({ ...baseItem, number: n }));
  const answerItem = { ...baseItem, number: answer };

  // Generate wrong options
  const wrongOptions = [
    { ...baseItem, number: answer + 1 },
    { ...baseItem, number: answer - 1 },
    { ...baseItem, number: answer + 2 },
  ];

  const options = [answerItem, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);

  return {
    type: 'number',
    sequence: sequenceItems,
    answer: answerItem,
    options,
    hint: pattern.hint,
  };
}

function generateShapePattern(difficulty: string): Puzzle {
  const isHard = difficulty === 'hard';
  const sequenceLength = isHard ? 5 : 4;
  const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  // Rotating through shapes
  const startIdx = Math.floor(Math.random() * (SHAPES.length - sequenceLength - 1));
  const sequence: PuzzleItem[] = [];
  for (let i = 0; i < sequenceLength; i++) {
    sequence.push({
      shape: SHAPES[(startIdx + i) % SHAPES.length],
      color: baseColor,
      size: 'medium',
      rotation: 0,
    });
  }

  const answer: PuzzleItem = {
    shape: SHAPES[(startIdx + sequenceLength) % SHAPES.length],
    color: baseColor,
    size: 'medium',
    rotation: 0,
  };

  // Wrong options with different shapes
  const usedShapes = new Set(sequence.map(s => s.shape));
  usedShapes.add(answer.shape);
  const wrongShapes = SHAPES.filter(s => !usedShapes.has(s));

  const options: PuzzleItem[] = [
    answer,
    ...wrongShapes.slice(0, 3).map(shape => ({
      shape,
      color: baseColor,
      size: 'medium' as const,
      rotation: 0,
    })),
  ].sort(() => Math.random() - 0.5);

  return {
    type: 'shape',
    sequence,
    answer,
    options,
    hint: 'Follow the shape sequence',
  };
}

function generateColorPattern(difficulty: string): Puzzle {
  const isHard = difficulty === 'hard';
  const sequenceLength = isHard ? 5 : 4;
  const baseShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

  // Rotating through colors
  const startIdx = Math.floor(Math.random() * (COLORS.length - sequenceLength - 1));
  const sequence: PuzzleItem[] = [];
  for (let i = 0; i < sequenceLength; i++) {
    sequence.push({
      shape: baseShape,
      color: COLORS[(startIdx + i) % COLORS.length],
      size: 'medium',
      rotation: 0,
    });
  }

  const answer: PuzzleItem = {
    shape: baseShape,
    color: COLORS[(startIdx + sequenceLength) % COLORS.length],
    size: 'medium',
    rotation: 0,
  };

  // Wrong options with different colors
  const usedColors = new Set(sequence.map(s => s.color));
  usedColors.add(answer.color);
  const wrongColors = COLORS.filter(c => !usedColors.has(c));

  const options: PuzzleItem[] = [
    answer,
    ...wrongColors.slice(0, 3).map(color => ({
      shape: baseShape,
      color,
      size: 'medium' as const,
      rotation: 0,
    })),
  ].sort(() => Math.random() - 0.5);

  return {
    type: 'color',
    sequence,
    answer,
    options,
    hint: 'Follow the color pattern',
  };
}

function generateSizePattern(): Puzzle {
  const baseShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  // Size progression: small -> medium -> large -> small...
  const sizeSequence: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large', 'small'];
  const sequence: PuzzleItem[] = sizeSequence.map(size => ({
    shape: baseShape,
    color: baseColor,
    size,
    rotation: 0,
  }));

  const answer: PuzzleItem = {
    shape: baseShape,
    color: baseColor,
    size: 'medium', // Next in sequence
    rotation: 0,
  };

  const options: PuzzleItem[] = SIZES.map(size => ({
    shape: baseShape,
    color: baseColor,
    size,
    rotation: 0,
  }));
  options.push({
    shape: baseShape,
    color: baseColor,
    size: 'large',
    rotation: 0,
  });

  return {
    type: 'size',
    sequence,
    answer,
    options: options.sort(() => Math.random() - 0.5).slice(0, 4),
    hint: 'Watch how the size changes',
  };
}

function generatePuzzle(difficulty: string): Puzzle {
  const patternTypes: PatternType[] = ['number', 'shape', 'color'];
  if (difficulty === 'medium' || difficulty === 'hard') {
    patternTypes.push('size');
  }

  const type = patternTypes[Math.floor(Math.random() * patternTypes.length)];

  switch (type) {
    case 'number':
      return generateNumberPattern(difficulty);
    case 'shape':
      return generateShapePattern(difficulty);
    case 'color':
      return generateColorPattern(difficulty);
    case 'size':
      return generateSizePattern();
    default:
      return generateNumberPattern(difficulty);
  }
}

function calculateStars(accuracy: number): number {
  if (accuracy >= 90) return 3;
  if (accuracy >= 70) return 2;
  return 1;
}

function getSizeClass(size: 'small' | 'medium' | 'large'): string {
  switch (size) {
    case 'small':
      return 'text-2xl';
    case 'medium':
      return 'text-4xl';
    case 'large':
      return 'text-6xl';
  }
}

export function LogicPuzzleGame({ config, onComplete, onExit, className }: BaseGameProps) {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = React.useState(0);
  const [puzzles] = React.useState(() =>
    Array.from({ length: TOTAL_PUZZLES }, () => generatePuzzle(config.difficulty))
  );
  const [selectedOption, setSelectedOption] = React.useState<number | null>(null);
  const [showHint, setShowHint] = React.useState(false);
  const [hintsUsed, setHintsUsed] = React.useState(0);
  const [feedback, setFeedback] = React.useState<{ message: string; correct: boolean } | null>(null);
  const [correctAnswers, setCorrectAnswers] = React.useState(0);
  const [totalAttempts, setTotalAttempts] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);
  const [responseTimes, setResponseTimes] = React.useState<number[]>([]);

  const startTimeRef = React.useRef<number>(Date.now());
  const puzzleStartTimeRef = React.useRef<number>(Date.now());

  const currentPuzzle = puzzles[currentPuzzleIndex];

  // Reset for new puzzle
  React.useEffect(() => {
    setSelectedOption(null);
    setShowHint(false);
    puzzleStartTimeRef.current = Date.now();
  }, [currentPuzzleIndex]);

  const checkAnswer = () => {
    if (selectedOption === null) return;

    const selectedItem = currentPuzzle.options[selectedOption];
    const isCorrect = JSON.stringify(selectedItem) === JSON.stringify(currentPuzzle.answer);

    const responseTime = Date.now() - puzzleStartTimeRef.current;
    setResponseTimes((prev) => [...prev, responseTime]);
    setTotalAttempts((prev) => prev + 1);

    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      const pointsEarned = Math.max(10, 50 - hintsUsed * 15);
      setScore((prev) => prev + pointsEarned);
      setFeedback({ message: 'Excellent thinking!', correct: true });

      setTimeout(() => {
        setFeedback(null);
        if (currentPuzzleIndex + 1 >= TOTAL_PUZZLES) {
          setIsComplete(true);
        } else {
          setCurrentPuzzleIndex((prev) => prev + 1);
          setHintsUsed(0);
        }
      }, 1500);
    } else {
      setFeedback({ message: 'Think again...', correct: false });
      setSelectedOption(null);
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const useHint = () => {
    if (hintsUsed >= 1) return;
    setHintsUsed((prev) => prev + 1);
    setShowHint(true);
  };

  // Complete game
  React.useEffect(() => {
    if (isComplete) {
      const accuracy = (correctAnswers / Math.max(1, totalAttempts)) * 100;
      const avgTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

      const metrics: GameMetrics = {
        score,
        maxScore: TOTAL_PUZZLES * 50,
        correctAnswers,
        totalAttempts,
        averageResponseTime: Math.round(avgTime),
        duration: Math.round((Date.now() - startTimeRef.current) / 1000),
      };

      const stars = calculateStars(accuracy);

      const result: GameResult = {
        completed: true,
        metrics,
        xpEarned: stars * 35 + score,
        coinsEarned: stars * 6 + Math.floor(score / 10),
        isPersonalBest: false,
        stars,
      };

      setTimeout(() => onComplete(result), 500);
    }
  }, [isComplete, correctAnswers, totalAttempts, score, responseTimes, onComplete]);

  const renderItem = (item: PuzzleItem, size?: 'option') => {
    const sizeClass = size === 'option' ? 'text-3xl' : getSizeClass(item.size);
    return (
      <span
        className={cn(sizeClass, item.color)}
        style={{ transform: `rotate(${item.rotation}deg)`, display: 'inline-block' }}
      >
        {item.number !== undefined ? item.number : item.shape}
      </span>
    );
  };

  return (
    <div
      className={cn(
        'relative flex min-h-[600px] flex-col rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-6 text-white',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-white/20 px-4 py-2 font-mono">
            Puzzle {currentPuzzleIndex + 1}/{TOTAL_PUZZLES}
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

      {/* Instructions */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">What comes next?</h2>
        <p className="text-sm opacity-80">Find the pattern and select the correct answer</p>
      </div>

      {/* Main puzzle area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Hint */}
        {showHint && (
          <div className="mb-4 rounded-xl bg-white/20 px-6 py-3">
            <p className="text-sm">{currentPuzzle.hint}</p>
          </div>
        )}

        {/* Sequence */}
        <div className="flex items-center gap-4 mb-8">
          {currentPuzzle.sequence.map((item, index) => (
            <div
              key={index}
              className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20"
            >
              {renderItem(item)}
            </div>
          ))}
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-white/50">
            <span className="text-2xl">?</span>
          </div>
        </div>

        {/* Options */}
        <div className="flex gap-4 mb-8">
          {currentPuzzle.options.map((option, index) => (
            <button
              key={index}
              className={cn(
                'flex h-20 w-20 items-center justify-center rounded-xl transition-all',
                selectedOption === index
                  ? 'bg-white ring-4 ring-yellow-400 scale-110'
                  : 'bg-white/90 hover:bg-white hover:scale-105'
              )}
              onClick={() => setSelectedOption(index)}
            >
              {renderItem(option, 'option')}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={cn(
              'rounded-xl px-6 py-3 text-xl font-bold',
              feedback.correct ? 'bg-green-500' : 'bg-orange-500'
            )}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={useHint}
          disabled={hintsUsed >= 1 || showHint}
          className={cn(
            'rounded-xl px-6 py-3 font-medium transition-all',
            hintsUsed >= 1 || showHint
              ? 'bg-white/10 text-white/50 cursor-not-allowed'
              : 'bg-white/20 hover:bg-white/30'
          )}
        >
          Show Hint
        </button>

        <button
          onClick={checkAnswer}
          disabled={selectedOption === null}
          className={cn(
            'rounded-xl px-6 py-3 font-medium transition-all',
            selectedOption !== null
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-white/10 text-white/50 cursor-not-allowed'
          )}
        >
          Submit Answer
        </button>
      </div>

      {/* No time pressure message */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs opacity-60">
        Take your time - there&apos;s no time limit!
      </p>
    </div>
  );
}
