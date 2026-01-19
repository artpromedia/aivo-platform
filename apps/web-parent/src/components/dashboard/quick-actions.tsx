'use client';

import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Calendar,
  Settings,
  Download,
  Bell,
  BookOpen,
  Target,
  Award,
  Clock,
  Users,
  Shield,
  CreditCard,
  HelpCircle,
  Gift,
  Sparkles,
} from 'lucide-react';

export interface QuickAction {
  id: string;
  icon: typeof MessageSquare;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  badge?: string;
  badgeColor?: 'red' | 'green' | 'blue' | 'amber';
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

interface QuickActionsProps {
  childId: string;
  childName?: string;
  unreadMessages?: number;
  pendingApprovals?: number;
  onDownloadReport?: () => void;
  onScheduleSession?: () => void;
  onContactTeacher?: () => void;
  customActions?: QuickAction[];
}

const badgeColors = {
  red: 'bg-red-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
};

const variantStyles = {
  default: 'bg-gray-50 hover:bg-gray-100 text-gray-700',
  primary: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700',
  success: 'bg-green-50 hover:bg-green-100 text-green-700',
  warning: 'bg-amber-50 hover:bg-amber-100 text-amber-700',
};

export function QuickActions({
  childId,
  childName,
  unreadMessages = 0,
  pendingApprovals = 0,
  onDownloadReport,
  onScheduleSession,
  onContactTeacher,
  customActions = [],
}: QuickActionsProps) {
  const router = useRouter();

  const defaultActions: QuickAction[] = [
    {
      id: 'messages',
      icon: MessageSquare,
      label: 'Messages',
      description: 'View conversations',
      href: '/messages',
      badge: unreadMessages > 0 ? String(unreadMessages) : undefined,
      badgeColor: 'red',
    },
    {
      id: 'schedule',
      icon: Calendar,
      label: 'Schedule Session',
      description: 'Set learning time',
      onClick: onScheduleSession,
      variant: 'primary',
    },
    {
      id: 'report',
      icon: Download,
      label: 'Download Report',
      description: 'Get progress PDF',
      onClick: onDownloadReport,
    },
    {
      id: 'contact-teacher',
      icon: Users,
      label: 'Contact Teacher',
      description: 'Send a message',
      onClick: onContactTeacher,
    },
    {
      id: 'achievements',
      icon: Award,
      label: 'Achievements',
      description: 'View badges & rewards',
      href: '/achievements',
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Learning Settings',
      description: 'Configure preferences',
      href: '/settings',
    },
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifications',
      description: 'Manage alerts',
      href: '/settings?tab=notifications',
      badge: pendingApprovals > 0 ? String(pendingApprovals) : undefined,
      badgeColor: 'amber',
    },
    {
      id: 'resources',
      icon: BookOpen,
      label: 'Resource Library',
      description: 'Learning materials',
      href: '/resource-library',
    },
  ];

  const allActions = [...defaultActions, ...customActions];

  const handleActionClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <Sparkles className="w-5 h-5 text-amber-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {allActions.slice(0, 8).map((action) => {
          const Icon = action.icon;
          const variant = action.variant || 'default';

          return (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`relative flex flex-col items-center p-4 rounded-lg transition-all ${variantStyles[variant]} group`}
            >
              {/* Badge */}
              {action.badge && (
                <span
                  className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-full ${
                    badgeColors[action.badgeColor || 'red']
                  }`}
                >
                  {action.badge}
                </span>
              )}

              <Icon className="w-6 h-6 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-sm font-medium text-center">{action.label}</span>
              {action.description && (
                <span className="text-xs text-gray-500 text-center mt-0.5 hidden sm:block">
                  {action.description}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Additional Links */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => router.push('/billing')}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <CreditCard className="w-3 h-3" />
            Billing
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => router.push('/consent')}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <Shield className="w-3 h-3" />
            Privacy
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => router.push('/community-support')}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <HelpCircle className="w-3 h-3" />
            Help
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => router.push('/refer')}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <Gift className="w-3 h-3" />
            Refer a Friend
          </button>
        </div>
      </div>
    </div>
  );
}
