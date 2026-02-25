import { AlertTriangle, AlertOctagon, XCircle } from 'lucide-react';

import type { Incident } from '@/lib/types';

interface Props {
  incidents: Incident[];
}

const SEVERITY_STYLES = {
  minor: { bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle className="w-5 h-5 text-amber-500" /> },
  major: { bg: 'bg-orange-50', border: 'border-orange-200', icon: <AlertOctagon className="w-5 h-5 text-orange-500" /> },
  critical: { bg: 'bg-red-50', border: 'border-red-200', icon: <XCircle className="w-5 h-5 text-red-500" /> },
};

export function ActiveIncidents({ incidents }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Active Incidents</h2>
      {incidents.map((incident) => {
        const style = SEVERITY_STYLES[incident.severity];
        return (
          <a
            key={incident.id}
            href={`/incidents/${incident.id}`}
            className={`block rounded-xl border ${style.border} ${style.bg} p-4 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start gap-3">
              {style.icon}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{incident.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 text-gray-600 capitalize">
                    {incident.status.replace('_', ' ')}
                  </span>
                </div>
                {incident.message && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{incident.message}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Started {new Date(incident.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
