'use client';

import React, { useState, useEffect, useCallback } from 'react';

import {
  createTimeBlock,
  updateTimeBlock,
  deleteTimeBlock,
  getScheduleByDate,
  createSchedule,
  completeScheduleBlock,
  getScheduleTemplates,
  createScheduleFromTemplate,
} from '../../../../lib/executive-function-api';
import type {
  TimeBlock,
  Schedule,
  ScheduleBlock,
  ScheduleBlockType,
  ScheduleTemplate,
  CreateScheduleBlock,
} from '../../../../lib/executive-function-api';

interface TimeManagementProps {
  learnerId: string;
  blocks: TimeBlock[];
  onUpdate: () => void;
}

type ViewMode = 'schedule' | 'blocks' | 'timeline' | 'pomodoro';

const BLOCK_COLORS: Record<ScheduleBlockType, string> = {
  LEARNING: 'bg-blue-500 border-blue-600',
  BREAK: 'bg-green-500 border-green-600',
  TRANSITION: 'bg-yellow-500 border-yellow-600',
  ROUTINE: 'bg-purple-500 border-purple-600',
  FLEXIBLE: 'bg-slate-400 border-slate-500',
};

const BLOCK_ICONS: Record<ScheduleBlockType, string> = {
  LEARNING: '📚',
  BREAK: '☕',
  TRANSITION: '🚶',
  ROUTINE: '🔄',
  FLEXIBLE: '✨',
};

const POMODORO_PRESETS = [
  { name: 'Classic Pomodoro', work: 25, break: 5, longBreak: 15, cycles: 4 },
  { name: 'Short Focus', work: 15, break: 3, longBreak: 10, cycles: 4 },
  { name: 'Extended Focus', work: 45, break: 10, longBreak: 20, cycles: 3 },
  { name: 'Quick Bursts', work: 10, break: 2, longBreak: 5, cycles: 6 },
];

// Utility function moved to outer scope
function getBlockColor(type: string): string {
  switch (type) {
    case 'study':
      return 'bg-blue-500 border-blue-600 text-white';
    case 'break':
      return 'bg-green-500 border-green-600 text-white';
    case 'activity':
      return 'bg-purple-500 border-purple-600 text-white';
    case 'other':
      return 'bg-slate-500 border-slate-600 text-white';
    default:
      return 'bg-slate-500 border-slate-600 text-white';
  }
}

/**
 * Time Management Component
 *
 * Enhanced visual schedule and time blocking tool with VisualSchedule integration,
 * Pomodoro timer support, and timeline view
 */
export function TimeManagement({ learnerId, blocks, onUpdate }: Readonly<TimeManagementProps>) {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('schedule');
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [pomodoroState, setPomodoroState] = useState<{
    active: boolean;
    mode: 'work' | 'break' | 'longBreak';
    timeLeft: number;
    cycle: number;
    preset: typeof POMODORO_PRESETS[0];
    taskName: string;
  } | null>(null);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Pomodoro timer effect
  useEffect(() => {
    if (!pomodoroState?.active || pomodoroState.timeLeft <= 0) return;

    const interval = setInterval(() => {
      setPomodoroState((prev) => {
        if (!prev) return null;
        const newTimeLeft = prev.timeLeft - 1;
        if (newTimeLeft <= 0) {
          // Play sound
          try {
            const audio = new Audio('/sounds/timer-complete.mp3');
            audio.play().catch(() => {});
          } catch {
            // Ignore audio errors
          }
          return { ...prev, timeLeft: 0, active: false };
        }
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pomodoroState?.active, pomodoroState?.timeLeft]);

  // Load schedule for selected day
  const loadSchedule = useCallback(async () => {
    try {
      setLoadingSchedule(true);
      const dateStr = selectedDay.toISOString().split('T')[0];
      const data = await getScheduleByDate(learnerId, dateStr);
      setSchedule(data);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  }, [learnerId, selectedDay]);

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      const data = await getScheduleTemplates(learnerId);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, [learnerId]);

  useEffect(() => {
    loadSchedule();
    loadTemplates();
  }, [loadSchedule, loadTemplates]);

  function getBlocksForDay(day: Date): TimeBlock[] {
    const dayOfWeek = day.getDay();
    return blocks.filter((block) => {
      if (block.recurring) {
        return block.recurring.daysOfWeek?.includes(dayOfWeek);
      }
      const blockDate = new Date(block.startTime);
      return blockDate.toDateString() === day.toDateString();
    });
  }

  const todayBlocks = getBlocksForDay(selectedDay);

  function isToday(): boolean {
    const today = new Date();
    return selectedDay.toDateString() === today.toDateString();
  }

  function getCurrentScheduleBlock(): ScheduleBlock | null {
    if (!schedule || !isToday()) return null;
    const now = currentTime;
    return (
      schedule.blocks.find((block) => {
        const start = new Date(block.startTime);
        const end = new Date(block.endTime);
        return now >= start && now < end;
      }) || null
    );
  }

  function getNextScheduleBlock(): ScheduleBlock | null {
    if (!schedule || !isToday()) return null;
    const now = currentTime;
    const upcoming = schedule.blocks
      .filter((block) => new Date(block.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return upcoming[0] || null;
  }

  async function handleCreateBlock(blockData: Partial<TimeBlock>) {
    try {
      await createTimeBlock(learnerId, blockData);
      setShowCreateForm(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to create time block:', error);
      alert('Failed to create time block. Please try again.');
    }
  }

  async function handleUpdateBlock(blockId: string, updates: Partial<TimeBlock>) {
    try {
      await updateTimeBlock(blockId, updates);
      setEditingBlock(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to update time block:', error);
      alert('Failed to update time block. Please try again.');
    }
  }

  async function handleDeleteBlock(blockId: string) {
    if (!confirm('Are you sure you want to delete this time block?')) return;

    try {
      await deleteTimeBlock(blockId);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete time block:', error);
      alert('Failed to delete time block. Please try again.');
    }
  }

  async function handleCompleteScheduleBlock(blockId: string) {
    if (!schedule) return;
    try {
      await completeScheduleBlock(schedule.id, blockId);
      loadSchedule();
    } catch (error) {
      console.error('Failed to complete block:', error);
    }
  }

  async function handleCreateFromTemplate(templateId: string) {
    try {
      const dateStr = selectedDay.toISOString().split('T')[0];
      await createScheduleFromTemplate(learnerId, templateId, dateStr);
      setShowTemplateModal(false);
      loadSchedule();
    } catch (error) {
      console.error('Failed to create from template:', error);
      alert('Failed to create schedule from template. Please try again.');
    }
  }

  function changeDay(offset: number) {
    const newDay = new Date(selectedDay);
    newDay.setDate(newDay.getDate() + offset);
    setSelectedDay(newDay);
  }

  function startPomodoro(preset: typeof POMODORO_PRESETS[0], taskName: string) {
    setPomodoroState({
      active: true,
      mode: 'work',
      timeLeft: preset.work * 60,
      cycle: 1,
      preset,
      taskName,
    });
  }

  function togglePomodoroActive() {
    if (!pomodoroState) return;
    setPomodoroState({ ...pomodoroState, active: !pomodoroState.active });
  }

  function nextPomodoroPhase() {
    if (!pomodoroState) return;
    const { mode, cycle, preset } = pomodoroState;

    if (mode === 'work') {
      if (cycle >= preset.cycles) {
        // Long break after all cycles
        setPomodoroState({
          ...pomodoroState,
          mode: 'longBreak',
          timeLeft: preset.longBreak * 60,
          active: true,
        });
      } else {
        // Short break
        setPomodoroState({
          ...pomodoroState,
          mode: 'break',
          timeLeft: preset.break * 60,
          active: true,
        });
      }
    } else {
      // Next work session
      const newCycle = mode === 'longBreak' ? 1 : cycle + 1;
      setPomodoroState({
        ...pomodoroState,
        mode: 'work',
        timeLeft: preset.work * 60,
        cycle: newCycle,
        active: true,
      });
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  const currentScheduleBlock = getCurrentScheduleBlock();
  const nextScheduleBlock = getNextScheduleBlock();

  // Calculate daily stats
  const scheduleStats = schedule
    ? {
        total: schedule.blocks.length,
        completed: schedule.blocks.filter((b) => b.isCompleted).length,
        learning: schedule.blocks.filter((b) => b.blockType === 'LEARNING').length,
        breaks: schedule.blocks.filter((b) => b.blockType === 'BREAK').length,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* View Mode Tabs */}
      <div className="flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow">
        {[
          { mode: 'schedule' as ViewMode, label: '📅 Schedule', description: 'Visual schedule view' },
          { mode: 'blocks' as ViewMode, label: '📦 Blocks', description: 'Time block management' },
          { mode: 'timeline' as ViewMode, label: '📊 Timeline', description: 'Hour-by-hour view' },
          { mode: 'pomodoro' as ViewMode, label: '🍅 Pomodoro', description: 'Focus timer' },
        ].map((tab) => (
          <button
            key={tab.mode}
            onClick={() => setViewMode(tab.mode)}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${
              viewMode === tab.mode
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={tab.description}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">
            {scheduleStats?.learning ?? blocks.filter((b) => b.type === 'study').length}
          </div>
          <div className="mt-1 text-sm text-white/80">Learning Blocks</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-green-500 to-teal-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">
            {scheduleStats?.breaks ?? blocks.filter((b) => b.type === 'break').length}
          </div>
          <div className="mt-1 text-sm text-white/80">Break Blocks</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">
            {scheduleStats ? `${scheduleStats.completed}/${scheduleStats.total}` : blocks.filter((b) => b.type === 'activity').length}
          </div>
          <div className="mt-1 text-sm text-white/80">{scheduleStats ? 'Completed' : 'Activity Blocks'}</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{blocks.filter((b) => b.recurring).length}</div>
          <div className="mt-1 text-sm text-white/80">Recurring Blocks</div>
        </div>
      </div>

      {/* Now/Next Cards (only on schedule view) */}
      {viewMode === 'schedule' && isToday() && (currentScheduleBlock || nextScheduleBlock) && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-6 text-white shadow-lg">
            <div className="text-sm font-medium text-white/80">NOW</div>
            {currentScheduleBlock ? (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-3xl">{BLOCK_ICONS[currentScheduleBlock.blockType]}</span>
                <div>
                  <div className="text-xl font-bold">{currentScheduleBlock.title}</div>
                  <div className="text-sm text-white/80">
                    Until{' '}
                    {new Date(currentScheduleBlock.endTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-white/80">No current activity</div>
            )}
            {currentScheduleBlock && !currentScheduleBlock.isCompleted && (
              <button
                onClick={() => handleCompleteScheduleBlock(currentScheduleBlock.id)}
                className="mt-4 w-full rounded-lg bg-white/20 py-2 text-sm font-medium hover:bg-white/30"
              >
                ✓ Mark Complete
              </button>
            )}
          </div>

          <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg">
            <div className="text-sm font-medium text-white/80">NEXT UP</div>
            {nextScheduleBlock ? (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-3xl">{BLOCK_ICONS[nextScheduleBlock.blockType]}</span>
                <div>
                  <div className="text-xl font-bold">{nextScheduleBlock.title}</div>
                  <div className="text-sm text-white/80">
                    Starts at{' '}
                    {new Date(nextScheduleBlock.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-white/80">No more activities today</div>
            )}
          </div>
        </div>
      )}

      {/* Day Navigator */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDay(-1)}
            className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
          >
            ← Previous
          </button>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-900">
              {daysOfWeek[selectedDay.getDay()]}
            </div>
            <div className="text-sm text-slate-600">{selectedDay.toLocaleDateString()}</div>
            {isToday() && (
              <div className="mt-1 text-xs font-medium text-blue-600">Today</div>
            )}
          </div>
          <button
            onClick={() => changeDay(1)}
            className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
          >
            Next →
          </button>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setSelectedDay(new Date())}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Today
          </button>
          {templates.length > 0 && !schedule && (
            <button
              onClick={() => setShowTemplateModal(true)}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              📋 Use Template
            </button>
          )}
          <button
            onClick={() => setShowQuickAddModal(true)}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            ⚡ Quick Add
          </button>
        </div>
      </div>

      {/* Schedule View Mode */}
      {viewMode === 'schedule' && (
        <ScheduleView
          schedule={schedule}
          loading={loadingSchedule}
          currentBlock={currentScheduleBlock}
          nextBlock={nextScheduleBlock}
          onCompleteBlock={handleCompleteScheduleBlock}
          onAddBlock={() => setShowCreateForm(true)}
        />
      )}

      {/* Blocks View Mode */}
      {viewMode === 'blocks' && (
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Time Blocks</h3>
            <button
              onClick={() => setShowCreateForm(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Add Time Block
            </button>
          </div>

          {todayBlocks.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-5xl">📦</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">No blocks scheduled</h3>
              <p className="mt-2 text-slate-600">Add time blocks to organize your day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayBlocks
                .toSorted((a, b) => a.startTime.localeCompare(b.startTime))
                .map((block) => {
                  const startHour = new Date(block.startTime).getHours();
                  const startMin = new Date(block.startTime).getMinutes();
                  const endHour = new Date(block.endTime).getHours();
                  const endMin = new Date(block.endTime).getMinutes();

                  return (
                    <div
                      key={block.id}
                      className={`rounded-lg border-2 p-4 ${getBlockColor(block.type)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold">
                              {String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')}{' '}
                              - {String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')}
                            </span>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                              {block.type}
                            </span>
                          </div>
                          <h4 className="mt-2 text-lg font-bold">{block.title}</h4>
                          {block.recurring && (
                            <div className="mt-2 text-sm opacity-90">
                              🔄 Repeats {block.recurring.frequency}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingBlock(block)}
                            className="rounded-lg bg-white/20 px-3 py-1 text-sm hover:bg-white/30"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBlock(block.id)}
                            className="rounded-lg bg-white/20 px-3 py-1 text-sm hover:bg-white/30"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Timeline View Mode */}
      {viewMode === 'timeline' && (
        <TimelineView
          blocks={todayBlocks}
          scheduleBlocks={schedule?.blocks || []}
          currentTime={currentTime}
          isToday={isToday()}
        />
      )}

      {/* Pomodoro View Mode */}
      {viewMode === 'pomodoro' && (
        <PomodoroView
          state={pomodoroState}
          presets={POMODORO_PRESETS}
          onStart={startPomodoro}
          onToggle={togglePomodoroActive}
          onNextPhase={nextPomodoroPhase}
          onStop={() => setPomodoroState(null)}
          formatTime={formatTime}
        />
      )}

      {/* Create Time Block Modal */}
      {showCreateForm && (
        <TimeBlockForm
          selectedDate={selectedDay}
          onSubmit={handleCreateBlock}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Time Block Modal */}
      {editingBlock && (
        <TimeBlockForm
          block={editingBlock}
          selectedDate={selectedDay}
          onSubmit={(data) => handleUpdateBlock(editingBlock.id, data)}
          onCancel={() => setEditingBlock(null)}
        />
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <TemplateSelectionModal
          templates={templates}
          onSelect={handleCreateFromTemplate}
          onCancel={() => setShowTemplateModal(false)}
        />
      )}

      {/* Quick Add Modal */}
      {showQuickAddModal && (
        <QuickAddModal
          selectedDate={selectedDay}
          learnerId={learnerId}
          onSuccess={() => {
            setShowQuickAddModal(false);
            loadSchedule();
            onUpdate();
          }}
          onCancel={() => setShowQuickAddModal(false)}
        />
      )}
    </div>
  );
}

// Time Block Form Component
function TimeBlockForm({
  block,
  selectedDate,
  onSubmit,
  onCancel,
}: Readonly<{
  block?: TimeBlock;
  selectedDate: Date;
  onSubmit: (data: Partial<TimeBlock>) => void;
  onCancel: () => void;
}>) {
  const [formData, setFormData] = useState({
    title: block?.title || '',
    type: block?.type || 'study',
    date: selectedDate.toISOString().split('T')[0],
    startTime: block ? new Date(block.startTime).toTimeString().slice(0, 5) : '09:00',
    endTime: block ? new Date(block.endTime).toTimeString().slice(0, 5) : '10:00',
    recurring: block?.recurring ? 'yes' : 'no',
    frequency: block?.recurring?.frequency || 'weekly',
    daysOfWeek: block?.recurring?.daysOfWeek || [],
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    const data: Partial<TimeBlock> = {
      title: formData.title,
      type: formData.type,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
    };

    if (formData.recurring === 'yes') {
      data.recurring = {
        frequency: formData.frequency,
        daysOfWeek: formData.daysOfWeek,
      };
    }

    onSubmit(data);
  }

  function toggleDay(day: number) {
    const newDays = formData.daysOfWeek.includes(day)
      ? formData.daysOfWeek.filter((d) => d !== day)
      : [...formData.daysOfWeek, day];
    setFormData({ ...formData, daysOfWeek: newDays });
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">
          {block ? 'Edit Time Block' : 'New Time Block'}
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="block-title" className="block text-sm font-medium text-slate-700">
              Title *
            </label>
            <input
              id="block-title"
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
              }}
              required
              placeholder="e.g., Math Study Session"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="block-type" className="block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              id="block-type"
              value={formData.type}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  type: e.target.value as 'study' | 'break' | 'activity' | 'other',
                });
              }}
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="study">Study</option>
              <option value="break">Break</option>
              <option value="activity">Activity</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="block-date" className="block text-sm font-medium text-slate-700">
                Date
              </label>
              <input
                id="block-date"
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                }}
                required
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="block-start-time"
                className="block text-sm font-medium text-slate-700"
              >
                Start Time
              </label>
              <input
                id="block-start-time"
                type="time"
                value={formData.startTime}
                onChange={(e) => {
                  setFormData({ ...formData, startTime: e.target.value });
                }}
                required
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="block-end-time" className="block text-sm font-medium text-slate-700">
                End Time
              </label>
              <input
                id="block-end-time"
                type="time"
                value={formData.endTime}
                onChange={(e) => {
                  setFormData({ ...formData, endTime: e.target.value });
                }}
                required
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="block-recurring" className="block text-sm font-medium text-slate-700">
              Recurring
            </label>
            <select
              id="block-recurring"
              value={formData.recurring}
              onChange={(e) => {
                setFormData({ ...formData, recurring: e.target.value });
              }}
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          {formData.recurring === 'yes' && (
            <>
              <div>
                <label
                  htmlFor="block-frequency"
                  className="block text-sm font-medium text-slate-700"
                >
                  Frequency
                </label>
                <select
                  id="block-frequency"
                  value={formData.frequency}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                    });
                  }}
                  className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {formData.frequency === 'weekly' && (
                <fieldset>
                  <legend className="block text-sm font-medium text-slate-700">Days of Week</legend>
                  <div className="mt-2 flex gap-2">
                    {daysOfWeek.map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          toggleDay(index);
                        }}
                        className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition ${
                          formData.daysOfWeek.includes(index)
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              {block ? 'Update' : 'Create'}
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

// Schedule View Component
function ScheduleView({
  schedule,
  loading,
  currentBlock,
  nextBlock,
  onCompleteBlock,
  onAddBlock,
}: Readonly<{
  schedule: Schedule | null;
  loading: boolean;
  currentBlock: ScheduleBlock | null;
  nextBlock: ScheduleBlock | null;
  onCompleteBlock: (blockId: string) => void;
  onAddBlock: () => void;
}>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-slate-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Daily Schedule</h3>
        <button
          onClick={onAddBlock}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Block
        </button>
      </div>

      {!schedule || schedule.blocks.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-5xl">📅</div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">No schedule yet</h3>
          <p className="mt-2 text-slate-600">
            Create your schedule for this day or use a template
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedule.blocks
            .toSorted((a, b) => a.orderIndex - b.orderIndex)
            .map((block) => {
              const isCurrentBlock = currentBlock?.id === block.id;
              const isNextBlock = nextBlock?.id === block.id;
              const startTime = new Date(block.startTime);
              const endTime = new Date(block.endTime);

              return (
                <div
                  key={block.id}
                  className={`rounded-lg border-2 p-4 transition ${BLOCK_COLORS[block.blockType]} ${
                    block.isCompleted
                      ? 'opacity-60'
                      : block.isSkipped
                        ? 'opacity-40'
                        : ''
                  } ${isCurrentBlock ? 'ring-4 ring-yellow-400' : ''} ${
                    isNextBlock ? 'ring-2 ring-orange-400' : ''
                  } text-white`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{block.icon || BLOCK_ICONS[block.blockType]}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">
                              {startTime.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {endTime.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                              {block.durationMin} min
                            </span>
                            {isCurrentBlock && (
                              <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                                NOW
                              </span>
                            )}
                            {isNextBlock && (
                              <span className="rounded-full bg-orange-400 px-3 py-1 text-xs font-bold text-orange-900">
                                NEXT
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-bold">{block.title}</h4>
                        </div>
                      </div>

                      {block.isCompleted && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className="rounded-full bg-white/30 px-3 py-1">✓ Completed</span>
                        </div>
                      )}
                      {block.isSkipped && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className="rounded-full bg-white/30 px-3 py-1">
                            Skipped{block.skipReason ? `: ${block.skipReason}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {!block.isCompleted && !block.isSkipped && (
                      <button
                        onClick={() => onCompleteBlock(block.id)}
                        className="rounded-lg bg-white/20 px-3 py-2 text-sm font-medium hover:bg-white/30"
                      >
                        ✓ Done
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 rounded-lg bg-slate-50 p-4">
        <h4 className="mb-2 text-sm font-medium text-slate-700">Block Types</h4>
        <div className="flex flex-wrap gap-3">
          {Object.entries(BLOCK_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded ${color.split(' ')[0]}`} />
              <span className="text-sm text-slate-600">
                {BLOCK_ICONS[type as ScheduleBlockType]} {type.charAt(0) + type.slice(1).toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Timeline View Component
function TimelineView({
  blocks,
  scheduleBlocks,
  currentTime,
  isToday,
}: Readonly<{
  blocks: TimeBlock[];
  scheduleBlocks: ScheduleBlock[];
  currentTime: Date;
  isToday: boolean;
}>) {
  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  function getBlocksAtHour(hour: number): (TimeBlock | ScheduleBlock)[] {
    const allBlocks: (TimeBlock | ScheduleBlock)[] = [];

    // Check time blocks
    blocks.forEach((block) => {
      const startHour = new Date(block.startTime).getHours();
      const endHour = new Date(block.endTime).getHours();
      if (hour >= startHour && hour < endHour) {
        allBlocks.push(block);
      }
    });

    // Check schedule blocks
    scheduleBlocks.forEach((block) => {
      const startHour = new Date(block.startTime).getHours();
      const endHour = new Date(block.endTime).getHours();
      if (hour >= startHour && hour < endHour) {
        allBlocks.push(block);
      }
    });

    return allBlocks;
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      <h3 className="mb-4 text-lg font-bold text-slate-900">Timeline View</h3>

      <div className="space-y-1">
        {hours.map((hour) => {
          const blocksAtHour = getBlocksAtHour(hour);
          const isCurrent = isToday && hour === currentHour;

          return (
            <div
              key={hour}
              className={`flex items-stretch gap-4 rounded-lg p-2 ${
                isCurrent ? 'bg-blue-50 ring-2 ring-blue-400' : ''
              }`}
            >
              {/* Time label */}
              <div className="w-16 flex-shrink-0 text-right">
                <span className={`text-sm font-medium ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`}>
                  {hour.toString().padStart(2, '0')}:00
                </span>
                {isCurrent && (
                  <div className="mt-1 text-xs text-blue-500">
                    :{currentMinute.toString().padStart(2, '0')}
                  </div>
                )}
              </div>

              {/* Hour line */}
              <div className="relative flex-1">
                <div className="absolute left-0 top-1/2 h-px w-full bg-slate-200" />

                {/* Current time indicator */}
                {isCurrent && (
                  <div
                    className="absolute left-0 z-10 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-600"
                    style={{ top: `${(currentMinute / 60) * 100}%` }}
                  />
                )}

                {/* Blocks */}
                {blocksAtHour.length > 0 && (
                  <div className="relative z-20 flex gap-2">
                    {blocksAtHour.map((block) => {
                      const isScheduleBlock = 'blockType' in block;
                      const bgColor = isScheduleBlock
                        ? BLOCK_COLORS[block.blockType].split(' ')[0]
                        : getBlockColor(block.type).split(' ')[0];

                      return (
                        <div
                          key={block.id}
                          className={`rounded-lg ${bgColor} px-3 py-1 text-xs font-medium text-white`}
                        >
                          {isScheduleBlock
                            ? `${BLOCK_ICONS[block.blockType]} ${block.title}`
                            : block.title}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="text-2xl font-bold text-slate-900">{blocks.length}</div>
          <div className="text-sm text-slate-600">Time Blocks</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="text-2xl font-bold text-slate-900">{scheduleBlocks.length}</div>
          <div className="text-sm text-slate-600">Schedule Blocks</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="text-2xl font-bold text-slate-900">
            {scheduleBlocks.filter((b) => b.isCompleted).length}
          </div>
          <div className="text-sm text-slate-600">Completed</div>
        </div>
      </div>
    </div>
  );
}

// Pomodoro View Component
function PomodoroView({
  state,
  presets,
  onStart,
  onToggle,
  onNextPhase,
  onStop,
  formatTime,
}: Readonly<{
  state: {
    active: boolean;
    mode: 'work' | 'break' | 'longBreak';
    timeLeft: number;
    cycle: number;
    preset: typeof POMODORO_PRESETS[0];
    taskName: string;
  } | null;
  presets: typeof POMODORO_PRESETS;
  onStart: (preset: typeof POMODORO_PRESETS[0], taskName: string) => void;
  onToggle: () => void;
  onNextPhase: () => void;
  onStop: () => void;
  formatTime: (seconds: number) => string;
}>) {
  const [selectedPreset, setSelectedPreset] = useState(presets[0]);
  const [taskName, setTaskName] = useState('');

  if (!state) {
    // Setup mode
    return (
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-bold text-slate-900">Pomodoro Timer</h3>
        <p className="mb-6 text-slate-600">
          The Pomodoro Technique helps you focus by working in short bursts with breaks in between.
        </p>

        {/* Task Name Input */}
        <div className="mb-6">
          <label htmlFor="pomodoro-task" className="block text-sm font-medium text-slate-700">
            What are you working on?
          </label>
          <input
            id="pomodoro-task"
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="e.g., Math homework"
            className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Preset Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700">Choose a timer style</label>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setSelectedPreset(preset)}
                className={`rounded-lg border-2 p-4 text-left transition ${
                  selectedPreset.name === preset.name
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-slate-900">{preset.name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {preset.work} min work • {preset.break} min break
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {preset.cycles} cycles • {preset.longBreak} min long break
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStart(selectedPreset, taskName || 'Focus time')}
          className="w-full rounded-lg bg-red-600 px-6 py-4 text-lg font-bold text-white hover:bg-red-700"
        >
          🍅 Start Pomodoro
        </button>

        {/* Info */}
        <div className="mt-6 rounded-lg bg-red-50 p-4">
          <h4 className="font-bold text-red-800">How it works</h4>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-red-700">
            <li>Work focused for {selectedPreset.work} minutes</li>
            <li>Take a {selectedPreset.break}-minute break</li>
            <li>Repeat {selectedPreset.cycles} times</li>
            <li>Take a longer {selectedPreset.longBreak}-minute break</li>
          </ol>
        </div>
      </div>
    );
  }

  // Active timer mode
  const modeColors = {
    work: 'from-red-500 to-orange-500',
    break: 'from-green-500 to-teal-500',
    longBreak: 'from-blue-500 to-purple-500',
  };

  const modeLabels = {
    work: 'Focus Time',
    break: 'Short Break',
    longBreak: 'Long Break',
  };

  const modeIcons = {
    work: '🍅',
    break: '☕',
    longBreak: '🌴',
  };

  const progress =
    state.mode === 'work'
      ? (state.preset.work * 60 - state.timeLeft) / (state.preset.work * 60)
      : state.mode === 'break'
        ? (state.preset.break * 60 - state.timeLeft) / (state.preset.break * 60)
        : (state.preset.longBreak * 60 - state.timeLeft) / (state.preset.longBreak * 60);

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      {/* Timer Display */}
      <div
        className={`rounded-xl bg-gradient-to-br ${modeColors[state.mode]} p-8 text-center text-white`}
      >
        <div className="text-4xl">{modeIcons[state.mode]}</div>
        <div className="mt-2 text-lg font-medium text-white/80">{modeLabels[state.mode]}</div>
        <div className="mt-4 font-mono text-6xl font-bold">{formatTime(state.timeLeft)}</div>
        <div className="mt-2 text-white/80">{state.taskName}</div>

        {/* Progress bar */}
        <div className="mx-auto mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full bg-white transition-all duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Cycle indicator */}
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: state.preset.cycles }).map((_, i) => (
            <div
              key={`cycle-${i}`}
              className={`h-3 w-3 rounded-full ${
                i < state.cycle ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
        <div className="mt-2 text-sm text-white/80">
          Cycle {state.cycle} of {state.preset.cycles}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onToggle}
          className={`flex-1 rounded-lg px-6 py-3 font-medium ${
            state.active
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {state.active ? '⏸️ Pause' : '▶️ Resume'}
        </button>
        {state.timeLeft === 0 && (
          <button
            onClick={onNextPhase}
            className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Next Phase →
          </button>
        )}
        <button
          onClick={onStop}
          className="rounded-lg bg-slate-100 px-6 py-3 font-medium text-slate-700 hover:bg-slate-200"
        >
          Stop
        </button>
      </div>

      {/* Tips */}
      <div className="mt-6 rounded-lg bg-slate-50 p-4">
        <h4 className="font-bold text-slate-800">
          {state.mode === 'work' ? 'Focus Tips' : 'Break Tips'}
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {state.mode === 'work' ? (
            <>
              <li>• Put your phone in another room</li>
              <li>• Close unnecessary browser tabs</li>
              <li>• Tell others you&apos;re focusing</li>
            </>
          ) : (
            <>
              <li>• Stand up and stretch</li>
              <li>• Get a drink of water</li>
              <li>• Look away from screens</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

// Template Selection Modal
function TemplateSelectionModal({
  templates,
  onSelect,
  onCancel,
}: Readonly<{
  templates: ScheduleTemplate[];
  onSelect: (templateId: string) => void;
  onCancel: () => void;
}>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">Choose a Template</h2>
        <p className="mt-1 text-sm text-slate-600">
          Select a template to quickly create your schedule
        </p>

        <div className="mt-6 space-y-3">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className="w-full rounded-lg border-2 border-slate-200 p-4 text-left transition hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{template.name}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {template.blocks.length} blocks •{' '}
                    {template.dayType.charAt(0) + template.dayType.slice(1).toLowerCase()}
                  </div>
                </div>
                {template.isDefault && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    Default
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="mt-6 w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Quick Add Modal
function QuickAddModal({
  selectedDate,
  learnerId,
  onSuccess,
  onCancel,
}: Readonly<{
  selectedDate: Date;
  learnerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}>) {
  const [quickBlocks, setQuickBlocks] = useState<
    { type: ScheduleBlockType; title: string; duration: number }[]
  >([]);

  const quickOptions = [
    { type: 'LEARNING' as ScheduleBlockType, title: 'Study Session', duration: 45, icon: '📚' },
    { type: 'LEARNING' as ScheduleBlockType, title: 'Homework', duration: 30, icon: '📝' },
    { type: 'BREAK' as ScheduleBlockType, title: 'Short Break', duration: 10, icon: '☕' },
    { type: 'BREAK' as ScheduleBlockType, title: 'Long Break', duration: 20, icon: '🌴' },
    { type: 'ROUTINE' as ScheduleBlockType, title: 'Morning Routine', duration: 30, icon: '🌅' },
    { type: 'ROUTINE' as ScheduleBlockType, title: 'Evening Routine', duration: 30, icon: '🌙' },
    { type: 'TRANSITION' as ScheduleBlockType, title: 'Get Ready', duration: 15, icon: '🚶' },
    { type: 'FLEXIBLE' as ScheduleBlockType, title: 'Free Time', duration: 30, icon: '✨' },
  ];

  function addQuickBlock(option: typeof quickOptions[0]) {
    setQuickBlocks([
      ...quickBlocks,
      { type: option.type, title: option.title, duration: option.duration },
    ]);
  }

  function removeBlock(index: number) {
    setQuickBlocks(quickBlocks.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    if (quickBlocks.length === 0) {
      alert('Please add at least one block');
      return;
    }

    // Build schedule blocks with times
    const dateStr = selectedDate.toISOString().split('T')[0];
    let currentTime = new Date(`${dateStr}T09:00:00`);

    const scheduleBlocks: CreateScheduleBlock[] = quickBlocks.map((block) => {
      const startTime = new Date(currentTime);
      const endTime = new Date(currentTime);
      endTime.setMinutes(endTime.getMinutes() + block.duration);
      currentTime = endTime;

      return {
        blockType: block.type,
        title: block.title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };
    });

    try {
      await createSchedule(learnerId, dateStr, scheduleBlocks);
      onSuccess();
    } catch (error) {
      console.error('Failed to create schedule:', error);
      alert('Failed to create schedule. Please try again.');
    }
  }

  const totalDuration = quickBlocks.reduce((sum, block) => sum + block.duration, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">Quick Add Schedule</h2>
        <p className="mt-1 text-sm text-slate-600">
          Quickly build a schedule by adding common blocks
        </p>

        {/* Quick Options */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700">Add blocks</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <button
                key={`${option.type}-${option.title}`}
                onClick={() => addQuickBlock(option)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                {option.icon} {option.title} ({option.duration}m)
              </button>
            ))}
          </div>
        </div>

        {/* Selected Blocks */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700">
            Your schedule ({quickBlocks.length} blocks • {totalDuration} minutes)
          </h3>
          {quickBlocks.length === 0 ? (
            <div className="mt-4 rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
              <div className="text-3xl">👆</div>
              <p className="mt-2 text-slate-500">Click blocks above to add them to your schedule</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {quickBlocks.map((block, index) => (
                <div
                  key={`selected-${index}`}
                  className={`flex items-center justify-between rounded-lg ${BLOCK_COLORS[block.type]} p-3 text-white`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{BLOCK_ICONS[block.type]}</span>
                    <div>
                      <div className="font-medium">{block.title}</div>
                      <div className="text-sm text-white/80">{block.duration} minutes</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeBlock(index)}
                    className="rounded-lg bg-white/20 px-3 py-1 text-sm hover:bg-white/30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleCreate}
            disabled={quickBlocks.length === 0}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Create Schedule
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
