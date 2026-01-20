'use client';

import React, { useState, useCallback } from 'react';

import {
  getAITaskBreakdown,
  createTask,
  createSubtasksFromBreakdown,
  completeBackendTask,
} from '../../lib/executive-function-api';
import type {
  AITaskBreakdown,
  AISubtaskSuggestion,
  BackendTask,
} from '../../lib/executive-function-api';

interface TaskBreakdownProps {
  learnerId: string;
  existingTask?: BackendTask;
  onTaskCreated?: (task: BackendTask) => void;
  onComplete?: () => void;
}

interface LocalSubtask extends AISubtaskSuggestion {
  id: string;
  completed: boolean;
}

/**
 * TaskBreakdown Component
 *
 * AI-powered task breakdown tool that helps break large tasks
 * into smaller, manageable subtasks
 */
export function TaskBreakdown({
  learnerId,
  existingTask,
  onTaskCreated,
  onComplete,
}: Readonly<TaskBreakdownProps>) {
  const [taskTitle, setTaskTitle] = useState(existingTask?.title || '');
  const [taskDescription, setTaskDescription] = useState(existingTask?.description || '');
  const [breakdown, setBreakdown] = useState<AITaskBreakdown | null>(null);
  const [subtasks, setSubtasks] = useState<LocalSubtask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showStuckHelp, setShowStuckHelp] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [createdTask, setCreatedTask] = useState<BackendTask | null>(existingTask || null);

  const generateBreakdown = useCallback(async () => {
    if (!taskTitle.trim()) {
      alert('Please enter a task title');
      return;
    }

    try {
      setLoading(true);
      const result = await getAITaskBreakdown(learnerId, taskTitle, taskDescription);
      setBreakdown(result);

      // Convert to local subtasks with IDs
      const localSubtasks: LocalSubtask[] = result.subtasks.map((st, index) => ({
        ...st,
        id: `temp-${index}-${Date.now()}`,
        completed: false,
      }));
      setSubtasks(localSubtasks);
    } catch (error) {
      console.error('Failed to generate breakdown:', error);
      alert('Failed to generate task breakdown. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [learnerId, taskTitle, taskDescription]);

  async function handleCreateTask() {
    if (!taskTitle.trim() || subtasks.length === 0) return;

    try {
      setLoading(true);

      // Create the main task
      const taskData = {
        title: taskTitle,
        description: taskDescription,
        priority: 'MEDIUM' as const,
        status: 'NOT_STARTED' as const,
        estimatedMin: breakdown?.estimatedTotalMin,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_EXEC_FUNC_API_URL || 'http://localhost:8081/api/executive-function'}/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...taskData, learnerId }),
        }
      );

      if (!response.ok) throw new Error('Failed to create task');
      const newTask: BackendTask = await response.json();

      // Create subtasks
      const subtaskSuggestions: AISubtaskSuggestion[] = subtasks.map((st, index) => ({
        title: st.title,
        description: st.description,
        estimatedMin: st.estimatedMin,
        order: index,
      }));

      await createSubtasksFromBreakdown(newTask.id, subtaskSuggestions);
      setCreatedTask(newTask);
      onTaskCreated?.(newTask);
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubtaskToggle(id: string) {
    setSubtasks((prev) => {
      const updated = prev.map((st) =>
        st.id === id ? { ...st, completed: !st.completed } : st
      );

      // Check if all completed
      const allCompleted = updated.every((st) => st.completed);
      if (allCompleted && updated.length > 0) {
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          onComplete?.();
        }, 3000);
      }

      return updated;
    });
  }

  function handleSubtaskEdit(id: string, title: string) {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, title } : st))
    );
  }

  function handleSubtaskTimeEdit(id: string, minutes: number) {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, estimatedMin: minutes } : st))
    );
  }

  function addSubtask() {
    const newSubtask: LocalSubtask = {
      id: `manual-${Date.now()}`,
      title: '',
      estimatedMin: 10,
      order: subtasks.length,
      completed: false,
    };
    setSubtasks([...subtasks, newSubtask]);
  }

  function removeSubtask(id: string) {
    setSubtasks((prev) => prev.filter((st) => st.id !== id));
  }

  // Drag and drop handlers
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSubtasks = [...subtasks];
    const draggedItem = newSubtasks[draggedIndex];
    newSubtasks.splice(draggedIndex, 1);
    newSubtasks.splice(index, 0, draggedItem);

    setSubtasks(newSubtasks);
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  const completedCount = subtasks.filter((st) => st.completed).length;
  const totalMinutes = subtasks.reduce((sum, st) => sum + st.estimatedMin, 0);
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="text-8xl">🎉</div>
            <div className="mt-4 text-3xl font-bold text-white">Amazing work!</div>
            <p className="mt-2 text-lg text-white/80">
              You&apos;ve completed all the steps!
            </p>
          </div>
        </div>
      )}

      {/* Task Input */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-bold text-slate-900">
          🧩 Break Down Your Task
        </h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700">
              What&apos;s the big task you need to do?
            </label>
            <input
              id="task-title"
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g., Write a book report on Charlotte's Web"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
              disabled={!!existingTask}
            />
          </div>

          <div>
            <label htmlFor="task-desc" className="block text-sm font-medium text-slate-700">
              Any details that might help? (optional)
            </label>
            <textarea
              id="task-desc"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="e.g., It needs to be 2 pages and include a summary and my opinion"
              rows={3}
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
              disabled={!!existingTask}
            />
          </div>

          {!breakdown && (
            <button
              onClick={generateBreakdown}
              disabled={loading || !taskTitle.trim()}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Breaking it down...
                </span>
              ) : (
                <>✨ Break It Down with AI</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Breakdown Results */}
      {subtasks.length > 0 && (
        <>
          {/* Progress */}
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white/80">Progress</div>
                <div className="text-3xl font-bold">
                  {completedCount} / {subtasks.length} steps done
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white/80">Estimated time</div>
                <div className="text-2xl font-bold">{totalMinutes} min</div>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Strategy Recommendations */}
          {breakdown?.strategyRecommendations && breakdown.strategyRecommendations.length > 0 && (
            <div className="rounded-xl bg-yellow-50 p-4">
              <h4 className="text-sm font-medium text-yellow-800">💡 Helpful Tips</h4>
              <ul className="mt-2 space-y-1">
                {breakdown.strategyRecommendations.map((rec, index) => (
                  <li key={`rec-${index}`} className="text-sm text-yellow-700">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Subtasks List */}
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-900">Your Steps</h4>
              <button
                onClick={addSubtask}
                className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
              >
                + Add Step
              </button>
            </div>

            <div className="space-y-2">
              {subtasks.map((subtask, index) => (
                <div
                  key={subtask.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`rounded-lg border-2 p-4 transition ${
                    subtask.completed
                      ? 'border-green-200 bg-green-50'
                      : 'border-slate-200 bg-white'
                  } ${draggedIndex === index ? 'opacity-50' : ''} cursor-move`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 pt-1">
                      <span className="cursor-grab text-slate-400">⋮⋮</span>
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() => handleSubtaskToggle(subtask.id)}
                        className="h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={subtask.title}
                          onChange={(e) => handleSubtaskEdit(subtask.id, e.target.value)}
                          className={`flex-1 bg-transparent text-lg font-medium focus:outline-none ${
                            subtask.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}
                          placeholder="Enter step..."
                        />
                      </div>
                      {subtask.description && (
                        <p className="mt-1 text-sm text-slate-600">{subtask.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={subtask.estimatedMin}
                        onChange={(e) =>
                          handleSubtaskTimeEdit(subtask.id, parseInt(e.target.value, 10) || 0)
                        }
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-center text-sm"
                        min="1"
                      />
                      <span className="text-sm text-slate-500">min</span>
                      <button
                        onClick={() => removeSubtask(subtask.id)}
                        className="ml-2 text-slate-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              {!createdTask && (
                <button
                  onClick={handleCreateTask}
                  disabled={loading || subtasks.length === 0}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Save Task & Steps
                </button>
              )}
              <button
                onClick={generateBreakdown}
                disabled={loading}
                className="rounded-lg bg-purple-100 px-4 py-3 font-medium text-purple-700 hover:bg-purple-200"
              >
                🔄 Regenerate
              </button>
            </div>
          </div>

          {/* I'm Stuck Help */}
          <div className="rounded-xl bg-orange-50 p-4">
            <button
              onClick={() => setShowStuckHelp(!showStuckHelp)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="font-medium text-orange-700">🤔 I&apos;m stuck on a step</span>
              <span className="text-orange-500">{showStuckHelp ? '▲' : '▼'}</span>
            </button>
            {showStuckHelp && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-orange-700">
                  It&apos;s okay to feel stuck! Here are some things you can try:
                </p>
                <ul className="space-y-2 text-sm text-orange-600">
                  <li className="flex items-start gap-2">
                    <span>🎯</span>
                    <span>Break the step into even smaller pieces</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>⏰</span>
                    <span>Set a timer for just 5 minutes and start</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🔄</span>
                    <span>Skip to an easier step and come back</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>💬</span>
                    <span>Ask someone for help with just this one part</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>☕</span>
                    <span>Take a short break and try again</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && subtasks.length === 0 && !breakdown && (
        <div className="rounded-xl bg-slate-50 p-8 text-center">
          <div className="text-5xl">🧩</div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">
            Big tasks feel easier when broken into smaller steps!
          </h3>
          <p className="mt-2 text-slate-600">
            Enter your task above and let AI help you break it down into manageable pieces.
          </p>
        </div>
      )}
    </div>
  );
}
