'use client';

import * as React from 'react';
import { cn } from '@aivo/ui-web';

import type { BaseGameProps, GameMetrics, GameResult } from '../types';

type ShapeType = 'circle' | 'square' | 'triangle' | 'star' | 'diamond' | 'hexagon';
type ShapeColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

interface FallingShape {
  id: string;
  type: ShapeType;
  color: ShapeColor;
  x: number;
  y: number;
}

interface Container {
  type: ShapeType;
  x: number;
}

const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'star'];
const COLORS: ShapeColor[] = ['red', 'blue', 'green', 'yellow'];
const ADVANCED_SHAPES: ShapeType[] = ['diamond', 'hexagon'];
const ADVANCED_COLORS: ShapeColor[] = ['purple', 'orange'];

const SHAPE_ICONS: Record<ShapeType, string> = {
  circle: '●',
  square: '■',
  triangle: '▲',
  star: '★',
  diamond: '◆',
  hexagon: '⬡',
};

const COLOR_CLASSES: Record<ShapeColor, string> = {
  red: 'text-red-500',
  blue: 'text-blue-500',
  green: 'text-green-500',
  yellow: 'text-yellow-500',
  purple: 'text-purple-500',
  orange: 'text-orange-500',
};

const CONTAINER_BG: Record<ShapeColor, string> = {
  red: 'bg-red-100 border-red-300',
  blue: 'bg-blue-100 border-blue-300',
  green: 'bg-green-100 border-green-300',
  yellow: 'bg-yellow-100 border-yellow-300',
  purple: 'bg-purple-100 border-purple-300',
  orange: 'bg-orange-100 border-orange-300',
};

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function calculateStars(accuracy: number): number {
  if (accuracy >= 90) return 3;
  if (accuracy >= 70) return 2;
  return 1;
}

export function ShapeSorterGame({ config, onComplete, onExit, className }: BaseGameProps) {
  const [score, setScore] = React.useState(0);
  const [level, setLevel] = React.useState(1);
  const [shapes, setShapes] = React.useState<FallingShape[]>([]);
  const [containers, setContainers] = React.useState<Container[]>([]);
  const [draggedShape, setDraggedShape] = React.useState<FallingShape | null>(null);
  const [correctAnswers, setCorrectAnswers] = React.useState(0);
  const [totalAttempts, setTotalAttempts] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [feedback, setFeedback] = React.useState<{ message: string; correct: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = React.useState(config.timeLimit || 60);

  const startTimeRef = React.useRef<number>(Date.now());
  const responseTimes = React.useRef<number[]>([]);
  const lastShapeTime = React.useRef<number>(Date.now());
  const gameAreaRef = React.useRef<HTMLDivElement>(null);

  // Initialize containers based on difficulty
  React.useEffect(() => {
    const availableShapes = config.difficulty === 'hard'
      ? [...SHAPES, ...ADVANCED_SHAPES]
      : SHAPES;
    const numContainers = config.difficulty === 'easy' ? 3 : config.difficulty === 'medium' ? 4 : 5;
    const selectedShapes = availableShapes.slice(0, numContainers);

    const newContainers: Container[] = selectedShapes.map((type, index) => ({
      type,
      x: (index + 1) * (100 / (numContainers + 1)),
    }));
    setContainers(newContainers);
  }, [config.difficulty]);

  // Timer countdown
  React.useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  // Spawn shapes periodically
  React.useEffect(() => {
    if (!isPlaying || containers.length === 0) return;

    const baseInterval = config.difficulty === 'easy' ? 2500 : config.difficulty === 'medium' ? 2000 : 1500;
    const levelBonus = Math.max(500, baseInterval - level * 100);

    const spawnShape = () => {
      const availableShapes = config.difficulty === 'hard'
        ? [...SHAPES, ...ADVANCED_SHAPES]
        : SHAPES;
      const availableColors = config.difficulty === 'hard'
        ? [...COLORS, ...ADVANCED_COLORS]
        : COLORS;

      // Only spawn shapes that have matching containers
      const validShapes = availableShapes.filter(s => containers.some(c => c.type === s));
      const type = validShapes[Math.floor(Math.random() * validShapes.length)];
      const color = availableColors[Math.floor(Math.random() * availableColors.length)];
      const x = 10 + Math.random() * 80;

      const newShape: FallingShape = {
        id: generateId(),
        type,
        color,
        x,
        y: 0,
      };

      setShapes((prev) => [...prev.slice(-10), newShape]); // Keep max 10 shapes
      lastShapeTime.current = Date.now();
    };

    spawnShape();
    const interval = setInterval(spawnShape, levelBonus);
    return () => clearInterval(interval);
  }, [isPlaying, level, config.difficulty, containers]);

  // Animate falling shapes
  React.useEffect(() => {
    if (!isPlaying) return;

    const fallSpeed = config.difficulty === 'easy' ? 0.5 : config.difficulty === 'medium' ? 0.7 : 1;

    const animate = () => {
      setShapes((prev) =>
        prev
          .map((shape) => ({
            ...shape,
            y: shape.y + fallSpeed,
          }))
          .filter((shape) => shape.y < 80) // Remove shapes that fell too far
      );
    };

    const animationInterval = setInterval(animate, 50);
    return () => clearInterval(animationInterval);
  }, [isPlaying, config.difficulty]);

  // Level up based on score
  React.useEffect(() => {
    const newLevel = Math.floor(score / 100) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
    }
  }, [score, level]);

  // Complete game when time is up
  React.useEffect(() => {
    if (!isPlaying && timeLeft === 0) {
      const accuracy = totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0;
      const avgResponseTime =
        responseTimes.current.length > 0
          ? responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length
          : 0;

      const metrics: GameMetrics = {
        score,
        maxScore: 1000,
        correctAnswers,
        totalAttempts,
        averageResponseTime: Math.round(avgResponseTime),
        duration: Math.round((Date.now() - startTimeRef.current) / 1000),
        levelReached: level,
      };

      const stars = calculateStars(accuracy);

      const result: GameResult = {
        completed: true,
        metrics,
        xpEarned: stars * 30 + score / 10,
        coinsEarned: stars * 5 + Math.floor(score / 50),
        isPersonalBest: false,
        stars,
      };

      setTimeout(() => onComplete(result), 1000);
    }
  }, [isPlaying, timeLeft, score, correctAnswers, totalAttempts, level, onComplete]);

  const handleDragStart = (shape: FallingShape) => {
    setDraggedShape(shape);
  };

  const handleDragEnd = () => {
    setDraggedShape(null);
  };

  const handleDrop = (containerType: ShapeType) => {
    if (!draggedShape) return;

    const responseTime = Date.now() - lastShapeTime.current;
    responseTimes.current.push(responseTime);

    const isCorrect = draggedShape.type === containerType;
    setTotalAttempts((prev) => prev + 1);

    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      setScore((prev) => prev + (10 * level));
      setFeedback({ message: 'Correct!', correct: true });
    } else {
      setFeedback({ message: 'Try again!', correct: false });
    }

    // Remove the shape
    setShapes((prev) => prev.filter((s) => s.id !== draggedShape.id));
    setDraggedShape(null);

    // Clear feedback
    setTimeout(() => setFeedback(null), 800);
  };

  const handleShapeClick = (shape: FallingShape) => {
    // For touch devices, clicking a shape selects it
    if (draggedShape?.id === shape.id) {
      setDraggedShape(null);
    } else {
      setDraggedShape(shape);
    }
  };

  const handleContainerClick = (containerType: ShapeType) => {
    if (draggedShape) {
      handleDrop(containerType);
    }
  };

  return (
    <div
      className={cn(
        'relative flex min-h-[600px] flex-col rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 p-4 text-white',
        className
      )}
      ref={gameAreaRef}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-white/20 px-4 py-2 font-mono">
            Level {level}
          </div>
          <div className="rounded-full bg-white/20 px-4 py-2 font-mono">
            Score: {score}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-full bg-white/20 px-4 py-2 font-mono">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
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
      </div>

      {/* Game area */}
      <div className="relative flex-1 rounded-xl bg-white/10 overflow-hidden">
        {/* Falling shapes */}
        {shapes.map((shape) => (
          <div
            key={shape.id}
            className={cn(
              'absolute cursor-grab text-5xl transition-transform',
              COLOR_CLASSES[shape.color],
              draggedShape?.id === shape.id && 'scale-110 opacity-70'
            )}
            style={{
              left: `${shape.x}%`,
              top: `${shape.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            draggable
            onDragStart={() => handleDragStart(shape)}
            onDragEnd={handleDragEnd}
            onClick={() => handleShapeClick(shape)}
          >
            {SHAPE_ICONS[shape.type]}
          </div>
        ))}

        {/* Selected shape indicator */}
        {draggedShape && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/30 px-4 py-2 text-sm">
            Tap a container to place the {draggedShape.type}
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            className={cn(
              'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl px-6 py-3 text-xl font-bold',
              feedback.correct ? 'bg-green-500' : 'bg-red-500'
            )}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Containers at bottom */}
      <div className="mt-4 flex justify-center gap-4">
        {containers.map((container) => (
          <div
            key={container.type}
            className={cn(
              'flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed transition-all cursor-pointer',
              'bg-white/90 hover:bg-white',
              draggedShape && 'ring-2 ring-white animate-pulse'
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(container.type)}
            onClick={() => handleContainerClick(container.type)}
          >
            <span className="text-3xl text-slate-600">{SHAPE_ICONS[container.type]}</span>
            <span className="text-xs text-slate-500 capitalize mt-1">{container.type}</span>
          </div>
        ))}
      </div>

      {/* Instructions */}
      {shapes.length === 0 && totalAttempts === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Shape Sorter</h2>
            <p className="opacity-80">Drag shapes to their matching containers!</p>
            <p className="text-sm opacity-60 mt-2">Shapes will start falling in a moment...</p>
          </div>
        </div>
      )}
    </div>
  );
}
