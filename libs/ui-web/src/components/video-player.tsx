'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface VideoPlayerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onEnded'> {
  /** Video source URL */
  src: string;
  /** Poster / thumbnail image URL */
  poster?: string;
  /** Video title (for accessibility) */
  title?: string;
  /** Aspect ratio */
  aspectRatio?: '16/9' | '4/3' | '1/1';
  /** Whether the video should auto-play */
  autoPlay?: boolean;
  /** Show native controls (default: true) */
  controls?: boolean;
  /** Chapters for progress markers */
  chapters?: VideoChapter[];
  /** Called when playback time updates */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** Called when video ends */
  onEnded?: () => void;
}

export interface VideoChapter {
  /** Chapter title */
  title: string;
  /** Start time in seconds */
  startTime: number;
}

/* ------------------------------------------------------------------ */
/*  Play button overlay                                                */
/* ------------------------------------------------------------------ */

function PlayOverlay({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40"
      aria-label="Play video"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-transform hover:scale-105">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="ml-1 text-indigo-600"
          aria-hidden
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  VideoPlayer                                                        */
/* ------------------------------------------------------------------ */

/**
 * Video embed wrapper with poster overlay, play button, and optional chapters.
 *
 * Renders a native `<video>` element with a Mastery-styled play overlay
 * when paused and poster is provided.
 */
export function VideoPlayer({
  src,
  poster,
  title,
  aspectRatio = '16/9',
  autoPlay = false,
  controls = true,
  chapters,
  onTimeUpdate,
  onEnded,
  className,
  ...props
}: Readonly<VideoPlayerProps>) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(autoPlay);
  const [showOverlay, setShowOverlay] = React.useState(!autoPlay);

  const handlePlay = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
    setIsPlaying(true);
    setShowOverlay(false);
  }, []);

  const handleTimeUpdate = React.useCallback(() => {
    const video = videoRef.current;
    if (video && onTimeUpdate) {
      onTimeUpdate(video.currentTime, video.duration);
    }
  }, [onTimeUpdate]);

  const handleVideoEnded = React.useCallback(() => {
    setIsPlaying(false);
    setShowOverlay(true);
    onEnded?.();
  }, [onEnded]);

  const handlePause = React.useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleVideoPlay = React.useCallback(() => {
    setIsPlaying(true);
    setShowOverlay(false);
  }, []);

  const aspectClass =
    aspectRatio === '4/3'
      ? 'aspect-[4/3]'
      : aspectRatio === '1/1'
        ? 'aspect-square'
        : 'aspect-video';

  return (
    <div className={cn('relative w-full overflow-hidden rounded-2xl bg-black', className)} {...props}>
      <div className={cn('relative', aspectClass)}>
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          title={title}
          autoPlay={autoPlay}
          controls={controls}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
          onPause={handlePause}
          onPlay={handleVideoPlay}
          className="h-full w-full object-contain"
          playsInline
          preload="metadata"
        />
        {showOverlay && poster && <PlayOverlay onClick={handlePlay} />}
      </div>

      {/* Chapter list */}
      {chapters && chapters.length > 0 && (
        <div className="border-t border-white/10 bg-slate-900 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Chapters</p>
          <ul className="space-y-1">
            {chapters.map((ch, idx) => (
              <li key={`${ch.title}-${idx}`}>
                <button
                  type="button"
                  onClick={() => {
                    const video = videoRef.current;
                    if (video) {
                      video.currentTime = ch.startTime;
                      video.play().catch(() => {});
                      setShowOverlay(false);
                      setIsPlaying(true);
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <span className="flex-shrink-0 text-xs text-slate-500">
                    {Math.floor(ch.startTime / 60)}:{String(Math.floor(ch.startTime % 60)).padStart(2, '0')}
                  </span>
                  <span className="truncate">{ch.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
