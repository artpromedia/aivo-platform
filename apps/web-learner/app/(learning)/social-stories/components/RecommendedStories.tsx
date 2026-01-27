'use client';

import {
  type SocialStory,
  type StoryRecommendation,
  type RecommendationReason,
  CATEGORY_METADATA,
} from '../../../../lib/social-stories-api';

interface RecommendedStoriesProps {
  recommendations: StoryRecommendation[];
  onOpenStory: (story: SocialStory) => void;
}

const REASON_LABELS: Record<RecommendationReason, { label: string; icon: string; color: string }> = {
  transitionSupport: { label: 'Help with transitions', icon: '🔄', color: '#8B5CF6' },
  emotionalSupport: { label: 'Emotional support', icon: '💚', color: '#10B981' },
  scheduled: { label: 'Scheduled for you', icon: '📅', color: '#3B82F6' },
  teacherAssigned: { label: 'Teacher assigned', icon: '👩‍🏫', color: '#7C3AED' },
  frequentlyHelpful: { label: 'Frequently helpful', icon: '⭐', color: '#F59E0B' },
  similarSituation: { label: 'Similar situation', icon: '🎯', color: '#06B6D4' },
  newScenario: { label: 'Try something new', icon: '✨', color: '#EC4899' },
};

export function RecommendedStories({
  recommendations,
  onOpenStory,
}: Readonly<RecommendedStoriesProps>) {
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">✨</span>
        <h2 className="text-lg font-semibold text-slate-900">Recommended for You</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {recommendations.map((rec) => {
          const categoryMeta = CATEGORY_METADATA[rec.story.category];
          const reasonMeta = REASON_LABELS[rec.reason];

          return (
            <button
              key={rec.storyId}
              onClick={() => onOpenStory(rec.story)}
              className="bg-white rounded-lg p-4 text-left shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group"
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${categoryMeta?.color}15` }}
              >
                <span className="text-2xl">{categoryMeta?.icon}</span>
              </div>

              {/* Title */}
              <h3 className="font-medium text-slate-900 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                {rec.story.title}
              </h3>

              {/* Reason Badge */}
              <div
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                style={{
                  backgroundColor: `${reasonMeta?.color}15`,
                  color: reasonMeta?.color,
                }}
              >
                <span>{reasonMeta?.icon}</span>
                <span>{reasonMeta?.label}</span>
              </div>

              {/* Score Indicator (visual only) */}
              <div className="mt-3 flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      i < Math.round(rec.score * 5)
                        ? 'bg-indigo-400'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
