// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS CHART COMPONENTS
// Recharts-based visualizations for analytics dashboards
// ══════════════════════════════════════════════════════════════════════════════

'use client';

import * as React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
  ComposedChart,
  ReferenceLine,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TimeSeriesDataPoint {
  date: string;
  [key: string]: string | number;
}

export interface CategoricalDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark?: number;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

export interface ChartProps {
  data: unknown[];
  height?: number;
  className?: string;
}

// ─── Color Palette ─────────────────────────────────────────────────────────────

export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#a855f7',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
};

export const GRADIENT_COLORS = [
  { start: '#3b82f6', end: '#1d4ed8' },
  { start: '#8b5cf6', end: '#6d28d9' },
  { start: '#22c55e', end: '#15803d' },
  { start: '#f59e0b', end: '#d97706' },
  { start: '#ef4444', end: '#dc2626' },
];

const DEFAULT_SERIES_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
  CHART_COLORS.indigo,
];

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
      <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Engagement Trend Chart ────────────────────────────────────────────────────

export interface EngagementTrendChartProps extends ChartProps {
  data: TimeSeriesDataPoint[];
  series?: Array<{ key: string; name: string; color?: string }>;
  showArea?: boolean;
  showGrid?: boolean;
  dateFormat?: 'short' | 'long';
}

/**
 * Line/Area chart for showing engagement trends over time
 */
export function EngagementTrendChart({
  data,
  series = [{ key: 'value', name: 'Engagement' }],
  showArea = true,
  showGrid = true,
  dateFormat = 'short',
  height = 300,
  className,
}: EngagementTrendChartProps) {
  const formatDate = (value: string) => {
    const date = new Date(value);
    if (dateFormat === 'short') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s, index) => (
              <linearGradient key={s.key} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={s.color || DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length]}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={s.color || DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length]}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip content={<CustomTooltip />} />
          {series.length > 1 && <Legend />}
          {series.map((s, index) => {
            const color = s.color || DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length];
            if (showArea) {
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#gradient-${s.key})`}
                />
              );
            }
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            );
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Score Distribution Chart ──────────────────────────────────────────────────

export interface ScoreDistributionChartProps extends ChartProps {
  data: Array<{ range: string; count: number }>;
  targetScore?: number;
  showTarget?: boolean;
}

/**
 * Bar chart for showing score distribution
 */
export function ScoreDistributionChart({
  data,
  targetScore,
  showTarget = true,
  height = 300,
  className,
}: ScoreDistributionChartProps) {
  const getBarColor = (range: string): string => {
    const lowerBound = parseInt(range.split('-')[0], 10);
    if (lowerBound >= 80) return CHART_COLORS.success;
    if (lowerBound >= 60) return CHART_COLORS.warning;
    return CHART_COLORS.danger;
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            label={{ value: 'Students', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          {showTarget && targetScore && (
            <ReferenceLine
              x={`${Math.floor(targetScore / 10) * 10}-${Math.floor(targetScore / 10) * 10 + 9}`}
              stroke={CHART_COLORS.primary}
              strokeDasharray="3 3"
              label={{ value: `Target: ${targetScore}%`, fill: CHART_COLORS.primary, fontSize: 12 }}
            />
          )}
          <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.range)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Skill Mastery Radar Chart ─────────────────────────────────────────────────

export interface SkillMasteryRadarProps extends ChartProps {
  data: RadarDataPoint[];
  comparisonData?: RadarDataPoint[];
  showComparison?: boolean;
  comparisonLabel?: string;
}

/**
 * Radar chart for visualizing skill mastery across multiple domains
 */
export function SkillMasteryRadar({
  data,
  comparisonData,
  showComparison = false,
  comparisonLabel = 'Class Average',
  height = 400,
  className,
}: SkillMasteryRadarProps) {
  // Merge data for rendering
  const mergedData = data.map((item, index) => ({
    ...item,
    comparison: comparisonData?.[index]?.value || 0,
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mergedData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <Radar
            name="Student"
            dataKey="value"
            stroke={CHART_COLORS.primary}
            fill={CHART_COLORS.primary}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          {showComparison && comparisonData && (
            <Radar
              name={comparisonLabel}
              dataKey="comparison"
              stroke={CHART_COLORS.secondary}
              fill={CHART_COLORS.secondary}
              fillOpacity={0.1}
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          )}
          <Legend />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Activity Breakdown Pie Chart ──────────────────────────────────────────────

export interface ActivityBreakdownPieProps extends ChartProps {
  data: CategoricalDataPoint[];
  innerRadius?: number;
  showLabels?: boolean;
}

/**
 * Pie/Donut chart for activity type breakdown
 */
export function ActivityBreakdownPie({
  data,
  innerRadius = 60,
  showLabels = true,
  height = 300,
  className,
}: ActivityBreakdownPieProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={innerRadius + 40}
            paddingAngle={2}
            dataKey="value"
            label={
              showLabels
                ? ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`
                : undefined
            }
            labelLine={showLabels}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [
              `${value} (${((value / total) * 100).toFixed(1)}%)`,
              'Activities',
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Weekly Activity Heatmap ───────────────────────────────────────────────────

export interface HeatmapDataPoint {
  day: string;
  hour: number;
  value: number;
}

export interface WeeklyActivityHeatmapProps extends ChartProps {
  data: HeatmapDataPoint[];
  maxValue?: number;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Heatmap showing activity patterns by day and hour
 */
export function WeeklyActivityHeatmap({
  data,
  maxValue,
  height = 200,
  className,
}: WeeklyActivityHeatmapProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  const getColor = (value: number): string => {
    const intensity = value / max;
    if (intensity === 0) return '#f3f4f6';
    if (intensity < 0.25) return '#dbeafe';
    if (intensity < 0.5) return '#93c5fd';
    if (intensity < 0.75) return '#3b82f6';
    return '#1d4ed8';
  };

  const dataMap = new Map(data.map((d) => [`${d.day}-${d.hour}`, d.value]));

  return (
    <div className={className}>
      <div style={{ height }} className="flex flex-col">
        <div className="flex-1 flex">
          <div className="w-12 flex flex-col justify-around text-xs text-gray-500">
            {DAYS.map((day) => (
              <span key={day} className="h-6 flex items-center">{day}</span>
            ))}
          </div>
          <div className="flex-1">
            <div className="grid grid-rows-7 gap-1 h-full">
              {DAYS.map((day) => (
                <div key={day} className="flex gap-1">
                  {HOURS.map((hour) => {
                    const value = dataMap.get(`${day}-${hour}`) || 0;
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="flex-1 rounded-sm transition-colors"
                        style={{ backgroundColor: getColor(value) }}
                        title={`${day} ${hour}:00 - ${value} activities`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2 ml-12">
          <span>12am</span>
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>11pm</span>
        </div>
      </div>
    </div>
  );
}

// ─── Performance Comparison Chart ──────────────────────────────────────────────

export interface PerformanceComparisonData {
  category: string;
  student: number;
  classAvg: number;
  gradeAvg: number;
}

export interface PerformanceComparisonChartProps extends ChartProps {
  data: PerformanceComparisonData[];
  showGradeAvg?: boolean;
}

/**
 * Grouped bar chart for comparing student vs class/grade performance
 */
export function PerformanceComparisonChart({
  data,
  showGradeAvg = true,
  height = 300,
  className,
}: PerformanceComparisonChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="student"
            name="Student"
            fill={CHART_COLORS.primary}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="classAvg"
            name="Class Average"
            fill={CHART_COLORS.secondary}
            radius={[4, 4, 0, 0]}
          />
          {showGradeAvg && (
            <Bar
              dataKey="gradeAvg"
              name="Grade Average"
              fill={CHART_COLORS.info}
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Progress Timeline Chart ───────────────────────────────────────────────────

export interface ProgressTimelineData {
  date: string;
  score: number;
  target: number;
  milestone?: string;
}

export interface ProgressTimelineChartProps extends ChartProps {
  data: ProgressTimelineData[];
  showTarget?: boolean;
}

/**
 * Combined line chart showing progress vs target over time
 */
export function ProgressTimelineChart({
  data,
  showTarget = true,
  height = 300,
  className,
}: ProgressTimelineChartProps) {
  const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="score"
            name="Progress"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#progressGradient)"
          />
          {showTarget && (
            <Line
              type="monotone"
              dataKey="target"
              name="Target"
              stroke={CHART_COLORS.warning}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Skill Treemap ─────────────────────────────────────────────────────────────

export interface SkillTreemapData {
  name: string;
  size: number;
  mastery: number;
  children?: SkillTreemapData[];
}

export interface SkillTreemapChartProps extends ChartProps {
  data: SkillTreemapData[];
}

/**
 * Treemap showing skill hierarchy and mastery levels
 */
export function SkillTreemapChart({
  data,
  height = 400,
  className,
}: SkillTreemapChartProps) {
  const getColor = (mastery: number): string => {
    if (mastery >= 0.9) return CHART_COLORS.success;
    if (mastery >= 0.7) return CHART_COLORS.primary;
    if (mastery >= 0.5) return CHART_COLORS.warning;
    return CHART_COLORS.danger;
  };

  const renderContent = (props: {
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
    mastery: number;
  }) => {
    const { x, y, width, height: h, name, mastery } = props;

    if (width < 50 || h < 30) return null;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={h}
          fill={getColor(mastery)}
          stroke="#fff"
          strokeWidth={2}
          rx={4}
        />
        <text
          x={x + width / 2}
          y={y + h / 2 - 5}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight="500"
        >
          {width > 80 ? name : name.substring(0, 8) + '...'}
        </text>
        <text
          x={x + width / 2}
          y={y + h / 2 + 10}
          textAnchor="middle"
          fill="#fff"
          fontSize={10}
        >
          {(mastery * 100).toFixed(0)}%
        </text>
      </g>
    );
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={data}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          content={renderContent as unknown as React.ReactElement}
        />
      </ResponsiveContainer>
    </div>
  );
}

// ─── Chart Container ───────────────────────────────────────────────────────────

export interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Container component for charts with title and optional actions
 */
export function ChartContainer({
  title,
  subtitle,
  children,
  action,
  className,
}: ChartContainerProps) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className || ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export const AnalyticsCharts = {
  EngagementTrendChart,
  ScoreDistributionChart,
  SkillMasteryRadar,
  ActivityBreakdownPie,
  WeeklyActivityHeatmap,
  PerformanceComparisonChart,
  ProgressTimelineChart,
  SkillTreemapChart,
  ChartContainer,
  CHART_COLORS,
};

export default AnalyticsCharts;
