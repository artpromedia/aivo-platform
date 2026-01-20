'use client';

import React, { useState } from 'react';

import {
  createTask,
  updateTask,
  deleteTask,
  breakdownTask,
  getAITaskBreakdown,
} from '../../../../lib/executive-function-api';
import type { Task, Subtask, AISubtaskSuggestion } from '../../../../lib/executive-function-api';

// Priority colors and icons
const PRIORITY_CONFIG = {
  high: {
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: '🔴',
    label: 'High Priority',
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: '🟡',
    label: 'Medium Priority',
  },
  low: {
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: '🟢',
    label: 'Low Priority',
  },
};

function getPriorityColor(priority: string): string {
  return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.color ||
    'bg-slate-100 text-slate-700 border-slate-200';
}

function getPriorityIcon(priority: string): string {
  return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.icon || '⚪';
}

interface TaskManagerProps {
  learnerId: string;
  tasks: Task[];
  onUpdate: () => void;
}

type ViewMode = 'list' | 'calendar';

/**
 * Task Manager Component
 *
 * Provides task breakdown and management features with AI-powered assistance
 */
export function TaskManager({ learnerId, tasks, onUpdate }: Readonly<TaskManagerProps>) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [breakdowningTask, setBreakdowningTask] = useState<Task | null>(null);
  const [aiBreakdownTask, setAIBreakdownTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const filteredTasks = tasks.filter((task) => filter === 'all' || task.status === filter);
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  // Group tasks by due date for calendar view
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'completed') return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });

  const todayTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime();
  });

  const upcomingTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due > today;
  });

  async function handleCreateTask(taskData: Partial<Task>) {
    try {
      await createTask(learnerId, taskData);
      setShowCreateForm(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    }
  }

  async function handleUpdateTask(taskId: string, updates: Partial<Task>) {
    try {
      await updateTask(taskId, updates);
      setEditingTask(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task. Please try again.');
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask(taskId);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  }

  async function handleBreakdown(taskId: string, subtasks: Omit<Subtask, 'id'>[]) {
    try {
      await breakdownTask(taskId, subtasks);
      setBreakdowningTask(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to breakdown task:', error);
      alert('Failed to breakdown task. Please try again.');
    }
  }

  // Bulk actions
  function toggleTaskSelection(taskId: string) {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
    setShowBulkActions(newSelected.size > 0);
  }

  function selectAllTasks() {
    const allIds = new Set(filteredTasks.map((t) => t.id));
    setSelectedTasks(allIds);
    setShowBulkActions(true);
  }

  function clearSelection() {
    setSelectedTasks(new Set());
    setShowBulkActions(false);
  }

  async function bulkMarkComplete() {
    try {
      await Promise.all(
        Array.from(selectedTasks).map((id) =>
          updateTask(id, { status: 'completed', completedAt: new Date().toISOString() })
        )
      );
      clearSelection();
      onUpdate();
    } catch (error) {
      console.error('Failed to complete tasks:', error);
      alert('Failed to complete some tasks.');
    }
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selectedTasks.size} selected tasks?`)) return;
    try {
      await Promise.all(Array.from(selectedTasks).map((id) => deleteTask(id)));
      clearSelection();
      onUpdate();
    } catch (error) {
      console.error('Failed to delete tasks:', error);
      alert('Failed to delete some tasks.');
    }
  }

  // Calculate subtask progress
  function getSubtaskProgress(task: Task): number {
    if (task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter((st) => st.completed).length;
    return (completed / task.subtasks.length) * 100;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{tasks.length}</div>
          <div className="mt-1 text-sm text-white/80">Total Tasks</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{todoTasks.length}</div>
          <div className="mt-1 text-sm text-white/80">To Do</div>
          {overdueTasks.length > 0 && (
            <div className="mt-2 rounded bg-white/20 px-2 py-1 text-xs">
              ⚠️ {overdueTasks.length} overdue
            </div>
          )}
        </div>
        <div className="rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{inProgressTasks.length}</div>
          <div className="mt-1 text-sm text-white/80">In Progress</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-green-500 to-teal-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{completedTasks.length}</div>
          <div className="mt-1 text-sm text-white/80">Completed</div>
          {tasks.length > 0 && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-white transition-all"
                style={{ width: `${(completedTasks.length / tasks.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {/* Filter buttons */}
          {(['all', 'todo', 'in-progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}

          {/* View mode toggle */}
          <div className="ml-2 flex rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-l-lg px-3 py-2 text-sm ${
                viewMode === 'list' ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
              title="List view"
            >
              📋
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`rounded-r-lg px-3 py-2 text-sm ${
                viewMode === 'calendar' ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
              title="Calendar view"
            >
              📅
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {filteredTasks.length > 0 && (
            <button
              onClick={selectedTasks.size === filteredTasks.length ? clearSelection : selectAllTasks}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              {selectedTasks.size === filteredTasks.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
          <span className="text-sm font-medium text-blue-700">
            {selectedTasks.size} task(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={bulkMarkComplete}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              ✓ Mark Complete
            </button>
            <button
              onClick={bulkDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={clearSelection}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="space-y-6">
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-600">
                ⚠️ Overdue ({overdueTasks.length})
              </h3>
              <div className="space-y-2">
                {overdueTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTasks.has(task.id)}
                    onSelect={() => toggleTaskSelection(task.id)}
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onBreakdown={() => setBreakdowningTask(task)}
                    onAIBreakdown={() => setAIBreakdownTask(task)}
                    onUpdate={handleUpdateTask}
                    getSubtaskProgress={getSubtaskProgress}
                    isOverdue
                  />
                ))}
              </div>
            </div>
          )}

          {/* Today */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-blue-600">
              📅 Today ({todayTasks.length})
            </h3>
            {todayTasks.length === 0 ? (
              <p className="text-slate-500">No tasks due today</p>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTasks.has(task.id)}
                    onSelect={() => toggleTaskSelection(task.id)}
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onBreakdown={() => setBreakdowningTask(task)}
                    onAIBreakdown={() => setAIBreakdownTask(task)}
                    onUpdate={handleUpdateTask}
                    getSubtaskProgress={getSubtaskProgress}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-green-600">
              🔮 Upcoming ({upcomingTasks.length})
            </h3>
            {upcomingTasks.length === 0 ? (
              <p className="text-slate-500">No upcoming tasks</p>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTasks.has(task.id)}
                    onSelect={() => toggleTaskSelection(task.id)}
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onBreakdown={() => setBreakdowningTask(task)}
                    onAIBreakdown={() => setAIBreakdownTask(task)}
                    onUpdate={handleUpdateTask}
                    getSubtaskProgress={getSubtaskProgress}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow">
              <div className="text-5xl">📝</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">No tasks yet</h3>
              <p className="mt-2 text-slate-600">Create your first task to get started!</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Task
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={selectedTasks.has(task.id)}
                onSelect={() => toggleTaskSelection(task.id)}
                onEdit={() => setEditingTask(task)}
                onDelete={() => handleDeleteTask(task.id)}
                onBreakdown={() => setBreakdowningTask(task)}
                onAIBreakdown={() => setAIBreakdownTask(task)}
                onUpdate={handleUpdateTask}
                getSubtaskProgress={getSubtaskProgress}
              />
            ))
          )}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateForm && (
        <TaskForm
          learnerId={learnerId}
          onSubmit={handleCreateTask}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskForm
          learnerId={learnerId}
          task={editingTask}
          onSubmit={(data) => handleUpdateTask(editingTask.id, data)}
          onCancel={() => setEditingTask(null)}
        />
      )}

      {/* Manual Breakdown Modal */}
      {breakdowningTask && (
        <BreakdownModal
          task={breakdowningTask}
          onSubmit={(subtasks) => handleBreakdown(breakdowningTask.id, subtasks)}
          onCancel={() => setBreakdowningTask(null)}
        />
      )}

      {/* AI Breakdown Modal */}
      {aiBreakdownTask && (
        <AIBreakdownModal
          learnerId={learnerId}
          task={aiBreakdownTask}
          onSubmit={(subtasks) => handleBreakdown(aiBreakdownTask.id, subtasks)}
          onCancel={() => setAIBreakdownTask(null)}
        />
      )}
    </div>
  );
}

// Task Card Component
function TaskCard({
  task,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onBreakdown,
  onAIBreakdown,
  onUpdate,
  getSubtaskProgress,
  isOverdue = false,
}: Readonly<{
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onBreakdown: () => void;
  onAIBreakdown: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  getSubtaskProgress: (task: Task) => number;
  isOverdue?: boolean;
}>) {
  const progress = getSubtaskProgress(task);

  return (
    <div
      className={`rounded-xl bg-white p-6 shadow transition hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isOverdue ? 'border-l-4 border-red-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <input
              type="checkbox"
              checked={task.status === 'completed'}
              onChange={(e) =>
                onUpdate(task.id, {
                  status: e.target.checked ? 'completed' : 'todo',
                  completedAt: e.target.checked ? new Date().toISOString() : undefined,
                })
              }
              className="h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-xl" title={PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.label}>
              {getPriorityIcon(task.priority)}
            </span>
            <h3
              className={`text-lg font-bold ${
                task.status === 'completed'
                  ? 'text-slate-400 line-through'
                  : 'text-slate-900'
              }`}
            >
              {task.title}
            </h3>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getPriorityColor(task.priority)}`}
            >
              {task.priority}
            </span>
          </div>

          {task.description && (
            <p className="mt-2 text-sm text-slate-600">{task.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-4">
            {task.dueDate && (
              <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                <span>📅</span>
                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                {isOverdue && <span className="rounded bg-red-100 px-2 py-0.5 text-xs">OVERDUE</span>}
              </div>
            )}
            {task.estimatedMinutes && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>⏱️</span>
                <span>{task.estimatedMinutes} min estimated</span>
              </div>
            )}
          </div>

          {/* Subtasks with progress bar */}
          {task.subtasks.length > 0 && (
            <div className="mt-4">
              {/* Progress bar */}
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length}
                </span>
              </div>

              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <label key={subtask.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={(e) => {
                        const updatedSubtasks = task.subtasks.map((st) =>
                          st.id === subtask.id ? { ...st, completed: e.target.checked } : st
                        );
                        onUpdate(task.id, { subtasks: updatedSubtasks });
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <span
                      className={`text-sm ${
                        subtask.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {task.subtasks.length === 0 && (
            <>
              <button
                onClick={onAIBreakdown}
                className="rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-2 text-xs font-medium text-white hover:from-purple-600 hover:to-blue-600"
                title="AI-powered breakdown"
              >
                ✨ AI Breakdown
              </button>
              <button
                onClick={onBreakdown}
                className="rounded-lg bg-purple-100 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-200"
                title="Manual breakdown"
              >
                🧩 Manual
              </button>
            </>
          )}
          <button
            onClick={onEdit}
            className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-200"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Task Form Component
function TaskForm({
  learnerId,
  task,
  onSubmit,
  onCancel,
}: Readonly<{
  learnerId: string;
  task?: Task;
  onSubmit: (data: Partial<Task>) => void;
  onCancel: () => void;
}>) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate || '',
    tags: task?.tags.join(', ') || '',
    estimatedMinutes: task?.estimatedMinutes?.toString() || '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...formData,
      tags: formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      dueDate: formData.dueDate || undefined,
      estimatedMinutes: formData.estimatedMinutes ? parseInt(formData.estimatedMinutes, 10) : undefined,
    } as Partial<Task>);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{task ? 'Edit Task' : 'New Task'}</h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700">
              Title *
            </label>
            <input
              id="task-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-description" className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="task-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-priority" className="block text-sm font-medium text-slate-700">
                Priority
              </label>
              <select
                id="task-priority"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as 'low' | 'medium' | 'high',
                  })
                }
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-due-date" className="block text-sm font-medium text-slate-700">
                Due Date
              </label>
              <input
                id="task-due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-estimated" className="block text-sm font-medium text-slate-700">
              Estimated Time (minutes)
            </label>
            <input
              id="task-estimated"
              type="number"
              value={formData.estimatedMinutes}
              onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })}
              placeholder="e.g., 30"
              min="1"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-tags" className="block text-sm font-medium text-slate-700">
              Tags (comma-separated)
            </label>
            <input
              id="task-tags"
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="homework, math, urgent"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              {task ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Manual Breakdown Modal Component
function BreakdownModal({
  task,
  onSubmit,
  onCancel,
}: Readonly<{
  task: Task;
  onSubmit: (subtasks: Omit<Subtask, 'id'>[]) => void;
  onCancel: () => void;
}>) {
  const [subtasks, setSubtasks] = useState<string[]>(['', '', '']);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validSubtasks = subtasks
      .filter((s) => s.trim())
      .map((title, index) => ({
        title: title.trim(),
        completed: false,
        order: index,
      }));

    if (validSubtasks.length === 0) {
      alert('Please add at least one subtask');
      return;
    }

    onSubmit(validSubtasks);
  }

  function addSubtask() {
    setSubtasks([...subtasks, '']);
  }

  function removeSubtask(index: number) {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">Break Down Task</h2>
        <p className="mt-2 text-sm text-slate-600">
          Break &quot;{task.title}&quot; into smaller, manageable steps
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-3">
            {subtasks.map((subtask, index) => (
              <div key={`subtask-${index}`} className="flex gap-2">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={subtask}
                  onChange={(e) => {
                    const newSubtasks = [...subtasks];
                    newSubtasks[index] = e.target.value;
                    setSubtasks(newSubtasks);
                  }}
                  placeholder={`Step ${index + 1}`}
                  className="flex-1 rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
                {subtasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSubtask(index)}
                    className="rounded-lg bg-red-100 px-3 text-red-700 hover:bg-red-200"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSubtask}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            + Add Another Step
          </button>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Save Breakdown
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// AI Breakdown Modal Component
function AIBreakdownModal({
  learnerId,
  task,
  onSubmit,
  onCancel,
}: Readonly<{
  learnerId: string;
  task: Task;
  onSubmit: (subtasks: Omit<Subtask, 'id'>[]) => void;
  onCancel: () => void;
}>) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISubtaskSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function generateBreakdown() {
    try {
      setLoading(true);
      setError(null);
      const result = await getAITaskBreakdown(learnerId, task.title, task.description);
      setSuggestions(result.subtasks);
    } catch (err) {
      console.error('Failed to generate AI breakdown:', err);
      setError('Failed to generate breakdown. Please try again or use manual breakdown.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    const subtasks = suggestions.map((s, index) => ({
      title: s.title,
      completed: false,
      order: index,
    }));
    onSubmit(subtasks);
  }

  function updateSuggestion(index: number, title: string) {
    const newSuggestions = [...suggestions];
    newSuggestions[index] = { ...newSuggestions[index], title };
    setSuggestions(newSuggestions);
  }

  function removeSuggestion(index: number) {
    setSuggestions(suggestions.filter((_, i) => i !== index));
  }

  function addSuggestion() {
    setSuggestions([
      ...suggestions,
      { title: '', estimatedMin: 10, order: suggestions.length },
    ]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-2xl">
            ✨
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">AI Task Breakdown</h2>
            <p className="text-sm text-slate-600">
              Let AI help break down &quot;{task.title}&quot;
            </p>
          </div>
        </div>

        {suggestions.length === 0 && !loading && !error && (
          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Click the button below to let AI analyze your task and suggest steps.
            </p>
            <button
              onClick={generateBreakdown}
              className="mt-4 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 font-bold text-white hover:from-purple-700 hover:to-blue-700"
            >
              ✨ Generate Breakdown
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-6 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
            <p className="mt-4 text-slate-600">AI is analyzing your task...</p>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-center">
            <p className="text-red-700">{error}</p>
            <button
              onClick={generateBreakdown}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-600">
              Review and edit the suggested steps, then save:
            </p>

            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div key={`suggestion-${index}`} className="flex gap-2">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={suggestion.title}
                      onChange={(e) => updateSuggestion(index, e.target.value)}
                      className="w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
                    />
                    {suggestion.estimatedMin > 0 && (
                      <span className="mt-1 text-xs text-slate-500">
                        ~{suggestion.estimatedMin} min
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSuggestion(index)}
                    className="rounded-lg bg-red-100 px-3 text-red-700 hover:bg-red-200"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addSuggestion}
              className="text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              + Add Another Step
            </button>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSubmit}
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 font-medium text-white hover:from-purple-700 hover:to-blue-700"
              >
                Save Breakdown
              </button>
              <button
                onClick={generateBreakdown}
                disabled={loading}
                className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700 hover:bg-slate-200"
              >
                🔄 Regenerate
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
