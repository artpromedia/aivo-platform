'use client';

interface Props {
  data: { date: string; uptime_percent: number }[];
}

function getBarColor(uptime: number): string {
  if (uptime >= 99.9) return 'bg-emerald-500';
  if (uptime >= 99.0) return 'bg-emerald-400';
  if (uptime >= 95.0) return 'bg-amber-400';
  if (uptime >= 90.0) return 'bg-orange-400';
  return 'bg-red-500';
}

export function UptimeBar({ data }: Props) {
  // Pad to 90 days if needed
  const padded = [...data];
  while (padded.length < 90) {
    padded.unshift({ date: '', uptime_percent: 100 });
  }
  // Take last 90
  const last90 = padded.slice(-90);

  const avgUptime =
    last90.reduce((sum, d) => sum + d.uptime_percent, 0) / last90.length;

  return (
    <div className="group">
      <div className="flex items-center gap-0.5">
        {last90.map((day, i) => (
          <div
            key={i}
            className={`h-6 flex-1 rounded-[2px] transition-all ${getBarColor(day.uptime_percent)} hover:opacity-80`}
            title={
              day.date
                ? `${day.date}: ${day.uptime_percent.toFixed(2)}% uptime`
                : 'No data'
            }
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        <span>90 days ago</span>
        <span className="font-medium text-gray-600">{avgUptime.toFixed(2)}% uptime</span>
        <span>Today</span>
      </div>
    </div>
  );
}
