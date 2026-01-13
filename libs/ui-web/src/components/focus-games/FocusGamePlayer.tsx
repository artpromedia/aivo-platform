'use client';

/**
 * Focus Game Player Component
 *
 * Renders different types of mini-games for focus breaks.
 * Supports memory games, breathing visualizers, tap rhythm games, and more.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../button';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type GameType =
  | 'memory'
  | 'pattern'
  | 'breathing'
  | 'tap-rhythm'
  | 'drawing'
  | 'color-match'
  | 'sequence'
  | 'focus-spot'
  | 'counting'
  | 'shape-tracing';

export interface GameConfig {
  type: GameType;
  [key: string]: unknown;
}

export interface FocusGamePlayerProps {
  gameId: string;
  title: string;
  instructions: string[];
  config: GameConfig;
  durationSeconds: number;
  onComplete?: (completed: boolean, score?: number, maxScore?: number) => void;
  onExit?: () => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function FocusGamePlayer({
  gameId,
  title,
  instructions,
  config,
  durationSeconds,
  onComplete,
  onExit,
  className,
}: FocusGamePlayerProps) {
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'completed'>('instructions');
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);

  const handleStart = useCallback(() => {
    setGameState('playing');
  }, []);

  const handleGameComplete = useCallback((completed: boolean, score?: number, maxScore?: number) => {
    setGameState('completed');
    onComplete?.(completed, score, maxScore);
  }, [onComplete]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleGameComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, handleGameComplete]);

  return (
    <div className={cn('flex flex-col h-full bg-surface rounded-xl shadow-soft', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold text-text">{title}</h2>
        {gameState === 'playing' && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">
              Time: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
            <Button variant="ghost" size="sm" onClick={onExit}>
              Exit
            </Button>
          </div>
        )}
        {gameState !== 'playing' && (
          <Button variant="ghost" size="sm" onClick={onExit}>
            Close
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {gameState === 'instructions' && (
          <InstructionsView
            instructions={instructions}
            onStart={handleStart}
          />
        )}

        {gameState === 'playing' && (
          <GameRenderer
            gameId={gameId}
            config={config}
            onComplete={handleGameComplete}
          />
        )}

        {gameState === 'completed' && (
          <CompletionView
            title={title}
            onClose={onExit}
          />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function InstructionsView({
  instructions,
  onStart,
}: {
  instructions: string[];
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
      <div className="max-w-md space-y-3">
        <h3 className="text-lg font-semibold text-text mb-4">How to Play:</h3>
        {instructions.map((instruction, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-on-accent flex items-center justify-center text-sm font-bold">
              {i + 1}
            </div>
            <p className="text-text flex-1">{instruction}</p>
          </div>
        ))}
      </div>
      <Button size="lg" onClick={onStart} className="mt-4">
        Start Game
      </Button>
    </div>
  );
}

function CompletionView({
  title,
  onClose,
}: {
  title: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="text-6xl">✨</div>
        <h3 className="text-2xl font-bold text-text">Great Job!</h3>
        <p className="text-text-muted max-w-md">
          You completed {title}! Hope you feel refreshed and ready to continue.
        </p>
      </div>
      <Button size="lg" onClick={onClose}>
        Back to Learning
      </Button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GAME RENDERER
// ══════════════════════════════════════════════════════════════════════════════

function GameRenderer({
  gameId: _gameId,
  config,
  onComplete,
}: {
  gameId: string;
  config: GameConfig;
  onComplete: (completed: boolean, score?: number, maxScore?: number) => void;
}) {
  switch (config.type) {
    case 'memory':
      return <MemoryGame config={config} onComplete={onComplete} />;
    case 'breathing':
      return <BreathingVisualizer config={config} onComplete={onComplete} />;
    case 'tap-rhythm':
      return <TapRhythmGame config={config} onComplete={onComplete} />;
    case 'pattern':
      return <PatternGame config={config} onComplete={onComplete} />;
    case 'drawing':
      return <DrawingGame config={config} onComplete={onComplete} />;
    case 'focus-spot':
      return <FocusSpotGame config={config} onComplete={onComplete} />;
    case 'counting':
      return <CountingGame config={config} onComplete={onComplete} />;
    case 'shape-tracing':
      return <ShapeTracingGame config={config} onComplete={onComplete} />;
    case 'color-match':
      return <ColorMatchGame config={config} onComplete={onComplete} />;
    case 'sequence':
      return <SequenceGame config={config} onComplete={onComplete} />;
    default:
      return (
        <div className="flex items-center justify-center p-8 min-h-[400px]">
          <p className="text-text-muted">Game type not yet implemented: {config.type}</p>
        </div>
      );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MEMORY GAME
// ══════════════════════════════════════════════════════════════════════════════

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function MemoryGame({
  config,
  onComplete,
}: {
  config: GameConfig;
  onComplete: (completed: boolean, score?: number, maxScore?: number) => void;
}) {
  const pairs = (config.cardPairs as number) || 4;
  const theme = (config.theme as string) || 'shapes';

  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);

  // Initialize cards
  useEffect(() => {
    const values = generateCardValues(pairs, theme);
    const shuffled = [...values, ...values]
      .sort(() => Math.random() - 0.5)
      .map((value, id) => ({
        id,
        value,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffled);
  }, [pairs, theme]);

  // Check completion
  useEffect(() => {
    if (matchedPairs === pairs) {
      setTimeout(() => {
        onComplete(true, pairs * 2 - moves, pairs * 2);
      }, 500);
    }
  }, [matchedPairs, pairs, moves, onComplete]);

  const handleCardClick = (index: number) => {
    if (flippedIndices.length === 2) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newFlipped;

      if (cards[first].value === cards[second].value) {
        // Match!
        setTimeout(() => {
          const matched = [...cards];
          matched[first].isMatched = true;
          matched[second].isMatched = true;
          setCards(matched);
          setMatchedPairs((p) => p + 1);
          setFlippedIndices([]);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          const unflipped = [...cards];
          unflipped[first].isFlipped = false;
          unflipped[second].isFlipped = false;
          setCards(unflipped);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[400px]">
      <div className="text-sm text-text-muted mb-2">
        Moves: {moves} | Pairs: {matchedPairs}/{pairs}
      </div>
      <div className="grid grid-cols-4 gap-3 max-w-md">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(index)}
            className={cn(
              'w-20 h-20 rounded-lg font-bold text-2xl transition-all duration-300',
              'border-2 border-border shadow-soft',
              card.isFlipped || card.isMatched
                ? 'bg-primary text-on-accent'
                : 'bg-surface-muted text-transparent hover:bg-surface',
              card.isMatched && 'opacity-50'
            )}
          >
            {card.isFlipped || card.isMatched ? card.value : '?'}
          </button>
        ))}
      </div>
    </div>
  );
}

function generateCardValues(pairs: number, theme: string): string[] {
  const themes: Record<string, string[]> = {
    shapes: ['●', '■', '▲', '★', '♥', '◆'],
    emojis: ['😊', '🌟', '🌈', '🎨', '🎵', '🌺'],
    colors: ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'],
    nature: ['🌸', '🌻', '🌿', '🍀', '🌺', '🌼'],
  };

  const values = themes[theme] || themes.shapes;
  return values.slice(0, pairs);
}

// ══════════════════════════════════════════════════════════════════════════════
// BREATHING VISUALIZER
// ══════════════════════════════════════════════════════════════════════════════

function BreathingVisualizer({
  config,
  onComplete,
}: {
  config: GameConfig;
  onComplete: (completed: boolean) => void;
}) {
  const inhale = (config.inhaleSeconds as number) || 4;
  const holdIn = (config.holdInSeconds as number) || 0;
  const exhale = (config.exhaleSeconds as number) || 4;
  const holdOut = (config.holdOutSeconds as number) || 0;
  const totalCycles = (config.cycles as number) || 5;

  const [currentCycle, setCurrentCycle] = useState(1);
  const [phase, setPhase] = useState<'inhale' | 'hold-in' | 'exhale' | 'hold-out'>('inhale');
  const [progress, setProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const phases = [
      { name: 'inhale' as const, duration: inhale },
      ...(holdIn > 0 ? [{ name: 'hold-in' as const, duration: holdIn }] : []),
      { name: 'exhale' as const, duration: exhale },
      ...(holdOut > 0 ? [{ name: 'hold-out' as const, duration: holdOut }] : []),
    ];

    let phaseIndex = 0;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 0.05;
      const currentPhase = phases[phaseIndex];
      const phaseProgress = elapsed / currentPhase.duration;

      setProgress(phaseProgress);
      setPhase(currentPhase.name);

      if (phaseProgress >= 1) {
        elapsed = 0;
        phaseIndex++;

        if (phaseIndex >= phases.length) {
          phaseIndex = 0;
          setCurrentCycle((c) => {
            const next = c + 1;
            if (next > totalCycles) {
              onComplete(true);
              return c;
            }
            return next;
          });
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [inhale, holdIn, exhale, holdOut, totalCycles, onComplete]);

  // Draw visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = Math.min(canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate radius based on phase
    let radius: number;
    if (phase === 'inhale') {
      radius = (size / 4) + (size / 4) * progress;
    } else if (phase === 'exhale') {
      radius = (size / 2) - (size / 4) * progress;
    } else {
      radius = phase === 'hold-in' ? size / 2 : size / 4;
    }

    // Draw circle with gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.4)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }, [phase, progress]);

  const phaseLabels = {
    'inhale': 'Breathe In',
    'hold-in': 'Hold',
    'exhale': 'Breathe Out',
    'hold-out': 'Hold',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
      <div className="text-sm text-text-muted">
        Cycle {currentCycle} of {totalCycles}
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="max-w-full h-auto"
      />
      <div className="text-2xl font-semibold text-text">
        {phaseLabels[phase]}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAP RHYTHM GAME
// ══════════════════════════════════════════════════════════════════════════════

function TapRhythmGame({
  config,
  onComplete,
}: {
  config: GameConfig;
  onComplete: (completed: boolean, score?: number, maxScore?: number) => void;
}) {
  const pattern = (config.pattern as number[]) || [1000, 1000, 1000];
  const repetitions = (config.repetitions as number) || 3;
  const showVisualCues = (config.showVisualCues as boolean) ?? true;

  const [currentRep, setCurrentRep] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [userTaps, setUserTaps] = useState<number[]>([]);

  useEffect(() => {
    if (currentRep >= repetitions) {
      const score = calculateRhythmScore(userTaps, pattern, repetitions);
      onComplete(true, score, repetitions * pattern.length);
      return;
    }

    if (!isActive) {
      const timeout = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(() => {
      setCurrentBeat((b) => {
        const next = b + 1;
        if (next >= pattern.length) {
          setCurrentRep((r) => r + 1);
          setIsActive(false);
          return 0;
        }
        return next;
      });
    }, pattern[currentBeat]);

    return () => clearTimeout(timeout);
  }, [currentRep, currentBeat, isActive, repetitions, pattern, userTaps, onComplete]);

  const handleTap = () => {
    setUserTaps((taps) => [...taps, Date.now()]);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
      <div className="text-sm text-text-muted">
        Round {currentRep + 1} of {repetitions}
      </div>

      {showVisualCues && (
        <div className="flex gap-4">
          {pattern.map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-16 h-16 rounded-full border-4 transition-all duration-200',
                i === currentBeat && isActive
                  ? 'bg-primary border-primary scale-125'
                  : 'bg-surface-muted border-border'
              )}
            />
          ))}
        </div>
      )}

      <button
        onClick={handleTap}
        className={cn(
          'w-32 h-32 rounded-full text-white font-bold text-xl',
          'bg-primary hover:bg-primary/90 active:scale-95',
          'transition-transform shadow-soft'
        )}
      >
        TAP
      </button>

      <p className="text-sm text-text-muted">
        {isActive ? 'Tap along with the rhythm!' : 'Watch and listen...'}
      </p>
    </div>
  );
}

function calculateRhythmScore(taps: number[], _pattern: number[], _reps: number): number {
  // Simplified scoring - in production would compare timing accuracy
  return Math.min(taps.length, _pattern.length * _reps);
}

// ══════════════════════════════════════════════════════════════════════════════
// SIMPLE GAME IMPLEMENTATIONS
// ══════════════════════════════════════════════════════════════════════════════

function PatternGame({ config, onComplete }: { config: GameConfig; onComplete: (completed: boolean, score?: number, maxScore?: number) => void }) {
  const gridSize = (config.gridSize as number) || 4;
  const startingLength = (config.startingLength as number) || 3;
  const maxLength = (config.maxLength as number) || 7;

  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'];
  const [pattern, setPattern] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [isShowingPattern, setIsShowingPattern] = useState(true);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Generate initial pattern
  useEffect(() => {
    const newPattern = Array.from({ length: startingLength }, () =>
      Math.floor(Math.random() * gridSize)
    );
    setPattern(newPattern);
  }, [gridSize, startingLength]);

  // Show pattern sequence
  useEffect(() => {
    if (!isShowingPattern || pattern.length === 0) return;

    let index = 0;
    const showNext = () => {
      if (index < pattern.length) {
        setActiveCell(pattern[index]);
        setTimeout(() => {
          setActiveCell(null);
          index++;
          setTimeout(showNext, 300);
        }, 600);
      } else {
        setIsShowingPattern(false);
      }
    };

    const timer = setTimeout(showNext, 500);
    return () => clearTimeout(timer);
  }, [pattern, isShowingPattern]);

  const handleCellClick = (cellIndex: number) => {
    if (isShowingPattern || gameOver) return;

    setActiveCell(cellIndex);
    setTimeout(() => setActiveCell(null), 200);

    const newInput = [...playerInput, cellIndex];
    setPlayerInput(newInput);

    // Check if correct so far
    if (pattern[newInput.length - 1] !== cellIndex) {
      // Wrong! Game over
      setGameOver(true);
      setTimeout(() => onComplete(true, score, maxLength - startingLength + 1), 1000);
      return;
    }

    // Check if completed current pattern
    if (newInput.length === pattern.length) {
      setScore(s => s + 1);

      if (pattern.length >= maxLength) {
        // Won the game!
        setTimeout(() => onComplete(true, score + 1, maxLength - startingLength + 1), 500);
        return;
      }

      // Next round - add one more to pattern
      setRound(r => r + 1);
      setPlayerInput([]);
      setIsShowingPattern(true);
      const newPattern = [...pattern, Math.floor(Math.random() * gridSize)];
      setPattern(newPattern);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
      <div className="text-sm text-text-muted">
        Round {round} | Pattern Length: {pattern.length}
      </div>

      <p className="text-lg font-medium text-text">
        {gameOver
          ? 'Game Over!'
          : isShowingPattern
            ? 'Watch the pattern...'
            : 'Repeat the pattern!'}
      </p>

      <div className="grid grid-cols-2 gap-4 max-w-xs">
        {Array.from({ length: gridSize }).map((_, i) => (
          <button
            key={i}
            onClick={() => handleCellClick(i)}
            disabled={isShowingPattern || gameOver}
            className={cn(
              'w-24 h-24 rounded-xl transition-all duration-200 border-4',
              activeCell === i
                ? 'scale-110 brightness-125 border-white shadow-lg'
                : 'border-transparent hover:scale-105',
              !isShowingPattern && !gameOver && 'cursor-pointer'
            )}
            style={{ backgroundColor: colors[i % colors.length] }}
          />
        ))}
      </div>

      <div className="flex gap-1 mt-4">
        {pattern.map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-3 rounded-full',
              i < playerInput.length
                ? 'bg-primary'
                : 'bg-border'
            )}
          />
        ))}
      </div>
    </div>
  );
}

function DrawingGame({ config, onComplete }: { config: GameConfig; onComplete: (completed: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleComplete = () => {
    onComplete(true);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[400px]">
      <p className="text-text-muted mb-2">{(config.prompt as string) || 'Draw something calming'}</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="border-2 border-border rounded-lg bg-white cursor-crosshair"
      />
      <Button onClick={handleComplete}>Done Drawing</Button>
    </div>
  );
}

function FocusSpotGame({ config, onComplete }: { config: GameConfig; onComplete: (completed: boolean) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(true), ((config.duration as number) || 30) * 1000);
    return () => clearTimeout(timer);
  }, [config, onComplete]);

  return (
    <div className="flex items-center justify-center p-8 min-h-[400px] bg-gradient-to-br from-purple-100 to-blue-100">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 animate-pulse" />
    </div>
  );
}

function CountingGame({ config: _config, onComplete }: { config: GameConfig; onComplete: (completed: boolean, score?: number, maxScore?: number) => void }) {
  const [count] = useState(() => Math.floor(Math.random() * 5) + 3);
  const [userAnswer, setUserAnswer] = useState('');

  const handleSubmit = () => {
    const correct = parseInt(userAnswer) === count;
    onComplete(true, correct ? 1 : 0, 1);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
      <p className="text-text mb-4">How many stars do you see?</p>
      <div className="flex flex-wrap gap-4 justify-center max-w-md">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="text-4xl">⭐</div>
        ))}
      </div>
      <input
        type="number"
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        className="px-4 py-2 border-2 border-border rounded-lg text-center text-xl w-24"
        placeholder="?"
      />
      <Button onClick={handleSubmit} disabled={!userAnswer}>
        Submit
      </Button>
    </div>
  );
}

function ShapeTracingGame({ config, onComplete }: { config: GameConfig; onComplete: (completed: boolean, score?: number, maxScore?: number) => void }) {
  const shapes = (config.shapes as string[]) || ['circle', 'square', 'triangle', 'star'];
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const [tracingProgress, setTracingProgress] = useState(0);
  const [completedShapes, setCompletedShapes] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isTracing, setIsTracing] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const currentShape = shapes[currentShapeIndex];

  // Draw the shape outline to trace
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = Math.min(canvas.width, canvas.height) * 0.35;

    // Draw dashed outline
    ctx.setLineDash([10, 5]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 20;

    ctx.beginPath();
    switch (currentShape) {
      case 'circle':
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        break;
      case 'square':
        ctx.rect(centerX - size, centerY - size, size * 2, size * 2);
        break;
      case 'triangle':
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX + size, centerY + size);
        ctx.lineTo(centerX - size, centerY + size);
        ctx.closePath();
        break;
      case 'star':
        for (let i = 0; i < 5; i++) {
          const outerAngle = (i * 72 - 90) * Math.PI / 180;
          const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
          const outerX = centerX + Math.cos(outerAngle) * size;
          const outerY = centerY + Math.sin(outerAngle) * size;
          const innerX = centerX + Math.cos(innerAngle) * (size * 0.4);
          const innerY = centerY + Math.sin(innerAngle) * (size * 0.4);
          if (i === 0) ctx.moveTo(outerX, outerY);
          else ctx.lineTo(outerX, outerY);
          ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        break;
      case 'heart':
        ctx.moveTo(centerX, centerY + size * 0.7);
        ctx.bezierCurveTo(centerX - size, centerY, centerX - size, centerY - size * 0.7, centerX, centerY - size * 0.3);
        ctx.bezierCurveTo(centerX + size, centerY - size * 0.7, centerX + size, centerY, centerX, centerY + size * 0.7);
        break;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }, [currentShape]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startTracing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsTracing(true);
    const point = getCanvasPoint(e);
    if (point) lastPointRef.current = point;
  };

  const trace = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isTracing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasPoint(e);
    if (!point || !lastPointRef.current) return;

    // Draw tracing line
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    lastPointRef.current = point;
    setTracingProgress(p => Math.min(p + 0.5, 100));
  };

  const stopTracing = () => {
    setIsTracing(false);
    lastPointRef.current = null;

    if (tracingProgress >= 60) {
      // Shape completed
      const newCompleted = completedShapes + 1;
      setCompletedShapes(newCompleted);

      if (currentShapeIndex < shapes.length - 1) {
        setCurrentShapeIndex(i => i + 1);
        setTracingProgress(0);
      } else {
        onComplete(true, newCompleted, shapes.length);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[400px]">
      <div className="text-sm text-text-muted">
        Shape {currentShapeIndex + 1} of {shapes.length}
      </div>

      <p className="text-lg font-medium text-text capitalize">
        Trace the {currentShape}
      </p>

      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        onMouseDown={startTracing}
        onMouseMove={trace}
        onMouseUp={stopTracing}
        onMouseLeave={stopTracing}
        onTouchStart={startTracing}
        onTouchMove={trace}
        onTouchEnd={stopTracing}
        className="border-2 border-border rounded-lg bg-white cursor-crosshair touch-none"
      />

      <div className="w-64 h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${tracingProgress}%` }}
        />
      </div>

      <p className="text-xs text-text-muted">
        Trace at least 60% of the shape to continue
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COLOR MATCH GAME
// ══════════════════════════════════════════════════════════════════════════════

function ColorMatchGame({ config, onComplete }: { config: GameConfig; onComplete: (completed: boolean, score?: number, maxScore?: number) => void }) {
  const rounds = (config.rounds as number) || 10;
  const timePerRound = (config.timePerRound as number) || 3000;

  const colors = [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Orange', hex: '#f97316' },
  ];

  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [displayText, setDisplayText] = useState(colors[0].name);
  const [textColor, setTextColor] = useState(colors[0].hex);
  const [isMatching, setIsMatching] = useState(true);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(100);

  // Generate new challenge
  const generateChallenge = useCallback(() => {
    const textColorObj = colors[Math.floor(Math.random() * colors.length)];
    const displayTextColor = colors[Math.floor(Math.random() * colors.length)];
    const matching = Math.random() > 0.5;

    setDisplayText(textColorObj.name);
    setTextColor(matching ? textColorObj.hex : displayTextColor.hex);
    setIsMatching(textColorObj.name === colors.find(c => c.hex === (matching ? textColorObj.hex : displayTextColor.hex))?.name);
    setTimeLeft(100);
  }, []);

  useEffect(() => {
    generateChallenge();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (showFeedback) return;

    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0) {
          handleAnswer(null);
          return 0;
        }
        return t - (100 / (timePerRound / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentRound, showFeedback, timePerRound]);

  const handleAnswer = (answer: boolean | null) => {
    const correct = answer === isMatching;

    if (correct && answer !== null) {
      setScore(s => s + 1);
      setShowFeedback('correct');
    } else {
      setShowFeedback('wrong');
    }

    setTimeout(() => {
      setShowFeedback(null);

      if (currentRound >= rounds) {
        onComplete(true, score + (correct ? 1 : 0), rounds);
      } else {
        setCurrentRound(r => r + 1);
        generateChallenge();
      }
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
      <div className="text-sm text-text-muted">
        Round {currentRound} of {rounds} | Score: {score}
      </div>

      <div className="w-64 h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${timeLeft}%` }}
        />
      </div>

      <p className="text-text-muted">Does the text color match the word?</p>

      <div
        className={cn(
          'text-6xl font-bold py-8 px-12 rounded-2xl transition-all',
          showFeedback === 'correct' && 'bg-green-100',
          showFeedback === 'wrong' && 'bg-red-100'
        )}
        style={{ color: textColor }}
      >
        {displayText}
      </div>

      <div className="flex gap-4">
        <Button
          size="lg"
          variant="secondary"
          onClick={() => handleAnswer(true)}
          disabled={!!showFeedback}
          className="w-32"
        >
          Match
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => handleAnswer(false)}
          disabled={!!showFeedback}
          className="w-32"
        >
          No Match
        </Button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SEQUENCE GAME
// ══════════════════════════════════════════════════════════════════════════════

function SequenceGame({ config, onComplete }: { config: GameConfig; onComplete: (completed: boolean, score?: number, maxScore?: number) => void }) {
  const startLength = (config.startLength as number) || 4;
  const maxLength = (config.maxLength as number) || 8;
  const displayTime = (config.displayTime as number) || 2000;

  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [phase, setPhase] = useState<'showing' | 'input' | 'feedback'>('showing');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Generate sequence
  useEffect(() => {
    const length = startLength + currentLevel - 1;
    const newSequence = Array.from({ length: Math.min(length, maxLength) }, () =>
      Math.floor(Math.random() * 10)
    );
    setSequence(newSequence);
    setUserInput([]);
    setPhase('showing');

    // Show for displayTime then switch to input
    const timer = setTimeout(() => {
      setPhase('input');
    }, displayTime);

    return () => clearTimeout(timer);
  }, [currentLevel, startLength, maxLength, displayTime]);

  const handleNumberClick = (num: number) => {
    if (phase !== 'input') return;

    const newInput = [...userInput, num];
    setUserInput(newInput);

    // Check if sequence is complete
    if (newInput.length === sequence.length) {
      const isCorrect = newInput.every((n, i) => n === sequence[i]);

      setPhase('feedback');
      setFeedback(isCorrect ? 'correct' : 'wrong');

      if (isCorrect) {
        setScore(s => s + 1);
      }

      setTimeout(() => {
        setFeedback(null);

        if (!isCorrect || currentLevel >= maxLength - startLength + 1) {
          onComplete(true, score + (isCorrect ? 1 : 0), maxLength - startLength + 1);
        } else {
          setCurrentLevel(l => l + 1);
        }
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
      <div className="text-sm text-text-muted">
        Level {currentLevel} | Score: {score}
      </div>

      <p className="text-lg font-medium text-text">
        {phase === 'showing'
          ? 'Remember this sequence!'
          : phase === 'input'
            ? 'Enter the sequence'
            : feedback === 'correct'
              ? 'Correct!'
              : 'Try again!'}
      </p>

      {/* Sequence display */}
      <div className={cn(
        'flex gap-3 p-4 rounded-xl min-h-[80px] items-center justify-center',
        phase === 'showing' && 'bg-primary/10',
        feedback === 'correct' && 'bg-green-100',
        feedback === 'wrong' && 'bg-red-100'
      )}>
        {phase === 'showing' ? (
          sequence.map((num, i) => (
            <span key={i} className="text-4xl font-bold text-primary">{num}</span>
          ))
        ) : (
          userInput.map((num, i) => (
            <span key={i} className="text-4xl font-bold text-text">{num}</span>
          ))
        )}
        {phase === 'input' && userInput.length === 0 && (
          <span className="text-2xl text-text-muted">...</span>
        )}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-5 gap-2 max-w-sm">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            disabled={phase !== 'input'}
            className={cn(
              'w-14 h-14 rounded-lg text-xl font-bold transition-all',
              'bg-surface-muted border-2 border-border',
              phase === 'input'
                ? 'hover:bg-primary hover:text-white hover:border-primary cursor-pointer'
                : 'opacity-50 cursor-not-allowed'
            )}
          >
            {num}
          </button>
        ))}
      </div>

      <p className="text-xs text-text-muted">
        Sequence length: {sequence.length} numbers
      </p>
    </div>
  );
}
