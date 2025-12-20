'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ChevronDown, Settings, LayoutDashboard, ArrowRight } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface UserWithSubscription {
  subscription?: {
    plan: string;
    status: string;
  };
}

interface NavAuthButtonsProps {
  mobile?: boolean;
  onAction?: () => void; // For closing mobile menu
}

export function NavAuthButtons({ mobile = false, onAction }: NavAuthButtonsProps) {
  const { user, isAuthenticated, isLoading, goToRegister, goToLogin, goToDashboard, logout } =
    useAuth();
  const userWithSub = user as (typeof user & UserWithSubscription) | null;
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
    onAction?.();
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-3', mobile && 'flex-col w-full')}>
        <div className="h-10 w-24 bg-gray-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    // Authenticated User
    if (mobile) {
      return (
        <div className="space-y-3 w-full">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-theme-primary-400 to-coral-400 rounded-full flex items-center justify-center text-white font-bold">
              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user.name || 'User'}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Mobile Actions */}
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              goToDashboard();
              onAction?.();
            }}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Button>

          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      );
    }

    // Desktop Authenticated
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
          }}
          className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-theme-primary-400 to-coral-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-500 transition-transform',
              isDropdownOpen && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50"
            >
              {/* User Info */}
              <div className="p-4 border-b border-gray-100">
                <p className="font-medium text-gray-900">{user.name || 'User'}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                {userWithSub?.subscription && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-theme-primary-100 text-theme-primary-700 text-xs font-medium rounded-full">
                    {userWithSub.subscription.plan.charAt(0).toUpperCase() +
                      userWithSub.subscription.plan.slice(1)}{' '}
                    Plan
                  </span>
                )}
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={() => {
                    goToDashboard();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <LayoutDashboard className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    goToDashboard('/settings');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">Settings</span>
                </button>
              </div>

              {/* Logout */}
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-left text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Visitor (Not Authenticated)
  if (mobile) {
    return (
      <div className="space-y-3 w-full">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            goToLogin();
            onAction?.();
          }}
        >
          Sign In
        </Button>
        <Button
          variant="coral"
          className="w-full"
          onClick={() => {
            goToRegister({ source: 'nav_mobile' });
            onAction?.();
          }}
        >
          Get Started Free
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Desktop Visitor
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        onClick={() => {
          goToLogin();
        }}
      >
        Sign In
      </Button>
      <Button
        variant="coral"
        onClick={() => {
          goToRegister({ source: 'nav_desktop' });
        }}
      >
        Get Started
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
