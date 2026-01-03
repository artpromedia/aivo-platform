'use client';

import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../utils/cn.js';
import { Badge } from '../badge.js';
import { Button } from '../button.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface NotificationFiltersProps {
  filters: {
    types?: string[];
  };
  onChange: (filters: { types?: string[] }) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

const notificationTypes = [
  { id: 'ACHIEVEMENT', label: 'Achievements', category: 'learning' },
  { id: 'REMINDER', label: 'Reminders', category: 'learning' },
  { id: 'SESSION_SUMMARY', label: 'Session Summaries', category: 'learning' },
  { id: 'GOAL_UPDATE', label: 'Goal Updates', category: 'learning' },
  { id: 'MESSAGE', label: 'Messages', category: 'social' },
  { id: 'CONSENT_REQUEST', label: 'Consent Requests', category: 'account' },
  { id: 'SYSTEM', label: 'System', category: 'system' },
  { id: 'ALERT', label: 'Alerts', category: 'system' },
];

const categories = [
  { id: 'learning', label: 'Learning' },
  { id: 'social', label: 'Social' },
  { id: 'account', label: 'Account' },
  { id: 'system', label: 'System' },
];

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getCategoryCheckboxClass(allSelected: boolean, selectedCount: number): string {
  if (allSelected) {
    return 'bg-primary border-primary';
  }
  if (selectedCount > 0) {
    return 'bg-primary/50 border-primary';
  }
  return 'border-input';
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Notification Filters Component
 *
 * Allows users to filter notifications by type.
 */
export function NotificationFilters({
  filters,
  onChange,
  className,
}: Readonly<NotificationFiltersProps>) {
  const selectedTypes = filters.types ?? [];

  const toggleType = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      onChange({ types: selectedTypes.filter((t) => t !== typeId) });
    } else {
      onChange({ types: [...selectedTypes, typeId] });
    }
  };

  const toggleCategory = (categoryId: string) => {
    const categoryTypes = notificationTypes
      .filter((t) => t.category === categoryId)
      .map((t) => t.id);

    const allSelected = categoryTypes.every((t) => selectedTypes.includes(t));

    if (allSelected) {
      // Remove all types in this category
      onChange({
        types: selectedTypes.filter((t) => !categoryTypes.includes(t)),
      });
    } else {
      // Add all types in this category
      const newTypes = new Set([...selectedTypes, ...categoryTypes]);
      onChange({ types: Array.from(newTypes) });
    }
  };

  const clearFilters = () => {
    onChange({});
  };

  const hasFilters = selectedTypes.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Filter by type</h4>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-auto py-1 px-2 text-xs"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {categories.map((category) => {
          const categoryTypes = notificationTypes.filter(
            (t) => t.category === category.id
          );
          const selectedCount = categoryTypes.filter((t) =>
            selectedTypes.includes(t.id)
          ).length;
          const allSelected = selectedCount === categoryTypes.length;

          return (
            <div key={category.id} className="space-y-2">
              <button
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { toggleCategory(category.id); }}
              >
                <span
                  className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center',
                    getCategoryCheckboxClass(allSelected, selectedCount)
                  )}
                >
                  {(allSelected || selectedCount > 0) && (
                    <svg
                      className="h-3 w-3 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      {allSelected ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 12h14"
                        />
                      )}
                    </svg>
                  )}
                </span>
                {category.label}
              </button>

              <div className="flex flex-wrap gap-2 pl-6">
                {categoryTypes.map((type) => {
                  const isSelected = selectedTypes.includes(type.id);
                  return (
                    <Badge
                      key={type.id}
                      tone={isSelected ? 'info' : 'neutral'}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isSelected
                          ? 'hover:bg-primary/80'
                          : 'hover:bg-muted'
                      )}
                      onClick={() => { toggleType(type.id); }}
                    >
                      {type.label}
                      {isSelected && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Filters Summary */}
      {hasFilters && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Showing {selectedTypes.length} type{selectedTypes.length === 1 ? '' : 's'}
          </p>
        </div>
      )}
    </div>
  );
}
