import { getIncident } from '@/lib/api';
import type { Incident, IncidentUpdate } from '@/lib/types';

export const revalidate = 15;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IncidentDetailPage({ params }: Props) {
  const { id } = await params;
  let incident: Incident | null = null;
  let error: string | null = null;

  try {
    incident = await getIncident(id);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load incident';
  }

  if (error || !incident) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Incident Not Found</h1>
        <p className="text-sm text-gray-500">This incident may have been removed.</p>
        <a href="/incidents" className="text-aivo-600 hover:text-aivo-700 text-sm mt-4 inline-block">
          ← Back to incidents
        </a>
      </div>
    );
  }

  const severityBg = {
    minor: 'bg-amber-100 text-amber-800',
    major: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const statusBg = {
    investigating: 'bg-red-100 text-red-700',
    identified: 'bg-orange-100 text-orange-700',
    monitoring: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    postmortem: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      <a href="/incidents" className="text-aivo-600 hover:text-aivo-700 text-sm">
        ← Back to incidents
      </a>

      {/* Incident header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{incident.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBg[incident.severity]}`}>
                {incident.severity.toUpperCase()}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBg[incident.status]}`}>
                {incident.status.replace('_', ' ')}
              </span>
              {incident.is_auto && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  Auto-detected
                </span>
              )}
            </div>
          </div>
        </div>

        {incident.message && (
          <p className="text-gray-700 mt-4">{incident.message}</p>
        )}

        <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
          <span>Created: {new Date(incident.created_at).toLocaleString()}</span>
          {incident.resolved_at && (
            <span>Resolved: {new Date(incident.resolved_at).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Timeline */}
      {incident.updates && incident.updates.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
          <div className="space-y-4">
            {incident.updates.map((update: IncidentUpdate, i: number) => (
              <div key={update.id} className="flex gap-4">
                {/* Timeline dot and line */}
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-aivo-500 ring-4 ring-aivo-100" />
                  {i < (incident.updates?.length ?? 0) - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBg[update.status]}`}>
                      {update.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(update.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{update.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
