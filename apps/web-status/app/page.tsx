import { ActiveIncidents } from '@/components/ActiveIncidents';
import { ComponentGroup } from '@/components/ComponentGroup';
import { OverallStatus } from '@/components/OverallStatus';
import { UpcomingMaintenance } from '@/components/UpcomingMaintenance';
import { UptimeOverview } from '@/components/UptimeOverview';
import { getStatus, getUptimeHistory } from '@/lib/api';
import type { StatusResponse, UptimeHistory } from '@/lib/types';

export const revalidate = 30; // ISR: refresh every 30 seconds

export default async function StatusPage() {
  let status: StatusResponse | null = null;
  let uptime: UptimeHistory | null = null;
  let error: string | null = null;

  try {
    [status, uptime] = await Promise.all([getStatus(), getUptimeHistory(90)]);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load status';
  }

  if (error || !status) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Unable to load status information. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overall status banner */}
      <OverallStatus status={status.overall} updatedAt={status.updated_at} />

      {/* Active incidents */}
      {status.active_incidents.length > 0 && (
        <ActiveIncidents incidents={status.active_incidents} />
      )}

      {/* Upcoming maintenance */}
      {status.upcoming_maintenance.length > 0 && (
        <UpcomingMaintenance windows={status.upcoming_maintenance} />
      )}

      {/* Component groups with status */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Components</h2>
        {status.groups.map((g) => (
          <ComponentGroup
            key={g.group.id}
            group={g.group}
            components={g.components}
            uptimeData={uptime?.components}
          />
        ))}
      </div>

      {/* 90-day uptime overview */}
      {uptime && <UptimeOverview data={uptime} />}
    </div>
  );
}
