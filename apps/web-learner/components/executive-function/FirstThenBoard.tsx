'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface FirstThenItem {
  id: string;
  title: string;
  icon: string;
  description?: string;
  durationMin?: number;
}

interface FirstThenBoardProps {
  learnerId: string;
  onFirstComplete?: (item: FirstThenItem) => void;
  onRewardEarned?: (reward: FirstThenItem) => void;
  suggestedTasks?: FirstThenItem[];
  suggestedRewards?: FirstThenItem[];
}

const DEFAULT_TASKS: FirstThenItem[] = [
  { id: 'math', title: 'Math Practice', icon: '🔢', durationMin: 15 },
  { id: 'reading', title: 'Reading Time', icon: '📖', durationMin: 20 },
  { id: 'writing', title: 'Writing Assignment', icon: '✏️', durationMin: 15 },
  { id: 'science', title: 'Science Activity', icon: '🔬', durationMin: 20 },
  { id: 'homework', title: 'Homework', icon: '📝', durationMin: 25 },
  { id: 'chores', title: 'Chores', icon: '🧹', durationMin: 10 },
  { id: 'cleanup', title: 'Clean Up', icon: '🗂️', durationMin: 10 },
  { id: 'exercise', title: 'Exercise', icon: '🏃', durationMin: 15 },
];

const DEFAULT_REWARDS: FirstThenItem[] = [
  { id: 'game', title: 'Play a Game', icon: '🎮', durationMin: 15 },
  { id: 'snack', title: 'Snack Time', icon: '🍎', durationMin: 10 },
  { id: 'video', title: 'Watch a Video', icon: '📺', durationMin: 15 },
  { id: 'outside', title: 'Play Outside', icon: '🌳', durationMin: 20 },
  { id: 'drawing', title: 'Draw/Color', icon: '🎨', durationMin: 15 },
  { id: 'music', title: 'Listen to Music', icon: '🎵', durationMin: 10 },
  { id: 'friend', title: 'Talk to Friend', icon: '💬', durationMin: 10 },
  { id: 'lego', title: 'Build with Legos', icon: '🧱', durationMin: 20 },
];

/**
 * FirstThenBoard Component
 *
 * A simple visual board that shows "First" (task) and "Then" (reward)
 * Helps with task initiation and motivation
 */
export function FirstThenBoard({
  learnerId,
  onFirstComplete,
  onRewardEarned,
  suggestedTasks,
  suggestedRewards,
}: Readonly<FirstThenBoardProps>) {
  const [firstItem, setFirstItem] = useState<FirstThenItem | null>(null);
  const [thenItem, setThenItem] = useState<FirstThenItem | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [phase, setPhase] = useState<'setup' | 'working' | 'reward' | 'complete'>('setup');
  const [customTask, setCustomTask] = useState({ title: '', icon: '📝', durationMin: 15 });
  const [customReward, setCustomReward] = useState({ title: '', icon: '🎁', durationMin: 10 });

  const tasks = suggestedTasks || DEFAULT_TASKS;
  const rewards = suggestedRewards || DEFAULT_REWARDS;

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerRunning && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (phase === 'working') {
              handleFirstComplete();
            } else if (phase === 'reward') {
              handleRewardComplete();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, remainingSeconds, phase]);

  function selectFirst(item: FirstThenItem) {
    setFirstItem(item);
    setShowTaskPicker(false);
  }

  function selectThen(item: FirstThenItem) {
    setThenItem(item);
    setShowRewardPicker(false);
  }

  function addCustomTask() {
    if (customTask.title.trim()) {
      const newTask: FirstThenItem = {
        id: `custom-${Date.now()}`,
        title: customTask.title,
        icon: customTask.icon,
        durationMin: customTask.durationMin,
      };
      setFirstItem(newTask);
      setShowTaskPicker(false);
      setCustomTask({ title: '', icon: '📝', durationMin: 15 });
    }
  }

  function addCustomReward() {
    if (customReward.title.trim()) {
      const newReward: FirstThenItem = {
        id: `custom-${Date.now()}`,
        title: customReward.title,
        icon: customReward.icon,
        durationMin: customReward.durationMin,
      };
      setThenItem(newReward);
      setShowRewardPicker(false);
      setCustomReward({ title: '', icon: '🎁', durationMin: 10 });
    }
  }

  function startWorking() {
    if (!firstItem || !thenItem) return;
    setPhase('working');
    setRemainingSeconds((firstItem.durationMin || 15) * 60);
    setTimerRunning(true);
  }

  function handleFirstComplete() {
    setTimerRunning(false);
    setShowCelebration(true);
    onFirstComplete?.(firstItem!);

    setTimeout(() => {
      setShowCelebration(false);
      setPhase('reward');
      if (thenItem?.durationMin) {
        setRemainingSeconds(thenItem.durationMin * 60);
        setTimerRunning(true);
      }
    }, 3000);
  }

  function handleRewardComplete() {
    setTimerRunning(false);
    onRewardEarned?.(thenItem!);
    setPhase('complete');
  }

  function markFirstDone() {
    handleFirstComplete();
  }

  function reset() {
    setFirstItem(null);
    setThenItem(null);
    setPhase('setup');
    setTimerRunning(false);
    setRemainingSeconds(0);
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = firstItem?.durationMin
    ? ((firstItem.durationMin * 60 - remainingSeconds) / (firstItem.durationMin * 60)) * 100
    : 0;

  // Icon options for custom items
  const taskIcons = ['📝', '📖', '🔢', '✏️', '🔬', '💻', '🎯', '📚'];
  const rewardIcons = ['🎮', '🍎', '📺', '🎨', '🎵', '🌳', '💬', '🎁'];

  return (
    <div className="space-y-6">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="animate-bounce text-9xl">🌟</div>
            <div className="mt-4 text-4xl font-bold text-white">Great job!</div>
            <p className="mt-2 text-xl text-white/80">
              You finished your task! Time for your reward!
            </p>
          </div>
        </div>
      )}

      {/* Complete state */}
      {phase === 'complete' && (
        <div className="rounded-2xl bg-gradient-to-br from-green-400 to-teal-500 p-8 text-center text-white shadow-xl">
          <div className="text-6xl">🏆</div>
          <h2 className="mt-4 text-3xl font-bold">All Done!</h2>
          <p className="mt-2 text-lg text-white/90">
            You completed your task AND enjoyed your reward!
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-full bg-white px-8 py-3 font-bold text-teal-600 shadow-lg transition hover:scale-105"
          >
            Start Again
          </button>
        </div>
      )}

      {/* Main Board */}
      {phase !== 'complete' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* FIRST Card */}
          <div
            className={`rounded-2xl p-6 shadow-xl transition ${
              phase === 'working'
                ? 'bg-gradient-to-br from-blue-500 to-purple-500 ring-4 ring-yellow-400'
                : phase === 'reward'
                  ? 'bg-slate-200 opacity-60'
                  : 'bg-gradient-to-br from-blue-500 to-purple-500'
            }`}
          >
            <div className="mb-4 text-center">
              <span className="rounded-full bg-white/20 px-6 py-2 text-2xl font-bold text-white">
                FIRST
              </span>
            </div>

            {firstItem ? (
              <div className="text-center text-white">
                <div className="text-7xl">{firstItem.icon}</div>
                <h3 className="mt-4 text-2xl font-bold">{firstItem.title}</h3>
                {firstItem.durationMin && (
                  <p className="mt-2 text-white/80">{firstItem.durationMin} minutes</p>
                )}

                {/* Timer display when working */}
                {phase === 'working' && (
                  <div className="mt-6">
                    <div className="text-5xl font-bold tabular-nums">
                      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>
                    <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full bg-white transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-4 flex justify-center gap-3">
                      <button
                        onClick={markFirstDone}
                        className="rounded-lg bg-green-500 px-6 py-2 font-bold text-white hover:bg-green-600"
                      >
                        ✓ I&apos;m Done!
                      </button>
                      <button
                        onClick={() => setTimerRunning(!timerRunning)}
                        className="rounded-lg bg-white/20 px-4 py-2 font-bold hover:bg-white/30"
                      >
                        {timerRunning ? '⏸' : '▶'}
                      </button>
                    </div>
                  </div>
                )}

                {phase === 'setup' && (
                  <button
                    onClick={() => setShowTaskPicker(true)}
                    className="mt-4 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowTaskPicker(true)}
                className="w-full rounded-xl border-4 border-dashed border-white/40 p-8 text-center text-white transition hover:border-white/60"
              >
                <div className="text-5xl">+</div>
                <p className="mt-2 text-lg font-medium">Choose your task</p>
              </button>
            )}
          </div>

          {/* THEN Card */}
          <div
            className={`rounded-2xl p-6 shadow-xl transition ${
              phase === 'reward'
                ? 'bg-gradient-to-br from-green-500 to-teal-500 ring-4 ring-yellow-400'
                : phase === 'working'
                  ? 'bg-slate-200'
                  : 'bg-gradient-to-br from-green-500 to-teal-500'
            }`}
          >
            <div className="mb-4 text-center">
              <span
                className={`rounded-full px-6 py-2 text-2xl font-bold ${
                  phase === 'working' ? 'bg-slate-300 text-slate-600' : 'bg-white/20 text-white'
                }`}
              >
                THEN
              </span>
            </div>

            {thenItem ? (
              <div
                className={`text-center ${phase === 'working' ? 'text-slate-600' : 'text-white'}`}
              >
                <div className={`text-7xl ${phase === 'working' ? 'grayscale' : ''}`}>
                  {thenItem.icon}
                </div>
                <h3 className="mt-4 text-2xl font-bold">{thenItem.title}</h3>
                {thenItem.durationMin && (
                  <p className={phase === 'working' ? 'mt-2 text-slate-500' : 'mt-2 text-white/80'}>
                    {thenItem.durationMin} minutes
                  </p>
                )}

                {phase === 'reward' && (
                  <div className="mt-6">
                    <div className="text-5xl font-bold tabular-nums text-white">
                      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>
                    <p className="mt-2 text-white/80">Enjoy your reward!</p>
                    <button
                      onClick={handleRewardComplete}
                      className="mt-4 rounded-lg bg-white/20 px-6 py-2 font-bold text-white hover:bg-white/30"
                    >
                      All Done
                    </button>
                  </div>
                )}

                {phase === 'setup' && (
                  <button
                    onClick={() => setShowRewardPicker(true)}
                    className="mt-4 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowRewardPicker(true)}
                className={`w-full rounded-xl border-4 border-dashed p-8 text-center transition ${
                  phase === 'working'
                    ? 'border-slate-300 text-slate-500'
                    : 'border-white/40 text-white hover:border-white/60'
                }`}
              >
                <div className="text-5xl">+</div>
                <p className="mt-2 text-lg font-medium">Choose your reward</p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Start Button */}
      {phase === 'setup' && firstItem && thenItem && (
        <button
          onClick={startWorking}
          className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 py-6 text-2xl font-bold text-white shadow-xl transition hover:scale-[1.02] hover:from-yellow-500 hover:to-orange-600"
        >
          🚀 Let&apos;s Go!
        </button>
      )}

      {/* Encouragement message */}
      {phase === 'working' && (
        <div className="rounded-xl bg-yellow-50 p-4 text-center">
          <p className="text-lg font-medium text-yellow-800">
            🌟 You&apos;re doing great! Keep going, your reward is waiting!
          </p>
        </div>
      )}

      {/* Task Picker Modal */}
      {showTaskPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">Choose Your Task</h2>
            <p className="mt-1 text-sm text-slate-600">What do you need to do first?</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => selectFirst(task)}
                  className="rounded-xl border-2 border-slate-200 p-4 text-center transition hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="text-4xl">{task.icon}</div>
                  <div className="mt-2 font-medium text-slate-900">{task.title}</div>
                  {task.durationMin && (
                    <div className="mt-1 text-sm text-slate-500">{task.durationMin} min</div>
                  )}
                </button>
              ))}
            </div>

            {/* Custom task */}
            <div className="mt-6 rounded-lg border-2 border-dashed border-slate-300 p-4">
              <h3 className="text-sm font-medium text-slate-700">Or add your own:</h3>
              <div className="mt-3 flex gap-2">
                <div className="flex gap-1">
                  {taskIcons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setCustomTask({ ...customTask, icon })}
                      className={`rounded p-1 text-xl ${
                        customTask.icon === icon ? 'bg-blue-100' : 'hover:bg-slate-100'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={customTask.title}
                  onChange={(e) => setCustomTask({ ...customTask, title: e.target.value })}
                  placeholder="Task name"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2"
                />
                <input
                  type="number"
                  value={customTask.durationMin}
                  onChange={(e) =>
                    setCustomTask({ ...customTask, durationMin: parseInt(e.target.value, 10) || 15 })
                  }
                  className="w-20 rounded-lg border border-slate-200 px-3 py-2"
                  min="1"
                />
                <span className="flex items-center text-sm text-slate-500">min</span>
              </div>
              <button
                onClick={addCustomTask}
                disabled={!customTask.title.trim()}
                className="mt-2 w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Add Task
              </button>
            </div>

            <button
              onClick={() => setShowTaskPicker(false)}
              className="mt-4 w-full rounded-lg border-2 border-slate-300 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reward Picker Modal */}
      {showRewardPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">Choose Your Reward</h2>
            <p className="mt-1 text-sm text-slate-600">What would you like to do after?</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {rewards.map((reward) => (
                <button
                  key={reward.id}
                  onClick={() => selectThen(reward)}
                  className="rounded-xl border-2 border-slate-200 p-4 text-center transition hover:border-green-500 hover:bg-green-50"
                >
                  <div className="text-4xl">{reward.icon}</div>
                  <div className="mt-2 font-medium text-slate-900">{reward.title}</div>
                  {reward.durationMin && (
                    <div className="mt-1 text-sm text-slate-500">{reward.durationMin} min</div>
                  )}
                </button>
              ))}
            </div>

            {/* Custom reward */}
            <div className="mt-6 rounded-lg border-2 border-dashed border-slate-300 p-4">
              <h3 className="text-sm font-medium text-slate-700">Or add your own:</h3>
              <div className="mt-3 flex gap-2">
                <div className="flex gap-1">
                  {rewardIcons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setCustomReward({ ...customReward, icon })}
                      className={`rounded p-1 text-xl ${
                        customReward.icon === icon ? 'bg-green-100' : 'hover:bg-slate-100'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={customReward.title}
                  onChange={(e) => setCustomReward({ ...customReward, title: e.target.value })}
                  placeholder="Reward name"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2"
                />
                <input
                  type="number"
                  value={customReward.durationMin}
                  onChange={(e) =>
                    setCustomReward({
                      ...customReward,
                      durationMin: parseInt(e.target.value, 10) || 10,
                    })
                  }
                  className="w-20 rounded-lg border border-slate-200 px-3 py-2"
                  min="1"
                />
                <span className="flex items-center text-sm text-slate-500">min</span>
              </div>
              <button
                onClick={addCustomReward}
                disabled={!customReward.title.trim()}
                className="mt-2 w-full rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Add Reward
              </button>
            </div>

            <button
              onClick={() => setShowRewardPicker(false)}
              className="mt-4 w-full rounded-lg border-2 border-slate-300 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
