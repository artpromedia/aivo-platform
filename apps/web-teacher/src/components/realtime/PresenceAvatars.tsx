/**
 * Presence Avatars Component
 *
 * Displays a row of user avatars showing who's online in a room.
 * Features:
 * - Status indicators (online/away/busy)
 * - Overflow handling
 * - Tooltips with user details
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { UserPresence } from '@/hooks/use-presence';

interface PresenceAvatarsProps {
  presences: Map<string, UserPresence>;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
};

/**
 * Get initials from display name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Presence Avatars Component
 */
export function PresenceAvatars({
  presences,
  maxVisible = 5,
  size = 'md',
  showStatus = true,
  className,
}: PresenceAvatarsProps) {
  const sortedPresences = useMemo(() => {
    return Array.from(presences.values())
      .filter((p) => p.status !== 'offline')
      .sort((a, b) => {
        // Online users first
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (b.status === 'online' && a.status !== 'online') return 1;
        return 0;
      });
  }, [presences]);

  const visiblePresences = sortedPresences.slice(0, maxVisible);
  const overflowCount = sortedPresences.length - maxVisible;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visiblePresences.map((presence) => (
        <div
          key={presence.userId}
          className="relative group"
          title={`${presence.displayName} (${presence.status})`}
        >
          {/* Avatar */}
          <div
            className={cn(
              sizeClasses[size],
              'flex items-center justify-center rounded-full border-2 border-background font-medium text-white transition-transform hover:scale-110 hover:z-10',
              'cursor-default'
            )}
            style={{ backgroundColor: presence.color || '#6B7280' }}
          >
            {presence.avatar ? (
              <img
                src={presence.avatar}
                alt={presence.displayName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              getInitials(presence.displayName)
            )}
          </div>

          {/* Status indicator */}
          {showStatus && (
            <span
              className={cn(
                'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
                size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
                statusColors[presence.status] || statusColors.offline
              )}
            />
          )}

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            <p className="font-medium">{presence.displayName}</p>
            <p className="text-gray-300 capitalize">{presence.status}</p>
            {presence.device && (
              <p className="text-gray-400">on {presence.device}</p>
            )}
          </div>
        </div>
      ))}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <div
          className={cn(
            sizeClasses[size],
            'flex items-center justify-center rounded-full border-2 border-background bg-gray-200 text-gray-600 font-medium'
          )}
          title={`${overflowCount} more online`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
