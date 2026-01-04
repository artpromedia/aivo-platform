/**
 * Lesson Preview Component
 * Renders an interactive preview of the lesson as students would see it
 */

'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  HelpCircle,
  RotateCcw,
  Trophy,
  Clock,
} from 'lucide-react';
import type {
  InteractiveLesson,
  LessonSection,
  LessonActivity,
  MultipleChoiceContent,
  MatchingContent,
  FillInBlankContent,
  OrderingContent,
  FreeResponseContent,
} from './types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LessonPreviewProps {
  lesson: InteractiveLesson;
}

interface ActivityState {
  selectedOptions: string[];
  textInputs: Record<string, string>;
  ordering: string[];
  matches: Record<string, string>;
  submitted: boolean;
  isCorrect: boolean | null;
  attempts: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function LessonPreview({ lesson }: LessonPreviewProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [activityStates, setActivityStates] = useState<Record<string, ActivityState>>({});
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());

  const sections = lesson.sections.sort((a, b) => a.orderIndex - b.orderIndex);
  const currentSection = sections[currentSectionIndex];
  const activities = currentSection?.activities.sort((a, b) => a.orderIndex - b.orderIndex) || [];
  const currentActivity = activities[currentActivityIndex];

  const totalActivities = sections.reduce((sum, s) => sum + s.activities.length, 0);
  const progress = (completedActivities.size / totalActivities) * 100;

  const getActivityState = (activityId: string): ActivityState => {
    return (
      activityStates[activityId] || {
        selectedOptions: [],
        textInputs: {},
        ordering: [],
        matches: {},
        submitted: false,
        isCorrect: null,
        attempts: 0,
      }
    );
  };

  const updateActivityState = (activityId: string, updates: Partial<ActivityState>) => {
    setActivityStates((prev) => ({
      ...prev,
      [activityId]: { ...getActivityState(activityId), ...updates },
    }));
  };

  const handleNext = () => {
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex(currentActivityIndex + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentActivityIndex(0);
    }
    setShowHint(false);
    setHintIndex(0);
  };

  const handlePrevious = () => {
    if (currentActivityIndex > 0) {
      setCurrentActivityIndex(currentActivityIndex - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentActivityIndex(prevSection.activities.length - 1);
    }
    setShowHint(false);
    setHintIndex(0);
  };

  const handleSubmit = (isCorrect: boolean) => {
    if (!currentActivity) return;

    const state = getActivityState(currentActivity.id);
    updateActivityState(currentActivity.id, {
      submitted: true,
      isCorrect,
      attempts: state.attempts + 1,
    });

    if (isCorrect) {
      const pointsEarned = Math.max(0, currentActivity.points - hintIndex * 5);
      setScore(score + pointsEarned);
      setCompletedActivities((prev) => new Set([...prev, currentActivity.id]));
    }
  };

  const handleRetry = () => {
    if (!currentActivity) return;
    updateActivityState(currentActivity.id, {
      selectedOptions: [],
      textInputs: {},
      ordering: [],
      matches: {},
      submitted: false,
      isCorrect: null,
    });
    setShowHint(false);
    setHintIndex(0);
  };

  const handleShowHint = () => {
    if (!currentActivity || hintIndex >= currentActivity.hints.length) return;
    setShowHint(true);
    setHintIndex(hintIndex + 1);
  };

  if (!currentActivity) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold text-text mb-2">Lesson Complete!</h2>
          <p className="text-muted mb-4">
            You scored {score} points
          </p>
        </div>
      </div>
    );
  }

  const state = getActivityState(currentActivity.id);

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Progress Header */}
      {lesson.settings.showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted mb-2">
            <span>
              Section {currentSectionIndex + 1} of {sections.length}: {currentSection.title}
            </span>
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              {score} pts
            </span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Activity Card */}
      <div className="bg-surface rounded-xl shadow-lg overflow-hidden">
        {/* Activity Header */}
        <div className="bg-gradient-to-r from-primary to-accent text-on-accent px-6 py-4">
          <h2 className="text-lg font-semibold">{currentActivity.title}</h2>
          <p className="text-sm opacity-90 mt-1">
            Activity {currentActivityIndex + 1} of {activities.length}
          </p>
        </div>

        {/* Instructions */}
        {currentActivity.instructions && (
          <div className="px-6 py-4 bg-primary/10 border-b">
            <p className="text-text">{currentActivity.instructions}</p>
          </div>
        )}

        {/* Activity Content */}
        <div className="p-6">
          <ActivityRenderer
            activity={currentActivity}
            state={state}
            onStateChange={(updates) => updateActivityState(currentActivity.id, updates)}
            onSubmit={handleSubmit}
          />
        </div>

        {/* Feedback */}
        {state.submitted && (
          <div
            className={`px-6 py-4 ${
              state.isCorrect ? 'bg-success/10' : 'bg-error/10'
            }`}
          >
            <div className="flex items-center gap-2">
              {state.isCorrect ? (
                <>
                  <Check className="w-5 h-5 text-success" />
                  <span className="font-medium text-success">
                    {currentActivity.feedback.correct.message}
                  </span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-error" />
                  <span className="font-medium text-error">
                    {currentActivity.feedback.incorrect.message}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Hint */}
        {showHint && currentActivity.hints[hintIndex - 1] && (
          <div className="px-6 py-4 bg-yellow-50 border-t">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <span className="font-medium text-yellow-700">Hint {hintIndex}:</span>
                <p className="text-yellow-800">{currentActivity.hints[hintIndex - 1].text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 bg-surface-muted border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!state.submitted && currentActivity.hints.length > hintIndex && (
              <button
                onClick={handleShowHint}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-yellow-700 hover:bg-yellow-100 rounded-lg"
              >
                <HelpCircle className="w-4 h-4" />
                Get Hint
              </button>
            )}
            {state.submitted && !state.isCorrect && state.attempts < lesson.settings.maxAttempts && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again ({lesson.settings.maxAttempts - state.attempts} left)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentSectionIndex === 0 && currentActivityIndex === 0}
              className="flex items-center gap-1 px-4 py-2 text-muted hover:bg-surface-muted rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={
                currentSectionIndex === sections.length - 1 &&
                currentActivityIndex === activities.length - 1
              }
              className="flex items-center gap-1 px-4 py-2 bg-primary text-on-accent hover:bg-primary/90 rounded-lg disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY RENDERER
// ══════════════════════════════════════════════════════════════════════════════

interface ActivityRendererProps {
  activity: LessonActivity;
  state: ActivityState;
  onStateChange: (updates: Partial<ActivityState>) => void;
  onSubmit: (isCorrect: boolean) => void;
}

function ActivityRenderer({ activity, state, onStateChange, onSubmit }: ActivityRendererProps) {
  switch (activity.type) {
    case 'multiple_choice':
      return (
        <MultipleChoiceActivity
          content={activity.content as MultipleChoiceContent}
          state={state}
          onStateChange={onStateChange}
          onSubmit={onSubmit}
        />
      );
    case 'matching':
      return (
        <MatchingActivity
          content={activity.content as MatchingContent}
          state={state}
          onStateChange={onStateChange}
          onSubmit={onSubmit}
        />
      );
    case 'fill_in_blank':
      return (
        <FillInBlankActivity
          content={activity.content as FillInBlankContent}
          state={state}
          onStateChange={onStateChange}
          onSubmit={onSubmit}
        />
      );
    case 'ordering':
      return (
        <OrderingActivity
          content={activity.content as OrderingContent}
          state={state}
          onStateChange={onStateChange}
          onSubmit={onSubmit}
        />
      );
    case 'free_response':
      return (
        <FreeResponseActivity
          content={activity.content as FreeResponseContent}
          state={state}
          onStateChange={onStateChange}
          onSubmit={onSubmit}
        />
      );
    default:
      return (
        <div className="text-center text-gray-500 py-8">
          Preview for {activity.type.replace(/_/g, ' ')} coming soon
        </div>
      );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MULTIPLE CHOICE
// ══════════════════════════════════════════════════════════════════════════════

function MultipleChoiceActivity({
  content,
  state,
  onStateChange,
  onSubmit,
}: {
  content: MultipleChoiceContent;
  state: ActivityState;
  onStateChange: (updates: Partial<ActivityState>) => void;
  onSubmit: (isCorrect: boolean) => void;
}) {
  const handleSelect = (optionId: string) => {
    if (state.submitted) return;

    if (content.multiSelect) {
      const newSelected = state.selectedOptions.includes(optionId)
        ? state.selectedOptions.filter((id) => id !== optionId)
        : [...state.selectedOptions, optionId];
      onStateChange({ selectedOptions: newSelected });
    } else {
      onStateChange({ selectedOptions: [optionId] });
    }
  };

  const handleSubmit = () => {
    const correctIds = content.options.filter((o) => o.isCorrect).map((o) => o.id);
    const isCorrect =
      state.selectedOptions.length === correctIds.length &&
      state.selectedOptions.every((id) => correctIds.includes(id));
    onSubmit(isCorrect);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">{content.question}</p>

      <div className="space-y-2">
        {content.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={state.submitted}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
              state.selectedOptions.includes(option.id)
                ? state.submitted
                  ? option.isCorrect
                    ? 'border-success bg-success/10'
                    : 'border-error bg-error/10'
                  : 'border-primary bg-primary/10'
                : state.submitted && option.isCorrect
                ? 'border-success bg-success/10'
                : 'border-border hover:border-border'
            }`}
          >
            <span className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  state.selectedOptions.includes(option.id)
                    ? 'border-primary bg-primary text-on-accent'
                    : 'border-border'
                }`}
              >
                {state.selectedOptions.includes(option.id) && <Check className="w-4 h-4" />}
              </span>
              {option.text}
            </span>
          </button>
        ))}
      </div>

      {!state.submitted && (
        <button
          onClick={handleSubmit}
          disabled={state.selectedOptions.length === 0}
          className="w-full py-3 bg-primary text-on-accent rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MATCHING
// ══════════════════════════════════════════════════════════════════════════════

function MatchingActivity({
  content,
  state,
  onStateChange,
  onSubmit,
}: {
  content: MatchingContent;
  state: ActivityState;
  onStateChange: (updates: Partial<ActivityState>) => void;
  onSubmit: (isCorrect: boolean) => void;
}) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const handleLeftClick = (pairId: string) => {
    if (state.submitted) return;
    setSelectedLeft(pairId);
  };

  const handleRightClick = (pairId: string) => {
    if (state.submitted || !selectedLeft) return;
    onStateChange({
      matches: { ...state.matches, [selectedLeft]: pairId },
    });
    setSelectedLeft(null);
  };

  const handleSubmit = () => {
    const isCorrect = content.pairs.every(
      (pair) => state.matches[pair.id] === pair.id
    );
    onSubmit(isCorrect);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">{content.prompt}</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {content.pairs.map((pair) => (
            <button
              key={`left-${pair.id}`}
              onClick={() => handleLeftClick(pair.id)}
              className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                selectedLeft === pair.id
                  ? 'border-primary bg-primary/10'
                  : state.matches[pair.id]
                  ? 'border-success bg-success/10'
                  : 'border-border hover:border-border'
              }`}
            >
              {pair.left.text}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {content.pairs.map((pair) => (
            <button
              key={`right-${pair.id}`}
              onClick={() => handleRightClick(pair.id)}
              className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                Object.values(state.matches).includes(pair.id)
                  ? 'border-success bg-success/10'
                  : 'border-border hover:border-border'
              }`}
            >
              {pair.right.text}
            </button>
          ))}
        </div>
      </div>

      {!state.submitted && (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(state.matches).length !== content.pairs.length}
          className="w-full py-3 bg-primary text-on-accent rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FILL IN BLANK
// ══════════════════════════════════════════════════════════════════════════════

function FillInBlankActivity({
  content,
  state,
  onStateChange,
  onSubmit,
}: {
  content: FillInBlankContent;
  state: ActivityState;
  onStateChange: (updates: Partial<ActivityState>) => void;
  onSubmit: (isCorrect: boolean) => void;
}) {
  const parts = content.text.split('[blank]');
  const blanks = content.blanks || [];

  const handleChange = (index: number, value: string) => {
    onStateChange({
      textInputs: { ...state.textInputs, [index]: value },
    });
  };

  const handleSubmit = () => {
    let correctCount = 0;
    blanks.forEach((blank, index) => {
      const userAnswer = state.textInputs[index] || '';
      const isCorrect = blank.correctAnswers.some((answer) =>
        content.caseSensitive
          ? userAnswer === answer
          : userAnswer.toLowerCase() === answer.toLowerCase()
      );
      if (isCorrect) correctCount++;
    });
    onSubmit(correctCount === blanks.length);
  };

  return (
    <div className="space-y-4">
      <div className="text-lg leading-relaxed">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <input
                type="text"
                value={state.textInputs[index] || ''}
                onChange={(e) => handleChange(index, e.target.value)}
                disabled={state.submitted}
                className="inline-block w-32 mx-1 px-2 py-1 border-b-2 border-primary bg-primary/10 text-center focus:outline-none focus:bg-primary/20"
                placeholder="..."
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {!state.submitted && (
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-primary text-on-accent rounded-lg hover:bg-primary/90"
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ORDERING
// ══════════════════════════════════════════════════════════════════════════════

function OrderingActivity({
  content,
  state,
  onStateChange,
  onSubmit,
}: {
  content: OrderingContent;
  state: ActivityState;
  onStateChange: (updates: Partial<ActivityState>) => void;
  onSubmit: (isCorrect: boolean) => void;
}) {
  // Initialize ordering if empty
  React.useEffect(() => {
    if (state.ordering.length === 0 && content.items.length > 0) {
      const shuffled = [...content.items]
        .sort(() => Math.random() - 0.5)
        .map((item) => item.id);
      onStateChange({ ordering: shuffled });
    }
  }, [content.items, state.ordering.length, onStateChange]);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (state.submitted) return;
    const newOrdering = [...state.ordering];
    const [removed] = newOrdering.splice(fromIndex, 1);
    newOrdering.splice(toIndex, 0, removed);
    onStateChange({ ordering: newOrdering });
  };

  const handleSubmit = () => {
    const isCorrect = state.ordering.every((id, index) => {
      const item = content.items.find((i) => i.id === id);
      return item?.correctPosition === index;
    });
    onSubmit(isCorrect);
  };

  const getItemById = (id: string) => content.items.find((item) => item.id === id);

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">{content.prompt}</p>

      <div className="space-y-2">
        {state.ordering.map((itemId, index) => {
          const item = getItemById(itemId);
          if (!item) return null;
          return (
            <div
              key={itemId}
              className="flex items-center gap-2 p-3 bg-surface border rounded-lg"
            >
              <span className="w-6 h-6 flex items-center justify-center bg-surface-muted rounded-full text-sm font-medium">
                {index + 1}
              </span>
              <span className="flex-1">{item.content}</span>
              {!state.submitted && (
                <div className="flex gap-1">
                  <button
                    onClick={() => moveItem(index, Math.max(0, index - 1))}
                    disabled={index === 0}
                    className="p-1 hover:bg-surface-muted rounded disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(index, Math.min(state.ordering.length - 1, index + 1))}
                    disabled={index === state.ordering.length - 1}
                    className="p-1 hover:bg-surface-muted rounded disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!state.submitted && (
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-primary text-on-accent rounded-lg hover:bg-primary/90"
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FREE RESPONSE
// ══════════════════════════════════════════════════════════════════════════════

function FreeResponseActivity({
  content,
  state,
  onStateChange,
  onSubmit,
}: {
  content: FreeResponseContent;
  state: ActivityState;
  onStateChange: (updates: Partial<ActivityState>) => void;
  onSubmit: (isCorrect: boolean) => void;
}) {
  const response = state.textInputs['response'] || '';
  const wordCount = response.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = () => {
    // Free response is always "correct" when submitted
    onSubmit(true);
  };

  const isValid =
    (!content.minWords || wordCount >= content.minWords) &&
    (!content.maxWords || wordCount <= content.maxWords);

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">{content.prompt}</p>

      <textarea
        value={response}
        onChange={(e) => onStateChange({ textInputs: { response: e.target.value } })}
        disabled={state.submitted}
        rows={6}
        className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
        placeholder="Type your response here..."
      />

      <div className="flex items-center justify-between text-sm text-muted">
        <span>Word count: {wordCount}</span>
        {(content.minWords || content.maxWords) && (
          <span>
            {content.minWords && `Min: ${content.minWords}`}
            {content.minWords && content.maxWords && ' | '}
            {content.maxWords && `Max: ${content.maxWords}`}
          </span>
        )}
      </div>

      {!state.submitted && (
        <button
          onClick={handleSubmit}
          disabled={!isValid || response.trim().length === 0}
          className="w-full py-3 bg-primary text-on-accent rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          Submit Response
        </button>
      )}
    </div>
  );
}

export default LessonPreview;
