import { Wrench, Calendar } from 'lucide-react';

import { getMaintenanceWindows } from '@/lib/api';
import type { MaintenanceWindow } from '@/lib/types';

export const revalidate = 60;

export default async function MaintenancePage() {
  let windows: MaintenanceWindow[] = [];
  let error: string | null = null;

  try {
    const res = await getMaintenanceWindows(1, 50);
    windows = res.maintenance;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load maintenance windows';
  }

  if (error) {
    return (
      <div className="text-center py-16 text-red-600 text-sm">
        Unable to load maintenance schedule.
      </div>
    );
  }

  const upcoming = windows.filter((w) => ['scheduled', 'in_progress'].includes(w.status));
  const past = windows.filter((w) => ['completed', 'cancelled'].includes(w.status));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6 text-indigo-500" />
        <h1 className="text-2xl font-bold text-gray-900">Maintenance Schedule</h1>
      </div>

      {upcoming.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Upcoming & In Progress</h2>
          <div className="space-y-3">
            {upcoming.map((mw) => (
              <MaintenanceCard key={mw.id} window={mw} />
            ))}
          </div>
        </section>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Wrench className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No upcoming maintenance scheduled.</p>
        </div>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Past Maintenance</h2>
          <div className="space-y-3">
            {past.map((mw) => (
              <MaintenanceCard key={mw.id} window={mw} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MaintenanceCard({ window: mw }: { window: MaintenanceWindow }) {
  const statusColors: Record<string, string> = {
    scheduled: 'bg-indigo-100 text-indigo-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{mw.title}</h3>
          {mw.description && (
            <p className="text-sm text-gray-600 mt-1">{mw.description}</p>
          )}
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[mw.status] || 'bg-gray-100 text-gray-600'}`}
        >
          {mw.status.replace('_', ' ')}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span>
          📅 {new Date(mw.scheduled_start).toLocaleString()} —{' '}
          {new Date(mw.scheduled_end).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
