/**
 * Homework Helper Section Component
 *
 * Shows recent homework helper sessions for the parent to monitor
 * how their child is using the AI-assisted homework tool.
 */

'use client';

import { BookOpenCheck, Clock, CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HomeworkSession {
  id: string;
  subject: string;
  title: string;
  startedAt: string;
  completedAt?: string;
  progress: number;
  stepsCompleted: number;
  totalSteps: number;
}

interface HomeworkHelperSectionProps {
  sessions: HomeworkSession[];
  onViewAll?: () => void;
}

export function HomeworkHelperSection({ sessions, onViewAll }: HomeworkHelperSectionProps) {
  const recentSessions = sessions.slice(0, 3);
  const inProgressCount = sessions.filter(s => !s.completedAt).length;
  const completedCount = sessions.filter(s => s.completedAt).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BookOpenCheck className="w-5 h-5 text-purple-500" />
          Homework Helper
        </h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="flex gap-4 mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm">
          <Circle className="w-4 h-4 text-amber-500" />
          <span className="text-gray-600">
            {inProgressCount} in progress
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-gray-600">
            {completedCount} completed
          </span>
        </div>
      </div>

      {/* Session List */}
      {recentSessions.length === 0 ? (
        <div className="text-center py-6">
          <BookOpenCheck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No homework sessions yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Sessions will appear here when your child uses the homework helper
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentSessions.map((session) => (
            <HomeworkSessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

function HomeworkSessionCard({ session }: { session: HomeworkSession }) {
  const isCompleted = !!session.completedAt;

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      Math: 'bg-blue-100 text-blue-700',
      Reading: 'bg-green-100 text-green-700',
      Science: 'bg-purple-100 text-purple-700',
      Writing: 'bg-amber-100 text-amber-700',
      'Social Studies': 'bg-pink-100 text-pink-700',
    };
    return colors[subject] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSubjectColor(session.subject)}`}>
              {session.subject}
            </span>
            {isCompleted ? (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                Completed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <Clock className="w-3 h-3" />
                In Progress
              </span>
            )}
          </div>
          <p className="font-medium text-gray-900 text-sm truncate">
            {session.title}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{session.stepsCompleted}/{session.totalSteps} steps</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isCompleted
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-amber-400 to-orange-500'
            }`}
            style={{ width: `${session.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default HomeworkHelperSection;
