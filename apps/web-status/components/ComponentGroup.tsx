import type { ComponentGroupInfo, ComponentInfo } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { UptimeBar } from './UptimeBar';

interface Props {
  group: ComponentGroupInfo;
  components: ComponentInfo[];
  uptimeData?: Record<string, { date: string; uptime_percent: number }[]>;
}

export function ComponentGroup({ group, components, uptimeData }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Group header */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 text-sm">{group.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
      </div>

      {/* Components */}
      <div className="divide-y divide-gray-100">
        {components.map((component) => (
          <div
            key={component.id}
            className="px-5 py-3 flex items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900 text-sm">
                  {component.name}
                </span>
                <StatusBadge status={component.status} size="sm" />
              </div>
              {/* 90-day uptime bar */}
              {uptimeData?.[component.id] && (
                <div className="mt-2">
                  <UptimeBar data={uptimeData[component.id]} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
