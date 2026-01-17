'use client';

import { useEffect, useState } from 'react';
import {
  getProgressUpdates,
  getUpdatesSummary,
  markUpdateAsRead,
  ProgressUpdate,
  UpdateType,
  UpdatePriority,
} from '@/lib/parent-communication-api';

export function ProgressUpdates() {
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    unread: number;
    byType: Record<UpdateType, number>;
    recentHighPriority: ProgressUpdate[];
  } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState('student-1');
  const [typeFilter, setTypeFilter] = useState<UpdateType | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedStudent, typeFilter, unreadOnly]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [updatesData, summaryData] = await Promise.all([
        getProgressUpdates({
          studentId: selectedStudent,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          unreadOnly,
        }),
        getUpdatesSummary(selectedStudent),
      ]);
      setUpdates(updatesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load progress updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (updateId: string) => {
    try {
      await markUpdateAsRead(updateId);
      loadData();
    } catch (error) {
      console.error('Failed to mark update as read:', error);
    }
  };

  const getPriorityColor = (priority: UpdatePriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: UpdateType) => {
    switch (type) {
      case 'academic':
        return '📚';
      case 'behavioral':
        return '⭐';
      case 'social':
        return '👥';
      case 'achievement':
        return '🏆';
      case 'alert':
        return '⚠️';
      case 'general':
        return '📝';
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading updates...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-medium text-gray-500">Total Updates</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{summary.total}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-medium text-gray-500">Unread</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">{summary.unread}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-medium text-gray-500">Academic Updates</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {summary.byType.academic || 0}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-medium text-gray-500">Achievements</div>
            <div className="mt-2 text-3xl font-bold text-purple-600">
              {summary.byType.achievement || 0}
            </div>
          </div>
        </div>
      )}

      {/* High Priority Alerts */}
      {summary && summary.recentHighPriority.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="mb-3 flex items-center text-lg font-semibold text-red-900">
            <span className="mr-2">⚠️</span>
            High Priority Updates
          </h3>
          <div className="space-y-2">
            {summary.recentHighPriority.map((update) => (
              <div
                key={update.id}
                className="rounded border border-red-300 bg-white p-3 text-sm"
              >
                <div className="font-medium text-red-900">{update.title}</div>
                <div className="mt-1 text-red-700">{update.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as UpdateType | 'all')}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <option value="all">All Types</option>
          <option value="academic">Academic</option>
          <option value="behavioral">Behavioral</option>
          <option value="social">Social</option>
          <option value="achievement">Achievement</option>
          <option value="alert">Alert</option>
          <option value="general">General</option>
        </select>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">Unread only</span>
        </label>
      </div>

      {/* Updates List */}
      <div className="space-y-4">
        {updates.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No updates found</div>
        ) : (
          updates.map((update) => (
            <div
              key={update.id}
              className={`rounded-lg border p-4 ${update.read ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(update.type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{update.title}</h3>
                      <div className="mt-1 text-sm text-gray-500">
                        {update.teacherName} • {new Date(update.timestamp).toLocaleDateString()}
                        {update.subject && <span> • {update.subject}</span>}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-gray-700">{update.description}</p>

                  {update.details && (
                    <p className="mt-2 text-sm text-gray-600">{update.details}</p>
                  )}

                  {update.metrics && update.metrics.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {update.metrics.map((metric, idx) => (
                        <div key={idx} className="rounded-md bg-gray-50 p-3">
                          <div className="text-xs font-medium text-gray-500">
                            {metric.label}
                          </div>
                          <div className="mt-1 flex items-baseline">
                            <div className="text-xl font-semibold text-gray-900">
                              {metric.value}
                            </div>
                            {metric.change !== undefined && (
                              <div
                                className={`ml-2 text-sm ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {metric.change >= 0 ? '↑' : '↓'} {Math.abs(metric.change)}%
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ml-4 flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${getPriorityColor(update.priority)}`}
                  >
                    {update.priority.charAt(0).toUpperCase() + update.priority.slice(1)}
                  </span>

                  {!update.read && (
                    <button
                      onClick={() => handleMarkAsRead(update.id!)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
