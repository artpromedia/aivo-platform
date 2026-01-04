'use client';

/**
 * Focus Game Player Component
 *
 * Renders different types of mini-games for focus breaks.
 * Supports memory games, breathing visualizers, tap rhythm games, and more.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
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
  gameId,
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

function PatternGame({ config, onComplete }: { config: GameConfig; onComplete: (completed: boolean) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(true), 5000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex items-center justify-center p-8 min-h-[400px]">
      <p className="text-text">Pattern game coming soon!</p>
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

function CountingGame({ config, onComplete }: { config: GameConfig; onComplete: (completed: boolean, score?: number, maxScore?: number) => void }) {
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

function ShapeTracingGame({ config, onComplete }: { config: GameConfig; onComplete: (completed: boolean) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(true), 5000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex items-center justify-center p-8 min-h-[400px]">
      <p className="text-text">Shape tracing game coming soon!</p>
    </div>
  );
}
