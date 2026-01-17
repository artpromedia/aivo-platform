'use client';

import { useState } from 'react';
import { createTask, updateTask, deleteTask, breakdownTask } from '../../../../lib/executive-function-api';
import type { Task, Subtask } from '../../../../lib/executive-function-api';

// Utility function moved to outer scope
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

interface TaskManagerProps {
  learnerId: string;
  tasks: Task[];
  onUpdate: () => void;
}

/**
 * Task Manager Component
 * 
 * Provides task breakdown and management features
 */
export function TaskManager({ learnerId, tasks, onUpdate }: Readonly<TaskManagerProps>) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [breakdowningTask, setBreakdowningTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'completed'>('all');

  const filteredTasks = tasks.filter((task) => filter === 'all' || task.status === filter);
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

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
        </div>
        <div className="rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{inProgressTasks.length}</div>
          <div className="mt-1 text-sm text-white/80">In Progress</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-green-500 to-teal-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{completedTasks.length}</div>
          <div className="mt-1 text-sm text-white/80">Completed</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('todo')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === 'todo'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            To Do
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === 'in-progress'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Completed
          </button>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          + New Task
        </button>
      </div>

      {/* Task List */}
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
            <div key={task.id} className="rounded-xl bg-white p-6 shadow transition hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={(e) =>
                        handleUpdateTask(task.id, {
                          status: e.target.checked ? 'completed' : 'todo',
                          completedAt: e.target.checked ? new Date().toISOString() : undefined,
                        })
                      }
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <h3
                      className={`text-lg font-bold ${
                        task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'
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

                  {task.dueDate && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <span>📅</span>
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Subtasks */}
                  {task.subtasks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {task.subtasks.map((subtask) => (
                        <label key={subtask.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={subtask.completed}
                            onChange={(e) => {
                              const updatedSubtasks = task.subtasks.map((st) =>
                                st.id === subtask.id ? { ...st, completed: e.target.checked } : st
                              );
                              handleUpdateTask(task.id, { subtasks: updatedSubtasks });
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
                <div className="flex gap-2">
                  {task.subtasks.length === 0 && (
                    <button
                      onClick={() => setBreakdowningTask(task)}
                      className="rounded-lg bg-purple-100 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-200"
                      title="Break down task"
                    >
                      🧩 Breakdown
                    </button>
                  )}
                  <button
                    onClick={() => setEditingTask(task)}
                    className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateForm && (
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskForm
          task={editingTask}
          onSubmit={(data) => handleUpdateTask(editingTask.id, data)}
          onCancel={() => setEditingTask(null)}
        />
      )}

      {/* Breakdown Modal */}
      {breakdowningTask && (
        <BreakdownModal
          task={breakdowningTask}
          onSubmit={(subtasks) => handleBreakdown(breakdowningTask.id, subtasks)}
          onCancel={() => setBreakdowningTask(null)}
        />
      )}
    </div>
  );
}

// Task Form Component
function TaskForm({
  task,
  onSubmit,
  onCancel,
}: Readonly<{
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
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      dueDate: formData.dueDate || undefined,
    } as Partial<Task>);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{task ? 'Edit Task' : 'New Task'}</h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700">Title *</label>
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
            <label htmlFor="task-description" className="block text-sm font-medium text-slate-700">Description</label>
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
              <label htmlFor="task-priority" className="block text-sm font-medium text-slate-700">Priority</label>
              <select
                id="task-priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-due-date" className="block text-sm font-medium text-slate-700">Due Date</label>
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

// Breakdown Modal Component
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
          Break "{task.title}" into smaller, manageable steps
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-3">
            {subtasks.map((subtask, index) => (
              <div key={`subtask-${index}-${subtask.slice(0, 10)}`} className="flex gap-2">
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
