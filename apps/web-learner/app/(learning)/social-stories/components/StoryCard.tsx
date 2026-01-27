'use client';

import { useState } from 'react';

import {
  type SocialStory,
  CATEGORY_METADATA,
  READING_LEVEL_LABELS,
  toggleFavorite,
} from '../../../../lib/social-stories-api';

interface StoryCardProps {
  story: SocialStory;
  onOpen: () => void;
  isFavorite?: boolean;
  learnerId?: string;
}

export function StoryCard({ story, onOpen, isFavorite = false, learnerId }: Readonly<StoryCardProps>) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [isToggling, setIsToggling] = useState(false);

  const categoryMeta = CATEGORY_METADATA[story.category];
  const readingLevelLabel = READING_LEVEL_LABELS[story.readingLevel];

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!learnerId || isToggling) return;

    setIsToggling(true);
    try {
      await toggleFavorite(learnerId, story.id, !favorite);
      setFavorite(!favorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const durationMinutes = Math.ceil(story.estimatedDuration / 60);

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 overflow-hidden cursor-pointer group"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {/* Visual Preview */}
      <div
        className="h-32 flex items-center justify-center transition-colors"
        style={{ backgroundColor: `${categoryMeta?.color}15` }}
      >
        <span className="text-6xl group-hover:scale-110 transition-transform">
          {categoryMeta?.icon}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {story.title}
          </h3>
          {learnerId && (
            <button
              onClick={handleToggleFavorite}
              disabled={isToggling}
              className="shrink-0 text-xl hover:scale-110 transition-transform disabled:opacity-50"
              aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {favorite ? '⭐' : '☆'}
            </button>
          )}
        </div>

        {/* Description */}
        {story.description && (
          <p className="text-sm text-slate-600 line-clamp-2">{story.description}</p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Category Badge */}
          <span
            className="px-2 py-1 rounded-full font-medium"
            style={{
              backgroundColor: `${categoryMeta?.color}20`,
              color: categoryMeta?.color,
            }}
          >
            {categoryMeta?.label}
          </span>

          {/* Reading Level */}
          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
            {readingLevelLabel}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {/* Pages */}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              {story.pages.length} pages
            </span>

            {/* Duration */}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {durationMinutes} min
            </span>

            {/* Audio indicator */}
            {story.hasAudio && (
              <span className="flex items-center gap-1" title="Has audio">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              </span>
            )}
          </div>

          {/* Read Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Read Story
          </button>
        </div>
      </div>
    </div>
  );
}
