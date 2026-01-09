/**
 * Header Component
 *
 * Top navigation bar with search, notifications, and user menu
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  className?: string;
}

export function Header({ title, className }: HeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowNotifications(false);
      setShowUserMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to search results page with query
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6',
        className
      )}
    >
      {/* Page Title */}
      <div className="flex items-center gap-4">
        {title && <h1 className="text-xl font-semibold text-gray-900">{title}</h1>}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="hidden md:block">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder="Search students, classes, assignments..."
            className="w-80 rounded-lg border bg-gray-50 py-2 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Add */}
        <QuickAddButton />

        {/* Notifications */}
        <div
          className="relative"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
            }}
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Notifications"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              5
            </span>
          </button>

          {showNotifications && (
            <NotificationsDropdown
              onClose={() => {
                setShowNotifications(false);
              }}
            />
          )}
        </div>

        {/* User Menu */}
        <div
          className="relative"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
            }}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
              JD
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-gray-900">Jane Doe</p>
              <p className="text-xs text-gray-500">Math Teacher</p>
            </div>
            <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {showUserMenu && (
            <UserMenuDropdown
              onClose={() => {
                setShowUserMenu(false);
              }}
            />
          )}
        </div>
      </div>
    </header>
  );
}

function QuickAddButton() {
  const [showMenu, setShowMenu] = React.useState(false);

  const quickActions = [
    { label: 'New Assignment', href: '/assignments/new', icon: '📝' },
    { label: 'Add Student', href: '/students/new', icon: '👤' },
    { label: 'Schedule Event', href: '/calendar/new', icon: '📅' },
    { label: 'Send Message', href: '/messages/new', icon: '✉️' },
    { label: 'Create Report', href: '/reports/new', icon: '📊' },
  ];

  return (
    <div
      className="relative"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <button
        onClick={() => {
          setShowMenu(!showMenu);
        }}
        className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline">Quick Add</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-white py-1 shadow-lg">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => {
                setShowMenu(false);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface DropdownProps {
  onClose: () => void;
}

function NotificationsDropdown({ onClose }: DropdownProps) {
  const notifications = [
    {
      id: '1',
      type: 'submission',
      title: 'New submission',
      message: 'Alex Smith submitted "Math Quiz 5"',
      time: '2 min ago',
      unread: true,
    },
    {
      id: '2',
      type: 'message',
      title: 'New message',
      message: 'Parent Sarah Johnson sent you a message',
      time: '15 min ago',
      unread: true,
    },
    {
      id: '3',
      type: 'reminder',
      title: 'Grading reminder',
      message: '5 assignments need grading by tomorrow',
      time: '1 hour ago',
      unread: true,
    },
    {
      id: '4',
      type: 'alert',
      title: 'Student alert',
      message: 'Michael Davis has 3 missing assignments',
      time: '2 hours ago',
      unread: false,
    },
    {
      id: '5',
      type: 'system',
      title: 'Report ready',
      message: 'Your class progress report is ready',
      time: '3 hours ago',
      unread: false,
    },
  ];

  return (
    <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-white shadow-lg">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-medium text-gray-900">Notifications</h3>
        <button className="text-sm text-primary-600 hover:text-primary-700">Mark all read</button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              'flex gap-3 border-b px-4 py-3 hover:bg-gray-50',
              notification.unread && 'bg-primary-50/50'
            )}
          >
            <div
              className={cn(
                'mt-1 h-2 w-2 rounded-full',
                notification.unread ? 'bg-primary-600' : 'bg-transparent'
              )}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
              <p className="text-sm text-gray-600">{notification.message}</p>
              <p className="mt-1 text-xs text-gray-400">{notification.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-3">
        <Link
          href="/notifications"
          onClick={onClose}
          className="block text-center text-sm text-primary-600 hover:text-primary-700"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}

function UserMenuDropdown({ onClose }: DropdownProps) {
  const menuItems = [
    { label: 'My Profile', href: '/profile', icon: '👤' },
    { label: 'Account Settings', href: '/settings/account', icon: '⚙️' },
    { label: 'Notification Preferences', href: '/settings/notifications', icon: '🔔' },
    { label: 'Help Center', href: '/help', icon: '❓' },
    { divider: true },
    { label: 'Sign Out', href: '/logout', icon: '🚪', danger: true },
  ];

  return (
    <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white py-1 shadow-lg">
      <div className="border-b px-4 py-3">
        <p className="font-medium text-gray-900">Jane Doe</p>
        <p className="text-sm text-gray-500">jane.doe@school.edu</p>
      </div>
      <div className="py-1">
        {menuItems.map((item, index) => {
          if ('divider' in item) {
            return <div key={index} className="my-1 border-t" />;
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50',
                item.danger ? 'text-red-600' : 'text-gray-700'
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
