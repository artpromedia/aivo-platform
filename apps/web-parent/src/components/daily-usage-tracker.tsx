/**
 * Daily Usage Tracker Component
 *
 * Displays daily learning time and activity for parents to monitor.
 * Inspired by GuardianGameControls and DailyUsageTracker from aivo-agentic-ai-learning-app.
 */

'use client';

import { useState } from 'react';
import { Clock, Play, Pause, Settings, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DailyUsage {
  date: string;
  totalMinutes: number;
  learningMinutes: number;
  practiceMinutes: number;
  gameMinutes: number;
  sessionsCompleted: number;
}

interface DailyUsageTrackerProps {
  todayUsage: DailyUsage;
  weeklyUsage: DailyUsage[];
  dailyGoalMinutes: number;
  onSetGoal?: (minutes: number) => void;
}

export function DailyUsageTracker({
  todayUsage,
  weeklyUsage,
  dailyGoalMinutes,
  onSetGoal,
}: DailyUsageTrackerProps) {
  const [showSettings, setShowSettings] = useState(false);
  const progressPercent = Math.min((todayUsage.totalMinutes / dailyGoalMinutes) * 100, 100);
  const isGoalMet = todayUsage.totalMinutes >= dailyGoalMinutes;

  // Calculate weekly average
  const weeklyAverage =
    weeklyUsage.reduce((sum, day) => sum + day.totalMinutes, 0) / weeklyUsage.length;
  const trend = todayUsage.totalMinutes > weeklyAverage ? 'up' : todayUsage.totalMinutes < weeklyAverage ? 'down' : 'stable';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          Daily Usage
        </h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Today's Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">{todayUsage.totalMinutes}</span>
            <span className="text-sm text-gray-500">/ {dailyGoalMinutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
            {trend === 'stable' && <Minus className="w-4 h-4 text-gray-400" />}
            <span className={`text-xs ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              vs avg
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isGoalMet
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-indigo-400 to-purple-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {isGoalMet
            ? '🎉 Daily goal reached!'
            : `${dailyGoalMinutes - todayUsage.totalMinutes} minutes to reach goal`}
        </p>
      </div>

      {/* Activity Breakdown */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <ActivityStat
          icon="📚"
          label="Learning"
          value={todayUsage.learningMinutes}
          color="blue"
        />
        <ActivityStat
          icon="✏️"
          label="Practice"
          value={todayUsage.practiceMinutes}
          color="purple"
        />
        <ActivityStat
          icon="🎮"
          label="Games"
          value={todayUsage.gameMinutes}
          color="amber"
        />
      </div>

      {/* Weekly Overview */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">This Week</p>
        <div className="flex justify-between gap-1">
          {weeklyUsage.map((day, index) => (
            <div key={index} className="flex-1">
              <div className="h-16 bg-gray-100 rounded-lg overflow-hidden flex items-end">
                <div
                  className={`w-full transition-all ${
                    day.totalMinutes >= dailyGoalMinutes
                      ? 'bg-gradient-to-t from-green-400 to-emerald-300'
                      : 'bg-gradient-to-t from-indigo-400 to-indigo-300'
                  }`}
                  style={{
                    height: `${Math.min((day.totalMinutes / dailyGoalMinutes) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-500 text-center mt-1">
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Avg: {Math.round(weeklyAverage)} min/day</span>
          <span>{weeklyUsage.filter((d) => d.totalMinutes >= dailyGoalMinutes).length}/7 goals met</span>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Daily Goal (minutes)
          </label>
          <div className="flex gap-2">
            {[15, 30, 45, 60, 90].map((minutes) => (
              <button
                key={minutes}
                onClick={() => onSetGoal?.(minutes)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dailyGoalMinutes === minutes
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {minutes}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityStat({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: 'blue' | 'purple' | 'amber';
}) {
  const bgColors = {
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    amber: 'bg-amber-50',
  };

  return (
    <div className={`${bgColors[color]} rounded-lg p-2 text-center`}>
      <span className="text-lg">{icon}</span>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

export default DailyUsageTracker;
