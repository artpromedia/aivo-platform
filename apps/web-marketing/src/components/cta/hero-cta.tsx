'use client';

import { ArrowRight, PlayCircle, TrendingUp, Check } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

interface UserWithSubscription {
  subscription?: {
    plan: string;
    status: string;
  };
}

interface HeroCTAProps {
  showVideoButton?: boolean;
  showSecondaryButton?: boolean;
  onVideoClick?: () => void;
}

export function HeroCTA({
  showVideoButton = true,
  showSecondaryButton = true,
  onVideoClick,
}: HeroCTAProps) {
  const { user, isAuthenticated, isLoading, goToRegister, goToDashboard, goToLogin } = useAuth();

  // Cast user to include subscription for type safety
  const userWithSub = user as (typeof user & UserWithSubscription) | null;

  return (
    <div className="space-y-6">
      {/* Main CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {isAuthenticated && user ? (
          // Authenticated User CTAs
          <>
            <Button
              variant="coral"
              size="lg"
              onClick={() => {
                goToDashboard();
              }}
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Button>

            {userWithSub?.subscription?.plan === 'free' && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  goToRegister({ plan: 'pro', source: 'hero_upgrade' });
                }}
              >
                Upgrade to Pro
              </Button>
            )}
          </>
        ) : (
          // Visitor CTAs
          <>
            <Button
              variant="coral"
              size="lg"
              onClick={() => {
                goToRegister({ source: 'hero_primary' });
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Join Early Access'}
              <ArrowRight className="w-5 h-5" />
            </Button>

            {showSecondaryButton && (
              <Button variant="outline" size="lg" asChild>
                <Link href="#pilot-results">
                  <TrendingUp className="w-5 h-5" />
                  See Pilot Results
                </Link>
              </Button>
            )}
          </>
        )}
      </div>

      {/* Video CTA */}
      {showVideoButton && !isAuthenticated && (
        <div>
          <button
            onClick={onVideoClick}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-theme-primary-600 transition-colors group"
          >
            <span className="relative">
              <span className="absolute inset-0 bg-theme-primary-100 rounded-full animate-ping-soft" />
              <PlayCircle className="relative w-10 h-10 text-theme-primary-500 group-hover:text-theme-primary-600 transition-colors" />
            </span>
            <span className="font-medium">Watch 2-minute demo</span>
          </button>
        </div>
      )}

      {/* Trust Indicators */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        {isAuthenticated ? (
          // Show subscription status for authenticated users
          userWithSub?.subscription?.plan !== 'free' ? (
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-mint-500" />
              {(userWithSub?.subscription?.plan ?? '').charAt(0).toUpperCase() +
                (userWithSub?.subscription?.plan ?? '').slice(1)}{' '}
              Plan Active
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-mint-500" />
              Free Plan
            </span>
          )
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

      {/* Login Link for Visitors */}
      {!isAuthenticated && !isLoading && (
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <button
            onClick={() => {
              goToLogin();
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
