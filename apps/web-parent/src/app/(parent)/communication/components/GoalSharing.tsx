'use client';

import { useEffect, useState } from 'react';
import {
  getSharedGoals,
  getGoalDetails,
  addParentNote,
  updateGoalProgress,
  SharedGoal,
  GoalStatus,
} from '@/lib/parent-communication-api';

export function GoalSharing() {
  const [goals, setGoals] = useState<SharedGoal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<SharedGoal | null>(null);
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all');
  const [note, setNote] = useState('');
  const [progressValue, setProgressValue] = useState('');
  const [loading, setLoading] = useState(true);

  const selectedStudent = 'student-1';

  useEffect(() => {
    loadGoals();
  }, [statusFilter]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await getSharedGoals({
        studentId: selectedStudent,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setGoals(data);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGoal = async (goalId: string) => {
    try {
      const details = await getGoalDetails(goalId);
      setSelectedGoal(details);
      setNote('');
      setProgressValue('');
    } catch (error) {
      console.error('Failed to load goal details:', error);
    }
  };

  const handleAddNote = async () => {
    if (!selectedGoal || !note.trim()) return;

    try {
      const updated = await addParentNote(selectedGoal.id!, note);
      setSelectedGoal(updated);
      setNote('');
      loadGoals();
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedGoal || !progressValue.trim()) return;

    try {
      const current = parseFloat(progressValue);
      if (isNaN(current)) return;

      const updated = await updateGoalProgress(selectedGoal.id!, {
        current,
        notes: `Updated by parent to ${current}`,
      });
      setSelectedGoal(updated);
      setProgressValue('');
      loadGoals();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const getStatusColor = (status: GoalStatus) => {
    switch (status) {
      case 'notStarted':
        return 'bg-gray-100 text-gray-800';
      case 'inProgress':
        return 'bg-blue-100 text-blue-800';
      case 'achieved':
        return 'bg-green-100 text-green-800';
      case 'modified':
        return 'bg-yellow-100 text-yellow-800';
      case 'discontinued':
        return 'bg-red-100 text-red-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-600';
    if (progress >= 50) return 'bg-blue-600';
    if (progress >= 25) return 'bg-yellow-600';
    return 'bg-gray-600';
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading goals...</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Goals List */}
      <div className="space-y-4 lg:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Shared Goals</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as GoalStatus | 'all')}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
          >
            <option value="all">All Status</option>
            <option value="notStarted">Not Started</option>
            <option value="inProgress">In Progress</option>
            <option value="achieved">Achieved</option>
            <option value="modified">Modified</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>

        <div className="space-y-3">
          {goals.length === 0 ? (
            <div className="rounded-lg border border-gray-200 p-4 text-center text-sm text-gray-500">
              No goals found
            </div>
          ) : (
            goals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleSelectGoal(goal.id!)}
                className={`w-full rounded-lg border p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 ${
                  selectedGoal?.id === goal.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(goal.status)}`}
                  >
                    {goal.status}
                  </span>
                </div>
                <div className="mb-3 text-sm text-gray-600">{goal.category}</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full transition-all ${getProgressColor(goal.progress)}`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Goal Details */}
      <div className="lg:col-span-2">
        {!selectedGoal ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-gray-400">
            Select a goal to view details
          </div>
        ) : (
          <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
            {/* Header */}
            <div>
              <div className="mb-2 flex items-start justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{selectedGoal.title}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(selectedGoal.status)}`}
                >
                  {selectedGoal.status}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {selectedGoal.category} • {selectedGoal.teacherName}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="mb-2 font-semibold text-gray-900">Description</h3>
              <p className="text-gray-700">{selectedGoal.description}</p>
            </div>

            {/* Progress */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Progress</h3>
                <span className="text-2xl font-bold text-gray-900">
                  {selectedGoal.progress}%
                </span>
              </div>
              <div className="mb-3 h-4 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full transition-all ${getProgressColor(selectedGoal.progress)}`}
                  style={{ width: `${selectedGoal.progress}%` }}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs font-medium text-gray-500">Current</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {selectedGoal.current}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs font-medium text-gray-500">Target</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {selectedGoal.target}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="mb-1 text-sm font-medium text-gray-500">Start Date</h4>
                <div className="text-gray-900">
                  {new Date(selectedGoal.startDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <h4 className="mb-1 text-sm font-medium text-gray-500">Target Date</h4>
                <div className="text-gray-900">
                  {new Date(selectedGoal.targetDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Milestones */}
            {selectedGoal.milestones && selectedGoal.milestones.length > 0 && (
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">Milestones</h3>
                <div className="space-y-2">
                  {selectedGoal.milestones.map((milestone, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                    >
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          milestone.completed
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {milestone.completed ? '✓' : '○'}
                      </div>
                      <div className="flex-1">
                        <div
                          className={
                            milestone.completed
                              ? 'text-gray-500 line-through'
                              : 'text-gray-900'
                          }
                        >
                          {milestone.title}
                        </div>
                        {milestone.date && (
                          <div className="text-xs text-gray-400">
                            {new Date(milestone.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Support Strategies */}
            {selectedGoal.supportStrategies && selectedGoal.supportStrategies.length > 0 && (
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">
                  💡 Support Strategies at Home
                </h3>
                <ul className="space-y-2">
                  {selectedGoal.supportStrategies.map((strategy, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-600">•</span>
                      <span>{strategy}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes Section */}
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <div>
                <h4 className="mb-2 font-semibold text-gray-900">Teacher Notes</h4>
                <p className="text-gray-700">
                  {selectedGoal.teacherNotes || 'No notes yet'}
                </p>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-gray-900">Parent Notes</h4>
                <p className="text-gray-700">
                  {selectedGoal.parentNotes || 'No notes yet'}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Add a note
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Share your observations or ask a question..."
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!note.trim()}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            </div>

            {/* Update Progress */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-3 font-semibold text-blue-900">Update Progress</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={progressValue}
                  onChange={(e) => setProgressValue(e.target.value)}
                  placeholder={`Current: ${selectedGoal.current}`}
                  className="flex-1 rounded-md border border-blue-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleUpdateProgress}
                  disabled={!progressValue.trim()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
