'use client';

import { useMemo } from 'react';

import type { UsageHistory, MeterMetric } from '../../../../lib/billing-api';
import { formatMeterValue } from '../../../../lib/billing-api';

interface UsageHistoryChartProps {
  title: string;
  metric: MeterMetric;
  history: UsageHistory;
}

/**
 * Bar chart showing usage data points over time.
 * Uses a pure-CSS bar chart for zero-dependency rendering.
 */
export function UsageHistoryChart({ title, metric, history }: UsageHistoryChartProps) {
  const { bars, maxValue, total, average } = useMemo(() => {
    const points = history.dataPoints;
    if (points.length === 0) {
      return { bars: [], maxValue: 0, total: 0, average: 0 };
    }

    const max = Math.max(...points.map((p) => p.value), 1);
    const sum = points.reduce((acc, p) => acc + p.value, 0);
    const avg = Math.round(sum / points.length);

    const mapped = points.map((point) => ({
      date: new Date(point.bucketStart),
      value: point.value,
      heightPercent: (point.value / max) * 100,
    }));

    return { bars: mapped, maxValue: max, total: sum, average: avg };
  }, [history.dataPoints]);

  if (bars.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <p className="mt-4 text-center text-sm text-muted">No usage data available</p>
      </div>
    );
  }

  // Show labels for roughly 5-7 evenly spaced bars
  const labelInterval = Math.max(1, Math.floor(bars.length / 6));

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <div className="flex gap-4 text-xs text-muted">
          <span>
            Total: <span className="font-medium text-text">{formatMeterValue(metric, total)}</span>
          </span>
          <span>
            Avg: <span className="font-medium text-text">{formatMeterValue(metric, average)}</span>
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div className="mt-4 flex h-40 items-end gap-[2px]" role="img" aria-label={`${title} usage chart`}>
        {bars.map((bar, i) => (
          <div
            key={i}
            className="group relative flex-1"
            style={{ height: '100%' }}
          >
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg border border-border bg-surface px-2 py-1 text-xs shadow-md group-hover:block">
              <div className="font-medium text-text">
                {formatMeterValue(metric, bar.value)}
              </div>
              <div className="text-muted">
                {bar.date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>

            {/* Bar */}
            <div className="flex h-full items-end">
              <div
                className="w-full rounded-t bg-primary/70 transition-colors hover:bg-primary"
                style={{ height: `${Math.max(bar.heightPercent, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="mt-1 flex items-center gap-[2px]">
        {bars.map((bar, i) => (
          <div key={i} className="flex-1 text-center">
            {i % labelInterval === 0 ? (
              <span className="text-[10px] text-muted">
                {bar.date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {/* Y-axis legend */}
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        <span>0</span>
        <span>{formatMeterValue(metric, maxValue)}</span>
      </div>
    </div>
  );
}
