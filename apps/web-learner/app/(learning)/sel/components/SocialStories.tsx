'use client';

import { useState, useEffect } from 'react';
import { getSocialStories, getStoryById, markStoryCompleted, toggleStoryFavorite, type SocialStory } from '../../../../lib/sel-api';

interface SocialStoriesProps {
  learnerId: string;
}

/**
 * Social Stories Component
 * 
 * Interactive social stories to help learners:
 * - Understand social situations
 * - Practice appropriate responses
 * - Build social skills
 * - Manage transitions and changes
 */
export function SocialStories({ learnerId }: SocialStoriesProps) {
  const [stories, setStories] = useState<SocialStory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStory, setSelectedStory] = useState<SocialStory | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const categories = [
    { value: 'all', label: 'All Stories', icon: '📚' },
    { value: 'school', label: 'School', icon: '🏫' },
    { value: 'social', label: 'Social', icon: '👋' },
    { value: 'routine', label: 'Routines', icon: '⏰' },
    { value: 'change', label: 'Changes', icon: '🔄' },
    { value: 'conflict', label: 'Conflict', icon: '⚡' },
    { value: 'self-care', label: 'Self-Care', icon: '💚' },
  ];

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const data = await getSocialStories();
      setStories(data);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStories = selectedCategory === 'all'
    ? stories
    : stories.filter((s) => s.category === selectedCategory);

  const openStory = async (story: SocialStory) => {
    try {
      const fullStory = await getStoryById(story.id);
      setSelectedStory(fullStory);
      setCurrentPage(0);
      setIsReading(true);
    } catch (error) {
      console.error('Failed to load story:', error);
    }
  };

  const closeStory = async () => {
    if (selectedStory && currentPage === selectedStory.pages.length - 1) {
      // Mark as completed if they reached the end
      try {
        await markStoryCompleted(learnerId, selectedStory.id);
        // Update local state
        setStories((prev) =>
          prev.map((s) => (s.id === selectedStory.id ? { ...s, completed: true } : s))
        );
      } catch (error) {
        console.error('Failed to mark story completed:', error);
      }
    }
    setIsReading(false);
    setSelectedStory(null);
    setCurrentPage(0);
  };

  const nextPage = () => {
    if (selectedStory && currentPage < selectedStory.pages.length - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleToggleFavorite = async (storyId: string, currentFavorite: boolean) => {
    try {
      await toggleStoryFavorite(learnerId, storyId, !currentFavorite);
      setStories((prev) =>
        prev.map((s) => (s.id === storyId ? { ...s, favorite: !currentFavorite } : s))
      );
      if (selectedStory && selectedStory.id === storyId) {
        setSelectedStory({ ...selectedStory, favorite: !currentFavorite });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    return categories.find((c) => c.value === category)?.icon || '📖';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading stories...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Story Reader Modal */}
      {isReading && selectedStory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedStory.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Page {currentPage + 1} of {selectedStory.pages.length}
                  </p>
                </div>
                <button
                  onClick={closeStory}
                  className="text-slate-400 hover:text-slate-500"
                  aria-label="Close story"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${((currentPage + 1) / selectedStory.pages.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Story Page Content */}
              <div className="space-y-6">
                {selectedStory.pages[currentPage].imageUrl && (
                  <div className="bg-slate-100 rounded-lg overflow-hidden">
                    <img
                      src={selectedStory.pages[currentPage].imageUrl}
                      alt={`Page ${currentPage + 1}`}
                      className="w-full h-auto"
                    />
                  </div>
                )}

                <div className="prose prose-lg max-w-none">
                  <p className="text-slate-800 leading-relaxed">
                    {selectedStory.pages[currentPage].text}
                  </p>
                </div>

                {/* Audio Player */}
                {selectedStory.pages[currentPage].audioUrl && (
                  <audio controls className="w-full">
                    <source src={selectedStory.pages[currentPage].audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                )}

                {/* Interactive Questions */}
                {selectedStory.pages[currentPage].questions && selectedStory.pages[currentPage].questions!.length > 0 && (
                  <div className="bg-indigo-50 rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold text-indigo-900">Think About It:</h4>
                    {selectedStory.pages[currentPage].questions!.map((q) => (
                      <div key={q.id} className="space-y-2">
                        <p className="text-slate-800">{q.question}</p>
                        {q.type === 'multiple-choice' && q.options && (
                          <div className="space-y-2">
                            {q.options.map((option, idx) => (
                              <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name={q.id} className="text-indigo-600" />
                                <span className="text-sm text-slate-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {q.type === 'true-false' && (
                          <div className="flex gap-3">
                            <button className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200">
                              True
                            </button>
                            <button className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200">
                              False
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous Page
                </button>

                {currentPage < selectedStory.pages.length - 1 ? (
                  <button
                    onClick={nextPage}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Next Page →
                  </button>
                ) : (
                  <button
                    onClick={closeStory}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Finish Story ✓
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${
                  selectedCategory === category.value
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              <span>{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>

        {/* Stories Grid */}
        {filteredStories.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <p className="text-slate-500">No stories found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStories.map((story) => (
              <div
                key={story.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{getCategoryIcon(story.category)}</span>
                  <div className="flex items-center gap-2">
                    {story.completed && (
                      <span className="text-green-600" title="Completed">
                        ✓
                      </span>
                    )}
                    <button
                      onClick={() => handleToggleFavorite(story.id, story.favorite)}
                      className="text-xl hover:scale-110 transition-transform"
                      aria-label={story.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {story.favorite ? '⭐' : '☆'}
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-2">{story.title}</h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{story.description}</p>

                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(story.difficulty)}`}>
                    {story.difficulty}
                  </span>
                  <span className="text-xs text-slate-500">{story.ageRange}</span>
                  <span className="text-xs text-slate-500">• {story.pages.length} pages</span>
                </div>

                <button
                  onClick={() => openStory(story)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  {story.completed ? 'Read Again' : 'Read Story'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
