'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import {
  type SocialStory,
  type LearnerStoryPreferences,
  type StoryPage,
  type StorySentence,
  recordStoryView,
  CATEGORY_METADATA,
} from '../../../../lib/social-stories-api';

interface StoryViewerProps {
  story: SocialStory;
  learnerId: string;
  preferences?: LearnerStoryPreferences | null;
  onClose: () => void;
}

type EmotionalState = 'GOOD' | 'CALM' | 'NEUTRAL' | 'ANXIOUS';

const SENTENCE_TYPE_COLORS: Record<string, string> = {
  descriptive: '#3B82F6',
  perspective: '#8B5CF6',
  directive: '#10B981',
  affirmative: '#F59E0B',
  cooperative: '#06B6D4',
  control: '#EC4899',
  partial: '#64748B',
};

export function StoryViewer({
  story,
  learnerId,
  preferences,
  onClose,
}: Readonly<StoryViewerProps>) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedSentence, setHighlightedSentence] = useState<number>(-1);
  const [isComplete, setIsComplete] = useState(false);
  const [postEmotion, setPostEmotion] = useState<EmotionalState | null>(null);
  const [helpfulnessRating, setHelpfulnessRating] = useState<number>(0);
  const [replayCount, setReplayCount] = useState(0);

  const startTimeRef = useRef<Date>(new Date());
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioPlayedRef = useRef(false);

  const page = story.pages[currentPage];
  const totalPages = story.pages.length;
  const categoryMeta = CATEGORY_METADATA[story.category];

  // Text-to-speech functionality
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = preferences?.ttsSpeed || 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      if (onEnd) {
        utterance.onend = onEnd;
      }

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      audioPlayedRef.current = true;
    }
  }, [preferences?.ttsSpeed]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setHighlightedSentence(-1);
  }, []);

  const speakPage = useCallback(async (pageData: StoryPage) => {
    if (!preferences?.enableTts && preferences !== null) return;

    setIsPlaying(true);
    const sentences = pageData.sentences;

    for (let i = 0; i < sentences.length; i++) {
      if (!isPlaying) break;

      setHighlightedSentence(i);

      await new Promise<void>((resolve) => {
        speak(sentences[i].text, resolve);
      });

      // Small pause between sentences
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setIsPlaying(false);
    setHighlightedSentence(-1);
  }, [preferences, speak, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  // Auto-play on page change if TTS is enabled
  useEffect(() => {
    if ((preferences?.enableTts ?? true) && (preferences?.autoAdvance ?? false)) {
      speakPage(page);
    }
  }, [currentPage, page, preferences, speakPage]);

  const goToPage = (pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= totalPages) return;
    stopSpeaking();
    setCurrentPage(pageIndex);
  };

  const handlePrevious = () => {
    goToPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      stopSpeaking();
    } else {
      speakPage(page);
    }
  };

  const handleReplay = () => {
    setReplayCount((prev) => prev + 1);
    setIsComplete(false);
    setCurrentPage(0);
    setPostEmotion(null);
    setHelpfulnessRating(0);
  };

  const handleFinish = async () => {
    const endTime = new Date();
    const durationSeconds = Math.floor(
      (endTime.getTime() - startTimeRef.current.getTime()) / 1000
    );

    try {
      await recordStoryView({
        storyId: story.id,
        learnerId,
        triggerType: 'manual',
        pagesViewed: totalPages,
        totalPages,
        completedAt: endTime.toISOString(),
        durationSeconds,
        replayCount,
        audioPlayed: audioPlayedRef.current,
        interactions: [],
        postEmotionalState: postEmotion || undefined,
        helpfulnessRating: helpfulnessRating || undefined,
      });
    } catch (error) {
      console.error('Failed to record story view:', error);
    }

    onClose();
  };

  const renderSentence = (sentence: StorySentence, index: number) => {
    const isHighlighted = highlightedSentence === index;
    const typeColor = SENTENCE_TYPE_COLORS[sentence.type] || '#64748B';

    // Apply emphasis to specific words
    let text = sentence.text;
    sentence.emphasisWords.forEach((word) => {
      text = text.replace(
        new RegExp(`\\b${word}\\b`, 'gi'),
        `<strong class="font-bold">${word}</strong>`
      );
    });

    return (
      <p
        key={sentence.id}
        className={`text-xl leading-relaxed transition-all duration-300 ${
          isHighlighted
            ? 'bg-indigo-100 -mx-4 px-4 py-2 rounded-lg scale-[1.02]'
            : ''
        }`}
        style={{
          borderLeft: `4px solid ${typeColor}`,
          paddingLeft: '1rem',
          marginBottom: '1rem',
        }}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  };

  // Completion screen
  if (isComplete) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-slate-900">Great Job!</h2>
            <p className="text-slate-600 mt-2">
              You finished &quot;{story.title}&quot;!
            </p>
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Did this story help you?
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setHelpfulnessRating(rating)}
                  className={`text-3xl transition-transform hover:scale-110 ${
                    helpfulnessRating >= rating ? '' : 'opacity-40'
                  }`}
                >
                  {helpfulnessRating >= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>

          {/* Emotion Check */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              How do you feel now?
            </label>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { value: 'GOOD' as const, emoji: '😊', label: 'Good' },
                { value: 'CALM' as const, emoji: '😌', label: 'Calm' },
                { value: 'NEUTRAL' as const, emoji: '😐', label: 'Okay' },
                { value: 'ANXIOUS' as const, emoji: '😟', label: 'Still worried' },
              ].map((emotion) => (
                <button
                  key={emotion.value}
                  onClick={() => setPostEmotion(emotion.value)}
                  className={`px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${
                    postEmotion === emotion.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-xl">{emotion.emoji}</span>
                  <span>{emotion.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleReplay}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Read Again
            </button>
            <button
              onClick={handleFinish}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <h1 className="text-white font-semibold">{story.title}</h1>
          <p className="text-slate-400 text-sm">
            Page {currentPage + 1} of {totalPages}
          </p>
        </div>

        {/* Settings placeholder */}
        <div className="w-10" />
      </header>

      {/* Progress bar */}
      <div className="bg-slate-700 h-1">
        <div
          className="bg-indigo-500 h-full transition-all duration-300"
          style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
        />
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-full overflow-auto">
          {/* Page Visual */}
          {page.visual && (
            <div
              className="h-64 flex items-center justify-center rounded-t-2xl"
              style={{ backgroundColor: `${categoryMeta?.color}15` }}
            >
              {page.visual.url ? (
                <img
                  src={page.visual.url}
                  alt={page.visual.altText}
                  className="h-full w-full object-cover rounded-t-2xl"
                />
              ) : (
                <span className="text-8xl">{categoryMeta?.icon}</span>
              )}
            </div>
          )}

          {/* Page Content */}
          <div className="p-8 space-y-6">
            {/* Sentences */}
            <div className="space-y-4">
              {page.sentences.map((sentence, index) =>
                renderSentence(sentence, index)
              )}
            </div>

            {/* Interactions (if any) */}
            {page.interactions.length > 0 && (
              <div className="bg-indigo-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-indigo-900">Think About It:</h3>
                {page.interactions.map((interaction) => (
                  <div key={interaction.id} className="text-slate-700">
                    {interaction.type === 'question' && (
                      <p>{String(interaction.config.question || '')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="bg-slate-800/80 backdrop-blur-sm px-4 py-4">
        {/* Page dots */}
        <div className="flex justify-center gap-2 mb-4">
          {story.pages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToPage(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentPage
                  ? 'bg-white w-6'
                  : index < currentPage
                  ? 'bg-indigo-400'
                  : 'bg-slate-600'
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentPage === 0}
            className="p-3 text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handlePlayPause}
            className="p-4 bg-white text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-3 text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label={currentPage === totalPages - 1 ? 'Finish' : 'Next page'}
          >
            {currentPage === totalPages - 1 ? (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
