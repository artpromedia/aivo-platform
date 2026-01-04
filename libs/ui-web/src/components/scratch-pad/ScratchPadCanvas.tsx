'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent } from 'react';

import { cn } from '../../utils/cn';
import { Button } from '../button';
import type {
  Stroke,
  StrokePoint,
  CanvasState,
  MathRecognitionResult,
} from '@aivo/ts-types';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface ScratchPadCanvasProps {
  /** Canvas width in pixels */
  width?: number;
  /** Canvas height in pixels */
  height?: number;
  /** Called when recognition result is available */
  onRecognitionResult?: (result: MathRecognitionResult) => void;
  /** Called when strokes change */
  onStrokesChange?: (strokes: Stroke[]) => void;
  /** Called when canvas state changes */
  onCanvasStateChange?: (state: CanvasState) => void;
  /** Auto-recognize after delay (ms). Set to 0 to disable */
  autoRecognizeDelay?: number;
  /** API endpoint for recognition */
  recognitionEndpoint?: string;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Show grid background */
  showGrid?: boolean;
  /** Initial strokes */
  initialStrokes?: Stroke[];
  /** Additional class names */
  className?: string;
  /** Read-only mode */
  readOnly?: boolean;
}

export interface ScratchPadCanvasRef {
  clear: () => void;
  undo: () => void;
  redo: () => void;
  getCanvasState: () => CanvasState;
  getImageData: () => string;
  recognize: () => Promise<MathRecognitionResult | null>;
}

type Tool = 'pen' | 'eraser';

interface HistoryEntry {
  strokes: Stroke[];
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const DEFAULT_PEN_COLOR = '#000000';
const DEFAULT_ERASER_COLOR = '#FFFFFF';
const DEFAULT_STROKE_WIDTH = 3;
const ERASER_WIDTH = 20;
const MAX_HISTORY = 50;

const COLORS = [
  '#000000', // Black
  '#1E88E5', // Blue
  '#43A047', // Green
  '#E53935', // Red
  '#8E24AA', // Purple
  '#FB8C00', // Orange
];

// ════════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

export const ScratchPadCanvas = forwardRef<ScratchPadCanvasRef, ScratchPadCanvasProps>(
  function ScratchPadCanvas(
    {
      width = 400,
      height = 300,
      onRecognitionResult,
      onStrokesChange,
      onCanvasStateChange,
      autoRecognizeDelay = 1500,
      recognitionEndpoint = '/api/v1/math-recognition/recognize',
      showToolbar = true,
      showGrid = true,
      initialStrokes = [],
      className,
      readOnly = false,
    },
    ref
  ) {
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const recognizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // State
    const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<Tool>('pen');
    const [penColor, setPenColor] = useState(DEFAULT_PEN_COLOR);
    const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
    const [history, setHistory] = useState<HistoryEntry[]>([{ strokes: initialStrokes }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [recognitionResult, setRecognitionResult] = useState<MathRecognitionResult | null>(null);

    // ──────────────────────────────────────────────────────────────────────────
    // CANVAS SETUP
    // ──────────────────────────────────────────────────────────────────────────

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Set canvas size for high DPI
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      contextRef.current = ctx;

      // Initial render
      redrawCanvas();
    }, [width, height]);

    // Redraw when strokes change
    useEffect(() => {
      redrawCanvas();
    }, [strokes]);

    // ──────────────────────────────────────────────────────────────────────────
    // DRAWING FUNCTIONS
    // ──────────────────────────────────────────────────────────────────────────

    const redrawCanvas = useCallback(() => {
      const ctx = contextRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;

      // Clear canvas
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Draw grid if enabled
      if (showGrid) {
        drawGrid(ctx);
      }

      // Draw all strokes
      strokes.forEach((stroke) => {
        drawStroke(ctx, stroke);
      });

      // Draw current stroke
      if (currentStroke) {
        drawStroke(ctx, currentStroke);
      }
    }, [strokes, currentStroke, width, height, showGrid]);

    const drawGrid = (ctx: CanvasRenderingContext2D) => {
      const gridSize = 20;
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 0.5;

      // Vertical lines
      for (let x = gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = intToHex(stroke.color ?? 0xff000000);
      ctx.lineWidth = stroke.strokeWidth ?? DEFAULT_STROKE_WIDTH;

      const [first, ...rest] = stroke.points;
      ctx.moveTo(first.x, first.y);

      rest.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });

      ctx.stroke();
    };

    // ──────────────────────────────────────────────────────────────────────────
    // POINTER EVENTS
    // ──────────────────────────────────────────────────────────────────────────

    const getPointerPosition = (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handlePointerDown = useCallback(
      (e: ReactPointerEvent<HTMLCanvasElement>) => {
        if (readOnly) return;

        const pos = getPointerPosition(e);
        const point: StrokePoint = {
          x: pos.x,
          y: pos.y,
          t: Date.now(),
          p: e.pressure || 1,
        };

        const color = tool === 'eraser' ? hexToInt(DEFAULT_ERASER_COLOR) : hexToInt(penColor);
        const width = tool === 'eraser' ? ERASER_WIDTH : strokeWidth;

        const newStroke: Stroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          points: [point],
          color,
          strokeWidth: width,
          createdAt: new Date().toISOString(),
        };

        setCurrentStroke(newStroke);
        setIsDrawing(true);

        // Clear recognition timeout
        if (recognizeTimeoutRef.current) {
          clearTimeout(recognizeTimeoutRef.current);
        }
      },
      [readOnly, tool, penColor, strokeWidth]
    );

    const handlePointerMove = useCallback(
      (e: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !currentStroke || readOnly) return;

        const pos = getPointerPosition(e);
        const point: StrokePoint = {
          x: pos.x,
          y: pos.y,
          t: Date.now(),
          p: e.pressure || 1,
        };

        setCurrentStroke({
          ...currentStroke,
          points: [...currentStroke.points, point],
        });
      },
      [isDrawing, currentStroke, readOnly]
    );

    const handlePointerUp = useCallback(() => {
      if (!isDrawing || !currentStroke || readOnly) return;

      // Only add if stroke has enough points
      if (currentStroke.points.length >= 2) {
        const newStrokes = [...strokes, currentStroke];
        setStrokes(newStrokes);
        addToHistory(newStrokes);
        onStrokesChange?.(newStrokes);

        // Schedule auto-recognition
        if (autoRecognizeDelay > 0 && onRecognitionResult) {
          recognizeTimeoutRef.current = setTimeout(() => {
            void performRecognition(newStrokes);
          }, autoRecognizeDelay);
        }
      }

      setCurrentStroke(null);
      setIsDrawing(false);
    }, [isDrawing, currentStroke, strokes, readOnly, autoRecognizeDelay, onRecognitionResult, onStrokesChange]);

    const handlePointerLeave = handlePointerUp;

    // ──────────────────────────────────────────────────────────────────────────
    // HISTORY
    // ──────────────────────────────────────────────────────────────────────────

    const addToHistory = useCallback((newStrokes: Stroke[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({ strokes: newStrokes });
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
        }
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
    }, [historyIndex]);

    const undo = useCallback(() => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const newStrokes = history[newIndex].strokes;
        setStrokes(newStrokes);
        onStrokesChange?.(newStrokes);
      }
    }, [history, historyIndex, onStrokesChange]);

    const redo = useCallback(() => {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        const newStrokes = history[newIndex].strokes;
        setStrokes(newStrokes);
        onStrokesChange?.(newStrokes);
      }
    }, [history, historyIndex, onStrokesChange]);

    const clear = useCallback(() => {
      setStrokes([]);
      addToHistory([]);
      onStrokesChange?.([]);
      setRecognitionResult(null);
    }, [addToHistory, onStrokesChange]);

    // ──────────────────────────────────────────────────────────────────────────
    // RECOGNITION
    // ──────────────────────────────────────────────────────────────────────────

    const performRecognition = async (strokesToRecognize: Stroke[] = strokes): Promise<MathRecognitionResult | null> => {
      if (strokesToRecognize.length === 0) return null;

      setIsRecognizing(true);

      try {
        const response = await fetch(recognitionEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            strokes: strokesToRecognize,
            canvasWidth: width,
            canvasHeight: height,
            options: {
              evaluateExpression: true,
              includeAlternatives: true,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Recognition failed');
        }

        const result: MathRecognitionResult = await response.json();
        setRecognitionResult(result);
        onRecognitionResult?.(result);
        return result;
      } catch (error) {
        console.error('Recognition error:', error);
        return null;
      } finally {
        setIsRecognizing(false);
      }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // CANVAS STATE
    // ──────────────────────────────────────────────────────────────────────────

    const getCanvasState = useCallback((): CanvasState => {
      const now = new Date().toISOString();
      return {
        strokes,
        canvasSize: { width, height },
        backgroundColor: 0xffffffff,
        createdAt: now,
        updatedAt: now,
      };
    }, [strokes, width, height]);

    const getImageData = useCallback((): string => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL('image/png');
    }, []);

    // Notify on state change
    useEffect(() => {
      onCanvasStateChange?.(getCanvasState());
    }, [strokes, getCanvasState, onCanvasStateChange]);

    // ──────────────────────────────────────────────────────────────────────────
    // IMPERATIVE HANDLE
    // ──────────────────────────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      clear,
      undo,
      redo,
      getCanvasState,
      getImageData,
      recognize: () => performRecognition(),
    }), [clear, undo, redo, getCanvasState, getImageData]);

    // ──────────────────────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────────────────────

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {/* Toolbar */}
        {showToolbar && !readOnly && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2">
            {/* Tool selection */}
            <div className="flex gap-1">
              <Button
                variant={tool === 'pen' ? 'primary' : 'ghost'}
                size="icon"
                onClick={() => setTool('pen')}
                title="Pen"
              >
                <PenIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={tool === 'eraser' ? 'primary' : 'ghost'}
                size="icon"
                onClick={() => setTool('eraser')}
                title="Eraser"
              >
                <EraserIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Colors */}
            <div className="flex gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setPenColor(color);
                    setTool('pen');
                  }}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                    penColor === color && tool === 'pen' ? 'border-primary' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Stroke width */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setStrokeWidth(2)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded',
                  strokeWidth === 2 ? 'bg-primary/10' : 'hover:bg-surface-muted'
                )}
                title="Thin"
              >
                <div className="h-0.5 w-3 rounded-full bg-current" />
              </button>
              <button
                onClick={() => setStrokeWidth(4)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded',
                  strokeWidth === 4 ? 'bg-primary/10' : 'hover:bg-surface-muted'
                )}
                title="Medium"
              >
                <div className="h-1 w-3 rounded-full bg-current" />
              </button>
              <button
                onClick={() => setStrokeWidth(6)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded',
                  strokeWidth === 6 ? 'bg-primary/10' : 'hover:bg-surface-muted'
                )}
                title="Thick"
              >
                <div className="h-1.5 w-3 rounded-full bg-current" />
              </button>
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={undo}
                disabled={historyIndex <= 0}
                title="Undo"
              >
                <UndoIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title="Redo"
              >
                <RedoIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={clear} title="Clear">
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="relative overflow-hidden rounded-lg border border-border">
          <canvas
            ref={canvasRef}
            className={cn(
              'touch-none',
              readOnly ? 'cursor-default' : 'cursor-crosshair'
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          />

          {/* Recognition indicator */}
          {isRecognizing && (
            <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-full bg-surface/90 px-3 py-1 text-sm shadow">
              <Spinner className="h-4 w-4" />
              <span>Recognizing...</span>
            </div>
          )}
        </div>

        {/* Recognition result */}
        {recognitionResult && recognitionResult.confidence > 0.5 && (
          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <div className="text-sm text-muted">Recognized:</div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">{recognitionResult.recognizedText}</span>
              {recognitionResult.evaluation?.isValid && (
                <span className="text-lg font-bold text-primary">
                  = {recognitionResult.evaluation.formattedResult}
                </span>
              )}
            </div>
            {recognitionResult.alternatives.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs text-muted">Other options:</span>
                {recognitionResult.alternatives.slice(0, 3).map((alt, i) => (
                  <span key={i} className="rounded bg-surface px-2 py-0.5 text-xs">
                    {alt.text}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

// ════════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

function hexToInt(hex: string): number {
  const clean = hex.replace('#', '');
  return parseInt('ff' + clean, 16);
}

function intToHex(int: number): string {
  const hex = (int & 0xffffff).toString(16).padStart(6, '0');
  return `#${hex}`;
}

// ════════════════════════════════════════════════════════════════════════════════
// ICONS
// ════════════════════════════════════════════════════════════════════════════════

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

function EraserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
      />
    </svg>
  );
}

function RedoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
