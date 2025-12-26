/**
 * SyncIndicator Component
 *
 * Shows document sync status with:
 * - Synced state
 * - Pending changes
 * - Last sync time
 */

import type { CSSProperties } from 'react';
import React from 'react';

import type { SyncState } from '../types';

interface SyncIndicatorProps {
  syncState: SyncState;
  showVersion?: boolean;
  showLastSync?: boolean;
}

function formatLastSync(date: Date | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 5) return 'Just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  return date.toLocaleTimeString();
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  syncState,
  showVersion = false,
  showLastSync = true,
}) => {
  const { synced, pending, version, lastSync } = syncState;

  const getStatusConfig = (): { color: string; icon: string; text: string } => {
    if (pending) {
      return { color: '#F59E0B', icon: '◐', text: 'Saving...' };
    }
    if (synced) {
      return { color: '#22C55E', icon: '✓', text: 'Saved' };
    }
    return { color: '#9CA3AF', icon: '○', text: 'Not synced' };
  };

  const config = getStatusConfig();

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#6B7280',
  };

  const iconStyle: CSSProperties = {
    color: config.color,
    fontSize: 14,
    animation: pending ? 'spin 1s linear infinite' : 'none',
  };

  const textStyle: CSSProperties = {
    color: config.color,
  };

  const metaStyle: CSSProperties = {
    color: '#9CA3AF',
    fontSize: 12,
  };

  return (
    <output style={containerStyle} aria-live="polite">
      <span style={iconStyle}>{config.icon}</span>
      <span style={textStyle}>{config.text}</span>
      {showLastSync && lastSync && <span style={metaStyle}>• {formatLastSync(lastSync)}</span>}
      {showVersion && version > 0 && <span style={metaStyle}>• v{version}</span>}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </output>
  );
};
