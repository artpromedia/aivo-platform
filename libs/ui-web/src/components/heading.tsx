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
    1: 'text-headline',
    2: 'text-title',
    3: 'text-body font-semibold',
  };

  return (
    <div className="space-y-2">
      {kicker && <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{kicker}</div>}
      <Tag className={cn('font-semibold text-text', levelClass[level], className)} {...props}>
        {children}
      </Tag>
    </div>
  );
}
