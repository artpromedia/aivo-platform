/**
 * ConnectionStatus Component
 *
 * Displays connection state with:
 * - Visual indicator
 * - Reconnection progress
 * - Latency display
 */

import React, { CSSProperties } from 'react';
import type { ConnectionState } from '../types';

interface ConnectionStatusProps {
  state: ConnectionState;
  latency?: number;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  showLatency?: boolean;
  showText?: boolean;
  position?: 'inline' | 'fixed-bottom' | 'fixed-top';
}

const stateConfig: Record<ConnectionState, { color: string; text: string; icon: string }> = {
  connecting: {
    color: '#F59E0B',
    text: 'Connecting...',
    icon: '◐',
  },
  connected: {
    color: '#22C55E',
    text: 'Connected',
    icon: '●',
  },
  reconnecting: {
    color: '#F59E0B',
    text: 'Reconnecting...',
    icon: '◐',
  },
  disconnected: {
    color: '#9CA3AF',
    text: 'Disconnected',
    icon: '○',
  },
  error: {
    color: '#EF4444',
    text: 'Connection Error',
    icon: '✕',
  },
};

function getLatencyLabel(latency: number): { text: string; color: string } {
  if (latency < 100) return { text: 'Excellent', color: '#22C55E' };
  if (latency < 200) return { text: 'Good', color: '#84CC16' };
  if (latency < 500) return { text: 'Fair', color: '#F59E0B' };
  return { text: 'Poor', color: '#EF4444' };
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  state,
  latency,
  reconnectAttempt,
  maxReconnectAttempts = 10,
  showLatency = true,
  showText = true,
  position = 'inline',
}) => {
  const config = stateConfig[state];
  const latencyInfo = latency !== undefined ? getLatencyLabel(latency) : null;

  const getPositionStyles = (): CSSProperties => {
    if (position === 'fixed-bottom') {
      return {
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
      };
    }
    if (position === 'fixed-top') {
      return {
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
      };
    }
    return {};
  };

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: position === 'inline' ? 0 : '8px 16px',
    backgroundColor: position === 'inline' ? 'transparent' : 'white',
    borderRadius: 8,
    boxShadow: position === 'inline' ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
    ...getPositionStyles(),
  };

  const iconStyle: CSSProperties = {
    color: config.color,
    fontSize: 14,
    animation: state === 'connecting' || state === 'reconnecting' ? 'spin 1s linear infinite' : 'none',
  };

  const textStyle: CSSProperties = {
    fontSize: 13,
    color: '#374151',
    fontWeight: 500,
  };

  const latencyStyle: CSSProperties = {
    fontSize: 12,
    color: latencyInfo?.color || '#6B7280',
    marginLeft: 8,
    paddingLeft: 8,
    borderLeft: '1px solid #E5E7EB',
  };

  const reconnectStyle: CSSProperties = {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
  };

  return (
    <div style={containerStyle} role="status" aria-live="polite">
      <span style={iconStyle}>{config.icon}</span>
      {showText && (
        <span style={textStyle}>
          {config.text}
          {state === 'reconnecting' && reconnectAttempt !== undefined && (
            <span style={reconnectStyle}>
              ({reconnectAttempt}/{maxReconnectAttempts})
            </span>
          )}
        </span>
      )}
      {showLatency && latency !== undefined && state === 'connected' && (
        <span style={latencyStyle}>
          {latency}ms ({latencyInfo?.text})
        </span>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
