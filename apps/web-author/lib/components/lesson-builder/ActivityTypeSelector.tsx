/**
 * Activity Type Selector
 * Modal/popover for selecting activity types when adding new activities
 */

'use client';

import React from 'react';
import {
  CheckSquare,
  Grid,
  Link2,
  Type,
  ArrowUpDown,
  MousePointer,
  Pencil,
  Mic,
  Video,
  FileText,
  Play,
  Beaker,
  Gamepad2,
  X,
} from 'lucide-react';
import type { ActivityType } from './types';

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY TYPE CONFIG
// ══════════════════════════════════════════════════════════════════════════════

interface ActivityTypeConfig {
  type: ActivityType;
  label: string;
  description: string;
  icon: React.ElementType;
  category: 'choice' | 'interactive' | 'response' | 'media' | 'advanced';
}

const ACTIVITY_TYPES: ActivityTypeConfig[] = [
  {
    type: 'multiple_choice',
    label: 'Multiple Choice',
    description: 'Single or multiple selection from options',
    icon: CheckSquare,
    category: 'choice',
  },
  {
    type: 'matching',
    label: 'Matching',
    description: 'Match items from two columns',
    icon: Link2,
    category: 'choice',
  },
  {
    type: 'fill_in_blank',
    label: 'Fill in the Blank',
    description: 'Complete text with missing words',
    icon: Type,
    category: 'choice',
  },
  {
    type: 'ordering',
    label: 'Ordering',
    description: 'Arrange items in correct order',
    icon: ArrowUpDown,
    category: 'choice',
  },
  {
    type: 'drag_and_drop',
    label: 'Drag & Drop',
    description: 'Drag items to correct locations',
    icon: Grid,
    category: 'interactive',
  },
  {
    type: 'hotspot',
    label: 'Hotspot',
    description: 'Click correct areas on an image',
    icon: MousePointer,
    category: 'interactive',
  },
  {
    type: 'drawing',
    label: 'Drawing',
    description: 'Draw or annotate on canvas',
    icon: Pencil,
    category: 'interactive',
  },
  {
    type: 'free_response',
    label: 'Free Response',
    description: 'Open-ended text response',
    icon: FileText,
    category: 'response',
  },
  {
    type: 'audio_response',
    label: 'Audio Response',
    description: 'Record audio answer',
    icon: Mic,
    category: 'response',
  },
  {
    type: 'video_response',
    label: 'Video Response',
    description: 'Record video answer',
    icon: Video,
    category: 'response',
  },
  {
    type: 'interactive_video',
    label: 'Interactive Video',
    description: 'Video with embedded questions',
    icon: Play,
    category: 'media',
  },
  {
    type: 'simulation',
    label: 'Simulation',
    description: 'Interactive science/math simulation',
    icon: Beaker,
    category: 'advanced',
  },
  {
    type: 'game',
    label: 'Game',
    description: 'Educational game activity',
    icon: Gamepad2,
    category: 'advanced',
  },
];

const CATEGORY_LABELS: Record<ActivityTypeConfig['category'], string> = {
  choice: 'Choice & Selection',
  interactive: 'Interactive',
  response: 'Open Response',
  media: 'Media-Based',
  advanced: 'Advanced',
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

interface ActivityTypeSelectorProps {
  onSelect: (type: ActivityType) => void;
  onClose: () => void;
}

export function ActivityTypeSelector({ onSelect, onClose }: ActivityTypeSelectorProps) {
  const categories = ['choice', 'interactive', 'response', 'media', 'advanced'] as const;

  return (
    <div className="bg-surface border rounded-lg shadow-xl w-96 max-h-[500px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-surface-muted">
        <h3 className="font-medium text-text">Add Activity</h3>
        <button onClick={onClose} className="p-1 hover:bg-surface-muted rounded">
          <X className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Activity Types */}
      <div className="overflow-y-auto max-h-[400px]">
        {categories.map((category) => {
          const categoryTypes = ACTIVITY_TYPES.filter((t) => t.category === category);
          if (categoryTypes.length === 0) return null;

          return (
            <div key={category} className="border-b last:border-b-0">
              <div className="px-4 py-2 bg-surface-muted text-xs font-semibold text-muted uppercase tracking-wide">
                {CATEGORY_LABELS[category]}
              </div>
              <div className="p-2">
                {categoryTypes.map((activityType) => (
                  <button
                    key={activityType.type}
                    onClick={() => onSelect(activityType.type)}
                    className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-primary/10 text-left transition-colors"
                  >
                    <div className="p-2 bg-surface-muted rounded-lg">
                      <activityType.icon className="w-5 h-5 text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text">{activityType.label}</div>
                      <div className="text-xs text-muted truncate">
                        {activityType.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ActivityTypeSelector;
