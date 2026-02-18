'use client';

import {
  Home,
  BookOpen,
  Target,
  BarChart3,
  Trophy,
  Settings,
  Brain,
  Gamepad2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@aivo/ui-web';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
  { id: 'courses', label: 'My Courses', icon: BookOpen, href: '/courses' },
  { id: 'goals', label: 'Goals', icon: Target, href: '/goals' },
  { id: 'progress', label: 'Progress', icon: BarChart3, href: '/progress' },
  { id: 'achievements', label: 'Achievements', icon: Trophy, href: '/achievements' },
  { id: 'tutor', label: 'AI Tutor', icon: Brain, href: '/tutor' },
  { id: 'games', label: 'Games', icon: Gamepad2, href: '/games' },
];

const bottomItems = [
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

export function LearnerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-[240px] bg-white border-r border-gray-200 h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-sm">
          A
        </div>
        <span className="font-display text-lg font-bold text-gray-900">AIVO</span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-indigo-600' : 'text-gray-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-indigo-600' : 'text-gray-400')} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
