import type { UptimeHistory } from '@/lib/types';

interface Props {
  data: UptimeHistory;
}

export function UptimeOverview({ data }: Props) {
  const componentIds = Object.keys(data.components);
  if (componentIds.length === 0) return null;

  // Calculate overall uptime across all components
  let totalUptime = 0;
  let totalDays = 0;

  for (const id of componentIds) {
    for (const day of data.components[id]) {
      totalUptime += day.uptime_percent;
      totalDays++;
    }
  }

  const overallUptime = totalDays > 0 ? totalUptime / totalDays : 100;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {data.days}-Day Uptime
        </h2>
        <div className="text-right">
          <span className="text-3xl font-bold text-gray-900">
            {overallUptime.toFixed(3)}%
          </span>
          <p className="text-xs text-gray-500 mt-1">Overall platform uptime</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
        {componentIds.slice(0, 8).map((id) => {
          const days = data.components[id];
          const avg =
            days.reduce((sum, d) => sum + d.uptime_percent, 0) / (days.length || 1);

          return (
            <div key={id} className="text-center">
              <div className="text-lg font-semibold text-gray-800">
                {avg.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-0.5 capitalize">
                {id.replace(/-/g, ' ')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
