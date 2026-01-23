'use client';

import { useFeatureFlags, useUpdateFeatureFlag } from '@/hooks/use-billing';
import type { FeatureFlag } from '@/lib/api/billing.api';

export default function FlagsPage() {
  const { data: flagsData, isLoading, error } = useFeatureFlags();
  const updateFlagMutation = useUpdateFeatureFlag();

  const flags = flagsData?.items ?? [];

  const handleToggleFlag = (flag: FeatureFlag) => {
    updateFlagMutation.mutate({
      key: flag.key,
      data: { enabled: !flag.enabled },
    });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Feature Flags</h1>
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading feature flags...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">Failed to load feature flags</div>
        ) : flags.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No feature flags configured</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Key</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {flags.map((flag: FeatureFlag) => (
                <tr key={flag.key}>
                  <td className="px-4 py-3 text-sm font-mono text-slate-800">{flag.key}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{flag.description}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        flag.enabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {flag.enabled ? 'On' : 'Off'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => {
                        handleToggleFlag(flag);
                      }}
                      disabled={updateFlagMutation.isPending}
                      className={`text-sm font-medium ${
                        flag.enabled
                          ? 'text-red-600 hover:text-red-700'
                          : 'text-green-600 hover:text-green-700'
                      } disabled:opacity-50`}
                    >
                      {updateFlagMutation.isPending
                        ? 'Updating...'
                        : flag.enabled
                          ? 'Disable'
                          : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
