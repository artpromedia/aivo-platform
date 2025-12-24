/**
 * Collaborative Cursors Component
 *
 * Renders cursor positions for all users in a collaborative editing session.
 * Features:
 * - Real-time cursor tracking
 * - User color coding
 * - Name labels
 * - Fade out for inactive cursors
 */

import React, { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { cn } from '@/lib/utils';

interface CursorData {
  userId: string;
  displayName: string;
  position: { x: number; y: number };
  color: string;
  lastUpdate: number;
}

interface CollaborativeCursorsProps {
  documentId: string;
  roomId: string;
  containerRef: React.RefObject<HTMLElement>;
  showLabels?: boolean;
  fadeTimeout?: number;
  className?: string;
}

/**
 * Collaborative Cursors Component
 */
export function CollaborativeCursors({
  documentId,
  roomId,
  containerRef,
  showLabels = true,
  fadeTimeout = 5000,
  className,
}: CollaborativeCursorsProps) {
  const { isConnected, on, emit } = useWebSocket({ autoConnect: false });
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());
  const animationRef = useRef<number>();
  const lastEmitRef = useRef<number>(0);
  const THROTTLE_MS = 50;

  // Handle incoming cursor updates
  useEffect(() => {
    if (!isConnected) return;

    const unsub = on(
      'collab:cursor',
      (data: unknown) => {
        const cursorData = data as {
          userId: string;
          displayName: string;
          documentId: string;
          cursor: { position: number };
          color: string;
        };

        if (cursorData.documentId !== documentId) return;

        // Convert document position to screen coordinates
        const screenPosition = convertToScreenPosition(
          cursorData.cursor.position,
          containerRef.current
        );

        setCursors((prev) => {
          const next = new Map(prev);
          next.set(cursorData.userId, {
            userId: cursorData.userId,
            displayName: cursorData.displayName,
            position: screenPosition,
            color: cursorData.color,
            lastUpdate: Date.now(),
          });
          return next;
        });
      }
    );

    return unsub;
  }, [isConnected, documentId, on, containerRef]);

  // Track local cursor and emit updates
  useEffect(() => {
    if (!isConnected || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastEmitRef.current < THROTTLE_MS) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if cursor is within container
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      // Convert screen position to document position
      const documentPosition = convertToDocumentPosition({ x, y }, container);

      emit('collab:cursor', {
        roomId,
        documentId,
        cursor: { position: documentPosition },
      });

      lastEmitRef.current = now;
    };

    const container = containerRef.current;
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isConnected, containerRef, roomId, documentId, emit]);

  // Fade out inactive cursors
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      setCursors((prev) => {
        const next = new Map(prev);
        for (const [userId, cursor] of next) {
          if (now - cursor.lastUpdate > fadeTimeout) {
            next.delete(userId);
          }
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(cleanup);
    };

    animationRef.current = requestAnimationFrame(cleanup);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fadeTimeout]);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden z-50',
        className
      )}
    >
      {Array.from(cursors.values()).map((cursor) => {
        const opacity = Math.max(
          0,
          1 - (Date.now() - cursor.lastUpdate) / fadeTimeout
        );

        return (
          <div
            key={cursor.userId}
            className="absolute transition-all duration-75 ease-out"
            style={{
              left: cursor.position.x,
              top: cursor.position.y,
              opacity,
            }}
          >
            {/* Cursor pointer */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-md"
            >
              <path
                d="M5.65376 12.4563L11.9998 3L18.346 12.4563L11.9998 9.67376L5.65376 12.4563Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>

            {/* Name label */}
            {showLabels && (
              <div
                className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-sm"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.displayName}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Convert document position to screen coordinates
 * This is a placeholder - adapt based on your editor implementation
 */
function convertToScreenPosition(
  documentPosition: number,
  container: HTMLElement | null
): { x: number; y: number } {
  if (!container) return { x: 0, y: 0 };

  // Example: assuming a simple text editor with fixed line height
  const lineHeight = 20;
  const charWidth = 8;
  const charsPerLine = 80;
  const line = Math.floor(documentPosition / charsPerLine);
  const col = documentPosition % charsPerLine;

  return {
    x: col * charWidth,
    y: line * lineHeight,
  };
}

/**
 * Convert screen position to document position
 * This is a placeholder - adapt based on your editor implementation
 */
function convertToDocumentPosition(
  screenPosition: { x: number; y: number },
  _container: HTMLElement
): number {
  const lineHeight = 20;
  const charWidth = 8;
  const charsPerLine = 80;
  const line = Math.floor(screenPosition.y / lineHeight);
  const col = Math.floor(screenPosition.x / charWidth);

  return line * charsPerLine + col;
}
