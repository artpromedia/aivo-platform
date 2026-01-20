'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

import {
  getScheduleByDate,
  createSchedule,
  completeScheduleBlock,
  skipScheduleBlock,
  markScheduleReviewed,
  getScheduleTemplates,
  createScheduleFromTemplate,
} from '../../lib/executive-function-api';
import type {
  Schedule,
  ScheduleBlock,
  CreateScheduleBlock,
  ScheduleBlockType,
  ScheduleTemplate,
} from '../../lib/executive-function-api';

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

interface VisualScheduleProps {
  learnerId: string;
  onBlockComplete?: (blockId: string) => void;
  onBlockSkip?: (blockId: string) => void;
}

/**
 * VisualSchedule Component
 *
 * Displays a visual daily schedule with time blocks
 * Features: color-coded blocks, current time indicator, drag-and-drop
 */
export function VisualSchedule({
  learnerId,
  onBlockComplete,
  onBlockSkip,
}: Readonly<VisualScheduleProps>) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const scheduleRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await getScheduleByDate(learnerId, dateStr);
      setSchedule(data);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [learnerId, selectedDate]);

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

  async function handleCompleteBlock(blockId: string) {
    if (!schedule) return;
    try {
      await completeScheduleBlock(schedule.id, blockId);
      onBlockComplete?.(blockId);
      loadSchedule();
    } catch (error) {
      console.error('Failed to complete block:', error);
      alert('Failed to complete block. Please try again.');
    }
  }

  async function handleSkipBlock(blockId: string, reason?: string) {
    if (!schedule) return;
    try {
      await skipScheduleBlock(schedule.id, blockId, reason);
      onBlockSkip?.(blockId);
      loadSchedule();
    } catch (error) {
      console.error('Failed to skip block:', error);
      alert('Failed to skip block. Please try again.');
    }
  }

  async function handleMarkReviewed() {
    if (!schedule) return;
    try {
      await markScheduleReviewed(schedule.id);
      loadSchedule();
    } catch (error) {
      console.error('Failed to mark schedule as reviewed:', error);
    }
  }

  async function handleCreateFromTemplate(templateId: string) {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await createScheduleFromTemplate(learnerId, templateId, dateStr);
      setShowTemplateModal(false);
      loadSchedule();
    } catch (error) {
      console.error('Failed to create from template:', error);
      alert('Failed to create schedule from template. Please try again.');
    }
  }

  function changeDate(offset: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + offset);
    setSelectedDate(newDate);
  }

  function isToday(): boolean {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }

  function getCurrentBlock(): ScheduleBlock | null {
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

  function getNextBlock(): ScheduleBlock | null {
    if (!schedule || !isToday()) return null;
    const now = currentTime;
    const upcoming = schedule.blocks
      .filter((block) => new Date(block.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return upcoming[0] || null;
  }

  function handlePrint() {
    window.print();
  }

  const currentBlock = getCurrentBlock();
  const nextBlock = getNextBlock();

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
    <div className="space-y-6" ref={scheduleRef}>
      {/* Header with date navigation */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="rounded-lg bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200"
          >
            ← Previous
          </button>
          <div className="text-center">
            <div className="text-xl font-bold text-slate-900">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            {isToday() && (
              <div className="mt-1 text-sm font-medium text-blue-600">Today</div>
            )}
          </div>
          <button
            onClick={() => changeDate(1)}
            className="rounded-lg bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200"
          >
            Next →
          </button>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setSelectedDate(new Date())}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Today
          </button>
          <button
            onClick={handlePrint}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Now and Next cards */}
      {isToday() && (currentBlock || nextBlock) && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Now card */}
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-6 text-white shadow-lg">
            <div className="text-sm font-medium text-white/80">NOW</div>
            {currentBlock ? (
              <>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-3xl">{BLOCK_ICONS[currentBlock.blockType]}</span>
                  <div>
                    <div className="text-xl font-bold">{currentBlock.title}</div>
                    <div className="text-sm text-white/80">
                      Until{' '}
                      {new Date(currentBlock.endTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                {!currentBlock.isCompleted && !currentBlock.isSkipped && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleCompleteBlock(currentBlock.id)}
                      className="flex-1 rounded-lg bg-white/20 py-2 text-sm font-medium hover:bg-white/30"
                    >
                      ✓ Done
                    </button>
                    <button
                      onClick={() => handleSkipBlock(currentBlock.id)}
                      className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30"
                    >
                      Skip
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-2 text-white/80">No current activity</div>
            )}
          </div>

          {/* Next card */}
          <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg">
            <div className="text-sm font-medium text-white/80">NEXT UP</div>
            {nextBlock ? (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-3xl">{BLOCK_ICONS[nextBlock.blockType]}</span>
                <div>
                  <div className="text-xl font-bold">{nextBlock.title}</div>
                  <div className="text-sm text-white/80">
                    Starts at{' '}
                    {new Date(nextBlock.startTime).toLocaleTimeString([], {
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

      {/* Schedule view */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Daily Schedule</h3>
          <div className="flex gap-2">
            {!schedule && templates.length > 0 && (
              <button
                onClick={() => setShowTemplateModal(true)}
                className="rounded-lg bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200"
              >
                📋 Use Template
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Add Block
            </button>
          </div>
        </div>

        {!schedule || schedule.blocks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-5xl">📅</div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">No schedule yet</h3>
            <p className="mt-2 text-slate-600">
              Create your schedule for this day or use a template
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {templates.length > 0 && (
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Use Template
                </button>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Schedule
              </button>
            </div>
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

                        {/* Status indicators */}
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

                      {/* Actions */}
                      {!block.isCompleted && !block.isSkipped && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCompleteBlock(block.id)}
                            className="rounded-lg bg-white/20 px-3 py-2 text-sm font-medium hover:bg-white/30"
                          >
                            ✓ Done
                          </button>
                          <button
                            onClick={() => handleSkipBlock(block.id)}
                            className="rounded-lg bg-white/20 px-3 py-2 text-sm font-medium hover:bg-white/30"
                          >
                            Skip
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Schedule review */}
        {schedule && !schedule.isReviewed && (
          <div className="mt-6 rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              Have you reviewed today&apos;s schedule? Click below when ready!
            </p>
            <button
              onClick={handleMarkReviewed}
              className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              I&apos;ve Reviewed My Schedule
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="rounded-xl bg-white p-4 shadow">
        <h4 className="mb-3 text-sm font-medium text-slate-700">Block Types</h4>
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

      {/* Create Block Modal */}
      {showCreateModal && (
        <CreateBlockModal
          selectedDate={selectedDate}
          onSubmit={async (blocks) => {
            try {
              const dateStr = selectedDate.toISOString().split('T')[0];
              if (schedule) {
                // Add blocks to existing schedule - for now, create new
                await createSchedule(learnerId, dateStr, blocks);
              } else {
                await createSchedule(learnerId, dateStr, blocks);
              }
              setShowCreateModal(false);
              loadSchedule();
            } catch (error) {
              console.error('Failed to create schedule:', error);
              alert('Failed to create schedule. Please try again.');
            }
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <TemplateModal
          templates={templates}
          onSelect={handleCreateFromTemplate}
          onCancel={() => setShowTemplateModal(false)}
        />
      )}
    </div>
  );
}

// Create Block Modal Component
function CreateBlockModal({
  selectedDate,
  onSubmit,
  onCancel,
}: Readonly<{
  selectedDate: Date;
  onSubmit: (blocks: CreateScheduleBlock[]) => void;
  onCancel: () => void;
}>) {
  const [blocks, setBlocks] = useState<CreateScheduleBlock[]>([
    {
      blockType: 'LEARNING',
      title: '',
      startTime: `${selectedDate.toISOString().split('T')[0]}T09:00:00`,
      endTime: `${selectedDate.toISOString().split('T')[0]}T10:00:00`,
    },
  ]);

  function addBlock() {
    const lastBlock = blocks[blocks.length - 1];
    const lastEndTime = lastBlock ? new Date(lastBlock.endTime) : new Date(selectedDate);
    if (!lastBlock) lastEndTime.setHours(9, 0, 0, 0);

    const newStartTime = new Date(lastEndTime);
    const newEndTime = new Date(newStartTime);
    newEndTime.setHours(newEndTime.getHours() + 1);

    setBlocks([
      ...blocks,
      {
        blockType: 'LEARNING',
        title: '',
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      },
    ]);
  }

  function updateBlock(index: number, updates: Partial<CreateScheduleBlock>) {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    setBlocks(newBlocks);
  }

  function removeBlock(index: number) {
    setBlocks(blocks.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validBlocks = blocks.filter((b) => b.title.trim());
    if (validBlocks.length === 0) {
      alert('Please add at least one block with a title');
      return;
    }
    onSubmit(validBlocks);
  }

  const dateStr = selectedDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">Create Schedule</h2>
        <p className="mt-1 text-sm text-slate-600">
          Add blocks for {selectedDate.toLocaleDateString()}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {blocks.map((block, index) => (
            <div key={`block-${index}`} className="rounded-lg border-2 border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Block {index + 1}</span>
                {blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBlock(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor={`block-title-${index}`} className="block text-sm font-medium text-slate-700">
                    Title
                  </label>
                  <input
                    id={`block-title-${index}`}
                    type="text"
                    value={block.title}
                    onChange={(e) => updateBlock(index, { title: e.target.value })}
                    placeholder="e.g., Math Study"
                    className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor={`block-type-${index}`} className="block text-sm font-medium text-slate-700">
                    Type
                  </label>
                  <select
                    id={`block-type-${index}`}
                    value={block.blockType}
                    onChange={(e) =>
                      updateBlock(index, { blockType: e.target.value as ScheduleBlockType })
                    }
                    className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="LEARNING">Learning</option>
                    <option value="BREAK">Break</option>
                    <option value="TRANSITION">Transition</option>
                    <option value="ROUTINE">Routine</option>
                    <option value="FLEXIBLE">Flexible</option>
                  </select>
                </div>

                <div>
                  <label htmlFor={`block-start-${index}`} className="block text-sm font-medium text-slate-700">
                    Start Time
                  </label>
                  <input
                    id={`block-start-${index}`}
                    type="time"
                    value={new Date(block.startTime).toTimeString().slice(0, 5)}
                    onChange={(e) =>
                      updateBlock(index, { startTime: `${dateStr}T${e.target.value}:00` })
                    }
                    className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor={`block-end-${index}`} className="block text-sm font-medium text-slate-700">
                    End Time
                  </label>
                  <input
                    id={`block-end-${index}`}
                    type="time"
                    value={new Date(block.endTime).toTimeString().slice(0, 5)}
                    onChange={(e) =>
                      updateBlock(index, { endTime: `${dateStr}T${e.target.value}:00` })
                    }
                    className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addBlock}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            + Add Another Block
          </button>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Create Schedule
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

// Template Selection Modal
function TemplateModal({
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
          Select a template to create your schedule
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
