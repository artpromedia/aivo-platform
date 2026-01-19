/**
 * ClassSelector Component
 *
 * Dropdown selector for switching between classes with preview stats
 */

'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Class } from '@/lib/types';

interface ClassSelectorProps {
  classes: Class[];
  selected: Class | null;
  onChange: (cls: Class) => void;
  className?: string;
}

export function ClassSelector({ classes, selected, onChange, className }: ClassSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const getClassColor = (cls: Class) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
    ];
    const index = classes.findIndex((c) => c.id === cls.id) % colors.length;
    return cls.color || colors[index];
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted';
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-error';
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 transition-all',
          'hover:border-primary/50 hover:shadow-sm',
          isOpen && 'border-primary ring-2 ring-primary/20'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selected ? (
          <>
            <div className={cn('h-3 w-3 rounded-full', getClassColor(selected))} />
            <div className="text-left">
              <p className="font-medium text-text">{selected.name}</p>
              <p className="text-xs text-muted">
                {selected.studentCount} students
                {selected.period && ` • Period ${selected.period}`}
              </p>
            </div>
          </>
        ) : (
          <span className="text-muted">Select a class</span>
        )}
        <ChevronDownIcon className={cn('h-4 w-4 text-muted transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-surface shadow-lg"
          role="listbox"
        >
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-medium uppercase text-muted tracking-wide">
              Your Classes ({classes.length})
            </p>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => {
                    onChange(cls);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                    selected?.id === cls.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-surface-muted'
                  )}
                  role="option"
                  aria-selected={selected?.id === cls.id}
                >
                  <div className={cn('h-3 w-3 rounded-full flex-shrink-0', getClassColor(cls))} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">{cls.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>{cls.studentCount} students</span>
                      {cls.period && (
                        <>
                          <span>•</span>
                          <span>Period {cls.period}</span>
                        </>
                      )}
                      {cls.room && (
                        <>
                          <span>•</span>
                          <span>Room {cls.room}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-sm font-semibold', getScoreColor(cls.averageScore))}>
                      {cls.averageScore ? `${cls.averageScore}%` : '-'}
                    </p>
                    <p className="text-xs text-muted">avg</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-border p-2">
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-surface-muted transition-colors">
              <PlusIcon className="h-4 w-4" />
              <span>Create New Class</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
