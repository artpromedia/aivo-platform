'use client';

import { Fragment, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  User,
  Plus,
  Check,
  Circle,
  Settings,
  BookOpen,
  Clock,
  Star,
} from 'lucide-react';

export interface ChildData {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  gradeLevel: string;
  avatar?: string;
  subjects: string[];
  lastActive: string;
  currentStreak?: number;
  todayProgress?: {
    minutesLearned: number;
    lessonsCompleted: number;
  };
  status?: 'online' | 'offline' | 'learning';
}

interface EnhancedChildSelectorProps {
  children: ChildData[];
  selected: ChildData | null;
  onChange: (child: ChildData) => void;
  onAddChild?: () => void;
  showStatus?: boolean;
  showProgress?: boolean;
  compact?: boolean;
}

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  learning: 'bg-blue-500 animate-pulse',
};

const statusLabels = {
  online: 'Online',
  offline: 'Offline',
  learning: 'Learning Now',
};

export function EnhancedChildSelector({
  children,
  selected,
  onChange,
  onAddChild,
  showStatus = true,
  showProgress = true,
  compact = false,
}: EnhancedChildSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleClickOutside = () => {
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const getLastActiveText = (lastActive: string): string => {
    const date = new Date(lastActive);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 5) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return formatDistanceToNow(date, { addSuffix: true });
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (children.length === 0) {
    return (
      <button
        onClick={onAddChild}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span>Add Your First Child</span>
      </button>
    );
  }

  if (children.length === 1 && !compact) {
    const child = children[0];
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
        <div className="relative">
          {child.avatar ? (
            <img
              src={child.avatar}
              alt={`${child.name}'s avatar`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
          )}
          {showStatus && child.status && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColors[child.status]}`}
              title={statusLabels[child.status]}
            />
          )}
        </div>
        <div>
          <div className="font-semibold text-gray-900">{child.name}</div>
          <div className="text-xs text-gray-500">Grade {child.gradeLevel}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={handleClickOutside}
        />
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-indigo-400 transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select child: ${selected?.name || 'Select'}`}
      >
        {selected && (
          <>
            <div className="relative">
              {selected.avatar ? (
                <img
                  src={selected.avatar}
                  alt={`${selected.name}'s avatar`}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              {showStatus && selected.status && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColors[selected.status]}`}
                  title={statusLabels[selected.status]}
                />
              )}
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900">{selected.name}</div>
              <div className="text-xs text-gray-500">
                Grade {selected.gradeLevel}
                {selected.currentStreak && selected.currentStreak > 0 && (
                  <span className="ml-2 text-amber-600">
                    <Star className="w-3 h-3 inline" /> {selected.currentStreak} day streak
                  </span>
                )}
              </div>
            </div>
          </>
        )}
        <ChevronDown
          className={`w-5 h-5 text-gray-400 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
          {/* Children List */}
          <ul role="listbox" className="divide-y divide-gray-100">
            {children.map((child) => (
              <li
                key={child.id}
                role="option"
                aria-selected={child.id === selected?.id}
                onClick={() => {
                  onChange(child);
                  setIsOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onChange(child);
                    setIsOpen(false);
                  }
                }}
                tabIndex={0}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  child.id === selected?.id
                    ? 'bg-indigo-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="relative flex-shrink-0">
                  {child.avatar ? (
                    <img
                      src={child.avatar}
                      alt={`${child.name}'s avatar`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-600" />
                    </div>
                  )}
                  {showStatus && child.status && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusColors[child.status]}`}
                      title={statusLabels[child.status]}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{child.name}</span>
                    {child.id === selected?.id && (
                      <Check className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Grade {child.gradeLevel}</span>
                    {child.currentStreak && child.currentStreak > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Star className="w-3 h-3" />
                        {child.currentStreak}
                      </span>
                    )}
                  </div>

                  {/* Last Active */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    Last active: {getLastActiveText(child.lastActive)}
                  </div>

                  {/* Today's Progress */}
                  {showProgress && child.todayProgress && (
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        {child.todayProgress.minutesLearned}m today
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <BookOpen className="w-3 h-3 text-green-500" />
                        {child.todayProgress.lessonsCompleted} lessons
                      </span>
                    </div>
                  )}

                  {/* Subjects */}
                  {child.subjects && child.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {child.subjects.slice(0, 3).map((subject) => (
                        <span
                          key={subject}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {subject}
                        </span>
                      ))}
                      {child.subjects.length > 3 && (
                        <span className="px-2 py-0.5 text-gray-400 text-xs">
                          +{child.subjects.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="border-t border-gray-100 p-2">
            {onAddChild && (
              <button
                onClick={() => {
                  onAddChild();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Another Child
              </button>
            )}
            <button
              onClick={() => {
                router.push('/settings?tab=children');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              Manage Children
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
