'use client';

/**
 * Optimized Avatar Component
 *
 * Uses next/image for automatic optimization with fallback support.
 * Provides consistent avatar display across the application.
 */

import Image from 'next/image';
import { useState, useMemo } from 'react';

interface OptimizedAvatarProps {
  src?: string | null;
  alt: string;
  fallbackInitial?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: boolean;
}

const SIZE_MAP = {
  xs: { px: 24, class: 'w-6 h-6 text-xs' },
  sm: { px: 32, class: 'w-8 h-8 text-sm' },
  md: { px: 40, class: 'w-10 h-10 text-base' },
  lg: { px: 48, class: 'w-12 h-12 text-lg' },
  xl: { px: 64, class: 'w-16 h-16 text-xl' },
} as const;

/**
 * Generates a consistent gradient based on the name/initial
 */
function getGradientColors(name: string): string {
  const gradients = [
    'from-blue-400 to-purple-500',
    'from-green-400 to-teal-500',
    'from-orange-400 to-red-500',
    'from-pink-400 to-rose-500',
    'from-indigo-400 to-blue-500',
    'from-amber-400 to-orange-500',
    'from-cyan-400 to-blue-500',
    'from-violet-400 to-purple-500',
  ];

  // Use character code sum for deterministic gradient selection
  const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return gradients[charSum % gradients.length];
}

export function OptimizedAvatar({
  src,
  alt,
  fallbackInitial,
  size = 'md',
  className = '',
  priority = false,
}: OptimizedAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const sizeConfig = SIZE_MAP[size];

  const initial = useMemo(() => {
    if (fallbackInitial) return fallbackInitial;
    return alt?.charAt(0)?.toUpperCase() || '?';
  }, [fallbackInitial, alt]);

  const gradientColors = useMemo(() => getGradientColors(alt || ''), [alt]);

  // Show fallback if no src, empty src, or image failed to load
  const showFallback = !src || hasError;

  if (showFallback) {
    return (
      <div
        className={`
          ${sizeConfig.class}
          rounded-full
          bg-gradient-to-br ${gradientColors}
          flex items-center justify-center
          text-white font-bold
          ${className}
        `}
        role="img"
        aria-label={alt}
      >
        {initial}
      </div>
    );
  }

  return (
    <div className={`relative ${sizeConfig.class} ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={sizeConfig.px}
        height={sizeConfig.px}
        className="rounded-full object-cover"
        onError={() => setHasError(true)}
        priority={priority}
        unoptimized={src.startsWith('data:') || src.startsWith('blob:')}
      />
    </div>
  );
}

export default OptimizedAvatar;
