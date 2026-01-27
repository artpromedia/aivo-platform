'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type AchievementSize = 'sm' | 'md' | 'lg' | 'xl';
export type AchievementStyle = 'playful' | 'badge' | 'minimal';

export interface AchievementBadgeProps {
  /** Achievement name */
  name: string;
  /** Achievement description */
  description?: string;
  /** Icon or emoji to display */
  icon: React.ReactNode;
  /** Rarity level affects visual styling */
  rarity?: AchievementRarity;
  /** Size of the badge */
  size?: AchievementSize;
  /** Visual style (adapts to grade theme) */
  style?: AchievementStyle;
  /** Whether the achievement is unlocked */
  unlocked?: boolean;
  /** Progress towards unlocking (0-100) */
  progress?: number;
  /** Date when achievement was earned */
  earnedAt?: Date;
  /** Show celebration animation when unlocked */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

const rarityColors: Record<AchievementRarity, { bg: string; border: string; glow: string }> = {
  common: {
    bg: 'bg-surface-muted',
    border: 'border-border',
    glow: 'shadow-none',
  },
  uncommon: {
    bg: 'bg-success/10',
    border: 'border-success',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
  },
  rare: {
    bg: 'bg-info/10',
    border: 'border-info',
    glow: 'shadow-[0_0_16px_rgba(59,130,246,0.4)]',
  },
  epic: {
    bg: 'bg-accent/10',
    border: 'border-accent',
    glow: 'shadow-[0_0_20px_rgba(124,58,237,0.5)]',
  },
  legendary: {
    bg: 'bg-warning/10',
    border: 'border-warning',
    glow: 'shadow-[0_0_24px_rgba(245,158,11,0.6)]',
  },
};

const sizeClasses: Record<AchievementSize, { container: string; icon: string; text: string }> = {
  sm: {
    container: 'w-12 h-12',
    icon: 'text-lg',
    text: 'text-caption',
  },
  md: {
    container: 'w-16 h-16',
    icon: 'text-2xl',
    text: 'text-label',
  },
  lg: {
    container: 'w-20 h-20',
    icon: 'text-3xl',
    text: 'text-body',
  },
  xl: {
    container: 'w-24 h-24',
    icon: 'text-4xl',
    text: 'text-title',
  },
};

/**
 * Theme-aware Achievement Badge component
 *
 * Adapts styling based on the current grade theme:
 * - K5 (Explorer): Playful emoji-based badges with bouncy animations and sparkles
 * - MS (Navigator): Modern badge style with subtle animations
 * - HS (Scholar): Minimal professional badges with subtle effects
 *
 * Uses CSS custom properties from the grade theme system.
 */
export function AchievementBadge({
  name,
  description,
  icon,
  rarity = 'common',
  size = 'md',
  style = 'playful',
  unlocked = true,
  progress,
  earnedAt,
  animate = true,
  className,
  onClick,
}: Readonly<AchievementBadgeProps>) {
  const [showCelebration, setShowCelebration] = React.useState(false);
  const rarityStyle = rarityColors[rarity];
  const sizeStyle = sizeClasses[size];

  React.useEffect(() => {
    if (unlocked && animate) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [unlocked, animate]);

  const getStyleClasses = (): string => {
    if (style === 'playful') {
      return cn(
        'rounded-[var(--radius-card,24px)]',
        'border-4',
        rarityStyle.border,
        unlocked ? rarityStyle.bg : 'bg-surface-muted/50',
        unlocked && rarity !== 'common' && rarityStyle.glow,
        animate && unlocked && 'hover:scale-[var(--hover-scale,1.1)]',
        animate && 'active:scale-[var(--press-scale,0.95)]'
      );
    }
    if (style === 'badge') {
      return cn(
        'rounded-full',
        'border-2',
        rarityStyle.border,
        unlocked ? rarityStyle.bg : 'bg-surface-muted/50',
        unlocked && rarity !== 'common' && rarityStyle.glow
      );
    }
    // minimal or default
    return cn(
      'rounded-[var(--radius-button,8px)]',
      'border',
      unlocked ? 'border-border' : 'border-border-muted',
      unlocked ? 'bg-surface' : 'bg-surface-muted/30'
    );
  };

  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-2',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Badge container */}
      <div
        className={cn(
          'relative flex items-center justify-center',
          'transition-all duration-[var(--animation-duration,300ms)] ease-[var(--animation-easing-bounce)]',
          sizeStyle.container,
          getStyleClasses(),
          !unlocked && 'opacity-50 grayscale'
        )}
      >
        {/* Icon */}
        <div className={cn(sizeStyle.icon, unlocked ? 'text-text' : 'text-text-muted')}>
          {icon}
        </div>

        {/* Progress ring for locked achievements */}
        {!unlocked && progress !== undefined && progress > 0 && (
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-border-muted"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${progress * 2.89} 289`}
              className="text-primary"
            />
          </svg>
        )}

        {/* Celebration particles (K5 style) */}
        {showCelebration && style === 'playful' && (
          <>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-[badge-particle_1s_ease-out_forwards]"
                style={{
                  backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#74B9FF', '#00B894'][i % 5],
                  animationDelay: `${i * 0.1}s`,
                  transform: `rotate(${i * 45}deg) translateY(-20px)`,
                }}
              />
            ))}
          </>
        )}

        {/* Shine effect for legendary */}
        {unlocked && rarity === 'legendary' && (
          <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
            <div className="absolute inset-0 animate-[badge-shine_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>
        )}
      </div>

      {/* Name and description */}
      <div className="text-center">
        <div
          className={cn(
            'font-semibold',
            sizeStyle.text,
            unlocked ? 'text-text' : 'text-text-muted'
          )}
        >
          {name}
        </div>
        {description && (
          <div className="text-caption text-text-muted max-w-[120px]">
            {description}
          </div>
        )}
        {earnedAt && unlocked && (
          <div className="text-caption text-text-muted mt-1">
            {earnedAt.toLocaleDateString()}
          </div>
        )}
        {!unlocked && progress !== undefined && (
          <div className="text-caption text-text-muted">
            {Math.round(progress)}%
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Grid container for displaying multiple achievement badges
 */
export interface AchievementGridProps {
  children: React.ReactNode;
  className?: string;
}

export function AchievementGrid({ children, className }: Readonly<AchievementGridProps>) {
  return (
    <div
      className={cn(
        'grid gap-6',
        'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Add these keyframes to your global CSS or Tailwind config:
 *
 * @keyframes badge-particle {
 *   0% { opacity: 1; transform: rotate(var(--rotation)) translateY(-20px) scale(1); }
 *   100% { opacity: 0; transform: rotate(var(--rotation)) translateY(-60px) scale(0); }
 * }
 *
 * @keyframes badge-shine {
 *   0%, 100% { transform: translateX(-100%); }
 *   50% { transform: translateX(100%); }
 * }
 */