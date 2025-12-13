/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-plus-operands, import/no-unresolved */
'use client';

import { useState, useEffect } from 'react';

import type { DetailedSeatUsage } from '../../../lib/billing-api';
import { fetchDetailedSeatUsage, getGradeBandLabel } from '../../../lib/billing-api';

interface SeatUsageChartProps {
  className?: string;
}

function UtilizationBar({
  label,
  committed,
  allocated,
  overageUsed,
}: Readonly<{
  label: string;
  committed: number;
  allocated: number;
  overageUsed: number;
}>) {
  const utilization = committed > 0 ? (allocated / committed) * 100 : 0;

  const getBarColor = () => {
    if (utilization > 100) return 'bg-red-500';
    if (utilization >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusText = () => {
    if (utilization > 110) return 'Overage';
    if (utilization > 100) return 'Over Limit';
    if (utilization >= 80) return 'Warning';
    return 'Normal';
  };

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500">
            {allocated} / {committed} seats
          </span>
          <span className={`font-medium ${getUtilizationColorClass(utilization)}`}>
            {utilization.toFixed(0)}% • {getStatusText()}
          </span>
        </div>
      </div>
      <div className="relative h-3 w-full rounded-full bg-slate-200">
        {/* Base bar (up to 100%) */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${getBarColor()}`}
          style={{ width: `${Math.min(utilization, 100)}%` }}
        />
        {/* Overage bar (over 100%) */}
        {utilization > 100 && (
          <div
            className="absolute top-0 h-full rounded-r-full bg-red-700 transition-all"
            style={{
              left: '100%',
              width: `${Math.min(utilization - 100, 20)}%`,
            }}
          />
        )}
        {/* 80% marker */}
        <div className="absolute top-0 h-full w-px bg-amber-400" style={{ left: '80%' }} />
        {/* 100% marker */}
        <div className="absolute top-0 h-full w-px bg-slate-400" style={{ left: '100%' }} />
      </div>
      {overageUsed > 0 && (
        <p className="mt-1 text-xs text-red-600">{overageUsed} overage seats used</p>
      )}
    </div>
  );
}

function getUtilizationColorClass(utilization: number): string {
  if (utilization > 100) return 'text-red-600';
  if (utilization >= 80) return 'text-amber-600';
  return 'text-emerald-600';
}

function UsageLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <span className="text-slate-600">Normal (&lt;80%)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
        <span className="text-slate-600">Warning (80-99%)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="text-slate-600">Over Limit (100%+)</span>
      </div>
    </div>
  );
}

export function SeatUsageChart({ className = '' }: Readonly<SeatUsageChartProps>) {
  const [usageData, setUsageData] = useState<DetailedSeatUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchDetailedSeatUsage();
      setUsageData(data);
    } catch (err) {
      setError('Failed to load usage data');
      console.error('Error loading seat usage:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate totals
  const totals = usageData.reduce(
    (acc, item) => ({
      committed: acc.committed + item.seatsCommitted,
      allocated: acc.allocated + item.seatsAllocated,
      overage: acc.overage + item.overageUsed,
    }),
    { committed: 0, allocated: 0, overage: 0 }
  );

  const overallUtilization = totals.committed > 0 ? (totals.allocated / totals.committed) * 100 : 0;

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-slate-200 bg-white p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-1/3 rounded bg-slate-200" />
          <div className="space-y-3">
            <div className="h-3 w-full rounded bg-slate-200" />
            <div className="h-3 w-full rounded bg-slate-200" />
            <div className="h-3 w-full rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-6 ${className}`}>
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={loadUsageData} className="mt-2 text-sm font-medium text-red-700 underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Seat Utilization</h3>
          <a
            href="/billing/alerts"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View Alerts →
          </a>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Track seat allocation against committed capacity by grade band
        </p>
      </div>

      <div className="p-4">
        {/* Summary stats */}
        <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Total Committed</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{totals.committed}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Total Allocated</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{totals.allocated}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Overall Utilization</p>
            <p className={`mt-1 text-xl font-bold ${getUtilizationColorClass(overallUtilization)}`}>
              {overallUtilization.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Usage bars by grade band */}
        <div className="divide-y divide-slate-100">
          {usageData.map((item) => (
            <UtilizationBar
              key={`${item.sku}-${item.gradeBand}`}
              label={getGradeBandLabel(item.gradeBand)}
              committed={item.seatsCommitted}
              allocated={item.seatsAllocated}
              overageUsed={item.overageUsed}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <UsageLegend />
        </div>
      </div>
    </div>
  );
}

export default SeatUsageChart;
