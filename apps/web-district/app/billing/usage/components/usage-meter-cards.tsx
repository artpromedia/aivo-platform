'use client';

import type { MeterStatus, MeterMetric } from '../../../../lib/billing-api';
import { getMeterMetricLabel, formatMeterValue, getMeterStatusTone } from '../../../../lib/billing-api';

interface UsageMeterCardsProps {
  meters: MeterStatus[];
}

/** Icons keyed by metric — simple SVG paths. */
const METER_ICONS: Record<MeterMetric, string> = {
  active_seats:
    'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  ai_interactions:
    'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z',
  api_calls:
    'M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5',
  storage_bytes:
    'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125',
  assessments:
    'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z',
  reports:
    'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
};

/**
 * Grid of 6 usage meter cards showing current value, limits, and progress bars.
 */
export function UsageMeterCards({ meters }: UsageMeterCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {meters.map((meter) => (
        <MeterCard key={meter.metric} meter={meter} />
      ))}
    </div>
  );
}

function MeterCard({ meter }: { meter: MeterStatus }) {
  const tone = getMeterStatusTone(meter.status);
  const iconPath = METER_ICONS[meter.metric];

  const barColor = {
    success: 'bg-primary',
    warning: 'bg-warning',
    error: 'bg-error',
  }[tone];

  const badgeBg = {
    success: 'bg-surface-muted text-muted',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
  }[tone];

  const textColor = {
    success: 'text-text',
    warning: 'text-warning',
    error: 'text-error',
  }[tone];

  const formattedValue = formatMeterValue(meter.metric, meter.currentValue);
  const formattedLimit = meter.hardLimit != null
    ? formatMeterValue(meter.metric, meter.hardLimit)
    : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted">
            <svg
              className="h-4 w-4 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={iconPath}
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-muted">{meter.displayName}</span>
        </div>
        {meter.utilizationPercent != null && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeBg}`}>
            {meter.utilizationPercent.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Value */}
      <div className="mt-3">
        <span className={`text-2xl font-bold ${textColor}`}>{formattedValue}</span>
        {formattedLimit && (
          <span className="ml-1 text-sm text-muted">/ {formattedLimit}</span>
        )}
        {!formattedLimit && (
          <span className="ml-1 text-sm text-muted">(unlimited)</span>
        )}
      </div>

      {/* Progress bar */}
      {meter.utilizationPercent != null && (
        <div className="mt-3">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuenow={meter.utilizationPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${meter.displayName}: ${meter.utilizationPercent.toFixed(0)}% used`}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${Math.min(meter.utilizationPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Period */}
      <div className="mt-2 text-xs text-muted">
        {new Date(meter.periodStart).toLocaleDateString()} —{' '}
        {new Date(meter.periodEnd).toLocaleDateString()}
      </div>
    </div>
  );
}
