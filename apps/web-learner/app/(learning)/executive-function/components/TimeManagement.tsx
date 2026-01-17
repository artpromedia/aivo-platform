'use client';

import { useState } from 'react';
import { createTimeBlock, updateTimeBlock, deleteTimeBlock } from '../../../../lib/executive-function-api';
import type { TimeBlock } from '../../../../lib/executive-function-api';

interface TimeManagementProps {
  learnerId: string;
  blocks: TimeBlock[];
  onUpdate: () => void;
}

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
 * Visual schedule and time blocking tool
 */
export function TimeManagement({ learnerId, blocks, onUpdate }: Readonly<TimeManagementProps>) {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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


  function changeDay(offset: number) {
    const newDay = new Date(selectedDay);
    newDay.setDate(newDay.getDate() + offset);
    setSelectedDay(newDay);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{blocks.filter((b) => b.type === 'study').length}</div>
          <div className="mt-1 text-sm text-white/80">Study Blocks</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-green-500 to-teal-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{blocks.filter((b) => b.type === 'break').length}</div>
          <div className="mt-1 text-sm text-white/80">Break Blocks</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{blocks.filter((b) => b.type === 'activity').length}</div>
          <div className="mt-1 text-sm text-white/80">Activity Blocks</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{blocks.filter((b) => b.recurring).length}</div>
          <div className="mt-1 text-sm text-white/80">Recurring Blocks</div>
        </div>
      </div>

      {/* Day Navigator */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDay(-1)}
            className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
          >
            ← Previous Day
          </button>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-900">
              {daysOfWeek[selectedDay.getDay()]}
            </div>
            <div className="text-sm text-slate-600">{selectedDay.toLocaleDateString()}</div>
          </div>
          <button
            onClick={() => changeDay(1)}
            className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
          >
            Next Day →
          </button>
        </div>

        <button
          onClick={() => setSelectedDay(new Date())}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Today
        </button>
      </div>

      {/* Schedule View */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Daily Schedule</h3>
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Time Block
          </button>
        </div>

        {todayBlocks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-5xl">📅</div>
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
                            {String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')} -{' '}
                            {String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')}
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
            <label htmlFor="block-title" className="block text-sm font-medium text-slate-700">Title *</label>
            <input
              id="block-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Math Study Session"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="block-type" className="block text-sm font-medium text-slate-700">Type</label>
            <select
              id="block-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
              <label htmlFor="block-date" className="block text-sm font-medium text-slate-700">Date</label>
              <input
                id="block-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="block-start-time" className="block text-sm font-medium text-slate-700">Start Time</label>
              <input
                id="block-start-time"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="block-end-time" className="block text-sm font-medium text-slate-700">End Time</label>
              <input
                id="block-end-time"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="block-recurring" className="block text-sm font-medium text-slate-700">Recurring</label>
            <select
              id="block-recurring"
              value={formData.recurring}
              onChange={(e) => setFormData({ ...formData, recurring: e.target.value })}
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          {formData.recurring === 'yes' && (
            <>
              <div>
                <label htmlFor="block-frequency" className="block text-sm font-medium text-slate-700">Frequency</label>
                <select
                  id="block-frequency"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
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
                        onClick={() => toggleDay(index)}
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
