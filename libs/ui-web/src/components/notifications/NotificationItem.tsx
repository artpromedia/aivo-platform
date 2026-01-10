'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Archive,
  Award,
  Bell,
  BookOpen,
  Calendar,
  Check,
  FileText,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Target,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '../../utils/cn';
import { Button } from '../button';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  isDismissed: boolean;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  groupKey?: string;
  createdAt: Date;
}

export interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  onMarkAsRead?: () => void;
  onDismiss?: () => void;
  onDelete?: () => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ICON MAPPING
// ══════════════════════════════════════════════════════════════════════════════

const typeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  // Learning
  ACHIEVEMENT: { icon: Award, color: 'text-yellow-500' },
  SESSION_SUMMARY: { icon: BookOpen, color: 'text-green-500' },
  REMINDER: { icon: Calendar, color: 'text-blue-500' },
  GOAL_UPDATE: { icon: Target, color: 'text-purple-500' },

  // Assessments
  'assessment.assigned': { icon: FileText, color: 'text-purple-500' },
  'assessment.graded': { icon: FileText, color: 'text-green-500' },
  'assessment.due_soon': { icon: FileText, color: 'text-orange-500' },

  // Social
  MESSAGE: { icon: MessageCircle, color: 'text-blue-500' },
  'comment.new': { icon: MessageCircle, color: 'text-blue-500' },
  'comment.reply': { icon: MessageCircle, color: 'text-blue-500' },
  mention: { icon: MessageCircle, color: 'text-purple-500' },

  // Streaks
  'streak.milestone': { icon: Zap, color: 'text-orange-500' },
  'streak.at_risk': { icon: AlertTriangle, color: 'text-red-500' },

  // Class
  'class.announcement': { icon: Megaphone, color: 'text-blue-500' },
  'class.assignment': { icon: FileText, color: 'text-purple-500' },

  // System
  SYSTEM: { icon: Bell, color: 'text-gray-500' },
  ALERT: { icon: AlertTriangle, color: 'text-red-500' },
  CONSENT_REQUEST: { icon: Users, color: 'text-blue-500' },
};

const defaultIcon: { icon: React.ElementType; color: string } = {
  icon: Bell,
  color: 'text-gray-500',
};

function getIconForType(type: string): { icon: React.ElementType; color: string } {
  return typeIcons[type] ?? defaultIcon;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Notification Item Component
 *
 * Displays a single notification with:
 * - Type-specific icon
 * - Title and body
 * - Time ago
 * - Read/unread indicator
 * - Action menu
 */
export function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
  onDismiss,
  onDelete,
  className,
}: Readonly<NotificationItemProps>) {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const { icon: IconComponent, color } = getIconForType(notification.type);
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAction = (action: (() => void) | undefined) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (action) {
      action();
    }
  };

  return (
    <button
      type="button"
      className={cn(
        'flex items-start gap-3 p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors relative w-full text-left',
        !notification.isRead && 'bg-primary/5',
        notification.priority === 'URGENT' && 'border-l-4 border-l-red-500',
        notification.priority === 'HIGH' && 'border-l-4 border-l-orange-500',
        className
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <div className={cn('p-2 rounded-full', notification.isRead ? 'bg-muted' : 'bg-primary/10')}>
          <IconComponent className={cn('h-5 w-5', color)} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm line-clamp-1', !notification.isRead && 'font-medium')}>
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>
          </div>

          {/* Unread indicator */}
          {!notification.isRead && (
            <div className="flex-shrink-0 mt-1.5">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>

      {/* Actions Menu */}
      <div className="flex-shrink-0 relative" ref={menuRef}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleMenuClick}
          aria-label="Notification actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-popover border rounded-md shadow-lg z-50">
            {!notification.isRead && onMarkAsRead && (
              <button
                className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={handleAction(onMarkAsRead)}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark as read
              </button>
            )}
            {onDismiss && (
              <button
                className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={handleAction(onDismiss)}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </button>
            )}
            {onDelete && (
              <button
                className="flex items-center w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                onClick={handleAction(onDelete)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
