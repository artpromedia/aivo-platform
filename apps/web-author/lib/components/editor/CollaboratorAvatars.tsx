/**
 * CollaboratorAvatars Component
 *
 * Display avatars of current collaborators editing the same content.
 */

'use client';

import Image from 'next/image';
import React, { useMemo } from 'react';

import type { Collaborator } from '../../api/collaboration';
import { getUserColor, getUserInitials } from '../../api/collaboration';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CollaboratorAvatarsProps {
  readonly collaborators: Collaborator[];
  readonly maxVisible?: number;
  readonly size?: 'sm' | 'md' | 'lg';
}

// ══════════════════════════════════════════════════════════════════════════════
// SIZE CONFIGS
// ══════════════════════════════════════════════════════════════════════════════

const SIZE_CLASSES = {
  sm: {
    avatar: 'w-6 h-6 text-xs',
    ring: 'ring-1',
    overlap: '-space-x-2',
  },
  md: {
    avatar: 'w-8 h-8 text-sm',
    ring: 'ring-2',
    overlap: '-space-x-2.5',
  },
  lg: {
    avatar: 'w-10 h-10 text-base',
    ring: 'ring-2',
    overlap: '-space-x-3',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function CollaboratorAvatars({
  collaborators,
  maxVisible = 4,
  size = 'md',
}: CollaboratorAvatarsProps) {
  const sizeConfig = SIZE_CLASSES[size];

  // Filter to only online collaborators and limit to maxVisible
  const visibleCollaborators = useMemo(() => {
    const online = collaborators.filter((c) => c.isOnline);
    return online.slice(0, maxVisible);
  }, [collaborators, maxVisible]);

  const overflowCount = useMemo(() => {
    const online = collaborators.filter((c) => c.isOnline);
    return Math.max(0, online.length - maxVisible);
  }, [collaborators, maxVisible]);

  if (visibleCollaborators.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center ${sizeConfig.overlap}`}>
      {visibleCollaborators.map((collaborator) => (
        <div
          key={collaborator.userId}
          className={`
            relative ${sizeConfig.avatar} rounded-full flex items-center justify-center 
            font-medium text-white ${sizeConfig.ring} ring-white
            cursor-default transition-transform hover:scale-110 hover:z-10
          `}
          style={{ backgroundColor: getUserColor(collaborator.userId) }}
          title={`${collaborator.userName}${collaborator.currentBlockId ? ' (editing)' : ''}`}
        >
          {collaborator.avatarUrl ? (
            <Image
              src={collaborator.avatarUrl}
              alt={collaborator.userName}
              fill
              className="rounded-full object-cover"
            />
          ) : (
            getUserInitials(collaborator.userName)
          )}

          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
        </div>
      ))}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <div
          className={`
            ${sizeConfig.avatar} rounded-full flex items-center justify-center 
            font-medium bg-gray-200 text-gray-600 ${sizeConfig.ring} ring-white
          `}
          title={`${overflowCount} more collaborator${overflowCount > 1 ? 's' : ''}`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}

export default CollaboratorAvatars;
