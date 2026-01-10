'use client';

import { Bell } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../utils/cn';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface NotificationBadgeProps {
  /**
   * Number of unread notifications
   */
  count: number;
  /**
   * Maximum number to display before showing "99+"
   */
  max?: number;
  /**
   * Whether to show a dot instead of count when there are unread notifications
   */
  dot?: boolean;
  /**
   * Whether the badge should animate
   */
  animate?: boolean;
  /**
   * Size of the badge
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Custom icon to use instead of bell
   */
  icon?: React.ReactNode;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Aria label for accessibility
   */
  ariaLabel?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getAriaLabel(hasUnread: boolean, count: number): string {
  if (hasUnread) {
    return `Notifications (${count} unread)`;
  }
  return 'Notifications';
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Notification Badge Component
 *
 * Displays a notification bell icon with an unread count badge.
 */
export function NotificationBadge({
  count,
  max = 99,
  dot = false,
  animate = true,
  size = 'md',
  icon,
  onClick,
  className,
  ariaLabel,
}: Readonly<NotificationBadgeProps>) {
  const hasUnread = count > 0;
  const displayCount = count > max ? `${max}+` : count.toString();

  const sizeClasses = {
    sm: {
      button: 'h-8 w-8',
      icon: 'h-4 w-4',
      badge: 'h-4 min-w-4 text-[10px] -top-0.5 -right-0.5',
      dot: 'h-2 w-2 -top-0.5 -right-0.5',
    },
    md: {
      button: 'h-10 w-10',
      icon: 'h-5 w-5',
      badge: 'h-5 min-w-5 text-xs -top-1 -right-1',
      dot: 'h-2.5 w-2.5 -top-0.5 -right-0.5',
    },
    lg: {
      button: 'h-12 w-12',
      icon: 'h-6 w-6',
      badge: 'h-6 min-w-6 text-sm -top-1 -right-1',
      dot: 'h-3 w-3 -top-0.5 -right-0.5',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex items-center justify-center rounded-full',
        'bg-transparent hover:bg-muted transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        sizes.button,
        className
      )}
      onClick={onClick}
      aria-label={ariaLabel ?? getAriaLabel(hasUnread, count)}
    >
      {/* Icon */}
      {icon ?? <Bell className={cn(sizes.icon, hasUnread && 'text-primary')} />}

      {/* Badge */}
      {hasUnread &&
        (dot ? (
          <span
            className={cn(
              'absolute rounded-full bg-destructive',
              sizes.dot,
              animate && 'animate-pulse'
            )}
          />
        ) : (
          <span
            className={cn(
              'absolute flex items-center justify-center',
              'rounded-full bg-destructive text-destructive-foreground font-medium',
              'px-1',
              sizes.badge,
              animate && count > 0 && 'animate-in zoom-in-50 duration-300'
            )}
          >
            {displayCount}
          </span>
        ))}
    </button>
  );
}
