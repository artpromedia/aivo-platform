'use client';

import { ArrowRight, PlayCircle, TrendingUp, Check } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

interface HeroCTASectionProps {
  readonly onVideoClick?: () => void;
  readonly showVideo?: boolean;
}

export function HeroCTASection({ onVideoClick, showVideo = true }: HeroCTASectionProps) {
  const {
    user,
    subscription,
    isAuthenticated,
    isLoading,
    hasActiveSubscription,
    navigateToRegister,
    navigateToLogin,
    navigateToDashboard,
    navigateToUpgrade,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-48 bg-gray-100 animate-pulse rounded-xl" />
          <div className="h-14 w-40 bg-gray-100 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main CTAs */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {isAuthenticated ? (
          // === AUTHENTICATED USER ===
          <>
            <Button
              variant="coral"
              size="lg"
              onClick={() => {
                navigateToDashboard();
              }}
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Button>

            {!hasActiveSubscription && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  navigateToUpgrade();
                }}
              >
                Upgrade to Pro
              </Button>
            )}

            {hasActiveSubscription && (
              <Badge variant="success" className="px-4 py-2">
                <Check className="w-4 h-4 mr-1" />
                {subscription?.plan ? subscription.plan.charAt(0).toUpperCase() : ''}
                {subscription?.plan ? subscription.plan.slice(1) : ''} Plan Active
              </Badge>
            )}
          </>
        ) : (
          // === VISITOR ===
          <>
            <Button
              variant="coral"
              size="lg"
              onClick={() => {
                navigateToRegister({ source: 'hero_primary' });
              }}
            >
              Join Early Access
              <ArrowRight className="w-5 h-5" />
            </Button>

            <Button variant="outline" size="lg" asChild>
              <Link href="#pilot-results">
                <TrendingUp className="w-5 h-5" />
                See Pilot Results
              </Link>
            </Button>
          </>
        )}
      </div>

      {/* Video CTA - only for visitors */}
      {showVideo && !isAuthenticated && onVideoClick && (
        <div>
          <button
            onClick={onVideoClick}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-theme-primary-600 transition-colors group"
          >
            <span className="relative">
              <span className="absolute inset-0 bg-theme-primary-100 rounded-full animate-ping opacity-75" />
              <PlayCircle className="relative w-10 h-10 text-theme-primary-500 group-hover:text-theme-primary-600 transition-colors" />
            </span>
            <span className="font-medium">Watch 2-minute demo</span>
          </button>
        </div>
      )}

      {/* Trust Indicators */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        {isAuthenticated ? (
          // Show status for logged-in users
          <span className="flex items-center gap-1">
            <Check className="w-4 h-4 text-mint-500" />
            Signed in as {user?.email}
          </span>
        ) : (
          // Show trust indicators for visitors
          <>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-mint-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-mint-500" />
              14-day free trial
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-mint-500" />
              Cancel anytime
            </span>
          </>
        )}
      </div>

      {/* Login Link - only for visitors */}
      {!isAuthenticated && (
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <button
            onClick={() => {
              navigateToLogin();
            }}
            className="text-theme-primary-600 hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      )}
    </div>
  );
}
