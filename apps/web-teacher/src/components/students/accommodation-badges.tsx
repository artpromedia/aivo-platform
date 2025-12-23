/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-condition */
/**
 * Accommodation Badges Component
 *
 * Display student accommodations with icons
 */

'use client';

import * as React from 'react';

import type { Accommodation, IEPAccommodation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AccommodationBadgesProps {
  accommodations: (Accommodation | IEPAccommodation | string)[];
  showDetails?: boolean;
  maxVisible?: number;
  className?: string;
}

// Accommodation type icons and colors
const accommodationConfig: Record<string, { icon: string; color: string; label: string }> = {
  extended_time: { icon: '⏱️', color: 'bg-blue-100 text-blue-700', label: 'Extended Time' },
  preferential_seating: {
    icon: '💺',
    color: 'bg-green-100 text-green-700',
    label: 'Preferential Seating',
  },
  reduced_assignments: {
    icon: '📉',
    color: 'bg-purple-100 text-purple-700',
    label: 'Reduced Assignments',
  },
  text_to_speech: { icon: '🔊', color: 'bg-orange-100 text-orange-700', label: 'Text to Speech' },
  speech_to_text: { icon: '🎤', color: 'bg-pink-100 text-pink-700', label: 'Speech to Text' },
  visual_aids: { icon: '👁️', color: 'bg-yellow-100 text-yellow-700', label: 'Visual Aids' },
  frequent_breaks: { icon: '☕', color: 'bg-teal-100 text-teal-700', label: 'Frequent Breaks' },
  quiet_space: { icon: '🤫', color: 'bg-indigo-100 text-indigo-700', label: 'Quiet Space' },
  calculator: { icon: '🧮', color: 'bg-cyan-100 text-cyan-700', label: 'Calculator' },
  note_taker: { icon: '📝', color: 'bg-lime-100 text-lime-700', label: 'Note Taker' },
  audio_recording: { icon: '🎧', color: 'bg-rose-100 text-rose-700', label: 'Audio Recording' },
  large_print: { icon: '🔍', color: 'bg-amber-100 text-amber-700', label: 'Large Print' },
  small_group: { icon: '👥', color: 'bg-emerald-100 text-emerald-700', label: 'Small Group' },
  movement_breaks: { icon: '🚶', color: 'bg-sky-100 text-sky-700', label: 'Movement Breaks' },
  fidget_tool: { icon: '🧩', color: 'bg-violet-100 text-violet-700', label: 'Fidget Tool' },
  check_ins: { icon: '✅', color: 'bg-fuchsia-100 text-fuchsia-700', label: 'Frequent Check-ins' },
  modified_tests: { icon: '📋', color: 'bg-red-100 text-red-700', label: 'Modified Tests' },
  graphic_organizers: {
    icon: '📊',
    color: 'bg-blue-100 text-blue-700',
    label: 'Graphic Organizers',
  },
};

export function AccommodationBadges({
  accommodations,
  showDetails = false,
  maxVisible = 5,
  className,
}: AccommodationBadgesProps) {
  const [expanded, setExpanded] = React.useState(false);

  const normalizedAccommodations = accommodations.map((acc) => {
    if (typeof acc === 'string') {
      return { type: acc, description: '' };
    }
    return acc;
  });

  const visible = expanded
    ? normalizedAccommodations
    : normalizedAccommodations.slice(0, maxVisible);
  const hiddenCount = normalizedAccommodations.length - maxVisible;

  if (normalizedAccommodations.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visible.map((accommodation, index) => {
        const config = accommodationConfig[accommodation.type] || {
          icon: '📌',
          color: 'bg-gray-100 text-gray-700',
          label: accommodation.type.replace(/_/g, ' '),
        };

        return (
          <span
            key={index}
            title={
              showDetails && accommodation.description ? accommodation.description : config.label
            }
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              config.color
            )}
          >
            <span>{config.icon}</span>
            {showDetails && <span>{config.label}</span>}
          </span>
        );
      })}

      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => {
            setExpanded(true);
          }}
          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
        >
          +{hiddenCount} more
        </button>
      )}

      {expanded && hiddenCount > 0 && (
        <button
          onClick={() => {
            setExpanded(false);
          }}
          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
        >
          Show less
        </button>
      )}
    </div>
  );
}

/**
 * Accommodation selector for forms
 */
interface AccommodationSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function AccommodationSelector({
  selected,
  onChange,
  className,
}: AccommodationSelectorProps) {
  const toggleAccommodation = (type: string) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3', className)}>
      {Object.entries(accommodationConfig).map(([type, config]) => (
        <button
          key={type}
          type="button"
          onClick={() => {
            toggleAccommodation(type);
          }}
          className={cn(
            'flex items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors',
            selected.includes(type)
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <span>{config.icon}</span>
          <span className="flex-1">{config.label}</span>
          {selected.includes(type) && <span className="text-primary-600">✓</span>}
        </button>
      ))}
    </div>
  );
}
