'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AvatarGroupItem {
  /** Display name (used for fallback initials) */
  name: string;
  /** Image URL */
  src?: string;
  /** Alt text */
  alt?: string;
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Array of avatar data */
  items: AvatarGroupItem[];
  /** Maximum number of visible avatars before "+N" overflow */
  max?: number;
  /** Avatar size */
  size?: 'sm' | 'md' | 'lg';
}

/* ------------------------------------------------------------------ */
/*  Sizes                                                              */
/* ------------------------------------------------------------------ */

const sizes = {
  sm: { ring: 'h-7 w-7', text: 'text-[10px]', overlap: '-ml-2' },
  md: { ring: 'h-9 w-9', text: 'text-xs', overlap: '-ml-2.5' },
  lg: { ring: 'h-11 w-11', text: 'text-sm', overlap: '-ml-3' },
} as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

const fallbackColors = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

function colorForIndex(idx: number) {
  return fallbackColors[idx % fallbackColors.length];
}

/* ------------------------------------------------------------------ */
/*  Single Avatar                                                      */
/* ------------------------------------------------------------------ */

function GroupAvatar({
  item,
  index,
  size,
  isFirst,
}: {
  item: AvatarGroupItem;
  index: number;
  size: 'sm' | 'md' | 'lg';
  isFirst: boolean;
}) {
  const s = sizes[size];
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full ring-2 ring-white',
        s.ring,
        !isFirst && s.overlap
      )}
      title={item.name}
    >
      {item.src ? (
        <img
          src={item.src}
          alt={item.alt ?? item.name}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className={cn(
            'flex h-full w-full items-center justify-center rounded-full font-semibold',
            s.text,
            colorForIndex(index)
          )}
        >
          {initials(item.name)}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AvatarGroup                                                        */
/* ------------------------------------------------------------------ */

/**
 * Stacked avatar group (e.g., enrolled students).
 *
 * Displays up to `max` avatars with a "+N" overflow indicator.
 */
export function AvatarGroup({
  items,
  max = 5,
  size = 'md',
  className,
  ...props
}: Readonly<AvatarGroupProps>) {
  const visible = items.slice(0, max);
  const overflow = items.length - max;
  const s = sizes[size];

  return (
    <div className={cn('flex items-center', className)} {...props}>
      {visible.map((item, idx) => (
        <GroupAvatar key={`${item.name}-${idx}`} item={item} index={idx} size={size} isFirst={idx === 0} />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 ring-2 ring-white',
            s.ring,
            s.text,
            s.overlap
          )}
          title={`+${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
