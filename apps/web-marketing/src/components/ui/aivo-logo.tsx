'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface AivoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  animated?: boolean;
  href?: string;
  className?: string;
}

const sizeMap = {
  sm: { logo: 40, text: 'text-lg', tagline: 'text-[10px]' },
  md: { logo: 48, text: 'text-xl', tagline: 'text-xs' },
  lg: { logo: 56, text: 'text-2xl', tagline: 'text-sm' },
  xl: { logo: 72, text: 'text-3xl', tagline: 'text-base' },
};

export function AivoLogo({
  size = 'md',
  showText = true,
  showTagline = false,
  animated = false,
  href = '/',
  className,
}: AivoLogoProps) {
  const { logo: logoSize, text: textSize, tagline: taglineSize } = sizeMap[size];

  const LogoContent = () => (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Logo Icon */}
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
          src="/images/aivo-logo.svg"
          alt="AIVO Learning"
          width={logoSize}
          height={logoSize}
          className="relative"
          priority
        />
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={cn('font-display font-bold tracking-tight', textSize)}>
            <span className="text-gray-900">AIVO</span>
          </span>
          {showTagline && <span className={cn('text-gray-500 -mt-1', taglineSize)}>Learning</span>}
        </div>
      )}
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
