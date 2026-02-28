'use client';

import { LanguageSwitcher } from '@aivo/i18n';
import { cn } from '@aivo/ui-web';
import { Search, Bell, Flame, Sparkles, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

import { NotificationPanel } from './notification-panel';
import { SearchOverlay } from './search-overlay';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useNotifications } from '@/lib/hooks/use-learner-api';

interface LearnerTopbarProps {
  userName?: string;
  streakDays?: number;
  totalXp?: number;
  avatarUrl?: string;
}

const mobileNavItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'My Courses', href: '/courses' },
  { label: 'Goals', href: '/goals' },
  { label: 'Progress', href: '/progress' },
  { label: 'Achievements', href: '/achievements' },
  { label: 'AI Tutor', href: '/tutor' },
  { label: 'Games', href: '/games' },
  { label: 'Settings', href: '/settings' },
];

export function LearnerTopbar({ userName, streakDays = 0, totalXp = 0, avatarUrl }: LearnerTopbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const debouncedQuery = useDebounce(searchQuery.trim(), 300);
  const pathname = usePathname();
  const { data: notifData } = useNotifications();
  const unreadCount = notifData?.unreadCount ?? 0;

  const closeSearch = useCallback(() => {
    setShowSearch(false);
  }, []);

  const handleNavigate = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
        {/* Left: Mobile menu + Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative hidden sm:flex flex-col w-64 lg:w-80">
            <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim()) setShowSearch(true);
                }}
                onFocus={() => { if (searchQuery.trim()) setShowSearch(true); }}
                placeholder="Search courses, lessons..."
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>
            {showSearch && debouncedQuery.length > 0 && (
              <SearchOverlay
                query={debouncedQuery}
                onClose={closeSearch}
                onNavigate={handleNavigate}
              />
            )}
          </div>
        </div>

        {/* Right: Stats + Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Streak */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-full">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-700">{streakDays}</span>
          </div>

          {/* XP */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-full">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-indigo-700">{totalXp.toLocaleString()} XP</span>
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher variant="compact" />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <NotificationPanel onClose={() => setShowNotifications(false)} />
            )}
          </div>

          {/* Avatar */}
          <Link href="/profile" className="flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 h-16 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  A
                </div>
                <span className="font-display text-lg font-bold text-gray-900">AIVO</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {mobileNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
