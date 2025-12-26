/**
 * TypingIndicator Component
 *
 * Shows who is currently typing with:
 * - Animated dots
 * - User names
 */

import type { CSSProperties } from 'react';
import React from 'react';

import type { TypingUser } from '../types';

interface TypingIndicatorProps {
  users: TypingUser[];
  maxNames?: number;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users, maxNames = 3 }) => {
  if (users.length === 0) return null;

  const getTypingText = (): string => {
    if (users.length === 1) {
      return `${users[0].displayName} is typing`;
    }
    if (users.length <= maxNames) {
      const names = users.map((u) => u.displayName);
      const lastPerson = names.pop();
      return `${names.join(', ')} and ${lastPerson} are typing`;
    }
    const shown = users.slice(0, maxNames - 1).map((u) => u.displayName);
    const remaining = users.length - (maxNames - 1);
    return `${shown.join(', ')} and ${remaining} others are typing`;
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 8px',
    fontSize: 13,
    color: '#6B7280',
  };

  const dotsContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  };

  const dotStyle: CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#9CA3AF',
  };

  return (
    <div style={containerStyle}>
      <div style={dotsContainerStyle}>
        <div style={{ ...dotStyle, animation: 'bounce 1.4s infinite ease-in-out' }} />
        <div style={{ ...dotStyle, animation: 'bounce 1.4s infinite ease-in-out 0.2s' }} />
        <div style={{ ...dotStyle, animation: 'bounce 1.4s infinite ease-in-out 0.4s' }} />
      </div>
      <span>{getTypingText()}</span>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};
