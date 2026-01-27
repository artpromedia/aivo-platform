'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  listStories,
  getRecommendations,
  getLearnerPreferences,
  type SocialStory,
  type StoryRecommendation,
  type LearnerStoryPreferences,
  type SocialStoryCategory,
  type SocialStoryReadingLevel,
  CATEGORY_METADATA,
  READING_LEVEL_LABELS,
} from '../../../../lib/social-stories-api';

import { StoryCard } from './StoryCard';
import { StoryViewer } from './StoryViewer';
import { RecommendedStories } from './RecommendedStories';

interface SocialStoriesContainerProps {
  learnerId: string;
}

type FilterTab = 'all' | 'favorites' | 'recent' | 'recommended';

const CATEGORY_GROUPS = [
  {
    label: 'School',
    categories: [
      'startingLesson',
      'endingLesson',
      'changingActivity',
      'takingQuiz',
      'testTaking',
      'raisingHand',
      'talkingToTeacher',
    ] as SocialStoryCategory[],
  },
  {
    label: 'Emotions',
    categories: [
      'feelingFrustrated',
      'feelingOverwhelmed',
      'feelingAnxious',
      'calmingDown',
      'celebratingSuccess',
    ] as SocialStoryCategory[],
  },
  {
    label: 'Social',
    categories: [
      'workingWithPeers',
      'sharingMaterials',
      'respectfulDisagreement',
      'waitingTurn',
      'askingForHelp',
    ] as SocialStoryCategory[],
  },
  {
    label: 'Changes',
    categories: [
      'unexpectedChange',
      'receivingFeedback',
      'technicalProblem',
    ] as SocialStoryCategory[],
  },
  {
    label: 'Self-Care',
    categories: [
      'sensoryBreak',
      'movementBreak',
      'quietSpace',
      'askingForBreak',
    ] as SocialStoryCategory[],
  },
  {
    label: 'Safety',
    categories: [
      'fireDrill',
      'lockdown',
      'feelingUnsafe',
    ] as SocialStoryCategory[],
  },
];

export function SocialStoriesContainer({ learnerId }: Readonly<SocialStoriesContainerProps>) {
  const [stories, setStories] = useState<SocialStory[]>([]);
  const [recommendations, setRecommendations] = useState<StoryRecommendation[]>([]);
  const [preferences, setPreferences] = useState<LearnerStoryPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<SocialStoryCategory | null>(null);
  const [selectedReadingLevel, setSelectedReadingLevel] = useState<SocialStoryReadingLevel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Viewer state
  const [selectedStory, setSelectedStory] = useState<SocialStory | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [storiesData, recommendationsData, preferencesData] = await Promise.all([
        listStories({
          category: selectedCategory || undefined,
          readingLevel: selectedReadingLevel || undefined,
          search: searchQuery || undefined,
        }),
        getRecommendations({ learnerId, maxResults: 5 }),
        getLearnerPreferences(learnerId).catch(() => null),
      ]);

      setStories(storiesData);
      setRecommendations(recommendationsData);
      setPreferences(preferencesData);
    } catch (err) {
      console.error('Failed to load stories:', err);
      setError('Failed to load stories. Please try again.');
      // Load default stories as fallback
      setStories(getDefaultStories());
    } finally {
      setIsLoading(false);
    }
  }, [learnerId, selectedCategory, selectedReadingLevel, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenStory = (story: SocialStory) => {
    setSelectedStory(story);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedStory(null);
    // Reload data to update completion status
    loadData();
  };

  const filteredStories = stories.filter((story) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        story.title.toLowerCase().includes(query) ||
        story.description?.toLowerCase().includes(query) ||
        CATEGORY_METADATA[story.category]?.label.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Story Viewer Modal */}
      {isViewerOpen && selectedStory && (
        <StoryViewer
          story={selectedStory}
          learnerId={learnerId}
          preferences={preferences}
          onClose={handleCloseViewer}
        />
      )}

      {/* Recommendations Section */}
      {recommendations.length > 0 && activeTab === 'all' && !selectedCategory && (
        <RecommendedStories
          recommendations={recommendations}
          onOpenStory={handleOpenStory}
        />
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200">
          {(['all', 'favorites', 'recent', 'recommended'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'all' && 'All Stories'}
              {tab === 'favorites' && 'Favorites'}
              {tab === 'recent' && 'Recently Viewed'}
              {tab === 'recommended' && 'Recommended'}
            </button>
          ))}
        </div>

        {/* Category Groups */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-700">Categories</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                !selectedCategory
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {CATEGORY_GROUPS.map((group) => (
              <div key={group.label} className="relative group">
                <button
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-1 ${
                    group.categories.includes(selectedCategory as SocialStoryCategory)
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {group.label}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-1 py-2 bg-white rounded-lg shadow-lg border border-slate-200 min-w-[200px] z-10 hidden group-hover:block">
                  {group.categories.map((cat) => {
                    const meta = CATEGORY_METADATA[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                          selectedCategory === cat ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                        }`}
                      >
                        <span>{meta?.icon}</span>
                        <span>{meta?.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reading Level Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Reading Level:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedReadingLevel(null)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                !selectedReadingLevel
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Levels
            </button>
            {(Object.entries(READING_LEVEL_LABELS) as [SocialStoryReadingLevel, string][]).map(
              ([level, label]) => (
                <button
                  key={level}
                  onClick={() => setSelectedReadingLevel(level)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedReadingLevel === level
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
          <button
            onClick={loadData}
            className="ml-2 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Stories Grid */}
      {filteredStories.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <div className="text-4xl mb-4">📚</div>
          <p className="text-slate-500">No stories found matching your filters.</p>
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSelectedReadingLevel(null);
              setSearchQuery('');
            }}
            className="mt-4 text-indigo-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onOpen={() => handleOpenStory(story)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Default stories for fallback when API is unavailable
function getDefaultStories(): SocialStory[] {
  return [
    {
      id: 'asking-for-help',
      slug: 'asking-for-help',
      title: 'Asking for Help',
      description: 'Learn how to ask for help when you need it.',
      category: 'askingForHelp',
      readingLevel: 'developing',
      estimatedDuration: 180,
      gradeBands: ['K-2', '3-5'],
      supportsPersonalization: true,
      personalizationTokens: ['learnerName', 'teacherName'],
      defaultVisualStyle: 'cartoon',
      hasAudio: true,
      hasVideo: false,
      isBuiltIn: true,
      isApproved: true,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pages: [
        {
          id: 'page-1',
          pageNumber: 1,
          sentences: [
            {
              id: 's1',
              text: 'Sometimes I need help with my work.',
              type: 'descriptive',
              emphasisWords: ['help'],
              personalizationTokens: [],
            },
            {
              id: 's2',
              text: 'It is okay to ask for help.',
              type: 'affirmative',
              emphasisWords: ['okay'],
              personalizationTokens: [],
            },
          ],
          interactions: [],
        },
        {
          id: 'page-2',
          pageNumber: 2,
          sentences: [
            {
              id: 's3',
              text: 'When I need help, I can raise my hand.',
              type: 'directive',
              emphasisWords: ['raise my hand'],
              personalizationTokens: [],
            },
            {
              id: 's4',
              text: 'My teacher will come to help me.',
              type: 'perspective',
              emphasisWords: ['teacher'],
              personalizationTokens: ['teacherName'],
            },
          ],
          interactions: [],
        },
        {
          id: 'page-3',
          pageNumber: 3,
          sentences: [
            {
              id: 's5',
              text: 'Asking for help is a smart thing to do.',
              type: 'affirmative',
              emphasisWords: ['smart'],
              personalizationTokens: [],
            },
          ],
          interactions: [],
        },
      ],
    },
    {
      id: 'calming-down',
      slug: 'calming-down',
      title: 'Calming Down When I Feel Upset',
      description: 'Strategies to help calm down when feeling upset or frustrated.',
      category: 'calmingDown',
      readingLevel: 'developing',
      estimatedDuration: 240,
      gradeBands: ['K-2', '3-5'],
      supportsPersonalization: true,
      personalizationTokens: ['learnerName', 'calmPlace'],
      defaultVisualStyle: 'cartoon',
      hasAudio: true,
      hasVideo: false,
      isBuiltIn: true,
      isApproved: true,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pages: [
        {
          id: 'page-1',
          pageNumber: 1,
          sentences: [
            {
              id: 's1',
              text: 'Sometimes I feel upset or frustrated.',
              type: 'descriptive',
              emphasisWords: ['upset', 'frustrated'],
              personalizationTokens: [],
            },
            {
              id: 's2',
              text: 'These feelings are normal.',
              type: 'affirmative',
              emphasisWords: ['normal'],
              personalizationTokens: [],
            },
          ],
          interactions: [],
        },
        {
          id: 'page-2',
          pageNumber: 2,
          sentences: [
            {
              id: 's3',
              text: 'I can take deep breaths to help calm down.',
              type: 'directive',
              emphasisWords: ['deep breaths'],
              personalizationTokens: [],
            },
            {
              id: 's4',
              text: 'Breathe in slowly... and breathe out slowly.',
              type: 'directive',
              emphasisWords: ['slowly'],
              personalizationTokens: [],
            },
          ],
          interactions: [],
        },
        {
          id: 'page-3',
          pageNumber: 3,
          sentences: [
            {
              id: 's5',
              text: 'I can go to my calm place.',
              type: 'directive',
              emphasisWords: ['calm place'],
              personalizationTokens: ['calmPlace'],
            },
          ],
          interactions: [],
        },
        {
          id: 'page-4',
          pageNumber: 4,
          sentences: [
            {
              id: 's6',
              text: 'Taking time to calm down helps me feel better.',
              type: 'affirmative',
              emphasisWords: ['feel better'],
              personalizationTokens: [],
            },
          ],
          interactions: [],
        },
      ],
    },
    {
      id: 'unexpected-change',
      slug: 'unexpected-change',
      title: 'When Things Change Unexpectedly',
      description: 'Handling unexpected changes in routine or plans.',
      category: 'unexpectedChange',
      readingLevel: 'developing',
      estimatedDuration: 200,
      gradeBands: ['K-2', '3-5'],
      supportsPersonalization: true,
      personalizationTokens: ['learnerName'],
      defaultVisualStyle: 'cartoon',
      hasAudio: true,
      hasVideo: false,
      isBuiltIn: true,
      isApproved: true,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pages: [
        {
          id: 'page-1',
          pageNumber: 1,
          sentences: [
            {
              id: 's1',
              text: 'Sometimes things change when I do not expect them to.',
              type: 'descriptive',
              emphasisWords: ['change'],
              personalizationTokens: [],
            },
          ],
          interactions: [],
        },
        {
          id: 'page-2',
          pageNumber: 2,
          sentences: [
            {
              id: 's2',
              text: 'Changes can feel surprising or confusing.',
              type: 'perspective',
              emphasisWords: ['surprising', 'confusing'],
              personalizationTokens: [],
            },
            {
              id: 's3',
              text: 'It is okay to feel this way.',
              type: 'affirmative',
              emphasisWords: ['okay'],
              personalizationTokens: [],
            },
          ],
          interactions: [],
        },
        {
          id: 'page-3',
          pageNumber: 3,
          sentences: [
            {
              id: 's4',
              text: 'I can take a deep breath and ask what will happen next.',
              type: 'directive',
              emphasisWords: ['ask'],
              personalizationTokens: [],
            },
          ],
          interactions: [],
        },
        {
          id: 'page-4',
          pageNumber: 4,
          sentences: [
            {
              id: 's5',
              text: 'I can handle changes, even when they are unexpected.',
              type: 'affirmative',
              emphasisWords: ['handle'],
              personalizationTokens: [],
            },
          ],
          interactions: [],
        },
      ],
    },
  ];
}
