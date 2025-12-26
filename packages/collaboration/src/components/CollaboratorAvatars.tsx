/**
 * CollaboratorAvatars Component
 *
 * Displays room participants with:
 * - Stacked avatars
 * - Online status indicators
 * - Tooltips with names
 * - Overflow counter
 */

import type { CSSProperties } from 'react';
import React, { useMemo, useState } from 'react';

import type { RoomUser, UserStatus } from '../types';

interface CollaboratorAvatarsProps {
  users: RoomUser[];
  currentUserId: string;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showStatus?: boolean;
  direction?: 'ltr' | 'rtl';
  onClick?: (user: RoomUser) => void;
  getStatus?: (userId: string) => UserStatus;
}

interface AvatarProps {
  user: RoomUser;
  size: number;
  showStatus: boolean;
  status?: UserStatus;
  onClick?: (user: RoomUser) => void;
  zIndex: number;
  offset: number;
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 40,
};

const statusColorMap: Record<UserStatus, string> = {
  online: '#22C55E',
  away: '#F59E0B',
  busy: '#EF4444',
  offline: '#9CA3AF',
};

// Get initials from display name
function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Individual avatar component
const Avatar: React.FC<AvatarProps> = ({
  user,
  size,
  showStatus,
  status = 'online',
  onClick,
  zIndex,
  offset,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [imageError, setImageError] = useState(false);

  const containerStyle: CSSProperties = {
    position: 'relative',
    marginLeft: offset,
    zIndex,
    transition: 'transform 150ms ease',
    cursor: onClick ? 'pointer' : 'default',
  };

  const avatarStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: `2px solid ${user.color || '#ffffff'}`,
    backgroundColor: user.color || '#E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.4,
    fontWeight: 600,
    color: '#ffffff',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    transition: 'transform 150ms ease',
  };

  const imageStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const statusDotStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: size * 0.3,
    height: size * 0.3,
    borderRadius: '50%',
    backgroundColor: statusColorMap[status],
    border: '2px solid white',
  };

  const tooltipStyle: CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 8,
    padding: '4px 8px',
    backgroundColor: '#1F2937',
    color: 'white',
    fontSize: 12,
    borderRadius: 4,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: showTooltip ? 1 : 0,
    transition: 'opacity 150ms ease',
    zIndex: 10000,
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => {
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
      }}
      onClick={() => onClick?.(user)}
    >
      <div style={avatarStyle}>
        {user.avatarUrl && !imageError ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            style={imageStyle}
            onError={() => {
              setImageError(true);
            }}
          />
        ) : (
          <span>{getInitials(user.displayName)}</span>
        )}
      </div>
      {showStatus && <div style={statusDotStyle} />}
      <div style={tooltipStyle}>
        {user.displayName}
        {user.role && ` (${user.role})`}
      </div>
    </div>
  );
};

// Overflow counter
const OverflowCounter: React.FC<{
  count: number;
  size: number;
  users: RoomUser[];
  offset: number;
}> = ({ count, size, users, offset }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const containerStyle: CSSProperties = {
    position: 'relative',
    marginLeft: offset,
    zIndex: 0,
  };

  const counterStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: '#6B7280',
    border: '2px solid white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.35,
    fontWeight: 600,
    color: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  };

  const tooltipStyle: CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 8,
    padding: '8px 12px',
    backgroundColor: '#1F2937',
    color: 'white',
    fontSize: 12,
    borderRadius: 6,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: showTooltip ? 1 : 0,
    transition: 'opacity 150ms ease',
    zIndex: 10000,
    maxWidth: 200,
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => {
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
      }}
    >
      <div style={counterStyle}>+{count}</div>
      <div style={tooltipStyle}>
        {users.map((u) => (
          <div key={u.userId}>{u.displayName}</div>
        ))}
      </div>
    </div>
  );
};

export const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  users,
  currentUserId,
  maxVisible = 5,
  size = 'md',
  showTooltip = true,
  showStatus = true,
  direction = 'ltr',
  onClick,
  getStatus,
}) => {
  const pixelSize = sizeMap[size];
  const overlap = pixelSize * 0.3;

  // Filter out current user and sort by join time
  const sortedUsers = useMemo(() => {
    return users
      .filter((u) => u.userId !== currentUserId)
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
  }, [users, currentUserId]);

  const visibleUsers = sortedUsers.slice(0, maxVisible);
  const overflowUsers = sortedUsers.slice(maxVisible);
  const overflowCount = overflowUsers.length;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
    alignItems: 'center',
  };

  return (
    <div style={containerStyle} role="group" aria-label="Collaborators">
      {visibleUsers.map((user, index) => (
        <Avatar
          key={user.userId}
          user={user}
          size={pixelSize}
          showStatus={showStatus}
          status={getStatus?.(user.userId)}
          onClick={onClick}
          zIndex={visibleUsers.length - index}
          offset={index === 0 ? 0 : -overlap}
        />
      ))}
      {overflowCount > 0 && (
        <OverflowCounter
          count={overflowCount}
          size={pixelSize}
          users={overflowUsers}
          offset={-overlap}
        />
      )}
    </div>
  );
};
