'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

export interface CourseCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Course thumbnail image URL */
  thumbnail?: string;
  /** Course title */
  title: string;
  /** Author/instructor name */
  author?: string;
  /** Author avatar URL */
  authorAvatar?: string;
  /** Category label */
  category?: string;
  /** Course rating (0-5) */
  rating?: number;
  /** Number of ratings/reviews */
  reviewCount?: number;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Price display string */
  price?: string;
  /** Original price (for sale display) */
  originalPrice?: string;
  /** Number of lessons/lectures */
  lessonCount?: number;
  /** Total duration string (e.g., "12h 30m") */
  duration?: string;
  /** Difficulty level */
  level?: 'beginner' | 'intermediate' | 'advanced';
  /** Optional badge/tag element */
  badge?: ReactNode;
  /** Click handler */
  onPress?: () => void;
}

function StarIcon({ filled, half }: { filled?: boolean; half?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      className={cn(filled ? 'text-yellow-400' : 'text-slate-300')}
      aria-hidden
    >
      {half ? (
        <>
          <defs>
            <linearGradient id="halfStar">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            fill="url(#halfStar)"
          />
        </>
      ) : (
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      )}
    </svg>
  );
}

const levelColors = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-rose-100 text-rose-700',
} as const;

/**
 * Mastery-styled CourseCard component
 *
 * Displays a course with thumbnail, title, author, rating,
 * progress bar, and price. Follows the Mastery design system
 * with rounded corners, soft shadows, and clean typography.
 */
export function CourseCard({
  thumbnail,
  title,
  author,
  authorAvatar,
  category,
  rating,
  reviewCount,
  progress,
  price,
  originalPrice,
  lessonCount,
  duration,
  level,
  badge,
  onPress,
  className,
  ...props
}: Readonly<CourseCardProps>) {
  const stars = rating != null ? Math.round(rating * 2) / 2 : null;

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white',
        'shadow-sm transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        onPress && 'cursor-pointer',
        className
      )}
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={onPress ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); } } : undefined}
      {...props}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-300" aria-hidden>
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        )}
        {/* Badge overlay */}
        {badge && (
          <div className="absolute left-3 top-3">{badge}</div>
        )}
        {/* Category pill */}
        {category && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            {category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Level badge */}
        {level && (
          <span className={cn('mb-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', levelColors[level])}>
            {level}
          </span>
        )}

        {/* Title */}
        <h3 className="font-display text-base font-semibold leading-snug text-slate-900 line-clamp-2">
          {title}
        </h3>

        {/* Author */}
        {author && (
          <div className="mt-2 flex items-center gap-2">
            {authorAvatar ? (
              <img src={authorAvatar} alt={author} className="h-5 w-5 rounded-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                {author.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-slate-500">{author}</span>
          </div>
        )}

        {/* Meta row: lessons + duration */}
        {(lessonCount != null || duration) && (
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            {lessonCount != null && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {lessonCount} lessons
              </span>
            )}
            {duration && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {duration}
              </span>
            )}
          </div>
        )}

        {/* Rating */}
        {stars != null && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-800">{rating?.toFixed(1)}</span>
            <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <StarIcon
                  key={i}
                  filled={i <= Math.floor(stars)}
                  half={i === Math.ceil(stars) && stars % 1 !== 0}
                />
              ))}
            </div>
            {reviewCount != null && (
              <span className="text-xs text-slate-400">({reviewCount.toLocaleString()})</span>
            )}
          </div>
        )}

        {/* Progress */}
        {progress != null && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">Progress</span>
              <span className="font-medium text-indigo-600">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Price row */}
        {price && (
          <div className="mt-auto flex items-baseline gap-2 pt-4">
            <span className="text-lg font-bold text-slate-900">{price}</span>
            {originalPrice && (
              <span className="text-sm text-slate-400 line-through">{originalPrice}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
