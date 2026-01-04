/**
 * Section List Component
 * Displays and manages lesson sections with drag-and-drop reordering
 */

'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
  Copy,
  Edit2,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { useLessonBuilder } from './LessonBuilderContext';
import { ActivityTypeSelector } from './ActivityTypeSelector';
import type { LessonSection, LessonActivity, ActivityType } from './types';

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY TYPE ICONS
// ══════════════════════════════════════════════════════════════════════════════

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  multiple_choice: 'Multiple Choice',
  drag_and_drop: 'Drag & Drop',
  matching: 'Matching',
  fill_in_blank: 'Fill in Blank',
  ordering: 'Ordering',
  hotspot: 'Hotspot',
  drawing: 'Drawing',
  audio_response: 'Audio Response',
  video_response: 'Video Response',
  free_response: 'Free Response',
  interactive_video: 'Interactive Video',
  simulation: 'Simulation',
  game: 'Game',
};

// ══════════════════════════════════════════════════════════════════════════════
// SECTION ITEM
// ══════════════════════════════════════════════════════════════════════════════

interface SectionItemProps {
  section: LessonSection;
  isSelected: boolean;
  onSelect: () => void;
}

function SectionItem({ section, isSelected, onSelect }: SectionItemProps) {
  const { state, dispatch, addActivity } = useLessonBuilder();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showActivitySelector, setShowActivitySelector] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(section.title);

  const handleTitleSave = () => {
    dispatch({
      type: 'UPDATE_SECTION',
      payload: { id: section.id, updates: { title: editTitle } },
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this section and all its activities?')) {
      dispatch({ type: 'DELETE_SECTION', payload: section.id });
    }
    setShowMenu(false);
  };

  const handleDuplicate = () => {
    // Create a copy of the section
    dispatch({
      type: 'ADD_SECTION',
      payload: {
        title: `${section.title} (Copy)`,
        isOptional: section.isOptional,
        activities: section.activities.map((a) => ({ ...a, id: undefined as unknown as string })),
        transitionType: section.transitionType,
        transitionConfig: section.transitionConfig,
      },
    });
    setShowMenu(false);
  };

  const handleAddActivity = (type: ActivityType) => {
    addActivity(section.id, type);
    setShowActivitySelector(false);
  };

  return (
    <div className={`border-b border-border ${isSelected ? 'bg-primary/10' : ''}`}>
      {/* Section Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-surface-muted cursor-pointer group"
        onClick={onSelect}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-0.5 hover:bg-surface-muted rounded"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted" />
          )}
        </button>

        <GripVertical className="w-4 h-4 text-muted/50 opacity-0 group-hover:opacity-100 cursor-grab" />

        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
            className="flex-1 text-sm font-medium border border-border rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-focus"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-text truncate">
            {section.title}
          </span>
        )}

        <span className="text-xs text-muted">{section.activities.length}</span>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-surface-muted rounded opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4 text-muted" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 z-10 w-36">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface-muted text-left"
              >
                <Edit2 className="w-4 h-4" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface-muted text-left"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <hr className="my-1 border-border" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-error/10 text-error text-left"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Activities */}
      {isExpanded && (
        <div className="pl-8 pr-2 pb-2">
          {section.activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              sectionId={section.id}
              isSelected={state.selectedActivityId === activity.id}
            />
          ))}

          {/* Add Activity Button */}
          <div className="relative">
            <button
              onClick={() => setShowActivitySelector(!showActivitySelector)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-muted hover:text-text hover:bg-surface-muted rounded"
            >
              <Plus className="w-4 h-4" />
              Add Activity
            </button>

            {showActivitySelector && (
              <div className="absolute left-0 top-full mt-1 z-20">
                <ActivityTypeSelector
                  onSelect={handleAddActivity}
                  onClose={() => setShowActivitySelector(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY ITEM
// ══════════════════════════════════════════════════════════════════════════════

interface ActivityItemProps {
  activity: LessonActivity;
  sectionId: string;
  isSelected: boolean;
}

function ActivityItem({ activity, sectionId, isSelected }: ActivityItemProps) {
  const { dispatch } = useLessonBuilder();

  const handleSelect = () => {
    dispatch({ type: 'SELECT_ACTIVITY', payload: activity.id });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'DELETE_ACTIVITY',
      payload: { sectionId, activityId: activity.id },
    });
  };

  return (
    <div
      onClick={handleSelect}
      className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer group ${
        isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-surface-muted'
      }`}
    >
      {activity.required ? (
        <Circle className="w-3 h-3 text-muted" />
      ) : (
        <CheckCircle className="w-3 h-3 text-success" />
      )}

      <span className="flex-1 text-sm truncate">{activity.title}</span>

      <span className="text-xs text-muted">
        {ACTIVITY_TYPE_LABELS[activity.type]?.split(' ')[0] || activity.type}
      </span>

      <button
        onClick={handleDelete}
        className="p-0.5 hover:bg-error/10 rounded opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3 h-3 text-error" />
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION LIST
// ══════════════════════════════════════════════════════════════════════════════

export function SectionList() {
  const { state, dispatch, addSection } = useLessonBuilder();
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!state.lesson) return null;

  const handleAddSection = () => {
    if (newSectionTitle.trim()) {
      addSection(newSectionTitle.trim());
      setNewSectionTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div className="divide-y">
      {state.lesson.sections
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((section) => (
          <SectionItem
            key={section.id}
            section={section}
            isSelected={state.selectedSectionId === section.id}
            onSelect={() => dispatch({ type: 'SELECT_SECTION', payload: section.id })}
          />
        ))}

      {/* Add Section */}
      <div className="p-3">
        {isAdding ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
              placeholder="Section title..."
              className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-focus"
              autoFocus
            />
            <button
              onClick={handleAddSection}
              className="px-2 py-1 bg-primary text-on-accent text-sm rounded hover:bg-primary/90"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewSectionTitle('');
              }}
              className="px-2 py-1 text-sm text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        )}
      </div>
    </div>
  );
}

export default SectionList;
