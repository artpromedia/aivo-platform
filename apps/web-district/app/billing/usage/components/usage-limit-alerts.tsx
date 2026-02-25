'use client';

import type { LimitCheckResponse } from '../../../../lib/billing-api';
import { getMeterMetricLabel, formatMeterValue } from '../../../../lib/billing-api';

interface UsageLimitAlertsProps {
  limits: LimitCheckResponse;
}

/**
 * Alert banners for usage limits that are approaching or have been exceeded.
 * Shows hard-limit violations (error) above soft-limit warnings.
 */
export function UsageLimitAlerts({ limits }: UsageLimitAlertsProps) {
  const hardExceeded = limits.checks.filter((c) => c.hardLimitExceeded);
  const softExceeded = limits.checks.filter(
    (c) => c.softLimitExceeded && !c.hardLimitExceeded,
  );

  if (hardExceeded.length === 0 && softExceeded.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" role="alert">
      {/* Hard limit violations */}
      {hardExceeded.length > 0 && (
        <div className="rounded-xl border border-error/30 bg-error/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-error/10">
              <svg
                className="h-4 w-4 text-error"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-error">
                Usage Limit Exceeded
              </h3>
              <ul className="mt-1 space-y-1">
                {hardExceeded.map((check) => (
                  <li key={check.metric} className="text-sm text-error/80">
                    <span className="font-medium">
                      {getMeterMetricLabel(check.metric)}
                    </span>
                    : {formatMeterValue(check.metric, check.currentValue)} /{' '}
                    {check.hardLimit != null
                      ? formatMeterValue(check.metric, check.hardLimit)
                      : '∞'}{' '}
                    ({check.utilizationPercent?.toFixed(0) ?? '—'}%)
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-error/60">
                Operations may be blocked. Please upgrade your plan or contact
                support to increase limits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Soft limit warnings */}
      {softExceeded.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/10">
              <svg
                className="h-4 w-4 text-warning"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-warning">
                Approaching Usage Limits
              </h3>
              <ul className="mt-1 space-y-1">
                {softExceeded.map((check) => (
                  <li key={check.metric} className="text-sm text-warning/80">
                    <span className="font-medium">
                      {getMeterMetricLabel(check.metric)}
                    </span>
                    : {formatMeterValue(check.metric, check.currentValue)} /{' '}
                    {check.softLimit != null
                      ? formatMeterValue(check.metric, check.softLimit)
                      : '∞'}{' '}
                    ({check.utilizationPercent?.toFixed(0) ?? '—'}%)
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-warning/60">
                Consider upgrading before you hit the hard limit.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
