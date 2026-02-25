import { getIncidents } from '@/lib/api';
import type { Incident } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';

export const revalidate = 30;

export default async function IncidentsPage() {
  let incidents: Incident[] = [];
  let error: string | null = null;

  try {
    const res = await getIncidents(1, 50);
    incidents = res.incidents;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load incidents';
  }

  if (error) {
    return (
      <div className="text-center py-16 text-red-600 text-sm">
        Unable to load incident history.
      </div>
    );
  }

  const activeIncidents = incidents.filter(
    (i) => !['resolved', 'postmortem'].includes(i.status),
  );
  const pastIncidents = incidents.filter((i) =>
    ['resolved', 'postmortem'].includes(i.status),
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Incident History</h1>

      {activeIncidents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Active</h2>
          <div className="space-y-3">
            {activeIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Past Incidents</h2>
        {pastIncidents.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No past incidents recorded. Everything has been running smoothly!
          </p>
        ) : (
          <div className="space-y-3">
            {pastIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const severityColors = {
    minor: 'border-l-amber-400',
    major: 'border-l-orange-400',
    critical: 'border-l-red-500',
  };

  return (
    <a
      href={`/incidents/${incident.id}`}
      className="block bg-white rounded-lg border border-gray-200 border-l-4 p-4 hover:shadow-md transition-shadow"
      style={{
        borderLeftColor: undefined,
      }}
    >
      <div className={`bg-white rounded-lg border border-gray-200 border-l-4 ${severityColors[incident.severity]} p-4`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">{incident.title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
              {incident.severity}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
              {incident.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        {incident.message && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{incident.message}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>Started: {new Date(incident.created_at).toLocaleString()}</span>
          {incident.resolved_at && (
            <span>Resolved: {new Date(incident.resolved_at).toLocaleString()}</span>
          )}
          {incident.is_auto && (
            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Auto-detected</span>
          )}
        </div>
      </div>
    </a>
  );
}
