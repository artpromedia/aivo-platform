'use client';

/**
 * Lesson Plan Form Component
 *
 * Multi-step form for creating lesson plans with marketplace content.
 */

import { Button, Card } from '@aivo/ui-web';
import { useState } from 'react';

import { ContentPicker } from './content-picker';

interface LessonActivity {
  id: string;
  title: string;
  type: 'instruction' | 'practice' | 'assessment' | 'discussion';
  duration: number;
  contentId?: string;
  contentTitle?: string;
  contentType?: string;
}

interface LessonPlan {
  title: string;
  classroomId: string;
  objective: string;
  gradeBand: string;
  subject: string;
  duration: number;
  activities: LessonActivity[];
}

const ACTIVITY_TYPES = [
  { value: 'instruction', label: 'Direct Instruction', icon: '📖' },
  { value: 'practice', label: 'Guided Practice', icon: '✏️' },
  { value: 'assessment', label: 'Assessment', icon: '📋' },
  { value: 'discussion', label: 'Discussion', icon: '💬' },
];

export function LessonPlanForm() {
  const [plan, setPlan] = useState<LessonPlan>({
    title: '',
    classroomId: '',
    objective: '',
    gradeBand: 'GRADES_6_8',
    subject: 'MATHEMATICS',
    duration: 45,
    activities: [],
  });
  const [showContentPicker, setShowContentPicker] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);

  function addActivity(type: LessonActivity['type']) {
    const newActivity: LessonActivity = {
      id: `activity-${Date.now()}`,
      title: '',
      type,
      duration: 10,
    };
    setPlan((prev) => ({
      ...prev,
      activities: [...prev.activities, newActivity],
    }));
  }

  function removeActivity(id: string) {
    setPlan((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
    }));
  }

  function updateActivity(id: string, updates: Partial<LessonActivity>) {
    setPlan((prev) => ({
      ...prev,
      activities: prev.activities.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  }

  function openContentPicker(activityId: string) {
    setEditingActivityId(activityId);
    setShowContentPicker(true);
  }

  function handleContentSelect(contentId: string, contentTitle: string, contentType: string) {
    if (editingActivityId) {
      updateActivity(editingActivityId, {
        contentId,
        contentTitle,
        contentType,
      });
    }
    setShowContentPicker(false);
    setEditingActivityId(null);
  }

  function removeContent(activityId: string) {
    updateActivity(activityId, {
      contentId: undefined,
      contentTitle: undefined,
      contentType: undefined,
    });
  }

  const totalDuration = plan.activities.reduce((sum, a) => sum + a.duration, 0);

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Lesson Details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Lesson Title</label>
              <input
                type="text"
                value={plan.title}
                onChange={(e) => {
                  setPlan({ ...plan, title: e.target.value });
                }}
                placeholder="e.g., Introduction to Fractions"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={plan.duration}
                onChange={(e) => {
                  setPlan({ ...plan, duration: parseInt(e.target.value) || 0 });
                }}
                min={1}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Learning Objective</label>
            <textarea
              value={plan.objective}
              onChange={(e) => {
                setPlan({ ...plan, objective: e.target.value });
              }}
              placeholder="Students will be able to..."
              rows={2}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </Card>

      {/* Activities */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Activities</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">Total:</span>
              <span className={totalDuration > plan.duration ? 'text-red-600 font-medium' : ''}>
                {totalDuration} / {plan.duration} min
              </span>
            </div>
          </div>

          {plan.activities.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
              <p className="text-muted">No activities yet. Add an activity to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plan.activities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  index={index}
                  onUpdate={(updates) => {
                    updateActivity(activity.id, updates);
                  }}
                  onRemove={() => {
                    removeActivity(activity.id);
                  }}
                  onAddContent={() => {
                    openContentPicker(activity.id);
                  }}
                  onRemoveContent={() => {
                    removeContent(activity.id);
                  }}
                />
              ))}
            </div>
          )}

          {/* Add Activity Buttons */}
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  addActivity(type.value as LessonActivity['type']);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
              >
                <span>{type.icon}</span>
                <span>Add {type.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost">Save as Draft</Button>
        <Button variant="primary" disabled={!plan.title || plan.activities.length === 0}>
          Publish Lesson
        </Button>
      </div>

      {/* Content Picker Modal */}
      <ContentPicker
        open={showContentPicker}
        onClose={() => {
          setShowContentPicker(false);
          setEditingActivityId(null);
        }}
        onSelect={handleContentSelect}
        gradeBand={plan.gradeBand}
        subject={plan.subject}
      />
    </div>
  );
}

function ActivityCard({
  activity,
  index,
  onUpdate,
  onRemove,
  onAddContent,
  onRemoveContent,
}: {
  activity: LessonActivity;
  index: number;
  onUpdate: (updates: Partial<LessonActivity>) => void;
  onRemove: () => void;
  onAddContent: () => void;
  onRemoveContent: () => void;
}) {
  const typeInfo = ACTIVITY_TYPES.find((t) => t.value === activity.type);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-lg">
          {typeInfo?.icon}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted uppercase">
              {index + 1}. {typeInfo?.label}
            </span>
            <span className="text-xs text-muted">•</span>
            <input
              type="number"
              value={activity.duration}
              onChange={(e) => {
                onUpdate({ duration: parseInt(e.target.value) || 0 });
              }}
              min={1}
              className="w-16 rounded border border-border bg-transparent px-2 py-0.5 text-xs text-center focus:border-primary focus:outline-none"
            />
            <span className="text-xs text-muted">min</span>
          </div>

          {/* Title */}
          <input
            type="text"
            value={activity.title}
            onChange={(e) => {
              onUpdate({ title: e.target.value });
            }}
            placeholder="Activity description..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {/* Attached Content */}
          {activity.contentId ? (
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
              <span className="text-sm">
                {activity.contentType === 'CONTENT_PACK' ? '📚' : '🔧'}
              </span>
              <span className="text-sm font-medium flex-1">{activity.contentTitle}</span>
              <button
                onClick={onRemoveContent}
                className="text-muted hover:text-red-600"
                title="Remove content"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={onAddContent}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted hover:border-primary hover:text-primary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Content from Library
            </button>
          )}
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-red-600"
          title="Remove activity"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
