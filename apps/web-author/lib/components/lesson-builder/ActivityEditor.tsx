/**
 * Activity Editor Component
 * Provides editing interface for different activity types
 */

'use client';

import React, { useState } from 'react';
import {
  Settings,
  HelpCircle,
  MessageSquare,
  Image as ImageIcon,
  Plus,
  Trash2,
  GripVertical,
  Check,
  X,
} from 'lucide-react';
import { useLessonBuilder } from './LessonBuilderContext';
import type {
  LessonActivity,
  MultipleChoiceContent,
  MultipleChoiceOption,
  MatchingContent,
  FillInBlankContent,
  OrderingContent,
  FreeResponseContent,
} from './types';

// ══════════════════════════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════════════════════════

type EditorTab = 'content' | 'feedback' | 'hints' | 'settings';

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function ActivityEditor() {
  const { state, dispatch, getSelectedActivity } = useLessonBuilder();
  const [activeTab, setActiveTab] = useState<EditorTab>('content');

  const activity = getSelectedActivity();

  if (!activity) {
    return null;
  }

  const findSectionForActivity = () => {
    if (!state.lesson) return null;
    for (const section of state.lesson.sections) {
      if (section.activities.some((a) => a.id === activity.id)) {
        return section;
      }
    }
    return null;
  };

  const section = findSectionForActivity();

  const updateActivity = (updates: Partial<LessonActivity>) => {
    if (!section) return;
    dispatch({
      type: 'UPDATE_ACTIVITY',
      payload: { sectionId: section.id, activityId: activity.id, updates },
    });
  };

  const tabs: { id: EditorTab; label: string; icon: React.ElementType }[] = [
    { id: 'content', label: 'Content', icon: Settings },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'hints', label: 'Hints', icon: HelpCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-surface border-b px-6 py-4">
        <input
          type="text"
          value={activity.title}
          onChange={(e) => updateActivity({ title: e.target.value })}
          className="text-lg font-semibold w-full border-none focus:outline-none focus:ring-2 focus:ring-focus rounded px-2 py-1"
          placeholder="Activity Title"
        />
        <div className="text-sm text-muted mt-1 capitalize">
          {activity.type.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface border-b px-6">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-surface-muted">
        {activeTab === 'content' && (
          <ContentEditor activity={activity} onUpdate={updateActivity} />
        )}
        {activeTab === 'feedback' && (
          <FeedbackEditor activity={activity} onUpdate={updateActivity} />
        )}
        {activeTab === 'hints' && (
          <HintsEditor activity={activity} onUpdate={updateActivity} />
        )}
        {activeTab === 'settings' && (
          <SettingsEditor activity={activity} onUpdate={updateActivity} />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT EDITOR
// ══════════════════════════════════════════════════════════════════════════════

interface EditorProps {
  activity: LessonActivity;
  onUpdate: (updates: Partial<LessonActivity>) => void;
}

function ContentEditor({ activity, onUpdate }: EditorProps) {
  const updateContent = (contentUpdates: Partial<LessonActivity['content']>) => {
    onUpdate({ content: { ...activity.content, ...contentUpdates } as LessonActivity['content'] });
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-surface rounded-lg p-4 shadow-sm">
        <label className="block text-sm font-medium text-text mb-2">
          Instructions
        </label>
        <textarea
          value={activity.instructions}
          onChange={(e) => onUpdate({ instructions: e.target.value })}
          rows={3}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
          placeholder="Enter instructions for this activity..."
        />
      </div>

      {/* Type-specific content editors */}
      {activity.type === 'multiple_choice' && (
        <MultipleChoiceEditor
          content={activity.content as MultipleChoiceContent}
          onUpdate={updateContent}
        />
      )}
      {activity.type === 'matching' && (
        <MatchingEditor
          content={activity.content as MatchingContent}
          onUpdate={updateContent}
        />
      )}
      {activity.type === 'fill_in_blank' && (
        <FillInBlankEditor
          content={activity.content as FillInBlankContent}
          onUpdate={updateContent}
        />
      )}
      {activity.type === 'ordering' && (
        <OrderingEditor
          content={activity.content as OrderingContent}
          onUpdate={updateContent}
        />
      )}
      {activity.type === 'free_response' && (
        <FreeResponseEditor
          content={activity.content as FreeResponseContent}
          onUpdate={updateContent}
        />
      )}
      {!['multiple_choice', 'matching', 'fill_in_blank', 'ordering', 'free_response'].includes(activity.type) && (
        <div className="bg-surface rounded-lg p-4 shadow-sm text-center text-muted">
          <p>Editor for {activity.type.replace(/_/g, ' ')} activities coming soon.</p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MULTIPLE CHOICE EDITOR
// ══════════════════════════════════════════════════════════════════════════════

function MultipleChoiceEditor({
  content,
  onUpdate,
}: {
  content: MultipleChoiceContent;
  onUpdate: (updates: Partial<MultipleChoiceContent>) => void;
}) {
  const addOption = () => {
    const newOption: MultipleChoiceOption = {
      id: crypto.randomUUID(),
      text: '',
      isCorrect: false,
    };
    onUpdate({ options: [...content.options, newOption] });
  };

  const updateOption = (index: number, updates: Partial<MultipleChoiceOption>) => {
    const newOptions = content.options.map((opt, i) =>
      i === index ? { ...opt, ...updates } : opt
    );
    onUpdate({ options: newOptions });
  };

  const removeOption = (index: number) => {
    onUpdate({ options: content.options.filter((_, i) => i !== index) });
  };

  const setCorrectAnswer = (index: number) => {
    if (content.multiSelect) {
      updateOption(index, { isCorrect: !content.options[index].isCorrect });
    } else {
      const newOptions = content.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }));
      onUpdate({ options: newOptions });
    }
  };

  return (
    <div className="bg-surface rounded-lg p-4 shadow-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-text mb-2">Question</label>
        <textarea
          value={content.question}
          onChange={(e) => onUpdate({ question: e.target.value })}
          rows={2}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
          placeholder="Enter your question..."
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={content.multiSelect}
            onChange={(e) => onUpdate({ multiSelect: e.target.checked })}
            className="rounded border-border text-primary focus:ring-focus"
          />
          <span className="text-sm text-muted">Allow multiple selections</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={content.shuffleOptions}
            onChange={(e) => onUpdate({ shuffleOptions: e.target.checked })}
            className="rounded border-border text-primary focus:ring-focus"
          />
          <span className="text-sm text-muted">Shuffle options</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-2">Options</label>
        <div className="space-y-2">
          {content.options.map((option, index) => (
            <div
              key={option.id}
              className={`flex items-center gap-2 p-2 border rounded-lg ${
                option.isCorrect ? 'border-success bg-success/10' : ''
              }`}
            >
              <GripVertical className="w-4 h-4 text-muted cursor-grab" />
              <button
                onClick={() => setCorrectAnswer(index)}
                className={`p-1 rounded-full ${
                  option.isCorrect
                    ? 'bg-success text-on-accent'
                    : 'border-2 border-border text-transparent hover:border-border'
                }`}
              >
                <Check className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={option.text}
                onChange={(e) => updateOption(index, { text: e.target.value })}
                className="flex-1 border-none focus:outline-none focus:ring-0 bg-transparent"
                placeholder={`Option ${index + 1}`}
              />
              <button
                onClick={() => removeOption(index)}
                className="p-1 hover:bg-error/10 rounded text-error"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addOption}
          className="mt-2 flex items-center gap-2 text-sm text-primary hover:text-primary"
        >
          <Plus className="w-4 h-4" />
          Add Option
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MATCHING EDITOR
// ══════════════════════════════════════════════════════════════════════════════

function MatchingEditor({
  content,
  onUpdate,
}: {
  content: MatchingContent;
  onUpdate: (updates: Partial<MatchingContent>) => void;
}) {
  const addPair = () => {
    onUpdate({
      pairs: [
        ...content.pairs,
        {
          id: crypto.randomUUID(),
          left: { text: '' },
          right: { text: '' },
        },
      ],
    });
  };

  const updatePair = (index: number, side: 'left' | 'right', text: string) => {
    const newPairs = content.pairs.map((pair, i) =>
      i === index ? { ...pair, [side]: { ...pair[side], text } } : pair
    );
    onUpdate({ pairs: newPairs });
  };

  const removePair = (index: number) => {
    onUpdate({ pairs: content.pairs.filter((_, i) => i !== index) });
  };

  return (
    <div className="bg-surface rounded-lg p-4 shadow-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-text mb-2">Prompt</label>
        <textarea
          value={content.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          rows={2}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
          placeholder="Match the items..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-2">Matching Pairs</label>
        <div className="space-y-2">
          {content.pairs.map((pair, index) => (
            <div key={pair.id} className="flex items-center gap-2">
              <input
                type="text"
                value={pair.left.text}
                onChange={(e) => updatePair(index, 'left', e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
                placeholder="Left item"
              />
              <span className="text-muted">↔</span>
              <input
                type="text"
                value={pair.right.text}
                onChange={(e) => updatePair(index, 'right', e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
                placeholder="Right item"
              />
              <button
                onClick={() => removePair(index)}
                className="p-2 hover:bg-error/10 rounded text-error"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addPair}
          className="mt-2 flex items-center gap-2 text-sm text-primary hover:text-primary"
        >
          <Plus className="w-4 h-4" />
          Add Pair
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FILL IN BLANK EDITOR
// ══════════════════════════════════════════════════════════════════════════════

function FillInBlankEditor({
  content,
  onUpdate,
}: {
  content: FillInBlankContent;
  onUpdate: (updates: Partial<FillInBlankContent>) => void;
}) {
  return (
    <div className="bg-surface rounded-lg p-4 shadow-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Text (use [blank] for blanks)
        </label>
        <textarea
          value={content.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          rows={4}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus font-mono"
          placeholder="The quick [blank] fox jumps over the [blank] dog."
        />
        <p className="text-xs text-muted mt-1">
          Type [blank] where you want students to fill in an answer
        </p>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={content.caseSensitive}
            onChange={(e) => onUpdate({ caseSensitive: e.target.checked })}
            className="rounded border-border text-primary focus:ring-focus"
          />
          <span className="text-sm text-muted">Case sensitive</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={content.allowPartialCredit}
            onChange={(e) => onUpdate({ allowPartialCredit: e.target.checked })}
            className="rounded border-border text-primary focus:ring-focus"
          />
          <span className="text-sm text-muted">Allow partial credit</span>
        </label>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ORDERING EDITOR
// ══════════════════════════════════════════════════════════════════════════════

function OrderingEditor({
  content,
  onUpdate,
}: {
  content: OrderingContent;
  onUpdate: (updates: Partial<OrderingContent>) => void;
}) {
  const addItem = () => {
    onUpdate({
      items: [
        ...content.items,
        {
          id: crypto.randomUUID(),
          content: '',
          correctPosition: content.items.length,
        },
      ],
    });
  };

  const updateItem = (index: number, text: string) => {
    const newItems = content.items.map((item, i) =>
      i === index ? { ...item, content: text } : item
    );
    onUpdate({ items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = content.items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, correctPosition: i }));
    onUpdate({ items: newItems });
  };

  return (
    <div className="bg-surface rounded-lg p-4 shadow-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-text mb-2">Prompt</label>
        <textarea
          value={content.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          rows={2}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
          placeholder="Put these items in the correct order..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Items (in correct order)
        </label>
        <div className="space-y-2">
          {content.items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="w-6 text-center text-sm text-muted">{index + 1}</span>
              <GripVertical className="w-4 h-4 text-muted cursor-grab" />
              <input
                type="text"
                value={item.content}
                onChange={(e) => updateItem(index, e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
                placeholder={`Item ${index + 1}`}
              />
              <button
                onClick={() => removeItem(index)}
                className="p-2 hover:bg-error/10 rounded text-error"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-2 flex items-center gap-2 text-sm text-primary hover:text-primary"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-2">Direction</label>
        <select
          value={content.direction}
          onChange={(e) => onUpdate({ direction: e.target.value as 'vertical' | 'horizontal' })}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
        >
          <option value="vertical">Vertical</option>
          <option value="horizontal">Horizontal</option>
        </select>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FREE RESPONSE EDITOR
// ══════════════════════════════════════════════════════════════════════════════

function FreeResponseEditor({
  content,
  onUpdate,
}: {
  content: FreeResponseContent;
  onUpdate: (updates: Partial<FreeResponseContent>) => void;
}) {
  return (
    <div className="bg-surface rounded-lg p-4 shadow-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-text mb-2">Prompt</label>
        <textarea
          value={content.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          rows={3}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
          placeholder="Write your response to the following..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Minimum Words
          </label>
          <input
            type="number"
            value={content.minWords || ''}
            onChange={(e) =>
              onUpdate({ minWords: e.target.value ? parseInt(e.target.value) : undefined })
            }
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
            placeholder="Optional"
            min={0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Maximum Words
          </label>
          <input
            type="number"
            value={content.maxWords || ''}
            onChange={(e) =>
              onUpdate({ maxWords: e.target.value ? parseInt(e.target.value) : undefined })
            }
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
            placeholder="Optional"
            min={0}
          />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FEEDBACK EDITOR
// ══════════════════════════════════════════════════════════════════════════════

function FeedbackEditor({ activity, onUpdate }: EditorProps) {
  const updateFeedback = (key: keyof typeof activity.feedback, value: unknown) => {
    onUpdate({ feedback: { ...activity.feedback, [key]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-lg p-4 shadow-sm">
        <h3 className="font-medium text-success mb-3">Correct Answer Feedback</h3>
        <textarea
          value={activity.feedback.correct.message}
          onChange={(e) =>
            updateFeedback('correct', { ...activity.feedback.correct, message: e.target.value })
          }
          rows={2}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
          placeholder="Great job! That's correct."
        />
      </div>

      <div className="bg-surface rounded-lg p-4 shadow-sm">
        <h3 className="font-medium text-error mb-3">Incorrect Answer Feedback</h3>
        <textarea
          value={activity.feedback.incorrect.message}
          onChange={(e) =>
            updateFeedback('incorrect', { ...activity.feedback.incorrect, message: e.target.value })
          }
          rows={2}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
          placeholder="Not quite. Try again!"
        />
      </div>

      <div className="bg-surface rounded-lg p-4 shadow-sm">
        <h3 className="font-medium text-text mb-3">Encouragement Messages</h3>
        <p className="text-sm text-muted mb-2">
          Random encouraging messages shown during the activity
        </p>
        <textarea
          value={activity.feedback.encouragement.join('\n')}
          onChange={(e) => updateFeedback('encouragement', e.target.value.split('\n'))}
          rows={3}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus font-mono text-sm"
          placeholder="You can do it!&#10;Keep trying!&#10;Almost there!"
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HINTS EDITOR
// ══════════════════════════════════════════════════════════════════════════════

function HintsEditor({ activity, onUpdate }: EditorProps) {
  const addHint = () => {
    onUpdate({
      hints: [
        ...activity.hints,
        {
          id: crypto.randomUUID(),
          orderIndex: activity.hints.length,
          text: '',
          pointsDeduction: 5,
        },
      ],
    });
  };

  const updateHint = (index: number, updates: Partial<typeof activity.hints[0]>) => {
    const newHints = activity.hints.map((hint, i) =>
      i === index ? { ...hint, ...updates } : hint
    );
    onUpdate({ hints: newHints });
  };

  const removeHint = (index: number) => {
    onUpdate({
      hints: activity.hints
        .filter((_, i) => i !== index)
        .map((h, i) => ({ ...h, orderIndex: i })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-lg p-4 shadow-sm">
        <p className="text-sm text-muted mb-4">
          Add hints that students can reveal for help. Each hint can have a point deduction.
        </p>

        <div className="space-y-3">
          {activity.hints.map((hint, index) => (
            <div key={hint.id} className="flex items-start gap-2 p-3 bg-surface-muted rounded-lg">
              <span className="w-6 h-6 flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                {index + 1}
              </span>
              <div className="flex-1 space-y-2">
                <textarea
                  value={hint.text}
                  onChange={(e) => updateHint(index, { text: e.target.value })}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
                  placeholder="Enter hint text..."
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted">Points deduction:</label>
                  <input
                    type="number"
                    value={hint.pointsDeduction}
                    onChange={(e) =>
                      updateHint(index, { pointsDeduction: parseInt(e.target.value) || 0 })
                    }
                    className="w-20 border rounded px-2 py-1 text-sm"
                    min={0}
                  />
                </div>
              </div>
              <button
                onClick={() => removeHint(index)}
                className="p-1 hover:bg-error/10 rounded text-error"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addHint}
          className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary"
        >
          <Plus className="w-4 h-4" />
          Add Hint
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS EDITOR
// ══════════════════════════════════════════════════════════════════════════════

function SettingsEditor({ activity, onUpdate }: EditorProps) {
  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-lg p-4 shadow-sm space-y-4">
        <h3 className="font-medium text-text">Activity Settings</h3>

        <div>
          <label className="block text-sm font-medium text-text mb-2">Points</label>
          <input
            type="number"
            value={activity.points}
            onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 0 })}
            className="w-32 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
            min={0}
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={activity.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="rounded border-border text-primary focus:ring-focus"
          />
          <span className="text-sm text-text">Required to complete lesson</span>
        </label>
      </div>

      <div className="bg-surface rounded-lg p-4 shadow-sm space-y-4">
        <h3 className="font-medium text-text">Accessibility</h3>

        <div>
          <label className="block text-sm font-medium text-text mb-2">ARIA Label</label>
          <input
            type="text"
            value={activity.accessibility.ariaLabel}
            onChange={(e) =>
              onUpdate({
                accessibility: { ...activity.accessibility, ariaLabel: e.target.value },
              })
            }
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
            placeholder="Descriptive label for screen readers"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Keyboard Instructions
          </label>
          <textarea
            value={activity.accessibility.keyboardInstructions || ''}
            onChange={(e) =>
              onUpdate({
                accessibility: {
                  ...activity.accessibility,
                  keyboardInstructions: e.target.value,
                },
              })
            }
            rows={2}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
            placeholder="Instructions for keyboard navigation"
          />
        </div>
      </div>
    </div>
  );
}

export default ActivityEditor;
