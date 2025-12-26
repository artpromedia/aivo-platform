/**
 * Whiteboard Component
 *
 * Collaborative drawing canvas with:
 * - Multiple drawing tools
 * - Real-time sync via Y.js
 * - Undo/redo support
 * - Touch support
 */

import type { CSSProperties } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

import type { WhiteboardTool, WhiteboardElement, Position2D, CursorData } from '../types';

interface WhiteboardProps {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  socket: Socket | null;
  roomId: string;
  userId: string;
  displayName: string;
  color: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  readOnly?: boolean;
  showToolbar?: boolean;
  showCursors?: boolean;
  cursors?: Map<string, CursorData>;
  onCursorMove?: (position: Position2D) => void;
}

interface ToolbarProps {
  currentTool: WhiteboardTool;
  currentColor: string;
  strokeWidth: number;
  onToolChange: (tool: WhiteboardTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const COLORS = [
  '#000000',
  '#374151',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#84CC16',
  '#22C55E',
  '#14B8A6',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#EC4899',
  '#FFFFFF',
];

const STROKE_WIDTHS = [2, 4, 6, 8, 12];

const TOOLS: { tool: WhiteboardTool; icon: string; label: string }[] = [
  { tool: 'select', icon: '↖', label: 'Select' },
  { tool: 'pen', icon: '✎', label: 'Pen' },
  { tool: 'eraser', icon: '⌫', label: 'Eraser' },
  { tool: 'rectangle', icon: '□', label: 'Rectangle' },
  { tool: 'circle', icon: '○', label: 'Circle' },
  { tool: 'line', icon: '/', label: 'Line' },
  { tool: 'arrow', icon: '→', label: 'Arrow' },
  { tool: 'text', icon: 'T', label: 'Text' },
];

// Toolbar component
const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  currentColor,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const toolbarStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    backgroundColor: 'white',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    marginBottom: 8,
    flexWrap: 'wrap',
  };

  const buttonStyle = (active: boolean): CSSProperties => ({
    width: 36,
    height: 36,
    border: active ? '2px solid #3B82F6' : '1px solid #E5E7EB',
    borderRadius: 6,
    backgroundColor: active ? '#EFF6FF' : 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    transition: 'all 150ms ease',
  });

  const colorButtonStyle = (color: string, active: boolean): CSSProperties => {
    const getBorder = (): string => {
      if (active) return '2px solid #3B82F6';
      if (color === '#FFFFFF') return '1px solid #E5E7EB';
      return 'none';
    };
    return {
      width: 24,
      height: 24,
      borderRadius: 4,
      backgroundColor: color,
      border: getBorder(),
      cursor: 'pointer',
      boxShadow: active ? '0 0 0 2px white, 0 0 0 4px #3B82F6' : 'none',
    };
  };

  const dividerStyle: CSSProperties = {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
    margin: '0 4px',
  };

  return (
    <div style={toolbarStyle}>
      {/* Tools */}
      {TOOLS.map(({ tool, icon, label }) => (
        <button
          key={tool}
          style={buttonStyle(currentTool === tool)}
          onClick={() => {
            onToolChange(tool);
          }}
          title={label}
          aria-label={label}
        >
          {icon}
        </button>
      ))}

      <div style={dividerStyle} />

      {/* Colors */}
      <div style={{ display: 'flex', gap: 4 }}>
        {COLORS.slice(0, 8).map((color) => (
          <button
            key={color}
            style={colorButtonStyle(color, currentColor === color)}
            onClick={() => {
              onColorChange(color);
            }}
            title={color}
            aria-label={`Color ${color}`}
          />
        ))}
      </div>

      <div style={dividerStyle} />

      {/* Stroke width */}
      <select
        value={strokeWidth}
        onChange={(e) => {
          onStrokeWidthChange(Number(e.target.value));
        }}
        style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #E5E7EB' }}
      >
        {STROKE_WIDTHS.map((w) => (
          <option key={w} value={w}>
            {w}px
          </option>
        ))}
      </select>

      <div style={dividerStyle} />

      {/* Undo/Redo */}
      <button
        style={buttonStyle(false)}
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
        aria-label="Undo"
      >
        ↩
      </button>
      <button
        style={buttonStyle(false)}
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
        aria-label="Redo"
      >
        ↪
      </button>

      <div style={dividerStyle} />

      {/* Clear */}
      <button
        style={{ ...buttonStyle(false), color: '#EF4444' }}
        onClick={onClear}
        title="Clear All"
        aria-label="Clear All"
      >
        🗑
      </button>
    </div>
  );
};

export const Whiteboard: React.FC<WhiteboardProps> = ({
  socket,
  roomId,
  userId,
  displayName,
  color: userColor,
  width = 800,
  height = 600,
  backgroundColor = '#FFFFFF',
  readOnly = false,
  showToolbar = true,
  showCursors = true,
  cursors,
  onCursorMove,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [currentTool, setCurrentTool] = useState<WhiteboardTool>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [currentPath, setCurrentPath] = useState<Position2D[]>([]);
  const [undoStack, setUndoStack] = useState<WhiteboardElement[][]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardElement[][]>([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    redrawCanvas();
  }, [width, height]);

  // Redraw canvas with all elements
  const redrawCanvas = useCallback(() => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!context || !canvas) return;

    // Clear canvas
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    // Draw all elements
    elements.forEach((element) => {
      context.strokeStyle = element.color;
      context.lineWidth = element.strokeWidth;
      context.globalAlpha = element.opacity ?? 1;

      if (element.type === 'path' && element.points && element.points.length > 0) {
        context.beginPath();
        context.moveTo(element.points[0].x, element.points[0].y);
        element.points.forEach((point) => {
          context.lineTo(point.x, point.y);
        });
        context.stroke();
      } else if (element.type === 'rectangle' && element.x !== undefined) {
        context.strokeRect(element.x, element.y!, element.width!, element.height!);
        if (element.fillColor) {
          context.fillStyle = element.fillColor;
          context.fillRect(element.x, element.y!, element.width!, element.height!);
        }
      } else if (element.type === 'circle' && element.x !== undefined) {
        context.beginPath();
        context.arc(element.x, element.y!, element.radius!, 0, 2 * Math.PI);
        context.stroke();
        if (element.fillColor) {
          context.fillStyle = element.fillColor;
          context.fill();
        }
      } else if (element.type === 'line' && element.points && element.points.length >= 2) {
        context.beginPath();
        context.moveTo(element.points[0].x, element.points[0].y);
        context.lineTo(element.points[1].x, element.points[1].y);
        context.stroke();
      } else if (element.type === 'text' && element.text) {
        context.font = `${element.fontSize || 16}px ${element.fontFamily || 'sans-serif'}`;
        context.fillStyle = element.color;
        context.fillText(element.text, element.x!, element.y!);
      }

      context.globalAlpha = 1;
    });

    // Draw current path
    if (currentPath.length > 0) {
      context.strokeStyle = currentColor;
      context.lineWidth = strokeWidth;
      context.beginPath();
      context.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach((point) => {
        context.lineTo(point.x, point.y);
      });
      context.stroke();
    }
  }, [elements, currentPath, currentColor, strokeWidth, backgroundColor, width, height]);

  // Redraw when elements change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Get position from event
  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent): Position2D => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Start drawing
  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (readOnly) return;
      if (currentTool === 'select') return;

      const position = getPosition(e);
      setIsDrawing(true);
      setCurrentPath([position]);

      // Save state for undo
      setUndoStack((prev) => [...prev, elements]);
      setRedoStack([]);
    },
    [readOnly, currentTool, getPosition, elements]
  );

  // Continue drawing
  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const position = getPosition(e);

      // Broadcast cursor position
      if (onCursorMove) {
        onCursorMove(position);
      }

      if (!isDrawing || readOnly) return;
      if (currentTool === 'select') return;

      if (currentTool === 'pen' || currentTool === 'eraser') {
        setCurrentPath((prev) => [...prev, position]);
      }
    },
    [isDrawing, readOnly, currentTool, getPosition, onCursorMove]
  );

  // End drawing
  const handlePointerUp = useCallback(() => {
    if (!isDrawing || readOnly) return;

    if (currentPath.length > 0 && (currentTool === 'pen' || currentTool === 'eraser')) {
      const newElement: WhiteboardElement = {
        id: `${userId}-${Date.now()}`,
        type: 'path',
        points: currentPath,
        color: currentTool === 'eraser' ? backgroundColor : currentColor,
        strokeWidth: currentTool === 'eraser' ? strokeWidth * 3 : strokeWidth,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setElements((prev) => [...prev, newElement]);

      // Broadcast element
      if (socket?.connected) {
        socket.emit('whiteboard:element', {
          roomId,
          element: newElement,
        });
      }
    }

    setIsDrawing(false);
    setCurrentPath([]);
  }, [
    isDrawing,
    readOnly,
    currentPath,
    currentTool,
    currentColor,
    strokeWidth,
    userId,
    backgroundColor,
    socket,
    roomId,
  ]);

  // Undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previousState = undoStack.at(-1);
    if (!previousState) return;
    setRedoStack((prev) => [...prev, elements]);
    setUndoStack((prev) => prev.slice(0, -1));
    setElements(previousState);
  }, [undoStack, elements]);

  // Redo
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextState = redoStack.at(-1);
    if (!nextState) return;
    setUndoStack((prev) => [...prev, elements]);
    setRedoStack((prev) => prev.slice(0, -1));
    setElements(nextState);
  }, [redoStack, elements]);

  // Clear canvas
  const handleClear = useCallback(() => {
    setUndoStack((prev) => [...prev, elements]);
    setRedoStack([]);
    setElements([]);

    if (socket?.connected) {
      socket.emit('whiteboard:clear', { roomId });
    }
  }, [elements, socket, roomId]);

  // Listen for remote updates
  useEffect(() => {
    if (!socket) return;

    const handleRemoteElement = (data: { element: WhiteboardElement }) => {
      if (data.element.userId === userId) return;

      setElements((prev) => [...prev, data.element]);
    };

    const handleRemoteClear = () => {
      setElements([]);
    };

    socket.on('whiteboard:element', handleRemoteElement);
    socket.on('whiteboard:clear', handleRemoteClear);

    return () => {
      socket.off('whiteboard:element', handleRemoteElement);
      socket.off('whiteboard:clear', handleRemoteClear);
    };
  }, [socket, userId]);

  const getCanvasCursor = (): string => {
    if (currentTool === 'pen') return 'crosshair';
    if (currentTool === 'eraser') return 'cell';
    return 'default';
  };

  const canvasContainerStyle: CSSProperties = {
    position: 'relative',
    width,
    height,
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    cursor: getCanvasCursor(),
  };

  const canvasStyle: CSSProperties = {
    display: 'block',
    touchAction: 'none',
  };

  return (
    <div>
      {showToolbar && !readOnly && (
        <Toolbar
          currentTool={currentTool}
          currentColor={currentColor}
          strokeWidth={strokeWidth}
          onToolChange={setCurrentTool}
          onColorChange={setCurrentColor}
          onStrokeWidthChange={setStrokeWidth}
          onClear={handleClear}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
        />
      )}
      <div style={canvasContainerStyle}>
        <canvas
          ref={canvasRef}
          style={canvasStyle}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        {/* Remote cursors would be rendered here */}
      </div>
    </div>
  );
};
