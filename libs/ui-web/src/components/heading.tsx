'use client';

import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../utils/cn';

export type HeadingLevel = 1 | 2 | 3;

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  level?: HeadingLevel;
  kicker?: ReactNode;
};

export function Heading({ level = 1, kicker, className, children, ...props }: HeadingProps) {
  const Tag = `h${level}` as const;
  const levelClass: Record<HeadingLevel, string> = {
    1: 'text-headline font-display',
    2: 'text-title font-display',
    3: 'text-body font-semibold',
  };

  const weightClass: Record<HeadingLevel, string> = {
    1: 'font-bold',
    2: 'font-semibold',
    3: 'font-semibold',
  };

  const spacingClass: Record<HeadingLevel, string> = {
    1: 'tracking-tight leading-[1.2]',
    2: 'tracking-tight leading-[1.3]',
    3: 'leading-[1.4]',
  };

  return (
    <div className="space-y-2">
      {kicker && <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{kicker}</div>}
      <Tag className={cn(weightClass[level], 'text-text', spacingClass[level], levelClass[level], className)} {...props}>
        {children}
      </Tag>
    </div>
  );
}
