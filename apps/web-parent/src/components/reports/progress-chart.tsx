/**
 * Progress Chart Component
 * Sprint 1.7: Connect Web Parent Reports to Real APIs
 *
 * Interactive chart showing learner progress over time.
 * Displays scores and time spent with trend indicators.
 */

'use client';

import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

import type { ProgressPeriod } from '@/lib/api/reports.api';

interface ProgressChartProps {
  periods: ProgressPeriod[];
  title?: string;
  showTimeSpent?: boolean;
  height?: number;
}

/**
 * Trend indicator icon
 */
function TrendIcon({ trend, size = 'sm' }: { trend: 'up' | 'down' | 'stable'; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  
  if (trend === 'up') {
    return <TrendingUp className={`${sizeClass} text-green-500`} />;
  }
  if (trend === 'down') {
    return <TrendingDown className={`${sizeClass} text-red-500`} />;
  }
  return <Minus className={`${sizeClass} text-gray-400`} />;
}

/**
 * Calculate trend from periods
 */
function calculateTrend(periods: ProgressPeriod[]): 'up' | 'down' | 'stable' {
  if (periods.length < 2) return 'stable';
  
  const firstHalf = periods.slice(0, Math.floor(periods.length / 2));
  const secondHalf = periods.slice(Math.floor(periods.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, p) => sum + p.score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, p) => sum + p.score, 0) / secondHalf.length;
  
  const diff = secondAvg - firstAvg;
  if (diff > 3) return 'up';
  if (diff < -3) return 'down';
  return 'stable';
}

/**
 * Progress Chart with bars for score and time
 */
export function ProgressChart({
  periods,
  title = 'Progress Over Time',
  showTimeSpent = true,
  height = 200,
}: ProgressChartProps) {
  if (!periods || periods.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No progress data available</p>
      </div>
    );
  }

  const maxScore = 100;
  const maxTime = Math.max(...periods.map((p) => p.timeSpent), 1);
  const overallTrend = calculateTrend(periods);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Overall Trend:</span>
          <TrendIcon trend={overallTrend} />
          <span
            className={`font-medium ${
              overallTrend === 'up'
                ? 'text-green-600'
                : overallTrend === 'down'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {overallTrend === 'up' ? 'Improving' : overallTrend === 'down' ? 'Declining' : 'Stable'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-indigo-500 to-indigo-400" />
          <span className="text-sm text-gray-600">Score</span>
        </div>
        {showTimeSpent && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-emerald-500 to-emerald-400" />
            <span className="text-sm text-gray-600">Time Spent (min)</span>
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div className="relative" style={{ height: `${height}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-gray-500">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* Grid lines */}
        <div className="absolute left-12 right-0 top-0 bottom-8 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-t border-gray-100 w-full" />
          ))}
        </div>

        {/* Bars */}
        <div
          className="ml-12 flex items-end gap-2"
          style={{ height: `${height - 32}px` }}
        >
          {periods.map((period, index) => {
            const scoreHeight = (period.score / maxScore) * 100;
            const timeHeight = showTimeSpent ? (period.timeSpent / maxTime) * 100 : 0;

            return (
              <div key={period.label || index} className="flex-1 flex flex-col items-center group">
                {/* Bars container */}
                <div
                  className="w-full flex gap-1 items-end"
                  style={{ height: `${height - 56}px` }}
                >
                  {/* Score bar */}
                  <div
                    className="flex-1 bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-sm transition-all duration-500 hover:from-indigo-600 hover:to-indigo-500 cursor-pointer relative"
                    style={{ height: `${scoreHeight}%`, minHeight: '4px' }}
                    title={`Score: ${period.score}%`}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {period.score}%
                    </div>
                  </div>

                  {/* Time bar */}
                  {showTimeSpent && (
                    <div
                      className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm transition-all duration-500 hover:from-emerald-600 hover:to-emerald-500 cursor-pointer"
                      style={{ height: `${timeHeight}%`, minHeight: '4px' }}
                      title={`Time: ${period.timeSpent} min`}
                    />
                  )}
                </div>

                {/* X-axis label */}
                <div className="mt-2 text-xs text-gray-500 font-medium truncate w-full text-center">
                  {period.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Avg Score</p>
          <p className="text-xl font-bold text-gray-900">
            {Math.round(periods.reduce((sum, p) => sum + p.score, 0) / periods.length)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Lessons</p>
          <p className="text-xl font-bold text-gray-900">
            {periods.reduce((sum, p) => sum + p.lessonsCompleted, 0)}
          </p>
        </div>
        {showTimeSpent && (
          <div className="text-center">
            <p className="text-sm text-gray-500">Total Time</p>
            <p className="text-xl font-bold text-gray-900">
              {Math.round(periods.reduce((sum, p) => sum + p.timeSpent, 0) / 60)}h
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Mini progress chart for inline display
 */
export function MiniProgressChart({
  periods,
  height = 60,
}: {
  periods: ProgressPeriod[];
  height?: number;
}) {
  if (!periods || periods.length === 0) {
    return <div className="h-12 bg-gray-100 rounded animate-pulse" />;
  }

  const maxScore = 100;

  return (
    <div className="flex items-end gap-1" style={{ height: `${height}px` }}>
      {periods.map((period, index) => {
        const scoreHeight = (period.score / maxScore) * 100;
        
        return (
          <div
            key={period.label || index}
            className="flex-1 bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-sm transition-all hover:opacity-80"
            style={{ height: `${scoreHeight}%`, minHeight: '4px' }}
            title={`${period.label}: ${period.score}%`}
          />
        );
      })}
    </div>
  );
}

/**
 * Line chart variant for trends
 */
export function ProgressLineChart({
  periods,
  title = 'Score Trend',
  height = 150,
  color = 'indigo',
}: {
  periods: ProgressPeriod[];
  title?: string;
  height?: number;
  color?: 'indigo' | 'green' | 'blue' | 'purple';
}) {
  if (!periods || periods.length < 2) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <p className="text-gray-500 text-sm">Need more data points for trend line</p>
      </div>
    );
  }

  const colorClasses = {
    indigo: 'stroke-indigo-500 fill-indigo-100',
    green: 'stroke-green-500 fill-green-100',
    blue: 'stroke-blue-500 fill-blue-100',
    purple: 'stroke-purple-500 fill-purple-100',
  };

  const maxScore = 100;
  const minScore = 0;
  const range = maxScore - minScore;
  const width = 100;
  const chartHeight = height - 40;

  // Generate SVG path
  const points = periods.map((period, index) => {
    const x = (index / (periods.length - 1)) * width;
    const y = chartHeight - ((period.score - minScore) / range) * chartHeight;
    return { x, y, score: period.score };
  });

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const areaPath = `${linePath} L ${width} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h5 className="text-sm font-medium text-gray-700 mb-3">{title}</h5>
      
      <svg
        viewBox={`0 0 ${width} ${chartHeight}`}
        className="w-full"
        style={{ height: `${chartHeight}px` }}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((value) => {
          const y = chartHeight - (value / 100) * chartHeight;
          return (
            <line
              key={value}
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              className="stroke-gray-100"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} className={colorClasses[color]} fillOpacity="0.3" />

        {/* Line */}
        <path
          d={linePath}
          className={colorClasses[color]}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            className={`${colorClasses[color]} fill-white`}
            strokeWidth="2"
          />
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {periods.map((period, index) => (
          <span key={index} className="truncate">
            {period.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default ProgressChart;
