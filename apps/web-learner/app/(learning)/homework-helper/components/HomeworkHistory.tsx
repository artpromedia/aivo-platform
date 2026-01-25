'use client';

import { useState } from 'react';

interface HomeworkHistoryProps {
  learnerId: string;
  onResume: (sessionId: string) => void;
}

interface HistoryItem {
  id: string;
  problem: string;
  subject: string;
  stepsCompleted: number;
  totalSteps: number;
  date: string;
  status: 'completed' | 'in-progress';
}

const MOCK_HISTORY: HistoryItem[] = [
  {
    id: 'session-1',
    problem: 'If Sarah has 24 apples and gives 1/3 to her friend, how many apples does she have left?',
    subject: 'Mathematics',
    stepsCompleted: 5,
    totalSteps: 5,
    date: '2026-01-25',
    status: 'completed',
  },
  {
    id: 'session-2',
    problem: 'What is the main idea of the passage about the water cycle?',
    subject: 'English Language Arts',
    stepsCompleted: 3,
    totalSteps: 4,
    date: '2026-01-24',
    status: 'in-progress',
  },
  {
    id: 'session-3',
    problem: 'Explain the difference between a producer and a consumer in an ecosystem.',
    subject: 'Science',
    stepsCompleted: 4,
    totalSteps: 4,
    date: '2026-01-23',
    status: 'completed',
  },
  {
    id: 'session-4',
    problem: 'Solve for x: 3x + 7 = 22',
    subject: 'Mathematics',
    stepsCompleted: 5,
    totalSteps: 5,
    date: '2026-01-22',
    status: 'completed',
  },
];

export function HomeworkHistory({ learnerId: _learnerId, onResume }: Readonly<HomeworkHistoryProps>) {
  const [history] = useState<HistoryItem[]>(MOCK_HISTORY);
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress'>('all');

  const filteredHistory = history.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const completedCount = history.filter((h) => h.status === 'completed').length;
  const inProgressCount = history.filter((h) => h.status === 'in-progress').length;

  const getSubjectIcon = (subject: string) => {
    switch (subject) {
      case 'Mathematics':
        return '🔢';
      case 'English Language Arts':
        return '📖';
      case 'Science':
        return '🔬';
      default:
        return '📝';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-blue-50 p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{history.length}</div>
          <div className="text-sm text-blue-800">Total Sessions</div>
        </div>
        <div className="rounded-xl bg-green-50 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{completedCount}</div>
          <div className="text-sm text-green-800">Completed</div>
        </div>
        <div className="rounded-xl bg-amber-50 p-4 text-center">
          <div className="text-3xl font-bold text-amber-600">{inProgressCount}</div>
          <div className="text-sm text-amber-800">In Progress</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'completed', label: 'Completed' },
          { id: 'in-progress', label: 'In Progress' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id as typeof filter); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
          <span className="text-4xl">📚</span>
          <p className="mt-2 text-slate-500">No homework sessions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                  {getSubjectIcon(item.subject)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-slate-900 line-clamp-2">{item.problem}</h4>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        <span>{item.subject}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                        item.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.status === 'completed' ? '✓ Done' : '⏳ In Progress'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${
                            item.status === 'completed' ? 'bg-green-500' : 'bg-amber-500'
                          }`}
                          style={{
                            width: `${(item.stepsCompleted / item.totalSteps) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-slate-500">
                        {item.stepsCompleted}/{item.totalSteps} steps
                      </span>
                    </div>

                    {item.status === 'in-progress' && (
                      <button
                        onClick={() => { onResume(item.id); }}
                        className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-200"
                      >
                        Resume →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
