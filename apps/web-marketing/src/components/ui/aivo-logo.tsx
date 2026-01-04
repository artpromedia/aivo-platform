'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/lib/utils';

type LogoVariant =
  | 'horizontal-dark'
  | 'horizontal-white'
  | 'horizontal-purple'
  | 'stacked-dark'
  | 'icon-dark'
  | 'icon-white'
  | 'icon-purple';

interface AivoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: LogoVariant;
  animated?: boolean;
  href?: string;
  className?: string;
}

const sizeMap = {
  sm: { logo: 40, horizontal: 140, stacked: 80 },
  md: { logo: 48, horizontal: 168, stacked: 96 },
  lg: { logo: 56, horizontal: 196, stacked: 112 },
  xl: { logo: 72, horizontal: 252, stacked: 144 },
};

const variantAssets: Record<LogoVariant, string> = {
  'horizontal-dark': '/images/aivo-logo-horizontal-dark.svg',
  'horizontal-white': '/images/aivo-logo-horizontal-white.svg',
  'horizontal-purple': '/images/aivo-logo-horizontal-purple.svg',
  'stacked-dark': '/images/aivo-logo-stacked-dark.svg',
  'icon-dark': '/icons/aivo-icon-dark.svg',
  'icon-white': '/icons/aivo-icon-white.svg',
  'icon-purple': '/icons/aivo-icon-purple.svg',
};

export function AivoLogo({
  size = 'md',
  variant = 'horizontal-dark',
  animated = false,
  href = '/',
  className,
}: AivoLogoProps) {
  const dimensions = sizeMap[size];
  const isHorizontal = variant.startsWith('horizontal');
  const isStacked = variant.startsWith('stacked');
  const isIcon = variant.startsWith('icon');

  const width = isHorizontal
    ? dimensions.horizontal
    : isStacked
      ? dimensions.stacked
      : dimensions.logo;
  const height = isStacked ? dimensions.logo * 1.5 : dimensions.logo;

  const LogoContent = () => (
    <div className={cn('flex items-center', className)}>
      {/* Logo */}
      <div className="relative">
        {animated && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-theme-primary-400 to-coral-400 blur-xl opacity-50"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
        <Image
          src={variantAssets[variant]}
          alt="AIVO Learning"
          width={width}
          height={height}
          className="relative"
          priority
        />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-2 rounded-lg"
      >
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
}
