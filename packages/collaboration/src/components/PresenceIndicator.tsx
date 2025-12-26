/**
 * PresenceIndicator Component
 *
 * Shows user presence status with:
 * - Status dot
 * - Status text
 * - Last seen time
 */

import type { CSSProperties } from 'react';
import React from 'react';

import type { UserStatus } from '../types';

interface PresenceIndicatorProps {
  status: UserStatus;
  customStatus?: string;
  lastSeen?: Date;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusColorMap: Record<UserStatus, string> = {
  online: '#22C55E',
  away: '#F59E0B',
  busy: '#EF4444',
  offline: '#9CA3AF',
};

const statusTextMap: Record<UserStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
};

const sizeMap = {
  sm: 8,
  md: 10,
  lg: 12,
};

function formatLastSeen(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  status,
  customStatus,
  lastSeen,
  showText = false,
  size = 'md',
}) => {
  const dotSize = sizeMap[size];

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };

  const dotStyle: CSSProperties = {
    width: dotSize,
    height: dotSize,
    borderRadius: '50%',
    backgroundColor: statusColorMap[status],
    flexShrink: 0,
    ...(status === 'online' && {
      animation: 'pulse 2s infinite',
    }),
  };

  const textStyle: CSSProperties = {
    fontSize: size === 'sm' ? 11 : size === 'md' ? 12 : 14,
    color: '#6B7280',
  };

  const customStatusStyle: CSSProperties = {
    fontSize: size === 'sm' ? 10 : size === 'md' ? 11 : 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  };

  return (
    <div style={containerStyle}>
      <div style={dotStyle} />
      {showText && (
        <div>
          <span style={textStyle}>
            {statusTextMap[status]}
            {status === 'offline' && lastSeen && ` • ${formatLastSeen(lastSeen)}`}
          </span>
          {customStatus && <span style={customStatusStyle}> • {customStatus}</span>}
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
