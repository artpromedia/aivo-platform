'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  ChevronDown,
  Settings,
  LayoutDashboard,
  ArrowRight,
  CreditCard,
} from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface NavAuthSectionProps {
  readonly mobile?: boolean;
  readonly onAction?: () => void;
}

export function NavAuthSection({ mobile = false, onAction }: NavAuthSectionProps) {
  const {
    user,
    subscription,
    isAuthenticated,
    isLoading,
    logout,
    navigateToRegister,
    navigateToLogin,
    navigateToDashboard,
  } = useAuth();

  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

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

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-3', mobile && 'flex-col w-full')}>
        <div className="h-10 w-24 bg-gray-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  // ==========================================
  // AUTHENTICATED USER
  // ==========================================
  if (isAuthenticated && user) {
    if (mobile) {
      return (
        <div className="space-y-4 w-full">
          {/* User Info */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
            <div className="w-12 h-12 bg-gradient-to-br from-theme-primary-400 to-coral-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user.name || 'User'}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
              {subscription && (
                <Badge variant="primary" size="sm" className="mt-1">
                  {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              navigateToDashboard();
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

    // Desktop authenticated view
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
              className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50"
            >
              {/* User Info */}
              <div className="p-4 border-b border-gray-100">
                <p className="font-medium text-gray-900">{user.name || 'User'}</p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                {subscription && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="primary" size="sm">
                      {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                    </Badge>
                    {subscription.status === 'trialing' && (
                      <Badge variant="warning" size="sm">
                        Trial
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={() => {
                    navigateToDashboard();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <LayoutDashboard className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    navigateToDashboard('/settings');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <Settings className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">Settings</span>
                </button>

                <button
                  onClick={() => {
                    navigateToDashboard('/settings/subscription');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <CreditCard className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">Subscription</span>
                </button>
              </div>

              {/* Logout */}
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-left text-red-600"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ==========================================
  // VISITOR (NOT AUTHENTICATED)
  // ==========================================
  if (mobile) {
    return (
      <div className="space-y-3 w-full">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            navigateToLogin();
            onAction?.();
          }}
        >
          Sign In
        </Button>
        <Button
          variant="coral"
          className="w-full"
          onClick={() => {
            navigateToRegister({ source: 'nav_mobile' });
            onAction?.();
          }}
        >
          Get Started Free
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Desktop visitor view
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        onClick={() => {
          navigateToLogin();
        }}
      >
        Sign In
      </Button>
      <Button
        variant="coral"
        onClick={() => {
          navigateToRegister({ source: 'nav_desktop' });
        }}
      >
        Get Started
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
