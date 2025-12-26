/**
 * LiveCursors Component
 *
 * Renders collaborator cursors with:
 * - Smooth animations
 * - User labels
 * - Auto-fade on inactivity
 */

import type { CSSProperties } from 'react';
import React, { useEffect, useState, useMemo } from 'react';

import type { CursorData, Position2D } from '../types';

interface LiveCursorsProps {
  cursors: Map<string, CursorData>;
  currentUserId: string;
  containerRef?: React.RefObject<HTMLElement>;
  cursorFadeMs?: number;
  showLabels?: boolean;
  labelPosition?: 'top' | 'bottom';
  cursorStyle?: 'arrow' | 'pointer' | 'dot';
}

interface CursorProps {
  cursor: CursorData;
  showLabel: boolean;
  labelPosition: 'top' | 'bottom';
  cursorStyle: 'arrow' | 'pointer' | 'dot';
  isStale: boolean;
}

// SVG Arrow cursor
const ArrowCursor: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
  >
    <path
      d="M5.65376 3.35376L18.6538 11.3538C19.0538 11.6538 19.0538 12.3538 18.6538 12.6538L13.6538 15.1538L11.1538 20.1538C10.8538 20.5538 10.1538 20.5538 9.85376 20.1538L5.35376 4.35376C5.15376 3.75376 5.25376 3.45376 5.65376 3.35376Z"
      fill={color}
      stroke="white"
      strokeWidth="1.5"
    />
  </svg>
);

// Simple dot cursor
const DotCursor: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{
      width: 12,
      height: 12,
      borderRadius: '50%',
      backgroundColor: color,
      border: '2px solid white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }}
  />
);

// Individual cursor component
const Cursor: React.FC<CursorProps> = ({
  cursor,
  showLabel,
  labelPosition,
  cursorStyle,
  isStale,
}) => {
  const position = cursor.position as Position2D;

  const containerStyle: CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    pointerEvents: 'none',
    zIndex: 9999,
    transition: 'transform 50ms linear, opacity 300ms ease',
    transform: 'translate(-2px, -2px)',
    opacity: isStale ? 0.4 : 1,
  };

  const labelStyle: CSSProperties = {
    position: 'absolute',
    left: cursorStyle === 'arrow' ? 16 : 8,
    [labelPosition === 'top' ? 'bottom' : 'top']: cursorStyle === 'arrow' ? 4 : -4,
    backgroundColor: cursor.color,
    color: 'white',
    fontSize: 11,
    fontWeight: 500,
    padding: '2px 6px',
    borderRadius: 4,
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    maxWidth: 120,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div style={containerStyle} data-cursor-id={cursor.userId}>
      {cursorStyle === 'arrow' && <ArrowCursor color={cursor.color} />}
      {cursorStyle === 'pointer' && <ArrowCursor color={cursor.color} />}
      {cursorStyle === 'dot' && <DotCursor color={cursor.color} />}
      {showLabel && <div style={labelStyle}>{cursor.displayName}</div>}
    </div>
  );
};

export const LiveCursors: React.FC<LiveCursorsProps> = ({
  cursors,
  currentUserId,
  containerRef,
  cursorFadeMs = 5000,
  showLabels = true,
  labelPosition = 'bottom',
  cursorStyle = 'arrow',
}) => {
  const [now, setNow] = useState(Date.now());

  // Update time every second for staleness check
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Filter out current user and get visible cursors
  const visibleCursors = useMemo(() => {
    const result: { cursor: CursorData; isStale: boolean }[] = [];

    cursors.forEach((cursor) => {
      if (cursor.userId === currentUserId) return;

      const age = now - cursor.timestamp;
      const isStale = age > cursorFadeMs;
      const isExpired = age > cursorFadeMs * 2;

      if (!isExpired) {
        result.push({ cursor, isStale });
      }
    });

    return result;
  }, [cursors, currentUserId, now, cursorFadeMs]);

  // Get container bounds for clipping (reserved for future clipping implementation)
  const _containerBounds = useMemo(() => {
    if (!containerRef?.current) return null;
    return containerRef.current.getBoundingClientRect();
  }, [containerRef]);

  const wrapperStyle: CSSProperties = {
    position: containerRef ? 'absolute' : 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    zIndex: 9998,
  };

  return (
    <div style={wrapperStyle} aria-hidden="true">
      {visibleCursors.map(({ cursor, isStale }) => (
        <Cursor
          key={cursor.userId}
          cursor={cursor}
          showLabel={showLabels}
          labelPosition={labelPosition}
          cursorStyle={cursorStyle}
          isStale={isStale}
        />
      ))}
    </div>
  );
};
