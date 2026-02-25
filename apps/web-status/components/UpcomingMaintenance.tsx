import type { MaintenanceWindow } from '@/lib/types';
import { Wrench } from 'lucide-react';

interface Props {
  windows: MaintenanceWindow[];
}

export function UpcomingMaintenance({ windows }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Scheduled Maintenance</h2>
      {windows.map((mw) => (
        <div
          key={mw.id}
          className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"
        >
          <div className="flex items-start gap-3">
            <Wrench className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">{mw.title}</h3>
              {mw.description && (
                <p className="text-sm text-gray-600 mt-1">{mw.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>
                  {new Date(mw.scheduled_start).toLocaleString()} —{' '}
                  {new Date(mw.scheduled_end).toLocaleString()}
                </span>
                <span className="capitalize px-2 py-0.5 rounded-full bg-white/70 text-indigo-600">
                  {mw.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
